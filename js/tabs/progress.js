// Bloom progress tab — stats, XP, levels, flower, history, insights
import { state, today, getWeekDates, formatDateLabel, getDayIndex, dayOfWeek, saveState, getJournalEntries } from '../state.js';
import { save, load } from '../storage.js';
import { haptic, escapeHtml } from '../utils.js';
import { LEVELS } from '../constants.js';
import { getLevel, getNextLevel, buildFlowerSVG } from '../xp.js';
import { buildStreakTreeSVG } from '../streaks.js';
import { getMoodPattern, getMoodHabitCorrelation, shareWeekInReview } from '../features/mood.js';
import { callClaude, renderAIResponseHTML, showThinking } from '../ai.js';
import { bloomIcon } from '../icons.js';
import { infoIcon } from '../sheets.js';
import { getSeasonalInsights } from '../seasonal.js';

// Late-bound cross-module references (avoid circular imports)
function openSheet(...args) { return window.openSheet?.(...args); }

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

  // Mood chart
  html += `<div class="card">
    <div class="card-title">Mood this week</div>
    <div class="mood-chart" id="mood-chart-bars">`;

  const moodColors = ['#b07878','#c9954a','#9a9080','#7a9e7e','#a8c5ab'];
  weekDates.forEach((d,i) => {
    const hist = state.historyData[d] || {};
    const mood = hist.mood;
    const h = (mood !== undefined && mood >= 0) ? ((mood+1)/5*100) : (mood === -1 ? 12 : 8);
    const color = (mood !== undefined && mood >= 0) ? moodColors[mood] : (mood === -1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)');
    html += `<div class="mood-chart-bar" style="height:${h}%;background:${color};border-radius:4px 4px 0 0"></div>`;
  });

  html += `</div>
    <div class="mood-chart-labels">`;
  weekDates.forEach((_,i) => { html += `<div class="mood-chart-label">${dayLabels[i]}</div>`; });
  html += `</div></div>`;

  // Sleep-mood overlay on the mood chart
  html += `<div style="margin-top:-8px;padding:0 4px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:10px;height:3px;background:var(--sky);border-radius:2px"></div>
      <span style="font-size:10px;color:var(--text-muted)">Sleep quality</span>
    </div>
    <div style="display:flex;gap:4px;justify-content:space-between">`;
  weekDates.forEach(d => {
    const hist = state.historyData[d] || {};
    const sleep = hist.sleep;
    const h2 = sleep !== undefined ? ((sleep+1)/5*100) : 0;
    html += `<div style="flex:1;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${h2}%;background:var(--sky);border-radius:2px;transition:width 0.3s"></div>
    </div>`;
  });
  html += `</div></div>`;

  // 30-day activity heatmap
  html += `<div class="card">
    <div class="card-title">Last 30 days</div>
    <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px">`;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const hist = state.historyData[dStr] || {};
    let pctDone = 0;
    if (hist.habits) {
      const vals = Object.values(hist.habits).filter(v => typeof v === 'boolean');
      const doneCount = vals.filter(Boolean).length;
      pctDone = vals.length > 0 ? doneCount / vals.length : 0;
    }
    const opacity = pctDone === 0 ? 0.06 : pctDone < 0.5 ? 0.25 : pctDone < 0.75 ? 0.5 : pctDone < 1 ? 0.75 : 1;
    const isToday2 = i === 0;
    html += `<div title="${dStr}" style="aspect-ratio:1;border-radius:3px;background:rgba(var(--sage-rgb),${opacity});${isToday2 ? 'border:1px solid var(--sage);' : ''}"></div>`;
  }
  html += `</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
      <span style="font-size:10px;color:var(--text-muted)">30 days ago</span>
      <div style="display:flex;align-items:center;gap:3px">
        <span style="font-size:10px;color:var(--text-muted)">Less</span>
        ${[0.06, 0.25, 0.5, 0.75, 1].map(o => `<div style="width:10px;height:10px;border-radius:2px;background:rgba(var(--sage-rgb),${o})"></div>`).join('')}
        <span style="font-size:10px;color:var(--text-muted)">More</span>
      </div>
      <span style="font-size:10px;color:var(--text-muted)">Today</span>
    </div>
  </div>`;

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
    if (journalEntries.length === 0) return;
    entry = { journalEntries };
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
  const habitKeys = Object.keys(habits).filter(k => k in habitNames);

  if (habitKeys.length > 0) {
    html += '<div style="margin:12px 0">';
    habitKeys.forEach(h => {
      const done = habits[h];
      html += `<div style="display:flex;align-items:center;gap:8px;padding:5px 0">
        <div style="width:20px;height:20px;border-radius:50%;background:${done?'var(--sage)':'var(--rose-dim)'};display:flex;align-items:center;justify-content:center;font-size:10px">${done?'✓':'×'}</div>
        <div style="font-size:14px;color:${done?'var(--text-primary)':'var(--text-muted)'}">${habitNames[h]}</div>
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
}


export { renderProgressTab, renderHistoryTab, openHistoryDetail,
  generateRollingInsight, checkAutoGenerateInsight, updateProgressTab };

window.renderProgressTab = renderProgressTab;
window.renderHistoryTab = renderHistoryTab;
window.openHistoryDetail = openHistoryDetail;
window.generateRollingInsight = generateRollingInsight;
