// Bloom Redis client — singleton shared across all API functions
//
// Wraps Vercel KV (Upstash Redis) with JSON serialization and
// error-safe get/set/del helpers.

import { createClient } from 'redis';

let _client = null;

async function getRedis() {
  if (!_client) {
    _client = createClient({ url: process.env.REDIS_URL });
    _client.on('error', (err) => {
      console.error('[redis] connection error:', err.message);
    });
    await _client.connect();
  }
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
