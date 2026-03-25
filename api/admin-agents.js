// Vercel serverless function for Bloom Admin Agents
// Three AI-powered agents that audit telemetry data and provide actionable insights
// Protected by ADMIN_KEY env var

import { createClient } from 'redis';

let _redisClient = null;
async function getRedis() {
  if (!_redisClient) {
    _redisClient = createClient({ url: process.env.REDIS_URL });
    _redisClient.on('error', () => {});
    await _redisClient.connect();
  }
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

  return { aiFeedback: aiFeedback || [], errors: errors || [], events: events || [], dailyStats };
}

// ── Agent definitions ─────────────────────────────────────

function buildUXPrompt(data) {
  const dates = Object.keys(data.dailyStats).sort();
  const featureTotals = {};
  const dailySummary = dates.map(date => {
    const stats = data.dailyStats[date];
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    Object.entries(stats).forEach(([k, v]) => {
      if (k.startsWith('feature:')) {
        const name = k.replace('feature:', '');
        featureTotals[name] = (featureTotals[name] || 0) + v;
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

Bloom has these tabs: Today (daily habits, mood), Weekly (weekly habits), Wellness (breathing, grounding, body scan, reframing), Progress (XP, streaks, insights), Community (buddy, wall), Settings.

Key design principles: no consecutive streaks (total days only), hard day mode, no shame/pressure.

## Daily Activity (last 30 days, chronological — oldest first)
${dailySummary.join('\n') || 'No data'}

## Feature Usage (30-day totals)
${featureRanking || 'No feature data'}

## AI Reflection Feedback (last 50)
Helpful: ${fbYes}, Not helpful: ${fbNo}
${fbRecent.slice(-10).map(f => `  ${f.context}: ${f.value}`).join('\n')}

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

Focus on: engagement patterns, underused features, drop-offs, AI satisfaction trends, potential UX friction points. Be specific and actionable.`;
}

function buildClinicalPrompt(data) {
  const fb = data.aiFeedback;
  const fbLast7 = fb.filter(f => f.ts > Date.now() - 7 * 86400000);
  const fbLast30 = fb.filter(f => f.ts > Date.now() - 30 * 86400000);

  // Crisis and mood-related events
  const crisisEvents = data.events.filter(e =>
    e.event === 'crisis_opened' || e.event === 'hard_day_activated'
  );
  const moodEvents = data.events.filter(e =>
    e.event === 'mood_log' || (e.meta && e.meta.includes('mood'))
  );

  // Feature usage related to clinical features
  const dates = Object.keys(data.dailyStats).sort();
  const clinicalFeatures = {};
  dates.forEach(date => {
    const stats = data.dailyStats[date];
    Object.entries(stats).forEach(([k, v]) => {
      if (['feature:breathing', 'feature:crisis', 'feature:mood_log', 'feature:journal', 'feature:mood_feelings', 'feature:ai_reflection'].includes(k)) {
        const name = k.replace('feature:', '');
        clinicalFeatures[name] = (clinicalFeatures[name] || 0) + v;
      }
    });
  });

  return `You are the Content & Clinical Safety Admin Agent for Bloom, a mental health self-care PWA. Analyze the following data for clinical safety and content appropriateness.

Bloom's clinical principles:
- AI reflections use warm witness tone, never clinical advice
- Disclaimer: "not a substitute for professional mental health care"
- Low mood auto-surfaces breathing exercises and crisis resources
- Crisis sheet includes 988, Crisis Text Line (741741), findahelpline.com
- Moderation allows venting — emotional language is NOT filtered
- No consecutive streaks (total days only, never goes down)
- Hard day mode reduces habits to top 2

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

## Content Moderation Activity
${(() => {
    const modEvents = data.events.filter(e => e.event === 'moderation');
    if (!modEvents.length) return 'No moderation data yet';
    let blocked = 0, flagged = 0, allowed = 0;
    modEvents.forEach(e => { try { const m = JSON.parse(e.meta); if (!m.ok) blocked++; else if (m.flag) flagged++; else allowed++; } catch {} });
    const flaggedDetails = modEvents.filter(e => { try { return JSON.parse(e.meta).flag; } catch { return false; } }).slice(-5);
    return `Allowed: ${allowed}, Flagged (self-harm, crisis resources shown): ${flagged}, Blocked (harmful): ${blocked}\nRecent flagged:\n${flaggedDetails.map(e => `  ${new Date(e.ts).toISOString().slice(0,16)} — ${JSON.parse(e.meta).source}`).join('\n') || '  None'}`;
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

Focus on: AI response quality/satisfaction trends, crisis resource accessibility, content safety signals, moderation effectiveness, clinical feature engagement, any patterns suggesting users may not be getting adequate support. Be compassionate but thorough.`;
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

Architecture:
- Single-page app (index.html, ~13K lines)
- Vercel serverless API: claude.js (Anthropic proxy), buddy.js (Redis), wall.js (Redis), diagnostics.js (Redis)
- localStorage primary + IndexedDB backup
- CORS locked to bloomhabits.app + localhost:3000
- CSP headers configured in vercel.json
- No user accounts/auth — data stays local unless using community features
- Content moderation on buddy.js and wall.js

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

## Content Moderation
${(() => {
    const modEvents = data.events.filter(e => e.event === 'moderation');
    if (!modEvents.length) return 'No moderation data yet';
    let blocked = 0, flagged = 0, allowed = 0;
    modEvents.forEach(e => { try { const m = JSON.parse(e.meta); if (!m.ok) blocked++; else if (m.flag) flagged++; else allowed++; } catch {} });
    return `Allowed: ${allowed}, Flagged (crisis resources shown): ${flagged}, Blocked: ${blocked}`;
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

Focus on: error rate trends, recurring error patterns, potential security concerns, API health, data integrity signals, performance indicators, any anomalous patterns. Be specific and actionable.`;
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
      system: `You are an admin audit agent for Bloom, a mental health self-care PWA. Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`,
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
  const allowedOrigins = ['https://bloomhabits.app', 'http://localhost:3000'];
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
