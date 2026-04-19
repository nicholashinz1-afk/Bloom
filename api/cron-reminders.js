// Vercel Cron endpoint — schedules push reminders on behalf of users
// independent of app state. Runs hourly.
//
// For every player in the prefs index, ensures that the next ~36 hours
// of habit/med/water/evening/weekly reminders are queued in OneSignal.
// Notifications are keyed by `tag:YYYY-MM-DD` so each reminder is only
// scheduled once per local date.
//
// Triggered by Vercel Cron (see vercel.json crons section). Authenticates
// via the CRON_SECRET env var using the Authorization: Bearer header.

import { getRedis, kvGet, kvSet, kvDel } from './_redis.js';

const PREFS_INDEX_KEY = 'bloom:push_prefs_index';
const prefsKey = (pid) => `bloom:push_prefs:${pid}`;
const schedKey = (pid) => `bloom:push_sched:${pid}`;
const SCHED_TTL = 7 * 86400;
const MAX_USERS_PER_RUN = 800;
const LOOKAHEAD_HOURS = 36;

// ── Reminder copy (kept in sync with index.html pools) ─────────
const HABIT_REMINDERS = [
  { id: 'm_teeth', hour: 8,  title: 'Morning reminder 🦷', body: "Have you brushed your teeth yet? A small act of care to start the day." },
  { id: 'e_teeth', hour: 21, title: 'Evening reminder 🦷', body: "Time to brush your teeth before bed. You've got this." },
];

const MED_REMINDER_MESSAGES = [
  { title: 'Medication reminder 💊', body: "A gentle nudge. Have you taken your medication? No judgment, just care." },
  { title: 'Medication check-in 💊', body: "Just a quiet reminder. Your medication is waiting when you're ready." },
  { title: 'Hey, a small reminder 💊', body: "Have you had your medication? Taking care of yourself matters." },
];

const WATER_MESSAGES = [
  { title: 'Water check 💧', body: "A small sip goes a long way. Your body will thank you." },
  { title: 'Hydration nudge 💧', body: "Have you had some water recently? Even a few sips count." },
  { title: 'Gentle reminder 💧', body: "Water is self-care too. Take a moment for a drink." },
  { title: 'Stay hydrated 💧', body: "You're doing great. Just a little water when you can." },
];

const EVENING_NUDGE_MESSAGES = [
  { title: 'Still here for you 🌙', body: "Even opening this app counts. One small thing is enough, or just rest. That's okay too." },
  { title: 'No pressure, just a nudge 💚', body: "If today was hard, that's okay. Logging your mood or writing one sentence in your journal is more than enough." },
  { title: 'A quiet check-in 🌿', body: "You don't have to do everything. Even just saying how you feel today matters." },
  { title: 'Hey, just checking in 🤍', body: "Some days are harder than others. If you can, just log your mood. If not, tomorrow is a fresh start." },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Timezone helpers ───────────────────────────────────────────
// Parse a tz into { year, month, day, hour } for a given UTC instant
function partsInTz(date, tz) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }
  const parts = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  let hour = +parts.hour;
  if (hour === 24) hour = 0; // Safari quirk
  return {
    year: +parts.year, month: +parts.month, day: +parts.day,
    hour, minute: +parts.minute, second: +parts.second,
  };
}

// Given local Y/M/D H:M in a tz, return a Date at that moment in UTC
function localToUtc(year, month, day, hour, minute, tz) {
  // Start with a guess: interpret fields as if they were UTC
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // Find what that guess looks like when rendered in the target tz
  const p = partsInTz(guess, tz);
  const asLocal = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = asLocal - guess.getTime();
  return new Date(guess.getTime() - offset);
}

function dateString(year, month, day) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Add N days to a local Y/M/D
function addDays(year, month, day, days) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function dayOfWeekUtcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun..6=Sat
}

