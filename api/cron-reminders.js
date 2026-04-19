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

import { getRedis } from './_redis.js';
import { PREFS_INDEX_KEY, reconcileUser } from './_push-scheduler.js';

const MAX_USERS_PER_RUN = 2000;
const TIME_BUDGET_MS = 55000;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  if (secret) {
    if (!isVercelCron && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
