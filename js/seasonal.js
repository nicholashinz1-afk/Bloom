import { state, today, getWeekDates, getJournalEntries, saveState } from './state.js';
import { save, load } from './storage.js';
import { haptic } from './utils.js';
import { sendLocalNotification } from './notifications.js';
function renderTodayTab() { if (window.renderTodayTab) window.renderTodayTab(); }
function renderSettingsTab() { if (window.renderSettingsTab) window.renderSettingsTab(); }
function checkFirstTaskStreak() { if (window.checkFirstTaskStreak) window.checkFirstTaskStreak(); }
function getSeasonalInsights() {
  const history = state.historyData;
  const dates = Object.keys(history).sort();
  if (dates.length < 30) return []; // Need at least 30 days of data

  const insights = [];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Group mood by month
  const monthMoods = {};
  dates.forEach(d => {
    const h = history[d];
    if (h?.mood === undefined || h.mood < 0) return;
    const month = parseInt(d.split('-')[1]) - 1; // 0-indexed
    if (!monthMoods[month]) monthMoods[month] = [];
    monthMoods[month].push(h.mood);
  });

  // Need at least 2 months with data
  const monthsWithData = Object.keys(monthMoods).filter(m => monthMoods[m].length >= 5);
  if (monthsWithData.length < 2) return [];

  // Calculate monthly averages
  const monthAvgs = {};
  monthsWithData.forEach(m => {
    const moods = monthMoods[m];
    monthAvgs[m] = moods.reduce((a,b) => a+b, 0) / moods.length;
  });

  // Find best and hardest months
  let bestMonth = null, hardestMonth = null;
  let bestAvg = -1, hardestAvg = 5;
  Object.entries(monthAvgs).forEach(([m, avg]) => {
    if (avg > bestAvg) { bestAvg = avg; bestMonth = m; }
    if (avg < hardestAvg) { hardestAvg = avg; hardestMonth = m; }
  });

  if (bestMonth !== null && hardestMonth !== null && bestMonth !== hardestMonth && bestAvg - hardestAvg >= 0.5) {
    insights.push({
      emoji: '📅',
      title: 'Seasonal pattern',
      text: `Your mood tends to be highest in ${monthNames[bestMonth]} and lower in ${monthNames[hardestMonth]}. Knowing this can help you plan ahead with extra self-care.`,
    });
  }

  // Check current month vs overall average
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentMonthData = monthMoods[currentMonth];
  if (currentMonthData && currentMonthData.length >= 5) {
    const allMoods = dates.map(d => history[d]?.mood).filter(m => m !== undefined && m >= 0);
    const overallAvg = allMoods.reduce((a,b) => a+b, 0) / allMoods.length;
    const currentAvg = currentMonthData.reduce((a,b) => a+b, 0) / currentMonthData.length;
    const diff = currentAvg - overallAvg;

    if (diff <= -0.5) {
      insights.push({
        emoji: '🌧',
        title: `${monthNames[currentMonth]} tends to be harder`,
        text: `Your mood this month averages a bit lower than usual. That's okay — it's a pattern, not a personal failing. Be extra gentle with yourself.`,
      });
    } else if (diff >= 0.5) {
      insights.push({
        emoji: '☀️',
        title: `${monthNames[currentMonth]} is usually a good month`,
        text: `Your mood tends to be higher this time of year. Enjoy it and notice what's working well.`,
      });
    }
  }

  // Day-of-week pattern
  const dowMoods = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
  const dowNames = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  dates.forEach(d => {
    const h = history[d];
    if (h?.mood === undefined || h.mood < 0) return;
    const dow = new Date(d + 'T12:00:00').getDay();
    dowMoods[dow].push(h.mood);
  });

  let bestDow = null, worstDow = null;
  let bestDowAvg = -1, worstDowAvg = 5;
  Object.entries(dowMoods).forEach(([d, moods]) => {
    if (moods.length < 3) return;
    const avg = moods.reduce((a,b) => a+b, 0) / moods.length;
    if (avg > bestDowAvg) { bestDowAvg = avg; bestDow = d; }
    if (avg < worstDowAvg) { worstDowAvg = avg; worstDow = d; }
  });

  if (bestDow !== null && worstDow !== null && bestDow !== worstDow && bestDowAvg - worstDowAvg >= 0.6) {
    insights.push({
      emoji: '📊',
      title: 'Weekly rhythm',
      text: `${dowNames[bestDow]} tend to be your best days, while ${dowNames[worstDow]} are often harder. Plan something kind for yourself on ${dowNames[worstDow]}.`,
    });
  }

  return insights.slice(0, 2); // max 2 seasonal insights
}

