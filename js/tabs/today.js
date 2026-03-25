// Bloom today tab — daily habits, mood, water, food, self-care
import { state, today, getDayIndex, getWeekDates, weekStart, saveState, getJournalPrompt, getJournalEntries } from '../state.js';
import { save, load } from '../storage.js';
import { haptic, playSound, getDailyCompletionCount, isAudioEnabled } from '../utils.js';
import { DAILY_HABITS, MEDICATION_HABIT, SELF_CARE_CATEGORIES, SELF_CARE_TASKS, XP_VALUES, LEVELS, CELEBRATIONS, HABIT_AFFIRMATIONS } from '../constants.js';
import { getLevel, getNextLevel, addXP, buildFlowerSVG, showXPFloat, burstParticles, burstHearts, bounceMoodBtn, animateWaterBottle } from '../xp.js';
import { celebrate, showUndoToast } from '../celebrate.js';
import { callClaude, renderAIResponseHTML, showThinking } from '../ai.js';
import { sendTelemetry, trackFeature } from '../telemetry.js';
import { bloomIcon } from '../icons.js';
import { THEMES } from '../theme.js';
import { staggerCards } from '../ui.js';
import { infoIcon, openSheet } from '../sheets.js';
import { toggleHabit, toggleWeeklyHabit, toggleHouseholdTask, checkFirstTaskStreak, showAffirmation, getCompletionRate, checkAllDone } from '../habits.js';
import { openOpenJournal, toggleGentleMode, activateHardDayMode, openWindDown } from '../features/hardday.js';
import { updateStreak } from '../streaks.js';

// Late-bound cross-module references (avoid circular imports)
function switchTab(...args) { return window.switchTab?.(...args); }
function openCrisisSheet(...args) { return window.openCrisisSheet?.(...args); }
function archiveToday(...args) { return window.archiveToday?.(...args); }

function renderTodayTop() {
  const container = document.getElementById('today-top');
  if (!container) return;
  let html = '';

  // Hard day button — only show if mood is not yet selected
  const mood = state.todayData.mood;
  if (!state.hardDayMode && mood === undefined) {
    html += `<div onclick="activateHardDayMode()" style="
      display:flex;align-items:center;gap:12px;
      background:rgba(106,154,176,0.07);
      border:1px solid rgba(106,154,176,0.18);
      border-radius:var(--r-lg);padding:12px 16px;
      margin-bottom:12px;cursor:pointer;
      transition:background 0.2s">
      <span style="font-size:22px">🫂</span>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:500;color:var(--sky-light)">Having a hard day?</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Tap for support — showing up is what matters</div>
      </div>
      <div style="font-size:18px;color:var(--text-muted)">›</div>
    </div>`;
  }

  // Welcome-back re-engagement
  if (state.showWelcomeBack) {
    const daysAway = state.daysAway || 2;
    const name = state.prefs?.name ? `, ${state.prefs.name}` : '';
    const wbTitle = daysAway >= 30 ? `Welcome back${name}.`
      : daysAway >= 7 ? `It's good to see you${name}.`
      : `Hey${name}.`;
    const wbText = daysAway >= 30 ? "A lot can change — let's start with just today."
      : daysAway >= 7 ? 'Whatever happened, today is a fresh start.'
      : 'You came back. That says something about you.';
    html += `<div class="banner" style="background:rgba(var(--sage-rgb),0.1);border:1px solid rgba(var(--sage-rgb),0.25)">
      <div class="banner-icon" style="font-size:36px">🌱</div>
      <div class="banner-body">
        <div class="banner-title" style="color:var(--sage-light);font-size:16px">${wbTitle}</div>
        <div class="banner-text" style="line-height:1.7">${wbText} <span style="color:var(--amber-light);font-size:12px">+25 ☀️</span></div>
        <div style="font-size:12px;color:var(--text-muted);margin:8px 0">What happened? (optional, one-tap)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          ${['Life got busy', 'Not feeling it', 'Was doing okay', 'Forgot'].map(r =>
            `<div onclick="dismissWelcomeBack('${r}')" style="padding:5px 12px;border-radius:99px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);font-size:12px;color:var(--text-secondary);cursor:pointer">${r}</div>`
          ).join('')}
        </div>
        <div class="banner-actions">
          <div class="banner-action" onclick="dismissWelcomeBack(null)">Let's go</div>
        </div>
      </div>
    </div>`;
  }

  // Welcome back banner (shown after a gap)


  // Mood pattern insight
  const pattern = getMoodPattern();
  if (pattern && !state.dismissedPattern) {
    html += `<div class="banner" style="background:rgba(106,154,176,0.08);border:1px solid rgba(106,154,176,0.18)">
      <div class="banner-icon">💡</div>
      <div class="banner-body">
        <div class="banner-text" style="color:var(--sky-light)">${pattern.text}</div>
        <div class="banner-actions">
          <div class="banner-action" onclick="state.dismissedPattern=true;renderTodayTop()">Got it</div>
        </div>
      </div>
    </div>`;
  }

  // Weekly reflection available banner (Saturday + Sunday)
  if (state.showReflectionBanner) {
    const hasReflected = Object.keys(state.wellnessData?.reflections?.[weekStart()] || {}).length > 0;
    if (!hasReflected) {
      html += `<div class="banner" style="background:rgba(var(--sage-rgb),0.08);border:1px solid rgba(var(--sage-rgb),0.22)">
        <div class="banner-icon">🪞</div>
        <div class="banner-body">
          <div class="banner-title" style="color:var(--sage-light)">Weekly reflection is ready</div>
          <div class="banner-text">Take a few quiet minutes to look back at your week.</div>
          <div class="banner-actions">
            <div class="banner-action" onclick="switchTab('wellness');state.showReflectionBanner=false;">Reflect now</div>
            <div class="banner-action" onclick="state.showReflectionBanner=false;renderTodayTop()">Later</div>
          </div>
        </div>
      </div>`;
    }
  }

  // New week banner
  if (state.showNewWeekBanner) {
    html += `<div class="banner banner-all-done" style="background:rgba(var(--sage-rgb),0.1);border:1px solid rgba(var(--sage-rgb),0.25)">
      <div class="banner-icon">🌱</div>
      <div class="banner-body">
        <div class="banner-title" style="color:var(--sage-light)">New week, fresh start</div>
        <div class="banner-text">Last week's progress is saved in History. This week is a clean page.</div>
        <div class="banner-actions">
          <div class="banner-action" onclick="showNewWeekGoalsSheet()">Set this week's goals</div>
          <div class="banner-action" onclick="state.showNewWeekBanner=false;renderTodayTop()">Dismiss</div>
        </div>
      </div>
    </div>`;
  }

  // Affirmation banner
  if (state.showAffirm && state.lastAffirm) {
    html += `<div class="affirm-banner"><span>🌿</span><div class="affirm-text">${state.lastAffirm}</div></div>`;
  }

  // All done banner
  if (state.allDone) {
    html += `<div class="banner banner-all-done">
      <div class="banner-icon">🎉</div>
      <div class="banner-body">
        <div class="banner-title" style="color:var(--sage-light)">You're all done for today</div>
        <div class="banner-text">Everything's logged. Go be easy on yourself.</div>
      </div>
    </div>`;
  }

  // Low mood banner — only for Low (0) and Rough (1)
  if (mood !== undefined && mood >= 0 && mood <= 1) {
    const yesterdayLow = checkYesterdayLowMood();
    const breatheExpanded = state.inlineBreatheOpen;

    const consecutiveLowDays = getConsecutiveLowMoodDays();
    let lowMoodMessage;
    if (consecutiveLowDays >= 3) {
      lowMoodMessage = state.lowMoodAIResponse || 'You\'ve been having a hard stretch. That\'s a lot to carry. If you haven\'t already, this might be a good time to talk to someone who can really help.';
    } else if (yesterdayLow) {
      lowMoodMessage = state.lowMoodAIResponse || 'Two hard days in a row takes real courage to keep going. You\'re not alone.';
    } else {
      lowMoodMessage = 'Hard days happen. You don\'t have to push through anything right now.';
    }

    html += `<div class="banner banner-low-mood" id="low-mood-banner">
      <div class="banner-icon">🫂</div>
      <div class="banner-body" style="width:100%">
        <div class="banner-title" style="color:var(--sky-light)">It's okay not to be okay</div>
        <div class="banner-text">${lowMoodMessage}</div>
        ${consecutiveLowDays >= 3 ? `<div style="background:rgba(106,154,176,0.1);border:1px solid rgba(106,154,176,0.2);border-radius:var(--r-md);padding:10px 12px;margin:10px 0 6px">
          <div style="font-size:12px;color:var(--sky-light);line-height:1.6">Talking to a professional can make a real difference. A therapist can help in ways an app can't.</div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <a href="https://findahelpline.com/" target="_blank" rel="noopener" class="btn btn-sm" style="background:rgba(106,154,176,0.2);border:1px solid rgba(106,154,176,0.3);color:var(--sky-light);font-size:11px;text-decoration:none">Find support near you</a>
            <button class="btn btn-ghost btn-sm" onclick="openCrisisSheet()" style="font-size:11px">🤍 Crisis resources</button>
          </div>
        </div>` : ''}
        <div class="banner-actions">
          <div class="banner-action" id="inline-breathe-btn" onclick="toggleInlineBreathe()">${breatheExpanded ? '✕ Close' : '🌬 Breathe'}</div>
          <div class="banner-action" onclick="openOpenJournal()">📓 Just write</div>
          <div class="banner-action" onclick="openCrisisSheet()">🤍 Support</div>
        </div>
        ${breatheExpanded ? `
        <div id="inline-breath-zone" style="margin-top:14px;padding:14px;background:rgba(106,154,176,0.08);border:1px solid rgba(106,154,176,0.2);border-radius:var(--r-md)">
          <div id="inline-breath-ui" style="text-align:center"></div>
        </div>` : ''}
      </div>
    </div>`;
  }

  // Streak grace — only show at end of day (evening), not on first tap
  // (removed from here — handled by streak toast on completion)

  container.innerHTML = html;
}

