// Vercel serverless function for Bloom Admin Agents
// Three AI-powered agents that audit telemetry data and provide actionable insights
// Protected by ADMIN_KEY env var

import { createClient } from 'redis';

let _redisClient = null;
async function getRedis() {
  if (_redisClient && _redisClient.isReady) return _redisClient;
  if (_redisClient) { try { await _redisClient.disconnect(); } catch(e) {} }
  _redisClient = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: (retries) => retries < 3 ? Math.min(retries * 200, 1000) : false } });
  _redisClient.on('error', () => {});
  await _redisClient.connect();
  return _redisClient;
}

async function kvGet(key) {
  try {
    const client = await getRedis();
    const val = await client.get(key);
    if (val === null) return null;
    return JSON.parse(val);
  } catch(e) { return null; }
}

async function kvSet(key, value, ttl) {
  try {
    const client = await getRedis();
    const str = JSON.stringify(value);
    if (ttl) {
      await client.set(key, str, { EX: ttl });
    } else {
      await client.set(key, str);
    }
  } catch(e) { /* silent */ }
}

// Redis keys (matching diagnostics.js)
const KEYS = {
  aiFeedback: 'bloom_diag:ai_feedback',
  errors: 'bloom_diag:errors',
  events: 'bloom_diag:events',
  dailyStats: (d) => `bloom_diag:daily:${d}`,
};

// ── Gather telemetry data for agents ──────────────────────
async function gatherData() {
  const [aiFeedback, errors, events] = await Promise.all([
    kvGet(KEYS.aiFeedback),
    kvGet(KEYS.errors),
    kvGet(KEYS.events),
  ]);

  const dailyStats = {};
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const stats = await kvGet(KEYS.dailyStats(key));
    if (stats) dailyStats[key] = stats;
  }

  // Window events to last 30 days for consistency with dailyStats
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const windowedEvents = (events || []).filter(e => e.ts > thirtyDaysAgo);
  const windowedErrors = (errors || []).filter(e => e.ts > thirtyDaysAgo);

  return { aiFeedback: aiFeedback || [], errors: windowedErrors, events: windowedEvents, dailyStats };
}

// ── Agent definitions ─────────────────────────────────────

