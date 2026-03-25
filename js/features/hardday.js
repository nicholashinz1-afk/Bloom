import { state, today } from '../state.js';
import { save, load } from '../storage.js';
import { haptic } from '../utils.js';
import { callClaude, renderAIResponseHTML, showThinking } from '../ai.js';
import { sendTelemetry, trackFeature } from '../telemetry.js';

function openOpenJournal() {
  closeAllSheets();
  openSheet('open-journal-sheet');
  setTimeout(() => {
    const btn = document.getElementById('open-journal-save');
    if (btn) btn.addEventListener('click', saveOpenJournal);
    const ta = document.getElementById('open-journal-textarea');
    if (ta) ta.focus();
  }, 400);
}

async function saveOpenJournal() {
  const ta = document.getElementById('open-journal-textarea');
  if (!ta || !ta.value.trim()) return;
  const text = ta.value.trim();
  const t = today();
  trackEvent('journal_saved');

  // Save to journal (appends to any existing entry or creates new)
  if (!state.wellnessData.journal) state.wellnessData.journal = {};
  const existing = state.wellnessData.journal[t];
  if (existing) {
    existing.text = existing.text + '\n\n' + text;
    existing.ai = null;
  } else {
    state.wellnessData.journal[t] = { text, ai: null };
  }
  state.loadingJournalAI = true;
  saveState();
  archiveToday();
  playSound('journal');

  const btn = document.getElementById('open-journal-save');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  const aiEl = document.getElementById('open-journal-ai');
  if (aiEl) {
    aiEl.style.display = 'block';
    aiEl.innerHTML = '<div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
  }

  // Use scripted responses for very low mood (0-1) to avoid generative AI risk
  const currentMood = state.todayData?.mood;
  let ai;
  if (currentMood !== undefined && currentMood >= 0 && currentMood <= 1) {
    ai = getScriptedResponse();
  } else {
    ai = await callClaude(
      `Someone is having a hard day and wrote: "${text}". Respond with just 1-2 sentences of warm, human presence. No advice. No silver linings. Just witness what they said and remind them they're not alone.`,
      'You are Bloom. 1-2 sentences only. Warm presence, no toxic positivity, no advice. IMPORTANT: If the user expresses suicidal thoughts, self-harm, or acute crisis, you must gently encourage them to tap the 🤍 crisis heart for immediate support from real people who care.'
    );
  }

  state.loadingJournalAI = false;
  if (ai) {
    state.wellnessData.journal[t].ai = ai;
    saveState();
    archiveToday();
    if (aiEl) {
      aiEl.innerHTML = renderAIResponseHTML(ai, 'journal-' + t);
    }
  }
  if (btn) { btn.textContent = 'Saved ✓'; btn.disabled = true; }

  if (!state.todayData.journalXPGiven) {
    state.todayData.journalXPGiven = true;
    addXP(10, null);
    saveState();
    checkMilestones();
  }
}

function toggleGentleMode() {
  state.todayData.gentleMode = !state.todayData.gentleMode;
  state._showAllHabitsOnHardDay = false;
  saveState();
  archiveToday();
  renderTodayTab();
}

function activateHardDayMode() {
  state.hardDayMode = true;
  state.todayData.mood = state.todayData.mood ?? 1;
  // Record what actions were completed today (for "what helped last time" recall)
  state.todayData._hardDayActivated = true;
  saveState();
  archiveToday();
  playSound('hard_day');
  trackEvent('hard_day_activated');
  // Dim the UI to feel calmer
  document.body.classList.add('hard-day-active');
  closeAllSheets();
  renderHardDaySheet();
  openSheet('hard-day-sheet');
}