function checkYesterdayLowMood() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  const yData = state.historyData[yStr];
  return yData && yData.mood !== undefined && yData.mood >= 0 && yData.mood <= 2;
}

function getConsecutiveLowMoodDays() {
  // Count how many consecutive days (including today) the user has logged low mood (0-1)
  let count = 0;
  const d = new Date();
  // Start from yesterday (today is already shown via low mood banner)
  for (let i = 1; i <= 14; i++) {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - i);
    const key = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`;
    const data = state.historyData[key];
    if (data && data.mood !== undefined && data.mood >= 0 && data.mood <= 1) {
      count++;
    } else {
      break;
    }
  }
  // +1 for today (since we're in the low mood banner, today is low)
  return count + 1;
}

// Inline breathe (in low mood banner)
let inlineBreathInterval = null;
let inlineBreathPhase = 0;
let inlineBreathCycle = 0;

function toggleInlineBreathe() {
  state.inlineBreatheOpen = !state.inlineBreatheOpen;
  if (inlineBreathInterval) { clearInterval(inlineBreathInterval); inlineBreathInterval = null; }
  inlineBreathPhase = 0;
  inlineBreathCycle = 0;
  renderTodayTop();
  if (state.inlineBreatheOpen) {
    setTimeout(() => runInlineBreathCountdown(3), 150);
  }
}

function runInlineBreathCountdown(n) {
  const ui = document.getElementById('inline-breath-ui');
  if (!ui) return;
  playSound('breath_count');
  ui.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-family:Fraunces,serif;font-size:80px;font-weight:300;color:var(--sky-light);line-height:1;animation:breathCountNum 0.4s cubic-bezier(0.34,1.56,0.64,1)">${n}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:8px;font-style:italic">get ready...</div>
    </div>`;
  if (n > 1) setTimeout(() => runInlineBreathCountdown(n - 1), 900);
  else setTimeout(() => renderInlineBreathPhase(), 900);
}

