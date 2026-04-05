// Vercel serverless function for Claude AI reflections
// Proxies to Anthropic API with server-side system prompt control and rate limiting

// ── Redis client helpers (shared module) ────────────────────
import { getRedis } from './_redis.js';

// ── Server-side system prompt allowlist ────────────────────
// The client sends a context key, NOT a raw system prompt.
// This prevents prompt injection attacks where an attacker could
// override safety behavior to make the AI give medical advice,
// diagnoses, or harmful content.
const SYSTEM_PROMPTS = {
  journal: 'You are Bloom, a gentle wellness companion. Never clinical. Warm, brief, human. 2-3 sentences max. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, you must gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  hard_day: 'You are Bloom. 1-2 sentences only. Warm presence, no toxic positivity, no advice. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, you must gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  reflection: 'You are Bloom. 1-2 sentences. Warm, not clinical. If the user expresses distress, self-harm, or crisis, gently point them to the 🤍 crisis heart for immediate support.',
  reflection_combined: 'You are Bloom. Write a warm, personal, emotionally perceptive combined reflection that weaves together all the user\'s weekly answers. 4-6 sentences. Reference specific details from their words. No bullet points, no headers. Be a compassionate witness: validate struggle, celebrate effort, affirm intentions. Never clinical, never preachy. If answers suggest persistent distress, gently remind them the 🤍 crisis heart is there for immediate support.',
  weekly: 'You are Bloom. You\'ve just read someone\'s entire week: their moods, feelings, journal entries, wins, and self-care. Write a reflection that proves you read all of it. 3-5 sentences. Quote or paraphrase specific things they wrote. Connect dots between entries they might not have connected themselves. Name actual emotions and events, not categories. Never start with their name. Never open with "What a week" or any variation. Never use the phrase "showed up for yourself." Write like a perceptive friend writing a letter, not a wellness app generating a summary. Each reflection should feel structurally different from the last. If the week data suggests persistent struggle, gently remind them the 🤍 crisis heart is always there and that reaching out to a professional is a sign of strength.',
  monthly: 'You are Bloom. 3-4 sentences. Warm, personal, never clinical. If mood data suggests a very difficult month, gently acknowledge that and remind them the 🤍 crisis heart is always there if they need support beyond what bloom can offer.',
  special_date: 'You are Bloom. 2-3 sentences only. Warm witness tone. Engage meaningfully with what this day holds for the person. You know the name and context of the date. Do not just echo the name back as a label, but speak to what this day actually means emotionally. For difficult days: no toxic positivity, no "it gets better," no advice, just presence. For celebrations: genuine warmth, not performative. For complicated feelings: validate the complexity without trying to resolve it. Never clinical, never preachy. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  reframe: 'You are Bloom. A warm, compassionate inner voice helping someone see their thought from a kinder angle. 2-3 sentences max. Validate the feeling first, then offer a gentler perspective. No bullet points, no labels, no clinical jargon. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  live_week: 'You are Bloom. One sentence only, max 20 words, warm and specific.',
  default: 'You are Bloom, a warm and compassionate mental wellness companion. Keep responses brief, warm, and human. Never clinical. 1-4 sentences maximum.',
};

// Suffix appended to all system prompts for consistency
const SYSTEM_SUFFIX = ' Never use first-person language like "I am here for you" or "I care about you" — you are a tool, not a person. Frame support as observations and affirmations, not as a relationship.';

// ── Rate limiting ─────────────────────────────────────────
const RATE_LIMIT_MAX = 20;       // 20 requests per hour (generous for journaling)
const RATE_LIMIT_WINDOW = 3600;  // 1 hour in seconds

async function hashIP(ip) {
  const encoded = new TextEncoder().encode(ip || 'unknown');
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(req) {
  if (!process.env.REDIS_URL) return true; // fail open if no Redis
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const ipHash = await hashIP(ip);
  const rlKey = `bloom_claude:rl:${ipHash}`;
  try {
    const client = await getRedis();
    const count = await client.incr(rlKey);
    if (count === 1) await client.expire(rlKey, RATE_LIMIT_WINDOW);
    return count <= RATE_LIMIT_MAX;
  } catch(e) { return true; } // fail open
}

// ── Main handler ───────────────────────────────────────────
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
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    return res.json({ ok: hasKey, service: 'claude', ts: Date.now() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ text: null, error: 'API key not configured' });
  }

  // Rate limiting
  const allowed = await checkRateLimit(req);
  if (!allowed) {
    return res.status(429).json({ text: null, error: 'You\'ve used a lot of reflections recently. Take a breath and try again in a bit.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { context, message, model, name } = body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Resolve system prompt from allowlist (never from client)
  const basePrompt = SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.default;
  const nameContext = name ? ` The user's name is ${name} — use it occasionally but naturally, not in every sentence.` : '';
  const systemPrompt = basePrompt + SYSTEM_SUFFIX + nameContext;

  // Allow client to request Sonnet for richer reflections; default to Haiku for cost efficiency
  const ALLOWED_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514'];
  const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'claude-haiku-4-5-20251001';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || null;

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ text: null, error: err.message });
  }
}
