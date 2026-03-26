// Bloom API utilities — shared ID generation and helpers

/**
 * Generate a short unique ID (timestamp + random).
 * @returns {string}
 */
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Generate a 6-character invite code (no ambiguous chars: O/0/1/I).
 * @returns {string}
 */
export function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