// ============================================================
//  WEEKLY SUMMARY PUSH NOTIFICATION
// ============================================================
function checkWeeklySummaryNotification() {
  if (!state.prefs?.notifications?.habitReminders) return;
  if (!state.prefs?.notifications?.weeklySummary) return;

  const now = new Date();
  if (now.getDay() !== 0) return; // Sunday only
  if (now.getHours() < 18) return; // After 6pm

  const t = today();
  const sentKey = `bloom_reminders_${t}`;
  const sent = load(sentKey, {});
  if (sent.weekly_summary) return;

  sent.weekly_summary = true;
  save(sentKey, sent);

  // Build summary
  const weekDates = getWeekDates();
  const moodData = weekDates.map(d => state.historyData[d]?.mood).filter(m => m !== undefined && m >= 0);
  const avgMood = moodData.length > 0 ? (moodData.reduce((a,b) => a+b, 0) / moodData.length) : null;
  const moodEmojis = ['😔','😕','😐','🙂','😊'];
  const moodLabel = avgMood !== null ? moodEmojis[Math.round(avgMood)] : '';

  const journalCount = weekDates.filter(d => getJournalEntries(d).length > 0).length;
  const streak = state.xpData?.streak || 0;

  let summaryParts = [];
  if (avgMood !== null) summaryParts.push(`Mood: ${moodLabel} avg ${avgMood.toFixed(1)}/4`);
  const daysUp = state.xpData?.daysShowedUp || streak;
  if (daysUp > 0) summaryParts.push(`${daysUp} total days`);
  if (journalCount > 0) summaryParts.push(`${journalCount} journal ${journalCount === 1 ? 'entry' : 'entries'}`);

  const body = summaryParts.length > 0
    ? `This week: ${summaryParts.join(' · ')}. You're doing meaningful work showing up for yourself.`
    : 'Another week in the books. You showed up, and that matters.';

  sendLocalNotification('Your week in bloom 🌿', body, 'weekly-summary');
}

// ============================================================
//  CUSTOM CHECK-IN QUESTIONS
// ============================================================
function getCustomCheckins() {
  return state.prefs?.customCheckins || [];
}

function addCustomCheckin() {
  const nameInput = document.getElementById('custom-checkin-name');
  const typeSelect = document.getElementById('custom-checkin-type');
  if (!nameInput || !nameInput.value.trim()) return;

  const name = nameInput.value.trim();
  const type = typeSelect?.value || 'yesno'; // yesno, scale, number
  const id = 'cc_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) + '_' + Date.now().toString(36).slice(-4);

  if (!state.prefs.customCheckins) state.prefs.customCheckins = [];

  // Max 10 custom check-ins
  if (state.prefs.customCheckins.length >= 10) {
    return;
  }

  state.prefs.customCheckins.push({ id, name, type });
  save('bloom_prefs', state.prefs);
  nameInput.value = '';
  renderSettingsTab();
  renderTodayTab();
  haptic('light');
}

function removeCustomCheckin(id) {
  if (!state.prefs.customCheckins) return;
  state.prefs.customCheckins = state.prefs.customCheckins.filter(c => c.id !== id);
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
}

function logCustomCheckin(id, value) {
  if (!state.todayData.customCheckins) state.todayData.customCheckins = {};
  state.todayData.customCheckins[id] = value;
  save('bloom_today_' + today(), state.todayData);

  // Save to history
  if (!state.historyData[today()]) state.historyData[today()] = {};
  if (!state.historyData[today()].customCheckins) state.historyData[today()].customCheckins = {};
  state.historyData[today()].customCheckins[id] = value;
  save('bloom_history', state.historyData);

  checkFirstTaskStreak();
  haptic('light');
  renderTodayTab();
}


export { getSeasonalInsights, checkWeeklySummaryNotification,
  getCustomCheckins, addCustomCheckin, removeCustomCheckin, logCustomCheckin };
window.addCustomCheckin = addCustomCheckin;
window.removeCustomCheckin = removeCustomCheckin;
window.logCustomCheckin = logCustomCheckin;
