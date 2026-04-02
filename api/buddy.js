// Vercel serverless function for bloom buddy
// Uses Vercel KV (Upstash Redis) via REST API — same pattern as wall.js

// ── Content moderation (shared module) ─────────────────────
// All patterns and the moderateMessage function live in moderation.js.
// Update patterns there — both buddy.js and wall.js use the same source.
import { moderateMessage } from './moderation.js';

// ── Redis client helpers (shared module) ────────────────────
import { getRedis, kvGet, kvSet, kvDel, logModeration } from './_redis.js';

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
// Sends up to 3 notifications when a credible threat is detected:
// 1. Email via Resend (RESEND_API_KEY + ALERT_EMAIL_TO)
// 2. Push notification via OneSignal (ADMIN_ONESIGNAL_ID)
// 3. Webhook POST (ALERT_WEBHOOK_URL) for Discord/Slack/etc.
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
          html: `<div style="font-family:monospace;white-space:pre-wrap;background:#1a1a1a;color:#e0e0e0;padding:20px;border-radius:8px">
<h2 style="color:#b07878;margin-top:0">CREDIBLE THREAT DETECTED</h2>
<p><strong>Source:</strong> ${entry.source}<br>
<strong>Time:</strong> ${timestamp}<br>
<strong>User ID:</strong> ${entry.userId}<br>
<strong>IP:</strong> ${entry.ip}<br>
<strong>User Agent:</strong> ${(entry.userAgent || '').slice(0, 100)}</p>
<div style="background:#2a1a1a;padding:12px;border-radius:4px;border:1px solid #b07878;margin:12px 0">
<strong>Message:</strong><br>${entry.message}
</div>
<h3 style="color:#c9954a">Incident Response Steps</h3>
<ol>
<li>Review the full threat log in the <a href="https://bloomselfcare.app/admin.html" style="color:#8fbc8f">admin dashboard</a></li>
<li>Assess whether the threat is specific, credible, and imminent</li>
<li>If credible: contact local law enforcement or submit an FBI tip at <a href="https://tips.fbi.gov" style="color:#8fbc8f">tips.fbi.gov</a></li>
<li>The user has been auto-banned from all community features</li>
<li>Preserve all evidence (do not delete the threat log entry)</li>
</ol>
<p style="color:#888;font-size:12px">See INCIDENT_RESPONSE.md for the full playbook.</p>
</div>`,
        }),
      }).catch(() => {})
    );
  }

  // Push notification via OneSignal
  const adminPushId = process.env.ADMIN_ONESIGNAL_ID;
  if (adminPushId) {
    promises.push(
      sendPush(adminPushId, 'BLOOM: Credible threat detected', `Threat logged from ${entry.source}. Check admin dashboard immediately.`)
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

// ── User moderation strikes (shared store with wall.js) ─────
const STRIKES_KEY = 'bloom_mod:strikes';

async function getStrikes() {
  return await kvGet(STRIKES_KEY) || {};
}

async function saveStrikes(strikes) {
  await kvSet(STRIKES_KEY, strikes);
}

async function recordStrike(userId, reason, source, messageText) {
  if (!userId) return;
  const strikes = await getStrikes();
  if (!strikes[userId]) strikes[userId] = { incidents: [], banned: false };
  strikes[userId].incidents.push({
    reason,
    source,
    text: (messageText || '').slice(0, 80),
    ts: Date.now(),
  });
  if (strikes[userId].incidents.length > 50) {
    strikes[userId].incidents = strikes[userId].incidents.slice(-50);
  }

  // Auto-ban: 3+ blocked messages within 24 hours
  if (!strikes[userId].banned) {
    const oneDayAgo = Date.now() - 86400000;
    const recentBlocked = strikes[userId].incidents.filter(
      i => i.ts > oneDayAgo && (i.reason === 'threat' || i.reason === 'harmful' || i.reason === 'safety' || i.reason === 'inappropriate')
    );
    // Immediate ban for credible threats, otherwise 3-strike rule
    const hasThreat = recentBlocked.some(i => i.reason === 'threat');
    if (hasThreat || recentBlocked.length >= 3) {
      strikes[userId].banned = true;
      strikes[userId].autoBannedAt = Date.now();
    }
  }

  await saveStrikes(strikes);
}

async function isUserBanned(userId) {
  if (!userId) return false;
  const strikes = await getStrikes();
  const user = strikes[userId];
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

// ── OneSignal push notification helper ──────────────────────
async function sendPush(playerId, title, message) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey || !playerId) {
    console.log('[buddy] sendPush skipped — missing', !appId ? 'appId' : !apiKey ? 'apiKey' : 'playerId');
    return;
  }
  try {
    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: [playerId],
        headings: { en: title },
        contents: { en: message },
        url: 'https://bloomselfcare.app',
      }),
    });
    const result = await resp.json();
    if (result.errors) console.log('[buddy] sendPush error:', JSON.stringify(result.errors));
  } catch(e) {
    console.log('[buddy] sendPush failed:', e.message);
  }
}

