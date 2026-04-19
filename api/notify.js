// Vercel serverless function for scheduling OneSignal push notifications
// Enables real push notifications that fire even when the app is closed
//
// Two flows:
// 1. Prefs sync flow (preferred): client POSTs sync-prefs once per change.
//    On sync, this endpoint immediately reconciles the user's scheduled
//    reminders so pref changes take effect right away. A daily Vercel Cron
//    at /api/cron-reminders handles the ongoing ~52h lookahead.
// 2. Direct scheduling actions (legacy): schedule, schedule-batch, cancel,
//    cancel-batch. Kept for backward compat during rollout.

import { getRedis, kvGet, kvSet, kvDel } from './_redis.js';
import {
  PREFS_INDEX_KEY, prefsKey, schedKey, SCHED_TTL,
  osSchedule, osCancel, reconcileUser,
} from './_push-scheduler.js';

const PREFS_TTL = 60 * 86400;

function localDateString(tz) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return fmt.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
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

  if (req.method === 'GET' && req.query?.check === 'health') {
    const hasKeys = !!(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY);
    return res.json({ ok: hasKeys, service: 'notify', ts: Date.now() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return res.status(503).json({ error: 'Push notification service not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { action } = body;

  // ── SYNC-PREFS: store reminder prefs AND reconcile inline ──────
  // Reconciling inline means pref changes take effect immediately instead
  // of waiting up to 24h for the next cron run.
  if (action === 'sync-prefs') {
    const { playerId, tz, prefs } = body;
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Missing playerId' });
    }
    if (!prefs || typeof prefs !== 'object') {
      return res.status(400).json({ error: 'Missing prefs' });
    }
    const clean = {
      tz: typeof tz === 'string' ? tz.slice(0, 64) : 'America/New_York',
      waterGoal: Number.isFinite(+prefs.waterGoal) ? +prefs.waterGoal : 3,
      habitTimes: {
        medication: (prefs.habitTimes && typeof prefs.habitTimes.medication === 'string')
          ? prefs.habitTimes.medication.slice(0, 32) : 'am',
      },
      dailyHabits: {
        medication: !!(prefs.dailyHabits && prefs.dailyHabits.medication),
      },
      notifications: {
        habitReminders: !!prefs.notifications?.habitReminders,
        medicationReminders: typeof prefs.notifications?.medicationReminders === 'string'
          ? prefs.notifications.medicationReminders.slice(0, 16) : 'auto',
        waterMode: typeof prefs.notifications?.waterMode === 'string'
          ? prefs.notifications.waterMode.slice(0, 16) : 'smart',
        sundayReminder: prefs.notifications?.sundayReminder !== false,
        weeklySummary: !!prefs.notifications?.weeklySummary,
      },
      updatedAt: Date.now(),
    };
    try {
      await kvSet(prefsKey(playerId), clean, PREFS_TTL);
      const client = await getRedis();
      await client.sAdd(PREFS_INDEX_KEY, playerId);
      // Reconcile now so changes take effect immediately. resetSchedule:true
      // cancels any stale reminders (e.g. user changed their med time) before
      // re-scheduling.
      const r = await reconcileUser(appId, apiKey, playerId, { resetSchedule: true });
      return res.json({ ok: true, reconciled: r });
    } catch (e) {
      console.log('[notify] sync-prefs failed:', e.message);
      return res.status(500).json({ error: 'sync failed' });
    }
  }

  // ── CLEAR-PREFS: user turned off push or unsubscribed ─────────
  if (action === 'clear-prefs') {
    const { playerId } = body;
    if (!playerId) return res.status(400).json({ error: 'Missing playerId' });
    try {
      const sched = (await kvGet(schedKey(playerId))) || {};
      const ids = Object.values(sched).map(v => v && v.id).filter(Boolean);
      await Promise.all(ids.slice(0, 100).map(id => osCancel(appId, apiKey, id)));
      await kvDel(schedKey(playerId));
      await kvDel(prefsKey(playerId));
      try {
        const client = await getRedis();
        await client.sRem(PREFS_INDEX_KEY, playerId);
      } catch {}
      return res.json({ ok: true, cancelled: ids.length });
    } catch (e) {
      console.log('[notify] clear-prefs failed:', e.message);
      return res.status(500).json({ error: 'clear failed' });
    }
  }

  // ── CANCEL-BY-TAG: cancel today's scheduled reminder by tag ────
  if (action === 'cancel-by-tag') {
    const { playerId, tag } = body;
    if (!playerId || !tag) {
      return res.status(400).json({ error: 'Missing playerId or tag' });
    }
    try {
      const prefs = await kvGet(prefsKey(playerId));
      const tz = (prefs && prefs.tz) || 'America/New_York';
      const today = localDateString(tz);
      const sched = (await kvGet(schedKey(playerId))) || {};
      const fullKey = `${tag}:${today}`;
      const entry = sched[fullKey];
      if (!entry || !entry.id) return res.json({ ok: true, cancelled: 0 });
      await osCancel(appId, apiKey, entry.id);
      delete sched[fullKey];
      await kvSet(schedKey(playerId), sched, SCHED_TTL);
      return res.json({ ok: true, cancelled: 1 });
    } catch (e) {
      console.log('[notify] cancel-by-tag failed:', e.message);
      return res.status(500).json({ error: 'cancel failed' });
    }
  }

  // ── CANCEL-BY-PREFIX: cancel all of today's reminders by prefix ──
  if (action === 'cancel-by-prefix') {
    const { playerId, prefix } = body;
    if (!playerId || !prefix) {
      return res.status(400).json({ error: 'Missing playerId or prefix' });
    }
    try {
      const prefs = await kvGet(prefsKey(playerId));
      const tz = (prefs && prefs.tz) || 'America/New_York';
      const today = localDateString(tz);
      const sched = (await kvGet(schedKey(playerId))) || {};
      const toCancel = Object.keys(sched).filter(k => {
        const [tag, date] = k.split(':');
        return tag && tag.startsWith(prefix) && date === today;
      });
      await Promise.all(toCancel.map(k => {
        const id = sched[k] && sched[k].id;
        return id ? osCancel(appId, apiKey, id) : null;
      }));
      toCancel.forEach(k => delete sched[k]);
      await kvSet(schedKey(playerId), sched, SCHED_TTL);
      return res.json({ ok: true, cancelled: toCancel.length });
    } catch (e) {
      console.log('[notify] cancel-by-prefix failed:', e.message);
      return res.status(500).json({ error: 'cancel failed' });
    }
  }

  // ── SCHEDULE (legacy) ──────────────────────────────────────────
  if (action === 'schedule') {
    const { playerId, title, message, sendAt, tag } = body;
    if (!playerId || !title || !message || !sendAt) {
      return res.status(400).json({ error: 'Missing required fields: playerId, title, message, sendAt' });
    }
    const sendTime = new Date(sendAt);
    if (isNaN(sendTime.getTime())) return res.status(400).json({ error: 'Invalid sendAt datetime' });
    if (sendTime.getTime() < Date.now() - 60000) return res.status(400).json({ error: 'sendAt must be in the future' });

    const result = await osSchedule(appId, apiKey, playerId, { title, message, sendAt, tag });
    if (!result.ok) return res.json(result);
    return res.json({ ok: true, notificationId: result.id });
  }

  // ── CANCEL (legacy) ────────────────────────────────────────────
  if (action === 'cancel') {
    const { notificationId } = body;
    if (!notificationId) return res.status(400).json({ error: 'Missing notificationId' });
    await osCancel(appId, apiKey, notificationId);
    return res.json({ ok: true });
  }

  // ── SCHEDULE-BATCH (legacy) ────────────────────────────────────
  if (action === 'schedule-batch') {
    const { playerId, notifications } = body;
    if (!playerId || !Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: 'Missing playerId or notifications array' });
    }
    const batch = notifications.slice(0, 40);
    const results = [];
    for (const notif of batch) {
      const { title, message, sendAt, tag } = notif;
      if (!title || !message || !sendAt) {
        results.push({ ok: false, tag, error: 'missing fields' });
        continue;
      }
      const sendTime = new Date(sendAt);
      if (isNaN(sendTime.getTime()) || sendTime.getTime() < Date.now() - 60000) {
        results.push({ ok: false, tag, error: 'invalid or past sendAt' });
        continue;
      }
      const result = await osSchedule(appId, apiKey, playerId, { title, message, sendAt, tag });
      if (result.ok) results.push({ ok: true, tag, notificationId: result.id });
      else results.push({ ok: false, tag, ...(result.errors ? { errors: result.errors } : { error: result.error }) });
    }
    return res.json({ ok: true, results });
  }

  // ── CANCEL-BATCH (legacy) ──────────────────────────────────────
  if (action === 'cancel-batch') {
    const { notificationIds } = body;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'Missing notificationIds array' });
    }
    const results = [];
    for (const nid of notificationIds.slice(0, 40)) {
      await osCancel(appId, apiKey, nid);
      results.push({ ok: true, notificationId: nid });
    }
    return res.json({ ok: true, results });
  }

  return res.status(400).json({
    error: 'Unknown action. Use: sync-prefs, clear-prefs, cancel-by-tag, cancel-by-prefix, schedule, cancel, schedule-batch, cancel-batch',
  });
}
