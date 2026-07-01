// Vercel Cron endpoint — schedules push reminders on behalf of users
// independent of app state. Runs daily (Hobby tier allows 1x/day).
//
// For every player in the prefs index, ensures that the next ~52 hours
// of habit/med/water/evening/weekly reminders are queued in OneSignal.
// Notifications are keyed by `tag:YYYY-MM-DD` so each reminder is only
// scheduled once per local date.
//
// Real-time pref changes don't wait for the next cron run — the sync-prefs
// action in api/notify.js calls reconcileUser() inline for that user.
//
// Authenticates via the CRON_SECRET env var (Vercel Cron sends it as
// Authorization: Bearer) or via the x-vercel-cron header.

import crypto from 'node:crypto';
import { getRedis } from './_redis.js';
import { PREFS_INDEX_KEY, reconcileUser } from './_push-scheduler.js';

const MAX_USERS_PER_RUN = 2000;
const TIME_BUDGET_MS = 55000;

// Constant-time string compare (avoids leaking the secret via timing, and
// avoids throwing on length mismatch the way timingSafeEqual does directly).
function safeEqual(a, b) {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  // Fail closed: an unset secret must not leave the scheduler open to anyone.
  // Vercel auto-injects `Authorization: Bearer <CRON_SECRET>` on cron runs when
  // the env var is set, so the real cron is unaffected. The old x-vercel-cron
  // header check is dropped — that header is client-spoofable.
  if (!secret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!safeEqual(token, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return res.status(503).json({ error: 'Push notification service not configured' });
  }

  const startedAt = Date.now();
  let playerIds = [];
  try {
    const client = await getRedis();
    playerIds = await client.sMembers(PREFS_INDEX_KEY);
  } catch (e) {
    return res.status(500).json({ error: 'redis unavailable', message: e.message });
  }

  const batch = playerIds.slice(0, MAX_USERS_PER_RUN);
  const totals = { users: batch.length, scheduled: 0, skipped: 0, purged: 0, errors: 0, failed: 0 };

  for (const pid of batch) {
    try {
      const r = await reconcileUser(appId, apiKey, pid);
      totals.scheduled += r.scheduled;
      totals.skipped += r.skipped;
      totals.purged += r.purged;
      totals.errors += r.errors || 0;
    } catch (e) {
      totals.failed++;
      console.log('[cron-reminders] user failed:', pid, e.message);
    }
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      totals.truncatedAt = pid;
      break;
    }
  }

  return res.json({
    ok: true,
    elapsedMs: Date.now() - startedAt,
    indexSize: playerIds.length,
    ...totals,
  });
}
