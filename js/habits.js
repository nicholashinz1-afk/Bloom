import { state, today, saveState } from './state.js';
import { save, load } from './storage.js';
import { haptic, playSound } from './utils.js';
import { addXP } from './xp.js';
import { celebrate, showUndoToast } from './celebrate.js';
import { XP_VALUES, HABIT_AFFIRMATIONS, DAILY_HABITS, MEDICATION_HABIT } from './constants.js';
import { sendTelemetry } from './telemetry.js';
import { updateStreak } from './streaks.js';

// Late-bound cross-module references (avoid circular imports)
function renderTodayTab(...args) { return window.renderTodayTab?.(...args); }
function renderWeeklyTab(...args) { return window.renderWeeklyTab?.(...args); }

export function toggleHabit(habitId, el) {
  const wasDone = state.todayData[habitId];
  state.todayData[habitId] = !wasDone;

  if (!wasDone) {
    const xpVal = XP_VALUES[habitId] || 10;
    addXP(xpVal, el);
    checkFirstTaskStreak();
    celebrate(habitId, el);
  } else {
    const xpVal = XP_VALUES[habitId] || 10;
    state.xpData.total = Math.max(0, (state.xpData.total || 0) - xpVal);
    saveState();
    updateProgressTab();
    showUndoToast(habitId, xpVal);
  }

  saveState();
  archiveToday();
  renderTodayTab();
  checkAllDone();
}
window.toggleHabit = toggleHabit;

export function toggleWeeklyHabit(habitId, action, el) {
  const wd = state.weekData;
  if (!wd[habitId]) wd[habitId] = 0;
  const goal = state.prefs?.goals?.[habitId] || 3;

  if (action === 'dec') {
    if (wd[habitId] > 0) {
      wd[habitId]--;
      state.xpData.total = Math.max(0, (state.xpData.total || 0) - (XP_VALUES[habitId] || 15));
      saveState();
      updateProgressTab();
      haptic('light');
    }
  } else {
    if (wd[habitId] < goal) {
      wd[habitId]++;
      addXP(XP_VALUES[habitId] || 15, el);
      checkFirstTaskStreak();
      const atGoal = wd[habitId] >= goal;
      celebrate(atGoal ? 'weekly_goal' : habitId, el);
    }
  }
  saveState();
  renderWeeklyTab();
}
window.toggleWeeklyHabit = toggleWeeklyHabit;

export function toggleHouseholdTask(taskId, el) {
  const wd = state.weekData;
  if (!wd.household) wd.household = {};
  wd.household[taskId] = !wd.household[taskId];

  if (wd.household[taskId]) {
    addXP(15, el);
    checkFirstTaskStreak();
    celebrate('household', el);
  } else {
    state.xpData.total = Math.max(0, (state.xpData.total || 0) - 15);
    haptic('light');
    saveState();
    updateProgressTab();
  }
  saveState();
  renderWeeklyTab();
}
window.toggleHouseholdTask = toggleHouseholdTask;

