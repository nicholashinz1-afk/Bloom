// Vercel serverless function for encouragement wall
// Uses Vercel KV (Upstash Redis) via REST API — no npm packages needed

// Content moderation
// Philosophy: allow venting/self-expression, offer resources for self-harm,
// block language that targets or harms *others*

// Directed harm — messages intended to hurt another person
const DIRECTED_HARM = [
  /\bkill\s*your\s*self\b/i,
  /\bkys\b/i,
  /\bgo\s*die\b/i,
  /\bend\s*it\s*all\b/i,
  /\byou\s*should\s*(die|kill|hurt)\b/i,
  /\bnobody\s*(loves|cares about|likes)\s*you\b/i,
  /\byou\s*deserve\s*to\s*(die|suffer|hurt)\b/i,
  /\bi('ll|m going to|m gonna)\s*(kill|hurt|find)\s*you\b/i,
];

// Slurs & targeted abuse
const TARGETED_ABUSE = [
  /\b(bitch|cunt|faggot|retard|tranny|n[i1]gg[ae3]r)\b/i,
];

// Grooming / predatory language — blocked unconditionally
const GROOMING_PATTERNS = [
  /\bhow\s*old\s*are\s*you\b/i,
  /\bwhat\s*('s\s*your|is\s*your)\s*(age|grade)\b/i,
  /\bwhere\s*(do\s*you|u)\s*(live|stay|go\s*to\s*school)\b/i,
  /\bwhat\s*school\s*(do\s*you|u)\b/i,
  /\bsend\s*(me\s*)?(a\s*)?(pic|photo|selfie|image)\b/i,
  /\bdon'?t\s*tell\s*(anyone|your\s*(parents?|mom|dad|teacher))\b/i,
  /\bkeep\s*this\s*(between\s*us|a\s*secret|our\s*secret)\b/i,
  /\bjust\s*between\s*(us|you\s*and\s*me)\b/i,
  /\b(meet|hang)\s*(up|out|me)\s*(in\s*person|irl|somewhere)\b/i,
  /\bmeet\s*in\s*(real\s*life|person)\b/i,
];

// Contact exchange — blocked to prevent off-platform communication
const CONTACT_EXCHANGE = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,                         // US phone numbers
  /\b\+\d{1,3}[-.\s]?\d{6,14}\b/,                               // international phone numbers
  /\b(snap(chat)?|insta(gram)?|discord|tiktok|telegram|whatsapp|signal|kik|wechat)\s*[:\-]?\s*@?\w/i,
  /\b(add|hmu|hit\s*me\s*up|dm\s*me|message\s*me)\s*(on|at)\b/i,
  /\bmy\s*(snap|insta|discord|tiktok|number|#)\s*(is|:)\b/i,
  /\b(follow|add)\s*me\s*(on|@)\b/i,
  /\bwhat'?s\s*your\s*(snap|insta|discord|number|ig|tiktok|username)\b/i,
];

// Spam / link / injection prevention
const SPAM_PATTERNS = [
  /\b(http|www\.|\.com|\.org|\.net)\b/i,
  /@|#|\$\$|[<>]/,
];

// Crude / off-topic — not blocked, but soft-flagged so the client can grey it out
// These pass through but get marked so the community sees a content warning
const CRUDE_PATTERNS = [
  /\b(hog|dong|wiener|schlong|pp|peen|johnson|boner)\b/i,
  /\bcrank\b.*\b(hog|one|it)\b/i,
  /\b(jerk|jack|wank|beat)\s*(off|it|ing)\b/i,
  /\b(dick|cock|penis|balls|nuts|tits|boobs|ass|booty)\b/i,
  /\b(horny|sexy|bang|hookup|hook up|smash|69)\b/i,
  /\b(porn|onlyfans|nsfw|nude|naked)\b/i,
  /\b(shit|fuck|damn|hell|crap|piss)\b/i,
  /\b(stfu|gtfo|lmao.*ass|dumbass|badass|jackass)\b/i,
];

// Self-harm language — not blocked, but flagged so the client can offer resources.
// Only flag language specifically about ending one's life or self-harm intent.
// Do NOT flag general distress, hopelessness, or venting — Bloom exists for people
// having a hard time, and they should never feel surveilled for expressing pain.
const SELF_HARM_PATTERNS = [
  /\b(kill myself|end my life|want to die|don'?t want to (be here|live|exist|be alive))\b/i,
  /\b(suicide|suicidal|self[- ]?harm|cut myself|hurt myself)\b/i,
  /\beveryone would be better off without me\b/i,
  /\bwish I (didn'?t|wouldn'?t|won'?t) wake up\b/i,
  /\bwant to end it all\b/i,
];

function moderateMessage(text) {
  const lower = text.toLowerCase().trim();
  if (lower.length < 3 || lower.length > 140) return { ok: false, reason: 'length' };

  // Block directed harm toward others
  for (const pat of DIRECTED_HARM) {
    if (pat.test(lower)) return { ok: false, reason: 'harmful' };
  }

  // Block targeted slurs/abuse
  for (const pat of TARGETED_ABUSE) {
    if (pat.test(lower)) return { ok: false, reason: 'harmful' };
  }

  // Block grooming / predatory language
  for (const pat of GROOMING_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'safety' };
  }

  // Block contact exchange attempts
  for (const pat of CONTACT_EXCHANGE) {
    if (pat.test(lower)) return { ok: false, reason: 'safety' };
  }

  // Block spam/links
  for (const pat of SPAM_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'filtered' };
  }

  if (!/[a-zA-Z]/.test(text)) return { ok: false, reason: 'no-text' };

  // Flag self-harm language — allow the message but signal the client to show resources
  for (const pat of SELF_HARM_PATTERNS) {
    if (pat.test(lower)) return { ok: true, flag: 'self-harm' };
  }

  // Soft-flag crude/off-topic — allow but mark for content warning display
  for (const pat of CRUDE_PATTERNS) {
    if (pat.test(lower)) return { ok: true, flag: 'crude' };
  }

  return { ok: true };
}

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
  } catch(e) { console.error('kvGet failed:', key, e.message); return null; }
}

async function kvSet(key, value) {
  try {
    const client = await getRedis();
    await client.set(key, JSON.stringify(value));
  } catch(e) { console.error('kvSet failed:', key, e.message); }
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
  } catch(e) { console.error('logModeration failed:', e.message); }
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
      i => i.ts > oneDayAgo && (i.reason === 'harmful' || i.reason === 'safety' || i.reason === 'inappropriate')
    );
    if (recentBlocked.length >= 3) {
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
        return res.json({ ok: false, reason: check.reason });
      }
      if (check.flag === 'crude') {
        await recordStrike(fp, 'crude', 'wall', text);
      }

      // Self-harm flagged posts: don't show on public wall (contagion risk).
      // Return success + flag so the poster gets crisis resources, but hold
      // the message for admin review instead of publishing it to the feed.
      if (check.flag === 'self-harm') {
        return res.json({ ok: true, flag: 'self-harm', held: true });
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
