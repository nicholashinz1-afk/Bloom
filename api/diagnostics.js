// Vercel serverless function for Bloom diagnostics & telemetry
// Collects anonymous operational telemetry — no PII, no journal content
// Admin dashboard protected by ADMIN_KEY env var

// ── Redis client helpers (shared module) ────────────────────
import { getRedis, kvGet, kvSet } from './_redis.js';

// ── Keys ──────────────────────────────────────────────────
const KEYS = {
  aiFeedback: 'bloom_diag:ai_feedback',       // list of {context, value, ts}
  errors: 'bloom_diag:errors',                 // list of {message, stack, url, ts}
  events: 'bloom_diag:events',                 // list of {event, ts, meta}
  dailyStats: (d) => `bloom_diag:daily:${d}`,  // aggregated daily counters
};

const NINETY_DAYS = 90 * 24 * 60 * 60;
const MAX_LIST_SIZE = 5000;

// Atomically append to a capped list in Redis using WATCH/MULTI/EXEC
async function appendToList(key, item, maxSize = MAX_LIST_SIZE) {
  const client = await getRedis();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await client.watch(key);
      const raw = await client.get(key);
      const list = raw ? JSON.parse(raw) : [];
      list.push(item);
      const trimmed = list.length > maxSize ? list.slice(-maxSize) : list;
      const multi = client.multi();
      multi.set(key, JSON.stringify(trimmed), { EX: NINETY_DAYS });
      const results = await multi.exec();
      if (results !== null) return;
    } catch (e) {
      console.error('appendToList transaction failed:', key, e.message);
      try { await client.unwatch(); } catch (_) {}
      if (attempt === 4) throw e;
    }
  }
}

// Atomically add to a set stored as a JSON array using WATCH/MULTI/EXEC
async function addToSet(key, value) {
  const client = await getRedis();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await client.watch(key);
      const raw = await client.get(key);
      const arr = raw ? JSON.parse(raw) : [];
      const s = new Set(arr);
      s.add(value);
      const multi = client.multi();
      multi.set(key, JSON.stringify([...s]), { EX: NINETY_DAYS });
      const results = await multi.exec();
      if (results !== null) return;
    } catch (e) {
      console.error('addToSet transaction failed:', key, e.message);
      try { await client.unwatch(); } catch (_) {}
      if (attempt === 4) throw e;
    }
  }
}

// Get today's date key
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Atomically update daily stats using Redis WATCH/MULTI/EXEC
// - fields: string or array of counter fields to increment
// - transform: optional function(stats) that mutates stats before writing
async function incrementDaily(fields, transform) {
  if (typeof fields === 'string') fields = [fields];
  const key = KEYS.dailyStats(todayKey());
  const client = await getRedis();

  // Retry loop for optimistic locking (WATCH/MULTI/EXEC)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await client.watch(key);
      const raw = await client.get(key);
      const stats = raw ? JSON.parse(raw) : {};

      // Apply increments
      for (const field of fields) {
        stats[field] = (stats[field] || 0) + 1;
      }

      // Apply custom transform (e.g. uid tracking) using fresh data
      if (transform) {
        transform(stats);
      }

      // Execute atomically: only succeeds if key wasn't modified since WATCH
      const multi = client.multi();
      multi.set(key, JSON.stringify(stats), { EX: NINETY_DAYS });
      const results = await multi.exec();

      if (results !== null) {
        return; // Success
      }
      // results === null means another client modified the key; retry
    } catch (e) {
      console.error('incrementDaily transaction failed:', e.message);
      try { await client.unwatch(); } catch (_) {}
      if (attempt === 4) throw e;
    }
  }
}

