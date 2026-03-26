// Bloom Redis client — singleton shared across all API functions
//
// Wraps Vercel KV (Upstash Redis) with JSON serialization and
// error-safe get/set/del helpers.

import { createClient } from 'redis';

let _client = null;

export async function getRedis() {
  if (_client && _client.isReady) return _client;
  // Clean up stale client
  if (_client) { try { await _client.disconnect(); } catch(e) {} }
  _client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => retries < 3 ? Math.min(retries * 200, 1000) : false,
    },
  });
  _client.on('error', () => {});
  await _client.connect();
  return _client;
}

export async function kvGet(key) {
  try {
    const client = await getRedis();
    const val = await client.get(key);
    if (val === null) return null;
    return JSON.parse(val);
  } catch (e) {
    console.error('[redis] kvGet failed for key', key, e.message);
    return null;
  }
}

export async function kvSet(key, value, ttlSeconds) {
  try {
    const client = await getRedis();
    const opts = ttlSeconds ? { EX: ttlSeconds } : undefined;
    await client.set(key, JSON.stringify(value), opts);
  } catch (e) {
    console.error('[redis] kvSet failed for key', key, e.message);
  }
}

export async function kvDel(key) {
  try {
    const client = await getRedis();
    await client.del(key);
  } catch (e) {
    console.error('[redis] kvDel failed for key', key, e.message);
  }
}