// "What helped last time" — find the most recent hard day that was followed by mood improvement
function getWhatHelpedLastTime() {
  const history = state.historyData || {};
  const dates = Object.keys(history).sort().reverse();
  for (let i = 0; i < dates.length - 1; i++) {
    const dayData = history[dates[i]];
    const nextDay = history[dates[i + 1]]; // earlier date (sorted desc but we want the day after)
    // Look for hard days (mood 0-1 or _hardDayActivated)
    if (dayData && dayData.mood !== undefined && dayData.mood <= 1) {
      // Check if the next calendar day had better mood
      const d1 = new Date(dates[i]); d1.setDate(d1.getDate() + 1);
      const nextDateStr = `${d1.getFullYear()}-${String(d1.getMonth()+1).padStart(2,'0')}-${String(d1.getDate()).padStart(2,'0')}`;
      const afterDay = history[nextDateStr];
      if (afterDay && afterDay.mood !== undefined && afterDay.mood > dayData.mood) {
        // What did they do on the hard day?
        const habits = dayData.habits || {};
        const actions = [];
        if (habits.journal || history[dates[i]]?.journal) actions.push('journaling');
        if (habits.breath_done || habits._breathSessions) actions.push('breathing');
        if (habits.w_exercise) actions.push('movement');
        if (habits.w_outside) actions.push('going outside');
        // Check self-care
        const scDone = Object.keys(habits).filter(k => k.startsWith('sc_') && habits[k]);
        if (scDone.length > 0) actions.push('self-care');
        if (actions.length > 0) {
          return { date: dates[i], actions, moodAfter: afterDay.mood };
        }
      }
    }
  }
  return null;
}

async function renderHardDaySheet() {
  const name = state.prefs?.name ? `, ${state.prefs.name}` : '';
  const sheet = document.getElementById('hard-day-content');
  if (!sheet) return;

  // Check what helped on a previous hard day
  const helped = getWhatHelpedLastTime();
  const helpedHtml = helped
    ? `<div style="background:rgba(var(--sage-rgb),0.08);border:1px solid rgba(var(--sage-rgb),0.15);border-radius:var(--r-md);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--sage-light);line-height:1.6;text-align:left">
        <div style="font-weight:500;color:var(--cream);margin-bottom:4px">Last time, this seemed to help:</div>
        ${helped.actions.map(a => `<span style="display:inline-block;padding:3px 10px;border-radius:99px;background:rgba(var(--sage-rgb),0.15);margin:3px 2px;font-size:12px">${a}</span>`).join('')}
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Your mood went up the next day.</div>
      </div>`
    : '';

  sheet.innerHTML = `
    <div style="text-align:center;padding:8px 0 20px">
      <div style="font-size:48px;margin-bottom:12px">🫂</div>
      <div style="font-family:Fraunces,serif;font-size:22px;font-weight:300;color:var(--cream);margin-bottom:8px">It's okay${name}.</div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:20px">Hard days happen. Today still counts — you showed up. You don't have to do anything you don't want to.</div>
    </div>
    ${helpedHtml}
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      <button class="btn btn-secondary btn-block" onclick="closeAllSheets();switchTab('wellness');setTimeout(()=>scrollToBreath(),300)">🌬 Take a breath</button>
      <button class="btn btn-secondary btn-block" onclick="closeAllSheets();openOpenJournal()">📓 Just write it out</button>
      <button class="btn btn-secondary btn-block" onclick="closeAllSheets();openCrisisSheet()">🤍 I need more support</button>
    </div>
    <div id="hard-day-ai" style="font-size:13px;color:var(--text-muted);font-style:italic;text-align:center;line-height:1.7">take your time...</div>
  `;

  // Use scripted responses for hard day mode — user is at their most vulnerable
  const hardDayResponse = getScriptedResponse();
  const aiEl = document.getElementById('hard-day-ai');
  if (aiEl && hardDayResponse) {
    aiEl.style.color = 'var(--sky-light)';
    aiEl.style.fontStyle = 'italic';
    aiEl.textContent = hardDayResponse;
  }
}

// ── Monthly reflection check ─────────────────────────────────
function checkMonthlyReflection() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMonth = load('bloom_last_monthly', null);

  if (lastMonth === monthKey) return;

  // Only prompt on the 1st or 2nd of the month
  if (now.getDate() > 2) return;

  // Need at least 2 weeks of data
  const historyCount = Object.keys(state.historyData || {}).length;
  if (historyCount < 14) return;

  save('bloom_last_monthly', monthKey);
  setTimeout(() => showMonthlyReflectionPrompt(), 2000);
}

