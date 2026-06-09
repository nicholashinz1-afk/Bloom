// Vercel serverless function for Lantern, Bloom's reading companion.
// Proxies vision requests to the Anthropic API. Three stages, one endpoint:
//   identify   - page images in, identification + summary + vocabulary out
//   guide      - first page + identify context in, big ideas / tips / questions out
//   transcribe - one page image in, faithful clean transcription out
// All prompts live server-side. The client only picks a stage and sends images.

import { getRedis } from './_redis.js';

const MODEL = 'claude-sonnet-4-6';

// The voice block is the product. Keep it verbatim.
const VOICE_BLOCK = 'Write for an intelligent neurodivergent graduate student who finds dense academic prose exhausting. Plain language. Short sentences. One idea per sentence. Decode jargon with everyday comparisons. Warm, direct, never condescending. Never use em dashes.';

const IDENTIFY_PROMPT = `You power a personal reading-companion app. The user photographed the opening page(s) of a course reading they were assigned.

${VOICE_BLOCK}

Do three things:
1. Identify the work if you can (title, author, source such as book or journal, and chapter or section if visible).
2. Write "summary": the whole reading's argument in exactly three plain sentences, drawing on your knowledge of the work if you recognize it, otherwise on these pages.
3. Write "vocabulary": the 4 to 6 terms most likely to block comprehension, each with a one-or-two-sentence plain definition.

Respond with ONLY valid JSON:
{"identified": true/false, "confidence": "high"|"medium"|"low", "title": "...", "author": "...", "source": "...", "summary": "...", "vocabulary": [{"term": "...", "definition": "..."}]}`;

function guidePrompt({ title, author, source, summary }) {
  return `Continue building a guide for this reading: "${title}" by ${author} (${source}). Its argument in brief: ${summary}

${VOICE_BLOCK}

Produce:
1. "bigIdeas": the 4 or 5 core ideas. Each has a short "title" and a "body" of 2 to 3 plain sentences, with a concrete analogy where it helps.
2. "readingTips": 3 tips for handling this specific author's prose style and structure.
3. "questions": 5 self-check questions a reader should be able to answer afterward, the kind that come up in seminar.

Respond with ONLY valid JSON:
{"bigIdeas": [{"title": "...", "body": "..."}], "readingTips": ["..."], "questions": ["..."]}`;
}

const TRANSCRIBE_PROMPT = `The user provided this photographed page from their own assigned course reading. For their personal accessibility use, transcribe the body text on this page faithfully into clean, readable paragraphs. Keep the original wording. Fix obvious scan artifacts like broken words and stray marks. Skip page numbers and running headers.

Respond with ONLY valid JSON:
{"text": "..."}`;

// ── Rate limiting ─────────────────────────────────────────
// identify = one "build" of a new reading. 10 builds/day is plenty for one
// person's coursework. transcribe is capped high enough for 10 full packets.
const LIMITS = {
  identify: 10,
  guide: 30,
  transcribe: 600,
};
const DAY_SECONDS = 86400;

async function sha256(s) {
  const encoded = new TextEncoder().encode(s || 'unknown');
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(req, deviceId, action) {
  if (!process.env.REDIS_URL) return { ok: true }; // fail open if no Redis
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const who = await sha256(deviceId ? `dev:${deviceId}` : `ip:${ip}`);
  const key = `bloom_lantern:rl:${action}:${who}`;
  try {
    const client = await getRedis();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, DAY_SECONDS);
    if (count <= (LIMITS[action] || 10)) return { ok: true };
    return { ok: false };
  } catch (e) { return { ok: true } } // fail open
}

// ── Image validation ──────────────────────────────────────
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGES = 4;
const MAX_IMAGE_B64 = 2.5 * 1024 * 1024; // ~1.9MB binary, generous for 1568px JPEG

function validImages(images) {
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) return false;
  return images.every(img =>
    img && ALLOWED_MEDIA.includes(img.media_type) &&
    typeof img.data === 'string' && img.data.length > 0 && img.data.length <= MAX_IMAGE_B64
  );
}

function imageBlocks(images) {
  return images.map(img => ({
    type: 'image',
    source: { type: 'base64', media_type: img.media_type, data: img.data },
  }));
}

// ── JSON extraction ───────────────────────────────────────
// Strip code fences defensively, take the outermost JSON object.
function extractJSON(text) {
  if (!text) return null;
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (e) { return null }
}

async function callClaude(apiKey, content, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const type = errBody?.error?.type || `http_${response.status}`;
    const retryable = response.status === 429 || response.status >= 500;
    return { error: type, retryable };
  }
  const data = await response.json();
  return { text: data.content?.find(b => b.type === 'text')?.text || null };
}

// Call once, parse; on a parse failure retry the model call once.
async function callForJSON(apiKey, content, maxTokens) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await callClaude(apiKey, content, maxTokens);
    if (result.error) return result;
    const parsed = extractJSON(result.text);
    if (parsed) return { json: parsed };
  }
  return { error: 'parse_failed', retryable: true };
}

// ── Main handler ──────────────────────────────────────────
export default async function handler(req, res) {
  const allowedOrigins = ['https://bloomselfcare.app', 'https://bloom-zeta-rouge.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { action, deviceId, images, context } = body || {};
  if (!['identify', 'guide', 'transcribe'].includes(action)) {
    return res.status(400).json({ error: 'Unknown action' });
  }

  const maxForAction = action === 'transcribe' ? 1 : (action === 'guide' ? 1 : MAX_IMAGES);
  if (!validImages(images) || images.length > maxForAction) {
    return res.status(400).json({ error: 'Invalid images' });
  }

  const rl = await checkRateLimit(req, deviceId, action);
  if (!rl.ok) {
    return res.status(429).json({
      error: action === 'identify'
        ? 'You\'ve built a lot of readings today. Lantern can take 10 new readings a day. Come back tomorrow.'
        : 'Lantern has done a lot of work today. Try again in a bit.',
      retryable: false,
    });
  }

  let content;
  let maxTokens;
  if (action === 'identify') {
    content = [...imageBlocks(images), { type: 'text', text: IDENTIFY_PROMPT }];
    maxTokens = 2000;
  } else if (action === 'guide') {
    const ctx = {
      title: String(context?.title || 'Unknown title').slice(0, 300),
      author: String(context?.author || 'Unknown author').slice(0, 200),
      source: String(context?.source || 'Unknown source').slice(0, 300),
      summary: String(context?.summary || '').slice(0, 2000),
    };
    content = [...imageBlocks(images), { type: 'text', text: guidePrompt(ctx) }];
    maxTokens = 2000;
  } else {
    content = [...imageBlocks(images), { type: 'text', text: TRANSCRIBE_PROMPT }];
    maxTokens = 1500;
  }

  try {
    const result = await callForJSON(apiKey, content, maxTokens);
    if (result.error) {
      return res.status(502).json({ error: result.error, retryable: result.retryable !== false });
    }
    return res.status(200).json(result.json);
  } catch (err) {
    return res.status(500).json({ error: err.message, retryable: true });
  }
}
