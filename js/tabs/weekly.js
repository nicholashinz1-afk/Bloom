import { state, getWeekDates, formatDateLabel, today } from '../state.js';
import { DAILY_HABITS, MEDICATION_HABIT } from '../constants.js';
import { bloomIcon } from '../icons.js';
import { CHECK_SVG } from '../utils.js';
function renderWeeklyTab() {
  const scroll = document.getElementById('weekly-scroll');
  if (!scroll) return;

  const prefs = state.prefs;
  const wd = state.weekData;
  let html = '';

  // --- WEEKLY GOALS ---
  const weeklyHabits = [
    { id: 'w_shower',   icon: '🚿', name: 'Shower' },
    { id: 'w_exercise', icon: '💪', name: 'Exercise' },
    { id: 'w_outside',  icon: '🌿', name: 'Go outside' },
    { id: 'w_therapy',  icon: '🛋️', name: 'Go to therapy' },
  ].filter(h => prefs?.habits?.[h.id] !== false);

  if (weeklyHabits.length > 0) {
    html += `<div class="section-label">🎯 Weekly goals</div><div class="card mb-0">`;
    weeklyHabits.forEach(h => {
      const goal = prefs?.goals?.[h.id] || 3;
      const done = wd[h.id] || 0;
      const atGoal = done >= goal;
      const pips = Array.from({length: goal}, (_,i) =>
        `<div class="week-pip${i < done ? ' done' : ''}"></div>`).join('');
      html += `<div class="habit-row" style="cursor:default">
        <div class="habit-check${atGoal ? ' done' : ''}" style="cursor:default">${atGoal ? CHECK_SVG : h.icon}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-sub">${done}/${goal} this week</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="week-badge">${pips}</div>
          <div style="display:flex;gap:4px">
            ${done > 0 ? `<div onclick="tapWeeklyHabit('${h.id}','dec',this)" style="width:26px;height:26px;border-radius:50%;background:var(--bg-elevated);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--text-secondary)">−</div>` : `<div style="width:26px"></div>`}
            ${!atGoal ? `<div onclick="tapWeeklyHabit('${h.id}','inc',this)" style="width:26px;height:26px;border-radius:50%;background:rgba(var(--sage-rgb),0.15);border:1px solid rgba(var(--sage-rgb),0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--sage-light)">+</div>` : `<div style="width:26px"></div>`}
          </div>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  // --- HOUSEHOLD TASKS ---
  const tasks = prefs?.householdTasks || [];
  if (tasks.length > 0) {
    html += `<div class="section-label">🏠 Household</div><div class="card mb-0">`;
    tasks.forEach(t2 => {
      const done2 = wd.household?.[t2.id];
      html += `<div class="habit-row" onclick="tapHouseholdTask('${t2.id}', this)">
        <div class="habit-check${done2 ? ' done' : ''}">${done2 ? CHECK_SVG : t2.icon || '🏠'}</div>
        <div class="habit-info">
          <div class="habit-name">${t2.name}</div>
          ${done2 ? '<div class="habit-sub" style="color:var(--sage)">Done this week ✓</div>' : '<div class="habit-sub">Tap when done</div>'}
        </div>
        ${!done2 ? '<div class="habit-xp">+15</div>' : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // --- WEEKLY PROGRESS SNAPSHOT ---
  const weekDates = getWeekDates();
  const todayStr = today();
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  html += `<div class="section-label">📊 This week</div>`;
  html += `<div class="card" style="padding:16px">
    <div class="week-bar">`;
  weekDates.forEach((d, i) => {
    const hist = state.historyData[d] || {};
    const isToday = d === todayStr;
    const moodEmoji = hist.mood !== undefined ? (hist.mood === -1 ? '🤷' : ['😔','😕','😐','🙂','😊'][hist.mood]) : '';
    let dotClass = '';
    if (hist.habits) {
      const done = Object.values(hist.habits).filter(Boolean).length;
      const total = Object.keys(hist.habits).length;
      if (done === total && total > 0) dotClass = 'full';
      else if (done > 0) dotClass = 'partial';
      else dotClass = 'missed';
    }
    if (isToday) dotClass += ' today';
    html += `<div class="week-day-dot">
      <div class="week-dot ${dotClass}">${moodEmoji || (isToday ? '○' : '')}</div>
      <div class="week-day-label">${dayLabels[i]}</div>
    </div>`;
  });
  html += `</div></div>`;

  // --- HISTORY (previously its own tab) ---
  const history = state.historyData;
  const moodEmojis = ['😔','😕','😐','🙂','😊'];
  const dates = Object.keys(history)
    .filter(d => d !== todayStr)
    .sort((a,b) => b.localeCompare(a))
    .slice(0, 14); // show last 2 weeks

  if (dates.length > 0) {
    html += `<div class="section-label">📅 Recent history</div>`;
    html += `<div style="font-size:12px;color:var(--text-muted);margin-top:-4px;margin-bottom:10px;line-height:1.5">Tap any day to view or update things you forgot to log.</div>`;
    let currentMonth = '';
    dates.forEach(d => {
      const dt = new Date(d + 'T00:00:00');
      const month = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (month !== currentMonth) {
        currentMonth = month;
        html += `<div style="font-size:12px;color:var(--text-muted);margin:12px 0 6px;font-weight:500">${month}</div>`;
      }
      const day = history[d];
      const moodE = day.mood !== undefined ? (day.mood === -1 ? '🤷' : moodEmojis[day.mood]) : '·';
      const _histHabitNames = { m_teeth:1, e_teeth:1, w_shower:1, w_exercise:1, w_outside:1, w_therapy:1, brush_teeth_am:1, brush_teeth_pm:1, brush_hair_am:1, brush_hair_pm:1, wash_face_am:1, wash_face_pm:1, get_dressed_am:1, get_dressed_pm:1, floss_am:1, floss_pm:1, skincare_am:1, skincare_pm:1, medication_am:1, medication_pm:1, medication_any:1, brush_teeth_any:1, brush_hair_any:1, wash_face_any:1, get_dressed_any:1, floss_any:1, skincare_any:1 };
      const habitCount = day.habits ? Object.entries(day.habits).filter(([k,v]) => v === true && k in _histHabitNames).length : 0;
      const scData = day.habits?.selfCare || {};
      const scCount = Object.values(scData).filter(Boolean).length;
      const habitsStr = habitCount > 0 ? `${habitCount} habit${habitCount !== 1 ? 's' : ''}` : '';
      const scStr = scCount > 0 ? `${scCount} self-care` : '';
      const journal = day.journal ? '📝' : '';

      html += `<div class="card mb-0" style="padding:10px 14px;margin-bottom:6px;cursor:pointer" onclick="openHistoryDetail('${d}')">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px;width:30px;text-align:center">${moodE}</div>
          <div style="flex:1">
            <div style="font-size:13px;color:var(--cream)">${dt.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${[habitsStr, scStr, journal].filter(Boolean).join(' · ') || 'No data'}</div>
          </div>
          <div style="color:var(--text-muted);font-size:16px">›</div>
        </div>
      </div>`;
    });
  }

  scroll.innerHTML = html;
}

// ============================================================
//  WELLNESS TAB
// ============================================================
export { renderWeeklyTab };
window.renderWeeklyTab = renderWeeklyTab;