// ============================================================
//  FIRST TASK DAILY WELCOME OVERLAY
// ============================================================
export function checkFirstTaskStreak() {
  const t = today();
  if (load('bloom_first_task_date', null) === t) return; // already shown today
  save('bloom_first_task_date', t);

  // Update streak now — this is the moment it should count
  updateStreak();

  const totalDays = state.xpData.daysShowedUp || 1;

  // Pick message based on cumulative days
  let headline, sub;
  if (totalDays === 1) {
    headline = 'Day one. 🌱';
    sub = 'You showed up. That\'s where it all starts.';
  } else if (totalDays < 10) {
    headline = `Day ${totalDays}.`;
    sub = 'Another day you chose yourself. It adds up.';
  } else if (totalDays < 25) {
    headline = `${totalDays} days and counting.`;
    sub = 'You keep coming back. That says something.';
  } else if (totalDays < 50) {
    headline = `${totalDays} days. 🌿`;
    sub = 'Look at what you\'re building, one day at a time.';
  } else if (totalDays < 100) {
    headline = `${totalDays} days. ✨`;
    sub = 'This is a real practice now. You\'re doing it.';
  } else {
    headline = `${totalDays} days. 🌻`;
    sub = 'The kind of consistency that changes a life.';
  }

  haptic('medium');
  playSound('habit');

  const div = document.createElement('div');
  div.id = 'streak-welcome-overlay';
  div.style.cssText = `
    position:fixed;inset:0;z-index:790;
    background:rgba(13,22,16,0.92);
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    padding:48px 36px;
    animation:fadeIn 0.4s ease forwards;
  `;
  div.innerHTML = `
    <div style="text-align:center;max-width:300px">
      <div style="font-size:64px;margin-bottom:20px">🌿</div>
      <div style="font-family:Fraunces,serif;font-size:13px;color:var(--sage);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px">
        day ${totalDays}
      </div>
      <div style="font-family:Fraunces,serif;font-size:30px;font-weight:300;color:var(--cream);margin-bottom:12px;line-height:1.2">
        ${headline}
      </div>
      <div style="font-size:15px;color:var(--text-secondary);line-height:1.7;margin-bottom:36px">
        ${sub}
      </div>
      <button onclick="document.getElementById('streak-welcome-overlay').remove()" style="
        background:none;border:1px solid rgba(255,255,255,0.12);
        color:var(--text-secondary);font-family:Fraunces,serif;
        font-style:italic;font-size:15px;padding:10px 28px;
        border-radius:99px;cursor:pointer;
      ">Continue →</button>
    </div>
  `;
  document.body.appendChild(div);

  // Auto-dismiss after 6 seconds if not tapped
  setTimeout(() => {
    const el = document.getElementById('streak-welcome-overlay');
    if (el) {
      el.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => el.remove(), 400);
    }
  }, 6000);
}

// ============================================================
//  AFFIRMATION SYSTEM (now just drives the banner, celebration handles the toast)
// ============================================================
export let affirmTimeout = null;
export function showAffirmation(habitId) {
  const pool = [...(HABIT_AFFIRMATIONS[habitId] || ['Well done.'])];
  const custom = state.wellnessData?.affirmations || [];
  if (custom.length > 0 && Math.random() < 0.3) pool.push(...custom);
  const text = pool[Math.floor(Math.random() * pool.length)];
  state.lastAffirm = text;
  state.showAffirm = true;
  if (affirmTimeout) clearTimeout(affirmTimeout);
  affirmTimeout = setTimeout(() => {
    state.showAffirm = false;
    renderTodayTop();
  }, 3500);
  renderTodayTop();
}

export function getCompletionRate() {
  const prefs = state.prefs;
  const td = state.todayData;
  const dhPrefs2 = prefs?.dailyHabits || {};
  const htPrefs2 = prefs?.habitTimes || {};
  let totalHabits = 0, doneHabits = 0;

  const activeNewHabits = DAILY_HABITS.filter(h => dhPrefs2[h.id]);
  if (activeNewHabits.length > 0 || dhPrefs2.medication) {
    [...activeNewHabits, ...(dhPrefs2.medication ? [MEDICATION_HABIT] : [])].forEach(h => {
      const time = htPrefs2[h.id] || h.defaultTime || 'any';
      if (time === 'am' || time === 'both') { totalHabits++; if (td[h.id + '_am']) doneHabits++; }
      if (time === 'pm' || time === 'both') { totalHabits++; if (td[h.id + '_pm']) doneHabits++; }
      if (time === 'any') { totalHabits++; if (td[h.id + '_any']) doneHabits++; }
    });
  } else {
    if (prefs?.habits?.m_teeth !== false) { totalHabits++; if (td.m_teeth) doneHabits++; }
    if (prefs?.habits?.e_teeth !== false) { totalHabits++; if (td.e_teeth) doneHabits++; }
  }
  if (td.mood !== undefined) doneHabits++;
  totalHabits++; // mood counts
  return totalHabits > 0 ? { done: doneHabits, total: totalHabits, pct: doneHabits / totalHabits } : { done: 0, total: 0, pct: 0 };
}

