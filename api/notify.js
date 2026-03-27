// Vercel serverless function for scheduling OneSignal push notifications
// Enables real push notifications that fire even when the app is closed

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
    const hasKeys = !!(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY);
    return res.json({ ok: hasKeys, service: 'notify', ts: Date.now() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return res.status(503).json({ error: 'Push notification service not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { action } = body;

  // ── SCHEDULE: schedule a notification for a future time ────
  if (action === 'schedule') {
    const { playerId, title, message, sendAt, tag } = body;
    if (!playerId || !title || !message || !sendAt) {
      return res.status(400).json({ error: 'Missing required fields: playerId, title, message, sendAt' });
    }

    // Validate sendAt is in the future (with 60s grace)
    const sendTime = new Date(sendAt);
    if (isNaN(sendTime.getTime())) {
      return res.status(400).json({ error: 'Invalid sendAt datetime' });
    }
    if (sendTime.getTime() < Date.now() - 60000) {
      return res.status(400).json({ error: 'sendAt must be in the future' });
    }

    try {
      const resp = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          include_subscription_ids: [playerId],
          headings: { en: title },
          contents: { en: message },
          url: 'https://bloomselfcare.app',
          send_after: sendAt,
          // Use external_id tag so we can cancel by tag later
          ...(tag ? { data: { bloom_tag: tag } } : {}),
        }),
      });
      const result = await resp.json();
      if (result.errors) {
        console.log('[notify] schedule error:', JSON.stringify(result.errors));
        return res.json({ ok: false, errors: result.errors });
      }
      return res.json({ ok: true, notificationId: result.id });
    } catch (e) {
      console.log('[notify] schedule failed:', e.message);
      return res.status(500).json({ error: 'Failed to schedule notification' });
    }
  }

  // ── CANCEL: cancel a previously scheduled notification ────
  if (action === 'cancel') {
    const { notificationId } = body;
    if (!notificationId) {
      return res.status(400).json({ error: 'Missing notificationId' });
    }

    try {
      const resp = await fetch(
        `https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${appId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Basic ${apiKey}` },
        }
      );
      const result = await resp.json();
      return res.json({ ok: result.success !== false });
    } catch (e) {
      console.log('[notify] cancel failed:', e.message);
      return res.status(500).json({ error: 'Failed to cancel notification' });
    }
  }

  // ── SCHEDULE-BATCH: schedule multiple notifications at once ──
  if (action === 'schedule-batch') {
    const { playerId, notifications } = body;
    if (!playerId || !Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: 'Missing playerId or notifications array' });
    }

    // Cap at 20 to prevent abuse
    const batch = notifications.slice(0, 20);
    const results = [];

    for (const notif of batch) {
      const { title, message, sendAt, tag } = notif;
      if (!title || !message || !sendAt) {
        results.push({ ok: false, tag, error: 'missing fields' });
        continue;
      }

      const sendTime = new Date(sendAt);
      if (isNaN(sendTime.getTime()) || sendTime.getTime() < Date.now() - 60000) {
        results.push({ ok: false, tag, error: 'invalid or past sendAt' });
        continue;
      }

      try {
        const resp = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${apiKey}`,
          },
          body: JSON.stringify({
            app_id: appId,
            include_subscription_ids: [playerId],
            headings: { en: title },
            contents: { en: message },
            url: 'https://bloomselfcare.app',
            send_after: sendAt,
            ...(tag ? { data: { bloom_tag: tag } } : {}),
          }),
        });
        const result = await resp.json();
        if (result.errors) {
          results.push({ ok: false, tag, errors: result.errors });
        } else {
          results.push({ ok: true, tag, notificationId: result.id });
        }
      } catch (e) {
        results.push({ ok: false, tag, error: e.message });
      }
    }

    return res.json({ ok: true, results });
  }

  // ── CANCEL-BATCH: cancel multiple notifications at once ────
  if (action === 'cancel-batch') {
    const { notificationIds } = body;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'Missing notificationIds array' });
    }

    const results = [];
    for (const nid of notificationIds.slice(0, 20)) {
      try {
        const resp = await fetch(
          `https://onesignal.com/api/v1/notifications/${nid}?app_id=${appId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Basic ${apiKey}` },
          }
        );
        const result = await resp.json();
        results.push({ ok: result.success !== false, notificationId: nid });
      } catch (e) {
        results.push({ ok: false, notificationId: nid, error: e.message });
      }
    }

    return res.json({ ok: true, results });
  }

  return res.status(400).json({ error: 'Unknown action. Use: schedule, cancel, schedule-batch, cancel-batch' });
}