function buildUXPrompt(data) {
  const dates = Object.keys(data.dailyStats).sort();
  const featureTotals = {};
  const dailySummary = dates.map(date => {
    const stats = data.dailyStats[date];
    const total = Object.entries(stats).filter(([k]) => !k.startsWith('_') && k !== 'unique_users').reduce((a, [,b]) => a + (typeof b === 'number' ? b : 0), 0);
    Object.entries(stats).forEach(([k, v]) => {
      if (k.startsWith('feature:')) {
        const name = k.replace('feature:', '');
        featureTotals[name] = (featureTotals[name] || 0) + (typeof v === 'number' ? v : 0);
      }
    });
    return `${date}: ${total} events`;
  });

  const featureRanking = Object.entries(featureTotals)
    .sort(([,a], [,b]) => b - a)
    .map(([name, count]) => `  ${name}: ${count}`)
    .join('\n');

  const fb = data.aiFeedback;
  const fbRecent = fb.slice(-50);
  const fbYes = fbRecent.filter(f => f.value === 'yes').length;
  const fbNo = fbRecent.filter(f => f.value === 'no').length;

  return `You are the UX Admin Agent for Bloom, a mental health self-care PWA. Analyze the following telemetry data and provide a UX audit.

Today's date is ${new Date().toISOString().slice(0, 10)}. The daily activity below is listed in CHRONOLOGICAL order (oldest first, newest/today last). When comparing days, remember that the LAST date listed is the most recent. An increase in events from an earlier date to a later date is a GROWTH SPIKE, not a drop-off.

## IMPORTANT: Early-Stage App Context
Bloom is in its EARLY stages with a small but growing user base. When analyzing:
- Small absolute numbers (single digits, even zeros on some days) are NORMAL for an early-stage app
- Focus on TRENDS and RATIOS rather than raw counts
- A handful of active users engaging deeply is a positive signal, not a concern
- Do NOT flag low total counts as poor engagement — compare relative feature usage instead
- Growth should be evaluated week-over-week, not against mature app benchmarks
- Missing data for some days simply means no one used the app that day — this is expected early on

Bloom has these tabs: Today (daily habits, mood), Weekly (weekly habits), Wellness (breathing, grounding, body scan, reframing), Progress (XP, streaks, insights), Community (buddy, wall), Settings.

Key design principles: no consecutive streaks (total days only), hard day mode, no shame/pressure.

## Expected Event Frequencies
When evaluating engagement, do NOT flag low counts for infrequent features. Here are normal frequencies:
- **Every session (multiple/day):** session_start, mood_log, tab navigation (today/weekly/wellness/progress/community/settings)
- **Daily (1-3x/day):** journal saves, habit completions, breathing exercises, mood_feelings
- **Weekly (1x/week):** weekly_insight AI reflection (auto-generated on Weekly tab)
- **Monthly (1x/month):** monthly_reflection AI reflection (auto-generated at month start)
- **As-needed (0-few/week):** hard_day activation, crisis resource opens, buddy messages/nudges, wall posts, reframe, grounding, bodyscan
- **Rare:** ai_feedback (only shown after AI responses, user must click), backup_created, encrypted_backup, onboarding_complete (once per new user)
Low numbers for weekly/monthly/as-needed features are NORMAL, not a sign of poor engagement. Only flag if a DAILY feature shows zero activity across multiple active days.

## User Counts
${(() => {
    const allUids = new Set();
    dates.forEach(date => {
      const s = data.dailyStats[date];
      if (s?._uids) s._uids.split(',').forEach(u => allUids.add(u));
    });
    const todayDate = new Date().toISOString().slice(0, 10);
    const todayUids = data.dailyStats[todayDate]?._uids?.split(',').length || 0;
    return `Today: ${todayUids} unique users, 30-day total: ${allUids.size} unique users`;
  })()}

## Daily Activity (last 30 days, chronological — oldest first)
${dailySummary.join('\n') || 'No data'}

## Feature Usage (30-day totals)
${featureRanking || 'No feature data'}

## AI Reflection Feedback (last 50)
Helpful: ${fbYes}, Not helpful: ${fbNo}
${fbRecent.slice(-10).map(f => `  ${f.context}: ${f.value}`).join('\n')}

## AI Reflection User Journey
${(() => {
    const journeys = data.events.filter(e => e.event === 'ai_journey');
    if (!journeys.length) return 'No AI journey data yet';
    const sources = {};
    journeys.forEach(e => { try { const m = JSON.parse(e.meta); sources[m.source] = (sources[m.source] || 0) + 1; } catch {} });
    return Object.entries(sources).sort(([,a],[,b]) => b - a).map(([s, c]) => `  ${s}: ${c} reflections`).join('\n');
  })()}

## Session Diagnostics
${(() => {
    const sessions = data.events.filter(e => e.event === 'session_diagnostics');
    if (!sessions.length) return 'No session diagnostics yet';
    const latest = sessions[sessions.length - 1];
    try { const m = JSON.parse(latest.meta); return `  Load time: ${m.loadTime}ms, DOM ready: ${m.domReady}ms, Returning user: ${m.returning}, IDB available: ${m.idbAvailable}`; } catch { return '  Unable to parse'; }
  })()}

## Mood Patterns
${(() => {
    const moods = data.events.filter(e => e.event === 'mood_pattern');
    if (!moods.length) return 'No mood pattern data yet';
    const latest = moods[moods.length - 1];
    try {
      const m = JSON.parse(latest.meta);
      return `  Latest mood: ${m.current}, 7-day avg: ${m.recentAvg}, Trend: ${m.trend}, Low mood: ${m.isLow}, Unknown selected: ${m.isUnknown}`;
    } catch { return '  Unable to parse'; }
  })()}

## Hard Day Mode Usage
${(() => {
    const hdEvents = data.events.filter(e => e.event === 'hard_day_activated');
    return hdEvents.length ? `${hdEvents.length} activations in tracked period` : 'No hard day activations';
  })()}

## Community & Social Events
${(() => {
    const findMatch = data.events.filter(e => e.event === 'buddy_find_match').length;
    const pairMatch = data.events.filter(e => e.event === 'buddy_pair_match').length;
    const pairInvite = data.events.filter(e => e.event === 'buddy_pair_invite').length;
    const pairFallback = data.events.filter(e => e.event === 'buddy_pair_fallback').length;
    const createInvite = data.events.filter(e => e.event === 'buddy_create_invite').length;
    const acceptInvite = data.events.filter(e => e.event === 'buddy_accept_invite').length;
    const cancelSearch = data.events.filter(e => e.event === 'buddy_cancel_search').length;
    const messages = data.events.filter(e => e.event === 'buddy_send_message').length;
    const nudges = data.events.filter(e => e.event === 'buddy_send_nudge').length;
    const blooms = data.events.filter(e => e.event === 'buddy_send_bloom').length;
    const unpairs = data.events.filter(e => e.event === 'buddy_unpair').length;
    const wallPosts = data.events.filter(e => e.event === 'wall_post').length;
    const onboarding = data.events.filter(e => e.event === 'onboarding_complete').length;
    const totalPairings = pairMatch + pairInvite + pairFallback;
    return `Buddy find-match attempts: ${findMatch}, Successful pairings: ${totalPairings} (${pairMatch} anonymous match, ${pairInvite} invite, ${pairFallback} admin fallback), Invites created: ${createInvite}, Invites accepted: ${acceptInvite}, Searches cancelled: ${cancelSearch}, Messages sent: ${messages}, Nudges sent: ${nudges}, Blooms sent: ${blooms}, Unpairings: ${unpairs}, Wall posts: ${wallPosts}, Onboarding completions: ${onboarding}`;
  })()}

## Recent Events
${data.events.slice(-20).map(e => `  ${e.event}${e.meta ? ' — ' + e.meta : ''}`).join('\n') || 'None'}

Provide your audit as JSON with this structure:
{
  "status": "healthy" | "needs_attention" | "critical",
  "findings": [
    { "severity": "info" | "warning" | "critical", "title": "...", "detail": "..." }
  ],
  "recommendations": ["..."],
  "summary": "1-2 sentence overall UX health summary"
}

Focus on: engagement patterns, underused features, AI reflection journey (which features drive AI usage), hard day mode discoverability, session performance, mood logging patterns, navigation friction, onboarding completion, buddy system health (find-match attempts vs successful pairings, anonymous match vs invite vs admin fallback ratio, message/nudge activity, unpair rate). Be specific and actionable. Remember this is an early-stage app — frame findings as growth opportunities rather than failures.`;
}

