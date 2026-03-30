// Vercel serverless function for encouragement wall
// Uses Vercel KV (Upstash Redis) via REST API — no npm packages needed

// ── Content moderation (shared module) ─────────────────────
// All patterns and the moderateMessage function live in moderation.js.
// Update patterns there — both buddy.js and wall.js use the same source.
import { moderateMessage, CRUDE_PATTERNS } from './moderation.js';

// ── Redis client helpers ────────────────────────────────────
import { createClient } from 'redis';

let _redisClient = null;
async function getRedis() {
  if (_redisClient && _redisClient.isReady) return _redisClient;
  if (_redisClient) { try { await _redisClient.disconnect(); } catch(e) {} }
  _redisClient = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: (retries) => retries < 3 ? Math.min(retries * 200, 1000) : false } });
  _redisClient.on('error', () => {});
  await _redisClient.connect();
  return _redisClient;
}

async function kvGet(key) {
  try {
    const client = await getRedis();
    const val = await client.get(key);
    if (val === null) return null;
    return JSON.parse(val);
  } catch(e) { return null; }
}

async function kvSet(key, value) {
  try {
    const client = await getRedis();
    await client.set(key, JSON.stringify(value));
  } catch(e) {}
}

// Log moderation events to diagnostics
async function logModeration(source, result) {
  try {
    const key = 'bloom_diag:events';
    const client = await getRedis();
    const raw = await client.get(key);
    const events = raw ? JSON.parse(raw) : [];
    events.push({
      event: 'moderation',
      meta: JSON.stringify({ source, ok: result.ok, reason: result.reason || null, flag: result.flag || null }),
      ts: Date.now(),
    });
    if (events.length > 5000) events.splice(0, events.length - 5000);
    await client.set(key, JSON.stringify(events), { EX: 90 * 86400 });
    const dayKey = `bloom_diag:daily:${new Date().toISOString().slice(0, 10)}`;
    const dayRaw = await client.get(dayKey);
    const dayStats = dayRaw ? JSON.parse(dayRaw) : {};
    const counterKey = result.ok ? (result.flag ? 'mod_flagged' : 'mod_allowed') : 'mod_blocked';
    dayStats[counterKey] = (dayStats[counterKey] || 0) + 1;
    await client.set(dayKey, JSON.stringify(dayStats), { EX: 90 * 86400 });
  } catch(e) {}
}

// ── Threat compliance logging ──────────────────────────────
// Credible violent threats are logged with full metadata (message, IP, timestamp,
// user identifier) to a separate, long-retention Redis key. This exists solely
// so that if law enforcement requests records, we have something to produce.
// These logs are never displayed to users and are only accessible by admin.
const THREAT_LOG_KEY = 'bloom_mod:threat_log';

async function logThreat(source, userId, messageText, req) {
  const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || req?.headers?.['x-real-ip']
    || req?.socket?.remoteAddress
    || 'unknown';
  const entry = {
    ts: Date.now(),
    source,
    userId: userId || 'unknown',
    ip,
    userAgent: (req?.headers?.['user-agent'] || '').slice(0, 200),
    message: (messageText || '').slice(0, 500),
  };
  try {
    const client = await getRedis();
    const raw = await client.get(THREAT_LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    // Keep up to 1000 threat logs, 1 year retention
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    await client.set(THREAT_LOG_KEY, JSON.stringify(logs), { EX: 365 * 86400 });
  } catch(e) {}
  // Send admin alert (non-blocking, fire and forget)
  alertAdmin(entry).catch(() => {});
}

// ── Admin alert for credible threats ───────────────────────
async function alertAdmin(entry) {
  const timestamp = new Date(entry.ts).toISOString();
  const summary = `CREDIBLE THREAT DETECTED\n\nSource: ${entry.source}\nTime: ${timestamp}\nUser: ${entry.userId}\nIP: ${entry.ip}\nMessage: ${entry.message}\n\nINCIDENT RESPONSE:\n1. Review the full threat log in the admin dashboard\n2. Assess whether the threat is specific, credible, and imminent\n3. If credible: contact local law enforcement or submit an FBI tip at tips.fbi.gov\n4. The user has been auto-banned from all community features\n5. Preserve all evidence (do not delete the threat log entry)`;

  const promises = [];

  // Email alert via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL_TO;
  if (resendKey && alertEmail) {
    promises.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.ALERT_EMAIL_FROM || 'Bloom Alerts <alerts@bloomselfcare.app>',
          to: [alertEmail],
          subject: `[BLOOM] Credible threat detected via ${entry.source}`,
          text: summary,
        }),
      }).catch(() => {})
    );
  }

  // Webhook (Discord, Slack, etc.)
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    promises.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summary, content: summary }),
      }).catch(() => {})
    );
  }

  await Promise.allSettled(promises);
}

