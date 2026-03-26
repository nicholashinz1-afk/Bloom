import { state, saveState } from './state.js';
import { save } from './storage.js';
import { CELEBRATIONS } from './constants.js';
import { haptic, playSound } from './utils.js';
import { launchConfetti } from './ui.js';
import { addXP, showXPFloat, burstHearts, burstParticles } from './xp.js';
function renderTodayTab(...args) { return window.renderTodayTab?.(...args); }
function archiveToday(...args) { return window.archiveToday?.(...args); }
function checkAllDone(...args) { return window.checkAllDone?.(...args); }
function showUndoToast(habitKey, xpVal) {
  undoData = { key: habitKey, xp: xpVal };
  const existing = document.getElementById('undo-toast');
  if (existing) existing.remove();
  if (undoTimeout) clearTimeout(undoTimeout);

  const toast = document.createElement('div');
  toast.id = 'undo-toast';
  toast.className = 'celebrate-toast';
  toast.style.background = 'rgba(176,120,120,0.15)';
  toast.style.borderColor = 'rgba(176,120,120,0.3)';
  const appEl = document.getElementById('app');
  const navEl = document.getElementById('bottom-nav');
  const appRect = appEl ? appEl.getBoundingClientRect() : { bottom: window.innerHeight };
  const navRect = navEl ? navEl.getBoundingClientRect() : null;
  toast.style.bottom = (navRect ? (appRect.bottom - navRect.top) + 12 : 80) + 'px';
  toast.innerHTML = `
    <div class="celebrate-toast-emoji">↩️</div>
    <div class="celebrate-toast-body">
      <div class="celebrate-toast-title">Habit unchecked</div>
      <div class="celebrate-toast-sub">-${xpVal} ☀️</div>
    </div>
    <div onclick="undoHabitUncheck()" style="padding:6px 14px;background:rgba(176,120,120,0.25);border:1px solid rgba(176,120,120,0.4);border-radius:var(--r-full);font-size:12px;font-weight:600;color:var(--rose-light);cursor:pointer">Undo</div>
  `;
  (appEl || document.body).appendChild(toast);
  undoTimeout = setTimeout(() => {
    undoData = null;
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 5000);
}

function undoHabitUncheck() {
  if (!undoData) return;
  const { key, xp } = undoData;
  state.todayData[key] = true;
  addXP(xp, null);
  saveState();
  archiveToday();
  renderTodayTab();
  checkAllDone();
  undoData = null;
  if (undoTimeout) clearTimeout(undoTimeout);
  const toast = document.getElementById('undo-toast');
  if (toast) { toast.classList.add('hide'); setTimeout(() => toast.remove(), 350); }
}

// ── Core celebration function ────────────────────────────────
let celebrateTimeout = null;
function celebrate(type, sourceEl) {
  const data = CELEBRATIONS[type];
  if (!data) return;

  // Mood-aware celebration intensity
  // 0=quiet (Low/Rough), 1=subtle (Okay), 2=full (Good/Great/unset)
  const currentMood = state.todayData?.mood;
  const celebPrefSetting = state.prefs?.celebrationIntensity || 'auto';
  let celebLevel;
  if (celebPrefSetting === 'quiet') celebLevel = 0;
  else if (celebPrefSetting === 'subtle') celebLevel = 1;
  else if (celebPrefSetting === 'full') celebLevel = 2;
  else { // 'auto' — mood-based
    celebLevel = (currentMood !== undefined && currentMood >= 0 && currentMood <= 1) ? 0
      : (currentMood === 2) ? 1 : 2;
  }

  haptic(celebLevel === 0 ? 'light' : (data.confetti ? 'success' : 'medium'));

  // Play audio — skip for quiet, play for subtle+full
  const audioMap = {
    water: null,        // handled per-bottle in tapWater
    food: 'food',
    journal: 'journal',
    win: 'win',
    all_done: 'all_done',
    weekly_goal: 'milestone',
    reflection: 'journal',
    breath: 'breath_done',
    mood: 'mood',
    sleep: 'mood',
    affirmation: 'affirmation',
    insight: 'milestone',
  };
  const sound = audioMap.hasOwnProperty(type) ? audioMap[type] : 'habit';
  if (sound && celebLevel > 0) playSound(sound);

  // Variable reward: 1-in-20 chance of a golden message
  const isGolden = Math.random() < 0.05;
  const userName = state.prefs?.name;
  let msg;
  if (isGolden && userName && data.messages.length > 0) {
    const goldenMsgs = [
      { title: `${userName}, you're incredible.`, sub: 'Seriously. Don\'t ever forget that.' },
      { title: `This one\'s for you, ${userName}.`, sub: 'You\'re building something beautiful, one day at a time.' },
      { title: `${userName}, look how far you\'ve come.`, sub: 'Every single step has mattered.' },
    ];
    msg = goldenMsgs[Math.floor(Math.random() * goldenMsgs.length)];
  } else if (type !== 'win' && type !== 'affirmation' && Math.random() < 0.12) {
    // ~1-in-8 chance: surface a past small win as a callback
    const allWins = Object.values(state.wellnessData?.wins || {}).flat();
    if (allWins.length > 0) {
      const randomWin = allWins[Math.floor(Math.random() * allWins.length)];
      msg = { title: 'Remember this win?', sub: `⭐ ${randomWin}` };
    } else {
      msg = data.messages[Math.floor(Math.random() * data.messages.length)];
    }
  } else {
    msg = data.messages[Math.floor(Math.random() * data.messages.length)];
  }

  // Particle burst from source (skip for quiet mood, keep for subtle+full)
  if (sourceEl && celebLevel > 0) {
    data.hearts ? burstHearts(sourceEl) : burstParticles(sourceEl);
  }

  // Confetti for big moments (only at full celebration level)
  if (data.confetti && celebLevel === 2) {
    const rect = sourceEl?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width/2 : window.innerWidth/2;
    const cy = rect ? rect.top + rect.height/2 : window.innerHeight * 0.4;
    launchConfetti(cx, cy, 50);
  }

  // Remove any existing toast
  const existing = document.getElementById('celebrate-toast');
  if (existing) existing.remove();
  if (celebrateTimeout) clearTimeout(celebrateTimeout);

  // Build toast
  const toast = document.createElement('div');
  toast.id = 'celebrate-toast';
  toast.className = 'celebrate-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  // Position above nav bar, relative to #app container
  const appEl = document.getElementById('app');
  const navEl = document.getElementById('bottom-nav');
  const appRect = appEl ? appEl.getBoundingClientRect() : { bottom: window.innerHeight };
  const navRect = navEl ? navEl.getBoundingClientRect() : null;
  const bottomOffset = navRect
    ? (appRect.bottom - navRect.top) + 12
    : 80;
  toast.style.bottom = bottomOffset + 'px';

  toast.innerHTML = `
    <div class="celebrate-toast-emoji">${data.emoji}</div>
    <div class="celebrate-toast-body">
      <div class="celebrate-toast-title">${msg.title}</div>
      <div class="celebrate-toast-sub">${msg.sub}</div>
    </div>
    ${data.xp ? `<div class="celebrate-toast-xp">+${data.xp} ☀️</div>` : ''}
  `;
  (appEl || document.body).appendChild(toast);

  // Also show XP float if applicable
  if (data.xp && sourceEl) showXPFloat(data.xp, sourceEl);

  celebrateTimeout = setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}

// ============================================================
//  HABIT LOGIC
// ============================================================
// XP balanced around mental well-being:
// - Medication & inner care (journal, reflection) are highest — these are core therapeutic actions
// - Basic self-care (hygiene, nourishment, hydration) are equal — every one matters on hard days

window.undoHabitUncheck = undoHabitUncheck;
window.celebrate = celebrate;

export { showUndoToast, undoHabitUncheck, celebrate, celebrateTimeout };