function buildClinicalPrompt(data) {
  const fb = data.aiFeedback;
  const fbLast7 = fb.filter(f => f.ts > Date.now() - 7 * 86400000);
  const fbLast30 = fb.filter(f => f.ts > Date.now() - 30 * 86400000);

  // Crisis and mood-related events
  const crisisEvents = data.events.filter(e =>
    e.event === 'crisis_opened' || e.event === 'hard_day_activated'
  );

  // Feature usage related to clinical features
  const dates = Object.keys(data.dailyStats).sort();
  const clinicalFeatures = {};
  const clinicalFeatureKeys = [
    'feature:breathing', 'feature:crisis', 'feature:mood_log', 'feature:journal',
    'feature:mood_feelings', 'feature:ai_reflection', 'feature:grounding',
    'feature:bodyscan', 'feature:reframe', 'feature:buddy', 'feature:wall',
  ];
  dates.forEach(date => {
    const stats = data.dailyStats[date];
    Object.entries(stats).forEach(([k, v]) => {
      if (clinicalFeatureKeys.includes(k)) {
        const name = k.replace('feature:', '');
        clinicalFeatures[name] = (clinicalFeatures[name] || 0) + (typeof v === 'number' ? v : 0);
      }
    });
  });

  return `You are the Content & Clinical Safety Admin Agent for Bloom, a mental health self-care PWA. Analyze the following data for clinical safety and content appropriateness.

## IMPORTANT: Early-Stage App Context
Bloom is in its EARLY stages with a small user base. When analyzing clinical safety:
- Small numbers are expected — even a single user engaging with wellness tools is meaningful
- Zero crisis opens with low/no mood data simply means limited data, NOT a safety gap
- Focus on whether safety MECHANISMS are working (crisis resources accessible, moderation active) rather than usage volume
- Do NOT escalate to "critical" based on low data volume alone — "critical" should be reserved for actual safety signals (e.g. consistently low moods with no crisis access, broken moderation, harmful AI responses)
- "needs_attention" is appropriate for things worth monitoring as the app grows
- "healthy" is the right call when mechanisms are in place and no red flags exist in available data

Bloom's clinical principles:
- AI reflections use warm witness tone, never clinical advice
- Disclaimer: "not a substitute for professional mental health care"
- Low mood auto-surfaces breathing exercises and crisis resources
- Crisis sheet includes 988, Crisis Text Line (741741), findahelpline.com
- Moderation allows venting — emotional language is NOT filtered
- No consecutive streaks (total days only, never goes down)
- Hard day mode reduces habits to top 2
- Wellness tools: breathing, grounding, body scan, reframing — all clinically relevant

## Expected Event Frequencies
Do NOT flag low counts for features that are designed to be infrequent:
- **AI reflections:** journal responses are per-entry, weekly insight is 1x/week, monthly reflection is 1x/month
- **AI feedback:** only shown after AI responses; user must click — low counts are normal
- **Crisis resources:** 0 opens can be GOOD (no one needed them). Only concerning if mood logs show consistent low moods WITH zero crisis resource access
- **Hard day mode:** as-needed; 0 activations can mean users are doing well
- **Breathing/grounding/bodyscan/reframe:** as-needed wellness tools, not daily habits
- **Content moderation:** low/zero counts mean community is healthy, not that moderation is broken
- **Buddy/wall:** community features — low adoption is normal early on

## AI Feedback (last 7 days)
Helpful: ${fbLast7.filter(f => f.value === 'yes').length}, Not helpful: ${fbLast7.filter(f => f.value === 'no').length}

## AI Feedback (last 30 days)
Helpful: ${fbLast30.filter(f => f.value === 'yes').length}, Not helpful: ${fbLast30.filter(f => f.value === 'no').length}
Total all-time feedback entries: ${fb.length}

## Recent AI Feedback Contexts
${fb.slice(-20).map(f => `  ${f.context}: ${f.value} (${new Date(f.ts).toISOString().slice(0, 10)})`).join('\n') || 'None'}

## Crisis & Hard Day Events
${crisisEvents.slice(-20).map(e => `  ${e.event} at ${new Date(e.ts).toISOString()}`).join('\n') || 'None recorded'}

## Clinical Feature Usage (30 days)
${Object.entries(clinicalFeatures).map(([k, v]) => `  ${k}: ${v}`).join('\n') || 'No data'}

## Community Safety Signals
${(() => {
    const pairMatch = data.events.filter(e => e.event === 'buddy_pair_match').length;
    const pairInvite = data.events.filter(e => e.event === 'buddy_pair_invite').length;
    const pairFallback = data.events.filter(e => e.event === 'buddy_pair_fallback').length;
    const messages = data.events.filter(e => e.event === 'buddy_send_message').length;
    const buddyUnpairs = data.events.filter(e => e.event === 'buddy_unpair').length;
    const wallPosts = data.events.filter(e => e.event === 'wall_post').length;
    const totalPairings = pairMatch + pairInvite + pairFallback;
    return `Wall posts: ${wallPosts}, Buddy pairings: ${totalPairings} (${pairMatch} match, ${pairInvite} invite, ${pairFallback} admin fallback), Messages: ${messages}, Unpairings: ${buddyUnpairs}`;
  })()}
Note: Content moderation (blocked/flagged messages) is handled server-side by buddy.js and wall.js with a three-tier approach (blocked, flagged with crisis resources, allowed). Moderation data is available in the Wall tab of this dashboard, not in telemetry events.

## Mood Logging Patterns
${(() => {
    const moods = data.events.filter(e => e.event === 'mood_pattern');
    if (!moods.length) return 'No mood pattern data yet';
    const lowCount = moods.filter(e => { try { return JSON.parse(e.meta).isLow; } catch { return false; } }).length;
    const unknownCount = moods.filter(e => { try { return JSON.parse(e.meta).isUnknown; } catch { return false; } }).length;
    const latest = moods[moods.length - 1];
    try {
      const m = JSON.parse(latest.meta);
      return `Total mood logs: ${moods.length}, Low moods: ${lowCount}, "I don't know" selected: ${unknownCount}\nLatest: mood=${m.current}, 7-day avg=${m.recentAvg}, trend=${m.trend}`;
    } catch { return `Total mood logs: ${moods.length}`; }
  })()}

## Hard Day Mode & Crisis Resources
${(() => {
    const hd = data.events.filter(e => e.event === 'hard_day_activated');
    const crisis = data.dailyStats;
    let crisisTotal = 0;
    Object.values(crisis).forEach(s => { crisisTotal += s['feature:crisis'] || 0; });
    return `Hard day activations: ${hd.length}, Crisis resource opens: ${crisisTotal}`;
  })()}

Provide your audit as JSON with this structure:
{
  "status": "healthy" | "needs_attention" | "critical",
  "findings": [
    { "severity": "info" | "warning" | "critical", "title": "...", "detail": "..." }
  ],
  "recommendations": ["..."],
  "summary": "1-2 sentence clinical safety summary"
}

Focus on: AI response quality/satisfaction trends, crisis resource accessibility and usage, clinical feature engagement (including wellness tools like breathing, grounding, body scan, reframing), mood logging patterns (especially low moods and "I don't know" selections), hard day mode discoverability and usage, community safety (buddy/wall interactions), any patterns suggesting users may not be getting adequate support. Be compassionate but thorough. Remember this is an early-stage app — distinguish between "not enough data yet" and actual clinical safety concerns.`;
}

