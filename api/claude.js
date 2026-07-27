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
  journal: 'You are Bloom, a gentle wellness companion. 2-3 sentences max. Respond to what the person actually wrote, not what a generic journal entry might say. If recent entries show a recurring theme, you may gently name it ("this keeps coming up for you" or "you\'ve been sitting with this for a while") but only if it\'s genuinely there. Don\'t force connections. Never clinical, never advice. Warm, brief, human. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, you must gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  hard_day: 'You are Bloom. 1-2 sentences only. Warm presence, no toxic positivity, no advice. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, you must gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  reflection: 'You are Bloom. 1-2 sentences. Warm, not clinical. If the user expresses distress, self-harm, or crisis, gently point them to the 🤍 crisis heart for immediate support.',
  reflection_combined: 'You are Bloom. Write a warm, personal, emotionally perceptive combined reflection that weaves together all the user\'s weekly answers. 4-6 sentences. Reference specific details from their words. No bullet points, no headers. Be a compassionate witness: validate struggle, celebrate effort, affirm intentions. Never clinical, never preachy. If answers suggest persistent distress, gently remind them the 🤍 crisis heart is there for immediate support.',
  weekly: 'You are Bloom. You\'ve just read someone\'s entire week: their moods, feelings, journal entries, wins, and self-care. Write a reflection that proves you read all of it. 3-5 sentences. Quote or paraphrase specific things they wrote. Connect dots between entries they might not have connected themselves. Name actual emotions and events, not categories. Never start with their name. Never open with "What a week" or any variation. Never use the phrase "showed up for yourself." Write like a perceptive friend writing a letter, not a wellness app generating a summary. Each reflection should feel structurally different from the last. If the week data suggests persistent struggle, gently remind them the 🤍 crisis heart is always there and that reaching out to a professional is a sign of strength.',
  monthly: 'You are Bloom. You\'ve just read someone\'s entire month: their mood arc, recurring feelings, journal entries, wins, and self-care patterns. Write a reflection that shows them the shape of their month. 4-6 sentences. Reference specific things they wrote and felt. Name emotional patterns and what shifted over the weeks. This is the longest view they get of themselves. Make it count. Write like someone who watched the whole month unfold, not a summary generator. Never start with their name. Never use "showed up for yourself." If the month suggests persistent struggle, gently remind them the 🤍 crisis heart is always there and that reaching out to a professional is a sign of strength.',
  special_date: 'You are Bloom. 2-3 sentences only. Warm witness tone. Engage meaningfully with what this day holds for the person. You know the name and context of the date. Do not just echo the name back as a label, but speak to what this day actually means emotionally. For difficult days: no toxic positivity, no "it gets better," no advice, just presence. For celebrations: genuine warmth, not performative. For complicated feelings: validate the complexity without trying to resolve it. CRITICAL — assumptions about loss: Do not assume anyone named in a special date is deceased UNLESS the date name itself explicitly indicates a death or loss (e.g., contains words like "death," "passing," "passed," "died," "lost," "memorial," "in memory of," "anniversary of [name]\'s death"). For celebrations: always default to present-tense, living-relationship language; a birthday with a year means the person is turning that age, not that they have been gone that long; never use memorial phrasing like "what they meant," "memories that shaped you," or "their presence continues." For difficult days: if the name clearly signals a loss, memorial language is appropriate and welcome; if the name is ambiguous (e.g., just a name, or "rough day," "anniversary"), do not infer a death — speak to the difficulty of the day without assuming what kind it is. Never clinical, never preachy. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  reframe: 'You are Bloom. A warm, compassionate inner voice helping someone see their thought from a kinder angle. 2-3 sentences max. Validate the feeling first, then offer a gentler perspective. No bullet points, no labels, no clinical jargon. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.',
  live_week: 'You are Bloom. One sentence only, max 20 words, warm and specific.',
  default: 'You are Bloom, a warm and compassionate mental wellness companion. Keep responses brief, warm, and human. Never clinical. 1-4 sentences maximum.',
};

// ── Indirect crisis language ──────────────────────────────
// The clauses above name explicit statements ("suicidal thoughts, self-harm").
// Leave-taking language is the shape that gets missed: sentence by sentence it
// reads as warm or ordinary, and only the whole entry gives it away. Bloom's
// pattern matching (api/moderation.js) cannot see that, and deliberately does
// not try — it works on short, contextless text where a false positive means
// throwing a crisis sheet at someone who said something loving. The model reads
// the full entry alongside recent context, so this is the one place in Bloom
// that can catch it. The response is constrained on purpose: a false positive
// costs a gentle aside and nothing more.
const CRISIS_GUIDANCE = ' The crisis instruction above applies to indirect language as much as explicit language. Watch for: summing up a life or relationships in the past tense, saying goodbye or giving thanks as though for the last time, entrusting people or responsibilities to someone else, settling affairs, describing themselves as a burden or as replaceable, or an unexplained calm arriving after a stretch of distress. When you notice it, respond to what they actually wrote with exactly the warmth you would otherwise, and let the mention of the 🤍 crisis heart rest at the end as a quiet aside. Never name the pattern you noticed, never ask whether they are suicidal, never diagnose, and never shift into an alarmed tone. Someone writing lovingly about their family should feel witnessed, not assessed.';

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
  // Clamp the client-supplied name: strip newlines and cap length so it can't
  // carry injected instructions into the system prompt.
  const safeName = typeof name === 'string' ? name.replace(/[\r\n]+/g, ' ').trim().slice(0, 60) : '';
  const nameContext = safeName ? ` The user's name is ${safeName} — use it occasionally but naturally, not in every sentence.` : '';
  // live_week is a one-sentence, 20-word widget line. It has no room to act on
  // this and never sees a full entry, so it is the one context left out.
  const crisisGuidance = context === 'live_week' ? '' : CRISIS_GUIDANCE;
  const systemPrompt = basePrompt + crisisGuidance + SYSTEM_SUFFIX + nameContext;

  // Allow client to request Sonnet for richer reflections; default to Haiku for cost efficiency.
  // The old Sonnet 4 snapshot (claude-sonnet-4-20250514) reached end-of-life, so alias any
  // request for it (including stale/cached PWA clients) to the current Sonnet. Omitting the
  // `thinking` field keeps Sonnet 4.6 running without thinking, so max_tokens stays for output.
  const MODEL_ALIASES = { 'claude-sonnet-4-20250514': 'claude-sonnet-4-6' };
  const ALLOWED_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];
  const requestedModel = MODEL_ALIASES[model] || model;
  const selectedModel = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'claude-haiku-4-5-20251001';

  // Bound the upstream call so a stalled connection can't hang the function.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
      signal: controller.signal,
    });

    // Surface upstream failures instead of masking them as an empty success.
    // Without this, a 429/500/529/404 (e.g. a retired model) parses to no
    // content and returns 200 {text:null}, so reflections fail silently with
    // no error signal. The client keys off `text`, so it still falls back
    // gracefully, but now the real status/error is visible for debugging.
    if (!response.ok) {
      let detail = '';
      try { const errData = await response.json(); detail = errData?.error?.message || ''; } catch {}
      const retryable = response.status === 429 || response.status >= 500;
      return res.status(response.status).json({
        text: null,
        error: detail || `Upstream error ${response.status}`,
        retryable,
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || null;

    return res.status(200).json({ text });
  } catch (err) {
    const aborted = err.name === 'AbortError';
    return res.status(aborted ? 504 : 500).json({
      text: null,
      error: aborted ? 'Upstream timed out' : err.message,
      retryable: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}
