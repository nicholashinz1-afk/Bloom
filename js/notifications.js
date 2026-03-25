// Bloom notifications — affirmations, session management, reminders, push
import { state, today, getDayIndex, dayOfWeek, getWeekDates, saveState } from './state.js';
import { save, load } from './storage.js';
import { haptic } from './utils.js';
import { updateStreak } from './streaks.js';
import { DAILY_HABITS, MEDICATION_HABIT, DAILY_QUOTES } from './constants.js';
import { bloomIcon } from './icons.js';

// Late-bound cross-module references (avoid circular imports)
function renderTodayTab(...args) { return window.renderTodayTab?.(...args); }
function switchTab(...args) { return window.switchTab?.(...args); }
function openSheet(...args) { return window.openSheet?.(...args); }
function closeAllSheets(...args) { return window.closeAllSheets?.(...args); }
function archiveToday(...args) { return window.archiveToday?.(...args); }
function loadState(...args) { return window.loadState?.(...args); }

function checkDailyAffirmation() {
  const lastShown = load('bloom_affirmation_date', null);
  const t = today();
  if (lastShown === t) return;
  save('bloom_affirmation_date', t);
  setTimeout(() => showDailyAffirmation(), 300);
}

function showDailyAffirmation() {
  const overlay = document.getElementById('affirmation-overlay');
  if (!overlay) return;

  const name = state.prefs?.name;
  const greeting = document.getElementById('affirmation-greeting');
  if (greeting && name) {
    greeting.textContent = `Good to see you, ${name}.`;
  }

  overlay.style.display = 'flex';
  overlay.style.pointerEvents = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      overlay.style.pointerEvents = 'all';
    });
  });

  const timings = [
    { id: 'affirmation-greeting', delay: 400 },
    { id: 'aff-1', delay: 1000 },
    { id: 'aff-2', delay: 1700 },
    { id: 'aff-3', delay: 2400 },
    { id: 'aff-4', delay: 3100 },
    { id: 'aff-5', delay: 4000 },
    { id: 'affirmation-begin', delay: 5600 },
  ];

  timings.forEach(({ id, delay }) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.add('show');
      if (id.startsWith('aff-')) {
        // C4, E4, F4, G4, C5+E5+G5 chord — open, contemplative, meditative
        const tones = [261, 330, 349, 392, 523];
        const idx = parseInt(id.replace('aff-', '')) - 1;
        const freq = tones[idx];
        const isFinal = id === 'aff-5';
        if (isFinal) {
          // Full C major chord — C5, E5, G5 — ringing together
          playTone(523, 3.5, 'sine', 0.10);        // C5
          playTone(659, 3.5, 'sine', 0.08, 0.0);   // E5
          playTone(784, 3.2, 'sine', 0.07, 0.0);   // G5
          // Octave harmonics for richness
          playTone(1046, 2.5, 'sine', 0.03, 0.02); // C6
          playTone(1318, 2.0, 'sine', 0.02, 0.02); // E6
        } else {
          // Single singing bowl tone for each line
          playTone(freq,     2.0, 'sine', 0.07);
          playTone(freq * 2, 1.6, 'sine', 0.03, 0.02);
          playTone(freq * 3, 1.2, 'sine', 0.015, 0.04);
        }
      }
    }, delay);
  });
}

function dismissAffirmation() {
  const overlay = document.getElementById('affirmation-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  setTimeout(() => {
    overlay.style.display = 'none';
    ['affirmation-greeting','aff-1','aff-2','aff-3','aff-4','aff-5','affirmation-begin']
      .forEach(id => document.getElementById(id)?.classList.remove('show'));
  }, 600);
}

// ============================================================
//  SESSION TIMEOUT — treat as fresh open after 30min background
// ============================================================
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    save('bloom_last_active', Date.now());
  } else {
    // Check for app updates on every foreground return
    checkForUpdate();
    checkNudgeCredit();
    const lastActive = load('bloom_last_active', null);
    if (lastActive && (Date.now() - lastActive) >= SESSION_TIMEOUT_MS) {
      // Been away 30+ min — full refresh
      loadState();
      const t = today();
      const lastAffirmation = load('bloom_affirmation_date', null);
      if (lastAffirmation !== t) checkDailyAffirmation();
      checkNewWeek();
      renderDailyQuote();
      renderTodayTab();
      updateStreak();
      updateProgressTab();
      // Scroll today tab to top
      const scroll = document.getElementById('today-scroll');
      if (scroll) scroll.scrollTop = 0;
      // Switch back to today tab
      switchTab('today');
      // Show session refresh indicator
      showSessionRefreshIndicator();
    }
    save('bloom_last_active', Date.now());
  }
}