function buildSecurityPrompt(data) {
  const errors = data.errors;
  const errLast24h = errors.filter(e => e.ts > Date.now() - 86400000);
  const errLast7d = errors.filter(e => e.ts > Date.now() - 7 * 86400000);

  // Group errors by message
  const errorGroups = {};
  errLast7d.forEach(e => {
    const key = (e.message || 'unknown').slice(0, 100);
    if (!errorGroups[key]) errorGroups[key] = { count: 0, latest: 0 };
    errorGroups[key].count++;
    errorGroups[key].latest = Math.max(errorGroups[key].latest, e.ts);
  });

  const topErrors = Object.entries(errorGroups)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 10)
    .map(([msg, info]) => `  [${info.count}x] ${msg} (latest: ${new Date(info.latest).toISOString().slice(0, 16)})`);

  // Check for suspicious patterns
  const events = data.events;
  const recentEvents = events.slice(-100);

  // Daily error rates
  const dates = Object.keys(data.dailyStats).sort();
  const dailyErrors = dates.map(date => {
    const stats = data.dailyStats[date];
    return `${date}: ${stats.errors || 0} errors`;
  }).filter(s => !s.endsWith('0 errors'));

  return `You are the Technical & Security Admin Agent for Bloom, a mental health self-care PWA deployed on Vercel.

## IMPORTANT: Early-Stage App Context
Bloom is in its EARLY stages with a small user base. When analyzing:
- Low event/error counts are expected — do not flag low volume as anomalous
- Sparse data across 30 days (many empty days) is normal for a new app
- Focus on error PATTERNS and RATES rather than absolute counts
- A few errors in a week with a handful of users is not alarming
- "critical" should be reserved for actual security issues (CSP violations, injection attempts, sustained API failures) — not just "there were some errors"
- Intermittent cold-start latency spikes are expected with Vercel serverless

Architecture:
- Single-page app (index.html) deployed as static site
- Vercel serverless API: claude.js (Anthropic proxy), buddy.js (Redis), wall.js (Redis), diagnostics.js (Redis)
- localStorage primary + IndexedDB backup
- CORS locked to bloomselfcare.app + bloom-zeta-rouge.vercel.app + localhost:3000
- CSP headers configured in vercel.json
- No user accounts/auth — data stays local unless using community features
- Content moderation on buddy.js and wall.js (three-tier: blocked, flagged, allowed)

## Expected Patterns
- **Redis response times:** First request after cold start can be 500-1000ms (Vercel serverless). Subsequent requests should be <200ms. Only flag if SUSTAINED high latency across many requests.
- **IndexedDB:** Used as backup mirror for localStorage. idbAvailable=false may occur on some browsers/contexts but is not critical — localStorage is the primary store.
- **Session diagnostics:** loadTime of 0 can happen if measured before load completes. loadTime under 3000ms is acceptable for a large SPA.
- **API timing:** buddy/wall endpoints hit Redis; claude endpoint hits external Anthropic API (expect 1-3s). Compare like-for-like.

## Error Summary
Total tracked: ${errors.length}
Last 24 hours: ${errLast24h.length}
Last 7 days: ${errLast7d.length}

## Top Errors (7 days, grouped)
${topErrors.join('\n') || 'No errors in last 7 days'}

## Recent Errors (last 10)
${errors.slice(-10).reverse().map(e => `  ${new Date(e.ts).toISOString().slice(0, 16)} | ${e.message}${e.url ? ' | ' + e.url : ''}`).join('\n') || 'None'}

## Daily Error Rates
${dailyErrors.join('\n') || 'No error data'}

## API Response Times
${data.events.filter(e => e.event === 'api_timing').slice(-20).map(e => {
    try { const m = JSON.parse(e.meta); return `  ${m.endpoint}: ${m.duration}ms (status ${m.status})`; } catch { return ''; }
  }).filter(Boolean).join('\n') || 'No API timing data yet'}

## Health Checks
${data.events.filter(e => e.event === 'health_check').slice(-5).map(e => {
    try { const m = JSON.parse(e.meta); return '  ' + Object.entries(m).map(([k,v]) => `${k}: ${v.ok ? 'OK' : 'FAIL'}`).join(', '); } catch { return ''; }
  }).filter(Boolean).join('\n') || 'No health check data yet'}

## Community Activity
${(() => {
    const findMatch = data.events.filter(e => e.event === 'buddy_find_match').length;
    const pairMatch = data.events.filter(e => e.event === 'buddy_pair_match').length;
    const pairInvite = data.events.filter(e => e.event === 'buddy_pair_invite').length;
    const pairFallback = data.events.filter(e => e.event === 'buddy_pair_fallback').length;
    const buddyUnpairs = data.events.filter(e => e.event === 'buddy_unpair').length;
    const wallPosts = data.events.filter(e => e.event === 'wall_post').length;
    const totalPairings = pairMatch + pairInvite + pairFallback;
    return `Wall posts: ${wallPosts}, Buddy find-match attempts: ${findMatch}, Pairings: ${totalPairings} (${pairMatch} match, ${pairInvite} invite, ${pairFallback} admin fallback), Unpairings: ${buddyUnpairs}`;
  })()}
Note: Content moderation (blocked/flagged messages) is handled server-side. Check the Wall tab for moderation details.

## IndexedDB Performance
${(() => {
    const slow = data.events.filter(e => e.event === 'idb_slow');
    const errors = data.events.filter(e => e.event === 'idb_error');
    if (!slow.length && !errors.length) return 'No IndexedDB issues detected (operations under 500ms)';
    let out = '';
    if (slow.length) out += `Slow operations (>500ms): ${slow.length}\n${slow.slice(-5).map(e => { try { const m = JSON.parse(e.meta); return '  ' + m.op + ' ' + m.key + ': ' + m.duration + 'ms'; } catch { return ''; } }).filter(Boolean).join('\n')}`;
    if (errors.length) out += `\nIDB errors: ${errors.length}\n${errors.slice(-5).map(e => { try { const m = JSON.parse(e.meta); return '  ' + m.op + ' ' + m.key + ': ' + m.error; } catch { return ''; } }).filter(Boolean).join('\n')}`;
    return out;
  })()}

## Session Performance
${(() => {
    const sessions = data.events.filter(e => e.event === 'session_diagnostics');
    if (!sessions.length) return 'No session diagnostics yet';
    const loadTimes = sessions.map(e => { try { return JSON.parse(e.meta).loadTime; } catch { return null; } }).filter(Boolean);
    const avg = loadTimes.length ? Math.round(loadTimes.reduce((a,b) => a+b, 0) / loadTimes.length) : null;
    const latest = sessions[sessions.length - 1];
    try {
      const m = JSON.parse(latest.meta);
      return `Sessions tracked: ${sessions.length}, Avg load time: ${avg}ms\nLatest: load=${m.loadTime}ms, DOM=${m.domReady}ms, online=${m.online}, IDB=${m.idbAvailable}`;
    } catch { return `Sessions tracked: ${sessions.length}`; }
  })()}

## Recent Events (last 20)
${recentEvents.slice(-20).map(e => `  ${e.event}${e.meta ? ' — ' + e.meta : ''}`).join('\n') || 'None'}

Provide your audit as JSON with this structure:
{
  "status": "healthy" | "needs_attention" | "critical",
  "findings": [
    { "severity": "info" | "warning" | "critical", "title": "...", "detail": "..." }
  ],
  "recommendations": ["..."],
  "summary": "1-2 sentence technical/security health summary"
}

Focus on: error rate trends, recurring error patterns, potential security concerns, API health and response times, IndexedDB performance, session load times, data integrity signals, any anomalous patterns. Be specific and actionable. Remember this is an early-stage app — a handful of JS errors or cold-start latency spikes do not warrant "critical" status.`;
}