function renderInlineBreathPhase() {
  const ui = document.getElementById('inline-breath-ui');
  if (!ui) return;

  if (inlineBreathCycle >= 4) {
    if (!state.wellnessData.breathSessions) state.wellnessData.breathSessions = 0;
    state.wellnessData.breathSessions++;
    saveState();
    celebrate('breath', document.getElementById('inline-breath-zone'));
    ui.innerHTML = `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:40px;margin-bottom:10px">🌿</div>
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:17px;color:var(--sage-light);margin-bottom:6px">Four cycles complete.</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Take a moment. How do you feel?</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-sm" style="background:rgba(106,154,176,0.25);border:1px solid rgba(106,154,176,0.4);color:var(--sky-light)" onclick="inlineContinueBreathing()">Keep going</button>
          <button class="btn btn-ghost btn-sm" onclick="stopInlineBreathing()">I'm done</button>
        </div>
      </div>`;
    return;
  }

  const phases = [
    { name: 'Inhale', dur: 4, class: 'inhale', color: 'var(--sage-light)',  sound: 'breath_inhale' },
    { name: 'Hold',   dur: 7, class: 'hold',   color: 'var(--amber-light)', sound: 'breath_hold'   },
    { name: 'Exhale', dur: 8, class: 'exhale', color: 'var(--sky-light)',   sound: 'breath_exhale' },
  ];
  const ph = phases[inlineBreathPhase];
  let countdown = ph.dur;

  playSound(ph.sound);

  ui.innerHTML = `
    <div style="text-align:center">
      <div class="breath-circle ${ph.class}">
        <span style="font-size:26px;color:var(--sky-light);font-family:Fraunces,serif;font-style:italic" id="inline-breath-count">${countdown}</span>
      </div>
      <div class="breath-label" style="color:var(--sky-light)">${ph.name}</div>
      <div class="breath-count" style="margin-bottom:14px">Cycle ${inlineBreathCycle + 1} of 4</div>
      <button class="btn btn-ghost btn-sm" onclick="stopInlineBreathing()">Finish early</button>
    </div>`;

  if (inlineBreathInterval) clearInterval(inlineBreathInterval);
  inlineBreathInterval = setInterval(() => {
    countdown--;
    const countEl = document.getElementById('inline-breath-count');
    if (countEl) countEl.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(inlineBreathInterval);
      inlineBreathPhase++;
      if (inlineBreathPhase >= 3) { inlineBreathPhase = 0; inlineBreathCycle++; }
      setTimeout(() => renderInlineBreathPhase(), 300);
    }
  }, 1000);
}

