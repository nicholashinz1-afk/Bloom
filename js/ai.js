import { sendTelemetry, trackFeature, trackAIJourney, timedFetch } from './telemetry.js';
import { getDayIndex } from './state.js';
import { save, load } from './storage.js';
import { escapeHtml } from './utils.js';
const SCRIPTED_LOW_MOOD_RESPONSES = [
  "What you're feeling right now is real, and it matters. You don't have to push through anything — just being here is enough.",
  "Hard moments don't last forever, even when they feel endless. You showed up today, and that counts for something.",
  "There's no right way to feel right now. Whatever is heavy, you don't have to carry it alone — the 🤍 is there whenever you need it.",
  "Some days are just hard. That's not a failure — it's being human. You're allowed to take this one moment at a time.",
  "You don't owe anyone productivity or positivity right now. Just existing through a hard time takes more strength than most people realize.",
  "Rough days don't erase good ones, and good ones will come again. Right now, it's okay to just be where you are.",
  "The fact that you're here, checking in with yourself — that's a quiet act of courage. Be gentle with yourself today.",
  "You're carrying something heavy right now. You don't have to figure it all out today. Just this moment is enough.",
];

function getScriptedResponse() {
  const name = state.prefs?.name;
  const response = SCRIPTED_LOW_MOOD_RESPONSES[Math.floor(Math.random() * SCRIPTED_LOW_MOOD_RESPONSES.length)];
  return response;
}

const AI_FALLBACK_RESPONSE = "You showed up today, and that matters. Whatever you're carrying, you don't have to carry it alone.";

async function callClaude(prompt, systemPrompt) {
  // Track AI reflection usage for journey analysis
  const aiSource = prompt.includes('journal') ? 'journal' : prompt.includes('reflection') ? 'reflection' : prompt.includes('hard day') ? 'hard_day' : prompt.includes('weekly') || prompt.includes('week') ? 'weekly_insight' : prompt.includes('monthly') || prompt.includes('month') ? 'monthly_reflection' : 'other';
  trackAIJourney(aiSource, aiSource);
  trackFeature('ai_reflection');
  try {
    const name = state.prefs?.name;
    const nameContext = name ? ` The user's name is ${name} — use it occasionally but naturally, not in every sentence.` : '';
    const res = await timedFetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: (systemPrompt || 'You are Bloom, a warm and compassionate mental wellness companion. Keep responses brief, warm, and human. Never clinical. 1-4 sentences maximum.') + ' Never use first-person language like "I am here for you" or "I care about you" — you are a tool, not a person. Frame support as observations and affirmations, not as a relationship.' + nameContext,
        message: prompt,
      })
    });
    const data = await res.json();
    return filterAIResponse(data.text || AI_FALLBACK_RESPONSE);
  } catch(e) {
    return AI_FALLBACK_RESPONSE;
  }
}

// Safety filter for AI-generated text — catches clinical/diagnostic/medication language
function filterAIResponse(text) {
  const unsafePatterns = [
    /\b(diagnos(e[ds]?|ing|is)|disorder|syndrome|patholog)\b/i,
    /\b(prescri(be|ption)|medica(te|tion)|dosage|mg|milligram|SSRI|SNRI|benzodiazepine|antidepressant|antipsychotic|anxiolytic)\b/i,
    /\b(bipolar|schizophren|borderline personality|BPD|PTSD|OCD|ADHD|clinical depression|major depressive|generalized anxiety|panic disorder|eating disorder|anorexia|bulimia)\b/i,
    /\b(you (have|suffer from|are experiencing|may have|might have|seem to have|could have))\b.*\b(depression|anxiety|disorder|condition)\b/i,
    /\b(seek (immediate|emergency)|call 911|go to (the )?ER|emergency room)\b/i,
    /\b(therapist recommends|clinical(ly)?|psychiatric|psychologist says)\b/i,
  ];
  for (const pat of unsafePatterns) {
    if (pat.test(text)) return AI_FALLBACK_RESPONSE;
  }
  return text;
}

// Render AI response with disclaimer and feedback buttons
function renderAIResponseHTML(text, context) {
  const ctx = context || 'reflection';
  return `<div class="ai-response">
    <div class="ai-response-text">${escapeHtml(text)}</div>
    <div class="ai-disclaimer">This is a reflection, not professional advice. Tap 🤍 anytime for crisis support.</div>
    <div class="ai-feedback" id="ai-fb-${ctx}">
      <span style="font-size:11px;color:var(--text-muted)">Did this feel helpful?</span>
      <button class="ai-feedback-btn" onclick="aiResponseFeedback('${ctx}','yes',this)">Yes</button>
      <button class="ai-feedback-btn" onclick="aiResponseFeedback('${ctx}','no',this)">Not really</button>
    </div>
  </div>`;
}

function aiResponseFeedback(context, value, btn) {
  const container = document.getElementById('ai-fb-' + context);
  if (!container) return;
  // Log locally
  const log = load('bloom_ai_feedback', []);
  log.push({ context, value, date: today(), ts: Date.now() });
  if (log.length > 100) log.splice(0, log.length - 100);
  save('bloom_ai_feedback', log);
  // Send to server for aggregated monitoring
  sendTelemetry('ai_feedback', { context, value });
  container.innerHTML = '<div class="ai-feedback-thanks">Thanks for the feedback.</div>';
}

function showThinking(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
  el.style.display = 'block';
}

function showAIResponse(containerId, text) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!text) {
    el.style.display = 'none';
    return;
  }
  el.innerHTML = renderAIResponseHTML(text, containerId);
  el.style.display = 'block';
}

// ============================================================
//  TABS

window.aiResponseFeedback = aiResponseFeedback;

export { SCRIPTED_LOW_MOOD_RESPONSES, getScriptedResponse, AI_FALLBACK_RESPONSE,
  callClaude, filterAIResponse, renderAIResponseHTML, aiResponseFeedback,
  showThinking, showAIResponse };
