// Vercel serverless function for encouragement wall
// Uses Vercel KV (Upstash Redis) via REST API — no npm packages needed

// Simple profanity/harmful content filter
const BLOCKED_PATTERNS = [
  /\b(kill|suicide|die|hurt|harm|cut|end it)\b/i,
  /\b(fuck|shit|damn|ass|bitch|cunt|dick|cock)\b/i,
  /\b(hate|stupid|ugly|worthless|loser)\b/i,
  /\b(http|www\.|\.com|\.org|\.net)\b/i,
  /@|#|\$\$|[<>]/,
];

const BLOCKED_EXACT = [
  'kill yourself', 'kys', 'go die', 'end it all',
];

function moderateMessage(text) {
  const lower = text.toLowerCase().trim();
  if (lower.length < 3 || lower.length > 140) return { ok: false, reason: 'length' };
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

async function getMessages() {
  const stored = await kvGet('bloom_wall_messages');
  return stored || [];
}

async function saveMessages(messages) {
  await kvSet('bloom_wall_messages', messages);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Check KV is configured
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
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
      return res.json({ ok: true, message: safe });
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
