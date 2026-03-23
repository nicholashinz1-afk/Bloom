// Vercel serverless function for Bloom Buddy
// Uses Vercel KV (Upstash Redis) via REST API — same pattern as wall.js

// ── Content moderation (shared with wall) ──────────────────
const BLOCKED_PATTERNS = [
  /\b(kill|suicide|die|hurt|harm|cut|end it)\b/i,
  /\b(fuck|shit|damn|ass|bitch|cunt|dick|cock)\b/i,
  /\b(hate|stupid|ugly|worthless|loser)\b/i,
  /\b(http|www\.|\.\bcom\b|\.\borg\b|\.\bnet\b)\b/i,
  /@|#|\$\$|[<>]/,
];

const BLOCKED_EXACT = [
  'kill yourself', 'kys', 'go die', 'end it all',
];

function moderateMessage(text) {
  const lower = text.toLowerCase().trim();
  if (lower.length < 1 || lower.length > 200) return { ok: false, reason: 'length' };
  for (const phrase of BLOCKED_EXACT) {
    if (lower.includes(phrase)) return { ok: false, reason: 'harmful' };
  }
  for (const pat of BLOCKED_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'filtered' };
  }
  if (!/[a-zA-Z]/.test(text)) return { ok: false, reason: 'no-text' };
  return { ok: true };
}

// ── Upstash Redis REST helpers ──────────────────────────────
async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.result === null) return null;
    return JSON.parse(data.result);
  } catch(e) { return null; }
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(value)),
    });
  } catch(e) {}
}

async function kvDel(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/del/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch(e) {}
}

// ── OneSignal push notification helper ──────────────────────
async function sendPush(playerId, title, message) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey || !playerId) return;
  try {
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: [playerId],
        headings: { en: title },
        contents: { en: message },
        url: 'https://bloomhabits.app',
      }),
    });
  } catch(e) {}
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

// ── Milestone streaks ───────────────────────────────────────
const MILESTONES = [7, 14, 30, 60, 100];