async function showMonthlyReflectionPrompt() {
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const monthName = prevMonth.toLocaleDateString('en-US', { month: 'long' });

  // Get last month's data
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
  const prevDates = Object.keys(state.historyData).filter(d => d.startsWith(prevMonthStr));
  const moods = prevDates.map(d => state.historyData[d]?.mood).filter(m => m !== undefined && m >= 0);
  const avgMood = moods.length ? (moods.reduce((a,b)=>a+b,0)/moods.length).toFixed(1) : 'unknown';
  const journalCount = prevDates.filter(d => state.historyData[d]?.journal).length;

  const ai = await callClaude(
    `Write a warm monthly reflection for a wellness app user. Month: ${monthName}. Average mood: ${avgMood}/4. Journal entries: ${journalCount}. Write 3-4 sentences that feel like a caring friend reflecting on their month — personal, encouraging, honest. Never shame.`,
    'You are Bloom. 3-4 sentences. Warm, personal, never clinical. If mood data suggests a very difficult month, gently acknowledge that and remind them the 🤍 crisis heart is always there if they need support beyond what bloom can offer.'
  );

  // Store it
  if (!state.wellnessData.monthlyReflections) state.wellnessData.monthlyReflections = [];
  state.wellnessData.monthlyReflections.push({
    month: monthName,
    text: ai || `${monthName} is behind you. Whatever it held, you made it through.`,
    date: today(),
  });
  if (state.wellnessData.monthlyReflections.length > 12) state.wellnessData.monthlyReflections.shift();
  saveState();

  // Show in wellness tab
  state.showMonthlyReflectionBadge = true;
  renderWellnessTab();
}

// ── Evening wind-down flow ─────────────────────────────────
let winddownStep = 0;
const WINDDOWN_AFFIRMATIONS = [
  'You did enough today. Rest now.',
  'Tomorrow is a fresh page. Let this one close gently.',
  'Whatever you carried today, you can set it down now.',
  'Sleep is a kindness you deserve.',
  'The day is done. You are done. And that is enough.',
  'You showed up today. That is worth more than you know.',
];

function openWindDown() {
  winddownStep = 0;
  renderWindDownStep();
  openSheet('winddown-sheet');
  trackEvent('winddown_started');
}

function renderWindDownStep() {
  const sheet = document.getElementById('winddown-content');
  if (!sheet) return;

  if (winddownStep === 0) {
    // Step 1: Quick mood check-in
    const moodEmojis = ['😞','😟','😐','🙂','😊'];
    sheet.innerHTML = `
      <div class="winddown-step">
        <div style="font-size:40px;margin-bottom:14px">🌙</div>
        <div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream);margin-bottom:8px">Evening check-in</div>
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:20px">How are you feeling right now?</div>
        <div style="display:flex;justify-content:center;gap:16px;margin-bottom:20px">
          ${moodEmojis.map((e, i) => `<div onclick="winddownSetMood(${i})" style="font-size:32px;cursor:pointer;padding:8px;border-radius:50%;transition:all 0.2s;${state.todayData.mood === i ? 'background:rgba(var(--sage-rgb),0.2);transform:scale(1.2)' : ''}">${e}</div>`).join('')}
        </div>
        <button class="btn btn-primary" onclick="winddownNext()">Next</button>
      </div>`;
  } else if (winddownStep === 1) {
    // Step 2: Journal prompt
    sheet.innerHTML = `
      <div class="winddown-step">
        <div style="font-size:40px;margin-bottom:14px">📓</div>
        <div style="font-family:Fraunces,serif;font-size:18px;font-weight:300;color:var(--cream);margin-bottom:8px">One thought before rest</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:16px;font-style:italic">What's one thing — however small — that went okay today?</div>
        <textarea id="winddown-journal" rows="3" style="width:100%;resize:none;margin-bottom:16px" placeholder="No pressure. Even one word is enough."></textarea>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-ghost btn-sm" onclick="winddownNext()">Skip</button>
          <button class="btn btn-primary" onclick="winddownSaveJournal();winddownNext()">Save & continue</button>
        </div>
      </div>`;
  } else if (winddownStep === 2) {
    // Step 3: Breathing
    sheet.innerHTML = `
      <div class="winddown-step">
        <div style="font-size:40px;margin-bottom:14px">🌬</div>
        <div style="font-family:Fraunces,serif;font-size:18px;font-weight:300;color:var(--cream);margin-bottom:8px">A moment of quiet</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:20px">Three slow breaths. Nothing else to do.</div>
        <div id="winddown-breath-circle" style="width:80px;height:80px;border-radius:50%;background:rgba(106,154,176,0.15);border:2px solid var(--sky);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--sky-light);transition:all 4s ease">breathe</div>
        <button class="btn btn-primary" id="winddown-breath-btn" onclick="startWinddownBreath()">Start</button>
      </div>`;
  } else {
    // Step 4: Goodnight
    const affirmation = WINDDOWN_AFFIRMATIONS[Math.floor(Math.random() * WINDDOWN_AFFIRMATIONS.length)];
    sheet.innerHTML = `
      <div class="winddown-step">
        <div style="font-size:48px;margin-bottom:16px">🌿</div>
        <div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream);margin-bottom:12px;line-height:1.5">${affirmation}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">Goodnight.</div>
        <button class="btn btn-primary" onclick="closeAllSheets()">Close</button>
      </div>`;
    trackEvent('winddown_completed');
  }
}