// ── ID generation ───────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/1/I confusion
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Admin: can have multiple buddies ────────────────────────
// Set ADMIN_BUDDY_ID env var in Vercel to your bloom_buddy_id from localStorage
const ADMIN_BUDDY_ID = process.env.ADMIN_BUDDY_ID || null;

function isAdmin(buddyId) {
  return ADMIN_BUDDY_ID && buddyId === ADMIN_BUDDY_ID;
}

// ── Lookup helpers (supports multi-buddy for admin) ─────────
// Lookup stores: { pairs: [{ pairId, partnerId }] }
async function getLookup(buddyId) {
  const raw = await kvGet(`bloom_buddy_lookup:${buddyId}`);
  if (!raw) return { pairs: [] };
  // Migrate old format: { pairId, partnerId } → { pairs: [...] }
  if (raw.pairId && !raw.pairs) return { pairs: [{ pairId: raw.pairId, partnerId: raw.partnerId }] };
  return raw;
}

async function addPairToLookup(buddyId, pairId, partnerId) {
  const lookup = await getLookup(buddyId);
  lookup.pairs.push({ pairId, partnerId });
  await kvSet(`bloom_buddy_lookup:${buddyId}`, lookup);
}

async function removePairFromLookup(buddyId, pairId) {
  const lookup = await getLookup(buddyId);
  lookup.pairs = lookup.pairs.filter(p => p.pairId !== pairId);
  await kvSet(`bloom_buddy_lookup:${buddyId}`, lookup);
}

function hasPair(lookup) {
  return lookup.pairs.length > 0;
}

function getFirstPair(lookup) {
  return lookup.pairs[0] || null;
}

function canAddBuddy(buddyId, lookup) {
  // Everyone can have multiple buddies (capped at 10 to prevent abuse)
  return lookup.pairs.length < 10;
}

// ── Milestone streaks ───────────────────────────────────────
const MILESTONES = [7, 14, 30, 60, 100];