// ── Main handler ────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
    const { mood, streak, habitPct } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const profile = await kvGet(`bloom_buddy:${buddyId}`) || {};
    const prevMood = profile.mood;
    const prevStreak = profile.streak || 0;

    profile.mood = mood !== undefined ? mood : profile.mood;
    profile.moodTs = mood !== undefined ? Date.now() : profile.moodTs;
    profile.streak = streak !== undefined ? streak : profile.streak;
    profile.habitPct = habitPct !== undefined ? habitPct : profile.habitPct;
    profile.lastActive = Date.now();

    await kvSet(`bloom_buddy:${buddyId}`, profile);

    // Check if paired → trigger notifications
    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (lookup?.partnerId) {
      const partner = await kvGet(`bloom_buddy:${lookup.partnerId}`);
      if (partner?.oneSignalId) {
        // 1. Low/rough mood notification (rate-limited to 1 per 12h)
        if (mood !== undefined && mood <= 1) {
          const twelveHoursAgo = Date.now() - 43200000;
          if (!profile.lastMoodNotifTs || profile.lastMoodNotifTs < twelveHoursAgo) {
            profile.lastMoodNotifTs = Date.now();
            await kvSet(`bloom_buddy:${buddyId}`, profile);
            const name = profile.name || 'Your Bloom Buddy';
            await sendPush(
              partner.oneSignalId,
              'Bloom Buddy',
              `${name} is having a rough day \u2014 a kind word could mean a lot`
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
              await kvSet(`bloom_buddy:${lookup.partnerId}`, partner);
              await sendPush(
                partner.oneSignalId,
                'Bloom Buddy',
                'Your Bloom Buddy is thinking of you \u2014 it\'s a new day to check in'
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
                  'Bloom Buddy',
                  `${profile.name || 'Your Bloom Buddy'} just hit a ${m}-day streak!`
                );
              }
            }
          }
        }
      }
    }

    return res.json({ ok: true });
  }

  // ── CREATE-INVITE: generate a 6-char invite code ────────
  if (action === 'create-invite') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const profile = await kvGet(`bloom_buddy:${buddyId}`);
    if (!profile) return res.status(400).json({ error: 'Register first' });

    // Check existing pairing
    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (lookup?.pairId) return res.json({ ok: false, reason: 'already-paired' });

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

    // Check neither is already paired
    const myLookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (myLookup?.pairId) return res.json({ ok: false, reason: 'already-paired' });
    const theirLookup = await kvGet(`bloom_buddy_lookup:${invite.buddyId}`);
    if (theirLookup?.pairId) return res.json({ ok: false, reason: 'inviter-paired' });

    // Create pair
    const pairId = genId();
    await kvSet(`bloom_buddy_pair:${pairId}`, {
      user1: invite.buddyId,
      user2: buddyId,
      createdAt: Date.now(),
    });

    // Set lookup entries
    await kvSet(`bloom_buddy_lookup:${buddyId}`, { pairId, partnerId: invite.buddyId });
    await kvSet(`bloom_buddy_lookup:${invite.buddyId}`, { pairId, partnerId: buddyId });

    // Initialize empty message thread
    await kvSet(`bloom_buddy_msgs:${pairId}`, []);

    // Delete the invite code
    await kvDel(`bloom_buddy_invite:${code.toUpperCase()}`);

    // Get profiles for response
    const myProfile = await kvGet(`bloom_buddy:${buddyId}`) || {};
    const theirProfile = await kvGet(`bloom_buddy:${invite.buddyId}`) || {};

    // Notify both
    if (theirProfile.oneSignalId) {
      await sendPush(theirProfile.oneSignalId, 'Bloom Buddy', `You've been paired with ${myProfile.name || 'a Bloom Buddy'}! Open Bloom to say hi`);
    }
    if (myProfile.oneSignalId) {
      await sendPush(myProfile.oneSignalId, 'Bloom Buddy', `You've been paired with ${theirProfile.name || 'a Bloom Buddy'}! Open Bloom to say hi`);
    }

    return res.json({
      ok: true,
      pairId,
      partnerId: invite.buddyId,
      partnerName: theirProfile.name || 'Bloom Buddy',
    });
  }

  // ── FIND-MATCH: enter queue or get matched ──────────────
  if (action === 'find-match') {
    const { prefs } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    // Check not already paired
    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (lookup?.pairId) return res.json({ ok: false, reason: 'already-paired' });

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
      // Check they're not already paired
      const cLookup = await kvGet(`bloom_buddy_lookup:${candidate.buddyId}`);
      if (cLookup?.pairId) continue;

      let score = 0;
      const cp = candidate.prefs || {};
      if (myPrefs.frequency && cp.frequency && myPrefs.frequency === cp.frequency) score += 2;
      if (myPrefs.focus && cp.focus && myPrefs.focus === cp.focus) score += 1;
      // Any valid candidate is a match; prefer higher scores
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      // Remove matched user from queue
      const updatedQueue = fresh.filter(q => q.buddyId !== bestMatch.buddyId);
      await kvSet('bloom_buddy_queue', updatedQueue);

      // Create pair
      const pairId = genId();
      await kvSet(`bloom_buddy_pair:${pairId}`, {
        user1: bestMatch.buddyId,
        user2: buddyId,
        createdAt: Date.now(),
      });
      await kvSet(`bloom_buddy_lookup:${buddyId}`, { pairId, partnerId: bestMatch.buddyId });
      await kvSet(`bloom_buddy_lookup:${bestMatch.buddyId}`, { pairId, partnerId: buddyId });
      await kvSet(`bloom_buddy_msgs:${pairId}`, []);

      const partnerProfile = await kvGet(`bloom_buddy:${bestMatch.buddyId}`) || {};

      // Notify both
      if (partnerProfile.oneSignalId) {
        await sendPush(partnerProfile.oneSignalId, 'Bloom Buddy', `You've been matched with ${profile.name || 'a Bloom Buddy'}! Open Bloom to say hi`);
      }
      if (profile.oneSignalId) {
        await sendPush(profile.oneSignalId, 'Bloom Buddy', `You've been matched with ${partnerProfile.name || 'a Bloom Buddy'}! Open Bloom to say hi`);
      }

      return res.json({
        ok: true,
        matched: true,
        pairId,
        partnerId: bestMatch.buddyId,
        partnerName: partnerProfile.name || 'Bloom Buddy',
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

  // ── GET-BUDDY: fetch partner's shared data ──────────────
  if (action === 'get-buddy') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (!lookup?.partnerId) return res.json({ ok: true, paired: false });

    const partner = await kvGet(`bloom_buddy:${lookup.partnerId}`);
    if (!partner) return res.json({ ok: true, paired: false });

    return res.json({
      ok: true,
      paired: true,
      pairId: lookup.pairId,
      partnerId: lookup.partnerId,
      partner: {
        name: partner.name || 'Bloom Buddy',
        mood: partner.mood,
        moodTs: partner.moodTs,
        streak: partner.streak || 0,
        habitPct: partner.habitPct || 0,
        lastActive: partner.lastActive,
      },
    });
  }

  // ── GET-MESSAGES: fetch message thread ──────────────────
  if (action === 'get-messages') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (!lookup?.pairId) return res.json({ ok: true, messages: [] });

    const messages = await kvGet(`bloom_buddy_msgs:${lookup.pairId}`) || [];
    return res.json({ ok: true, messages });
  }

  // ── SEND-MESSAGE: send a custom message ─────────────────
  if (action === 'send-message') {
    const { text } = body;
    if (!buddyId || !text) return res.status(400).json({ error: 'Missing buddyId or text' });

    const check = moderateMessage(text);
    if (!check.ok) return res.json({ ok: false, reason: check.reason });

    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (!lookup?.pairId) return res.json({ ok: false, reason: 'not-paired' });

    const messages = await kvGet(`bloom_buddy_msgs:${lookup.pairId}`) || [];

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
    messages.push(msg);
    // Cap at 50 messages
    const trimmed = messages.slice(-50);
    await kvSet(`bloom_buddy_msgs:${lookup.pairId}`, trimmed);

    // Notify partner
    const partner = await kvGet(`bloom_buddy:${lookup.partnerId}`);
    const myProfile = await kvGet(`bloom_buddy:${buddyId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'Bloom Buddy', `${myProfile?.name || 'Your buddy'}: ${text.slice(0, 80)}`);
    }

    return res.json({ ok: true, message: msg });
  }

  // ── NUDGE: send a pre-written encouragement ─────────────
  if (action === 'nudge') {
    const { nudgeType } = body;
    if (!buddyId || !nudgeType) return res.status(400).json({ error: 'Missing buddyId or nudgeType' });

    const NUDGES = {
      'thinking': 'Thinking of you',
      'gotthis': 'You\'ve got this',
      'proud': 'Proud of you',
      'easytoday': 'Take it easy today',
      'checkin': 'Just checking in',
      'youmatter': 'You matter',
    };

    const nudgeText = NUDGES[nudgeType];
    if (!nudgeText) return res.status(400).json({ error: 'Invalid nudge type' });

    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (!lookup?.pairId) return res.json({ ok: false, reason: 'not-paired' });

    const messages = await kvGet(`bloom_buddy_msgs:${lookup.pairId}`) || [];

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
    await kvSet(`bloom_buddy_msgs:${lookup.pairId}`, trimmed);

    // Notify partner
    const partner = await kvGet(`bloom_buddy:${lookup.partnerId}`);
    const myProfile = await kvGet(`bloom_buddy:${buddyId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'Bloom Buddy', `${myProfile?.name || 'Your Bloom Buddy'} says: ${nudgeText}`);
    }

    return res.json({ ok: true, message: msg });
  }

  // ── UNPAIR: disconnect from buddy ───────────────────────
  if (action === 'unpair') {
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await kvGet(`bloom_buddy_lookup:${buddyId}`);
    if (!lookup?.pairId) return res.json({ ok: true });

    // Notify partner before deleting
    const partner = await kvGet(`bloom_buddy:${lookup.partnerId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'Bloom Buddy', 'Your Bloom Buddy has moved on. You can find a new buddy anytime.');
    }

    // Clean up pair data
    await kvDel(`bloom_buddy_pair:${lookup.pairId}`);
    await kvDel(`bloom_buddy_msgs:${lookup.pairId}`);
    await kvDel(`bloom_buddy_lookup:${buddyId}`);
    await kvDel(`bloom_buddy_lookup:${lookup.partnerId}`);

    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
