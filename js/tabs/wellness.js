// Bloom wellness tab — journal, breathing, grounding, body scan, reframing, wins, affirmations
import { state, today, getDayIndex, dayOfWeek, getWeekDates, weekStart, formatDateLabel, getJournalPrompt, getJournalEntries, getLatestJournalText, saveState } from '../state.js';
import { save, load } from '../storage.js';
import { haptic, escapeHtml, playSound } from '../utils.js';
import { celebrate } from '../celebrate.js';
import { REFLECTION_QUESTIONS } from '../constants.js';
import { callClaude, renderAIResponseHTML, showThinking } from '../ai.js';
import { sendTelemetry, trackFeature, timedFetch } from '../telemetry.js';
import { bloomIcon } from '../icons.js';
import { addXP } from '../xp.js';
import { infoIcon, openSheet, closeAllSheets } from '../sheets.js';

// Late-bound cross-module references (avoid circular imports)
function archiveToday(...args) { return window.archiveToday?.(...args); }
function checkFirstTaskStreak(...args) { return window.checkFirstTaskStreak?.(...args); }
function checkMilestones(...args) { return window.checkMilestones?.(...args); }

function renderWellnessTab() {
  const scroll = document.getElementById('wellness-scroll');
  if (!scroll) return;
  const t = today();
  const dow = dayOfWeek(); // 0=Sun, 1=Mon
  const ws = weekStart();

  let html = '';

  // ── DAILY ──────────────────────────────────────────────────
  html += `<div style="font-family:Fraunces,serif;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.12em;padding:4px 4px 10px;display:flex;align-items:center;gap:8px"><span>Today</span><div style="flex:1;height:1px;background:rgba(255,255,255,0.06)"></div></div>`;

  // --- JOURNAL ---
  const journalEntries = getJournalEntries(t);
  const journalPrompt = getJournalPrompt();
  const totalJournalDays = Object.keys(state.wellnessData?.journal || {}).filter(d => getJournalEntries(d).length > 0).length;

  html += `<div class="card" id="journal-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div class="card-title" style="margin-bottom:0">📓 Daily journal${infoIcon('journal')}</div>
      ${totalJournalDays > 0 ? `<div style="font-size:11px;color:var(--text-muted)">${totalJournalDays} day${totalJournalDays !== 1 ? 's' : ''} journaled</div>` : ''}
    </div>
    ${state.journalMode === 'free' ? '' : `<div class="journal-prompt">${journalPrompt}</div>`}`;

  // Show editing textarea
  if (state.editingJournal) {
    const editText = state.editingJournalIndex !== null && state.editingJournalIndex !== undefined
      ? (journalEntries[state.editingJournalIndex]?.text || '')
      : (state.journalDraft || '');
    const placeholder = state.journalMode === 'free' ? 'No prompt, no pressure. Just write...' : 'What\'s on your mind today...';
    html += `<textarea id="journal-textarea" placeholder="${placeholder}" rows="5" style="margin-bottom:10px">${editText}</textarea>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn btn-primary" style="flex:1" onclick="saveJournal()">${state.editingJournalIndex !== null && state.editingJournalIndex !== undefined ? 'Update entry' : 'Save & reflect'}</button>
      <button class="btn btn-ghost" onclick="cancelEditJournal()">Cancel</button>
    </div>
    <div style="font-size:12px;color:var(--sky);margin-top:10px;display:flex;align-items:center;gap:5px"><span>✦</span> bloom will respond to what you write</div>`;
  } else if (journalEntries.length > 0) {
    // Show saved entries
    const sourceLabels = { open: 'open journal', winddown: 'evening', journal: '' };
    journalEntries.forEach((entry, i) => {
      const time = entry.savedAt ? new Date(entry.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
      const source = sourceLabels[entry.source] || '';
      const meta = [time, source].filter(Boolean).join(' · ');
      html += `<div style="padding:10px 0;${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);margin-top:8px' : ''}">
        ${meta ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${meta}</div>` : ''}
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">${entry.text}</div>`;
      if (entry.ai) {
        html += `<div class="ai-response" style="margin-top:10px"><div class="ai-response-text">${entry.ai}</div></div>`;
      } else if (state.loadingJournalAI && i === journalEntries.length - 1) {
        html += `<div class="ai-response" style="margin-top:10px;display:flex;align-items:center;gap:10px">
          <div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
          <div style="font-size:12px;color:var(--sky);font-style:italic">bloom is reading what you wrote...</div>
        </div>`;
      }
      html += `<button class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:11px" onclick="editJournalEntry(${i})">Edit</button>`;
      html += `</div>`;
    });
    // Entry count transparency
    html += `<div style="font-size:11px;color:var(--text-muted);margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">${journalEntries.length} entry${journalEntries.length !== 1 ? 'ies' : ''} today · all entries are saved</div>`;
    html += `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="newJournalEntry('same')">Same prompt again</button>
      <button class="btn btn-ghost btn-sm" onclick="newJournalEntry('prompt')">New prompt</button>
      <button class="btn btn-ghost btn-sm" onclick="newJournalEntry('free')">Just write</button>
    </div>`;
    if (totalJournalDays > 1 || (totalJournalDays === 1 && journalEntries.length === 0)) {
      html += `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">
        <button class="btn btn-ghost btn-sm" onclick="openJournalHistory()" style="font-size:11px;color:var(--text-muted)">📖 View past entries</button>
      </div>`;
    }
  } else {
    // No entries yet — show textarea
    html += `<textarea id="journal-textarea" placeholder="What's on your mind today..." rows="5" style="margin-bottom:10px">${state.journalDraft || ''}</textarea>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn btn-primary" style="flex:1" onclick="saveJournal()">Save & reflect</button>
    </div>
    <div style="font-size:12px;color:var(--sky);margin-top:10px;display:flex;align-items:center;gap:5px"><span>✦</span> bloom will respond to what you write</div>
    <div id="journal-ai-response" style="display:none;margin-top:12px"></div>`;
    if (totalJournalDays > 0) {
      html += `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">
        <button class="btn btn-ghost btn-sm" onclick="openJournalHistory()" style="font-size:11px;color:var(--text-muted)">📖 View past entries</button>
      </div>`;
    }
  }
  html += `</div>`;

  // Journal empty state — warm first-day experience
  if (totalJournalDays === 0 && journalEntries.length === 0) {
    html += `<div style="text-align:center;padding:8px 16px 4px">
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:13px;color:var(--text-muted);line-height:1.7">Your journal is here whenever you need it. No rules — just a space to be honest with yourself.</div>
    </div>`;
  }

  // --- SMALL WINS ---
  const wins = state.wellnessData?.wins?.[t] || [];
  html += `<div class="card">
    <div class="card-title">🏅 Small wins${infoIcon('wins')}</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <input type="text" id="win-input" placeholder="Something good, however tiny..." style="flex:1">
      <button class="btn btn-primary btn-sm" onclick="addWin()">Log it</button>
    </div>
    <div id="wins-list">
      ${wins.length === 0 ? '<div class="text-sm text-muted">Nothing yet — small things count too.</div>' : ''}
      ${wins.map(w => `<span class="win-chip">⭐ ${w}</span>`).join('')}
    </div>
  </div>`;

  // --- CUSTOM AFFIRMATIONS ---
  const todayAffirmations = state.todayData?.affirmations || [];
  const allAffirmations = state.wellnessData?.affirmations || [];
  html += `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="card-title" style="margin-bottom:0">💌 My affirmations${infoIcon('affirmations')}</div>
      <button onclick="showDailyAffirmation()" style="background:none;border:none;font-size:12px;color:var(--text-muted);cursor:pointer;font-family:Fraunces,serif;font-style:italic;text-decoration:underline;text-underline-offset:3px">I am enough ›</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <input type="text" id="affirm-input" placeholder="Write something kind to yourself...">
      <button class="btn btn-primary btn-sm" onclick="addAffirmation()">Save</button>
    </div>
    ${todayAffirmations.length === 0 ? '<div class="text-sm text-muted">Write an affirmation for today — it\'ll appear randomly as you log habits.</div>' : ''}
    ${todayAffirmations.map(a => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <div style="flex:1;font-size:13px;color:var(--cream);font-family:Fraunces,serif;font-style:italic">"${a}"</div>
    </div>`).join('')}
    ${allAffirmations.length > 0 ? `<div style="margin-top:8px;font-size:11px;color:var(--text-muted)">${allAffirmations.length} saved affirmation${allAffirmations.length === 1 ? '' : 's'} in your pool · <span onclick="toggleAffirmationPool()" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">manage</span></div>` : ''}
    <div id="affirmation-pool" style="display:none;margin-top:8px">
      ${allAffirmations.map((a,i) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div style="flex:1;font-size:12px;color:var(--text-secondary);font-style:italic">"${a}"</div>
        <div onclick="removeAffirmation(${i})" style="color:var(--text-muted);cursor:pointer;font-size:12px">✕</div>
      </div>`).join('')}
    </div>
  </div>`;

  // Just write — open journal anytime
  html += `<div style="margin-top:10px;background:linear-gradient(135deg,rgba(186,156,124,0.12),rgba(186,156,124,0.05));border:1px solid rgba(186,156,124,0.25);border-radius:var(--r-lg);padding:18px 16px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="font-size:18px">📓</span>
      <div style="font-family:Fraunces,serif;font-size:15px;font-weight:400;color:var(--amber-light)">Just write</div>
    </div>
    <div style="font-size:13px;color:rgba(186,156,124,0.7);margin-bottom:14px;font-style:italic">No prompt, no structure — just get it out</div>
    <div style="text-align:center"><button class="btn" style="background:rgba(186,156,124,0.25);border:1px solid rgba(186,156,124,0.4);color:var(--amber-light)" onclick="openOpenJournal()">Open journal</button></div>
  </div>`;

  // --- EVENING WIND-DOWN (only shown from 7pm onward) ---
  if (new Date().getHours() >= 19) {
    html += `<div style="margin-top:10px;background:linear-gradient(135deg,rgba(106,154,176,0.12),rgba(106,154,176,0.05));border:1px solid rgba(106,154,176,0.25);border-radius:var(--r-lg);padding:18px 16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:18px">🌙</span>
        <div style="font-family:Fraunces,serif;font-size:15px;font-weight:400;color:var(--sky-light)">Wind down</div>
      </div>
      <div style="font-size:13px;color:rgba(106,154,176,0.7);margin-bottom:14px;font-style:italic">Evening check-in, journal prompt, and breathing — all in one gentle flow</div>
      <div style="text-align:center"><button class="btn" style="background:rgba(106,154,176,0.25);border:1px solid rgba(106,154,176,0.4);color:var(--sky-light)" onclick="openWindDown()">Start wind-down</button></div>
    </div>`;
  }

  // ── WEEKLY ─────────────────────────────────────────────────
  html += `<div style="font-family:Fraunces,serif;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.12em;padding:16px 4px 10px;display:flex;align-items:center;gap:8px"><span>This week</span><div style="flex:1;height:1px;background:rgba(255,255,255,0.06)"></div></div>`;

  // --- WEEKLY REFLECTION (Sun + Mon only) ---
  if (dow === 6 || dow === 0) {
    const refData = state.wellnessData?.reflections?.[ws] || {};
    html += `<div class="card" id="reflection-card">
      <div class="card-title">🪞 Weekly reflection${infoIcon('reflection')}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:1.5">Available Saturday & Sunday — bloom will respond to each answer.</div>`;
    REFLECTION_QUESTIONS.forEach((q, qi) => {
      const answer = refData[qi];
      html += `<div class="reflection-q">
        <div class="reflection-q-text">${q}</div>`;
      if (answer && !state.editingReflection) {
        html += `<div style="font-size:14px;color:var(--text-secondary);line-height:1.6">${answer.text}</div>`;
        if (answer.ai) {
          html += `<div class="ai-response" style="margin-top:8px"><div class="ai-response-text">${answer.ai}</div></div>`;
        } else if (state.loadingReflectionAI?.[qi]) {
          html += `<div class="ai-response" style="margin-top:8px;display:flex;align-items:center;gap:10px">
            <div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
            <div style="font-size:12px;color:var(--sky);font-style:italic">bloom is reflecting...</div>
          </div>`;
        }
      } else {
        html += `<textarea id="reflect-${qi}" placeholder="Your thoughts..." rows="3" style="margin-bottom:6px">${answer?.text || ''}</textarea>
        <button class="btn btn-ghost btn-sm" onclick="saveReflection(${qi})">Save</button>
        <div id="reflect-ai-${qi}" style="display:none;margin-top:8px"></div>`;
      }
      html += `</div>`;
      if (qi < REFLECTION_QUESTIONS.length - 1) html += '<div class="divider"></div>';
    });
    html += `</div>`;
  } else {
    html += `<div class="card" style="opacity:0.5">
      <div class="card-title">🪞 Weekly reflection${infoIcon('reflection')}</div>
      <div style="font-size:13px;color:var(--text-secondary)">Opens on Saturday and Sunday each week.</div>
    </div>`;
  }

  // --- WEEKLY INSIGHTS ---
  const insights = state.wellnessData?.insights || [];
  const latestInsight = insights[insights.length - 1];
  const ws2 = weekStart();
  const hasThisWeekInsight = latestInsight?.weekKey === ws2;

  html += `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="card-title" style="margin-bottom:0">💫 Weekly insight</div>
      <button class="btn btn-ghost btn-sm" onclick="generateWeeklyInsight(event)">
        ${hasThisWeekInsight ? 'Refresh' : 'Generate'}
      </button>
    </div>
    ${hasThisWeekInsight
      ? `<div class="insight-card" style="margin-bottom:0">
          <div class="insight-week-label">Week of ${latestInsight.weekLabel}</div>
          <div class="insight-text">${latestInsight.text}</div>
          <div class="ai-disclaimer">This is a reflection, not professional advice.</div>
        </div>`
      : `<div style="font-size:13px;color:var(--text-muted);line-height:1.6">
          Auto-generates each Sunday — or tap Generate any time. bloom looks at your whole week and reflects it back: how you felt, what you did for yourself, and what it all adds up to.
        </div>`
    }
    ${insights.length > 1 ? `
    <details style="margin-top:10px">
      <summary style="font-size:12px;color:var(--text-muted);cursor:pointer;list-style:none;padding:4px 0">Past insights ›</summary>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
        ${insights.slice(-4, -1).reverse().map(ins => `
          <div class="insight-card">
            <div class="insight-week-label">${ins.weekLabel}</div>
            <div class="insight-text">${ins.text}</div>
          </div>`).join('')}
      </div>
    </details>` : ''}
  </div>`;

  // --- MONTHLY REFLECTIONS ---
  const monthlyReflections = state.wellnessData?.monthlyReflections || [];
  if (monthlyReflections.length > 0) {
    html += `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="card-title" style="margin-bottom:0">🗓 Monthly reflections</div>
      </div>`;
    monthlyReflections.slice(-3).reverse().forEach(r => {
      html += `<div class="insight-card" style="margin-bottom:10px">
        <div class="insight-week-label">${r.month}</div>
        <div class="insight-text">${r.text}</div>
        <div class="ai-disclaimer">This is a reflection, not professional advice.</div>
      </div>`;
    });
    html += `</div>`;
  }
  // --- SKILL-BUILDING MODULES ---
  html += `<div style="margin-top:16px">
    <div style="font-family:Fraunces,serif;font-size:16px;font-weight:400;color:var(--cream);margin-bottom:12px;padding:0 2px">Skill-building tools</div>

    <!-- Take a Breath -->
    <div id="breath-section" style="margin-bottom:10px">
      <div style="background:linear-gradient(135deg,rgba(106,154,176,0.12),rgba(106,154,176,0.05));border:1px solid rgba(106,154,176,0.25);border-radius:var(--r-lg);padding:18px 16px" id="breath-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:18px">🌬</span>
          <div style="font-family:Fraunces,serif;font-size:15px;font-weight:400;color:var(--sky-light)">Take a breath${infoIcon('breathing')}</div>
          <div style="margin-left:auto;font-size:11px;color:var(--sky);background:rgba(106,154,176,0.15);padding:2px 8px;border-radius:99px">4-7-8</div>
        </div>
        <div style="font-size:13px;color:rgba(158,196,216,0.7);margin-bottom:14px;font-style:italic">Here whenever you need it — no streak, no pressure</div>
        <div id="breath-ui" style="text-align:center">
          <button class="btn" style="background:rgba(106,154,176,0.25);border:1px solid rgba(106,154,176,0.4);color:var(--sky-light)" onclick="startBreathing()">Begin breathing exercise</button>
        </div>
      </div>
    </div>

    <!-- 5-4-3-2-1 Grounding -->
    <div style="background:linear-gradient(135deg,rgba(var(--sage-rgb),0.12),rgba(var(--sage-rgb),0.05));border:1px solid rgba(var(--sage-rgb),0.25);border-radius:var(--r-lg);padding:18px 16px;margin-bottom:10px" id="grounding-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:18px">🌿</span>
        <div style="font-family:Fraunces,serif;font-size:15px;font-weight:400;color:var(--sage-light)">5-4-3-2-1 Grounding${infoIcon('grounding')}</div>
        <div style="margin-left:auto;font-size:11px;color:var(--sage);background:rgba(var(--sage-rgb),0.15);padding:2px 8px;border-radius:99px">senses</div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;font-style:italic">Gently bring yourself back to the present moment</div>
      <div id="grounding-ui" style="text-align:center">
        <button class="btn" style="background:rgba(var(--sage-rgb),0.25);border:1px solid rgba(var(--sage-rgb),0.4);color:var(--sage-light)" onclick="startGrounding()">Begin grounding exercise</button>
      </div>
    </div>

    <!-- Body Scan -->
    <div style="background:linear-gradient(135deg,rgba(176,120,120,0.12),rgba(176,120,120,0.05));border:1px solid rgba(176,120,120,0.25);border-radius:var(--r-lg);padding:18px 16px;margin-bottom:10px" id="bodyscan-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:18px">🫧</span>
        <div style="font-family:Fraunces,serif;font-size:15px;font-weight:400;color:var(--rose-light)">Body scan${infoIcon('bodyscan')}</div>
        <div style="margin-left:auto;font-size:11px;color:var(--rose);background:rgba(176,120,120,0.15);padding:2px 8px;border-radius:99px">~3 min</div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;font-style:italic">Notice where you're holding tension — no need to fix it</div>
      <div id="bodyscan-ui" style="text-align:center">
        <button class="btn" style="background:rgba(176,120,120,0.25);border:1px solid rgba(176,120,120,0.4);color:var(--rose-light)" onclick="startBodyScan()">Begin body scan</button>
      </div>
    </div>

    <!-- Cognitive Reframing -->
    <div style="background:linear-gradient(135deg,rgba(201,149,74,0.12),rgba(201,149,74,0.05));border:1px solid rgba(201,149,74,0.25);border-radius:var(--r-lg);padding:18px 16px;margin-bottom:10px" id="reframe-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:18px">💡</span>
        <div style="font-family:Fraunces,serif;font-size:15px;font-weight:400;color:var(--amber-light)">Gentle reframe${infoIcon('reframe')}</div>
        <div style="margin-left:auto;font-size:11px;color:var(--amber);background:rgba(201,149,74,0.15);padding:2px 8px;border-radius:99px">thought tool</div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;font-style:italic">A kinder way to look at a difficult thought</div>
      <div id="reframe-ui" style="text-align:center">
        <button class="btn" style="background:rgba(201,149,74,0.25);border:1px solid rgba(201,149,74,0.4);color:var(--amber-light)" onclick="startReframe()">Try a gentle reframe</button>
        ${(state.wellnessData.reframeHistory?.length > 0) ? `<div style="margin-top:10px"><button class="btn btn-ghost btn-sm" onclick="openReframeHistory()" style="font-size:11px;color:var(--text-muted)">View past reframes (${state.wellnessData.reframeHistory.length})</button></div>` : ''}
      </div>
    </div>
  </div>`;

  scroll.innerHTML = html;
}

function scrollToBreath() {
  const el = document.getElementById('breath-section');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

async function saveJournal() {
  const ta = document.getElementById('journal-textarea');
  if (!ta || !ta.value.trim()) return;
  const text = ta.value.trim();
  const t = today();

  if (!state.wellnessData.journal) state.wellnessData.journal = {};
  if (!Array.isArray(state.wellnessData.journal[t])) state.wellnessData.journal[t] = [];

  let entryIndex;
  if (state.editingJournalIndex !== null && state.editingJournalIndex !== undefined) {
    // Editing existing entry
    state.wellnessData.journal[t][state.editingJournalIndex].text = text;
    state.wellnessData.journal[t][state.editingJournalIndex].ai = null;
    entryIndex = state.editingJournalIndex;
  } else {
    // New entry
    const prompt = getJournalPrompt();
    state.wellnessData.journal[t].push({ text, ai: null, savedAt: new Date().toISOString(), prompt, source: 'journal' });
    entryIndex = state.wellnessData.journal[t].length - 1;
  }

  state.editingJournal = false;
  state.editingJournalIndex = null;
  state.journalDraft = '';
  state.loadingJournalAI = true;
  trackFeature('journal');
  saveState();
  checkFirstTaskStreak();
  renderWellnessTab();

  if (!state.todayData.journalXPGiven) {
    state.todayData.journalXPGiven = true;
    addXP(10, null);
    celebrate('journal', document.getElementById('journal-card'));
    archiveToday();
    checkMilestones();
  }

  const ai = await callClaude(
    `The user wrote in their journal: "${text}". Write a warm, brief (2-3 sentence) response that acknowledges what they shared without offering unsolicited advice. Be human and compassionate.`,
    'You are Bloom, a gentle wellness companion. Never clinical. Warm, brief, human. 2-3 sentences max. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, you must gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.'
  );

  state.loadingJournalAI = false;
  if (ai && state.wellnessData.journal[t][entryIndex]) {
    state.wellnessData.journal[t][entryIndex].ai = ai;
    saveState();
    archiveToday();
  }
  renderWellnessTab();
}

function editJournal() {
  state.editingJournal = true;
  state.editingJournalIndex = null;
  state.journalMode = 'prompt';
  renderWellnessTab();
  setTimeout(() => {
    const ta = document.getElementById('journal-textarea');
    if (ta) ta.focus();
  }, 100);
}

function editJournalEntry(index) {
  state.editingJournal = true;
  state.editingJournalIndex = index;
  state.journalMode = 'prompt';
  renderWellnessTab();
  setTimeout(() => {
    const ta = document.getElementById('journal-textarea');
    if (ta) ta.focus();
  }, 100);
}

function newJournalEntry(mode) {
  state.editingJournal = true;
  state.editingJournalIndex = null;
  state.journalDraft = '';
  if (mode === 'prompt') {
    // Cycle to a different prompt than the current one
    if (!state.journalPromptOffset) state.journalPromptOffset = 0;
    state.journalPromptOffset++;
    state.journalMode = 'prompt';
  } else if (mode === 'same') {
    // Keep the same prompt
    state.journalMode = 'prompt';
  } else {
    state.journalMode = 'free';
  }
  renderWellnessTab();
  setTimeout(() => {
    const ta = document.getElementById('journal-textarea');
    if (ta) ta.focus();
  }, 100);
}

function cancelEditJournal() {
  state.editingJournal = false;
  state.editingJournalIndex = null;
  state.journalMode = 'prompt';
  renderWellnessTab();
}

async function saveReflection(qi) {
  const ta = document.getElementById(`reflect-${qi}`);
  if (!ta || !ta.value.trim()) return;
  const text = ta.value.trim();
  const ws = weekStart();

  if (!state.wellnessData.reflections) state.wellnessData.reflections = {};
  if (!state.wellnessData.reflections[ws]) state.wellnessData.reflections[ws] = {};
  state.wellnessData.reflections[ws][qi] = { text, ai: null };
  if (!state.loadingReflectionAI) state.loadingReflectionAI = {};
  state.loadingReflectionAI[qi] = true;
  saveState();
  celebrate('reflection', document.getElementById('reflection-card'));
  renderWellnessTab();

  if (!state.todayData.reflectionXPGiven) {
    state.todayData.reflectionXPGiven = true;
    addXP(15, null);
  }

  const q = REFLECTION_QUESTIONS[qi];
  const ai = await callClaude(
    `The reflection question was: "${q}". The user answered: "${text}". Write a thoughtful 1-2 sentence response that acknowledges their reflection with warmth.`,
    'You are Bloom. 1-2 sentences. Warm, not clinical. If the user expresses distress, self-harm, or crisis, gently point them to the 🤍 crisis heart for immediate support.'
  );

  state.loadingReflectionAI[qi] = false;
  if (ai) {
    state.wellnessData.reflections[ws][qi].ai = ai;
    saveState();
  }
  renderWellnessTab();
}

async function generateWeeklyInsight(e) {
  const btn = e?.target;
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  const ws = weekStart();
  const weekDates = getWeekDates();

  // Mood data
  const moodData = weekDates.map(d => state.historyData[d]?.mood).filter(m => m !== undefined && m >= 0);
  const avgMood = moodData.length > 0 ? (moodData.reduce((a,b) => a+b, 0) / moodData.length).toFixed(1) : null;
  const lowDays = moodData.filter(m => m <= 1).length;
  const goodDays = moodData.filter(m => m >= 3).length;

  // Self-care data
  const wd = state.weekData || {};
  const exerciseCount = wd.w_exercise || 0;
  const showerCount = wd.w_shower || 0;
  const outsideCount = wd.w_outside || 0;
  const therapyCount = wd.w_therapy || 0;
  const journalDays = weekDates.filter(d => getJournalEntries(d).length > 0).length;
  const waterDays = weekDates.filter(d => (state.historyData[d]?.habits?.waterXPGiven)).length;
  const breathSessions = state.wellnessData?.breathSessions || 0;

  // Journal excerpts
  const journals = weekDates.map(d => getLatestJournalText(d)).filter(Boolean);

  // Small wins this week
  const weekWins = weekDates.flatMap(d => state.wellnessData?.wins?.[d] || []);

  const selfCareContext = [
    exerciseCount > 0 ? `exercised ${exerciseCount} time${exerciseCount > 1 ? 's' : ''}` : null,
    showerCount > 0 ? `showered ${showerCount} time${showerCount > 1 ? 's' : ''}` : null,
    outsideCount > 0 ? `went outside ${outsideCount} time${outsideCount > 1 ? 's' : ''}` : null,
    therapyCount > 0 ? `went to therapy ${therapyCount} time${therapyCount > 1 ? 's' : ''}` : null,
    journalDays > 0 ? `journaled ${journalDays} day${journalDays > 1 ? 's' : ''}` : null,
    breathSessions > 0 ? `did ${breathSessions} breathing session${breathSessions > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  trackFeature('weekly_insight');
  const ai = await callClaude(
    `Write a weekly insight for a mental wellness app user. This week: ${avgMood ? `average mood ${avgMood}/4` : 'mood not tracked'}${lowDays > 0 ? `, ${lowDays} hard day${lowDays > 1 ? 's' : ''}` : ''}${goodDays > 0 ? `, ${goodDays} good day${goodDays > 1 ? 's' : ''}` : ''}. Self-care: ${selfCareContext || 'limited this week'}. Journal excerpts: ${journals.slice(0,2).map(j => j.substring(0,100)).join(' | ') || 'none this week'}. Small wins they logged: ${weekWins.length > 0 ? weekWins.slice(0,5).join(', ') : 'none this week'}.

Write 3-4 sentences from an emotional lens — how they showed up for themselves this week. If they logged small wins, reflect specific ones back to them as evidence of progress. If it was a hard week emotionally but they still did self-care, reflect that back as evidence of resilience. Celebrate specific acts of self-care as emotional wins. Never shame, never clinical. End with something genuinely encouraging about the week ahead.`,
    'You are Bloom. Warm, personal, emotionally perceptive. 3-4 sentences only. If the week data suggests persistent struggle, gently remind them the 🤍 crisis heart is always there and that reaching out to a professional is a sign of strength.'
  );

  const d = new Date();
  const wl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!state.wellnessData.insights) state.wellnessData.insights = [];

  // Replace existing insight for this week or add new
  const existingIdx = state.wellnessData.insights.findIndex(i => i.weekKey === ws);
  const insightEntry = { weekLabel: wl, weekKey: ws, text: ai || 'You showed up for yourself this week. Every single act of care mattered.', date: today() };
  if (existingIdx > -1) state.wellnessData.insights[existingIdx] = insightEntry;
  else state.wellnessData.insights.push(insightEntry);
  if (state.wellnessData.insights.length > 8) state.wellnessData.insights.shift();

  saveState();
  celebrate('insight', document.querySelector('.tab-scroll'));
  renderWellnessTab();
}

async function generateWeeklySummary() {
  // Kept for backwards compatibility — redirects to insight
  generateWeeklyInsight();
}

function addWin() {
  const input = document.getElementById('win-input');
  if (!input || !input.value.trim()) return;
  const t = today();
  if (!state.wellnessData.wins) state.wellnessData.wins = {};
  if (!state.wellnessData.wins[t]) state.wellnessData.wins[t] = [];
  state.wellnessData.wins[t].push(input.value.trim());
  if (!state.todayData.winsXPGiven) {
    state.todayData.winsXPGiven = true;
    addXP(5, null);
  }
  saveState();
  checkFirstTaskStreak();
  celebrate('win', input);
  renderWellnessTab();
}

function addAffirmation() {
  const input = document.getElementById('affirm-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  if (!state.wellnessData.affirmations) state.wellnessData.affirmations = [];
  state.wellnessData.affirmations.push(text);
  // Track today's affirmations separately so the gateway card is date-aware
  if (!state.todayData.affirmations) state.todayData.affirmations = [];
  state.todayData.affirmations.push(text);
  if (!state.todayData.affirmXPGiven) {
    state.todayData.affirmXPGiven = true;
    addXP(5, null);
  }
  saveState();
  checkFirstTaskStreak();
  celebrate('affirmation', input);
  renderWellnessTab();
}

function removeAffirmation(i) {
  state.wellnessData.affirmations.splice(i, 1);
  saveState();
  renderWellnessTab();
}

function toggleAffirmationPool() {
  const pool = document.getElementById('affirmation-pool');
  if (pool) pool.style.display = pool.style.display === 'none' ? 'block' : 'none';
}

// Breathing exercise
let breathInterval = null;
let breathPhase = 0;
let breathCycle = 0;
const BREATH_PHASES = [
  { name: 'Inhale', duration: 4, class: 'inhale' },
  { name: 'Hold', duration: 7, class: 'hold' },
  { name: 'Exhale', duration: 8, class: 'exhale' },
];

function startBreathing() {
  breathPhase = 0;
  breathCycle = 0;
  runBreathCountdown(3);
  trackFeature('breathing');
}

function runBreathCountdown(n) {
  const ui = document.getElementById('breath-ui');
  if (!ui) return;
  playSound('breath_count');
  ui.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-family:Fraunces,serif;font-size:80px;font-weight:300;color:var(--sky-light);line-height:1;animation:breathCountNum 0.4s cubic-bezier(0.34,1.56,0.64,1)">${n}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:8px;font-style:italic">get ready...</div>
    </div>`;
  if (n > 1) {
    setTimeout(() => runBreathCountdown(n - 1), 900);
  } else {
    setTimeout(() => renderBreathPhase(), 900);
  }
}

function renderBreathPhase() {
  const ui = document.getElementById('breath-ui');
  if (!ui) return;

  if (breathCycle >= 4) {
    if (!state.wellnessData.breathSessions) state.wellnessData.breathSessions = 0;
    state.wellnessData.breathSessions++;
    saveState();
    celebrate('breath', document.getElementById('breath-card'));
    // Post-cycle prompt — invite them to keep going
    ui.innerHTML = `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:40px;margin-bottom:10px">🌿</div>
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:17px;color:var(--sage-light);margin-bottom:6px">Four cycles complete.</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Take a moment. How do you feel?</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-sm" style="background:rgba(106,154,176,0.25);border:1px solid rgba(106,154,176,0.4);color:var(--sky-light)" onclick="continueBreathing()">Keep going</button>
          <button class="btn btn-ghost btn-sm" onclick="stopBreathing()">I'm done</button>
        </div>
      </div>`;
    return;
  }

  const ph = BREATH_PHASES[breathPhase];
  let countdown = ph.duration;

  // Play phase transition sound
  const phaseSounds = ['breath_inhale', 'breath_hold', 'breath_exhale'];
  playSound(phaseSounds[breathPhase] || 'breath_inhale');

  ui.innerHTML = `
    <div class="breath-circle ${ph.class}">
      <span style="font-size:26px;color:var(--sky-light);font-family:Fraunces,serif;font-style:italic" id="breath-count-display">${countdown}</span>
    </div>
    <div class="breath-label" style="color:var(--sky-light)">${ph.name}</div>
    <div class="breath-count" style="margin-bottom:14px">Cycle ${breathCycle + 1} of 4</div>
    <button class="btn btn-ghost btn-sm" onclick="stopBreathing()">Finish early</button>`;

  if (breathInterval) clearInterval(breathInterval);
  breathInterval = setInterval(() => {
    countdown--;
    const display = document.getElementById('breath-count-display');
    if (display) display.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(breathInterval);
      breathPhase++;
      if (breathPhase >= BREATH_PHASES.length) {
        breathPhase = 0;
        breathCycle++;
      }
      setTimeout(() => renderBreathPhase(), 300);
    }
  }, 1000);
}

function stopBreathing() {
  if (breathInterval) clearInterval(breathInterval);
  if (!state.wellnessData.breathSessions) state.wellnessData.breathSessions = 0;
  state.wellnessData.breathSessions++;
  saveState();
  playSound('breath_done');
  const ui = document.getElementById('breath-ui');
  if (ui) ui.innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:36px;margin-bottom:8px">🌿</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:15px;color:var(--sage-light);margin-bottom:16px">Well done. Take a moment.</div>
      <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Done</button>
    </div>`;
}

function continueBreathing() {
  breathCycle = 0;
  breathPhase = 0;
  renderBreathPhase();
}

// ============================================================
//  5-4-3-2-1 GROUNDING EXERCISE
// ============================================================
const GROUNDING_STEPS = [
  { count: 5, sense: 'see',   prompt: 'Look around. Name 5 things you can see.',   emoji: '👁', color: 'var(--sage)' },
  { count: 4, sense: 'touch', prompt: 'Notice 4 things you can physically feel.',   emoji: '🤲', color: 'var(--sky)' },
  { count: 3, sense: 'hear',  prompt: 'Listen. Name 3 things you can hear.',        emoji: '👂', color: 'var(--amber)' },
  { count: 2, sense: 'smell', prompt: 'Notice 2 things you can smell.',             emoji: '🌸', color: 'var(--rose)' },
  { count: 1, sense: 'taste', prompt: 'Name 1 thing you can taste right now.',      emoji: '👅', color: 'var(--seasonal)' },
];
let groundingStep = 0;

function startGrounding() {
  groundingStep = 0;
  trackFeature('grounding');
  renderGroundingStep();
}

function renderGroundingStep() {
  const ui = document.getElementById('grounding-ui');
  if (!ui) return;
  if (groundingStep >= GROUNDING_STEPS.length) {
    if (!state.wellnessData.groundingSessions) state.wellnessData.groundingSessions = 0;
    state.wellnessData.groundingSessions++;
    saveState();
    ui.innerHTML = `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:36px;margin-bottom:8px">🌿</div>
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:15px;color:var(--sage-light);margin-bottom:6px">You're here. You're grounded.</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Take a moment before moving on.</div>
        <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Done</button>
      </div>`;
    return;
  }
  const s = GROUNDING_STEPS[groundingStep];
  ui.innerHTML = `
    <div style="text-align:center;padding:12px 0">
      <div style="font-size:40px;margin-bottom:10px">${s.emoji}</div>
      <div style="font-size:28px;font-weight:600;color:${s.color};margin-bottom:6px">${s.count}</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:15px;color:var(--cream);margin-bottom:4px;line-height:1.5">${s.prompt}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:18px">Step ${groundingStep + 1} of 5</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-ghost btn-sm" onclick="stopGrounding()">End early</button>
        <button class="btn" style="background:rgba(var(--sage-rgb),0.25);border:1px solid rgba(var(--sage-rgb),0.4);color:var(--sage-light)" onclick="groundingStep++;renderGroundingStep()">
          ${groundingStep < 4 ? 'Next' : 'Finish'}
        </button>
      </div>
    </div>`;
}

function stopGrounding() {
  if (!state.wellnessData.groundingSessions) state.wellnessData.groundingSessions = 0;
  state.wellnessData.groundingSessions++;
  saveState();
  const ui = document.getElementById('grounding-ui');
  if (ui) ui.innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:36px;margin-bottom:8px">🌿</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:14px;color:var(--sage-light);margin-bottom:16px">Any amount counts. Well done.</div>
      <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Done</button>
    </div>`;
}

// ============================================================
//  BODY SCAN EXERCISE
// ============================================================
const BODY_SCAN_REGIONS = [
  { name: 'Feet & toes',    prompt: 'Bring your attention to your feet. Notice any warmth, coolness, or pressure.',         emoji: '🦶' },
  { name: 'Legs',           prompt: 'Move up to your legs. Are they heavy? Light? Just notice — no need to change anything.', emoji: '🦵' },
  { name: 'Belly & chest',  prompt: 'Notice your belly and chest. Feel the gentle rise and fall of your breath.',             emoji: '💚' },
  { name: 'Hands & arms',   prompt: 'Bring awareness to your hands and arms. Relax your fingers if they feel tight.',         emoji: '🤲' },
  { name: 'Shoulders & neck', prompt: 'Notice your shoulders and neck. Let them soften if you can.',                          emoji: '🫧' },
  { name: 'Face & head',    prompt: 'Finally, your face and head. Unclench your jaw. Let your brow smooth out.',              emoji: '😌' },
];
let bodyScanStep = 0;
let bodyScanTimer = null;

function startBodyScan() {
  bodyScanStep = 0;
  trackFeature('bodyscan');
  renderBodyScanStep();
}

function renderBodyScanStep() {
  const ui = document.getElementById('bodyscan-ui');
  if (!ui) return;
  if (bodyScanTimer) clearTimeout(bodyScanTimer);
  if (bodyScanStep >= BODY_SCAN_REGIONS.length) {
    if (!state.wellnessData.bodyScanSessions) state.wellnessData.bodyScanSessions = 0;
    state.wellnessData.bodyScanSessions++;
    saveState();
    ui.innerHTML = `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:36px;margin-bottom:8px">🫧</div>
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:15px;color:var(--rose-light);margin-bottom:6px">Scan complete. How does your body feel now?</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">There's no right answer.</div>
        <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Done</button>
      </div>`;
    return;
  }
  const r = BODY_SCAN_REGIONS[bodyScanStep];
  ui.innerHTML = `
    <div style="text-align:center;padding:12px 0">
      <div style="font-size:40px;margin-bottom:10px">${r.emoji}</div>
      <div style="font-size:16px;font-weight:500;color:var(--rose-light);margin-bottom:8px">${r.name}</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:14px;color:var(--cream);margin-bottom:4px;line-height:1.6;max-width:300px;margin-left:auto;margin-right:auto">${r.prompt}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Region ${bodyScanStep + 1} of 6</div>
      <div style="width:40px;height:40px;margin:8px auto 14px;border-radius:50%;border:2px solid rgba(176,120,120,0.4);display:flex;align-items:center;justify-content:center">
        <div id="bodyscan-countdown" style="font-size:16px;color:var(--rose-light);font-family:Fraunces,serif">20</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-ghost btn-sm" onclick="stopBodyScan()">End early</button>
        <button class="btn" style="background:rgba(176,120,120,0.25);border:1px solid rgba(176,120,120,0.4);color:var(--rose-light)" onclick="bodyScanStep++;renderBodyScanStep()">
          ${bodyScanStep < 5 ? 'Next region' : 'Finish'}
        </button>
      </div>
    </div>`;
  // Auto-advance countdown
  let countdown = 20;
  const countEl = () => document.getElementById('bodyscan-countdown');
  bodyScanTimer = setInterval(() => {
    countdown--;
    const el = countEl();
    if (el) el.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(bodyScanTimer);
      bodyScanStep++;
      renderBodyScanStep();
    }
  }, 1000);
}

function stopBodyScan() {
  if (bodyScanTimer) clearInterval(bodyScanTimer);
  if (!state.wellnessData.bodyScanSessions) state.wellnessData.bodyScanSessions = 0;
  state.wellnessData.bodyScanSessions++;
  saveState();
  const ui = document.getElementById('bodyscan-ui');
  if (ui) ui.innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:36px;margin-bottom:8px">🫧</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:14px;color:var(--rose-light);margin-bottom:16px">Every bit of awareness matters.</div>
      <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Done</button>
    </div>`;
}

// ============================================================
//  COGNITIVE REFRAMING (GENTLE REFRAME)
// ============================================================
function startReframe() {
  trackFeature('reframe');
  const ui = document.getElementById('reframe-ui');
  if (!ui) return;
  ui.innerHTML = `
    <div style="text-align:left;padding:4px 0">
      <div style="font-family:Fraunces,serif;font-size:14px;color:var(--amber-light);margin-bottom:12px">What thought is weighing on you?</div>
      <textarea id="reframe-input" placeholder="e.g. I'm not doing enough..." rows="2" maxlength="300" style="width:100%;resize:none;margin-bottom:12px;font-size:13px"></textarea>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Cancel</button>
        <button class="btn" style="background:rgba(201,149,74,0.25);border:1px solid rgba(201,149,74,0.4);color:var(--amber-light)" onclick="processReframe()">Reframe this</button>
      </div>
    </div>`;
  setTimeout(() => { const i = document.getElementById('reframe-input'); if (i) i.focus(); }, 100);
}

function processReframe() {
  const input = document.getElementById('reframe-input');
  if (!input || !input.value.trim()) return;
  const thought = input.value.trim();
  const ui = document.getElementById('reframe-ui');
  if (!ui) return;

  // Show loading
  ui.innerHTML = `
    <div style="text-align:center;padding:12px 0">
      <div class="ai-thinking" style="justify-content:center;margin:12px 0"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
      <div style="font-size:13px;color:var(--text-muted)">Finding a gentler perspective...</div>
    </div>`;

  // Use the Claude API for a warm reframe
  timedFetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: `You are a warm, compassionate inner voice — not a therapist, not clinical. Someone shared this thought that's weighing on them: "${thought}"

Give a gentle cognitive reframe in 2-3 sentences. Validate their feeling first, then offer a kinder perspective. Use "you" language, be warm and human. No bullet points, no labels, no jargon. Just a soft, honest reframe like a kind friend would offer.`
      }],
      max_tokens: 200,
    }),
  })
  .then(r => r.json())
  .then(data => {
    const reframe = data.content || data.text || (data.choices && data.choices[0]?.message?.content) || '';
    if (!reframe) throw new Error('No response');

    if (!state.wellnessData.reframeSessions) state.wellnessData.reframeSessions = 0;
    state.wellnessData.reframeSessions++;
    // Save to reframe history
    if (!state.wellnessData.reframeHistory) state.wellnessData.reframeHistory = [];
    state.wellnessData.reframeHistory.push({ thought, reframe, savedAt: new Date().toISOString() });
    if (state.wellnessData.reframeHistory.length > 50) state.wellnessData.reframeHistory = state.wellnessData.reframeHistory.slice(-50);
    saveState();

    ui.innerHTML = `
      <div style="padding:4px 0">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Your thought:</div>
        <div style="font-size:13px;color:var(--text-secondary);font-style:italic;margin-bottom:14px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:var(--r-md)">"${escapeHtml(thought)}"</div>
        <div style="font-size:12px;color:var(--amber);margin-bottom:8px">A gentler way to see it:</div>
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:14px;color:var(--cream);line-height:1.7;padding:10px 14px;background:rgba(201,149,74,0.08);border-radius:var(--r-md);border:1px solid rgba(201,149,74,0.15)">${escapeHtml(reframe)}</div>
        <div class="ai-disclaimer" style="margin-top:10px">This is a reflection tool, not professional advice.</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:14px">
          <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Done</button>
          <button class="btn" style="background:rgba(201,149,74,0.25);border:1px solid rgba(201,149,74,0.4);color:var(--amber-light)" onclick="startReframe()">Try another</button>
        </div>
      </div>`;
  })
  .catch(() => {
    ui.innerHTML = `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">Couldn't connect right now. Here's a thought to hold:</div>
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:14px;color:var(--cream);line-height:1.7;margin-bottom:16px">"The fact that you noticed this thought means you're already being kinder to yourself than you think."</div>
        <button class="btn btn-ghost btn-sm" onclick="renderWellnessTab()">Done</button>
      </div>`;
  });
}


function openReframeHistory() {
  const history = state.wellnessData.reframeHistory || [];
  if (history.length === 0) return;

  let html = `<div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream);margin-bottom:4px">Past Reframes</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${history.length} reframe${history.length !== 1 ? 's' : ''} saved</div>`;

  history.slice().reverse().forEach(item => {
    const date = item.savedAt ? new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    html += `<div style="background:rgba(201,149,74,0.06);border:1px solid rgba(201,149,74,0.12);border-radius:var(--r-md);padding:14px;margin-bottom:10px">
      ${date ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${date}</div>` : ''}
      <div style="font-size:13px;color:var(--text-secondary);font-style:italic;margin-bottom:10px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:var(--r-md)">"${escapeHtml(item.thought)}"</div>
      <div style="font-size:11px;color:var(--amber);margin-bottom:4px">A gentler way to see it:</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:13px;color:var(--cream);line-height:1.7">${escapeHtml(item.reframe)}</div>
    </div>`;
  });

  document.getElementById('reframe-history-content').innerHTML = html;
  openSheet('reframe-history-sheet');
}

function openJournalHistory() {
  const todayStr = today();
  // Collect all dates with journal entries from both wellnessData and historyData
  const journalDates = new Set();
  const wellnessJournal = state.wellnessData?.journal || {};
  Object.keys(wellnessJournal).forEach(d => {
    if (getJournalEntries(d).length > 0) journalDates.add(d);
  });
  Object.keys(state.historyData || {}).forEach(d => {
    const entry = state.historyData[d];
    if (entry.journalEntries?.length > 0 || entry.journal) journalDates.add(d);
  });

  const dates = [...journalDates]
    .filter(d => d !== todayStr)
    .sort((a, b) => b.localeCompare(a));

  let html = `<div style="font-family:Fraunces,serif;font-size:22px;font-weight:300;color:var(--cream);margin-bottom:16px">📖 Journal history</div>`;

  if (dates.length === 0) {
    html += `<div style="text-align:center;padding:24px 0">
      <div style="font-size:13px;color:var(--text-muted);font-style:italic">Your past journal entries will appear here.</div>
    </div>`;
  } else {
    let lastMonth = '';
    dates.forEach(d => {
      const date = new Date(d + 'T00:00:00');
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (monthLabel !== lastMonth) {
        lastMonth = monthLabel;
        html += `<div style="font-size:12px;color:var(--text-muted);margin:12px 0 6px;font-weight:500">${monthLabel}</div>`;
      }

      // Get entries from wellnessData first, fall back to historyData
      let entries = getJournalEntries(d);
      let preview = '';
      let count = entries.length;
      if (count > 0) {
        preview = entries[0].text || '';
      } else {
        const hist = state.historyData[d];
        if (hist?.journalEntries?.length > 0) {
          count = hist.journalEntries.length;
          preview = hist.journalEntries[0].text || '';
        } else if (hist?.journal) {
          count = 1;
          preview = hist.journal;
        }
      }
      if (preview.length > 60) preview = preview.substring(0, 60) + '...';

      const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const hasHistory = !!state.historyData[d];

      html += `<div class="card mb-0" style="padding:10px 14px;margin-bottom:6px;cursor:pointer" onclick="${hasHistory ? `closeAllSheets();setTimeout(()=>openHistoryDetail('${d}'),300)` : ''}">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px;width:30px;text-align:center">📝</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:var(--cream)">${dateLabel}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${count} entry${count !== 1 ? 'ies' : ''}${preview ? ' · ' : ''}<span style="font-style:italic">${preview}</span></div>
          </div>
          ${hasHistory ? '<div style="color:var(--text-muted);font-size:16px">›</div>' : ''}
        </div>
      </div>`;
    });
  }

  document.getElementById('journal-history-content').innerHTML = html;
  openSheet('journal-history-sheet');
}

export { renderWellnessTab, saveJournal, editJournal, editJournalEntry, newJournalEntry, cancelEditJournal,
  startBreathing, stopBreathing, continueBreathing,
  startGrounding, stopGrounding, startBodyScan, stopBodyScan,
  startReframe, processReframe, openReframeHistory, saveReflection,
  generateWeeklyInsight, generateWeeklySummary,
  addWin, addAffirmation, removeAffirmation, toggleAffirmationPool, scrollToBreath,
  openJournalHistory };

window.renderWellnessTab = renderWellnessTab;
window.saveJournal = saveJournal;
window.editJournal = editJournal;
window.editJournalEntry = editJournalEntry;
window.newJournalEntry = newJournalEntry;
window.cancelEditJournal = cancelEditJournal;
window.startBreathing = startBreathing;
window.stopBreathing = stopBreathing;
window.continueBreathing = continueBreathing;
window.startGrounding = startGrounding;
window.renderGroundingStep = renderGroundingStep;
window.stopGrounding = stopGrounding;
window.startBodyScan = startBodyScan;
window.renderBodyScanStep = renderBodyScanStep;
window.stopBodyScan = stopBodyScan;
window.startReframe = startReframe;
window.processReframe = processReframe;
window.openReframeHistory = openReframeHistory;
window.saveReflection = saveReflection;
window.generateWeeklyInsight = generateWeeklyInsight;
window.generateWeeklySummary = generateWeeklySummary;
window.addWin = addWin;
window.addAffirmation = addAffirmation;
window.removeAffirmation = removeAffirmation;
window.toggleAffirmationPool = toggleAffirmationPool;
window.scrollToBreath = scrollToBreath;
window.runBreathCountdown = runBreathCountdown;
window.renderBreathPhase = renderBreathPhase;
window.openJournalHistory = openJournalHistory;