function showSessionRefreshIndicator() {
  const existing = document.getElementById('session-refresh-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'session-refresh-banner';
  banner.style.cssText = `
    position:fixed;top:0;left:50%;transform:translateX(-50%);
    max-width:430px;width:100%;z-index:800;
    padding:calc(env(safe-area-inset-top, 0px) + 8px) 20px 10px;
    background:linear-gradient(180deg,rgba(var(--sage-rgb),0.18),transparent);
    text-align:center;pointer-events:none;
    animation:sessionRefreshIn 0.4s ease forwards;
  `;
  banner.innerHTML = `<div style="font-family:Fraunces,serif;font-style:italic;font-size:13px;color:var(--sage-light);opacity:0.9">Welcome back — session refreshed 🌿</div>`;
  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.animation = 'sessionRefreshOut 0.6s ease forwards';
    setTimeout(() => banner.remove(), 600);
  }, 3000);
}

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) checkForUpdate();
});
// ── Local notification helper ────────────────────────────────
async function sendLocalNotification(title, body, tag) {
  try {
    if (Notification.permission !== 'granted') return;
    const regs = await navigator.serviceWorker.getRegistrations();
    const reg = regs.find(r => r.active);
    if (!reg) return;
    await reg.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: tag || 'bloom',
      renotify: false,
    });
  } catch(e) {}
}

// ── Scheduled habit reminders ────────────────────────────────
const HABIT_REMINDERS = [
  { id: 'm_teeth', hour: 8,  title: 'Morning reminder 🦷', body: 'Have you brushed your teeth yet? A small act of care to start the day.', check: () => state.todayData.m_teeth || state.todayData.brush_teeth_am },
  { id: 'e_teeth', hour: 21, title: 'Evening reminder 🦷', body: 'Time to brush your teeth before bed. You\'ve got this.', check: () => state.todayData.e_teeth || state.todayData.brush_teeth_pm },
];

// ── Medication reminders (respects medicationReminders setting) ──
const MED_REMINDER_MESSAGES = [
  { title: 'Medication reminder 💊', body: 'A gentle nudge — have you taken your medication? No judgment, just care.' },
  { title: 'Medication check-in 💊', body: 'Just a quiet reminder — your medication is waiting when you\'re ready.' },
  { title: 'Hey, a small reminder 💊', body: 'Have you had your medication? Taking care of yourself matters.' },
];

function checkMedicationReminders() {
  if (!state.prefs?.notifications?.habitReminders) return;
  const medOn = state.prefs?.dailyHabits?.medication;
  if (!medOn) return;
  const medRemindMode2 = state.prefs?.notifications?.medicationReminders || 'auto';
  if (medRemindMode2 === 'off') return;

  const medTime = state.prefs?.habitTimes?.medication || 'am';
  const td = state.todayData;
  const now = new Date();
  const hour = now.getHours();
  const t = today();
  const sentKey = `bloom_reminders_${t}`;
  const sent = load(sentKey, {});

  // Build schedule: { slotKey, firstHour, followupHour, checkFn }
  const schedule = [];
  if (medTime === 'am' || medTime === 'both') {
    schedule.push({ slot: 'am', firstHour: 9, followupHour: 11, done: () => td.medication_am });
  }
  if (medTime === 'pm' || medTime === 'both') {
    schedule.push({ slot: 'pm', firstHour: 20, followupHour: 22, done: () => td.medication_pm });
  }
  if (medTime === 'any') {
    schedule.push({ slot: 'any', firstHour: 12, followupHour: 14, done: () => td.medication_any });
  }

  schedule.forEach(s => {
    if (s.done()) return;
    const msg = MED_REMINDER_MESSAGES[Math.floor(Math.random() * MED_REMINDER_MESSAGES.length)];

    // First reminder
    const firstKey = 'med_' + s.slot + '_first';
    if (hour >= s.firstHour && !sent[firstKey]) {
      sent[firstKey] = true;
      save(sentKey, sent);
      sendLocalNotification(msg.title, msg.body, 'reminder-med-' + s.slot);
    }

    // Follow-up (only in 'auto' mode)
    if (medRemindMode2 === 'auto') {
      const followKey = 'med_' + s.slot + '_followup';
      if (hour >= s.followupHour && !sent[followKey]) {
        sent[followKey] = true;
        save(sentKey, sent);
        sendLocalNotification('Still here 💊', 'No rush — just another gentle nudge about your ' + (s.slot === 'any' ? '' : s.slot.toUpperCase() + ' ') + 'medication.', 'reminder-med-' + s.slot + '-f');
      }
    }
  });
}

