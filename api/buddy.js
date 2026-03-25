// Vercel serverless function for bloom buddy system
// Multi-buddy pairing, messaging, nudges, and notifications

import { moderateMessage } from './_shared/moderation.js';
import { kvGet, kvSet, kvDel } from './_shared/redis.js';
import { setCorsHeaders, handlePreflight, parseBody } from './_shared/cors.js';
import { genId, genInviteCode } from './_shared/utils.js';

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
        url: 'https://bloomhabits.app',
      }),
    });
    const result = await resp.json();
    if (result.errors) console.log('[buddy] sendPush error:', JSON.stringify(result.errors));
  } catch (e) {
    console.log('[buddy] sendPush failed:', e.message);
  }
}

// ── Admin: can have multiple buddies ────────────────────────
const ADMIN_BUDDY_ID = process.env.ADMIN_BUDDY_ID || null;

function isAdmin(buddyId) {
  return ADMIN_BUDDY_ID && buddyId === ADMIN_BUDDY_ID;
}

// ── Lookup helpers (supports multi-buddy) ─────────────────
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
  return lookup.pairs.length < 10;
}

// ── Milestone streaks ───────────────────────────────────────
const MILESTONES = [7, 14, 30, 60, 100];

// ── Main handler ────────────────────────────────────────────
export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (!process.env.REDIS_URL) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req);
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
    const { mood, streak, habitPct, oneSignalId } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const profile = await kvGet(`bloom_buddy:${buddyId}`) || {};
    const prevStreak = profile.streak || 0;

    profile.mood = mood !== undefined ? mood : profile.mood;
    profile.moodTs = mood !== undefined ? Date.now() : profile.moodTs;
    profile.streak = streak !== undefined ? streak : profile.streak;
    profile.habitPct = habitPct !== undefined ? habitPct : profile.habitPct;
    if (oneSignalId) profile.oneSignalId = oneSignalId;
    profile.lastActive = Date.now();

    await kvSet(`bloom_buddy:${buddyId}`, profile);

    // Check if paired → trigger notifications for all partners
    const lookup = await getLookup(buddyId);
    for (const pair of lookup.pairs) {
      const partner = await kvGet(`bloom_buddy:${pair.partnerId}`);
      if (!partner?.oneSignalId) continue;

      // 1. Low/rough mood notification (rate-limited to 1 per 12h)
      if (mood !== undefined && mood >= 0 && mood <= 1) {
        const twelveHoursAgo = Date.now() - 43200000;
        if (!profile.lastMoodNotifTs || profile.lastMoodNotifTs < twelveHoursAgo) {
          profile.lastMoodNotifTs = Date.now();
          await kvSet(`bloom_buddy:${buddyId}`, profile);
          await sendPush(
            partner.oneSignalId,
            'bloom buddy',
            `${profile.name || 'Your bloom buddy'} is having a rough day \u2014 a kind word could mean a lot`
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
              'Your bloom buddy is thinking of you \u2014 it\'s a new day to check in'
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
                `${profile.name || 'Your bloom buddy'} just hit a ${m}-day streak!`
              );
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

    if (Date.now() - invite.createdAt > 172800000) {
      await kvDel(`bloom_buddy_invite:${code.toUpperCase()}`);
      return res.json({ ok: false, reason: 'expired' });
    }

    if (invite.buddyId === buddyId) return res.json({ ok: false, reason: 'self-pair' });

    const myLookup = await getLookup(buddyId);
    if (!canAddBuddy(buddyId, myLookup)) return res.json({ ok: false, reason: 'max-buddies' });
    const theirLookup = await getLookup(invite.buddyId);
    if (!canAddBuddy(invite.buddyId, theirLookup)) return res.json({ ok: false, reason: 'inviter-max-buddies' });

    if (myLookup.pairs.some(p => p.partnerId === invite.buddyId)) return res.json({ ok: false, reason: 'already-buddies' });

    const pairId = genId();
    await kvSet(`bloom_buddy_pair:${pairId}`, {
      user1: invite.buddyId,
      user2: buddyId,
      createdAt: Date.now(),
    });

    await addPairToLookup(buddyId, pairId, invite.buddyId);
    await addPairToLookup(invite.buddyId, pairId, buddyId);
    await kvSet(`bloom_buddy_msgs:${pairId}`, []);
    await kvDel(`bloom_buddy_invite:${code.toUpperCase()}`);

    const myProfile = await kvGet(`bloom_buddy:${buddyId}`) || {};
    const theirProfile = await kvGet(`bloom_buddy:${invite.buddyId}`) || {};

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

    const myLookup = await getLookup(buddyId);
    if (!canAddBuddy(buddyId, myLookup)) return res.json({ ok: false, reason: 'max-buddies' });

    const profile = await kvGet(`bloom_buddy:${buddyId}`);
    if (!profile) return res.status(400).json({ error: 'Register first' });

    const queue = await kvGet('bloom_buddy_queue') || [];
    const now = Date.now();
    const fresh = queue.filter(q => q.buddyId !== buddyId && (now - q.ts) < 604800000);

    const myPrefs = prefs || {};
    let bestMatch = null;
    let bestScore = -1;

    for (const candidate of fresh) {
      const cLookup = await getLookup(candidate.buddyId);
      if (!canAddBuddy(candidate.buddyId, cLookup)) continue;
      if (myLookup.pairs.some(p => p.partnerId === candidate.buddyId)) continue;

      const cProfile = await kvGet(`bloom_buddy:${candidate.buddyId}`);
      if (cProfile?.blocked) continue;

      let score = 0;
      const cp = candidate.prefs || {};
      if (myPrefs.frequency && cp.frequency && myPrefs.frequency === cp.frequency) score += 2;
      const myFocus = Array.isArray(myPrefs.focus) ? myPrefs.focus : (myPrefs.focus ? [myPrefs.focus] : []);
      const cpFocus = Array.isArray(cp.focus) ? cp.focus : (cp.focus ? [cp.focus] : []);
      const overlap = myFocus.filter(f => cpFocus.includes(f)).length;
      score += overlap;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    // Admin fallback
    if (!bestMatch && ADMIN_BUDDY_ID && buddyId !== ADMIN_BUDDY_ID) {
      const adminLookup = await getLookup(ADMIN_BUDDY_ID);
      const alreadyBuddies = myLookup.pairs.some(p => p.partnerId === ADMIN_BUDDY_ID);
      if (!alreadyBuddies && canAddBuddy(ADMIN_BUDDY_ID, adminLookup)) {
        const adminProfile = await kvGet(`bloom_buddy:${ADMIN_BUDDY_ID}`);
        if (adminProfile) {
          bestMatch = { buddyId: ADMIN_BUDDY_ID, name: adminProfile.name };
        }
      }
    }

    if (bestMatch) {
      const updatedQueue = fresh.filter(q => q.buddyId !== bestMatch.buddyId);
      await kvSet('bloom_buddy_queue', updatedQueue);

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
      buddies.push({
        pairId: pair.pairId,
        partnerId: pair.partnerId,
        name: partner.name || 'bloom buddy',
        mood: partner.mood,
        moodTs: partner.moodTs,
        streak: partner.streak || 0,
        habitPct: partner.habitPct || 0,
        lastActive: partner.lastActive,
      });
    }

    const first = buddies[0] || null;
    return res.json({
      ok: true,
      paired: buddies.length > 0,
      pairId: first?.pairId,
      partnerId: first?.partnerId,
      partner: first ? { name: first.name, mood: first.mood, moodTs: first.moodTs, streak: first.streak, habitPct: first.habitPct, lastActive: first.lastActive } : null,
      buddies,
    });
  }

  // ── GET-MESSAGES: fetch message thread ──────────────────
  if (action === 'get-messages') {
    const { pairId } = body;
    if (!buddyId) return res.status(400).json({ error: 'Missing buddyId' });

    const lookup = await getLookup(buddyId);
    const targetPairId = pairId || getFirstPair(lookup)?.pairId;
    if (!targetPairId) return res.json({ ok: true, messages: [] });

    if (!lookup.pairs.some(p => p.pairId === targetPairId)) return res.json({ ok: true, messages: [] });

    const messages = await kvGet(`bloom_buddy_msgs:${targetPairId}`) || [];
    return res.json({ ok: true, messages });
  }

  // ── SEND-MESSAGE: send a custom message ─────────────────
  if (action === 'send-message') {
    const { text, pairId } = body;
    if (!buddyId || !text) return res.status(400).json({ error: 'Missing buddyId or text' });

    const check = moderateMessage(text, { maxLen: 200 });
    if (!check.ok) return res.json({ ok: false, reason: check.reason });

    const lookup = await getLookup(buddyId);
    const targetPair = pairId
      ? lookup.pairs.find(p => p.pairId === pairId)
      : getFirstPair(lookup);
    if (!targetPair) return res.json({ ok: false, reason: 'not-paired' });

    const messages = await kvGet(`bloom_buddy_msgs:${targetPair.pairId}`) || [];

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
    const trimmed = messages.slice(-50);
    await kvSet(`bloom_buddy_msgs:${targetPair.pairId}`, trimmed);

    const partner = await kvGet(`bloom_buddy:${targetPair.partnerId}`);
    const myProfile = await kvGet(`bloom_buddy:${buddyId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'bloom buddy', `${myProfile?.name || 'Your buddy'}: ${text.slice(0, 80)}`);
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
      'thinking': 'Thinking of you \u{1F4AD}',
      'gotthis': 'You\'ve got this \u{1F4AA}',
      'proud': 'Proud of you \u{1F31F}',
      'easytoday': 'Take it easy \u{1F917}',
      'checkin': 'Just checking in \u{1F44B}',
      'youmatter': 'You matter \u{1F49B}',
      'love': '\u{1F338}',
    };

    const nudgeText = NUDGES[nudgeType];
    if (!nudgeText) return res.status(400).json({ error: 'Invalid nudge type' });

    const lookup = await getLookup(buddyId);
    const targetPair = pairId
      ? lookup.pairs.find(p => p.pairId === pairId)
      : getFirstPair(lookup);
    if (!targetPair) return res.json({ ok: false, reason: 'not-paired' });

    const messages = await kvGet(`bloom_buddy_msgs:${targetPair.pairId}`) || [];

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

    const partner = await kvGet(`bloom_buddy:${targetPair.partnerId}`);
    if (partner?.oneSignalId) {
      await sendPush(partner.oneSignalId, 'bloom buddy', 'Your bloom buddy has moved on. You can find a new buddy anytime.');
    }

    await kvDel(`bloom_buddy_pair:${targetPair.pairId}`);
    await kvDel(`bloom_buddy_msgs:${targetPair.pairId}`);
    await removePairFromLookup(buddyId, targetPair.pairId);
    await removePairFromLookup(targetPair.partnerId, targetPair.pairId);

    return res.json({ ok: true });
  }

  // ── REPORT-BUDDY: flag a buddy for abuse ────────────────
  if (action === 'report-buddy') {
    const { pairId } = body;
    if (!buddyId || !pairId) return res.status(400).json({ error: 'Missing buddyId or pairId' });

    const lookup = await getLookup(buddyId);
    const targetPair = lookup.pairs.find(p => p.pairId === pairId);
    if (!targetPair) return res.json({ ok: true });

    const partner = await kvGet(`bloom_buddy:${targetPair.partnerId}`);
    if (partner) {
      partner.reports = (partner.reports || 0) + 1;
      partner.lastReportTs = Date.now();
      if (partner.reports >= 3) {
        partner.blocked = true;
      }
      await kvSet(`bloom_buddy:${targetPair.partnerId}`, partner);
    }

    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