// ── Validation ────────────────────────────────────────────
function validateEvent(body) {
  const { type } = body;
  const allowed = [
    'ai_feedback', 'error', 'session_start', 'feature_use',
    'buddy_pair', 'buddy_pair_match', 'buddy_pair_invite', 'buddy_pair_fallback',
    'buddy_unpair', 'buddy_find_match', 'buddy_cancel_search',
    'buddy_create_invite', 'buddy_accept_invite',
    'buddy_send_message', 'buddy_send_nudge', 'buddy_send_bloom',
    'backup_created', 'backup_restored',
    'hard_day_activated', 'crisis_opened', 'journal_saved',
    'wall_post', 'onboarding_complete', 'encrypted_backup',
    'api_timing', 'health_check', 'error_boundary',
    'idb_slow', 'idb_error', 'session_diagnostics', 'mood_pattern', 'ai_journey',
    'winddown_started', 'winddown_completed', 'level_snapshot',
  ];
  if (!type || !allowed.includes(type)) return false;
  return true;
}

// Strip any potential PII from error messages
function sanitizeError(msg) {
  if (!msg || typeof msg !== 'string') return 'unknown';
  // Remove anything that looks like a name, email, or path
  return msg
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/\/Users\/[^\s/]+/g, '/Users/[redacted]')
    .replace(/\/home\/[^\s/]+/g, '/home/[redacted]')
    .slice(0, 500);
}

