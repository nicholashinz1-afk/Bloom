const { getStore } = require("@netlify/blobs");

// Simple profanity/harmful content filter
const BLOCKED_PATTERNS = [
  /\b(kill|suicide|die|hurt|harm|cut|end it)\b/i,
  /\b(fuck|shit|damn|ass|bitch|cunt|dick|cock)\b/i,
  /\b(hate|stupid|ugly|worthless|loser)\b/i,
  /\b(http|www\.|\.com|\.org|\.net)\b/i,
  /@|#|\$\$|[<>]/,
];

const BLOCKED_EXACT = [
  'kill yourself', 'kys', 'go die', 'end it all',
];

function moderateMessage(text) {
  const lower = text.toLowerCase().trim();

  // Too short or too long
  if (lower.length < 3 || lower.length > 140) return { ok: false, reason: 'length' };

  // Blocked exact phrases
  for (const phrase of BLOCKED_EXACT) {
    if (lower.includes(phrase)) return { ok: false, reason: 'harmful' };
  }

  // Blocked patterns
  for (const pat of BLOCKED_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'filtered' };
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(text)) return { ok: false, reason: 'no-text' };

  return { ok: true };
}

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const store = getStore("encouragement-wall");

    if (event.httpMethod === 'GET') {
      // Return recent messages
      const raw = await store.get("messages", { type: "json" });
      const messages = raw || [];

      // Return last 30 messages, sorted newest first
      const recent = messages
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 30);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ messages: recent }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const { action } = body;

      if (action === 'post') {
        const { text } = body;
        if (!text) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing text' }) };
        }

        // Moderate
        const check = moderateMessage(text);
        if (!check.ok) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ok: false, reason: check.reason }),
          };
        }

        // Rate limit: use a simple per-fingerprint check
        const fp = body.fp || 'anon';
        const raw = await store.get("messages", { type: "json" });
        const messages = raw || [];

        // Check if this fingerprint posted in the last hour
        const oneHourAgo = Date.now() - 3600000;
        const recentFromFp = messages.filter(m => m.fp === fp && m.ts > oneHourAgo);
        if (recentFromFp.length >= 2) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ok: false, reason: 'rate-limit' }),
          };
        }

        // Add message
        const msg = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          text: text.trim().slice(0, 140),
          hearts: 0,
          ts: Date.now(),
          fp,
        };

        messages.push(msg);

        // Keep only last 200 messages
        const trimmed = messages.sort((a, b) => b.ts - a.ts).slice(0, 200);
        await store.setJSON("messages", trimmed);

        // Return without fp for privacy
        const { fp: _, ...safe } = msg;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, message: safe }),
        };
      }

      if (action === 'heart') {
        const { id } = body;
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
        }

        const raw = await store.get("messages", { type: "json" });
        const messages = raw || [];
        const msg = messages.find(m => m.id === id);
        if (msg) {
          msg.hearts = (msg.hearts || 0) + 1;
          await store.setJSON("messages", messages);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, hearts: msg?.hearts || 0 }),
        };
      }

      if (action === 'report') {
        const { id } = body;
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
        }

        const raw = await store.get("messages", { type: "json" });
        const messages = raw || [];
        const msg = messages.find(m => m.id === id);
        if (msg) {
          msg.reports = (msg.reports || 0) + 1;
          // Auto-remove if 3+ reports
          if (msg.reports >= 3) {
            const filtered = messages.filter(m => m.id !== id);
            await store.setJSON("messages", filtered);
          } else {
            await store.setJSON("messages", messages);
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true }),
        };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
    }

    return { statusCode: 405, headers, body: 'Method not allowed' };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