// ── Compute reminders for next 36 hours in user's local tz ─────
function computeReminders(prefs, tz, nowUtc) {
  const n = prefs?.notifications || {};
  if (!n.habitReminders) return [];

  const reminders = [];
  const nowLocal = partsInTz(nowUtc, tz);
  const horizon = new Date(nowUtc.getTime() + LOOKAHEAD_HOURS * 3600 * 1000);

  const addIfFuture = (r) => {
    const send = localToUtc(r.y, r.m, r.d, r.hour, r.minute || 0, tz);
    if (send.getTime() <= nowUtc.getTime()) return; // past
    if (send.getTime() > horizon.getTime()) return; // beyond horizon
    reminders.push({
      tag: r.tag,
      localDate: dateString(r.y, r.m, r.d),
      sendAt: send.toISOString(),
      title: r.title,
      message: r.message,
    });
  };

  // Iterate today + next 2 local days (covers the 36h horizon across any tz)
  const days = [
    { y: nowLocal.year, m: nowLocal.month, d: nowLocal.day },
    addDays(nowLocal.year, nowLocal.month, nowLocal.day, 1),
    addDays(nowLocal.year, nowLocal.month, nowLocal.day, 2),
  ].map(x => ({ y: x.year, m: x.month, d: x.day }));

  // ── Habit reminders (teeth) ──
  for (const day of days) {
    for (const hr of HABIT_REMINDERS) {
      addIfFuture({
        ...day, hour: hr.hour, tag: `habit_${hr.id}`,
        title: hr.title, message: hr.body,
      });
    }
  }

  // ── Medication reminders ──
  const medOn = !!prefs?.dailyHabits?.medication;
  const medMode = n.medicationReminders || 'auto';
  if (medOn && medMode !== 'off') {
    const medTime = prefs?.habitTimes?.medication || 'am';
    const slots = [];
    const hasSlot = (val, slot) => val === slot || val === 'any' || (typeof val === 'string' && val.includes(slot));
    if (hasSlot(medTime, 'am')) slots.push({ slot: 'am', hour: 9 });
    if (hasSlot(medTime, 'afternoon')) slots.push({ slot: 'afternoon', hour: 14 });
    if (hasSlot(medTime, 'pm')) slots.push({ slot: 'pm', hour: 20 });
    if (medTime === 'any') slots.push({ slot: 'any', hour: 12 });

    for (const day of days) {
      for (const s of slots) {
        const msg = pick(MED_REMINDER_MESSAGES);
        addIfFuture({
          ...day, hour: s.hour, tag: `med_${s.slot}`,
          title: msg.title, message: msg.body,
        });
      }
    }
  }

  // ── Water reminders ──
  const waterMode = n.waterMode || 'smart';
  if (waterMode !== 'off') {
    for (const day of days) {
      if (waterMode === 'smart') {
        for (const h of [12, 16, 20]) {
          addIfFuture({
            ...day, hour: h, tag: `water_s${h}`,
            title: 'Hydration check 💧',
            message: 'A gentle nudge to drink some water. Even a few sips count.',
          });
        }
      } else if (waterMode === 'hourly') {
        for (let h = 12; h <= 21; h++) {
          const msg = pick(WATER_MESSAGES);
          addIfFuture({
            ...day, hour: h, tag: `water_h${h}`,
            title: msg.title, message: msg.body,
          });
        }
      }
    }
  }

  // ── Evening nudge (7:15pm local) ──
  for (const day of days) {
    const msg = pick(EVENING_NUDGE_MESSAGES);
    addIfFuture({
      ...day, hour: 19, minute: 15, tag: 'evening_nudge',
      title: msg.title, message: msg.body,
    });
  }

  // ── Weekly reflection (Saturday 10am local) ──
  if (n.sundayReminder !== false) {
    for (const day of days) {
      if (dayOfWeekUtcDate(day.y, day.m, day.d) === 6) {
        addIfFuture({
          ...day, hour: 10, tag: 'weekly_reflection',
          title: 'Time to reflect 🪞',
          message: 'Your weekly reflection is ready. Take a few minutes for yourself.',
        });
      }
    }
  }

  // ── Weekly summary (Sunday 6pm local) ──
  if (n.weeklySummary) {
    for (const day of days) {
      if (dayOfWeekUtcDate(day.y, day.m, day.d) === 0) {
        addIfFuture({
          ...day, hour: 18, tag: 'weekly_summary',
          title: 'Your weekly bloom summary 🌿',
          message: 'See how your week went. Check your progress in the app.',
        });
      }
    }
  }

  return reminders;
}

// ── OneSignal helpers ──────────────────────────────────────────
async function osSchedule(appId, apiKey, playerId, { title, message, sendAt, tag }) {
  try {
    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${apiKey}` },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: [playerId],
        headings: { en: title },
        contents: { en: message },
        url: 'https://bloomselfcare.app',
        send_after: sendAt,
        data: { bloom_tag: tag },
      }),
    });
    const result = await resp.json();
    if (result.errors) return { ok: false, errors: result.errors };
    return { ok: true, id: result.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function osCancel(appId, apiKey, notificationId) {
  try {
    await fetch(
      `https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${appId}`,
      { method: 'DELETE', headers: { 'Authorization': `Basic ${apiKey}` } }
    );
  } catch {}
}

// ── Per-user reconciliation ────────────────────────────────────
async function processUser(appId, apiKey, playerId) {
  const prefs = await kvGet(prefsKey(playerId));
  if (!prefs) {
    // Prefs expired. Cancel any stragglers and drop from index.
    const sched = (await kvGet(schedKey(playerId))) || {};
    for (const e of Object.values(sched)) if (e && e.id) osCancel(appId, apiKey, e.id);
    await kvDel(schedKey(playerId));
    try {
      const client = await getRedis();
      await client.sRem(PREFS_INDEX_KEY, playerId);
    } catch {}
    return { scheduled: 0, skipped: 0, purged: Object.keys(sched).length };
  }

  const tz = prefs.tz || 'America/New_York';
  const now = new Date();
  const sched = (await kvGet(schedKey(playerId))) || {};

  // Purge entries whose sendAt is already in the past (with 1h grace)
  let purged = 0;
  const cutoff = now.getTime() - 60 * 60 * 1000;
  for (const [k, v] of Object.entries(sched)) {
    if (!v || !v.sendAt || new Date(v.sendAt).getTime() < cutoff) {
      delete sched[k];
      purged++;
    }
  }

  const desired = computeReminders(prefs, tz, now);
  let scheduled = 0, skipped = 0, errors = 0;

  for (const r of desired) {
    const key = `${r.tag}:${r.localDate}`;
    if (sched[key]) { skipped++; continue; }
    const result = await osSchedule(appId, apiKey, playerId, r);
    if (result.ok && result.id) {
      sched[key] = { id: result.id, sendAt: r.sendAt };
      scheduled++;
    } else {
      errors++;
    }
  }

  await kvSet(schedKey(playerId), sched, SCHED_TTL);
  return { scheduled, skipped, purged, errors };
}

export default async function handler(req, res) {
  // Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
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

  // Process sequentially to stay within OneSignal rate limits
  for (const pid of batch) {
    try {
      const r = await processUser(appId, apiKey, pid);
      totals.scheduled += r.scheduled;
      totals.skipped += r.skipped;
      totals.purged += r.purged;
      totals.errors += r.errors || 0;
    } catch (e) {
      totals.failed++;
      console.log('[cron-reminders] user failed:', pid, e.message);
    }
    // Safety: stop if we've been running for ~55s (Vercel Pro cap is 60s)
    if (Date.now() - startedAt > 55000) {
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