export default async function handler(req, res) {
  const allowedOrigins = ['https://bloomselfcare.app', 'https://bloom-zeta-rouge.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check
  if (req.method === 'GET' && req.query?.check === 'health') {
    const hasRedis = !!process.env.REDIS_URL;
    let redisOk = false;
    if (hasRedis) { try { await getRedis(); redisOk = true; } catch(e) {} }
    return res.json({ ok: hasRedis && redisOk, service: 'diagnostics', ts: Date.now() });
  }

  if (!process.env.REDIS_URL) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  // ── POST: Receive telemetry from clients ────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Handle batched telemetry events (multiple events in one request)
    if (body.type === 'batch' && Array.isArray(body.events)) {
      const events = body.events.slice(0, 50); // Cap at 50 per batch
      for (const evt of events) {
        if (!evt.type || !validateEvent(evt)) continue;
        await processEvent(evt);
      }
      return res.json({ ok: true, processed: events.length });
    }

    if (!validateEvent(body)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    return await processEvent(body, res);
  }

  async function processEvent(body, res) {
    const ts = Date.now();

    switch (body.type) {
      case 'ai_feedback': {
        const { context, value } = body;
        if (!value || !['yes', 'no'].includes(value)) {
          if (res) return res.json({ ok: false });
          return;
        }
        await appendToList(KEYS.aiFeedback, {
          context: (context || 'unknown').slice(0, 50),
          value,
          ts,
        });
        await incrementDaily(value === 'yes' ? 'ai_helpful' : 'ai_unhelpful');
        if (res) return res.json({ ok: true });
        return;
      }

      case 'error': {
        const { message, stack, url } = body;
        await appendToList(KEYS.errors, {
          message: sanitizeError(message),
          stack: sanitizeError(stack),
          url: (url || '').slice(0, 200),
          ts,
        }, 2000);
        await incrementDaily('errors');
        if (res) return res.json({ ok: true });
        return;
      }

      case 'feature_use': {
        const { feature } = body;
        const allowedFeatures = [
          'journal', 'breathing', 'buddy', 'wall', 'mood_log',
          'hard_day', 'weekly_insight', 'monthly_reflection',
          'backup', 'encrypted_backup', 'mood_feelings',
          'settings', 'crisis', 'ai_reflection',
          'weekly', 'wellness', 'progress', 'community', 'grounding', 'bodyscan', 'reframe',
        ];
        if (!feature || !allowedFeatures.includes(feature)) {
          if (res) return res.json({ ok: false });
          return;
        }
        await incrementDaily('feature:' + feature);
        if (res) return res.json({ ok: true });
        return;
      }

      case 'session_start': {
        // Track unique users per day + event count in a single atomic write
        const uid = body.uid;
        const uidTransform = (uid && typeof uid === 'string') ? (stats) => {
          // Build uid set from the WATCH-protected stats (always fresh)
          const uidSet = stats._uids ? new Set(stats._uids.split(',')) : new Set();
          uidSet.add(uid.slice(0, 20));
          stats._uids = [...uidSet].join(',');
          stats.unique_users = uidSet.size;
        } : null;
        await appendToList(KEYS.events, { event: 'session_start', ts });
        await incrementDaily('event:session_start', uidTransform);
        if (res) return res.json({ ok: true });
        return;
      }

      case 'level_snapshot': {
        const { uid, level, xp, daysAtLevel, daysShowedUp, streak, hardDayToday, xpSources, featuresUsed, hasBuddy } = body;
        if (!uid || !level) { if (res) return res.json({ ok: false }); return; }
        // Store per-user level data (keyed by anonymous uid, overwritten each session)
        const userKey = `bloom_level_user:${uid.slice(0, 20)}`;
        await kvSet(userKey, {
          level, xp: xp || 0, daysAtLevel: daysAtLevel || 0,
          daysShowedUp: daysShowedUp || 0, streak: streak || 0,
          hardDayToday: !!hardDayToday,
          xpSources: xpSources || {}, featuresUsed: featuresUsed || [],
          hasBuddy: !!hasBuddy,
          lastSeen: ts,
        }, NINETY_DAYS);
        // Track uid in the level user index so we can enumerate them
        await addToSet('bloom_level_user_index', uid.slice(0, 20));
        // Track level-up timestamps per user for progression analytics
        const progressKey = `bloom_level_progress:${uid.slice(0, 20)}`;
        const progress = await kvGet(progressKey) || {};
        if (!progress[level]) progress[level] = ts;
        await kvSet(progressKey, progress, NINETY_DAYS);
        await incrementDaily(['event:level_snapshot', 'level:' + level]);
        if (res) return res.json({ ok: true });
        return;
      }

      default: {
        // Generic event tracking
        await appendToList(KEYS.events, {
          event: body.type,
          meta: typeof body.meta === 'object' ? JSON.stringify(body.meta).slice(0, 200) : undefined,
          ts,
        });
        await incrementDaily('event:' + body.type);
        if (res) return res.json({ ok: true });
        return;
      }
    }
  }

  // ── GET: Admin dashboard data ───────────────────────────
  if (req.method === 'GET') {
    const adminKey = process.env.ADMIN_KEY;
    const provided = req.headers['x-admin-key'];

    if (!adminKey || provided !== adminKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { view } = req.query;

    if (view === 'dashboard') {
      // Return aggregated dashboard data
      const [aiFeedback, errors, events] = await Promise.all([
        kvGet(KEYS.aiFeedback),
        kvGet(KEYS.errors),
        kvGet(KEYS.events),
      ]);

      // Get last 30 days of daily stats
      const dailyStats = {};
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const stats = await kvGet(KEYS.dailyStats(key));
        if (stats) dailyStats[key] = stats;
      }

      // Compute AI feedback summary
      const fb = aiFeedback || [];
      const fbLast7 = fb.filter(f => f.ts > Date.now() - 7 * 86400000);
      const fbLast30 = fb.filter(f => f.ts > Date.now() - 30 * 86400000);

      return res.json({
        ok: true,
        summary: {
          aiFeedback: {
            total: fb.length,
            last7Days: { yes: fbLast7.filter(f => f.value === 'yes').length, no: fbLast7.filter(f => f.value === 'no').length },
            last30Days: { yes: fbLast30.filter(f => f.value === 'yes').length, no: fbLast30.filter(f => f.value === 'no').length },
          },
          errors: {
            total: (errors || []).length,
            last24h: (errors || []).filter(e => e.ts > Date.now() - 86400000).length,
            recent: (errors || []).slice(-20).reverse(),
          },
          events: {
            total: (events || []).length,
            recent: (events || []).slice(-50).reverse(),
          },
          dailyStats,
        },
      });
    }

    if (view === 'ai_feedback') {
      const fb = await kvGet(KEYS.aiFeedback) || [];
      return res.json({ ok: true, data: fb.slice(-200).reverse() });
    }

    if (view === 'errors') {
      const errs = await kvGet(KEYS.errors) || [];
      return res.json({ ok: true, data: errs.slice(-200).reverse() });
    }

    if (view === 'events') {
      const evts = await kvGet(KEYS.events) || [];
      return res.json({ ok: true, data: evts.slice(-200).reverse() });
    }

    if (view === 'level_analytics') {
      const LEVEL_NAMES = ['Seedling','Sprout','Blooming','Thriving','Radiant','Glowing','Flourishing','Rooted','Evergreen','Full Bloom'];
      const idx = await kvGet('bloom_level_user_index') || [];
      const now = Date.now();
      const SEVEN_DAYS = 7 * 86400000;
      const THIRTY_DAYS = 30 * 86400000;

      // Gather all user data
      const users = [];
      for (const uid of idx) {
        const data = await kvGet(`bloom_level_user:${uid}`);
        if (data) users.push({ uid, ...data });
      }

      const totalUsers = users.length;
      const activeUsers = users.filter(u => (now - u.lastSeen) < SEVEN_DAYS);
      const active30 = users.filter(u => (now - u.lastSeen) < THIRTY_DAYS);

      // 1. Users per level (count + percentage)
      const levelCounts = {};
      const levelActive = {};
      const levelActive30 = {};
      LEVEL_NAMES.forEach(l => { levelCounts[l] = 0; levelActive[l] = 0; levelActive30[l] = 0; });
      users.forEach(u => {
        if (levelCounts[u.level] !== undefined) levelCounts[u.level]++;
      });
      activeUsers.forEach(u => {
        if (levelActive[u.level] !== undefined) levelActive[u.level]++;
      });
      active30.forEach(u => {
        if (levelActive30[u.level] !== undefined) levelActive30[u.level]++;
      });

      const levelDistribution = LEVEL_NAMES.map(name => ({
        name,
        total: levelCounts[name] || 0,
        pct: totalUsers > 0 ? Math.round(((levelCounts[name] || 0) / totalUsers) * 100) : 0,
        active7d: levelActive[name] || 0,
        active30d: levelActive30[name] || 0,
      }));

      // 2. Level-up conversion rate
      const conversionRates = [];
      for (let i = 0; i < LEVEL_NAMES.length - 1; i++) {
        const atOrAbove = users.filter(u => LEVEL_NAMES.indexOf(u.level) >= i).length;
        const nextOrAbove = users.filter(u => LEVEL_NAMES.indexOf(u.level) >= i + 1).length;
        conversionRates.push({
          from: LEVEL_NAMES[i],
          to: LEVEL_NAMES[i + 1],
          rate: atOrAbove > 0 ? Math.round((nextOrAbove / atOrAbove) * 100) : 0,
          fromCount: atOrAbove,
          toCount: nextOrAbove,
        });
      }

      // 3. Median days at current level (for active users)
      const daysAtLevelByLevel = {};
      LEVEL_NAMES.forEach(l => { daysAtLevelByLevel[l] = []; });
      activeUsers.forEach(u => {
        if (daysAtLevelByLevel[u.level]) daysAtLevelByLevel[u.level].push(u.daysAtLevel || 0);
      });
      const medianDaysAtLevel = LEVEL_NAMES.map(name => {
        const arr = daysAtLevelByLevel[name].sort((a, b) => a - b);
        const med = arr.length > 0 ? arr[Math.floor(arr.length / 2)] : null;
        return { name, median: med, count: arr.length };
      });

      // 4. Stagnation (active users at same level 30+ days)
      const stagnant = activeUsers.filter(u => (u.daysAtLevel || 0) >= 30);
      const stagnationByLevel = {};
      LEVEL_NAMES.forEach(l => { stagnationByLevel[l] = 0; });
      stagnant.forEach(u => { if (stagnationByLevel[u.level] !== undefined) stagnationByLevel[u.level]++; });

      // 5. Average daily XP by level (approximate from total XP / daysShowedUp)
      const avgDailyXP = {};
      LEVEL_NAMES.forEach(l => { avgDailyXP[l] = []; });
      activeUsers.forEach(u => {
        if (u.daysShowedUp > 0 && avgDailyXP[u.level]) {
          avgDailyXP[u.level].push(Math.round(u.xp / u.daysShowedUp));
        }
      });
      const avgXPByLevel = LEVEL_NAMES.map(name => {
        const arr = avgDailyXP[name];
        const avg = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
        return { name, avgDailyXP: avg, sampleSize: arr.length };
      });

      // 6. Hard day frequency by level
      const hardDayByLevel = {};
      LEVEL_NAMES.forEach(l => { hardDayByLevel[l] = { total: 0, hardDay: 0 }; });
      activeUsers.forEach(u => {
        if (hardDayByLevel[u.level]) {
          hardDayByLevel[u.level].total++;
          if (u.hardDayToday) hardDayByLevel[u.level].hardDay++;
        }
      });
      const hardDayRates = LEVEL_NAMES.map(name => ({
        name,
        rate: hardDayByLevel[name].total > 0 ? Math.round((hardDayByLevel[name].hardDay / hardDayByLevel[name].total) * 100) : null,
        count: hardDayByLevel[name].hardDay,
        total: hardDayByLevel[name].total,
      }));

      // 7. Feature adoption by level
      const featuresByLevel = {};
      LEVEL_NAMES.forEach(l => { featuresByLevel[l] = {}; });
      activeUsers.forEach(u => {
        if (featuresByLevel[u.level] && Array.isArray(u.featuresUsed)) {
          u.featuresUsed.forEach(f => {
            featuresByLevel[u.level][f] = (featuresByLevel[u.level][f] || 0) + 1;
          });
        }
      });

      // 8. XP source breakdown by level
      const xpSourcesByLevel = {};
      LEVEL_NAMES.forEach(l => { xpSourcesByLevel[l] = {}; });
      activeUsers.forEach(u => {
        if (xpSourcesByLevel[u.level] && u.xpSources) {
          Object.keys(u.xpSources).forEach(s => {
            xpSourcesByLevel[u.level][s] = (xpSourcesByLevel[u.level][s] || 0) + 1;
          });
        }
      });

      // 9. Buddy pair rate by level
      const buddyByLevel = {};
      LEVEL_NAMES.forEach(l => { buddyByLevel[l] = { total: 0, paired: 0 }; });
      activeUsers.forEach(u => {
        if (buddyByLevel[u.level]) {
          buddyByLevel[u.level].total++;
          if (u.hasBuddy) buddyByLevel[u.level].paired++;
        }
      });

      // 10. Return rate approximation (users with streak > 0 after 3+ day gap)
      const returnByLevel = {};
      LEVEL_NAMES.forEach(l => { returnByLevel[l] = { active: 0, returned: 0 }; });
      active30.forEach(u => {
        if (returnByLevel[u.level]) {
          returnByLevel[u.level].active++;
          // If they have a current streak but also showed up many days, they likely returned
          if (u.daysShowedUp > 3 && u.streak > 0 && u.streak < u.daysShowedUp) {
            returnByLevel[u.level].returned++;
          }
        }
      });

      return res.json({
        ok: true,
        levelAnalytics: {
          totalUsers,
          activeUsers7d: activeUsers.length,
          activeUsers30d: active30.length,
          levelDistribution,
          conversionRates,
          medianDaysAtLevel,
          stagnation: { total: stagnant.length, byLevel: stagnationByLevel },
          avgXPByLevel,
          hardDayRates,
          featuresByLevel,
          xpSourcesByLevel,
          buddyByLevel,
          returnByLevel,
        },
      });
    }

    return res.status(400).json({ error: 'Unknown view. Use: dashboard, ai_feedback, errors, events, level_analytics' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
