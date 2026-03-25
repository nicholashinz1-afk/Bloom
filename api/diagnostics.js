// Vercel serverless function for Bloom diagnostics & telemetry
// Collects anonymous operational telemetry — no PII, no journal content
// Admin dashboard protected by ADMIN_KEY env var

import { kvGet, kvSet } from './_shared/redis.js';
import { setCorsHeaders, handlePreflight, parseBody } from './_shared/cors.js';

// ── Keys ──────────────────────────────────────────────────
const KEYS = {
  aiFeedback: 'bloom_diag:ai_feedback',
  errors: 'bloom_diag:errors',
  events: 'bloom_diag:events',
  dailyStats: (d) => `bloom_diag:daily:${d}`,
};

const NINETY_DAYS = 90 * 24 * 60 * 60;
const MAX_LIST_SIZE = 5000;

async function appendToList(key, item, maxSize = MAX_LIST_SIZE) {
  const list = await kvGet(key) || [];
  list.push(item);
  const trimmed = list.length > maxSize ? list.slice(-maxSize) : list;
  await kvSet(key, trimmed, NINETY_DAYS);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function incrementDaily(field) {
  const key = KEYS.dailyStats(todayKey());
  const stats = await kvGet(key) || {};
  stats[field] = (stats[field] || 0) + 1;
  await kvSet(key, stats, NINETY_DAYS);
}

// ── Validation ────────────────────────────────────────────
const ALLOWED_EVENTS = [
  'ai_feedback', 'error', 'session_start', 'feature_use',
  'buddy_pair', 'buddy_unpair', 'backup_created', 'backup_restored',
  'hard_day_activated', 'crisis_opened', 'journal_saved',
  'wall_post', 'onboarding_complete', 'encrypted_backup',
];

function validateEvent(body) {
  return body.type && ALLOWED_EVENTS.includes(body.type);
}

function sanitizeError(msg) {
  if (!msg || typeof msg !== 'string') return 'unknown';
  return msg
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/\/Users\/[^\s/]+/g, '/Users/[redacted]')
    .replace(/\/home\/[^\s/]+/g, '/home/[redacted]')
    .slice(0, 500);
}

const ALLOWED_FEATURES = [
  'journal', 'breathing', 'buddy', 'wall', 'mood_log',
  'hard_day', 'weekly_insight', 'monthly_reflection',
  'backup', 'encrypted_backup', 'mood_feelings',
  'settings', 'crisis', 'ai_reflection',
];

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (!process.env.REDIS_URL) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  // ── POST: Receive telemetry from clients ────────────────
  if (req.method === 'POST') {
    const body = parseBody(req);

    if (!validateEvent(body)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const ts = Date.now();

    switch (body.type) {
      case 'ai_feedback': {
        const { context, value } = body;
        if (!value || !['yes', 'no'].includes(value)) {
          return res.json({ ok: false });
        }
        await appendToList(KEYS.aiFeedback, {
          context: (context || 'unknown').slice(0, 50),
          value,
          ts,
        });
        await incrementDaily(value === 'yes' ? 'ai_helpful' : 'ai_unhelpful');
        return res.json({ ok: true });
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
        return res.json({ ok: true });
      }

      case 'feature_use': {
        const { feature } = body;
        if (!feature || !ALLOWED_FEATURES.includes(feature)) {
          return res.json({ ok: false });
        }
        await incrementDaily('feature:' + feature);
        return res.json({ ok: true });
      }

      default: {
        await appendToList(KEYS.events, {
          event: body.type,
          meta: typeof body.meta === 'object' ? JSON.stringify(body.meta).slice(0, 200) : undefined,
          ts,
        });
        await incrementDaily('event:' + body.type);
        return res.json({ ok: true });
      }
    }
  }

  // ── GET: Admin dashboard data ───────────────────────────
  if (req.method === 'GET') {
    const adminKey = process.env.ADMIN_KEY;
    const provided = req.headers['x-admin-key'] || req.query?.key;

    if (!adminKey || provided !== adminKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { view } = req.query;

    if (view === 'dashboard') {
      const [aiFeedback, errors, events] = await Promise.all([
        kvGet(KEYS.aiFeedback),
        kvGet(KEYS.errors),
        kvGet(KEYS.events),
      ]);

      const dailyStats = {};
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const stats = await kvGet(KEYS.dailyStats(key));
        if (stats) dailyStats[key] = stats;
      }

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

    return res.status(400).json({ error: 'Unknown view. Use: dashboard, ai_feedback, errors, events' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