// ── Water reminders (respects waterMode setting) ─────────────
const WATER_MESSAGES = [
  { title: 'Water check 💧', body: 'A small sip goes a long way. Your body will thank you.' },
  { title: 'Hydration nudge 💧', body: 'Have you had some water recently? Even a few sips count.' },
  { title: 'Gentle reminder 💧', body: 'Water is self-care too. Take a moment for a drink.' },
  { title: 'Stay hydrated 💧', body: 'You\'re doing great — just a little water when you can.' },
];

function checkWaterReminders() {
  if (!state.prefs?.notifications?.habitReminders) return;
  const waterMode = state.prefs?.notifications?.waterMode || 'smart';
  if (waterMode === 'off') return;

  const waterCount = state.todayData.water || 0;
  if (waterCount >= 3) return; // goal reached, no more reminders

  const now = new Date();
  const hour = now.getHours();
  if (hour < 12 || hour > 21) return; // only between noon and 9pm

  const t = today();
  const sentKey = `bloom_reminders_${t}`;
  const sent = load(sentKey, {});

  if (waterMode === 'hourly') {
    // Send once per hour, keyed by hour
    const waterKey = `water_h${hour}`;
    if (sent[waterKey]) return;
    sent[waterKey] = true;
    save(sentKey, sent);
    const msg = WATER_MESSAGES[Math.floor(Math.random() * WATER_MESSAGES.length)];
    sendLocalNotification(msg.title, msg.body, 'reminder-water');
  } else if (waterMode === 'smart') {
    // Smart: remind every 4 hours if under goal, starting at noon
    // Noon (12), late afternoon (16), evening (20)
    const smartHours = [12, 16, 20];
    const due = smartHours.find(h => hour >= h && !sent[`water_s${h}`]);
    if (!due) return;
    sent[`water_s${due}`] = true;
    save(sentKey, sent);
    const bottlesLeft = 3 - waterCount;
    const bodies = [
      `You've had ${waterCount}/3 bottles today. A sip when you're ready — no rush.`,
      `Gentle nudge — ${bottlesLeft} more bottle${bottlesLeft !== 1 ? 's' : ''} to go. You've got this.`,
      `How's your water today? ${waterCount > 0 ? 'You\'re on your way — keep it up.' : 'Even one sip counts.'}`,
    ];
    sendLocalNotification('Hydration check 💧', bodies[Math.floor(Math.random() * bodies.length)], 'reminder-water');
  }
}

function checkScheduledReminders() {
  if (!state.prefs?.notifications?.habitReminders) return;
  const now = new Date();
  const hour = now.getHours();
  const t = today();
  const sentKey = `bloom_reminders_${t}`;
  const sent = load(sentKey, {});

  HABIT_REMINDERS.forEach(r => {
    if (hour >= r.hour && !sent[r.id] && !r.check()) {
      sent[r.id] = true;
      save(sentKey, sent);
      sendLocalNotification(r.title, r.body, `reminder-${r.id}`);
    }
  });
}

// Evening nudge — if user hasn't done anything all day
const EVENING_NUDGE_MESSAGES = [
  { title: 'Still here for you 🌙', body: 'Even opening this app counts. One small thing is enough — or just rest. That\'s okay too.' },
  { title: 'No pressure, just a nudge 💚', body: 'If today was hard, that\'s okay. Logging your mood or writing one sentence in your journal is more than enough.' },
  { title: 'A quiet check-in 🌿', body: 'You don\'t have to do everything. Even just saying how you feel today matters. We\'re here whenever you\'re ready.' },
  { title: 'Hey — just checking in 🤍', body: 'Some days are harder than others. If you can, just log your mood. If not, tomorrow is a fresh start.' },
];

