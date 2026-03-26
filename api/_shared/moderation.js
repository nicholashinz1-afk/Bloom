// Bloom content moderation — shared by buddy.js and wall.js
//
// Philosophy: allow venting/self-expression, offer resources for self-harm,
// block language that targets or harms *others*.
// See CLAUDE.md "Content Moderation" for the full rationale.

// Directed harm — messages intended to hurt another person
const DIRECTED_HARM = [
  /\bkill\s*your\s*self\b/i,
  /\bkys\b/i,
  /\bgo\s*die\b/i,
  /\bend\s*it\s*all\b/i,
  /\byou\s*should\s*(die|kill|hurt)\b/i,
  /\bnobody\s*(loves|cares about|likes)\s*you\b/i,
  /\byou\s*deserve\s*to\s*(die|suffer|hurt)\b/i,
  /\bi('ll|m going to|m gonna)\s*(kill|hurt|find)\s*you\b/i,
];

// Slurs & targeted abuse — language used to dehumanize others
const TARGETED_ABUSE = [
  /\b(bitch|cunt|faggot|retard|tranny|n[i1]gg[ae3]r)\b/i,
];

// Spam / link / injection prevention
const SPAM_PATTERNS = [
  /\b(http|www\.|\.\bcom\b|\.\borg\b|\.\bnet\b)\b/i,
  /@|#|\$\$|[<>]/,
];

// Self-harm language — not blocked, but flagged so the client can offer resources
const SELF_HARM_PATTERNS = [
  /\b(kill myself|end my life|want to die|don'?t want to (be here|live|exist))\b/i,
  /\b(suicide|suicidal|self[- ]?harm|cut myself|hurt myself)\b/i,
];

// Crude / off-topic — not blocked, but soft-flagged for content warning display
const CRUDE_PATTERNS = [
  /\b(hog|dong|wiener|schlong|pp|peen|johnson|boner)\b/i,
  /\bcrank\b.*\b(hog|one|it)\b/i,
  /\b(jerk|jack|wank|beat)\s*(off|it|ing)\b/i,
  /\b(dick|cock|penis|balls|nuts|tits|boobs|ass|booty)\b/i,
  /\b(horny|sexy|bang|hookup|hook up|smash|69)\b/i,
  /\b(porn|onlyfans|nsfw|nude|naked)\b/i,
  /\b(shit|fuck|damn|hell|crap|piss)\b/i,
  /\b(stfu|gtfo|lmao.*ass|dumbass|badass|jackass)\b/i,
];

/**
 * Moderate a user-submitted message.
 * @param {string} text - raw message text
 * @param {object} [opts]
 * @param {number} [opts.minLen=1]  - minimum allowed length
 * @param {number} [opts.maxLen=200] - maximum allowed length
 * @returns {{ ok: boolean, reason?: string, flag?: string }}
 */
export function moderateMessage(text, { minLen = 1, maxLen = 200 } = {}) {
  const lower = text.toLowerCase().trim();
  if (lower.length < minLen || lower.length > maxLen) return { ok: false, reason: 'length' };

  for (const pat of DIRECTED_HARM) {
    if (pat.test(lower)) return { ok: false, reason: 'harmful' };
  }

  for (const pat of TARGETED_ABUSE) {
    if (pat.test(lower)) return { ok: false, reason: 'harmful' };
  }

  for (const pat of SPAM_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'filtered' };
  }

  if (!/[a-zA-Z]/.test(text)) return { ok: false, reason: 'no-text' };

  for (const pat of SELF_HARM_PATTERNS) {
    if (pat.test(lower)) return { ok: true, flag: 'self-harm' };
  }

  // Soft-flag crude/off-topic — allow but mark for content warning display
  for (const pat of CRUDE_PATTERNS) {
    if (pat.test(lower)) return { ok: true, flag: 'crude' };
  }

  return { ok: true };
}
