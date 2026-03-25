// Bloom CORS helpers — shared across all API functions

const ALLOWED_ORIGINS = ['https://bloomhabits.app', 'http://localhost:3000'];

/**
 * Set standard CORS headers on a Vercel response.
 * @param {object} req - Vercel request
 * @param {object} res - Vercel response
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
}

/**
 * Handle preflight OPTIONS request. Returns true if handled.
 * @param {object} req
 * @param {object} res
 * @returns {boolean}
 */
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Parse request body safely.
 * @param {object} req
 * @returns {object}
 */
export function parseBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}
