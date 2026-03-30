// Vercel serverless function for bloom encrypted cloud vault
// Stores client-side encrypted backup blobs in Redis, keyed by hashed recovery codes.
// The server never sees plaintext data, passphrases, or recovery codes.

import { createClient } from 'redis';

// ── Redis client helpers (same pattern as buddy.js) ────────
let _redisClient = null;
async function getRedis() {
  if (_redisClient && _redisClient.isReady) return _redisClient;
  if (_redisClient) { try { await _redisClient.disconnect(); } catch(e) {} }
  _redisClient = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: (retries) => retries < 3 ? Math.min(retries * 200, 1000) : false } });
  _redisClient.on('error', () => {});
  await _redisClient.connect();
  return _redisClient;
}

// ── Validation helpers ─────────────────────────────────────
const CODE_HASH_RE = /^[0-9a-f]{64}$/;
const MAX_BLOB_SIZE = 500 * 1024; // 500KB
const VAULT_TTL = 365 * 24 * 60 * 60; // 365 days in seconds
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

function vaultKey(codeHash) { return `bloom_vault:${codeHash}`; }

async function hashIP(ip) {
  const encoded = new TextEncoder().encode(ip || 'unknown');
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const ipHash = await hashIP(ip);
  const rlKey = `bloom_vault:rl:${ipHash}`;
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
    const hasRedis = !!process.env.REDIS_URL;
    let redisOk = false;
    if (hasRedis) { try { await getRedis(); redisOk = true; } catch(e) {} }
    return res.json({ ok: hasRedis && redisOk, service: 'vault', ts: Date.now() });
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

  const { action, codeHash, blob } = body;

  // Validate codeHash format on all actions that use it
  if (['check', 'save', 'load', 'delete'].includes(action)) {
    if (!codeHash || !CODE_HASH_RE.test(codeHash)) {
      return res.status(400).json({ error: 'Invalid code hash' });
    }
  }

  try {
    const client = await getRedis();
    const key = vaultKey(codeHash);

    switch (action) {
      case 'check': {
        const exists = await client.exists(key);
        return res.json({ ok: true, exists: exists === 1 });
      }

      case 'save': {
        const allowed = await checkRateLimit(req);
        if (!allowed) return res.status(429).json({ ok: false, error: 'rate_limited' });
        if (!blob || typeof blob !== 'string') {
          return res.status(400).json({ error: 'Missing blob' });
        }
        if (blob.length > MAX_BLOB_SIZE) {
          return res.status(400).json({ error: 'Blob too large' });
        }
        await client.set(key, blob, { EX: VAULT_TTL });
        return res.json({ ok: true, ts: Date.now() });
      }

      case 'load': {
        const allowed = await checkRateLimit(req);
        if (!allowed) {
          return res.status(429).json({ ok: false, error: 'rate_limited' });
        }
        const data = await client.get(key);
        if (!data) {
          return res.json({ ok: false, error: 'not_found' });
        }
        return res.json({ ok: true, blob: data });
      }

      case 'delete': {
        const allowed = await checkRateLimit(req);
        if (!allowed) return res.status(429).json({ ok: false, error: 'rate_limited' });
        await client.del(key);
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch(e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