function stopInlineBreathing() {
  if (inlineBreathInterval) clearInterval(inlineBreathInterval);
  if (!state.wellnessData.breathSessions) state.wellnessData.breathSessions = 0;
  state.wellnessData.breathSessions++;
  saveState();
  playSound('breath_done');
  const ui = document.getElementById('inline-breath-ui');
  if (ui) ui.innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:36px;margin-bottom:8px">🌿</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:15px;color:var(--sage-light);margin-bottom:16px">Well done. Take a moment.</div>
      <button class="btn btn-ghost btn-sm" onclick="toggleInlineBreathe()">Close</button>
    </div>`;
}

function inlineContinueBreathing() {
  inlineBreathCycle = 0;
  inlineBreathPhase = 0;
  renderInlineBreathPhase();
}

async function triggerLowMoodAI() {
  if (state.lowMoodAIResponse) return;
  // Use scripted response for low mood — safer than generative AI during distress
  const ai = getScriptedResponse();
  if (ai) {
    state.lowMoodAIResponse = ai;
    renderTodayTop();
  }
}

// Progressive disclosure — calculate weeks since user started
function getUserWeekNumber() {
  const onboardDate = state.prefs?.onboardDate;
  if (!onboardDate) return 99; // No date recorded = show everything (existing user)
  const start = new Date(onboardDate);
  const now = new Date();
  const diffDays = Math.floor((now - start) / 86400000);
  return Math.floor(diffDays / 7) + 1; // Week 1 starts immediately
}

function renderTodayTab() {
  const scroll = document.getElementById('today-scroll');
  if (!scroll) return;

  const prefs = state.prefs;
  const td = state.todayData;
  const t = today();
  // Progressive disclosure — can be disabled in Settings
  const userWeek = (prefs?.progressiveDisclosure === false) ? 99 : getUserWeekNumber();

  let html = '<div id="today-top"></div>';

  // --- MOOD + SLEEP ---
  const moods = [
    { v: 0, e: '😔', l: 'Low' },
    { v: 1, e: '😕', l: 'Rough' },
    { v: 2, e: '😐', l: 'Okay' },
    { v: 3, e: '🙂', l: 'Good' },
    { v: 4, e: '😊', l: 'Great' },
    { v: -1, e: '🤷', l: 'Unsure' },
  ];
  const sleeps = [
    { v: 0, e: '😴', l: 'Rough' },
    { v: 1, e: '😪', l: 'Poor' },
    { v: 2, e: '😑', l: 'Okay' },
    { v: 3, e: '😌', l: 'Good' },
    { v: 4, e: '🌟', l: 'Great' },
  ];

  html += `<div class="card">
    <div class="card-title">🌤 How are you feeling?${infoIcon('mood')}</div>
    <div class="mood-row" id="mood-row" role="radiogroup" aria-label="How are you feeling?">
      ${moods.map(m => `<div class="mood-btn${td.mood === m.v ? ' selected' : ''}" onclick="logMood(${m.v})" role="radio" aria-checked="${td.mood === m.v}" aria-label="Mood: ${m.l}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();logMood(${m.v})}">
        <div class="mood-emoji" aria-hidden="true">${m.e}</div>
        <div class="mood-label">${m.l}</div>
      </div>`).join('')}
    </div>
    ${td.mood !== undefined ? `<div id="feelings-section">
      <div class="feelings-toggle" onclick="document.getElementById('feelings-row').style.display=document.getElementById('feelings-row').style.display==='none'?'flex':'none';this.textContent=document.getElementById('feelings-row').style.display==='none'?'What\\'s behind this? ▸':'What\\'s behind this? ▾'">
        What's behind this? ${(td.feelings && td.feelings.length) ? '▾' : '▸'}
      </div>
      <div class="feelings-row" id="feelings-row" style="display:${(td.feelings && td.feelings.length) ? 'flex' : 'none'}">
        ${getFeelingWords(td.mood).map(w => `<div class="feeling-pill${(td.feelings || []).includes(w) ? ' selected' : ''}" onclick="toggleFeeling('${w}')">${w}</div>`).join('')}
      </div>
    </div>` : ''}
    <div style="margin-top:14px">
      <div class="card-title" style="margin-bottom:8px">🌙 Sleep last night${infoIcon('sleep')}</div>
      <div class="sleep-row">
        ${sleeps.map(s => `<div class="sleep-btn${td.sleep === s.v ? ' selected' : ''}" onclick="logSleep(${s.v})" role="radio" aria-checked="${td.sleep === s.v}" aria-label="Sleep: ${s.l}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();logSleep(${s.v})}">
          <div class="sleep-emoji" aria-hidden="true">${s.e}</div>
          <span class="sleep-label">${s.l}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>`;

  // --- GENTLE MODE TOGGLE ---
  const isGentleMode = !!td.gentleMode;
  const isLowMoodDay = td.mood !== undefined && td.mood >= 0 && td.mood <= 1;
  if (!isLowMoodDay) {
    html += `<div onclick="toggleGentleMode()" style="
      display:flex;align-items:center;gap:10px;
      padding:10px 16px;margin-bottom:12px;cursor:pointer;
      background:${isGentleMode ? 'rgba(106,154,176,0.08)' : 'transparent'};
      border:1px solid ${isGentleMode ? 'rgba(106,154,176,0.2)' : 'rgba(255,255,255,0.06)'};
      border-radius:var(--r-md);transition:all 0.2s">
      <span style="font-size:16px">${isGentleMode ? '🌿' : '🍃'}</span>
      <div style="flex:1;font-size:13px;color:${isGentleMode ? 'var(--sky-light)' : 'var(--text-muted)'}">
        ${isGentleMode ? 'Gentle mode — showing less today' : 'Need a gentler day? Tap here'}
      </div>
      <div class="toggle${isGentleMode ? ' on' : ''}" style="pointer-events:none;transform:scale(0.8)"></div>
    </div>`;
  }

  // --- DAILY HABITS (grouped by time: AM / PM / Any) ---
  const dhPrefs = prefs?.dailyHabits || {};
  const htPrefs = prefs?.habitTimes || {};
  let allDailyHabits = DAILY_HABITS.filter(h => dhPrefs[h.id]);
  const medEnabled = !!dhPrefs.medication;

  // Adaptive difficulty: if mood is low (0 or 1) or gentle mode, show reduced list
  const isReducedDay = isLowMoodDay || isGentleMode;
  const showAllHabits = state._showAllHabitsOnHardDay;
  if (isReducedDay && !showAllHabits && allDailyHabits.length > 2) {
    if (isLowMoodDay) {
      html += `<div style="background:rgba(106,154,176,0.06);border:1px solid rgba(106,154,176,0.15);border-radius:var(--r-md);padding:12px 16px;margin-bottom:12px">
        <div style="font-size:13px;color:var(--sky-light);font-weight:500;margin-bottom:4px">Easy does it today</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:8px">Showing your top priorities. The rest can wait.</div>
        <div onclick="state._showAllHabitsOnHardDay=true;renderTodayTab()" style="font-size:12px;color:var(--text-secondary);cursor:pointer;text-decoration:underline">Show all habits</div>
      </div>`;
    }
    allDailyHabits = allDailyHabits.slice(0, 2);
  }

  // Collect AM habits
  const amHabits = allDailyHabits.filter(h => {
    const t2 = htPrefs[h.id] || 'any';
    return t2 === 'am' || t2 === 'both';
  });
  const medInAm = medEnabled && (htPrefs.medication === 'am' || htPrefs.medication === 'both');

  // Collect PM habits
  const pmHabits = allDailyHabits.filter(h => {
    const t2 = htPrefs[h.id] || 'any';
    return t2 === 'pm' || t2 === 'both';
  });
  const medInPm = medEnabled && (htPrefs.medication === 'pm' || htPrefs.medication === 'both');

  // Collect Any habits — default when no time preference is set
  const anyHabits = allDailyHabits.filter(h => {
    const t2 = htPrefs[h.id] || 'any';
    return t2 === 'any';
  });
  const medInAny = medEnabled && (!htPrefs.medication || htPrefs.medication === 'any');

  function dailyHabitRow(h, timeSlot) {
    const key = h.id + '_' + timeSlot;
    const done = td[key];
    const xp = h.xp || 15;
    const triggers = state.prefs?.habitTriggers || {};
    const trigger = triggers[h.id + '_' + timeSlot] || triggers[h.id] || '';
    const triggerHtml = trigger ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px;font-style:italic">${trigger}</div>` : '';
    return `<div class="habit-row" onclick="tapDailyHabit('${h.id}', '${timeSlot}', this)">
      <div class="habit-check${done ? ' done' : ''}">${done ? CHECK_SVG : h.icon}</div>
      <div class="habit-info"><div class="habit-name">${h.label}</div>${triggerHtml}</div>
      ${!done ? `<div class="habit-xp">+${xp}</div>` : ''}
    </div>`;
  }

  function medHabitRow(timeSlot) {
    const key = 'medication_' + timeSlot;
    const done = td[key];
    const triggers = state.prefs?.habitTriggers || {};
    const trigger = triggers['medication_' + timeSlot] || triggers['medication'] || '';
    const triggerHtml = trigger ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px;font-style:italic">${trigger}</div>` : '';
    return `<div class="habit-row" onclick="tapDailyHabit('medication', '${timeSlot}', this)">
      <div class="habit-check${done ? ' done' : ''}" style="${!done ? 'border-color:rgba(106,154,176,0.3)' : ''}">${done ? CHECK_SVG : '💊'}</div>
      <div class="habit-info">
        <div class="habit-name" style="color:var(--sky-light)">Medication</div>
        ${triggerHtml}
      </div>
      ${!done ? '<div class="habit-xp" style="background:rgba(106,154,176,0.15);border-color:rgba(106,154,176,0.3);color:var(--sky-light)">+20</div>' : ''}
    </div>`;
  }

  // --- MORNING SECTION ---
  if (amHabits.length > 0 || medInAm) {
    html += `<div class="section-label">🌅 Morning</div><div class="card mb-0">`;
    amHabits.forEach(h => { html += dailyHabitRow(h, 'am'); });
    if (medInAm) html += medHabitRow('am');
    html += `</div>`;
  }

  // --- EVENING SECTION ---
  if (pmHabits.length > 0 || medInPm) {
    html += `<div class="section-label">🌙 Evening</div><div class="card mb-0">`;
    pmHabits.forEach(h => { html += dailyHabitRow(h, 'pm'); });
    if (medInPm) html += medHabitRow('pm');
    html += `</div>`;
  }

  // --- ANYTIME SECTION ---
  if (anyHabits.length > 0 || medInAny) {
    html += `<div class="section-label"><span style="color:#f0c040">☀️</span> Anytime today</div><div class="card mb-0">`;
    anyHabits.forEach(h => { html += dailyHabitRow(h, 'any'); });
    if (medInAny) html += medHabitRow('any');
    html += `</div>`;
  }

  // --- Legacy support: show old teeth habits if user hasn't migrated yet ---
  if (!allDailyHabits.length && !medEnabled) {
    html += `<div class="section-label">🌅 Morning</div>
    <div class="card mb-0">`;
    html += habitRow('m_teeth', '🦷', 'Brush teeth', 'morning', td.m_teeth, prefs?.habits?.m_teeth !== false, 15);
    html += `</div>`;
    html += `<div class="section-label">🌙 Evening</div>
    <div class="card mb-0">`;
    html += habitRow('e_teeth', '🦷', 'Brush teeth', 'evening', td.e_teeth, prefs?.habits?.e_teeth !== false, 15);
    html += `</div>`;
  }

  // --- NOURISHMENT ---
  const waterCount = td.water || 0;
  const trackMeals = state.prefs?.habits?.track_meals;
  const foodDone = td.food || {};

  // Build food items based on mode
  const foodItems = trackMeals ? [
    { id: 'breakfast', label: '🌅 Breakfast' },
    { id: 'lunch',     label: '☀️ Lunch' },
    { id: 'dinner',    label: '🌙 Dinner' },
    { id: 'felt_nourished', label: '💚 Felt nourished' },
  ] : [
    { id: 'ate_meal',       label: '🍽 Ate a meal' },
    { id: 'had_veggies',    label: '🥦 Had veggies' },
    { id: 'felt_nourished', label: '💚 Felt nourished' },
  ];

  // XP threshold — 2 of the main items (not counting felt_nourished separately)
  const mainItems = foodItems.filter(f => f.id !== 'felt_nourished');
  const mainDone = mainItems.filter(f => foodDone[f.id]).length;
  const foodCount = Object.values(foodDone).filter(Boolean).length;

  html += `<div class="section-label">💧 Hydration & nourishment</div>`;

  // Water card
  const waterPct = Math.round((waterCount / 3) * 100);
  const thm = THEMES[state.prefs?.theme || 'forest'] || THEMES.forest;
  html += `<div class="card">
    <div class="card-title" style="margin-bottom:6px">💧 Hydration${infoIcon('hydration')}</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="flex:1;height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${waterPct}%;background:linear-gradient(90deg,var(--sage),var(--sage-light));border-radius:3px;transition:width 0.5s cubic-bezier(0.34,1.56,0.64,1)"></div>
      </div>
      <div style="font-size:12px;font-weight:600;color:${waterCount >= 3 ? 'var(--sage-light)' : 'var(--text-secondary)'};min-width:32px;text-align:right">${waterCount}/3</div>
    </div>
    <div class="water-bottles" id="water-bottles-row">
      ${[0,1,2].map(i => {
        const filled = i < waterCount;
        return `
      <div class="water-bottle${filled ? ' water-filled' : ''}" onclick="tapWater(${i})" aria-label="Water bottle ${i+1} of 3${filled ? ', filled' : ', empty'}" role="checkbox" aria-checked="${filled}" tabindex="0">
        <svg viewBox="0 0 56 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waterGrad${i}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${filled ? thm.primaryLight : '#3a3d30'}"/>
              <stop offset="100%" stop-color="${filled ? thm.primaryDim : '#252820'}"/>
            </linearGradient>
          </defs>
          <path d="M18 8 L14 22 Q10 28 10 38 L10 82 Q10 90 18 90 L38 90 Q46 90 46 82 L46 38 Q46 28 42 22 L38 8 Z" fill="url(#waterGrad${i})" stroke="${filled ? thm.primaryLight : '#3a3d30'}" stroke-width="1.5"/>
          <path d="M18 8 L38 8 L36 2 L20 2 Z" fill="${filled ? thm.primaryLight : '#3a3d30'}"/>
          ${filled ? `
            <path d="M10 50 Q18 46 28 50 Q38 54 46 50 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z" fill="rgba(var(--sage-rgb),0.4)">
              <animate attributeName="d" values="M10 50 Q18 46 28 50 Q38 54 46 50 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z;M10 50 Q18 54 28 50 Q38 46 46 50 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z;M10 50 Q18 46 28 50 Q38 54 46 50 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z" dur="3s" repeatCount="indefinite"/>
            </path>
            <path d="M10 58 Q20 54 28 58 Q36 62 46 58 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z" fill="rgba(var(--sage-rgb),0.25)">
              <animate attributeName="d" values="M10 58 Q20 54 28 58 Q36 62 46 58 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z;M10 58 Q20 62 28 58 Q36 54 46 58 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z;M10 58 Q20 54 28 58 Q36 62 46 58 L46 82 Q46 90 38 90 L18 90 Q10 90 10 82 Z" dur="2.5s" repeatCount="indefinite"/>
            </path>` : ''}
          ${!filled ? '<circle cx="28" cy="52" r="8" fill="none" stroke="#3a3d30" stroke-width="1" stroke-dasharray="3,3"/>' : ''}
        </svg>
      </div>`}).join('')}
    </div>
    ${waterCount >= 3
      ? '<div style="font-size:12px;color:var(--sage-light);margin-top:10px;text-align:center;animation:fadeSlideIn 0.3s ease">Hydrated! +10 ☀️</div>'
      : `<div style="font-size:12px;color:var(--text-muted);margin-top:10px;text-align:center">${waterCount === 0 ? 'Tap a bottle as you drink' : `${3 - waterCount} more to go`}</div>`}
  </div>`;

  // Food card
  html += `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div class="card-title" style="margin-bottom:0">🍽 Nourishment${mainDone >= 2 ? ' ✓' : ''}${infoIcon('nourishment')}</div>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;line-height:1.5;font-style:italic">
      ${trackMeals
        ? 'Not tracking what you eat — just a kind reminder that every meal is taking care of yourself.'
        : 'A gentle check-in. Nourishing yourself matters, however that looks today.'}
    </div>
    <div class="food-chips">
      ${foodItems.map(f => {
        const isFelt = f.id === 'felt_nourished';
        return `<div class="food-chip${foodDone[f.id] ? ' selected' : ''}${isFelt ? ' food-chip-felt' : ''}" onclick="tapFood('${f.id}')">${f.label}</div>`;
      }).join('')}
    </div>
    ${mainDone >= 2 ? '<div style="font-size:12px;color:var(--sage);margin-top:10px">+10 ☀️ earned 🌿</div>' : '<div style="font-size:12px;color:var(--text-muted);margin-top:10px">Check off 2 or more for +10 ☀️</div>'}
  </div>`;

  // --- SELF-CARE TASKS (grouped by morning/evening/anytime routines) ---
  // Progressive disclosure: self-care appears week 2+
  const selectedSCTasks = (state.prefs?.selfCareTasks || []).filter(id => !id.startsWith('sc_medication'));
  const routines = state.prefs?.selfCareRoutines || {};

  // Week 1 teaser for self-care
  if (selectedSCTasks.length > 0 && userWeek < 2) {
    html += `<div style="background:rgba(var(--sage-rgb),0.06);border:1px dashed rgba(var(--sage-rgb),0.2);border-radius:var(--r-lg);padding:16px;text-align:center;margin-top:8px">
      <div style="font-size:24px;margin-bottom:8px">💚</div>
      <div style="font-size:14px;color:var(--sage-light);font-family:Fraunces,serif;margin-bottom:4px">Self-care tasks coming next week</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.6">You picked some great ones during setup. They'll show up here once you've settled into your daily habits.</div>
      <div onclick="disableProgressiveDisclosure()" style="font-size:12px;color:var(--text-secondary);cursor:pointer;margin-top:8px;text-decoration:underline">Show me everything now</div>
    </div>`;
  }

  if (selectedSCTasks.length > 0 && userWeek >= 2) {
    const scDone = td.selfCare || {};

    // Group tasks by routine
    const morningTasks = selectedSCTasks.filter(id => routines[id] === 'morning');
    const eveningTasks = selectedSCTasks.filter(id => routines[id] === 'evening');
    const anytimeTasks = selectedSCTasks.filter(id => !routines[id] || routines[id] === 'anytime');

    function renderSCTaskRows(taskIds) {
      let out = '';
      taskIds.forEach(id => {
        const task = SELF_CARE_TASKS.find(t2 => t2.id === id);
        if (!task) return;
        const done = scDone[id];
        out += `<div class="habit-row" onclick="tapSelfCare('${id}', this)">
          <div class="habit-check${done ? ' done' : ''}">${done ? CHECK_SVG : task.icon}</div>
          <div class="habit-info"><div class="habit-name">${task.label}</div></div>
          ${!done ? '<div class="habit-xp">+10</div>' : ''}
        </div>`;
      });
      return out;
    }

    // Morning routine
    if (morningTasks.length > 0) {
      html += `<div class="section-label">☀️ Morning routine</div><div class="card">${renderSCTaskRows(morningTasks)}</div>`;
    }

    // Evening routine
    if (eveningTasks.length > 0) {
      html += `<div class="section-label">🌙 Evening routine</div><div class="card">${renderSCTaskRows(eveningTasks)}
        <div class="habit-row" onclick="openWindDown()" style="border-top:1px solid rgba(255,255,255,0.05);margin-top:4px;padding-top:8px">
          <div class="habit-check" style="color:var(--sky)">🌙</div>
          <div class="habit-info"><div class="habit-name" style="color:var(--sky-light)">Evening wind-down flow</div><div style="font-size:11px;color:var(--text-muted)">Mood, journal, breathe, goodnight</div></div>
          <div style="font-size:16px;color:var(--text-muted)">›</div>
        </div>
      </div>`;
    }

    // Anytime / ungrouped self-care
    if (anytimeTasks.length > 0) {
      html += `<div class="section-label">💚 Self-care</div><div class="card">${renderSCTaskRows(anytimeTasks)}</div>`;
    }
  }

  // --- WELLNESS GATEWAY CARD (week 3+) ---
  const journalToday = getJournalEntries(t).length > 0;
  const winsToday = (state.wellnessData?.wins?.[t] || []).length > 0;
  const affirmationsExist = (state.todayData?.affirmations || []).length > 0;
  const wellnessDone = [journalToday, winsToday, affirmationsExist].filter(Boolean).length;

  if (userWeek < 3) {
    // Week 1-2: Show a gentle teaser instead of the full wellness card
    html += `<div style="background:rgba(var(--sage-rgb),0.06);border:1px dashed rgba(var(--sage-rgb),0.2);border-radius:var(--r-lg);padding:16px;text-align:center;margin-top:8px">
      <div style="font-size:24px;margin-bottom:8px">📓</div>
      <div style="font-size:14px;color:var(--sage-light);font-family:Fraunces,serif;margin-bottom:4px">Journaling unlocks soon</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.6">Focus on building your daily habits first. Journaling, small wins, and affirmations will appear here when you're ready.</div>
      <div onclick="disableProgressiveDisclosure()" style="font-size:12px;color:var(--text-secondary);cursor:pointer;margin-top:8px;text-decoration:underline">Show me everything now</div>
    </div>`;
  } else {

  html += `<div class="section-label">📓 Wellness</div>`;
  const wellnessAllDone = wellnessDone === 3;
  const badgeColor = wellnessAllDone ? 'var(--sage-light)' : (wellnessDone > 0 ? 'var(--amber-light)' : 'var(--text-muted)');
  const badgeBg = wellnessAllDone ? 'rgba(var(--sage-rgb),0.2)' : (wellnessDone > 0 ? 'rgba(186,156,124,0.2)' : 'rgba(255,255,255,0.06)');
  html += `<div class="card" onclick="switchTab('wellness')" style="cursor:pointer">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:15px;font-weight:500">Wellness</div>
      <div style="font-size:11px;font-weight:600;color:${badgeColor};background:${badgeBg};padding:3px 12px;border-radius:99px">${wellnessAllDone ? '✓ Done' : wellnessDone + ' of 3'}</div>
    </div>
    <div style="font-size:13px;color:var(--cream);font-style:italic;line-height:1.5;margin-bottom:10px">${getJournalPrompt()}</div>
    <div style="font-size:12px;display:flex;gap:14px;flex-wrap:wrap">
      <span style="color:${journalToday ? 'var(--sage-light)' : 'var(--text-muted)'}">${journalToday ? '✓' : '○'} Journal</span>
      <span style="color:${winsToday ? 'var(--sage-light)' : 'var(--text-muted)'}">${winsToday ? '✓' : '○'} Small wins</span>
      <span style="color:${affirmationsExist ? 'var(--sage-light)' : 'var(--text-muted)'}">${affirmationsExist ? '✓' : '○'} Affirmations</span>
    </div>
  </div>`;

  // Quick breathe section at bottom of Today
  html += `<div class="section-label">🌬 Take a breath</div>
  <div style="background:linear-gradient(135deg,rgba(106,154,176,0.12),rgba(106,154,176,0.05));border:1px solid rgba(106,154,176,0.25);border-radius:var(--r-lg);padding:18px 16px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="font-size:18px">🌬</span>
      <div style="font-family:Fraunces,serif;font-size:15px;font-weight:400;color:var(--sky-light)">Take a breath${infoIcon('breathing')}</div>
      <div style="margin-left:auto;font-size:11px;color:var(--sky);background:rgba(106,154,176,0.15);padding:2px 8px;border-radius:99px">4-7-8</div>
    </div>
    <div style="font-size:13px;color:rgba(158,196,216,0.7);margin-bottom:14px;font-style:italic">Here whenever you need it — no streak, no pressure</div>
    <div style="text-align:center"><button class="btn" style="background:rgba(106,154,176,0.25);border:1px solid rgba(106,154,176,0.4);color:var(--sky-light)" onclick="switchTab('wellness');setTimeout(()=>scrollToBreath(),300)">Begin breathing exercise</button></div>
  </div>`;

  } // end progressive disclosure week 3+ gate

  // Custom check-ins
  const customCheckins = getCustomCheckins();
  if (customCheckins.length > 0) {
    html += `<div class="card">
      <div class="card-title">📝 My check-ins</div>`;
    const ccData = td.customCheckins || {};
    customCheckins.forEach(cc => {
      const val = ccData[cc.id];
      if (cc.type === 'yesno') {
        html += `<div class="toggle-row" style="padding:8px 0">
          <div class="toggle-label">${cc.name}</div>
          <div style="display:flex;gap:6px">
            <div onclick="logCustomCheckin('${cc.id}',true)" style="padding:5px 14px;border-radius:99px;cursor:pointer;font-size:12px;
              background:${val === true ? 'rgba(var(--sage-rgb),0.25)' : 'rgba(255,255,255,0.04)'};
              border:1px solid ${val === true ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)'};
              color:${val === true ? 'var(--sage-light)' : 'var(--text-muted)'}">Yes</div>
            <div onclick="logCustomCheckin('${cc.id}',false)" style="padding:5px 14px;border-radius:99px;cursor:pointer;font-size:12px;
              background:${val === false ? 'rgba(176,120,120,0.2)' : 'rgba(255,255,255,0.04)'};
              border:1px solid ${val === false ? 'rgba(176,120,120,0.4)' : 'rgba(255,255,255,0.08)'};
              color:${val === false ? 'var(--rose-light)' : 'var(--text-muted)'}">No</div>
          </div>
        </div>`;
      } else if (cc.type === 'scale') {
        html += `<div style="padding:8px 0">
          <div style="font-size:13px;color:var(--cream);margin-bottom:6px">${cc.name}</div>
          <div style="display:flex;gap:4px">
            ${[1,2,3,4,5].map(v => `<div onclick="logCustomCheckin('${cc.id}',${v})" style="
              width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
              cursor:pointer;font-size:13px;font-weight:500;transition:all 0.15s;
              background:${val === v ? 'rgba(var(--sage-rgb),0.3)' : 'rgba(255,255,255,0.04)'};
              border:1px solid ${val === v ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)'};
              color:${val === v ? 'var(--sage-light)' : 'var(--text-muted)'}">${v}</div>`).join('')}
          </div>
        </div>`;
      } else if (cc.type === 'number') {
        html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
          <div style="font-size:13px;color:var(--cream);flex:1">${cc.name}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <div onclick="logCustomCheckin('${cc.id}',Math.max(0,(${val || 0})-1))" class="stepper-btn" style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--text-secondary);cursor:pointer;font-size:14px">−</div>
            <div style="min-width:28px;text-align:center;font-size:15px;font-weight:500;color:var(--cream)">${val || 0}</div>
            <div onclick="logCustomCheckin('${cc.id}',(${val || 0})+1)" class="stepper-btn" style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--text-secondary);cursor:pointer;font-size:14px">+</div>
          </div>
        </div>`;
      }
    });
    html += `</div>`;
  }

  // Subtle share nudge at bottom of Today
  html += `<div style="text-align:center;padding:12px 0 20px">
    <button onclick="shareApp()" style="background:none;border:none;font-size:12px;color:var(--text-muted);cursor:pointer;font-family:Fraunces,serif;font-style:italic">
      Know someone who needs bloom? Share it 🌿
    </button>
  </div>`;

  scroll.innerHTML = html;
  renderTodayTop();
  checkAllDone();

  // Low mood AI trigger
  if (state.todayData.mood !== undefined && state.todayData.mood >= 0 && state.todayData.mood <= 1 && checkYesterdayLowMood() && !state.lowMoodAIResponse) {
    triggerLowMoodAI();
  }
}

function habitRow(id, icon, name, sub, done, optedIn, xp) {
  if (!optedIn) {
    return `<div class="habit-row opted-out" onclick="activateHabit('${id}')">
      <div class="habit-check opted-out-check">${icon}</div>
      <div class="habit-info">
        <div class="habit-name">${name}</div>
        <div class="habit-sub" style="color:var(--text-muted)">Tap to activate</div>
      </div>
    </div>`;
  }
  const trigger = state.prefs?.habitTriggers?.[id] || '';
  const triggerHtml = trigger ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px;font-style:italic">${trigger}</div>` : '';
  return `<div class="habit-row" onclick="tapHabit('${id}', this)">
    <div class="habit-check${done ? ' done' : ''}">${done ? CHECK_SVG : icon}</div>
    <div class="habit-info">
      <div class="habit-name">${name}</div>
      <div class="habit-sub">${sub}${done ? ' · Done ✓' : ''}</div>
      ${triggerHtml}
    </div>
    ${!done ? `<div class="habit-xp">+${xp}</div>` : ''}
  </div>`;
}

function tapHabit(id, el) {
  toggleHabit(id, el);
}

function tapWeeklyHabit(id, action, el) {
  toggleWeeklyHabit(id, action, el);
}

function tapHouseholdTask(id, el) {
  const check = el.querySelector('.habit-check');
  toggleHouseholdTask(id, check || el);
}

function tapSelfCare(id, el) {
  if (!state.todayData.selfCare) state.todayData.selfCare = {};
  const wasDone = state.todayData.selfCare[id];
  state.todayData.selfCare[id] = !wasDone;

  if (!wasDone) {
    addXP(10, el);
    checkFirstTaskStreak();
    celebrate(getSelfCareCelebType(id), el);
  } else {
    state.xpData.total = Math.max(0, (state.xpData.total || 0) - 10);
    haptic('light');
    saveState();
    updateProgressTab();
  }

  saveState();
  archiveToday();
  renderTodayTab();
}

function getSelfCareCelebType(id) {
  if (id.startsWith('sc_medication')) return 'sc_medication';
  const cat = SELF_CARE_CATEGORIES.find(c => c.tasks.some(t => t.id === id));
  if (!cat) return 'sc_body';
  const map = { body: 'sc_body', morning_moments: 'sc_morning', movement: 'sc_movement', connection: 'sc_connection', wind_down: 'sc_wind_down' };
  return map[cat.id] || 'sc_body';
}

function getFeelingWords(mood) {
  if (mood === 0 || mood === 1) return ['anxious','lonely','overwhelmed','grieving','frustrated','numb','exhausted','hopeless'];
  if (mood === 2) return ['restless','meh','uncertain','recovering','distracted','neutral'];
  if (mood === 3 || mood === 4) return ['grateful','peaceful','energized','connected','proud','hopeful','content','relieved'];
  if (mood === -1) return ['confused','mixed','disconnected','foggy'];
  return [];
}

function toggleFeeling(word) {
  if (!state.todayData.feelings) state.todayData.feelings = [];
  const idx = state.todayData.feelings.indexOf(word);
  if (idx >= 0) state.todayData.feelings.splice(idx, 1);
  else state.todayData.feelings.push(word);
  saveState();
  archiveToday();
  // Update pill in-place without full re-render
  if (event && event.target) event.target.classList.toggle('selected');
  haptic('light');

  // Clinical safety: if user selects "hopeless" or 3+ low-mood feelings, gently surface crisis resources
  const f = state.todayData.feelings || [];
  const heavyWords = ['hopeless', 'numb', 'exhausted', 'grieving'];
  const selectedHeavy = f.filter(w => heavyWords.includes(w));
  if (f.includes('hopeless') || selectedHeavy.length >= 3) {
    if (!state._crisisNudgeShownToday) {
      state._crisisNudgeShownToday = true;
      setTimeout(() => {
        showCrisisFeelingsNudge();
      }, 600);
    }
  }
}

function showCrisisFeelingsNudge() {
  // Gentle, non-intrusive nudge — not a modal, just a toast-like message
  const existing = document.getElementById('crisis-feelings-nudge');
  if (existing) existing.remove();
  const nudge = document.createElement('div');
  nudge.id = 'crisis-feelings-nudge';
  nudge.setAttribute('role', 'status');
  nudge.setAttribute('aria-live', 'polite');
  nudge.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:380px;background:rgba(106,154,176,0.15);border:1px solid rgba(106,154,176,0.3);border-radius:16px;padding:14px 16px;z-index:9999;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:fadeIn 0.3s ease';
  nudge.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="font-size:20px;flex-shrink:0">🤍</div>
      <div style="flex:1">
        <div style="font-size:13px;color:var(--sky-light);line-height:1.6;margin-bottom:8px">It sounds like you're carrying a lot right now. The 🤍 is always here if you need it.</div>
        <div style="display:flex;gap:8px">
          <button onclick="this.closest('#crisis-feelings-nudge').remove();openCrisisSheet()" class="btn btn-sm" style="background:rgba(106,154,176,0.25);border:1px solid rgba(106,154,176,0.4);color:var(--sky-light);font-size:12px">Support resources</button>
          <button onclick="this.closest('#crisis-feelings-nudge').remove()" class="btn btn-ghost btn-sm" style="font-size:12px;color:var(--text-muted)">I'm okay</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(nudge);
  setTimeout(() => { const el = document.getElementById('crisis-feelings-nudge'); if (el) el.remove(); }, 15000);
}

function logMood(val) {
  const wasLow = state.todayData.mood !== undefined && state.todayData.mood >= 0 && state.todayData.mood <= 2;
  const prevMood = state.todayData.mood;
  state.todayData.mood = val;
  trackFeature('mood_log');
  // Clear feelings if mood changed
  if (prevMood !== val) state.todayData.feelings = [];
  saveState();
  archiveToday();
  haptic('light');
  checkFirstTaskStreak();
  renderTodayTab();
  const btnIndex = val === -1 ? 5 : val;
  bounceMoodBtn(btnIndex);
  const moodEl = document.querySelectorAll('.mood-btn')[btnIndex];
  celebrate('mood', moodEl);
  if (val >= 0 && val <= 2 && !wasLow) showAffirmation('mood');
  scheduleBuddySync();
}

function logSleep(val) {
  state.todayData.sleep = val;
  saveState();
  archiveToday();
  haptic('light');
  checkFirstTaskStreak();
  const sleepEl = document.querySelectorAll('.sleep-btn')[val];
  celebrate('sleep', sleepEl);
  renderTodayTab();
}

function tapWater(i) {
  const cur = state.todayData.water || 0;
  if (i + 1 === cur) {
    // Deselecting — no sound or a soft low tick
    state.todayData.water = cur - 1;
    haptic('light');
  } else {
    state.todayData.water = Math.max(cur, i + 1);
    haptic('light');
    animateWaterBottle(i);
    // Play rising tone per bottle — 1=low, 2=mid, 3=high+chord
    const bottleSounds = ['water_1', 'water_2', 'water_3'];
    playSound(bottleSounds[i] || 'water');
  }
  checkFirstTaskStreak();
  const newCount = state.todayData.water;
  if (newCount >= 3 && !state.todayData.waterXPGiven) {
    state.todayData.waterXPGiven = true;
    addXP(10, null);
    setTimeout(() => {
      const wEl = document.getElementById('water-bottles-row');
      celebrate('water', wEl);
    }, 200);
  }
  saveState();
  archiveToday();
  renderTodayTab();
}

function tapFood(id) {
  if (!state.todayData.food) state.todayData.food = {};
  const wasSelected = state.todayData.food[id];
  state.todayData.food[id] = !wasSelected;

  // Count only main items (not felt_nourished) for XP threshold
  const food = state.todayData.food;
  const mainCount = Object.entries(food)
    .filter(([k, v]) => v && k !== 'felt_nourished').length;

  haptic('light');
  checkFirstTaskStreak();
  saveState();
  archiveToday();
  renderTodayTab();

  if (!wasSelected) {
    if (mainCount >= 2 && !state.todayData.foodXPGiven) {
      state.todayData.foodXPGiven = true;
      addXP(10, null);
      saveState();
    }
    setTimeout(() => {
      const el = document.querySelector('.food-chips');
      celebrate('food', el);
    }, 50);
  }
}

function activateHabit(id) {
  if (!state.prefs.habits) state.prefs.habits = {};
  state.prefs.habits[id] = true;
  save('bloom_prefs', state.prefs);
  renderTodayTab();
}

// ============================================================
//  WEEKLY TAB

export { renderTodayTab, renderTodayTop, logMood, logSleep, tapWater, tapFood,
  tapHabit, tapWeeklyHabit, tapHouseholdTask, tapSelfCare, activateHabit,
  toggleInlineBreathe, stopInlineBreathing, inlineContinueBreathing,
  triggerLowMoodAI, getFeelingWords, toggleFeeling, showCrisisFeelingsNudge };

window.renderTodayTab = renderTodayTab;
window.logMood = logMood;
window.logSleep = logSleep;
window.tapWater = tapWater;
window.tapFood = tapFood;
window.tapHabit = tapHabit;
window.tapWeeklyHabit = tapWeeklyHabit;
window.tapHouseholdTask = tapHouseholdTask;
window.tapSelfCare = tapSelfCare;
window.activateHabit = activateHabit;
window.toggleInlineBreathe = toggleInlineBreathe;
window.stopInlineBreathing = stopInlineBreathing;
window.inlineContinueBreathing = inlineContinueBreathing;
window.triggerLowMoodAI = triggerLowMoodAI;
window.toggleFeeling = toggleFeeling;
window.showCrisisFeelingsNudge = showCrisisFeelingsNudge;