// ── User moderation strikes ──────────────────────────────
// Tracks moderation events per user fingerprint so repeat offenders
// can be identified and eventually blocked from social features
const STRIKES_KEY = 'bloom_mod:strikes';

async function getStrikes() {
  return await kvGet(STRIKES_KEY) || {};
}

async function saveStrikes(strikes) {
  await kvSet(STRIKES_KEY, strikes);
}

async function recordStrike(fp, reason, source, messageText) {
  if (!fp || fp === 'anon') return;
  const strikes = await getStrikes();
  if (!strikes[fp]) strikes[fp] = { incidents: [], banned: false };
  strikes[fp].incidents.push({
    reason,
    source,
    text: (messageText || '').slice(0, 80),
    ts: Date.now(),
  });
  // Keep last 50 incidents per user
  if (strikes[fp].incidents.length > 50) {
    strikes[fp].incidents = strikes[fp].incidents.slice(-50);
  }

  // Auto-ban: 3+ blocked messages within 24 hours
  if (!strikes[fp].banned) {
    const oneDayAgo = Date.now() - 86400000;
    const recentBlocked = strikes[fp].incidents.filter(
      i => i.ts > oneDayAgo && (i.reason === 'threat' || i.reason === 'harmful' || i.reason === 'safety' || i.reason === 'inappropriate')
    );
    // Immediate ban for credible threats, otherwise 3-strike rule
    const hasThreat = recentBlocked.some(i => i.reason === 'threat');
    if (hasThreat || recentBlocked.length >= 3) {
      strikes[fp].banned = true;
      strikes[fp].autoBannedAt = Date.now();
    }
  }

  await saveStrikes(strikes);
}

async function isUserBanned(fp) {
  if (!fp || fp === 'anon') return false;
  const strikes = await getStrikes();
  const user = strikes[fp];
  if (!user?.banned) return false;
  // Auto-bans expire after 24 hours. Admin bans (no autoBannedAt) are permanent.
  if (user.autoBannedAt && Date.now() - user.autoBannedAt > 86400000) {
    user.banned = false;
    delete user.autoBannedAt;
    await saveStrikes(strikes);
    return false;
  }
  return true;
}

async function getMessages() {
  const stored = await kvGet('bloom_wall_messages');
  return stored || [];
}

async function saveMessages(messages) {
  await kvSet('bloom_wall_messages', messages);
}

