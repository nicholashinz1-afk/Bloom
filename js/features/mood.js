import { state, today, getWeekDates, formatDateLabel } from '../state.js';
import { DAILY_HABITS, MEDICATION_HABIT } from '../constants.js';
function getMoodPattern() {
  const history = state.historyData;
  const dates = Object.keys(history).sort().slice(-14); // last 2 weeks
  if (dates.length < 5) return null;

  const withMood = dates.filter(d => history[d]?.mood !== undefined && history[d].mood >= 0);
  if (withMood.length < 5) return null;

  const recent = withMood.slice(-7).map(d => history[d].mood);
  const older = withMood.slice(0, -7).map(d => history[d].mood);

  const avgRecent = recent.reduce((a,b) => a+b, 0) / recent.length;
  const avgOlder = older.length ? older.reduce((a,b) => a+b, 0) / older.length : null;

  // Check exercise correlation
  const exerciseDays = dates.filter(d => history[d]?.habits?.w_exercise);
  const exerciseMoods = exerciseDays.map(d => history[d].mood).filter(m => m !== undefined && m >= 0);
  const nonExerciseMoods = dates
    .filter(d => !history[d]?.habits?.w_exercise && history[d]?.mood !== undefined && history[d].mood >= 0)
    .map(d => history[d].mood);

  const avgExercise = exerciseMoods.length >= 3 ? exerciseMoods.reduce((a,b)=>a+b,0)/exerciseMoods.length : null;
  const avgNonExercise = nonExerciseMoods.length >= 3 ? nonExerciseMoods.reduce((a,b)=>a+b,0)/nonExerciseMoods.length : null;

  const patterns = [];

  if (avgOlder !== null) {
    const diff = avgRecent - avgOlder;
    if (diff >= 0.5) patterns.push({ type: 'improving', text: 'Your mood has been trending upward this week.' });
    else if (diff <= -0.5) patterns.push({ type: 'declining', text: 'Your mood has been a little lower this week than last.' });
  }

  if (avgExercise !== null && avgNonExercise !== null && avgExercise - avgNonExercise >= 0.7) {
    patterns.push({ type: 'exercise', text: 'You tend to feel better on days you exercise.' });
  }

  return patterns.length > 0 ? patterns[0] : null;
}

// ── Mood-habit correlation insights ──────────────────────────
function getMoodHabitCorrelation() {
  const history = state.historyData;
  const dates = Object.keys(history).sort().slice(-30);
  if (dates.length < 7) return [];
  const insights = [];

  // Average mood on high-completion days vs low-completion days
  const highDays = [], lowDays = [];
  dates.forEach(d => {
    const h = history[d];
    if (h?.mood === undefined || h.mood < 0) return;
    const habits = h.habits || {};
    const boolVals = Object.values(habits).filter(v => typeof v === 'boolean');
    const pct = boolVals.length > 0 ? boolVals.filter(Boolean).length / boolVals.length : 0;
    if (pct >= 0.5) highDays.push(h.mood);
    else lowDays.push(h.mood);
  });
  if (highDays.length >= 3 && lowDays.length >= 3) {
    const avgHigh = (highDays.reduce((a,b) => a+b, 0) / highDays.length).toFixed(1);
    const avgLow = (lowDays.reduce((a,b) => a+b, 0) / lowDays.length).toFixed(1);
    if (avgHigh - avgLow >= 0.5) {
      insights.push({
        emoji: '📊',
        title: 'Habits boost your mood',
        text: `Your mood averages ${avgHigh} on days you complete 50%+ of habits, vs ${avgLow} when you don't.`,
      });
    }
  }

  // Sleep quality vs next-day mood
  const sortedDates = dates.sort();
  const sleepMoodPairs = [];
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const today2 = history[sortedDates[i]];
    const tomorrow = history[sortedDates[i + 1]];
    if (today2?.sleep !== undefined && tomorrow?.mood !== undefined && tomorrow.mood >= 0) {
      sleepMoodPairs.push({ sleep: today2.sleep, mood: tomorrow.mood });
    }
  }
  if (sleepMoodPairs.length >= 5) {
    const goodSleep = sleepMoodPairs.filter(p => p.sleep >= 3);
    const poorSleep = sleepMoodPairs.filter(p => p.sleep <= 1);
    if (goodSleep.length >= 2 && poorSleep.length >= 2) {
      const avgGoodSleep = (goodSleep.reduce((a,p) => a + p.mood, 0) / goodSleep.length).toFixed(1);
      const avgPoorSleep = (poorSleep.reduce((a,p) => a + p.mood, 0) / poorSleep.length).toFixed(1);
      if (avgGoodSleep - avgPoorSleep >= 0.5) {
        insights.push({
          emoji: '😴',
          title: 'Sleep shapes your mood',
          text: `After good sleep, your mood averages ${avgGoodSleep}. After poor sleep, it's ${avgPoorSleep}.`,
        });
      }
    }
  }

  // Best habits for mood
  const habitMoods = {};
  dates.forEach(d => {
    const h = history[d];
    if (h?.mood === undefined || h.mood < 0 || !h.habits) return;
    Object.keys(h.habits).forEach(k => {
      if (typeof h.habits[k] !== 'boolean') return;
      if (!habitMoods[k]) habitMoods[k] = { with: [], without: [] };
      if (h.habits[k]) habitMoods[k].with.push(h.mood);
      else habitMoods[k].without.push(h.mood);
    });
  });
  const bestHabits = [];
  Object.entries(habitMoods).forEach(([k, v]) => {
    if (v.with.length >= 3 && v.without.length >= 3) {
      const avgWith = v.with.reduce((a,b) => a+b, 0) / v.with.length;
      const avgWithout = v.without.reduce((a,b) => a+b, 0) / v.without.length;
      if (avgWith - avgWithout >= 0.7) bestHabits.push(k.replace(/_am|_pm|_any/, '').replace(/_/g, ' '));
    }
  });
  if (bestHabits.length > 0) {
    const unique = [...new Set(bestHabits)].slice(0, 3);
    insights.push({
      emoji: '✨',
      title: 'Your best-mood habits',
      text: `Your best days tend to include: ${unique.join(', ')}.`,
    });
  }

  return insights.slice(0, 3);
}