function checkEveningNudge() {
  if (!state.prefs?.notifications?.habitReminders) return;
  const now = new Date();
  const hour = now.getHours();
  if (hour < 19) return; // Only after 7pm

  const t = today();
  const sentKey = `bloom_reminders_${t}`;
  const sent = load(sentKey, {});
  if (sent.evening_nudge) return;

  const td = state.todayData || {};
  const anyDailyHabit = Object.keys(td).some(k => (k.endsWith('_am') || k.endsWith('_pm') || k.endsWith('_any')) && td[k]);
  const anySelfCare = td.selfCare && Object.values(td.selfCare).some(Boolean);
  const anyActivity = (
    td.m_teeth || td.e_teeth || anyDailyHabit ||
    td.mood !== undefined ||
    (td.water && td.water > 0) ||
    (td.food && Object.values(td.food).some(Boolean)) ||
    td.journalXPGiven ||
    anySelfCare ||
    state.wellnessData?.journal?.[t]
  );

  sent.evening_nudge = true;
  save(sentKey, sent);

  if (!anyActivity) {
    const msg = EVENING_NUDGE_MESSAGES[Math.floor(Math.random() * EVENING_NUDGE_MESSAGES.length)];
    sendLocalNotification(msg.title, msg.body, 'reminder-evening-nudge');
  } else {
    // Partial completer nudge — find remaining habits and nudge
    const { done, total, pct } = getCompletionRate();
    if (pct < 1 && pct > 0) {
      const remaining = total - done;
      const nudgeMsgs = [
        { title: `You've done a lot today`, body: `${done}/${total} habits completed. ${remaining} more whenever you're ready — or not. You've already shown up.` },
        { title: `${Math.round(pct * 100)}% done today`, body: `You've been showing up. ${remaining} habit${remaining > 1 ? 's' : ''} left — but only if you want to.` },
        { title: 'You showed up today', body: `${done} of ${total} done. That already counts for something.` },
      ];
      const msg = nudgeMsgs[Math.floor(Math.random() * nudgeMsgs.length)];
      sendLocalNotification(msg.title, msg.body, 'reminder-evening-partial');
    }
  }
}

async function testPushNotification() {
  const statusEl = document.getElementById('notif-test-status');
  if (!statusEl) return;

  // Check permission
  if (Notification.permission === 'default') {
    statusEl.textContent = 'Requesting permission...';
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      statusEl.textContent = '⚠ Permission denied. Enable notifications in your browser/phone settings.';
      return;
    }
  } else if (Notification.permission === 'denied') {
    statusEl.textContent = '⚠ Notifications blocked. Check your browser or phone settings to allow them.';
    return;
  }

  // Check service worker
  const regs = await navigator.serviceWorker.getRegistrations();
  const reg = regs.find(r => r.active);
  if (!reg) {
    statusEl.textContent = '⚠ No active service worker. Try "Fix notifications" first.';
    return;
  }

  statusEl.textContent = 'Sending test notification...';
  await sendLocalNotification(
    'It worked! 🌿',
    'Push notifications are set up and ready. You\'ll get gentle reminders when you need them.',
    'test-notification'
  );
  statusEl.textContent = '✓ Notification sent — check your notification tray!';
  setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 5000);
}

// If the evening nudge fired and user opens the app, give them credit
function checkNudgeCredit() {
  const t = today();
  const sentKey = `bloom_reminders_${t}`;
  const sent = load(sentKey, {});
  if (!sent.evening_nudge) return; // nudge didn't fire today
  if (sent.nudge_credit_given) return; // already credited

  const td = state.todayData || {};
  const anyDailyHabit = Object.keys(td).some(k => (k.endsWith('_am') || k.endsWith('_pm') || k.endsWith('_any')) && td[k]);
  const anySelfCare = td.selfCare && Object.values(td.selfCare).some(Boolean);
  const anyActivity = (
    td.m_teeth || td.e_teeth || anyDailyHabit ||
    td.mood !== undefined ||
    (td.water && td.water > 0) ||
    (td.food && Object.values(td.food).some(Boolean)) ||
    td.journalXPGiven ||
    anySelfCare ||
    state.wellnessData?.journal?.[t]
  );

  if (!anyActivity) {
    // They came back after the nudge with nothing done — showing up counts
    state.todayData.nudge_opened = true;
    sent.nudge_credit_given = true;
    save(sentKey, sent);
    saveState();
    archiveToday();
    updateStreak();
  }
}

// Check reminders every 15 minutes
setInterval(() => { checkScheduledReminders(); checkWaterReminders(); checkMedicationReminders(); checkEveningNudge(); }, 15 * 60 * 1000);

// ── Weekly reflection availability check ─────────────────────
function checkWeeklyReflectionAvailable() {
  const dow = dayOfWeek(); // 0=Sun, 6=Sat
  if (dow !== 6 && dow !== 0) return; // only Sat + Sun

  const ws = weekStart();
  const lastNotified = load('bloom_reflection_notif', null);
  if (lastNotified === ws) return; // already notified this week
  save('bloom_reflection_notif', ws);

  // Show in-app banner
  state.showReflectionBanner = true;

  // Send push notification if enabled
  const notifs = state.prefs?.notifications;
  if (notifs?.sundayReminder !== false) {
    const dayName = dow === 6 ? 'Saturday' : 'Sunday';
    setTimeout(() => {
      sendLocalNotification(
        'Time to reflect 🪞',
        `Your weekly reflection is ready. Take a few minutes for yourself.`,
        'weekly-reflection'
      );
    }, 2000);
  }
}