export default async function handler(req, res) {
  const allowedOrigins = ['https://bloomselfcare.app', 'https://bloom-zeta-rouge.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check
  if (req.method === 'GET' && req.query?.check === 'health') {
    const hasRedis = !!process.env.REDIS_URL;
    let redisOk = false;
    if (hasRedis) { try { await getRedis(); redisOk = true; } catch(e) {} }
    return res.json({ ok: hasRedis && redisOk, service: 'wall', ts: Date.now() });
  }

  // Check Redis is configured
  if (!process.env.REDIS_URL) {
    return res.status(503).json({ error: 'Wall storage not configured', messages: [] });
  }

  if (req.method === 'GET') {
    const messages = await getMessages();
    const recent = messages
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 30)
      .map(({ fp, ...m }) => m);
    return res.json({ messages: recent });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action } = body;

    if (action === 'post') {
      const { text, fp } = body;
      if (!text) return res.status(400).json({ error: 'Missing text' });

      // Check if user is banned from social features
      if (await isUserBanned(fp)) {
        return res.json({ ok: false, reason: 'banned' });
      }

      const check = moderateMessage(text);
      await logModeration('wall_post', check);

      // Record strike for blocked or flagged content
      if (!check.ok) {
        await recordStrike(fp, check.reason, 'wall', text);
        if (check.reason === 'threat') {
          await logThreat('wall', fp, text, req);
        }
        return res.json({ ok: false, reason: check.reason });
      }
      if (check.flag === 'crude') {
        await recordStrike(fp, 'crude', 'wall', text);
      }

      const messages = await getMessages();
      const oneHourAgo = Date.now() - 3600000;
      const recentFromFp = messages.filter(m => m.fp === (fp || 'anon') && m.ts > oneHourAgo);
      if (recentFromFp.length >= 2) return res.json({ ok: false, reason: 'rate-limit' });

      const msg = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: text.trim().slice(0, 140),
        hearts: 0,
        ts: Date.now(),
        fp: fp || 'anon',
      };
      // Auto-flag crude content so it renders with a content warning
      if (check.flag === 'crude') msg.moderated = 'auto';
      messages.push(msg);
      const trimmed = messages.sort((a, b) => b.ts - a.ts).slice(0, 200);
      await saveMessages(trimmed);

      const { fp: _, ...safe } = msg;
      const resp = { ok: true, message: safe };
      if (check.flag) resp.flag = check.flag;
      return res.json(resp);
    }

    if (action === 'heart') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const messages = await getMessages();
      const msg = messages.find(m => m.id === id);
      if (msg) {
        msg.hearts = (msg.hearts || 0) + 1;
        await saveMessages(messages);
      }
      return res.json({ ok: true, hearts: msg?.hearts || 0 });
    }

    // Batch hearts: increment multiple messages in a single API call (1 read + 1 write instead of N reads + N writes)
    if (action === 'heart-batch') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Missing ids' });
      // Cap batch size to prevent abuse
      const batch = ids.slice(0, 50);
      const messages = await getMessages();
      let changed = false;
      for (const id of batch) {
        const msg = messages.find(m => m.id === id);
        if (msg) { msg.hearts = (msg.hearts || 0) + 1; changed = true; }
      }
      if (changed) await saveMessages(messages);
      return res.json({ ok: true, count: batch.length });
    }

    if (action === 'report') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const messages = await getMessages();
      const msg = messages.find(m => m.id === id);
      if (msg) {
        msg.reports = (msg.reports || 0) + 1;
        if (msg.reports >= 3) {
          const filtered = messages.filter(m => m.id !== id);
          await saveMessages(filtered);
        } else {
          await saveMessages(messages);
        }
      }
      return res.json({ ok: true });
    }

    // Admin moderation — mark a message as moderated or remove it entirely
    if (action === 'moderate') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { id, type } = body; // type: 'warn' | 'remove' | 'clear'
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const messages = await getMessages();
      const msg = messages.find(m => m.id === id);

      if (type === 'remove') {
        // Record strike against the user before removing
        if (msg?.fp) await recordStrike(msg.fp, 'admin-remove', 'wall', msg.text);
        const filtered = messages.filter(m => m.id !== id);
        await saveMessages(filtered);
        return res.json({ ok: true, action: 'removed' });
      }
      if (type === 'clear') {
        if (msg) { delete msg.moderated; await saveMessages(messages); }
        return res.json({ ok: true, action: 'cleared' });
      }
      // Default: warn — grey out with content warning
      if (msg) {
        msg.moderated = 'admin';
        await saveMessages(messages);
        // Record strike for admin-warned content
        if (msg.fp) await recordStrike(msg.fp, 'admin-warn', 'wall', msg.text);
      }
      return res.json({ ok: true, action: 'warned' });
    }

    // Admin: rescan all existing messages against current filters
    if (action === 'rescan') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const messages = await getMessages();
      let flagged = 0;
      for (const msg of messages) {
        if (msg.moderated) continue; // already moderated, skip
        const check = moderateMessage(msg.text);
        if (check.flag === 'crude') {
          msg.moderated = 'auto';
          flagged++;
          if (msg.fp) await recordStrike(msg.fp, 'crude', 'wall-rescan', msg.text);
        }
      }
      if (flagged > 0) await saveMessages(messages);
      return res.json({ ok: true, scanned: messages.length, flagged });
    }

    // Admin: view flagged users with strike history
    if (action === 'flagged-users') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const strikes = await getStrikes();
      // Return sorted by most incidents, with summary stats
      const users = Object.entries(strikes).map(([fp, data]) => ({
        fp,
        banned: data.banned || false,
        totalIncidents: data.incidents.length,
        lastIncident: data.incidents.length > 0 ? data.incidents[data.incidents.length - 1].ts : 0,
        incidents: data.incidents.slice(-10), // last 10 incidents
      })).sort((a, b) => b.totalIncidents - a.totalIncidents);
      return res.json({ ok: true, users });
    }

    // Admin: view credible threat logs (compliance/legal)
    if (action === 'threat-log') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      try {
        const client = await getRedis();
        const raw = await client.get(THREAT_LOG_KEY);
        const logs = raw ? JSON.parse(raw) : [];
        return res.json({ ok: true, threats: logs.sort((a, b) => b.ts - a.ts) });
      } catch(e) {
        return res.json({ ok: true, threats: [] });
      }
    }

    // Admin: ban or unban a user from social features
    if (action === 'ban-user') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const { fp: targetFp, banned } = body;
      if (!targetFp) return res.status(400).json({ error: 'Missing fp' });
      const strikes = await getStrikes();
      if (!strikes[targetFp]) strikes[targetFp] = { incidents: [], banned: false };
      strikes[targetFp].banned = banned !== false;
      await saveStrikes(strikes);
      return res.json({ ok: true, banned: strikes[targetFp].banned });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
