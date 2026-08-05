// Shared trip state: votes, packing, custom spots, and day assignments.
//
// Writes are DELTAS, not whole-document replacements. Both phones are expected to
// be voting at the same time, and a whole-document PUT would silently drop one
// person's change. Every write reads the current doc, applies the ops, bumps a
// revision counter, and saves.
//
// GET /api/state            -> { state }
// GET /api/state?revOnly=1  -> { rev }   cheap poll, one small key read
// POST /api/state           -> { state } after applying { who, ops: [...] }
//
// Env: REDIS_URL (required), TRIP_PASSCODE (optional gate), TRIP_ID (optional).

import { kvGet, kvSet, bumpRev, readRev, tripKey, checkPasscode } from './_redis.js';

const PEOPLE = ['momma', 'daddy'];
const VOTES = ['up', 'maybe', 'down'];
const MAX_CUSTOM = 120;
const MAX_OPS = 60;

function emptyState() {
  return {
    rev: 0,
    votes: {},      // spotId -> { momma: {v, why, ts}, daddy: {...} }
    packed: {},     // itemId -> { who, ts }
    custom: [],     // user-added spots
    hidden: {},     // seeded spotId -> true, for "remove from list" without deleting
    dayPlan: {},    // dayId -> { slotKey: spotId | null }
    updatedAt: 0,
    updatedBy: null,
  };
}

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Custom spots come from the browser, which got them from api/add.js. Re-validate
// here anyway: this endpoint is reachable directly.
function cleanCustomSpot(raw) {
  const id = str(raw?.id, 40);
  const name = str(raw?.name, 80);
  if (!id || !name) return null;
  if (!/^c_[A-Za-z0-9_]+$/.test(id)) return null;
  const tags = Array.isArray(raw?.tags)
    ? raw.tags.map((t) => str(t, 20)).filter(Boolean).slice(0, 4)
    : [];
  return {
    id,
    name,
    // Packing items carry a group instead of a location; spots leave it empty.
    group: str(raw?.group, 20),
    q: str(raw?.q, 60),
    where: str(raw?.where, 90),
    note: str(raw?.note, 240),
    chips: Array.isArray(raw?.chips)
      ? raw.chips.map((c) => str(c, 22)).filter(Boolean).slice(0, 3)
      : [],
    tags,
    indoor: !!raw?.indoor,
    addedBy: PEOPLE.includes(raw?.addedBy) ? raw.addedBy : null,
    unverified: !!raw?.unverified,
    ts: Date.now(),
  };
}

function applyOp(state, op, who) {
  switch (op?.op) {
    case 'vote': {
      const id = str(op.id, 40);
      if (!id) return;
      const value = VOTES.includes(op.value) ? op.value : null;
      if (!state.votes[id]) state.votes[id] = {};
      if (value === null) {
        delete state.votes[id][who];
        if (!Object.keys(state.votes[id]).length) delete state.votes[id];
      } else {
        state.votes[id][who] = { v: value, why: str(op.why, 140), ts: Date.now() };
      }
      return;
    }
    case 'pack': {
      const id = str(op.id, 60);
      if (!id) return;
      if (op.on) state.packed[id] = { who, ts: Date.now() };
      else delete state.packed[id];
      return;
    }
    case 'addCustom': {
      const spot = cleanCustomSpot({ ...op.spot, addedBy: who });
      if (!spot) return;
      if (state.custom.some((s) => s.id === spot.id)) return;
      if (state.custom.length >= MAX_CUSTOM) return;
      state.custom.push(spot);
      return;
    }
    case 'delCustom': {
      const id = str(op.id, 40);
      state.custom = state.custom.filter((s) => s.id !== id);
      delete state.votes[id];
      delete state.packed[id];
      // Drop it out of any day slot it was filling.
      for (const day of Object.keys(state.dayPlan)) {
        for (const slot of Object.keys(state.dayPlan[day] || {})) {
          if (state.dayPlan[day][slot] === id) state.dayPlan[day][slot] = null;
        }
      }
      return;
    }
    case 'hide': {
      const id = str(op.id, 40);
      if (!id) return;
      if (op.on) state.hidden[id] = true;
      else delete state.hidden[id];
      return;
    }
    case 'assign': {
      const day = str(op.day, 20);
      const slot = str(op.slot, 20);
      if (!day || !slot) return;
      if (!state.dayPlan[day]) state.dayPlan[day] = {};
      state.dayPlan[day][slot] = op.spotId ? str(op.spotId, 40) : null;
      return;
    }
    // Drops every override for a day so the browser falls back to its suggested
    // plan. Distinct from assigning null, which means "deliberately empty".
    case 'resetDay': {
      const day = str(op.day, 20);
      if (day) delete state.dayPlan[day];
      return;
    }
    default:
      return;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-trip-key');
    return res.status(204).end();
  }

  if (!process.env.REDIS_URL) {
    return res.status(503).json({ error: 'not-configured' });
  }

  if (!checkPasscode(req)) {
    return res.status(401).json({ error: 'Wrong passcode.' });
  }

  const docKey = tripKey();
  const revKey = tripKey('rev');

  try {
    if (req.method === 'GET') {
      // Cheap freshness check. One tiny key, no document transfer.
      if (req.query?.revOnly === '1') {
        return res.status(200).json({ rev: await readRev(revKey) });
      }
      const state = (await kvGet(docKey)) || emptyState();
      state.rev = await readRev(revKey);
      return res.status(200).json({ state });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
      const who = PEOPLE.includes(body.who) ? body.who : null;
      if (!who) return res.status(400).json({ error: 'Pick who you are first.' });

      const ops = Array.isArray(body.ops) ? body.ops.slice(0, MAX_OPS) : [];
      if (!ops.length) return res.status(400).json({ error: 'Nothing to save.' });

      const state = (await kvGet(docKey)) || emptyState();
      // Older documents may predate a field; backfill so ops never hit undefined.
      const base = emptyState();
      for (const k of Object.keys(base)) {
        if (state[k] === undefined) state[k] = base[k];
      }

      for (const op of ops) applyOp(state, op, who);

      state.updatedAt = Date.now();
      state.updatedBy = who;
      await kvSet(docKey, state);
      state.rev = await bumpRev(revKey);

      return res.status(200).json({ state });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('state error', e?.message);
    return res.status(502).json({ error: 'Could not reach the shared list.' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
