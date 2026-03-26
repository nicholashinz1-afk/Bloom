import { state, today } from './state.js';
import { save, load } from './storage.js';
import { haptic, playSound } from './utils.js';
import { addXP } from './xp.js';
import { sendTelemetry } from './telemetry.js';
function celebrate(...args) { return window.celebrate?.(...args); }
function renderTodayTab(...args) { return window.renderTodayTab?.(...args); }
function recoverStreakFromHistory() {
  const xp = state.xpData;
  const history = state.historyData || {};
  const historyDays = Object.keys(history).sort();
  if (!historyDays.length) return;

  // Count total days with any activity in history
  const recoveredTotal = historyDays.length;

  // If xpData already has a higher daysShowedUp, trust it
  if (xp.daysShowedUp >= recoveredTotal) return;

  // Calculate current consecutive run backwards from today/yesterday
  const t = today();
  const allDays = new Set(historyDays);
  // Include today if todayData has any activity (even if not yet archived)
  const td = state.todayData || {};
  const todayHasActivity = (
    td.m_teeth || td.e_teeth ||
    Object.keys(td).some(k => (k.endsWith('_am') || k.endsWith('_pm') || k.endsWith('_any')) && td[k]) ||
    td.mood !== undefined || td.sleep !== undefined ||
    (td.water && td.water > 0) ||
    (td.food && Object.values(td.food).some(Boolean)) ||
    td.journalXPGiven ||
    (td.selfCare && Object.values(td.selfCare).some(Boolean)) ||
    td.nudge_opened ||
    getJournalEntries(t).length > 0
  );
  if (todayHasActivity) allDays.add(t);

  // Walk backwards from today counting consecutive days
  let run = 0;
  let d = new Date();
  for (let i = 0; i < 400; i++) {
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (allDays.has(ds)) {
      run++;
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }

  // Find the most recent date with activity for lastStreakDate
  const lastDate = todayHasActivity ? t : historyDays[historyDays.length - 1];

  // Recover — only increase, never decrease
  xp.daysShowedUp = Math.max(xp.daysShowedUp || 0, recoveredTotal);
  xp.currentRun = Math.max(xp.currentRun || 0, run);
  xp.streak = xp.currentRun;
  if (!xp.lastStreakDate || lastDate > xp.lastStreakDate) {
    xp.lastStreakDate = lastDate;
  }
  saveState();
}

function updateStreak() {
  const xp = state.xpData;
  const td = state.todayData;
  const t = today();

  // Recover streak from history if data looks reset (run before early return)
  const historyDays = Object.keys(state.historyData || {}).length;
  if (historyDays > 0 && (!xp.daysShowedUp || xp.daysShowedUp < historyDays)) {
    recoverStreakFromHistory();
  }

  if (xp.lastStreakDate === t) return;

  // Migrate existing users: if they have streak but no daysShowedUp, seed it
  if (!xp.daysShowedUp && xp.streak) {
    xp.daysShowedUp = Math.max(xp.streak, historyDays || xp.streak);
    // Mark all milestones up to current total as already shown
    const pastMilestones = [5, 10, 25, 50, 75, 100, 150, 200, 365].filter(m => m <= xp.daysShowedUp);
    save('bloom_shown_milestones', pastMilestones);
  }
  if (!xp.daysShowedUp) xp.daysShowedUp = 0;
  if (!xp.currentRun) xp.currentRun = xp.streak || 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

  const anySelfCare = td.selfCare && Object.values(td.selfCare).some(Boolean);
  const anyDailyHabit = Object.keys(td).some(k => (k.endsWith('_am') || k.endsWith('_pm') || k.endsWith('_any')) && td[k]);
  const anyAction = (
    td.m_teeth || td.e_teeth || anyDailyHabit ||
    td.mood !== undefined ||
    td.sleep !== undefined ||
    (td.water && td.water > 0) ||
    (td.food && Object.values(td.food).some(Boolean)) ||
    td.journalXPGiven ||
    anySelfCare ||
    td.nudge_opened ||
    getJournalEntries(t).length > 0
  );

  const moodGrace = td.mood !== undefined && td.mood >= 0 && td.mood <= 2;

  if (anyAction || moodGrace) {
    if (xp.lastStreakDate !== t) {
      // Increment cumulative days — this never goes down
      xp.daysShowedUp = (xp.daysShowedUp || 0) + 1;

      // Update current run (consecutive days)
      if (xp.lastStreakDate === yStr || !xp.lastStreakDate) {
        xp.currentRun = (xp.currentRun || 0) + 1;
      } else {
        // Gap in days — reset run but NOT daysShowedUp
        xp.currentRun = 1;
      }

      // Keep legacy streak field in sync for buddy display
      xp.streak = xp.currentRun;
      xp.lastStreakDate = t;

      // Check milestones on cumulative days
      checkStreakMilestone(xp.daysShowedUp);
    }
  } else if (xp.lastStreakDate && xp.lastStreakDate !== yStr && xp.lastStreakDate !== t) {
    // Missed day — only reset current run, never daysShowedUp
    xp.currentRun = 0;
    xp.streak = 0;
    // No recovery banner — missing a day is just missing a day
  }

  saveState();
  updateProgressTab();
}

// ── Streak milestones ────────────────────────────────────────
function buildStreakTreeSVG(streak) {
  // Growth stages: 3=sprout, 7=sapling, 14=young tree, 30=full tree, 60=grand tree, 100=ancient tree
  const trunk = '#6b5a4a';
  const trunkLight = '#8a7560';
  const green1 = '#5a8a5e';
  const green2 = '#7a9e7e';
  const green3 = '#a8c5ab';
  const ground = '#3a5a3e';

  let tree = '';
  if (streak <= 3) {
    // Tiny sprout breaking through soil
    tree = `
      <line x1="100" y1="170" x2="100" y2="145" stroke="${green1}" stroke-width="3" stroke-linecap="round" class="streak-grow"/>
      <ellipse cx="93" cy="147" rx="10" ry="5" fill="${green2}" transform="rotate(-35 93 147)" class="streak-grow" style="animation-delay:0.3s"/>
      <ellipse cx="107" cy="142" rx="10" ry="5" fill="${green3}" transform="rotate(35 107 142)" class="streak-grow" style="animation-delay:0.5s"/>
    `;
  } else if (streak <= 7) {
    // Sapling with a few branches
    tree = `
      <line x1="100" y1="175" x2="100" y2="110" stroke="${trunk}" stroke-width="4" stroke-linecap="round" class="streak-grow"/>
      <line x1="100" y1="140" x2="82" y2="125" stroke="${trunk}" stroke-width="2.5" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <line x1="100" y1="128" x2="118" y2="115" stroke="${trunk}" stroke-width="2.5" stroke-linecap="round" class="streak-grow" style="animation-delay:0.3s"/>
      <circle cx="82" cy="122" r="12" fill="${green2}" opacity="0.85" class="streak-grow" style="animation-delay:0.5s"/>
      <circle cx="118" cy="112" r="12" fill="${green3}" opacity="0.85" class="streak-grow" style="animation-delay:0.6s"/>
      <circle cx="100" cy="105" r="14" fill="${green1}" opacity="0.85" class="streak-grow" style="animation-delay:0.7s"/>
    `;
  } else if (streak <= 14) {
    // Young tree with canopy forming
    tree = `
      <path d="M96 175 Q94 145 90 130 L92 120 Q95 105 100 100" stroke="${trunk}" stroke-width="5" fill="none" stroke-linecap="round" class="streak-grow"/>
      <path d="M104 175 Q106 145 110 130 L108 120 Q105 105 100 100" stroke="${trunkLight}" stroke-width="3" fill="none" stroke-linecap="round" class="streak-grow"/>
      <line x1="92" y1="140" x2="74" y2="128" stroke="${trunk}" stroke-width="2.5" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <line x1="108" y1="132" x2="126" y2="120" stroke="${trunk}" stroke-width="2.5" stroke-linecap="round" class="streak-grow" style="animation-delay:0.3s"/>
      <circle cx="74" cy="122" r="15" fill="${green2}" opacity="0.8" class="streak-grow" style="animation-delay:0.4s"/>
      <circle cx="126" cy="114" r="14" fill="${green3}" opacity="0.8" class="streak-grow" style="animation-delay:0.5s"/>
      <circle cx="100" cy="92" r="20" fill="${green1}" opacity="0.85" class="streak-grow" style="animation-delay:0.6s"/>
      <circle cx="86" cy="100" r="16" fill="${green2}" opacity="0.75" class="streak-grow" style="animation-delay:0.7s"/>
      <circle cx="114" cy="98" r="16" fill="${green3}" opacity="0.75" class="streak-grow" style="animation-delay:0.8s"/>
    `;
  } else if (streak <= 30) {
    // Full tree with thick canopy
    tree = `
      <path d="M93 175 Q88 150 86 130 Q84 115 90 105 Q95 95 100 88" stroke="${trunk}" stroke-width="7" fill="none" stroke-linecap="round" class="streak-grow"/>
      <path d="M107 175 Q112 150 114 130 Q116 115 110 105 Q105 95 100 88" stroke="${trunkLight}" stroke-width="4" fill="none" stroke-linecap="round" class="streak-grow"/>
      <line x1="88" y1="135" x2="68" y2="122" stroke="${trunk}" stroke-width="3" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <line x1="112" y1="128" x2="132" y2="115" stroke="${trunk}" stroke-width="3" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <circle cx="66" cy="115" r="18" fill="${green2}" opacity="0.8" class="streak-grow" style="animation-delay:0.4s"/>
      <circle cx="134" cy="108" r="17" fill="${green3}" opacity="0.8" class="streak-grow" style="animation-delay:0.5s"/>
      <circle cx="100" cy="78" r="26" fill="${green1}" opacity="0.85" class="streak-grow" style="animation-delay:0.6s"/>
      <circle cx="80" cy="88" r="20" fill="${green2}" opacity="0.8" class="streak-grow" style="animation-delay:0.7s"/>
      <circle cx="120" cy="85" r="20" fill="${green3}" opacity="0.8" class="streak-grow" style="animation-delay:0.8s"/>
      <circle cx="90" cy="72" r="16" fill="${green3}" opacity="0.7" class="streak-grow" style="animation-delay:0.9s"/>
      <circle cx="112" cy="70" r="16" fill="${green2}" opacity="0.7" class="streak-grow" style="animation-delay:1s"/>
    `;
  } else if (streak <= 60) {
    // Grand tree with flowers
    tree = `
      <path d="M90 175 Q82 148 80 125 Q78 108 88 95 Q95 85 100 78" stroke="${trunk}" stroke-width="9" fill="none" stroke-linecap="round" class="streak-grow"/>
      <path d="M110 175 Q118 148 120 125 Q122 108 112 95 Q105 85 100 78" stroke="${trunkLight}" stroke-width="5" fill="none" stroke-linecap="round" class="streak-grow"/>
      <line x1="84" y1="130" x2="60" y2="115" stroke="${trunk}" stroke-width="3.5" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <line x1="116" y1="122" x2="140" y2="108" stroke="${trunk}" stroke-width="3.5" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <circle cx="58" cy="108" r="20" fill="${green2}" opacity="0.8" class="streak-grow" style="animation-delay:0.4s"/>
      <circle cx="142" cy="102" r="18" fill="${green3}" opacity="0.8" class="streak-grow" style="animation-delay:0.5s"/>
      <circle cx="100" cy="68" r="30" fill="${green1}" opacity="0.85" class="streak-grow" style="animation-delay:0.6s"/>
      <circle cx="75" cy="80" r="22" fill="${green2}" opacity="0.8" class="streak-grow" style="animation-delay:0.7s"/>
      <circle cx="125" cy="76" r="22" fill="${green3}" opacity="0.8" class="streak-grow" style="animation-delay:0.8s"/>
      <circle cx="100" cy="56" r="18" fill="${green3}" opacity="0.7" class="streak-grow" style="animation-delay:0.9s"/>
      <circle cx="80" cy="62" r="4" fill="#d4a8a8" opacity="0.9" class="sparkle"/>
      <circle cx="118" cy="58" r="3.5" fill="#d4a8a8" opacity="0.8" class="sparkle" style="animation-delay:0.6s"/>
      <circle cx="95" cy="50" r="3" fill="#e0b87a" opacity="0.9" class="sparkle" style="animation-delay:1.2s"/>
    `;
  } else {
    // Ancient tree — majestic with golden leaves and sparkles
    tree = `
      <path d="M88 175 Q78 145 76 120 Q74 100 86 88 Q95 78 100 70" stroke="${trunk}" stroke-width="11" fill="none" stroke-linecap="round" class="streak-grow"/>
      <path d="M112 175 Q122 145 124 120 Q126 100 114 88 Q105 78 100 70" stroke="${trunkLight}" stroke-width="6" fill="none" stroke-linecap="round" class="streak-grow"/>
      <line x1="80" y1="125" x2="52" y2="108" stroke="${trunk}" stroke-width="4" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <line x1="120" y1="118" x2="148" y2="100" stroke="${trunk}" stroke-width="4" stroke-linecap="round" class="streak-grow" style="animation-delay:0.2s"/>
      <circle cx="50" cy="100" r="22" fill="${green2}" opacity="0.8" class="streak-grow" style="animation-delay:0.4s"/>
      <circle cx="150" cy="94" r="20" fill="${green3}" opacity="0.8" class="streak-grow" style="animation-delay:0.5s"/>
      <circle cx="100" cy="58" r="34" fill="${green1}" opacity="0.85" class="streak-grow" style="animation-delay:0.6s"/>
      <circle cx="70" cy="72" r="24" fill="${green2}" opacity="0.8" class="streak-grow" style="animation-delay:0.7s"/>
      <circle cx="130" cy="68" r="24" fill="${green3}" opacity="0.8" class="streak-grow" style="animation-delay:0.8s"/>
      <circle cx="85" cy="48" r="18" fill="${green3}" opacity="0.7" class="streak-grow" style="animation-delay:0.9s"/>
      <circle cx="115" cy="45" r="18" fill="${green2}" opacity="0.7" class="streak-grow" style="animation-delay:1s"/>
      <circle cx="100" cy="38" r="15" fill="#e0b87a" opacity="0.15" class="glow-pulse"/>
      ${[0,1,2,3,4,5].map(j => {
        const sx = 60 + j * 16 + (j % 2) * 6;
        const sy = 42 + (j % 3) * 14;
        return `<circle cx="${sx}" cy="${sy}" r="${2 + (j % 2)}" fill="${j % 2 ? '#e0b87a' : '#fff'}" opacity="${0.5 + j * 0.08}" class="sparkle" style="animation-delay:${j * 0.35}s"/>`;
      }).join('')}
    `;
  }

  return `<svg viewBox="30 30 140 165" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:200px;height:auto;display:block;margin:0 auto">
    ${tree}
    <ellipse cx="100" cy="178" rx="45" ry="6" fill="${ground}" opacity="0.5"/>
  </svg>`;
}

function checkStreakMilestone(totalDays) {
  const milestones = [5, 10, 25, 50, 75, 100, 150, 200, 365];
  if (!milestones.includes(totalDays)) return;
  // Prevent showing milestones the user already passed (e.g. after migration)
  const shownMilestones = load('bloom_shown_milestones', []);
  if (shownMilestones.includes(totalDays)) return;
  shownMilestones.push(totalDays);
  save('bloom_shown_milestones', shownMilestones);
  const messages = {
    5:   { title: '5 days!', sub: 'Five days you chose to show up. That\'s real.' },
    10:  { title: '10 days!', sub: 'Double digits. You\'re building something.' },
    25:  { title: '25 days!', sub: 'Twenty-five days of caring for yourself.' },
    50:  { title: '50 days!', sub: 'Half a hundred. Look how far you\'ve come.' },
    75:  { title: '75 days!', sub: 'Three quarters of the way to 100. Incredible.' },
    100: { title: '100 days!', sub: 'One hundred days you showed up for yourself. Extraordinary.' },
    150: { title: '150 days!', sub: 'You keep coming back. That says everything.' },
    200: { title: '200 days!', sub: 'Two hundred days of you. That\'s a practice.' },
    365: { title: 'One full year!', sub: 'A year of showing up. There are no words.' },
  };
  const msg = messages[totalDays];
  if (!msg) return;
  setTimeout(() => {
    haptic('heavy');
    playSound('milestone');
    const div = document.createElement('div');
    div.id = 'levelup-overlay';
    div.innerHTML = `<div class="levelup-card" style="max-width:320px">
      <div style="margin-bottom:16px">${buildStreakTreeSVG(totalDays)}</div>
      <div style="font-family:Fraunces,serif;font-size:13px;color:var(--sage);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">${totalDays} days shown up</div>
      <div style="font-family:Fraunces,serif;font-size:24px;font-weight:300;color:var(--cream);margin-bottom:8px">${msg.title}</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px">${msg.sub}</div>
      <button class="btn btn-primary btn-block" id="levelup-close">Keep growing 🌿</button>
    </div>`;
    document.body.appendChild(div);
    setTimeout(() => launchConfetti(window.innerWidth / 2, window.innerHeight / 3, 80), 1000);
    document.getElementById('levelup-close').addEventListener('click', () => div.remove());
    setTimeout(() => { if (div.parentNode) div.remove(); }, 10000);
  }, 500);
}

// ── Welcome-back re-engagement after 2+ missed days ──────────
function checkWelcomeBack() {
  const xp = state.xpData;
  if (!xp.lastStreakDate) return;
  if (state._welcomeBackShown) return;

  const lastDate = new Date(xp.lastStreakDate + 'T00:00:00');
  const now = new Date();
  const diffDays = Math.floor((now - lastDate) / 86400000);

  if (diffDays >= 2) {
    state._welcomeBackShown = true;
    state.showWelcomeBack = true;
    state.daysAway = diffDays;
  }
}

function dismissWelcomeBack(reason) {
  state.showWelcomeBack = false;
  if (reason) {
    if (!state.wellnessData._comebackReasons) state.wellnessData._comebackReasons = [];
    state.wellnessData._comebackReasons.push({ date: today(), reason });
    saveState();
  }
  // Give comeback XP bonus
  addXP(25, null);
  haptic('success');
  renderTodayTop();
}

// ── General milestone checks ─────────────────────────────────
function checkMilestones() {
  const wellness = state.wellnessData;
  const journalCount = Object.keys(wellness?.journal || {}).length;
  const milestones = load('bloom_milestones', {});

  // Journal entry milestones
  const journalMilestones = [1, 10, 25, 50, 100];
  journalMilestones.forEach(m => {
    if (journalCount >= m && !milestones['journal_' + m]) {
      milestones['journal_' + m] = true;
      save('bloom_milestones', milestones);
      if (m === 1) return; // skip first entry — journal save already celebrates
      setTimeout(() => showMilestone(
        m === 10 ? '📓' : m === 25 ? '✍️' : m === 50 ? '📚' : '🏆',
        `${m} journal entries`,
        m === 10 ? 'Ten entries. You\'ve been honest with yourself.' :
        m === 25 ? 'Twenty-five reflections. That\'s a real practice.' :
        m === 50 ? 'Fifty entries. You\'ve built something meaningful here.' :
        'One hundred journal entries. That\'s extraordinary self-awareness.'
      ), 600);
    }
  });
}

function showMilestone(emoji, title, sub) {
  haptic('medium');
  playSound('milestone');
  launchConfetti(window.innerWidth/2, window.innerHeight/3, 50);
  const div = document.createElement('div');
  div.id = 'levelup-overlay';
  div.innerHTML = `<div class="levelup-card">
    <div class="levelup-emoji">${emoji}</div>
    <div style="font-family:Fraunces,serif;font-size:13px;color:var(--sage);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Milestone</div>
    <div style="font-family:Fraunces,serif;font-size:24px;font-weight:300;color:var(--cream);margin-bottom:8px">${title}</div>
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px">${sub}</div>
    <button class="btn btn-primary btn-block" id="levelup-close">✓</button>
  </div>`;
  document.body.appendChild(div);
  document.getElementById('levelup-close').addEventListener('click', () => div.remove());
  setTimeout(() => { if (div.parentNode) div.remove(); }, 8000);
}

// ── Mood pattern analysis ────────────────────────────────────
export { recoverStreakFromHistory, updateStreak, buildStreakTreeSVG, checkStreakMilestone, checkWelcomeBack, dismissWelcomeBack, checkMilestones, showMilestone };
window.dismissWelcomeBack = dismissWelcomeBack;
window.checkMilestones = checkMilestones;
