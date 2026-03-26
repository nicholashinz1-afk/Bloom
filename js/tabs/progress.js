import { state, today, getWeekDates, formatDateLabel, getDayIndex, dayOfWeek, saveState, getJournalEntries } from '../state.js';
import { save, load } from '../storage.js';
import { haptic, escapeHtml } from '../utils.js';
import { LEVELS, DAILY_HABITS, MEDICATION_HABIT, SELF_CARE_TASKS } from '../constants.js';
import { getLevel, getNextLevel, buildFlowerSVG } from '../xp.js';
import { buildStreakTreeSVG } from '../streaks.js';
import { getMoodPattern, getMoodHabitCorrelation, shareWeekInReview } from '../features/mood.js';
import { callClaude, renderAIResponseHTML, showThinking } from '../ai.js';
import { bloomIcon } from '../icons.js';
import { infoIcon, openSheet } from '../sheets.js';
import { getSeasonalInsights } from '../seasonal.js';
import { trackFeature } from '../telemetry.js';
function renderProgressTab() {
  const scroll = document.getElementById('progress-scroll');
  if (!scroll) return;

  const xp = state.xpData;
  const total = xp.total || 0;
  const daysShowedUp = xp.daysShowedUp || 0;
  const currentRun = xp.currentRun || 0;
  const level = getLevel(total);
  const nextLevel = getNextLevel(total);
  const pct = nextLevel ? Math.round(((total - level.min) / (nextLevel.min - level.min)) * 100) : 100;

  let html = '';

  // XP + Level card
  html += `<div class="card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="font-size:40px">${level.emoji}</div>
      <div style="flex:1">
        <div style="font-family:Fraunces,serif;font-size:22px;font-weight:300;color:var(--cream)">${level.name}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">${total} sunlight total</div>
      </div>
    </div>
    <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
    ${nextLevel ? `<div style="display:flex;justify-content:space-between;margin-top:6px">
      <div style="font-size:11px;color:var(--text-muted)">${total - level.min} / ${nextLevel.min - level.min} sunlight</div>
      <div style="font-size:11px;color:var(--text-muted)">Next: ${nextLevel.name} ${nextLevel.emoji}</div>
    </div>` : `<div style="font-size:12px;color:var(--sage);text-align:center;margin-top:6px">Maximum level reached 🌟</div>`}
  </div>`;

  // Days shown up + current run
  html += `<div style="display:flex;gap:10px;margin-bottom:12px">
    <div class="card mb-0" style="flex:1.5;text-align:center;padding:14px 10px">
      <div style="font-size:26px">🌿</div>
      <div style="font-family:Fraunces,serif;font-size:28px;font-weight:300;color:var(--cream);margin:4px 0">${daysShowedUp}</div>
      <div style="font-size:11px;color:var(--text-secondary)">Days you've shown up</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:4px">This number only goes up</div>
    </div>
    <div class="card mb-0" style="flex:1;text-align:center;padding:14px 10px">
      <div style="font-size:26px">🌱</div>
      <div style="font-family:Fraunces,serif;font-size:28px;font-weight:300;color:var(--sage-light);margin:4px 0">${currentRun}</div>
      <div style="font-size:11px;color:var(--text-secondary)">Current run</div>
    </div>
  </div>`;

  // Early days encouragement — show warm message for first week
  if (daysShowedUp < 7) {
    html += `<div style="text-align:center;padding:6px 16px 10px">
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:13px;color:var(--text-muted);line-height:1.7">Your story is just beginning. Check back after a few days — bloom tracks your patterns so you don't have to.</div>
    </div>`;
  }

  // Rolling week visual
  const weekDates = getWeekDates();
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const todayStr = today();

  html += `<div class="card" style="padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="card-title" style="margin-bottom:0">This week</div>
      <div style="font-size:11px;color:var(--text-muted)">${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
    </div>
    <div class="week-bar" style="margin-bottom:16px">`;

  weekDates.forEach((d, i) => {
    const hist = state.historyData[d] || {};
    const isToday = d === todayStr;
    const moodEmoji = hist.mood !== undefined ? (hist.mood === -1 ? '🤷' : ['😔','😕','😐','🙂','😊'][hist.mood]) : '';
    let dotClass = '';
    if (hist.habits) {
      const done = Object.values(hist.habits).filter(Boolean).length;
      const total2 = Object.keys(hist.habits).length;
      if (done === total2 && total2 > 0) dotClass = 'full';
      else if (done > 0) dotClass = 'partial';
      else dotClass = 'missed';
    }
    if (isToday) dotClass += ' today';
    html += `<div class="week-day-dot">
      <div class="week-dot ${dotClass}">${moodEmoji || (isToday ? '○' : '')}</div>
      <div class="week-day-label">${dayLabels[i]}</div>
    </div>`;
  });

  html += `</div>`;

  // Habit completion bars for the week
  const habitRows = [];
  // New daily habits
  const dhP3 = state.prefs?.dailyHabits || {};
  const htP3 = state.prefs?.habitTimes || {};
  [...DAILY_HABITS, ...(dhP3.medication ? [MEDICATION_HABIT] : [])].forEach(h => {
    if (!dhP3[h.id]) return;
    const time = htP3[h.id] || h.defaultTime || 'any';
    if (time === 'am' || time === 'both') habitRows.push({ key: h.id + '_am', icon: h.icon, label: h.label + ' (AM)', daily: true });
    if (time === 'pm' || time === 'both') habitRows.push({ key: h.id + '_pm', icon: h.icon, label: h.label + ' (PM)', daily: true });
    if (time === 'any') habitRows.push({ key: h.id + '_any', icon: h.icon, label: h.label, daily: true });
  });
  // Legacy teeth if no new habits
  if (!Object.values(dhP3).some(Boolean)) {
    if (state.prefs?.habits?.m_teeth !== false) habitRows.push({ key: 'm_teeth', icon: '🦷', label: 'Morning brush', daily: true });
    if (state.prefs?.habits?.e_teeth !== false) habitRows.push({ key: 'e_teeth', icon: '🦷', label: 'Evening brush', daily: true });
  }
  // Weekly habits
  [
    { key: 'w_exercise', icon: '💪', label: 'Exercise',  daily: false },
    { key: 'w_shower',   icon: '🚿', label: 'Shower',    daily: false },
    { key: 'w_outside',  icon: '🌿', label: 'Go outside', daily: false },
    { key: 'w_therapy',  icon: '🛋️', label: 'Go to therapy', daily: false },
  ].filter(h => state.prefs?.habits?.[h.key] !== false).forEach(h => habitRows.push(h));

  habitRows.forEach(h => {
    if (h.daily) {
      // Daily — show dot per day
      const dots = weekDates.map(d => {
        const done = state.historyData[d]?.habits?.[h.key];
        const isToday = d === todayStr;
        return `<div style="width:10px;height:10px;border-radius:50%;background:${done ? 'var(--sage)' : isToday ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'};transition:background 0.3s"></div>`;
      }).join('');
      html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:14px;width:20px;text-align:center">${h.icon}</span>
        <div style="font-size:12px;color:var(--text-secondary);width:110px;flex-shrink:0">${h.label}</div>
        <div style="display:flex;gap:6px;align-items:center">${dots}</div>
      </div>`;
    } else {
      // Weekly — show count vs goal bar
      const count = state.weekData?.[h.key] || 0;
      const goal = state.prefs?.goals?.[h.key] || 3;
      const pct2 = Math.min(100, Math.round((count / goal) * 100));
      html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:14px;width:20px;text-align:center">${h.icon}</span>
        <div style="font-size:12px;color:var(--text-secondary);width:110px;flex-shrink:0">${h.label}</div>
        <div style="flex:1;height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct2}%;background:${pct2 >= 100 ? 'var(--sage)' : 'var(--sage-dim)'};border-radius:3px;transition:width 0.4s ease"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);width:32px;text-align:right">${count}/${goal}</div>
      </div>`;
    }
  });

  // Rolling AI sentence — cached per day so it doesn't regenerate constantly
  const rollingKey = `bloom_rolling_${todayStr}`;
  const rollingText = load(rollingKey, null);
  html += `<div id="rolling-insight-text" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);font-family:Fraunces,serif;font-style:italic;font-size:13px;color:var(--text-secondary);line-height:1.6">
    ${rollingText || '<span style="opacity:0.4">bloom will reflect on your week as it unfolds...</span>'}
  </div>`;

  html += `</div>`;

  // Mood gradient chart
  const moodColors = ['#8296a6','#91a7a0','#a4a78e','#bfab82','#d9c9a0'];
  const moodEmojisWeek = ['😔','😕','😐','🙂','😊'];
  const noMoodColor = 'rgba(255,255,255,0.04)';

  const weekMoodStops = weekDates.map((d, i) => {
    const hist = state.historyData[d] || {};
    const mood = hist.mood;
    const pct = (i / 6 * 100).toFixed(1);
    if (mood === undefined || mood < 0) return `${noMoodColor} ${pct}%`;
    return `${moodColors[mood]} ${pct}%`;
  }).join(', ');

  html += `<div class="card">
    <div class="card-title">Mood this week</div>
    <div style="height:24px;border-radius:12px;background:linear-gradient(to right, ${weekMoodStops});box-shadow:0 1px 4px rgba(0,0,0,0.15);margin-bottom:10px"></div>
    <div style="display:flex;gap:8px;padding:0 4px">`;
  weekDates.forEach((d, i) => {
    const hist = state.historyData[d] || {};
    const mood = hist.mood;
    const emoji = (mood !== undefined && mood >= 0) ? moodEmojisWeek[mood] : (mood === -1 ? '🤷' : '');
    html += `<div style="flex:1;text-align:center">
      <div style="font-size:14px;line-height:1;margin-bottom:4px;min-height:14px">${emoji}</div>
      <div style="font-size:9px;color:var(--text-muted)">${dayLabels[i]}</div>
    </div>`;
  });
  html += `</div></div>`;

  // Sleep quality chart — matches mood chart visual pattern
  const sleepEmojis = ['😴','😪','😑','😌','🌟'];
  const sleepLabels2 = ['Rough','Poor','Okay','Good','Great'];

  html += `<div class="card">
    <div class="card-title">Sleep this week</div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:80px;padding:0 4px">`;

  weekDates.forEach((d, i) => {
    const hist = state.historyData[d] || {};
    const sleep = hist.sleep;
    const hasSleep = sleep !== undefined;
    const barHeight = hasSleep ? ((sleep + 1) / 5 * 100) : 8;
    const barColor = hasSleep ? 'var(--sky)' : 'rgba(255,255,255,0.05)';
    const emoji = hasSleep ? sleepEmojis[sleep] : '';
    const label = hasSleep ? sleepLabels2[sleep] : '';

    html += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end">
      ${hasSleep ? `<div style="font-size:11px;line-height:1" title="${label}">${emoji}</div>` : ''}
      <div style="width:100%;height:${barHeight}%;background:${barColor};border-radius:4px 4px 0 0;transition:height 0.5s cubic-bezier(0.34,1.56,0.64,1);min-height:4px"></div>
    </div>`;
  });

  html += `</div>
    <div style="display:flex;gap:8px;padding:4px 4px 0">`;
  weekDates.forEach((_, i) => {
    html += `<div style="flex:1;text-align:center;font-size:9px;color:var(--text-muted)">${dayLabels[i]}</div>`;
  });
  html += `</div></div>`;

  // 30-day gradient flow overview
  const thirtyDays = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const hist = state.historyData[dStr] || {};
    let habitPct = 0;
    if (hist.habits) {
      const vals = Object.values(hist.habits).filter(v => typeof v === 'boolean');
      const doneCount = vals.filter(Boolean).length;
      habitPct = vals.length > 0 ? doneCount / vals.length : 0;
    }
    thirtyDays.push({ dStr, mood: hist.mood, sleep: hist.sleep, habitPct });
  }

  // Build gradient strings for each metric
  const noDataColor = 'rgba(255,255,255,0.04)';
  const moodStops = thirtyDays.map((day, i) => {
    const pct = (i / 29 * 100).toFixed(1);
    if (day.mood === undefined || day.mood < 0) return `${noDataColor} ${pct}%`;
    return `${moodColors[day.mood]} ${pct}%`;
  }).join(', ');

  const sleepStops = thirtyDays.map((day, i) => {
    const pct = (i / 29 * 100).toFixed(1);
    if (day.sleep === undefined) return `${noDataColor} ${pct}%`;
    const opacity = 0.25 + (day.sleep / 4) * 0.75;
    return `rgba(106,154,176,${opacity.toFixed(2)}) ${pct}%`;
  }).join(', ');

  const habitStops = thirtyDays.map((day, i) => {
    const pct = (i / 29 * 100).toFixed(1);
    if (day.habitPct === 0) return `${noDataColor} ${pct}%`;
    const opacity = 0.25 + day.habitPct * 0.75;
    return `rgba(122,158,126,${opacity.toFixed(2)}) ${pct}%`;
  }).join(', ');

  const flowRows = [
    { label: 'Mood', gradient: moodStops, swatch: '#d9c9a0' },
    { label: 'Sleep', gradient: sleepStops, swatch: '#6a9ab0' },
    { label: 'Habits', gradient: habitStops, swatch: '#7a9e7e' },
  ];

  html += `<div class="card">
    <div class="card-title">Your 30-day flow</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">How your mood, sleep, and habits have flowed over the past month</div>`;

  flowRows.forEach(row => {
    html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:42px;font-size:11px;color:var(--text-secondary);flex-shrink:0">${row.label}</div>
      <div style="flex:1;height:14px;border-radius:7px;background:linear-gradient(to right, ${row.gradient});box-shadow:0 1px 4px rgba(0,0,0,0.15)"></div>
    </div>`;
  });

  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding-left:52px">
    <span style="font-size:9px;color:var(--text-muted)">30 days ago</span>
    <span style="font-size:9px;color:var(--text-muted)">Today</span>
  </div>`;

  html += `<div style="display:flex;gap:14px;justify-content:center;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04)">`;
  flowRows.forEach(row => {
    html += `<div style="display:flex;align-items:center;gap:5px">
      <div style="width:8px;height:8px;border-radius:4px;background:${row.swatch}"></div>
      <span style="font-size:10px;color:var(--text-muted)">${row.label}</span>
    </div>`;
  });
  html += `</div></div>`;

  // Mood-habit correlation insights + seasonal awareness
  const insightData = getMoodHabitCorrelation();
  const seasonalData = getSeasonalInsights();
  const allInsights = [...(insightData || []), ...seasonalData];
  if (allInsights.length > 0) {
    html += `<div class="card">
      <div class="card-title">Insights</div>`;
    allInsights.forEach(ins => {
      html += `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;padding:10px;background:rgba(106,154,176,0.06);border-radius:var(--r-md)">
        <div style="font-size:18px;flex-shrink:0">${ins.emoji}</div>
        <div>
          <div style="font-size:13px;color:var(--cream);font-weight:500">${ins.title}</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-top:2px">${ins.text}</div>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  // Wellness stats
  const journalCount = weekDates.filter(d => getJournalEntries(d).length > 0).length;
  const reflectCount = Object.keys(state.wellnessData?.reflections?.[weekStart()] || {}).length;
  const breathCount = state.wellnessData?.breathSessions || 0;
  const exerciseCount = state.weekData?.w_exercise || 0;

  html += `<div class="card">
    <div class="card-title">Wellness this week</div>
    <div class="stat-grid">
      <div class="stat-cell"><div class="stat-val">${journalCount}</div><div class="stat-name">Journal entries</div></div>
      <div class="stat-cell"><div class="stat-val">${reflectCount}</div><div class="stat-name">Reflections</div></div>
      <div class="stat-cell"><div class="stat-val">${breathCount}</div><div class="stat-name">Breath sessions</div></div>
      <div class="stat-cell"><div class="stat-val">${exerciseCount}</div><div class="stat-name">Workouts</div></div>
    </div>
  </div>`;

  // Share week in review button
  html += `<div style="text-align:center;padding:8px 0 20px">
    <button onclick="shareWeekInReview()" style="background:rgba(var(--sage-rgb),0.12);border:1px solid rgba(var(--sage-rgb),0.25);border-radius:var(--r-full);padding:10px 20px;color:var(--sage-light);font-size:13px;font-weight:500;cursor:pointer">
      Share my week 🌿
    </button>
  </div>`;

  scroll.innerHTML = html;
}

async function generateRollingInsight() {
  const t = today();
  const key = `bloom_rolling_${t}`;
  if (load(key, null)) return; // already generated today

  const weekDates = getWeekDates();
  const moodData = weekDates.map(d => state.historyData[d]?.mood).filter(m => m !== undefined && m >= 0);
  const avgMood = moodData.length > 0 ? (moodData.reduce((a,b) => a+b, 0) / moodData.length).toFixed(1) : null;
  const daysIn = moodData.length;
  const wd = state.weekData || {};
  const selfCare = [
    (wd.w_exercise || 0) > 0 ? 'exercised' : null,
    (wd.w_shower || 0) > 0 ? 'showered' : null,
    (wd.w_outside || 0) > 0 ? 'gone outside' : null,
    (wd.w_therapy || 0) > 0 ? 'went to therapy' : null,
  ].filter(Boolean);

  const ai = await callClaude(
    `Write ONE short sentence (max 20 words) for a wellness app's live week view. It's day ${daysIn} of the week. ${avgMood ? `Average mood so far: ${avgMood}/4.` : ''} ${selfCare.length > 0 ? `Self-care done: ${selfCare.join(', ')}.` : ''} Be warm and specific to what's happened. No filler phrases.`,
    'You are Bloom. One sentence only, max 20 words, warm and specific.'
  );
  if (ai) {
    save(key, ai);
    const el = document.getElementById('rolling-insight-text');
    if (el) el.innerHTML = escapeHtml(ai);
  }
}

function checkAutoGenerateInsight() {
  // Auto-generate weekly insight on Sundays
  if (dayOfWeek() !== 0) return;
  const ws = weekStart();
  const existing = state.wellnessData?.insights?.find(i => i.weekKey === ws);
  if (existing) return; // already generated this week
  // Delay so it doesn't fire before the app is fully loaded
  setTimeout(() => generateWeeklyInsight(null), 5000);
}

function updateProgressTab() {
  const panel = document.getElementById('tab-progress');
  if (panel && panel.classList.contains('active')) renderProgressTab();
}

// ============================================================
//  HISTORY TAB
// ============================================================
function renderHistoryTab() {
  const scroll = document.getElementById('history-scroll');
  if (!scroll) return;

  const history = state.historyData;
  const todayStr = today();
  const moodEmojis = ['😔','😕','😐','🙂','😊'];

  const dates = Object.keys(history)
    .filter(d => d !== todayStr)
    .sort((a,b) => b.localeCompare(a));

  if (dates.length === 0) {
    scroll.innerHTML = `<div class="card text-center" style="margin-top:32px">
      <div style="font-size:40px;margin-bottom:12px">📅</div>
      <div class="text-sm text-muted">Your history will appear here after your first full day. Keep going!</div>
    </div>`;
    return;
  }

  let html = '';
  let lastMonth = '';

  dates.forEach(d => {
    const date = new Date(d + 'T00:00:00');
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (monthLabel !== lastMonth) {
      html += `<div class="history-month-label">${monthLabel}</div>`;
      lastMonth = monthLabel;
    }

    const entry = history[d];
    const mood = entry.mood !== undefined ? (entry.mood === -1 ? '🤷' : moodEmojis[entry.mood]) : '○';
    const habits = entry.habits || {};
    const habitKeys = Object.keys(habits);
    const pips = habitKeys.slice(0,8).map(h =>
      `<div class="history-pip${habits[h] ? ' done' : ' missed'}"></div>`
    ).join('');
    const preview = entry.journal ? entry.journal.substring(0,50) + (entry.journal.length > 50 ? '...' : '') : '';

    html += `<div class="history-day" onclick="openHistoryDetail('${d}')">
      <div class="history-date-col">
        <div class="history-date-day">${date.getDate()}</div>
        <div class="history-date-month">${date.toLocaleDateString('en-US',{month:'short'})}</div>
      </div>
      <div class="history-mood">${mood}</div>
      <div class="history-info">
        <div class="history-pips">${pips}</div>
        <div class="history-journal-preview">${preview || 'No journal entry'}</div>
      </div>
      <div style="color:var(--text-muted);font-size:16px">›</div>
    </div>`;
  });

  scroll.innerHTML = html;
}

function openHistoryDetail(dateStr) {
  let entry = state.historyData[dateStr];

  // If no historyData entry, build a minimal one from wellnessData journal
  if (!entry) {
    const journalEntries = getJournalEntries(dateStr);
    if (journalEntries.length === 0) {
      // Create empty entry so user can retroactively fill in habits/self-care
      state.historyData[dateStr] = { habits: {} };
      entry = state.historyData[dateStr];
    } else {
      entry = { journalEntries };
    }
  } else if (!entry.journalEntries?.length && !entry.journal) {
    // historyData exists but has no journal — pull from wellnessData
    const journalEntries = getJournalEntries(dateStr);
    if (journalEntries.length > 0) entry = { ...entry, journalEntries };
  }

  const date = new Date(dateStr + 'T00:00:00');
  const moodEmojis = ['😔 Low','😕 Rough','😐 Okay','🙂 Good','😊 Great'];
  const sleepLabels = ['Rough','Poor','Okay','Good','Great'];

  let html = `<div style="font-family:Fraunces,serif;font-size:22px;font-weight:300;color:var(--cream);margin-bottom:4px">${date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>`;

  if (entry.mood !== undefined) {
    html += `<div style="font-size:24px;margin:12px 0 4px">${entry.mood === -1 ? '🤷 Unsure' : moodEmojis[entry.mood]}</div>`;
  }
  if (entry.sleep !== undefined) {
    html += `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Sleep: ${sleepLabels[entry.sleep]}</div>`;
  }

  html += '<div class="divider"></div>';

  const habits = entry.habits || {};
  const habitNames = {
    m_teeth:'Morning brush', e_teeth:'Evening brush', w_shower:'Shower', w_exercise:'Exercise', w_outside:'Go outside', w_therapy:'Go to therapy',
    brush_teeth_am:'Brush teeth (AM)', brush_teeth_pm:'Brush teeth (PM)',
    brush_hair_am:'Brush hair (AM)', brush_hair_pm:'Brush hair (PM)',
    wash_face_am:'Wash face (AM)', wash_face_pm:'Wash face (PM)',
    get_dressed_am:'Get dressed (AM)', get_dressed_pm:'Get dressed (PM)',
    floss_am:'Floss (AM)', floss_pm:'Floss (PM)',
    skincare_am:'Skincare (AM)', skincare_pm:'Skincare (PM)',
    medication_am:'Medication (AM)', medication_pm:'Medication (PM)', medication_any:'Medication',
    brush_teeth_any:'Brush teeth', brush_hair_any:'Brush hair', wash_face_any:'Wash face',
    get_dressed_any:'Get dressed', floss_any:'Floss', skincare_any:'Skincare',
  };

  // Build union of stored habit keys + user's currently configured habits
  const userHabitKeys = new Set();
  const dhPrefs = state.prefs?.dailyHabits || {};
  const htPrefs = state.prefs?.habitTimes || {};
  const allConfiguredHabits = [...DAILY_HABITS].filter(h => dhPrefs[h.id]);
  if (dhPrefs.medication) allConfiguredHabits.push(MEDICATION_HABIT);
  allConfiguredHabits.forEach(h => {
    const time = htPrefs[h.id] || h.defaultTime || 'any';
    if (time === 'both') {
      userHabitKeys.add(h.id + '_am');
      userHabitKeys.add(h.id + '_pm');
    } else if (time === 'am') {
      userHabitKeys.add(h.id + '_am');
    } else if (time === 'pm') {
      userHabitKeys.add(h.id + '_pm');
    } else {
      userHabitKeys.add(h.id + '_any');
    }
  });
  // Also include any keys already stored in this entry's history
  Object.keys(habits).forEach(k => { if (k in habitNames) userHabitKeys.add(k); });

  const habitKeys = [...userHabitKeys].filter(k => k in habitNames);

  if (habitKeys.length > 0) {
    html += `<div style="margin:12px 0">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Daily habits</div>
        <div style="font-size:11px;color:var(--text-muted);font-style:italic">Tap to update</div>
      </div>`;
    habitKeys.forEach(h => {
      const done = !!habits[h];
      html += `<div onclick="toggleHistoryHabit('${dateStr}','${h}',this)" style="display:flex;align-items:center;gap:8px;padding:7px 0;cursor:pointer;-webkit-tap-highlight-color:rgba(255,255,255,0.05)">
        <div style="width:20px;height:20px;border-radius:50%;background:${done?'var(--sage)':'rgba(255,255,255,0.08)'};border:${done?'none':'1.5px solid rgba(255,255,255,0.15)'};display:flex;align-items:center;justify-content:center;font-size:10px;color:${done?'var(--bg)':'var(--text-muted)'};transition:all 0.2s">${done?'✓':''}</div>
        <div style="font-size:14px;color:${done?'var(--text-primary)':'var(--text-muted)'};transition:color 0.2s">${habitNames[h]}</div>
      </div>`;
    });
    html += '</div><div class="divider"></div>';
  }

  // Self-care section: union of stored keys + user's currently enabled tasks
  const storedSelfCare = habits.selfCare || {};
  const enabledTasks = state.prefs?.selfCareTasks || [];
  const selfCareKeySet = new Set([...Object.keys(storedSelfCare), ...enabledTasks]);
  const selfCareTaskMap = {};
  SELF_CARE_TASKS.forEach(t => { selfCareTaskMap[t.id] = t; });
  const selfCareKeys = [...selfCareKeySet].filter(k => k in selfCareTaskMap);

  if (selfCareKeys.length > 0) {
    html += `<div style="margin:12px 0">
      <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Self-care</div>`;
    selfCareKeys.forEach(id => {
      const task = selfCareTaskMap[id];
      const done = !!storedSelfCare[id];
      html += `<div onclick="toggleHistorySelfCare('${dateStr}','${id}',this)" style="display:flex;align-items:center;gap:8px;padding:7px 0;cursor:pointer;-webkit-tap-highlight-color:rgba(255,255,255,0.05)">
        <div style="width:20px;height:20px;border-radius:50%;background:${done?'var(--sage)':'rgba(255,255,255,0.08)'};border:${done?'none':'1.5px solid rgba(255,255,255,0.15)'};display:flex;align-items:center;justify-content:center;font-size:10px;color:${done?'var(--bg)':'var(--text-muted)'};transition:all 0.2s">${done?'✓':''}</div>
        <div style="font-size:14px;color:${done?'var(--text-primary)':'var(--text-muted)'};transition:color 0.2s">${task.icon} ${task.label}</div>
      </div>`;
    });
    html += '</div><div class="divider"></div>';
  }

  if (entry.journalEntries && entry.journalEntries.length > 0) {
    const sourceLabels = { open: 'open journal', winddown: 'evening', journal: '' };
    html += `<div style="margin:12px 0">
      <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Journal · ${entry.journalEntries.length} entry${entry.journalEntries.length !== 1 ? 'ies' : ''}</div>`;
    entry.journalEntries.forEach((je, i) => {
      const time = je.savedAt ? new Date(je.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
      const source = sourceLabels[je.source] || '';
      const meta = [time, source].filter(Boolean).join(' · ');
      html += `<div style="${i > 0 ? 'margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)' : ''}">
        ${meta ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${meta}</div>` : ''}
        ${je.prompt ? `<div class="journal-prompt" style="font-size:13px;margin-bottom:6px">${je.prompt}</div>` : ''}
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap">${je.text}</div>
        ${je.ai ? `<div class="ai-response" style="margin-top:8px"><div class="ai-response-text">${je.ai}</div></div>` : ''}
      </div>`;
    });
    html += `</div>`;
  } else if (entry.journal) {
    html += `<div style="margin:12px 0">
      <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Journal</div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.7">${entry.journal}</div>
      ${entry.journalAI ? `<div class="ai-response" style="margin-top:10px"><div class="ai-response-text">${entry.journalAI}</div></div>` : ''}
    </div>`;
  }

  document.getElementById('history-sheet-content').innerHTML = html;
  openSheet('history-sheet');
  state._historySheetDirty = false;
}

// Retroactive habit toggle for past days
function toggleHistoryHabit(dateStr, key, el) {
  if (!state.historyData[dateStr]) state.historyData[dateStr] = { habits: {} };
  if (!state.historyData[dateStr].habits) state.historyData[dateStr].habits = {};
  const habits = state.historyData[dateStr].habits;
  const wasDone = !!habits[key];
  habits[key] = !wasDone;

  const xpVal = XP_VALUES[key] || 15;
  if (!wasDone) {
    state.xpData.total = (state.xpData.total || 0) + xpVal;
    if (el) showXPFloat(xpVal, el);
  } else {
    state.xpData.total = Math.max(0, (state.xpData.total || 0) - xpVal);
    if (el) showXPFloat(-xpVal, el);
  }

  haptic('light');
  state._historySheetDirty = true;
  saveState();
  updateProgressTab();
  openHistoryDetail(dateStr);
}

// Retroactive self-care toggle for past days
function toggleHistorySelfCare(dateStr, taskId, el) {
  if (!state.historyData[dateStr]) state.historyData[dateStr] = { habits: {} };
  if (!state.historyData[dateStr].habits) state.historyData[dateStr].habits = {};
  if (!state.historyData[dateStr].habits.selfCare) state.historyData[dateStr].habits.selfCare = {};
  const sc = state.historyData[dateStr].habits.selfCare;
  const wasDone = !!sc[taskId];
  sc[taskId] = !wasDone;

  const xpVal = 10;
  if (!wasDone) {
    state.xpData.total = (state.xpData.total || 0) + xpVal;
    if (el) showXPFloat(xpVal, el);
  } else {
    state.xpData.total = Math.max(0, (state.xpData.total || 0) - xpVal);
    if (el) showXPFloat(-xpVal, el);
  }

  haptic('light');
  state._historySheetDirty = true;
  saveState();
  updateProgressTab();
  openHistoryDetail(dateStr);
}

export { renderProgressTab, renderHistoryTab, openHistoryDetail,
  generateRollingInsight, checkAutoGenerateInsight, updateProgressTab,
  toggleHistoryHabit, toggleHistorySelfCare };
window.renderProgressTab = renderProgressTab;
window.renderHistoryTab = renderHistoryTab;
window.openHistoryDetail = openHistoryDetail;
window.generateRollingInsight = generateRollingInsight;
window.updateProgressTab = updateProgressTab;
window.toggleHistoryHabit = toggleHistoryHabit;
window.toggleHistorySelfCare = toggleHistorySelfCare;