const AGENTS = {
  ux: { name: 'UX Admin', buildPrompt: buildUXPrompt },
  clinical: { name: 'Content & Clinical Admin', buildPrompt: buildClinicalPrompt },
  security: { name: 'Technical & Security Admin', buildPrompt: buildSecurityPrompt },
};

// ── Call Claude API ───────────────────────────────────────
async function runAgent(agentType, data) {
  const agent = AGENTS[agentType];
  if (!agent) throw new Error('Unknown agent: ' + agentType);

  const prompt = agent.buildPrompt(data);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are an admin audit agent for Bloom, a mental health self-care PWA in its early stages. The app has a small but growing user base — calibrate your assessments accordingly. Low absolute numbers are expected. Focus on patterns, ratios, and whether safety mechanisms are functioning, not volume. Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${err.slice(0, 200)}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text || '{}';

  // Parse the JSON response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Agent returned non-JSON response');

  return JSON.parse(jsonMatch[0]);
}

// ── Store agent reports in Redis ──────────────────────────
const REPORT_KEY = 'bloom_admin:agent_reports';
const REPORT_TTL = 90 * 24 * 60 * 60; // 90 days

async function saveReport(agentType, report) {
  const reports = await kvGet(REPORT_KEY) || {};
  if (!reports[agentType]) reports[agentType] = [];
  reports[agentType].push({
    ...report,
    agentType,
    timestamp: Date.now(),
  });
  // Keep last 50 reports per agent
  if (reports[agentType].length > 50) {
    reports[agentType] = reports[agentType].slice(-50);
  }
  await kvSet(REPORT_KEY, reports, REPORT_TTL);
}

