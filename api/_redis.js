// Shared Redis client helpers for all Bloom API endpoints
// Single connection per Vercel container instance, reused across warm invocations

import { createClient } from 'redis';

let _redisClient = null;

export async function getRedis() {
  if (_redisClient && _redisClient.isReady) return _redisClient;
  if (_redisClient) { try { await _redisClient.disconnect(); } catch(e) {} }
  _redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => retries < 3 ? Math.min(retries * 200, 1000) : false
    }
  });
  _redisClient.on('error', () => {});
  await _redisClient.connect();
  return _redisClient;
}

export async function kvGet(key) {
  try {
    const client = await getRedis();
    const val = await client.get(key);
    if (val === null) return null;
    return JSON.parse(val);
  } catch(e) { return null; }
}

export async function kvSet(key, value, ttlSeconds) {
  try {
    const client = await getRedis();
    if (ttlSeconds) {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } else {
      await client.set(key, JSON.stringify(value));
    }
  } catch(e) {}
}

export async function kvDel(key) {
  try {
    const client = await getRedis();
    await client.del(key);
  } catch(e) {}
}

// ── Shared moderation event logger ────────────────────────────
// Used by both buddy.js and wall.js to log moderation events to diagnostics
export async function logModeration(source, result) {
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
    // Also increment daily counter
    const dayKey = `bloom_diag:daily:${new Date().toISOString().slice(0, 10)}`;
    const dayRaw = await client.get(dayKey);
    const dayStats = dayRaw ? JSON.parse(dayRaw) : {};
    const counterKey = result.ok ? (result.flag ? 'mod_flagged' : 'mod_allowed') : 'mod_blocked';
    dayStats[counterKey] = (dayStats[counterKey] || 0) + 1;
    await client.set(dayKey, JSON.stringify(dayStats), { EX: 90 * 86400 });
  } catch(e) {}
}