// ── Main handler ────────────────────────────────────────────
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
    return res.json({ ok: hasRedis && redisOk, service: 'buddy', ts: Date.now() });
  }

  if (!process.env.REDIS_URL) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch(e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  const { action, buddyId } = body;

  if (!action) return res.status(400).json({ error: 'Missing action' });

  // ── REGISTER: create or update buddy profile ────────────
  if (action === 'register') {
    const { name, oneSignalId } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const existing = await kvGet(`bloom_buddy:${buddyId}`);
    const profile = {
      ...(existing || {}),
      name: (name || existing?.name || 'Bloom User').slice(0, 30),
      oneSignalId: oneSignalId || existing?.oneSignalId || null,
      lastActive: Date.now(),
      createdAt: existing?.createdAt || Date.now(),
    };
    await kvSet(`bloom_buddy:${buddyId}`, profile);
    return res.json({ ok: true, profile: { name: profile.name } });
  }

  // ── SYNC: update mood/streak/habitPct + trigger notifications ──
  if (action === 'sync') {
    const { mood, streak, habitPct, oneSignalId, level, levelEmoji } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const profile = await kvGet(`bloom_buddy:${buddyId}`) || {};
    const prevMood = profile.mood;
    const prevStreak = profile.streak || 0;
    const prevLevel = profile.level || null;

    profile.mood = mood !== undefined ? mood : profile.mood;
    profile.moodTs = mood !== undefined ? Date.now() : profile.moodTs;
    profile.streak = streak !== undefined ? streak : profile.streak;
    profile.habitPct = habitPct !== undefined ? habitPct : profile.habitPct;
    if (level) { profile.level = level; profile.levelEmoji = levelEmoji; }
    if (oneSignalId) profile.oneSignalId = oneSignalId;
    profile.lastActive = Date.now();

    await kvSet(`bloom_buddy:${buddyId}`, profile);

    // Check if paired → trigger notifications and shared milestones for all partners
    const lookup = await getLookup(buddyId);
    const todayStr = new Date().toISOString().slice(0, 10);
    // Prefetch all partner profiles in parallel
    const partnerProfiles = await Promise.all(
      lookup.pairs.map(pair => kvGet(`bloom_buddy:${pair.partnerId}`))
    );
    for (let _pi = 0; _pi < lookup.pairs.length; _pi++) {
      const pair = lookup.pairs[_pi];
      const partner = partnerProfiles[_pi];
      if (!partner) continue;

      // ── Shared milestones: count days both showed up (cumulative, never resets)
      const partnerActiveToday = partner.lastActive && new Date(partner.lastActive).toISOString().slice(0, 10) === todayStr;
      if (partnerActiveToday) {
        const pairData = await kvGet(`bloom_buddy_pair:${pair.pairId}`);
        if (pairData && pairData.sharedDaysLastDate !== todayStr) {
          pairData.sharedDays = (pairData.sharedDays || 0) + 1;
          pairData.sharedDaysLastDate = todayStr;
          await kvSet(`bloom_buddy_pair:${pair.pairId}`, pairData);

          // Shared milestone notifications
          const SHARED_MILESTONES = [5, 10, 25, 50, 100];
          if (SHARED_MILESTONES.includes(pairData.sharedDays)) {
            if (partner.oneSignalId) {
              await sendPush(partner.oneSignalId, 'bloom buddy',
                `You and ${profile.name || 'your buddy'} have both shown up ${pairData.sharedDays} times!`);
            }
            if (profile.oneSignalId) {
              await sendPush(profile.oneSignalId, 'bloom buddy',
                `You and ${partner.name || 'your buddy'} have both shown up ${pairData.sharedDays} times!`);
            }
          }
        }
      }

      if (!partner.oneSignalId) continue;

      // 1. Low/rough mood notification (rate-limited to 1 per 12h)
      if (mood !== undefined && mood >= 0 && mood <= 1) {
        const twelveHoursAgo = Date.now() - 43200000;
        if (!profile.lastMoodNotifTs || profile.lastMoodNotifTs < twelveHoursAgo) {
          profile.lastMoodNotifTs = Date.now();
          await kvSet(`bloom_buddy:${buddyId}`, profile);
          await sendPush(
            partner.oneSignalId,
            'bloom buddy',
            `${profile.name || 'Your bloom buddy'} is having a rough day. A kind word could mean a lot`
          );
        }
      }

      // 2. Inactivity nudge: if partner hasn't been active in 24h+
      if (partner.lastActive) {
        const dayAgo = Date.now() - 86400000;
        const twoDaysAgo = Date.now() - 172800000;
        if (partner.lastActive < dayAgo) {
          if (!partner.lastInactivityNotifTs || partner.lastInactivityNotifTs < twoDaysAgo) {
            partner.lastInactivityNotifTs = Date.now();
            await kvSet(`bloom_buddy:${pair.partnerId}`, partner);
            await sendPush(
              partner.oneSignalId,
              'bloom buddy',
              'Your bloom buddy is thinking of you. It\'s a new day to check in'
            );
          }
        }
      }

      // 3. Milestone celebration
      if (streak !== undefined && streak > prevStreak) {
        for (const m of MILESTONES) {
          if (streak >= m && prevStreak < m) {
            const lastMilestone = profile.lastMilestoneNotified || 0;
            if (lastMilestone < m) {
              profile.lastMilestoneNotified = m;
              await kvSet(`bloom_buddy:${buddyId}`, profile);
              await sendPush(
                partner.oneSignalId,
                'bloom buddy',
                `${profile.name || 'Your bloom buddy'} has shown up for ${m} days!`
              );
            }
          }
        }
      }

      // 4. Level-up celebration — notify buddy when partner reaches a new level
      if (level && prevLevel && level !== prevLevel) {
        const emoji = levelEmoji || '🌱';
        await sendPush(
          partner.oneSignalId,
          'bloom buddy',
          `${profile.name || 'Your bloom buddy'} just leveled up to ${level} ${emoji}!`
        );
      }
    }

    return res.json({ ok: true });
  }

  // ── CREATE-INVITE: generate a 6-char invite code ────────
  if (action === 'create-invite') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const profile = await kvGet(`bloom_buddy:${buddyId}`);
    if (!profile) return res.status(400).json({ error: 'Register first' });

    // Check if at buddy limit
    const lookup = await getLookup(buddyId);
    if (!canAddBuddy(buddyId, lookup)) return res.json({ ok: false, reason: 'max-buddies' });

    const code = genInviteCode();
    await kvSet(`bloom_buddy_invite:${code}`, {
      buddyId,
      name: profile.name || 'Bloom User',
      createdAt: Date.now(),
    });

    return res.json({ ok: true, code });
  }

  // ── CHECK-INVITE: validate an invite code ───────────────
  if (action === 'check-invite') {
    const { code } = body;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const invite = await kvGet(`bloom_buddy_invite:${code.toUpperCase()}`);
    if (!invite) return res.json({ ok: false, reason: 'invalid' });

    // Check expiry (48h)
    if (Date.now() - invite.createdAt > 172800000) {
      await kvDel(`bloom_buddy_invite:${code.toUpperCase()}`);
      return res.json({ ok: false, reason: 'expired' });
    }

    return res.json({ ok: true, name: invite.name });
  }

  // ── ACCEPT-INVITE: pair two users via invite code ───────
  if (action === 'accept-invite') {
    const { code } = body;
    if (!buddyId || !code) return res.status(400).json({ error: 'Missing buddyId or code' });

    const invite = await kvGet(`bloom_buddy_invite:${code.toUpperCase()}`);
    if (!invite) return res.json({ ok: false, reason: 'invalid' });

    // Check expiry
    if (Date.now() - invite.createdAt > 172800000) {
      await kvDel(`bloom_buddy_invite:${code.toUpperCase()}`);
      return res.json({ ok: false, reason: 'expired' });
    }

    // Can't pair with yourself
    if (invite.buddyId === buddyId) return res.json({ ok: false, reason: 'self-pair' });

    // Check buddy limits
    const myLookup = await getLookup(buddyId);
    if (!canAddBuddy(buddyId, myLookup)) return res.json({ ok: false, reason: 'max-buddies' });
    const theirLookup = await getLookup(invite.buddyId);
    if (!canAddBuddy(invite.buddyId, theirLookup)) return res.json({ ok: false, reason: 'inviter-max-buddies' });

    // Check not already paired with this person
    if (myLookup.pairs.some(p => p.partnerId === invite.buddyId)) return res.json({ ok: false, reason: 'already-buddies' });

    // Create pair
    const pairId = genId();
    await kvSet(`bloom_buddy_pair:${pairId}`, {
      user1: invite.buddyId,
      user2: buddyId,
      createdAt: Date.now(),
    });

    // Add to lookup entries
    await addPairToLookup(buddyId, pairId, invite.buddyId);
    await addPairToLookup(invite.buddyId, pairId, buddyId);

    // Initialize empty message thread
    await kvSet(`bloom_buddy_msgs:${pairId}`, []);

    // Delete the invite code
    await kvDel(`bloom_buddy_invite:${code.toUpperCase()}`);

    // Get profiles for response
    const myProfile = await kvGet(`bloom_buddy:${buddyId}`) || {};
    const theirProfile = await kvGet(`bloom_buddy:${invite.buddyId}`) || {};

    // Notify both
    if (theirProfile.oneSignalId) {
      await sendPush(theirProfile.oneSignalId, 'bloom buddy', `You've been paired with ${myProfile.name || 'a bloom buddy'}! Open Bloom to say hi`);
    }
    if (myProfile.oneSignalId) {
      await sendPush(myProfile.oneSignalId, 'bloom buddy', `You've been paired with ${theirProfile.name || 'a bloom buddy'}! Open Bloom to say hi`);
    }

    return res.json({
      ok: true,
      pairId,
      partnerId: invite.buddyId,
      partnerName: theirProfile.name || 'bloom buddy',
    });
  }

  // ── FIND-MATCH: enter queue or get matched ──────────────
  if (action === 'find-match') {
    const { prefs } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    // Block banned users from finding new buddies
    if (await isUserBanned(buddyId)) {
      return res.json({ ok: false, reason: 'not-available' });
    }

    // Check buddy limit
    const myLookup = await getLookup(buddyId);
    if (!canAddBuddy(buddyId, myLookup)) return res.json({ ok: false, reason: 'max-buddies' });

    const profile = await kvGet(`bloom_buddy:${buddyId}`);
    if (!profile) return res.status(400).json({ error: 'Register first' });

    const queue = await kvGet('bloom_buddy_queue') || [];

    // Remove stale entries (older than 7 days) and self
    const now = Date.now();
    const fresh = queue.filter(q => q.buddyId !== buddyId && (now - q.ts) < 604800000);

    // Try to find a compatible match
    const myPrefs = prefs || {};
    let bestMatch = null;
    let bestScore = -1;

    for (const candidate of fresh) {
      // Check they can accept another buddy and aren't already my buddy
      const cLookup = await getLookup(candidate.buddyId);
      if (!canAddBuddy(candidate.buddyId, cLookup)) continue;
      if (myLookup.pairs.some(p => p.partnerId === candidate.buddyId)) continue;

      // Skip blocked users (3+ reports)
      const cProfile = await kvGet(`bloom_buddy:${candidate.buddyId}`);
      if (cProfile?.blocked) continue;

      let score = 0;
      const cp = candidate.prefs || {};
      if (myPrefs.frequency && cp.frequency && myPrefs.frequency === cp.frequency) score += 2;
      // focus can be a string (legacy) or array (multi-select)
      const myFocus = Array.isArray(myPrefs.focus) ? myPrefs.focus : (myPrefs.focus ? [myPrefs.focus] : []);
      const cpFocus = Array.isArray(cp.focus) ? cp.focus : (cp.focus ? [cp.focus] : []);
      const overlap = myFocus.filter(f => cpFocus.includes(f)).length;
      score += overlap;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    // Admin fallback: if no match found and admin exists, auto-pair with admin
    if (!bestMatch && ADMIN_BUDDY_ID && buddyId !== ADMIN_BUDDY_ID) {
      const adminLookup = await getLookup(ADMIN_BUDDY_ID);
      const alreadyBuddies = myLookup.pairs.some(p => p.partnerId === ADMIN_BUDDY_ID);
      if (!alreadyBuddies && canAddBuddy(ADMIN_BUDDY_ID, adminLookup)) {
        let adminProfile = await kvGet(`bloom_buddy:${ADMIN_BUDDY_ID}`);
        // Auto-create admin profile if it doesn't exist yet
        if (!adminProfile) {
          adminProfile = { name: 'Bloom', registeredAt: Date.now() };
          await kvSet(`bloom_buddy:${ADMIN_BUDDY_ID}`, adminProfile);
        }
        bestMatch = { buddyId: ADMIN_BUDDY_ID, name: adminProfile.name };
      }
    }

    if (bestMatch) {
      // Remove matched user from queue if they were in it
      const updatedQueue = fresh.filter(q => q.buddyId !== bestMatch.buddyId);
      await kvSet('bloom_buddy_queue', updatedQueue);

      // Create pair
      const pairId = genId();
      await kvSet(`bloom_buddy_pair:${pairId}`, {
        user1: bestMatch.buddyId,
        user2: buddyId,
        createdAt: Date.now(),
      });
      await addPairToLookup(buddyId, pairId, bestMatch.buddyId);
      await addPairToLookup(bestMatch.buddyId, pairId, buddyId);
      await kvSet(`bloom_buddy_msgs:${pairId}`, []);

      const partnerProfile = await kvGet(`bloom_buddy:${bestMatch.buddyId}`) || {};

      // Notify both
      if (partnerProfile.oneSignalId) {
        await sendPush(partnerProfile.oneSignalId, 'bloom buddy', `You've been matched with ${profile.name || 'a bloom buddy'}! Open Bloom to say hi`);
      }
      if (profile.oneSignalId) {
        await sendPush(profile.oneSignalId, 'bloom buddy', `You've been matched with ${partnerProfile.name || 'a bloom buddy'}! Open Bloom to say hi`);
      }

      return res.json({
        ok: true,
        matched: true,
        pairId,
        partnerId: bestMatch.buddyId,
        partnerName: partnerProfile.name || 'bloom buddy',
      });
    } else {
      // No match found — add to queue
      fresh.push({ buddyId, name: profile.name, prefs: myPrefs, ts: now });
      await kvSet('bloom_buddy_queue', fresh);
      return res.json({ ok: true, matched: false, queued: true });
    }
  }

  // ── CANCEL-SEARCH: remove from matching queue ───────────
  if (action === 'cancel-search') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });
    const queue = await kvGet('bloom_buddy_queue') || [];
    const filtered = queue.filter(q => q.buddyId !== buddyId);
    await kvSet('bloom_buddy_queue', filtered);
    return res.json({ ok: true });
  }

  // ── GET-BUDDY: fetch all partners' shared data ───────────
  if (action === 'get-buddy') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await getLookup(buddyId);
    if (!hasPair(lookup)) return res.json({ ok: true, paired: false, buddies: [] });

    const buddies = [];
    for (const pair of lookup.pairs) {
      const partner = await kvGet(`bloom_buddy:${pair.partnerId}`);
      if (!partner) continue;
      const pairData = await kvGet(`bloom_buddy_pair:${pair.pairId}`);
      buddies.push({
        pairId: pair.pairId,
        partnerId: pair.partnerId,
        name: partner.name || 'bloom buddy',
        mood: partner.mood,
        moodTs: partner.moodTs,
        streak: partner.streak || 0,
        habitPct: partner.habitPct || 0,
        lastActive: partner.lastActive,
        level: partner.level || null,
        levelEmoji: partner.levelEmoji || null,
        sharedDays: pairData?.sharedDays || 0,
      });
    }

    // Backward compat: also include first buddy as "partner" for existing clients
    const first = buddies[0] || null;
    return res.json({
      ok: true,
      paired: buddies.length > 0,
      pairId: first?.pairId,
      partnerId: first?.partnerId,
      partner: first ? { name: first.name, mood: first.mood, moodTs: first.moodTs, streak: first.streak, habitPct: first.habitPct, lastActive: first.lastActive, level: first.level, levelEmoji: first.levelEmoji } : null,
      buddies,
    });
  }

  // ── GET-MESSAGES: fetch message thread ──────────────────
  if (action === 'get-messages') {
    const { pairId } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await getLookup(buddyId);
    // Use provided pairId or fall back to first pair
    const targetPairId = pairId || getFirstPair(lookup)?.pairId;
    if (!targetPairId) return res.json({ ok: true, messages: [] });

    // Verify this user is part of this pair
    if (!lookup.pairs.some(p => p.pairId === targetPairId)) return res.json({ ok: true, messages: [] });

    const messages = await kvGet(`bloom_buddy_msgs:${targetPairId}`) || [];
    return res.json({ ok: true, messages });
  }

  // ── SEND-MESSAGE: send a custom message ─────────────────
  if (action === 'send-message') {
    const { text, pairId } = body;
    if (!buddyId || !text) return res.status(400).json({ error: 'Missing buddyId or text' });

    // Check if user is banned from social features
    if (await isUserBanned(buddyId)) {
      return res.json({ ok: false, reason: 'banned' });
    }

    const check = moderateMessage(text, 'buddy');
    await logModeration('buddy_message', check);
    if (!check.ok) {
      await recordStrike(buddyId, check.reason, 'buddy', text);
      if (check.reason === 'threat') {
        await logThreat('buddy', buddyId, text, req);
      }
      return res.json({ ok: false, reason: check.reason });
    }

    const lookup = await getLookup(buddyId);
    const targetPair = pairId
      ? lookup.pairs.find(p => p.pairId === pairId)
      : getFirstPair(lookup);
    if (!targetPair) return res.json({ ok: false, reason: 'not-paired' });

    const messages = await kvGet(`bloom_buddy_msgs:${targetPair.pairId}`) || [];

    // Rate limit: 10 messages per hour
    const oneHourAgo = Date.now() - 3600000;
    const recentFromMe = messages.filter(m => m.from === buddyId && m.ts > oneHourAgo);
    if (recentFromMe.length >= 10) return res.json({ ok: false, reason: 'rate-limit' });

    const msg = {
      id: genId(),
      from: buddyId,
      text: text.trim().slice(0, 200),
      ts: Date.now(),
      type: 'msg',
    };
    // Store self-harm flag on the message so the receiving partner also sees crisis guidance
    if (check.flag === 'self-harm') msg.flag = 'self-harm';
    messages.push(msg);
    const trimmed = messages.slice(-50);
    await kvSet(`bloom_buddy_msgs:${targetPair.pairId}`, trimmed);

    // Notify partner
    const partner = await kvGet(`bloom_buddy:${targetPair.partnerId}`);
    const myProfile = await kvGet(`bloom_buddy:${buddyId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'bloom buddy', `${myProfile?.name || 'Your bloom buddy'} sent you a message`);
    }

    const resp = { ok: true, message: msg };
    if (check.flag) resp.flag = check.flag;
    return res.json(resp);
  }

  // ── NUDGE: send a pre-written encouragement ─────────────
  if (action === 'nudge') {
    const { nudgeType, pairId } = body;
    if (!buddyId || !nudgeType) return res.status(400).json({ error: 'Missing buddyId or nudgeType' });

    const NUDGES = {
      'thinking': 'Thinking of you 💭',
      'gotthis': 'You\'ve got this 💪',
      'proud': 'Proud of you 🌟',
      'easytoday': 'Take it easy 🤗',
      'checkin': 'Just checking in 👋',
      'youmatter': 'You matter 💛',
      'love': '🌸',
    };

    const nudgeText = NUDGES[nudgeType];
    if (!nudgeText) return res.status(400).json({ error: 'Invalid nudge type' });

    const lookup = await getLookup(buddyId);
    const targetPair = pairId
      ? lookup.pairs.find(p => p.pairId === pairId)
      : getFirstPair(lookup);
    if (!targetPair) return res.json({ ok: false, reason: 'not-paired' });

    const messages = await kvGet(`bloom_buddy_msgs:${targetPair.pairId}`) || [];

    // Rate limit: 5 nudges per hour
    const oneHourAgo = Date.now() - 3600000;
    const recentNudges = messages.filter(m => m.from === buddyId && m.type === 'nudge' && m.ts > oneHourAgo);
    if (recentNudges.length >= 5) return res.json({ ok: false, reason: 'rate-limit' });

    const msg = {
      id: genId(),
      from: buddyId,
      text: nudgeText,
      ts: Date.now(),
      type: 'nudge',
    };
    messages.push(msg);
    const trimmed = messages.slice(-50);
    await kvSet(`bloom_buddy_msgs:${targetPair.pairId}`, trimmed);

    // Notify partner
    const partner = await kvGet(`bloom_buddy:${targetPair.partnerId}`);
    const myProfile = await kvGet(`bloom_buddy:${buddyId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'bloom buddy', `${myProfile?.name || 'Your bloom buddy'} says: ${nudgeText}`);
    }

    return res.json({ ok: true, message: msg });
  }

  // ── UNPAIR: disconnect from a specific buddy ─────────────
  if (action === 'unpair') {
    const { pairId } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await getLookup(buddyId);
    const targetPair = pairId
      ? lookup.pairs.find(p => p.pairId === pairId)
      : getFirstPair(lookup);
    if (!targetPair) return res.json({ ok: true });

    // Notify partner before deleting
    const partner = await kvGet(`bloom_buddy:${targetPair.partnerId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'bloom buddy', 'Your bloom buddy has moved on. You can find a new buddy anytime.');
    }

    // Clean up pair data and remove from both lookups
    await kvDel(`bloom_buddy_pair:${targetPair.pairId}`);
    await kvDel(`bloom_buddy_msgs:${targetPair.pairId}`);
    await removePairFromLookup(buddyId, targetPair.pairId);
    await removePairFromLookup(targetPair.partnerId, targetPair.pairId);

    return res.json({ ok: true });
  }

  if (action === 'report-buddy') {
    const { pairId } = body;
    if (!buddyId || !pairId) return res.status(400).json({ error: 'Missing buddyId or pairId' });

    const lookup = await getLookup(buddyId);
    const targetPair = lookup.pairs.find(p => p.pairId === pairId);
    if (!targetPair) return res.json({ ok: true });

    // Increment report count on the partner's profile
    const partner = await kvGet(`bloom_buddy:${targetPair.partnerId}`);
    if (partner) {
      partner.reports = (partner.reports || 0) + 1;
      partner.lastReportTs = Date.now();
      await kvSet(`bloom_buddy:${targetPair.partnerId}`, partner);

      // If 3+ reports from different users, block from auto-matching
      if (partner.reports >= 3) {
        partner.blocked = true;
        await kvSet(`bloom_buddy:${targetPair.partnerId}`, partner);
      }
    }

    return res.json({ ok: true });
  }

  // ── DELETE MY DATA: GDPR right to erasure ──────────────
  if (action === 'delete-my-data') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await getLookup(buddyId);

    // Remove messages from all pair threads and update partner lookups
    for (const pair of lookup.pairs) {
      // Delete message thread
      await kvDel(`bloom_buddy_msgs:${pair.pairId}`);
      // Delete pair record
      await kvDel(`bloom_buddy_pair:${pair.pairId}`);
      // Remove this pair from partner's lookup
      if (pair.partnerId) {
        await removePairFromLookup(pair.partnerId, pair.pairId);
      }
    }

    // Delete profile and lookup
    await kvDel(`bloom_buddy:${buddyId}`);
    await kvDel(`bloom_buddy_lookup:${buddyId}`);

    // Remove from matchmaking queue if present
    try {
      const client = await getRedis();
      const queue = await kvGet('bloom_buddy_queue') || [];
      const filtered = queue.filter(q => q.buddyId !== buddyId);
      if (filtered.length !== queue.length) {
        await kvSet('bloom_buddy_queue', filtered);
      }
    } catch(e) {}

    // Remove moderation strikes (but NOT threat logs, which have legitimate retention)
    const strikes = await getStrikes();
    if (strikes[buddyId]) {
      delete strikes[buddyId];
      await saveStrikes(strikes);
    }

    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