async function getReports() {
  return await kvGet(REPORT_KEY) || {};
}

// ── Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  const allowedOrigins = ['https://bloomselfcare.app', 'https://bloom-zeta-rouge.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const adminKey = process.env.ADMIN_KEY;
  const provided = req.query?.key || req.headers['x-admin-key'];
  if (!adminKey || provided !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.REDIS_URL) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI not configured — ANTHROPIC_API_KEY required' });
  }

  // ── POST: Run an agent ──────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { agent } = body;

    if (agent === 'all') {
      // Run all three agents in parallel
      const data = await gatherData();
      const results = {};
      const agents = Object.keys(AGENTS);

      const reports = await Promise.allSettled(
        agents.map(async (type) => {
          const report = await runAgent(type, data);
          await saveReport(type, report);
          return { type, report };
        })
      );

      reports.forEach(r => {
        if (r.status === 'fulfilled') {
          results[r.value.type] = r.value.report;
        } else {
          const type = agents[reports.indexOf(r)];
          results[type] = { status: 'error', summary: r.reason?.message || 'Agent failed', findings: [], recommendations: [] };
        }
      });

      return res.json({ ok: true, results, timestamp: Date.now() });
    }

    if (!AGENTS[agent]) {
      return res.status(400).json({ error: `Unknown agent. Use: ${Object.keys(AGENTS).join(', ')}, or "all"` });
    }

    const data = await gatherData();
    const report = await runAgent(agent, data);
    await saveReport(agent, report);

    return res.json({ ok: true, agent, report, timestamp: Date.now() });
  }

  // ── GET: Retrieve past reports ──────────────────────────
  if (req.method === 'GET') {
    const reports = await getReports();
    return res.json({ ok: true, reports });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
