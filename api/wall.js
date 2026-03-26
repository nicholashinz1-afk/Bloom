// Vercel serverless function for encouragement wall
// Uses shared moderation, Redis, and CORS modules

import { moderateMessage } from './_shared/moderation.js';
import { kvGet, kvSet, getRedis } from './_shared/redis.js';
import { setCorsHeaders, handlePreflight, parseBody } from './_shared/cors.js';
import { genId } from './_shared/utils.js';

// Log moderation events to diagnostics
async function logModeration(source, result) {
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
    const dayKey = `bloom_diag:daily:${new Date().toISOString().slice(0, 10)}`;
    const dayRaw = await client.get(dayKey);
    const dayStats = dayRaw ? JSON.parse(dayRaw) : {};
    const counterKey = result.ok ? (result.flag ? 'mod_flagged' : 'mod_allowed') : 'mod_blocked';
    dayStats[counterKey] = (dayStats[counterKey] || 0) + 1;
    await client.set(dayKey, JSON.stringify(dayStats), { EX: 90 * 86400 });
  } catch(e) {}
}

// ── User moderation strikes ──────────────────────────────
const STRIKES_KEY = 'bloom_mod:strikes';

async function getStrikes() {
  return await kvGet(STRIKES_KEY) || {};
}

async function saveStrikes(strikes) {
  await kvSet(STRIKES_KEY, strikes);
}

async function recordStrike(fp, reason, source, messageText) {
  if (!fp || fp === 'anon') return;
  const strikes = await getStrikes();
  if (!strikes[fp]) strikes[fp] = { incidents: [], banned: false };
  strikes[fp].incidents.push({
    reason,
    source,
    text: (messageText || '').slice(0, 80),
    ts: Date.now(),
  });
  if (strikes[fp].incidents.length > 50) {
    strikes[fp].incidents = strikes[fp].incidents.slice(-50);
  }
  await saveStrikes(strikes);
}

async function isUserBanned(fp) {
  if (!fp || fp === 'anon') return false;
  const strikes = await getStrikes();
  return strikes[fp]?.banned === true;
}

async function getMessages() {
  return await kvGet('bloom_wall_messages') || [];
}

async function saveMessages(messages) {
  await kvSet('bloom_wall_messages', messages);
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  // Health check
  if (req.method === 'GET' && req.query?.check === 'health') {
    const hasRedis = !!process.env.REDIS_URL;
    let redisOk = false;
    if (hasRedis) { try { await getRedis(); redisOk = true; } catch(e) {} }
    return res.json({ ok: hasRedis && redisOk, service: 'wall', ts: Date.now() });
  }

  if (!process.env.REDIS_URL) {
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
    const body = parseBody(req);
    const { action } = body;

    if (action === 'post') {
      const { text, fp } = body;
      if (!text) return res.status(400).json({ error: 'Missing text' });

      // Check if user is banned from social features
      if (await isUserBanned(fp)) {
        return res.json({ ok: false, reason: 'filtered' });
      }

      const check = moderateMessage(text, { minLen: 3, maxLen: 140 });
      await logModeration('wall_post', check);

      // Record strike for blocked or flagged content
      if (!check.ok) {
        await recordStrike(fp, check.reason, 'wall', text);
        return res.json({ ok: false, reason: check.reason });
      }
      if (check.flag === 'crude') {
        await recordStrike(fp, 'crude', 'wall', text);
      }

      const messages = await getMessages();
      const oneHourAgo = Date.now() - 3600000;
      const recentFromFp = messages.filter(m => m.fp === (fp || 'anon') && m.ts > oneHourAgo);
      if (recentFromFp.length >= 2) return res.json({ ok: false, reason: 'rate-limit' });

      const msg = {
        id: genId(),
        text: text.trim().slice(0, 140),
        hearts: 0,
        ts: Date.now(),
        fp: fp || 'anon',
      };
      // Auto-flag crude content so it renders with a content warning
      if (check.flag === 'crude') msg.moderated = 'auto';
      messages.push(msg);
      const trimmed = messages.sort((a, b) => b.ts - a.ts).slice(0, 200);
      await saveMessages(trimmed);

      const { fp: _, ...safe } = msg;
      const resp = { ok: true, message: safe };
      if (check.flag) resp.flag = check.flag;
      return res.json(resp);
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

    // Admin moderation — mark a message as moderated or remove it entirely
    if (action === 'moderate') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { id, type } = body; // type: 'warn' | 'remove' | 'clear'
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const messages = await getMessages();
      const msg = messages.find(m => m.id === id);

      if (type === 'remove') {
        if (msg?.fp) await recordStrike(msg.fp, 'admin-remove', 'wall', msg.text);
        const filtered = messages.filter(m => m.id !== id);
        await saveMessages(filtered);
        return res.json({ ok: true, action: 'removed' });
      }
      if (type === 'clear') {
        if (msg) { delete msg.moderated; await saveMessages(messages); }
        return res.json({ ok: true, action: 'cleared' });
      }
      // Default: warn — grey out with content warning
      if (msg) {
        msg.moderated = 'admin';
        await saveMessages(messages);
        if (msg.fp) await recordStrike(msg.fp, 'admin-warn', 'wall', msg.text);
      }
      return res.json({ ok: true, action: 'warned' });
    }

    // Admin: rescan all existing messages against current filters
    if (action === 'rescan') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const messages = await getMessages();
      let flagged = 0;
      for (const msg of messages) {
        if (msg.moderated) continue;
        const check = moderateMessage(msg.text, { minLen: 3, maxLen: 140 });
        if (check.flag === 'crude') {
          msg.moderated = 'auto';
          flagged++;
          if (msg.fp) await recordStrike(msg.fp, 'crude', 'wall-rescan', msg.text);
        }
      }
      if (flagged > 0) await saveMessages(messages);
      return res.json({ ok: true, scanned: messages.length, flagged });
    }

    // Admin: view flagged users with strike history
    if (action === 'flagged-users') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const strikes = await getStrikes();
      const users = Object.entries(strikes).map(([fp, data]) => ({
        fp,
        banned: data.banned || false,
        totalIncidents: data.incidents.length,
        lastIncident: data.incidents.length > 0 ? data.incidents[data.incidents.length - 1].ts : 0,
        incidents: data.incidents.slice(-10),
      })).sort((a, b) => b.totalIncidents - a.totalIncidents);
      return res.json({ ok: true, users });
    }

    // Admin: ban or unban a user from social features
    if (action === 'ban-user') {
      const adminKey = process.env.ADMIN_KEY;
      const provided = body.adminKey;
      if (!adminKey || provided !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const { fp: targetFp, banned } = body;
      if (!targetFp) return res.status(400).json({ error: 'Missing fp' });
      const strikes = await getStrikes();
      if (!strikes[targetFp]) strikes[targetFp] = { incidents: [], banned: false };
      strikes[targetFp].banned = banned !== false;
      await saveStrikes(strikes);
      return res.json({ ok: true, banned: strikes[targetFp].banned });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