function winddownSetMood(val) {
  state.todayData.mood = val;
  saveState();
  archiveToday();
  renderWindDownStep();
}

function winddownNext() {
  winddownStep++;
  renderWindDownStep();
}

function winddownSaveJournal() {
  const el = document.getElementById('winddown-journal');
  if (!el || !el.value.trim()) return;
  const t = today();
  if (!state.wellnessData.journal) state.wellnessData.journal = {};
  if (!state.wellnessData.journal[t]) state.wellnessData.journal[t] = {};
  const existing = state.wellnessData.journal[t].text || '';
  state.wellnessData.journal[t].text = existing ? existing + '\n\n(evening) ' + el.value.trim() : el.value.trim();
  saveState();
}

function startWinddownBreath() {
  const circle = document.getElementById('winddown-breath-circle');
  const btn = document.getElementById('winddown-breath-btn');
  if (!circle || !btn) return;
  btn.style.display = 'none';
  let count = 0;
  const phases = ['inhale', 'hold', 'exhale'];

  function breathPhase() {
    if (count >= 9) { // 3 full cycles (in, hold, out)
      winddownNext();
      return;
    }
    const phase = phases[count % 3];
    circle.textContent = phase;
    if (phase === 'inhale') {
      circle.style.transform = 'scale(1.4)';
      circle.style.background = 'rgba(106,154,176,0.25)';
    } else if (phase === 'hold') {
      circle.style.transform = 'scale(1.4)';
      circle.style.background = 'rgba(var(--sage-rgb),0.2)';
    } else {
      circle.style.transform = 'scale(1)';
      circle.style.background = 'rgba(106,154,176,0.1)';
    }
    count++;
    setTimeout(breathPhase, 4000);
  }
  breathPhase();
}

window.openOpenJournal = openOpenJournal;
window.saveOpenJournal = saveOpenJournal;
window.toggleGentleMode = toggleGentleMode;
window.activateHardDayMode = activateHardDayMode;
window.openWindDown = openWindDown;
window.winddownSetMood = winddownSetMood;
window.winddownNext = winddownNext;
window.winddownSaveJournal = winddownSaveJournal;
window.startWinddownBreath = startWinddownBreath;
window.renderWindDownStep = renderWindDownStep;

export {
  openOpenJournal,
  saveOpenJournal,
  toggleGentleMode,
  activateHardDayMode,
  getWhatHelpedLastTime,
  renderHardDaySheet,
  checkMonthlyReflection,
  showMonthlyReflectionPrompt,
  winddownStep,
  WINDDOWN_AFFIRMATIONS,
  openWindDown,
  renderWindDownStep,
  winddownSetMood,
  winddownNext,
  winddownSaveJournal,
  startWinddownBreath,
};