export function checkAllDone() {
  const prefs = state.prefs;
  const td = state.todayData;
  const dhPrefs2 = prefs?.dailyHabits || {};
  const htPrefs2 = prefs?.habitTimes || {};

  let allHabitsDone = true;

  // Check new daily habits
  const activeNewHabits = DAILY_HABITS.filter(h => dhPrefs2[h.id]);
  if (activeNewHabits.length > 0 || dhPrefs2.medication) {
    [...activeNewHabits, ...(dhPrefs2.medication ? [MEDICATION_HABIT] : [])].forEach(h => {
      const time = htPrefs2[h.id] || h.defaultTime || 'any';
      if (time === 'am' || time === 'both') { if (!td[h.id + '_am']) allHabitsDone = false; }
      if (time === 'pm' || time === 'both') { if (!td[h.id + '_pm']) allHabitsDone = false; }
      if (time === 'any') { if (!td[h.id + '_any']) allHabitsDone = false; }
    });
  } else {
    // Legacy teeth habits
    const morning = prefs?.habits?.m_teeth === false || td.m_teeth;
    const evening = prefs?.habits?.e_teeth === false || td.e_teeth;
    if (!morning || !evening) allHabitsDone = false;
  }

  const wasAllDone = state.allDone;
  state.allDone = allHabitsDone && td.mood !== undefined;
  if (state.allDone && !wasAllDone) {
    setTimeout(() => celebrate('all_done', document.getElementById('today-scroll')), 300);
  }

  // Partial completion celebrations (persisted to todayData so they don't repeat on reload)
  const { pct } = getCompletionRate();
  if (pct >= 0.75 && !td._celebrated75) {
    td._celebrated75 = true;
    saveState();
    if (!state.allDone) {
      setTimeout(() => showPartialCompletionToast('strong_day'), 400);
    }
  } else if (pct >= 0.5 && !td._celebrated50) {
    td._celebrated50 = true;
    saveState();
    setTimeout(() => showPartialCompletionToast('halfway'), 400);
  }

  renderTodayTop();
}

export function showPartialCompletionToast(type) {
  const msgs = type === 'strong_day' ? [
    { title: 'Strong day!', sub: '75% done. You\'re really showing up.' },
    { title: 'Almost there.', sub: 'Most of your habits are checked off.' },
    { title: 'Look at you go.', sub: 'Three quarters done and counting.' },
  ] : [
    { title: 'Halfway there!', sub: '50% done. Every check matters.' },
    { title: 'You\'re building momentum.', sub: 'Half your habits are done.' },
    { title: 'Keep it up.', sub: 'You\'re doing great today.' },
  ];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  const emoji = type === 'strong_day' ? '💪' : '🌿';
  haptic('medium');
  const existing = document.getElementById('celebrate-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'celebrate-toast';
  toast.className = 'celebrate-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  const appEl = document.getElementById('app');
  const navEl = document.getElementById('bottom-nav');
  const appRect = appEl ? appEl.getBoundingClientRect() : { bottom: window.innerHeight };
  const navRect = navEl ? navEl.getBoundingClientRect() : null;
  toast.style.bottom = (navRect ? (appRect.bottom - navRect.top) + 12 : 80) + 'px';
  toast.innerHTML = `
    <div class="celebrate-toast-emoji">${emoji}</div>
    <div class="celebrate-toast-body">
      <div class="celebrate-toast-title">${msg.title}</div>
      <div class="celebrate-toast-sub">${msg.sub}</div>
    </div>
  `;
  (appEl || document.body).appendChild(toast);
  setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 350); }, 2800);
}

// ============================================================
//  TODAY ARCHIVE (for history)
// ============================================================
window.archiveToday = archiveToday;
window.checkFirstTaskStreak = checkFirstTaskStreak;

export function archiveToday() {
  const t = today();
  if (!state.historyData[t]) state.historyData[t] = {};
  state.historyData[t] = {
    ...state.historyData[t],
    habits: { ...state.todayData },
    mood: state.todayData.mood,
    sleep: state.todayData.sleep,
    journal: state.wellnessData?.journal?.[t]?.text,
    journalAI: state.wellnessData?.journal?.[t]?.ai,
  };
  save('bloom_history', state.historyData);
}
