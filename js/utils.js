// Bloom utils — haptics, audio engine, helpers
import { state } from './state.js';
import { DAILY_HABITS, MEDICATION_HABIT } from './constants.js';

function haptic(style = 'light') {
  try {
    if (navigator.vibrate) {
      const patterns = { light: 8, medium: 15, heavy: 25, success: [10,50,10] };
      navigator.vibrate(patterns[style] || 8);
    }
  } catch(e) {}
}

// ============================================================
//  AUDIO ENGINE
// ============================================================
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return audioCtx;
}

function isAudioEnabled() {
  return state.prefs?.audio !== false;
}

function playTone(freq, duration, type = 'sine', volume = 0.18, delay = 0) {
  if (!isAudioEnabled()) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch(e) {}
}

// ── Count completed habits today (for rising scale) ──────────
// ── Warm marimba-style tone with natural decay ───────────────
function playWarmTone(freq, duration, volume = 0.18, delay = 0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(volume * 0.4, ctx.currentTime + delay + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);

    // Subtle harmonic for warmth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime + delay);
    gain2.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain2.gain.linearRampToValueAtTime(volume * 0.25, ctx.currentTime + delay + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration * 0.6);
    osc2.start(ctx.currentTime + delay);
    osc2.stop(ctx.currentTime + delay + duration);
  } catch(e) {}
}

function getDailyCompletionCount() {
  const td = state.todayData || {};
  let count = 0;
  // New daily habits (preferred) or legacy teeth
  const dhP = state.prefs?.dailyHabits || {};
  const htP = state.prefs?.habitTimes || {};
  const hasNewHabits = Object.values(dhP).some(Boolean);
  if (hasNewHabits) {
    [...DAILY_HABITS, MEDICATION_HABIT].forEach(h => {
      if (!dhP[h.id]) return;
      const time = htP[h.id] || h.defaultTime || 'any';
      if ((time === 'am' || time === 'both') && td[h.id + '_am']) count++;
      if ((time === 'pm' || time === 'both') && td[h.id + '_pm']) count++;
      if (time === 'any' && td[h.id + '_any']) count++;
    });
  } else {
    if (td.m_teeth) count++;
    if (td.e_teeth) count++;
  }
  if (td.mood !== undefined) count++;
  if (td.water >= 3) count++;
  if (td.foodXPGiven) count++;
  if (td.journalXPGiven) count++;
  // Weekly habits done this week
  const wd = state.weekData || {};
  if ((wd.w_shower || 0) > 0) count++;
  if ((wd.w_exercise || 0) > 0) count++;
  if ((wd.w_outside || 0) > 0) count++;
  if ((wd.w_therapy || 0) > 0) count++;
  // Self-care tasks
  const sc = state.todayData?.selfCare || {};
  count += Object.values(sc).filter(Boolean).length;

  // Household tasks
  const household = wd.household || {};
  count += Object.values(household).filter(Boolean).length;
  return count;
}

function playSound(type, param) {
  if (!isAudioEnabled()) return;
  if (audioCtx?.state === 'suspended') audioCtx.resume();

  switch(type) {

    case 'habit': {
      const scale = [261, 294, 330, 392, 440, 523, 587, 659];
      const count = getDailyCompletionCount();
      const idx = Math.min(count, scale.length - 1);
      const freq = scale[idx];
      playWarmTone(freq, 0.75, 0.17);
      if (idx >= 4) playWarmTone(freq * 1.5, 0.6, 0.07, 0.05);
      break;
    }

    case 'all_done':
      playWarmTone(523,  0.8, 0.16);
      playWarmTone(659,  0.8, 0.14, 0.1);
      playWarmTone(784,  1.1, 0.16, 0.2);
      playWarmTone(1047, 0.9, 0.12, 0.35);
      break;

    case 'water_1':
      playWarmTone(392, 0.65, 0.15);
      break;

    case 'water_2':
      playWarmTone(523, 0.65, 0.15);
      break;

    case 'water_3':
      playWarmTone(659, 0.7,  0.15);
      playWarmTone(784, 0.9,  0.13, 0.12);
      playWarmTone(523, 0.9,  0.10, 0.12);
      break;

    case 'water':
      playWarmTone(523, 0.7, 0.14);
      break;

    case 'food':
      playWarmTone(440, 0.6, 0.13);
      playWarmTone(554, 0.7, 0.11, 0.1);
      break;

    case 'milestone':
      playWarmTone(392, 0.6,  0.13);
      playWarmTone(494, 0.6,  0.13, 0.12);
      playWarmTone(587, 0.6,  0.14, 0.22);
      playWarmTone(784, 1.0,  0.15, 0.34);
      playWarmTone(988, 0.9,  0.12, 0.5);
      break;

    case 'win':
      playWarmTone(523, 0.5, 0.12);
      playWarmTone(659, 0.5, 0.12, 0.09);
      playWarmTone(880, 0.7, 0.14, 0.18);
      break;

    case 'journal':
      playWarmTone(329, 0.9, 0.14);
      break;

    case 'mood':
      playWarmTone(440, 0.5, 0.08);
      break;

    case 'affirmation':
      playWarmTone(659, 0.5, 0.1);
      playWarmTone(784, 0.6, 0.1, 0.1);
      break;

    case 'hard_day':
      playWarmTone(261, 1.0, 0.12);
      playWarmTone(329, 1.0, 0.09, 0.25);
      playWarmTone(392, 1.2, 0.10, 0.5);
      break;

    case 'breath_inhale':
      playTone(220, 1.8, 'sine', 0.07);
      playTone(440, 1.8, 'sine', 0.04, 0.0);
      playTone(660, 1.2, 'sine', 0.02, 0.1);
      break;

    case 'breath_hold':
      playTone(261, 2.0, 'sine', 0.07);
      playTone(392, 2.0, 'sine', 0.04, 0.05);
      break;

    case 'breath_exhale':
      playTone(293, 2.2, 'sine', 0.07);
      playTone(220, 2.5, 'sine', 0.05, 0.2);
      break;

    case 'breath_done':
      playTone(523, 1.2, 'sine', 0.1);
      playTone(659, 1.2, 'sine', 0.08, 0.4);
      playTone(784, 1.5, 'sine', 0.1,  0.8);
      break;

    case 'breath_count':
      playTone(880, 0.12, 'sine', 0.05);
      break;
  }
}

// ── Animated checkmark SVG ───────────────────────────────────
const CHECK_SVG = '<svg class="habit-check-svg" viewBox="0 0 16 16"><path class="check-path" d="M3.5 8.5L6.5 11.5L12.5 4.5"/></svg>';

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
export function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
export { haptic, getAudioCtx, isAudioEnabled, playTone, playWarmTone, getDailyCompletionCount, playSound, CHECK_SVG };
