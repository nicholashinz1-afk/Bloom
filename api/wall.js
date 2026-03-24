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

// Spam / link / injection prevention
const SPAM_PATTERNS = [
  /\b(http|www\.|\.com|\.org|\.net)\b/i,
  /@|#|\$\$|[<>]/,
];

// Self-harm language — not blocked, but flagged so the client can offer resources
const SELF_HARM_PATTERNS = [
  /\b(kill myself|end my life|want to die|don'?t want to (be here|live|exist))\b/i,
  /\b(suicide|suicidal|self[- ]?harm|cut myself|hurt myself)\b/i,
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

  // Block spam/links
  for (const pat of SPAM_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'filtered' };
  }

  if (!/[a-zA-Z]/.test(text)) return { ok: false, reason: 'no-text' };

  // Flag self-harm language — allow the message but signal the client to show resources
  for (const pat of SELF_HARM_PATTERNS) {
    if (pat.test(lower)) return { ok: true, flag: 'self-harm' };
  }

  return { ok: true };
}

// ── Redis client helpers ────────────────────────────────────
import { createClient } from 'redis';

let _redisClient = null;
async function getRedis() {
  if (!_redisClient) {
    _redisClient = createClient({ url: process.env.REDIS_URL });
    _redisClient.on('error', () => {});
    await _redisClient.connect();
  }
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

async function getMessages() {
  const stored = await kvGet('bloom_wall_messages');
  return stored || [];
}

async function saveMessages(messages) {
  await kvSet('bloom_wall_messages', messages);
}

export default async function handler(req, res) {
  const allowedOrigins = ['https://bloomhabits.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

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

      const check = moderateMessage(text);
      if (!check.ok) return res.json({ ok: false, reason: check.reason });

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

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
