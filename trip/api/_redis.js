// Redis helpers for the trip planner.
//
// This is a deliberate, narrow duplicate of what this project needs from Bloom's
// /api/_redis.js. The trip planner deploys as its own Vercel project with `trip/`
// as the root directory, so it cannot import across that boundary. Keep Redis
// logic here rather than inline in the endpoints.

import { createClient } from 'redis';

let _client = null;

async function getRedis() {
  if (_client && _client.isReady) return _client;
  if (_client) { try { await _client.disconnect(); } catch (e) {} }
  _client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => (retries < 3 ? Math.min(retries * 200, 1000) : false),
    },
  });
  _client.on('error', () => {});
  await _client.connect();
  return _client;
}

// All keys hang off one trip id so a second trip never collides with this one.
export function tripKey(suffix) {
  const id = process.env.TRIP_ID || 'tc2026';
  return suffix ? `trip:${id}:${suffix}` : `trip:${id}`;
}

export async function kvGet(key) {
  const client = await getRedis();
  const val = await client.get(key);
  if (val === null) return null;
  return JSON.parse(val);
}

export async function kvSet(key, value) {
  const client = await getRedis();
  await client.set(key, JSON.stringify(value));
}

// Standalone integer the client can poll cheaply to ask "has anything changed?"
// without transferring the whole document.
export async function bumpRev(key) {
  const client = await getRedis();
  return await client.incr(key);
}

export async function readRev(key) {
  const client = await getRedis();
  const val = await client.get(key);
  return val ? parseInt(val, 10) || 0 : 0;
}

// Shared-passcode gate. Open when TRIP_PASSCODE is unset so the project works
// before you configure it; set the env var to lock it down.
export function checkPasscode(req) {
  const expected = process.env.TRIP_PASSCODE;
  if (!expected) return true;
  const provided = req.headers['x-trip-key'];
  return typeof provided === 'string' && provided === expected;
}