function checkNewWeek() {
  const lastWeek = load('bloom_last_week_start');
  const thisWeek = weekStart();
  if (lastWeek && lastWeek !== thisWeek) {
    state.showNewWeekBanner = true;
    if (dayOfWeek() === 1) {
      setTimeout(() => showNewWeekGoalsSheet(), 1200);
    }
  }
  save('bloom_last_week_start', thisWeek);
  checkWeeklyReflectionAvailable();
}

function showNewWeekGoalsSheet() {
  const prefs = state.prefs;
  const defaultTasks = [
    { id: 'laundry',    icon: '🧺', name: 'Laundry' },
    { id: 'trash',      icon: '🗑', name: 'Trash' },
    { id: 'dishes',     icon: '🍽', name: 'Dishes' },
    { id: 'clean_room', icon: '🧹', name: 'Clean room' },
  ];
  const currentTasks = prefs.householdTasks || [];
  const customTasks = currentTasks.filter(t => !defaultTasks.some(d => d.id === t.id));

  const body = document.getElementById('new-week-goals-body');
  if (!body) { openSheet('new-week-sheet'); return; }

  let html = `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.6">Which tasks do you want to tackle this week?</div>`;

  [...defaultTasks, ...customTasks].forEach(t => {
    const active = currentTasks.some(c => c.id === t.id);
    html += `<div class="ob-checkbox-row" onclick="toggleNewWeekTask('${t.id}','${t.name}','${t.icon||'✏️'}')">
      <div class="ob-checkbox${active?' checked':''}"><span>${active?'✓':''}</span></div>
      <span style="font-size:18px">${t.icon||'✏️'}</span>
      <div class="toggle-label">${t.name}</div>
    </div>`;
  });

  html += `<div style="display:flex;gap:8px;margin-top:14px">
    <input type="text" id="new-week-custom-task" placeholder="Add a custom task...">
    <button class="btn btn-ghost btn-sm" onclick="addNewWeekCustomTask()">Add</button>
  </div>`;

  body.innerHTML = html;
  openSheet('new-week-sheet');
}

function toggleNewWeekTask(id, name, icon) {
  if (!state.prefs.householdTasks) state.prefs.householdTasks = [];
  const idx = state.prefs.householdTasks.findIndex(t => t.id === id);
  if (idx > -1) state.prefs.householdTasks.splice(idx, 1);
  else state.prefs.householdTasks.push({ id, name, icon });
  showNewWeekGoalsSheet();
}

function addNewWeekCustomTask() {
  const input = document.getElementById('new-week-custom-task');
  if (!input || !input.value.trim()) return;
  if (!state.prefs.householdTasks) state.prefs.householdTasks = [];
  state.prefs.householdTasks.push({ id: 'custom_' + Date.now(), name: input.value.trim(), icon: '✏️' });
  showNewWeekGoalsSheet();
}

function saveNewWeekGoals() {
  save('bloom_prefs', state.prefs);
  state.showNewWeekBanner = false;
  closeAllSheets();
  renderTodayTab();
}

// ============================================================
//  CELEBRATION DATA — every habit, every moment
// ============================================================
// ============================================================
//  DAILY HABITS — all habits with AM/PM/Both/Any time support
// ============================================================

export { checkDailyAffirmation, showDailyAffirmation, dismissAffirmation,
  handleVisibilityChange, showSessionRefreshIndicator, sendLocalNotification,
  checkMedicationReminders, checkWaterReminders, checkScheduledReminders,
  checkEveningNudge, testPushNotification, checkNudgeCredit,
  checkWeeklyReflectionAvailable, checkNewWeek, showNewWeekGoalsSheet,
  toggleNewWeekTask, addNewWeekCustomTask, saveNewWeekGoals };

window.dismissAffirmation = dismissAffirmation;
window.testPushNotification = testPushNotification;
window.saveNewWeekGoals = saveNewWeekGoals;
window.toggleNewWeekTask = toggleNewWeekTask;
window.addNewWeekCustomTask = addNewWeekCustomTask;
window.showNewWeekGoalsSheet = showNewWeekGoalsSheet;
