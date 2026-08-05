// Fills in details for a place the family types into the "Add a spot" box.
//
// Deliberately narrow: it returns a short kid-relevant note, a rough area, and a
// couple of tags. It never returns addresses, hours, prices, phone numbers, or
// URLs, because a model guessing those is worse than useless on a trip. The
// browser builds map and menu links itself as searches, so links can't be stale
// or wrong.
//
// Env: ANTHROPIC_API_KEY (required), TRIP_PASSCODE (optional write gate).

const MODEL = 'claude-sonnet-4-6';
const ALLOWED_ORIGINS = [
  'https://bloomselfcare.app',
  'http://localhost:3000',
];

// Coarse per-container throttle. Not airtight across Vercel instances, but the
// passcode is the real gate; this just stops a stuck client from looping.
const RATE = { windowStart: 0, count: 0 };
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

const CATEGORY_LABELS = {
  breakfast: 'a breakfast spot',
  lunch: 'a lunch spot',
  dinnerCasual: 'a casual family dinner spot',
  dinnerNice: 'a nicer dinner out',
  treats: 'a dessert or ice cream stop',
  near: 'something to do within 15 minutes of the hotel',
  downtown: 'something to do in downtown Traverse City',
  daytrip: 'a day trip out of town',
  rainy: 'a rainy day or indoor option',
  driveUp: 'a stop on the drive up from Detroit',
  driveHome: 'a stop on the drive home to Detroit',
};

const SYSTEM = `You are helping one specific family fill in their Traverse City trip plan.

The family: two adults, one toddler/preschooler (roughly 2-5) and one early-elementary kid (roughly 6-9). They are staying at Grand Beach Resort Hotel on East Grand Traverse Bay, on US-31 North just northeast of downtown Traverse City, from August 15 to 19. They drive up from Metro Detroit and back. They want mostly casual food with one nicer dinner, and they are willing to drive about 40 minutes for one day trip.

Given a place name and which list they want it in, return details for their plan.

Hard rules:
- NEVER output a street address, phone number, hours, prices, menu items you are unsure of, or any URL. The app builds its own links. If you include any of these, the answer is wrong.
- "where" is a rough area only: a road, neighborhood, or town, plus a drive time from the hotel if you are reasonably sure. Examples: "US-31 N, about 5 min from the hotel", "downtown on Front St", "Glen Arbor, ~40 min". If you are not sure where it is, use an empty string.
- "note" is ONE sentence, max about 22 words, written for these two kids specifically. Say the honest useful thing: what the kids will actually do or eat, or the real catch. Do not write marketing copy. Do not start with the place's name.
- If the place would genuinely be rough with a toddler, say so in the note. Being useful beats being encouraging.
- "chips" is 0 to 3 very short tags, 3 words max each, only things you are confident about. Good: "indoor", "no reservations", "high chairs", "cash only", "~40 min drive", "seasonal". Skip any you are unsure of rather than guessing.
- "indoor" is true only if the place works as a rainy-day option, meaning the main activity happens inside. A restaurant with a patio is not indoor unless it also has real indoor seating.
- If you do not recognize the place, set "recognized" to false, leave "where" empty, and write a note that says you could not confirm it and they should check it themselves. Still return the cleaned-up name.
- No em dashes anywhere in your output.

Respond with ONLY a JSON object, no prose and no code fence:
{"name": string, "where": string, "note": string, "chips": string[], "indoor": boolean, "recognized": boolean}`;

function setCors(req, res) {
  const origin = req.headers.origin;
  // Same-origin calls (the normal case) send no Origin header we need to echo.
  if (origin && ALLOWED_ORIGINS.some((o) => origin === o || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-trip-key');
}

function rateLimited() {
  const now = Date.now();
  if (now - RATE.windowStart > RATE_WINDOW_MS) {
    RATE.windowStart = now;
    RATE.count = 0;
  }
  RATE.count += 1;
  return RATE.count > RATE_MAX;
}

// The model is told to return bare JSON, but a stray fence or sentence should
// not break the feature. Pull the first balanced object out of the text.
function extractJSON(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}

const BANNED_IN_NOTE = /(https?:\/\/|www\.|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/i;

function clean(raw, fallbackName) {
  const name = String(raw?.name || fallbackName || '').trim().slice(0, 80);
  let where = String(raw?.where || '').trim().slice(0, 90);
  let note = String(raw?.note || '').trim().slice(0, 240);
  // Strip anything the prompt forbade in case the model slipped.
  if (BANNED_IN_NOTE.test(where)) where = '';
  if (BANNED_IN_NOTE.test(note)) note = note.replace(BANNED_IN_NOTE, '').trim();
  note = note.replace(/\s*[—–]\s*/g, ', ');
  const chips = Array.isArray(raw?.chips)
    ? raw.chips
        .map((c) => String(c || '').trim().slice(0, 22))
        .filter((c) => c && !BANNED_IN_NOTE.test(c))
        .slice(0, 3)
    : [];
  return {
    name: name || 'Untitled spot',
    where,
    note,
    chips,
    indoor: raw?.indoor === true,
    recognized: raw?.recognized !== false,
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.TRIP_PASSCODE;
  if (expected && req.headers['x-trip-key'] !== expected) {
    return res.status(401).json({ error: 'Wrong passcode.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Lookup is not configured yet. Add it by hand for now.' });
  }

  if (rateLimited()) {
    return res.status(429).json({ error: 'Too many lookups at once. Give it a minute.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const name = String(body.name || '').trim().slice(0, 120);
  const category = String(body.category || '').trim();

  if (!name) return res.status(400).json({ error: 'Type a place name first.' });

  const categoryLabel = CATEGORY_LABELS[category] || 'somewhere to go on the trip';
  const userMsg = `Place: ${name}\nThey want it in their plan as ${categoryLabel}.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('anthropic error', r.status, detail.slice(0, 400));
      return res.status(502).json({ error: 'Lookup failed. You can still add it by hand.' });
    }

    const data = await r.json();
    const text = (data?.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const parsed = extractJSON(text);
    if (!parsed) {
      return res.status(502).json({ error: 'Could not read the lookup result. Add it by hand.' });
    }

    return res.status(200).json({ spot: clean(parsed, name) });
  } catch (e) {
    console.error('lookup threw', e?.message);
    return res.status(502).json({ error: 'Lookup failed. You can still add it by hand.' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
