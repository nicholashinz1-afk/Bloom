// Shared content moderation module for Bloom community features
// Used by both buddy.js and wall.js to ensure consistent pattern matching.
// Update patterns HERE — both endpoints will pick up changes automatically.

// ── Philosophy ─────────────────────────────────────────────
// Allow venting/self-expression, offer resources for self-harm,
// block language that targets or harms *others*.
// See CLAUDE.md "Content Moderation" for the full tier breakdown.

// ── Pattern definitions ────────────────────────────────────

// Credible threats of violence — blocked and logged with full metadata for compliance.
// These target specific, actionable threats (mass violence, named targets, weapons + intent).
// This is NOT for venting or self-harm. Only patterns indicating intent to harm others at scale
// or with specificity that could constitute a credible, reportable threat.
export const CREDIBLE_THREAT_PATTERNS = [
  /\b(shoot\s*up|bomb|blow\s*up|attack)\s*(the|a|my)?\s*(school|church|mosque|synagogue|temple|hospital|mall|store|building|office|campus)\b/i,
  /\b(going to|gonna|plan(ning)?\s*to|about to)\s*(shoot|bomb|blow\s*up|attack|stab|kill)\s*(everyone|people|them all|everybody|the whole)\b/i,
  /\b(brought|have|got)\s*(a|my)\s*(gun|knife|weapon|bomb|explosive)\s*(to|at|in)\s*(school|work|class|church)\b/i,
  /\b(mass|school|church)\s*(shoot|attack|bomb|stab)/i,
  /\b(pipe\s*bomb|nail\s*bomb|pressure\s*cooker\s*bomb|explosive\s*device|molotov)\b/i,
  /\bi('ll|m going to|m gonna|will)\s*(shoot|stab|bomb|blow\s*up|attack)\s*(this|the|my)\s*(school|place|building|office|church)\b/i,
  /\b(they|you)\s*(deserve|need)\s*to\s*(be\s*)?(shot|bombed|killed|massacred|slaughtered)\b/i,
];

// Directed harm — messages intended to hurt another person
export const DIRECTED_HARM = [
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
export const TARGETED_ABUSE = [
  /\b(bitch|cunt|faggot|retard|tranny|n[i1]gg[ae3]r)\b/i,
];

// Grooming / predatory language — blocked unconditionally
export const GROOMING_PATTERNS = [
  /\bhow\s*old\s*are\s*you\b/i,
  /\bwhat\s*('s\s*your|is\s*your)\s*(age|grade)\b/i,
  /\bwhere\s*(do\s*you|u)\s*(live|stay|go\s*to\s*school)\b/i,
  /\bwhat\s*school\s*(do\s*you|u)\b/i,
  /\bsend\s*(me\s*)?(a\s*)?(pic|photo|selfie|image)\b/i,
  /\bdon'?t\s*tell\s*(anyone|your\s*(parents?|mom|dad|teacher))\b/i,
  /\bkeep\s*this\s*(between\s*us|a\s*secret|our\s*secret)\b/i,
  /\bjust\s*between\s*(us|you\s*and\s*me)\b/i,
  /\b(meet|hang)\s*(up|out|me)\s*(in\s*person|irl|somewhere)\b/i,
  /\bmeet\s*in\s*(real\s*life|person)\b/i,
];

// Contact exchange — blocked to prevent off-platform communication
export const CONTACT_EXCHANGE = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,                         // US phone numbers
  /\b\+\d{1,3}[-.\s]?\d{6,14}\b/,                               // international phone numbers
  /\b(snap(chat)?|insta(gram)?|discord|tiktok|telegram|whatsapp|signal|kik|wechat)\s*[:\-]?\s*@?\w/i,
  /\b(add|hmu|hit\s*me\s*up|dm\s*me|message\s*me)\s*(on|at)\b/i,
  /\bmy\s*(snap|insta|discord|tiktok|number|#)\s*(is|:)\b/i,
  /\b(follow|add)\s*me\s*(on|@)\b/i,
  /\bwhat'?s\s*your\s*(snap|insta|discord|number|ig|tiktok|username)\b/i,
];

// Crude / sexual content — hard-blocked in buddy (1-on-1), soft-flagged on wall (public)
export const CRUDE_PATTERNS = [
  /\b(hog|dong|wiener|schlong|pp|peen|johnson|boner)\b/i,
  /\bcrank\b.*\b(hog|one|it)\b/i,
  /\b(jerk|jack|wank|beat)\s*(off|it|ing)\b/i,
  /\b(dick|cock|penis|balls|nuts|tits|boobs|ass|booty)\b/i,
  /\b(horny|sexy|bang|hookup|hook up|smash|69)\b/i,
  /\b(porn|onlyfans|nsfw|nude|naked)\b/i,
  /\b(shit|fuck|damn|hell|crap|piss)\b/i,
  /\b(stfu|gtfo|lmao.*ass|dumbass|badass|jackass)\b/i,
];

// Spam / link / injection prevention
export const SPAM_PATTERNS = [
  /\b(http|www\.|\.\bcom\b|\.\borg\b|\.\bnet\b)\b/i,
  /@|#|\$\$|[<>]/,
];

// Self-harm language — not blocked, but flagged so the client can offer resources.
// These are intentionally broad because false positives only show crisis resources
// (the message still goes through). Better to surface help for someone who doesn't
// need it than to miss someone who does.
export const SELF_HARM_PATTERNS = [
  /\b(kill myself|end my life|want to die|don'?t want to (be here|live|exist))\b/i,
  /\b(suicide|suicidal|self[- ]?harm|cut myself|hurt myself)\b/i,
  /\b(can'?t (do this|go on|take it) any\s*more)\b/i,
  /\b(what'?s the point|no point|no reason to (live|go on|continue))\b/i,
  /\b(nobody would (miss|care|notice))\b/i,
  /\b(better off (without me|dead))\b/i,
  /\b(don'?t (care|want to) wake up)\b/i,
  /\b(wish i (wasn'?t|weren'?t) (here|alive|born))\b/i,
];

// ── Moderation function ────────────────────────────────────
// source: 'buddy' or 'wall' — controls crude content handling and length limits
export function moderateMessage(text, source = 'wall') {
  const lower = text.toLowerCase().trim();

  // Length limits differ by source
  const minLen = source === 'buddy' ? 1 : 3;
  const maxLen = source === 'buddy' ? 200 : 140;
  if (lower.length < minLen || lower.length > maxLen) return { ok: false, reason: 'length' };

  // Credible threats of violence — highest priority, logged separately for compliance
  for (const pat of CREDIBLE_THREAT_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'threat' };
  }

  // Block directed harm toward others
  for (const pat of DIRECTED_HARM) {
    if (pat.test(lower)) return { ok: false, reason: 'harmful' };
  }

  // Block targeted slurs/abuse
  for (const pat of TARGETED_ABUSE) {
    if (pat.test(lower)) return { ok: false, reason: 'harmful' };
  }

  // Block grooming / predatory language
  for (const pat of GROOMING_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'safety' };
  }

  // Block contact exchange attempts
  for (const pat of CONTACT_EXCHANGE) {
    if (pat.test(lower)) return { ok: false, reason: 'safety' };
  }

  // Crude/sexual content: hard-block in buddy (1-on-1), soft-flag on wall (public)
  for (const pat of CRUDE_PATTERNS) {
    if (pat.test(lower)) {
      if (source === 'buddy') return { ok: false, reason: 'inappropriate' };
      return { ok: true, flag: 'crude' };
    }
  }

  // Block spam/links
  for (const pat of SPAM_PATTERNS) {
    if (pat.test(lower)) return { ok: false, reason: 'filtered' };
  }

  if (!/[a-zA-Z]/.test(text)) return { ok: false, reason: 'no-text' };

  // Flag self-harm language — allow the message but signal the client to show resources
  for (const pat of SELF_HARM_PATTERNS) {
    if (pat.test(lower)) return { ok: true, flag: 'self-harm' };
  }

  return { ok: true };
}
