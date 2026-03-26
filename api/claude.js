export default async function handler(req, res) {
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

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { system, message, model } = body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Allow client to request Sonnet for richer reflections; default to Haiku for cost efficiency
  const ALLOWED_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-20250514'];
  const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'claude-haiku-4-5-20251001';

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
        system: system || 'You are a warm, helpful assistant.',
        messages: [{ role: 'user', content: message }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || null;

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ text: null, error: err.message });
  }
}