// ── Share week in review ─────────────────────────────────────
async function shareWeekInReview() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0d1610';
  ctx.fillRect(0, 0, 600, 400);

  // Border
  ctx.strokeStyle = 'rgba(var(--sage-rgb),0.3)';
  ctx.lineWidth = 2;
  ctx.roundRect(10, 10, 580, 380, 20);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#e8e0d0';
  ctx.font = '300 28px Fraunces, serif';
  ctx.textAlign = 'center';
  ctx.fillText('My Week in Bloom', 300, 55);

  // Streak
  const streak = state.xpData.streak || 0;
  ctx.fillStyle = '#c9954a';
  ctx.font = '500 16px "Instrument Sans", sans-serif';
  ctx.fillText(`🌿 ${state.xpData.daysShowedUp || streak} days shown up`, 300, 85);

  // Mood bars
  const weekDates = getWeekDates();
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const moodColors2 = ['#8296a6','#91a7a0','#a4a78e','#bfab82','#d9c9a0'];
  const barWidth = 50;
  const barGap = 18;
  const startX = 300 - (7 * (barWidth + barGap) - barGap) / 2;

  weekDates.forEach((d, i) => {
    const hist = state.historyData[d] || {};
    const mood = hist.mood;
    const barH = (mood !== undefined && mood >= 0) ? ((mood+1)/5 * 120) : (mood === -1 ? 12 : 6);
    const color = (mood !== undefined && mood >= 0) ? moodColors2[mood] : (mood === -1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)');
    const x = startX + i * (barWidth + barGap);
    const y = 240 - barH;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, 4);
    ctx.fill();
    // Day label
    ctx.fillStyle = '#4a5e4c';
    ctx.font = '12px "Instrument Sans", sans-serif';
    ctx.fillText(dayLabels[i], x + barWidth / 2, 260);
  });

  // Completion rate
  const { done, total } = getCompletionRate();
  ctx.fillStyle = '#a8c5ab';
  ctx.font = '300 20px Fraunces, serif';
  ctx.fillText(`${done}/${total} habits today`, 300, 300);

  // XP
  const xp = state.xpData.total || 0;
  const level = getLevel(xp);
  ctx.fillStyle = '#8a9e8c';
  ctx.font = '14px "Instrument Sans", sans-serif';
  ctx.fillText(`${level.emoji} ${level.name} · ${xp} sunlight`, 300, 330);

  // Watermark
  ctx.fillStyle = '#4a5e4c';
  ctx.font = 'italic 12px Fraunces, serif';
  ctx.fillText('bloom · grow gently', 300, 375);

  try {
    canvas.toBlob(async (blob) => {
      if (navigator.share && blob) {
        const file = new File([blob], 'bloom-week.png', { type: 'image/png' });
        try {
          await navigator.share({ files: [file], title: 'My Week in Bloom', text: 'Growing gently, one day at a time 🌿' });
        } catch(e) { downloadCanvasImage(canvas); }
      } else {
        downloadCanvasImage(canvas);
      }
    }, 'image/png');
  } catch(e) {
    downloadCanvasImage(canvas);
  }
}

function downloadCanvasImage(canvas) {
  const a = document.createElement('a');
  a.download = 'bloom-week.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ── Hard day mode ────────────────────────────────────────────

export { getMoodPattern, getMoodHabitCorrelation, shareWeekInReview, downloadCanvasImage };
window.shareWeekInReview = shareWeekInReview;
