// Bloom onboarding — multi-step setup flow
import { state, loadState, today, weekStart } from '../state.js';
import { save, load } from '../storage.js';
import { DAILY_HABITS, MEDICATION_HABIT, SELF_CARE_CATEGORIES } from '../constants.js';
import { THEMES, initTheme } from '../theme.js';
import { haptic, playSound } from '../utils.js';
import { bloomIcon } from '../icons.js';

let obStep = 0;
let obData = {
  name: '',
  habits: { m_teeth: true, e_teeth: true, w_shower: true, w_exercise: true, w_outside: true, track_meals: false },
  dailyHabits: { brush_teeth: true },
  habitTimes: { brush_teeth: 'any' },
  goals: { w_shower: 3, w_exercise: 3, w_outside: 3 },
  householdTasks: [],
  notifications: { waterMode: 'smart', sundayReminder: true },
  audio: true,
  theme: 'forest',
  selfCareTasks: [],
  multiBuddy: false,
  buddyShareMood: true,
  readiness: null, // 'ready' | 'gentle' | 'exploring'
};

// Adaptive onboarding — path depends on readiness
function getOBPath() {
  if (obData.readiness === 'ready') {
    // Full setup: Welcome+Name → Readiness → Habits+SelfCare → Appearance+Sound+Notifications → Ready
    return ['welcome', 'readiness', 'routine', 'customize', 'ready'];
  } else if (obData.readiness === 'gentle') {
    // Minimal: Welcome+Name → Readiness → Ready (smart defaults, gentle mode)
    return ['welcome', 'readiness', 'ready'];
  } else if (obData.readiness === 'exploring') {
    // Quick: Welcome+Name → Readiness → Appearance → Ready
    return ['welcome', 'readiness', 'customize', 'ready'];
  }
  // Before readiness is chosen
  return ['welcome', 'readiness'];
}

function renderOnboarding() {
  const progress = document.getElementById('ob-progress');
  const body = document.getElementById('ob-body');
  const footer = document.getElementById('ob-footer');
  const path = getOBPath();
  const totalSteps = path.length;

  progress.innerHTML = Array.from({length: totalSteps}, (_, i) =>
    `<div class="ob-pip${i === obStep ? ' active' : i < obStep ? ' done' : ''}" role="img" aria-label="Step ${i+1} of ${totalSteps}${i === obStep ? ', current' : i < obStep ? ', completed' : ''}"></div>`
  ).join('');

  const currentStep = path[obStep] || 'welcome';
  switch(currentStep) {
    case 'welcome':   renderOBWelcomeAndName(body, footer); break;
    case 'readiness':  renderOBReadiness(body, footer); break;
    case 'routine':    renderOBRoutine(body, footer); break;
    case 'customize':  renderOBCustomize(body, footer); break;
    case 'ready':      renderOBReady(body, footer); break;
  }
}

function obNext() {
  // Save name if on welcome step
  const inp = document.getElementById('ob-name-input');
  if (inp && inp.value.trim()) obData.name = inp.value.trim();

  const path = getOBPath();
  obStep = Math.min(path.length - 1, obStep + 1);
  renderOnboarding();
}

function obBack() {
  obStep = Math.max(0, obStep - 1);
  renderOnboarding();
}

// ── NEW ADAPTIVE ONBOARDING STEPS ──────────────────────────

function renderOBWelcomeAndName(body, footer) {
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:12px">
      <div style="margin-bottom:20px;filter:drop-shadow(0 4px 24px rgba(var(--sage-rgb),0.35))">${bloomIcon(96)}</div>
      <div style="font-family:Fraunces,serif;font-size:42px;font-weight:300;color:var(--cream);line-height:1.1;margin-bottom:8px">bloom</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:16px;color:var(--text-secondary);margin-bottom:28px;letter-spacing:0.01em">a gentle self-care companion</div>
      <div style="width:100%;background:rgba(var(--sage-rgb),0.07);border:1px solid rgba(var(--sage-rgb),0.18);border-radius:20px;padding:20px 24px;margin-bottom:28px">
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:17px;color:var(--sage-light);line-height:1.7">No guilt. No pressure.<br>Just you, showing up.</div>
      </div>
      <div style="width:100%;text-align:left;margin-bottom:8px">
        <div class="ob-sub" style="margin-bottom:8px">What should we call you?</div>
        <input type="text" id="ob-name-input" placeholder="Your name..." value="${obData.name}" style="font-size:18px;padding:16px;width:100%">
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">Your name stays only on your device.</div>
      </div>
    </div>`;
  footer.innerHTML = `<button class="btn btn-primary btn-block" id="ob-btn-next" style="background:var(--sage);color:var(--text-on-sage)">Continue</button>`;
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
  setTimeout(() => { const i = document.getElementById('ob-name-input'); if(i && !i.value) i.focus(); }, 100);
}

function renderOBReadiness(body, footer) {
  const r = obData.readiness;
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:14px">🌿</div>
      <div class="ob-title" style="text-align:center">Where are you<br>right now${obData.name ? ', ' + obData.name : ''}?</div>
      <div class="ob-sub" style="text-align:center;margin-bottom:0">This helps bloom meet you where you are. There's no wrong answer.</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div onclick="obSetReadiness('ready')" style="
        padding:16px;border-radius:var(--r-xl);cursor:pointer;
        border:2px solid ${r === 'ready' ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)'};
        background:${r === 'ready' ? 'rgba(var(--sage-rgb),0.1)' : 'var(--bg-card)'};
        transition:all 0.2s">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="font-size:22px">🌱</span>
          <div style="font-size:15px;font-weight:500;color:var(--cream)">I'm ready to set things up</div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;padding-left:34px">Choose your habits, pick a theme, set up notifications — takes about 3 minutes.</div>
      </div>
      <div onclick="obSetReadiness('gentle')" style="
        padding:16px;border-radius:var(--r-xl);cursor:pointer;
        border:2px solid ${r === 'gentle' ? 'rgba(106,154,176,0.5)' : 'rgba(255,255,255,0.08)'};
        background:${r === 'gentle' ? 'rgba(106,154,176,0.1)' : 'var(--bg-card)'};
        transition:all 0.2s">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="font-size:22px">🫂</span>
          <div style="font-size:15px;font-weight:500;color:var(--cream)">I just need something gentle today</div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;padding-left:34px">Start with smart defaults. bloom will keep things quiet and simple. You can customize anytime.</div>
      </div>
      <div onclick="obSetReadiness('exploring')" style="
        padding:16px;border-radius:var(--r-xl);cursor:pointer;
        border:2px solid ${r === 'exploring' ? 'rgba(201,149,74,0.5)' : 'rgba(255,255,255,0.08)'};
        background:${r === 'exploring' ? 'rgba(201,149,74,0.1)' : 'var(--bg-card)'};
        transition:all 0.2s">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="font-size:22px">👀</span>
          <div style="font-size:15px;font-weight:500;color:var(--cream)">Just looking around</div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;padding-left:34px">Pick a theme and jump in. Everything else is default — tweak it from Settings whenever.</div>
      </div>
    </div>`;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1;${r ? '' : 'opacity:0.4;pointer-events:none'}">${r ? 'Continue' : 'Choose above'}</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  if (r) document.getElementById('ob-btn-next').addEventListener('click', () => {
    // For gentle path, set smart defaults
    if (r === 'gentle') {
      obData._startSmall = true;
      Object.keys(obData.habits).forEach(k => { obData.habits[k] = false; });
      obData.habits.m_teeth = true;
      obData.habits.e_teeth = true;
      obData.selfCareTasks = ['sc_warm_drink', 'sc_deep_breath'];
      obData.progressiveDisclosure = true;
    } else if (r === 'exploring') {
      obData.progressiveDisclosure = false;
    }
    obNext();
  });
}

function obSetReadiness(val) {
  obData.readiness = val;
  renderOnboarding();
}

function renderOBRoutine(body, footer) {
  // Combined habits + self-care on one screen (for "ready" path)
  const habits = [
    { id: 'm_teeth', icon: '🦷', name: 'Morning brush', type: 'daily' },
    { id: 'e_teeth', icon: '🦷', name: 'Evening brush', type: 'daily' },
    { id: 'w_shower', icon: '🚿', name: 'Shower', type: 'weekly' },
    { id: 'w_exercise', icon: '💪', name: 'Exercise', type: 'weekly' },
    { id: 'w_outside', icon: '🌿', name: 'Go outside', type: 'weekly' },
  ];

  let html = `<div class="ob-title">Your routine</div>
  <div class="ob-sub">Toggle on what you'd like to track. All of this can change later.</div>`;

  // Start small escape hatch
  if (!obData._startSmall) {
    html += `<div onclick="obStartSmall()" style="
      display:flex;align-items:center;gap:12px;
      background:rgba(var(--sage-rgb),0.07);border:1px solid rgba(var(--sage-rgb),0.18);
      border-radius:var(--r-lg);padding:12px 16px;margin-bottom:16px;cursor:pointer">
      <span style="font-size:20px">🌱</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--sage-light)">Feeling overwhelmed? Start small</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;line-height:1.5">Skip habits — just water & nourishment.</div>
      </div>
    </div>`;
  } else {
    html += `<div style="
      display:flex;align-items:center;gap:10px;
      background:rgba(var(--sage-rgb),0.07);border:1px solid rgba(var(--sage-rgb),0.18);
      border-radius:var(--r-lg);padding:12px 16px;margin-bottom:16px">
      <span style="font-size:16px">🌱</span>
      <div style="font-size:13px;color:var(--sage-light);font-style:italic;flex:1">Starting small — just water & nourishment.</div>
      <div onclick="obUndoStartSmall()" style="font-size:12px;color:var(--text-muted);cursor:pointer;text-decoration:underline">Undo</div>
    </div>`;
  }

  if (!obData._startSmall) {
    html += `<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px">Habits</div>`;
    habits.forEach(h => {
      const on = obData.habits[h.id];
      html += `<div class="toggle-row" style="padding:10px 0">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">${h.icon}</span>
          <div class="toggle-label">${h.name}</div>
        </div>
        <div class="toggle${on?' on':''}" onclick="obToggleHabit('${h.id}','${h.type}')"></div>
      </div>`;
    });

    // Meals tracking
    const mealsOn = obData.habits.track_meals;
    html += `<div style="height:1px;background:rgba(255,255,255,0.06);margin:4px 0"></div>
    <div class="toggle-row" style="padding:10px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">🍽</span>
        <div><div class="toggle-label">Track meals</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">Not calories — just a reminder to eat</div></div>
      </div>
      <div class="toggle${mealsOn?' on':''}" onclick="obToggleHabit('track_meals','daily')"></div>
    </div>`;
  }

  // Self-care quick picks
  const selected = obData.selfCareTasks || [];
  const curatedIds = ['sc_warm_drink', 'sc_deep_breath', 'sc_music'];
  const curatedTasks = curatedIds.map(id => SELF_CARE_TASKS.find(t => t.id === id)).filter(Boolean);
  html += `<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:16px 0 8px">Self-care (optional)</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px">`;
  curatedTasks.forEach(t => {
    const on = selected.includes(t.id);
    html += `<div onclick="obToggleSelfCare('${t.id}')" id="ob-sc-${t.id}" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:99px;cursor:pointer;background:${on ? 'rgba(var(--sage-rgb),0.2)' : 'rgba(255,255,255,0.04)'};border:1px solid ${on ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)'};font-size:13px;color:${on ? 'var(--sage-light)' : 'var(--text-secondary)'};transition:all 0.15s"><span>${t.icon}</span>${t.label}</div>`;
  });
  html += `</div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px">More options available in Settings.</div>`;

  body.innerHTML = html;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function renderOBCustomize(body, footer) {
  // Combined: Theme + Sound + Notifications on one screen
  const current = obData.theme || 'forest';
  const soundOn = obData.audio !== false;

  let html = `<div class="ob-title">Make it yours</div>
  <div class="ob-sub">Choose your look and feel.</div>`;

  // Theme picker
  html += `<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:10px">Color theme</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px">
    ${Object.entries(THEMES).map(([key, t]) => `
      <div onclick="obSetTheme('${key}')" style="
        background:${t.bg};
        border:2px solid ${key === current ? t.primary : 'rgba(255,255,255,0.1)'};
        border-radius:var(--r-lg);padding:12px 10px;cursor:pointer;text-align:center;
        transition:border-color 0.2s;${key === current ? 'transform:scale(1.03)' : ''}">
        <div style="font-size:14px;font-weight:500;color:${t.primaryLight}">${t.emoji}</div>
        <div style="font-size:11px;color:${t.textSecondary};margin-top:2px">${t.name}</div>
        ${key === current ? '<div style="font-size:10px;color:' + t.primary + ';margin-top:3px">✓</div>' : ''}
      </div>`).join('')}
  </div>`;

  // Sound toggle
  html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid rgba(255,255,255,0.06)">
    <div>
      <div style="font-size:14px;font-weight:500;color:var(--cream)">🔔 Sounds</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Soft chimes on habit completion</div>
    </div>
    <div class="toggle${soundOn?' on':''}" onclick="obToggleAudio()"></div>
  </div>`;

  // Notifications quick toggle
  html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid rgba(255,255,255,0.06)">
    <div>
      <div style="font-size:14px;font-weight:500;color:var(--cream)">💧 Water reminders</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Gentle nudges to stay hydrated</div>
    </div>
    <div class="toggle${obData.notifications.waterMode !== 'off' ? ' on' : ''}" onclick="obData.notifications.waterMode=obData.notifications.waterMode==='off'?'smart':'off';renderOnboarding()"></div>
  </div>`;

  // Pace setting
  html += `<div style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.06)">
    <div style="font-size:14px;font-weight:500;margin-bottom:6px;color:var(--cream)">🌱 Your pace</div>
    <div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:10px">
      Introduce features gradually, or start with everything.
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div id="ob-pace-gradual" onclick="obSetPace(true)" style="padding:10px 12px;border-radius:var(--r-md);cursor:pointer;border:2px solid rgba(var(--sage-rgb),0.4);background:rgba(var(--sage-rgb),0.08);transition:all 0.2s">
        <div style="font-size:13px;font-weight:500;color:var(--sage-light)">Ease me in</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Start simple, unlock more each week</div>
      </div>
      <div id="ob-pace-all" onclick="obSetPace(false)" style="padding:10px 12px;border-radius:var(--r-md);cursor:pointer;border:2px solid rgba(255,255,255,0.08);background:transparent;transition:all 0.2s">
        <div style="font-size:13px;font-weight:500;color:var(--cream)">Show me everything</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">I'm ready for all features from day one</div>
      </div>
    </div>
  </div>`;

  html += `<div style="font-size:11px;color:var(--text-muted);margin-top:12px;text-align:center">All settings can be changed anytime.</div>`;

  body.innerHTML = html;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

// ── LEGACY ONBOARDING STEPS (kept for compatibility) ──────

function renderOBWelcome(body, footer) {
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:12px">
      <div style="margin-bottom:20px;filter:drop-shadow(0 4px 24px rgba(var(--sage-rgb),0.35))">${bloomIcon(96)}</div>
      <div style="font-family:Fraunces,serif;font-size:42px;font-weight:300;color:var(--cream);line-height:1.1;margin-bottom:8px">bloom</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:16px;color:var(--text-secondary);margin-bottom:32px;letter-spacing:0.01em">a gentle self-care companion</div>
      <div style="width:100%;background:rgba(var(--sage-rgb),0.07);border:1px solid rgba(var(--sage-rgb),0.18);border-radius:20px;padding:20px 24px">
        <div style="font-family:Fraunces,serif;font-style:italic;font-size:17px;color:var(--sage-light);line-height:1.7">No guilt. No pressure.<br>Just you, showing up.</div>
      </div>
      <div style="margin-top:28px;display:flex;flex-direction:column;gap:10px;width:100%">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-card);border-radius:14px">
          <span style="font-size:22px">🌱</span>
          <div style="text-align:left"><div style="font-size:13px;font-weight:500;color:var(--cream)">Build gentle habits</div><div style="font-size:12px;color:var(--text-muted)">Daily + weekly at your own pace</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-card);border-radius:14px">
          <span style="font-size:22px">💫</span>
          <div style="text-align:left"><div style="font-size:13px;font-weight:500;color:var(--cream)">Reflect and grow</div><div style="font-size:12px;color:var(--text-muted)">Journal, insights, breathing</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-card);border-radius:14px">
          <span style="font-size:22px">🔒</span>
          <div style="text-align:left">
            <div style="font-size:13px;font-weight:500;color:var(--cream)">Yours, and only yours</div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-top:2px">Everything stays on your device. No accounts, no servers, no one else ever sees it.</div>
          </div>
        </div>
      </div>
    </div>
  `;
  footer.innerHTML = `<button class="btn btn-primary btn-block" id="ob-btn-next" style="background:var(--sage);color:var(--text-on-sage)">Begin →</button>`;
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function renderOBName(body, footer) {
  body.innerHTML = `
    <div class="ob-title">What should we<br>call you?</div>
    <div class="ob-sub">Your name stays only on your device.</div>
    <input type="text" id="ob-name-input" placeholder="Your name..." value="${obData.name}" style="font-size:18px;padding:16px">
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
  setTimeout(() => { const i = document.getElementById('ob-name-input'); if(i) i.focus(); }, 100);
}

function renderOBHabits(body, footer) {
  const habits = [
    { id: 'm_teeth', icon: '🦷', name: 'Morning brush', type: 'daily' },
    { id: 'e_teeth', icon: '🦷', name: 'Evening brush', type: 'daily' },
    { id: 'w_shower', icon: '🚿', name: 'Shower', type: 'weekly' },
    { id: 'w_exercise', icon: '💪', name: 'Exercise', type: 'weekly' },
    { id: 'w_outside', icon: '🌿', name: 'Go outside', type: 'weekly' },
  ];

  let html = `<div class="ob-title">Choose your habits</div>
  <div class="ob-sub">Toggle on what you'd like to track. You can change these anytime.</div>`;

  // "Start small" escape hatch
  if (!obData._startSmall) {
    html += `<div onclick="obStartSmall()" style="
      display:flex;align-items:center;gap:12px;
      background:rgba(var(--sage-rgb),0.07);border:1px solid rgba(var(--sage-rgb),0.18);
      border-radius:var(--r-lg);padding:12px 16px;margin-bottom:16px;cursor:pointer">
      <span style="font-size:20px">🌱</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--sage-light)">Feeling overwhelmed? Start small</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;line-height:1.5">Skip this for now — just water & nourishment. You can add habits anytime from Settings.</div>
      </div>
      <div style="font-size:18px;color:var(--text-muted)">›</div>
    </div>`;
  } else {
    html += `<div style="
      display:flex;align-items:center;gap:10px;
      background:rgba(var(--sage-rgb),0.07);border:1px solid rgba(var(--sage-rgb),0.18);
      border-radius:var(--r-lg);padding:12px 16px;margin-bottom:16px">
      <span style="font-size:16px">🌱</span>
      <div style="font-size:13px;color:var(--sage-light);font-style:italic;flex:1">Starting small — just water & nourishment. You can add more anytime.</div>
      <div onclick="obUndoStartSmall()" style="font-size:12px;color:var(--text-muted);cursor:pointer;text-decoration:underline">Undo</div>
    </div>`;
  }

  if (!obData._startSmall) {
    habits.forEach(h => {
      const on = obData.habits[h.id];
      html += `<div class="toggle-row" style="padding:12px 0">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">${h.icon}</span>
          <div>
            <div class="toggle-label">${h.name}</div>
            <div class="toggle-sub">${h.type === 'daily' ? 'Daily +15 ☀️' : 'Weekly goal'}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${h.type === 'weekly' && on ? `<div class="stepper">
            <div class="stepper-btn" onclick="obAdjustGoal('${h.id}',-1)">−</div>
            <div class="stepper-val" id="ob-goal-${h.id}">${obData.goals[h.id] || 3}x</div>
            <div class="stepper-btn" onclick="obAdjustGoal('${h.id}',1)">+</div>
          </div>` : ''}
          <div class="toggle${on?' on':''}" id="ob-toggle-${h.id}" onclick="obToggleHabit('${h.id}','${h.type}')"></div>
        </div>
      </div>`;
    });

    // Meals tracking option
    const mealsOn = obData.habits.track_meals;
    html += `
    <div style="height:1px;background:rgba(255,255,255,0.06);margin:4px 0"></div>
    <div class="toggle-row" style="padding:12px 0">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:20px;margin-top:2px">🍽</span>
        <div>
          <div class="toggle-label">Track daily meals</div>
          <div class="toggle-sub" style="line-height:1.5">Adds Breakfast, Lunch & Dinner to your daily check-in — not as a nutrition tracker, just a gentle reminder that feeding yourself is an act of self-care.</div>
        </div>
      </div>
      <div class="toggle${mealsOn?' on':''}" style="flex-shrink:0;margin-top:2px" onclick="obToggleHabit('track_meals','daily')"></div>
    </div>`;
  }

  body.innerHTML = html;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function obToggleHabit(id, type) {
  obData.habits[id] = !obData.habits[id];
  renderOnboarding();
}

function obStartSmall() {
  obData._startSmall = true;
  // Turn off all habits — user starts with just water & nourishment
  obData._savedHabits = { ...obData.habits };
  Object.keys(obData.habits).forEach(k => { obData.habits[k] = false; });
  renderOnboarding();
}

function obUndoStartSmall() {
  obData._startSmall = false;
  if (obData._savedHabits) obData.habits = { ...obData._savedHabits };
  delete obData._savedHabits;
  renderOnboarding();
}

function obAdjustGoal(key, delta) {
  obData.goals[key] = Math.max(1, Math.min(7, (obData.goals[key] || 3) + delta));
  const el = document.getElementById('ob-goal-' + key);
  if (el) el.textContent = obData.goals[key] + 'x';
}

function renderOBHousehold(body, footer) {
  const defaults = [
    { id: 'laundry', icon: '🧺', name: 'Laundry' },
    { id: 'trash', icon: '🗑', name: 'Trash' },
    { id: 'dishes', icon: '🍽', name: 'Dishes' },
    { id: 'clean_room', icon: '🧹', name: 'Clean room' },
  ];

  let html = `<div class="ob-title">Household tasks</div>
  <div class="ob-sub">Pick the weekly tasks you want to track. Add your own too.</div>`;

  defaults.forEach(d => {
    const checked = obData.householdTasks.some(t => t.id === d.id);
    html += `<div class="ob-checkbox-row" onclick="obToggleTask('${d.id}','${d.name}','${d.icon}')">
      <div class="ob-checkbox${checked?' checked':''}"><span>${checked?'✓':''}</span></div>
      <span style="font-size:18px">${d.icon}</span>
      <div class="toggle-label">${d.name}</div>
    </div>`;
  });

  // Custom tasks
  const customs = obData.householdTasks.filter(t => !defaults.some(d => d.id === t.id));
  customs.forEach(t => {
    html += `<div class="ob-checkbox-row">
      <div class="ob-checkbox checked"><span>✓</span></div>
      <span>✏️</span>
      <div class="toggle-label" style="flex:1">${t.name}</div>
      <div onclick="obRemoveTask('${t.id}')" style="color:var(--rose-light);font-size:12px;cursor:pointer">✕</div>
    </div>`;
  });

  html += `<div style="display:flex;gap:8px;margin-top:12px">
    <input type="text" id="ob-custom-task" placeholder="Add custom task...">
    <button class="btn btn-ghost btn-sm" onclick="obAddCustomTask()">Add</button>
  </div>`;

  body.innerHTML = html;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function obToggleTask(id, name, icon) {
  const idx = obData.householdTasks.findIndex(t => t.id === id);
  if (idx > -1) obData.householdTasks.splice(idx, 1);
  else obData.householdTasks.push({ id, name, icon });
  renderOnboarding();
}

function obRemoveTask(id) {
  obData.householdTasks = obData.householdTasks.filter(t => t.id !== id);
  renderOnboarding();
}

function obAddCustomTask() {
  const input = document.getElementById('ob-custom-task');
  if (!input || !input.value.trim()) return;
  const id = 'custom_' + Date.now();
  obData.householdTasks.push({ id, name: input.value.trim(), icon: '✏️' });
  renderOnboarding();
}

function renderOBWater(body, footer) {
  body.innerHTML = `
    <div class="ob-logo" style="font-size:48px">💧</div>
    <div class="ob-title">Water &<br>nourishment</div>
    <div class="ob-sub">These are always on — staying hydrated and eating something each day are simple acts of care for yourself.</div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:24px">💧</span>
        <div>
          <div style="font-size:15px;font-weight:500">Water tracker</div>
          <div style="font-size:12px;color:var(--text-secondary)">3 bottles per day goal</div>
        </div>
        <div class="chip chip-sage" style="margin-left:auto">Always on</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:24px;margin-top:2px">🍽</span>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:500">Nourishment check-in</div>
          ${obData.habits.track_meals
            ? `<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-top:2px">Breakfast, Lunch & Dinner — plus "Felt nourished" always. Not a food tracker, just a kind reminder to eat.</div>`
            : `<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-top:2px">Ate a meal, had veggies, felt nourished — gentle check-ins, no pressure.</div>`
          }
        </div>
        <div class="chip chip-sage" style="margin-left:auto;margin-top:2px">Always on</div>
      </div>
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function renderOBNotifications(body, footer) {
  body.innerHTML = `
    <div class="ob-title">Notifications</div>
    <div class="ob-sub">Gentle nudges — all optional, all adjustable later.</div>
    <div class="card">
      <div class="card-title">Water reminders</div>
      <div class="radio-group">
        ${['smart','hourly','off'].map(m => `<div class="radio-option${obData.notifications.waterMode===m?' selected':''}" onclick="obSetWaterMode('${m}')">
          <div class="radio-dot"></div>
          <div class="radio-label">${m==='smart'?'Smart — only if you haven\'t logged water':m==='hourly'?'Hourly':'Off'}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="toggle-row">
      <div><div class="toggle-label">Sunday goal reminder</div><div class="toggle-sub">Weekly nudge to set your household tasks</div></div>
      <div class="toggle${obData.notifications.sundayReminder?' on':''}" onclick="obToggleSundayReminder()"></div>
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function obSetWaterMode(mode) {
  obData.notifications.waterMode = mode;
  renderOnboarding();
}

function obToggleSundayReminder() {
  obData.notifications.sundayReminder = !obData.notifications.sundayReminder;
  renderOnboarding();
}

function renderOBAudio(body, footer) {
  const on = obData.audio !== false; // default on
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:64px;margin-bottom:16px">🔔</div>
      <div class="ob-title" style="text-align:center">Sound feedback</div>
      <div class="ob-sub" style="text-align:center;margin-bottom:0">Soft chimes when you complete habits — like a gentle acknowledgment.</div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="toggle-row" style="border-bottom:none">
        <div>
          <div class="toggle-label">Enable sounds</div>
          <div class="toggle-sub">Soft tones on habit completion, breathing phases, and milestones</div>
        </div>
        <div class="toggle${on?' on':''}" id="ob-audio-toggle" onclick="obToggleAudio()"></div>
      </div>
    </div>
    <div style="background:var(--bg-card);border-radius:var(--r-lg);padding:14px 16px;cursor:pointer" onclick="obPreviewSound()" id="ob-preview-btn">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(var(--sage-rgb),0.15);border:1px solid rgba(var(--sage-rgb),0.3);display:flex;align-items:center;justify-content:center;font-size:16px">▶</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--cream)">Preview sound</div>
          <div style="font-size:12px;color:var(--text-secondary)">Tap to hear what habit completion sounds like</div>
        </div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:16px;line-height:1.6">
      You can change this any time in Settings. Sounds play even on silent mode — turn off if you prefer silence.
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function obToggleAudio() {
  obData.audio = !(obData.audio !== false);
  const toggle = document.getElementById('ob-audio-toggle');
  if (toggle) toggle.className = 'toggle' + (obData.audio ? ' on' : '');
}

function obPreviewSound() {
  playSound('habit');
}

function renderOBAppearance(body, footer) {
  const current = obData.theme || 'forest';
  body.innerHTML = `
    <div class="ob-title">Make it yours</div>
    <div class="ob-sub">Choose a color palette — you can change this any time in Settings.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px">
      ${Object.entries(THEMES).map(([key, t]) => `
        <div onclick="obSetTheme('${key}')" style="
          background:${t.bg};
          border:2px solid ${key === current ? t.primary : 'rgba(255,255,255,0.1)'};
          border-radius:var(--r-xl);padding:16px 14px;cursor:pointer;
          transition:border-color 0.2s,transform 0.15s;
          ${key === current ? `transform:scale(1.03)` : ''}">
          <div style="display:flex;gap:5px;margin-bottom:10px">
            <div style="width:14px;height:14px;border-radius:50%;background:#7a9e7e"></div>
            <div style="width:14px;height:14px;border-radius:50%;background:#b07878"></div>
            <div style="width:14px;height:14px;border-radius:50%;background:#6a9ab0"></div>
            <div style="width:14px;height:14px;border-radius:50%;background:#c9954a"></div>
          </div>
          <div style="font-size:15px;font-weight:500;color:${t.primaryLight}">${t.emoji} ${t.name}</div>
          <div style="font-size:12px;color:${t.textSecondary};margin-top:3px">${t.description}</div>
          ${key === current ? `<div style="font-size:11px;color:${t.primary};margin-top:6px">Selected ✓</div>` : ''}
        </div>`).join('')}
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function obSetTheme(key) {
  obData.theme = key;
  applyTheme(key);
  renderOnboarding();
}

function renderOBSelfCare(body, footer) {
  const selected = obData.selfCareTasks || [];
  const showAll = obData._showAllSelfCare;

  // Curated suggestions — one gentle pick from each category
  const curatedIds = ['sc_warm_drink', 'sc_deep_breath', 'sc_music'];
  const curatedTasks = curatedIds.map(id => SELF_CARE_TASKS.find(t => t.id === id)).filter(Boolean);

  let html = `
    <div class="ob-title">Daily self-care</div>
    <div class="ob-sub" style="line-height:1.7">A few gentle ideas to start with. Pick what feels possible, not what feels perfect.</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;font-style:italic;line-height:1.6">You can add, change, or remove any of these later. This is entirely yours.</div>`;

  if (!showAll) {
    // Show curated suggestions
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">`;
    curatedTasks.forEach(t => {
      const on = selected.includes(t.id);
      const pillStyle = `display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:99px;cursor:pointer;background:${on ? 'rgba(var(--sage-rgb),0.2)' : 'rgba(255,255,255,0.04)'};border:1px solid ${on ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)'};font-size:13px;color:${on ? 'var(--sage-light)' : 'var(--text-secondary)'};transition:all 0.15s`;
      html += `<div onclick="obToggleSelfCare('${t.id}')" id="ob-sc-${t.id}" style="${pillStyle}"><span>${t.icon}</span>${t.label}</div>`;
    });
    html += `</div>`;

    // "Explore more" link
    html += `<div onclick="obData._showAllSelfCare=true;renderOnboarding()" style="
      display:flex;align-items:center;gap:10px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
      border-radius:var(--r-lg);padding:12px 16px;margin-bottom:16px;cursor:pointer">
      <span style="font-size:16px">✨</span>
      <div style="flex:1">
        <div style="font-size:13px;color:var(--text-secondary)">Explore all self-care options</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">16 gentle ideas across 4 categories</div>
      </div>
      <div style="font-size:18px;color:var(--text-muted)">›</div>
    </div>`;
  } else {
    // Show all categories
    SELF_CARE_CATEGORIES.forEach(cat => {
      html += `<div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:16px">${cat.icon}</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--cream)">${cat.label}</div>
            <div style="font-size:11px;color:var(--text-muted)">${cat.sub}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${cat.tasks.map(t => {
            const on = selected.includes(t.id);
            const pillStyle = `display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:99px;cursor:pointer;background:${on ? 'rgba(var(--sage-rgb),0.2)' : 'rgba(255,255,255,0.04)'};border:1px solid ${on ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)'};font-size:13px;color:${on ? 'var(--sage-light)' : 'var(--text-secondary)'};transition:all 0.15s`;
            return `<div onclick="obToggleSelfCare('${t.id}')" id="ob-sc-${t.id}" style="${pillStyle}"><span>${t.icon}</span>${t.label}</div>`;
          }).join('')}
        </div>
      </div>`;
    });
  }

  // Medication — separate, extra gentle
  const medOn = selected.includes('sc_medication');
  const medPillStyle = `display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:99px;cursor:pointer;background:${medOn ? 'rgba(106,154,176,0.2)' : 'rgba(255,255,255,0.04)'};border:1px solid ${medOn ? 'rgba(106,154,176,0.4)' : 'rgba(255,255,255,0.08)'};font-size:13px;color:${medOn ? 'var(--sky-light)' : 'var(--text-secondary)'};transition:all 0.15s`;
  html += `<div style="background:rgba(158,196,216,0.06);border:1px solid rgba(158,196,216,0.15);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:8px">
    <div style="font-size:12px;color:var(--sky-light);font-weight:500;margin-bottom:4px">💊 Medication</div>
    <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:10px">A quiet, private nudge — just a gentle "did I remember?" with no judgment either way.</div>
    <div onclick="openMedicationSheet()" id="ob-sc-sc_medication" style="${medPillStyle}">${medOn ? "💊 Medication ✓" : "💊 Set up reminder →"}</div>
  </div>`;

  body.innerHTML = html;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function obToggleSelfCare(id) {
  if (!obData.selfCareTasks) obData.selfCareTasks = [];
  const idx = obData.selfCareTasks.indexOf(id);
  if (idx > -1) obData.selfCareTasks.splice(idx, 1);
  else obData.selfCareTasks.push(id);

  // Update pill style in place without full re-render
  const el = document.getElementById('ob-sc-' + id);
  if (!el) return;
  const on = obData.selfCareTasks.includes(id);
  el.style.background = on ? 'rgba(var(--sage-rgb),0.2)' : 'rgba(255,255,255,0.04)';
  el.style.borderColor = on ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)';
  el.style.color = on ? 'var(--sage-light)' : 'var(--text-secondary)';
  if (id === 'sc_medication') {
    el.style.background = on ? 'rgba(106,154,176,0.2)' : 'rgba(255,255,255,0.04)';
    el.style.borderColor = on ? 'rgba(106,154,176,0.4)' : 'rgba(255,255,255,0.08)';
    el.style.color = on ? 'var(--sky-light)' : 'var(--text-secondary)';
  }
}

function renderOBInstall(body, footer) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const iosSteps = [
    { icon: '↑', label: 'Tap the <strong style="color:var(--cream)">Share</strong> button — the box with an arrow at the bottom of Safari' },
    { icon: '＋', label: 'Scroll down and tap <strong style="color:var(--cream)">Add to Home Screen</strong>' },
    { icon: '✓', label: 'Tap <strong style="color:var(--cream)">Add</strong> — bloom appears on your home screen like any app' },
  ];
  const androidSteps = [
    { icon: '⋮', label: 'Tap the <strong style="color:var(--cream)">menu</strong> in the top-right corner of Chrome' },
    { icon: '＋', label: 'Tap <strong style="color:var(--cream)">Add to Home screen</strong>' },
    { icon: '✓', label: 'Tap <strong style="color:var(--cream)">Add</strong> to confirm' },
  ];

  const steps = isIOS ? iosSteps : androidSteps;
  const platform = isIOS ? '🍎 iPhone / iPad' : '🤖 Android';
  const stepsHtml = steps.map((s, i) => `
    <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05)${i === steps.length-1 ? ';border-bottom:none' : ''}">
      <div style="width:32px;height:32px;border-radius:50%;background:rgba(var(--sage-rgb),0.15);border:1px solid rgba(var(--sage-rgb),0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--sage-light);flex-shrink:0">${i+1}</div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;padding-top:6px">${s.label}</div>
    </div>`).join('');

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:64px;line-height:1;margin-bottom:16px">📲</div>
      <div class="ob-title" style="text-align:center">Add bloom to your<br>home screen</div>
      <div class="ob-sub" style="text-align:center;margin-bottom:0">Works like a real app — no app store needed.</div>
    </div>
    <div style="background:var(--bg-card);border-radius:20px;padding:4px 16px 4px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:600;color:var(--sage);text-transform:uppercase;letter-spacing:0.08em;padding:14px 0 4px">${platform}</div>
      ${stepsHtml}
    </div>
    <div style="background:rgba(201,149,74,0.07);border:1px solid rgba(201,149,74,0.2);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px">
      <span style="font-size:20px">💡</span>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.5">Once installed, bloom opens fullscreen with no browser bar — just like a native app.</div>
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function renderOBBuddyIntro(body, footer) {
  const multiOn = obData.multiBuddy;
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:64px;line-height:1;margin-bottom:16px">🤝</div>
      <div class="ob-title" style="text-align:center">bloom buddy</div>
      <div class="ob-sub" style="text-align:center">Partner with someone for mutual encouragement. Your buddy can see your mood, streak, and habit progress — but not your journal or specific habits.</div>
    </div>

    <div style="background:var(--bg-card);border-radius:16px;padding:16px;margin-bottom:16px">
      <div style="font-size:13px;color:var(--cream);font-weight:500;margin-bottom:12px">What your buddy sees:</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">
        Your mood (Low / Rough / Okay / Good / Great) — <em>if mood sharing is on</em><br>
        Your days shown up (total days active)<br>
        Your habit completion % (not which habits)<br>
        Your display name & when you were last active
      </div>
    </div>

    <div class="toggle-row" style="padding:14px 0">
      <div>
        <div class="toggle-label">Share mood with buddy</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Let your buddy see your mood and get notified on rough days</div>
      </div>
      <div class="toggle${obData.buddyShareMood !== false ? ' on' : ''}" onclick="obData.buddyShareMood=obData.buddyShareMood===false?true:false;renderOnboarding()"></div>
    </div>
    <div class="toggle-row" style="padding:14px 0;border-bottom:none">
      <div>
        <div class="toggle-label">Allow multiple buddies</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Let more than one person pair with you</div>
      </div>
      <div class="toggle${multiOn ? ' on' : ''}" onclick="obData.multiBuddy=!obData.multiBuddy;renderOnboarding()"></div>
    </div>

    <div style="background:rgba(106,154,176,0.08);border:1px solid rgba(106,154,176,0.15);border-radius:var(--r-lg);padding:10px 14px;margin-top:12px;font-size:12px;color:var(--sky-light);line-height:1.6">
      Buddies are for encouragement — not therapy or crisis support. Never share personal info (phone, email, address). If anything feels off, you can unpair instantly.
    </div>
    <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:8px;line-height:1.6">
      You can find a buddy from the Community tab anytime.<br>You can change this setting later.
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-next" style="flex:1">Continue</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  document.getElementById('ob-btn-next').addEventListener('click', obNext);
}

function renderOBReady(body, footer) {
  body.innerHTML = `
    <div class="ob-logo">🌱</div>
    <div class="ob-title">You're all set,<br>${obData.name || 'friend'}</div>
    <div class="ob-sub">bloom is ready whenever you are. No rush — every small step counts.</div>
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="font-size:22px;flex-shrink:0">🎂</span>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--cream);margin-bottom:6px">Age acknowledgment</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:10px">
            bloom is designed for users aged 16 and older.
          </div>
          <div id="ob-age-gate" style="display:flex;flex-direction:column;gap:8px">
            <div onclick="obSetAge('16plus')" id="ob-age-16" style="padding:10px 14px;border-radius:var(--r-md);cursor:pointer;border:2px solid ${obData.ageGroup === '16plus' ? 'rgba(var(--sage-rgb),0.4)' : 'rgba(255,255,255,0.08)'};background:${obData.ageGroup === '16plus' ? 'rgba(var(--sage-rgb),0.08)' : 'transparent'};font-size:13px;color:var(--cream);transition:all 0.2s">
              I'm 16 or older
            </div>
            <div onclick="obSetAge('under16')" id="ob-age-u16" style="padding:10px 14px;border-radius:var(--r-md);cursor:pointer;border:2px solid ${obData.ageGroup === 'under16' ? 'rgba(176,120,120,0.4)' : 'rgba(255,255,255,0.08)'};background:${obData.ageGroup === 'under16' ? 'rgba(176,120,120,0.08)' : 'transparent'};font-size:13px;color:var(--cream);transition:all 0.2s">
              I'm under 16
            </div>
          </div>
          ${obData.ageGroup === 'under16' ? '<div style="font-size:12px;color:var(--rose-light);margin-top:8px;line-height:1.6">bloom is designed for users 16 and older. If you\'re looking for mental health support, please talk to a parent, guardian, or school counselor who can help you find age-appropriate resources.</div>' : ''}
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="font-size:22px;flex-shrink:0">🔒</span>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--cream);margin-bottom:6px">Your data is completely private</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7">
            Everything you write in bloom — your journal, your moods, your habits — lives only on this device. It's never uploaded, never shared, and never seen by anyone else. Not us, not anyone.
          </div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:8px">
            The only exception is when you use the AI features — those prompts are sent to Claude to generate a response, but are never stored or linked to you.
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px">Full privacy policy and terms available in Settings.</div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="font-size:22px;flex-shrink:0">💛</span>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--cream);margin-bottom:6px">bloom is not a substitute for professional care</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7">
            bloom is a self-care companion — not a therapist, counselor, or medical provider. If you're struggling with your mental health, please reach out to a licensed professional. The crisis heart (🤍) in the header is always available for immediate support resources.
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div style="font-size:14px;font-weight:500;margin-bottom:10px">💾 Save a backup link</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
        Because your data lives only on this device, we recommend saving a restore link — it lets you recover everything if you switch phones or clear your browser.
      </div>
      <button class="btn btn-secondary btn-block" onclick="obShowBackup()">Generate backup link</button>
      <div id="ob-backup-url" style="display:none;margin-top:10px" class="backup-url-box"></div>
    </div>
  `;
  const canFinish = obData.ageGroup === '16plus';
  footer.innerHTML = `
    <button class="btn btn-ghost" id="ob-btn-back">← Back</button>
    <button class="btn btn-primary" id="ob-btn-finish" style="flex:1;${canFinish ? '' : 'opacity:0.4;pointer-events:none'}">${canFinish ? "I'm ready" : "Select your age above"}</button>
  `;
  document.getElementById('ob-btn-back').addEventListener('click', obBack);
  if (canFinish) document.getElementById('ob-btn-finish').addEventListener('click', completeOnboarding);
}

function obSetAge(group) {
  obData.ageGroup = group;
  renderOnboarding();
}

function obSetPace(gradual) {
  obData.progressiveDisclosure = gradual;
  const gradualEl = document.getElementById('ob-pace-gradual');
  const allEl = document.getElementById('ob-pace-all');
  if (gradualEl && allEl) {
    gradualEl.style.borderColor = gradual ? 'rgba(var(--sage-rgb),0.4)' : 'rgba(255,255,255,0.08)';
    gradualEl.style.background = gradual ? 'rgba(var(--sage-rgb),0.08)' : 'transparent';
    allEl.style.borderColor = gradual ? 'rgba(255,255,255,0.08)' : 'rgba(var(--sage-rgb),0.4)';
    allEl.style.background = gradual ? 'transparent' : 'rgba(var(--sage-rgb),0.08)';
  }
}

function obShowBackup() {
  // Save first so the link has real data
  const tempPrefs = { ...obData, onboarded: true };
  save('bloom_prefs', tempPrefs);
  try {
    const data = { prefs: tempPrefs };
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = `${location.origin}${location.pathname}?restore=${encoded}`;
    const el = document.getElementById('ob-backup-url');
    if (el) { el.style.display='block'; el.textContent=url; }
  } catch(e) {}
}

function completeOnboarding() {
  const prefs = {
    ...obData,
    onboarded: true,
    onboardDate: today(),
    progressiveDisclosure: obData.progressiveDisclosure !== false, // default true (gradual)
  };

  // Gentle path: enable gentle mode for first day
  if (obData.readiness === 'gentle') {
    prefs.progressiveDisclosure = true;
  }

  save('bloom_prefs', prefs);
  save('bloom_xp', { total: 0, streak: 0, daysShowedUp: 0, currentRun: 0, lastStreakDate: null });
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  initApp();

  // Gentle path: auto-activate gentle mode on first load
  if (obData.readiness === 'gentle') {
    state.todayData.gentleMode = true;
    saveState();
  }
}

// ============================================================
//  ONESIGNAL

export { renderOnboarding, completeOnboarding };

window.renderOnboarding = renderOnboarding;
window.obNext = obNext;
window.obBack = obBack;
window.obSetReadiness = obSetReadiness;
window.obToggleHabit = obToggleHabit;
window.obStartSmall = obStartSmall;
window.obUndoStartSmall = obUndoStartSmall;
window.obAdjustGoal = obAdjustGoal;
window.obToggleTask = obToggleTask;
window.obRemoveTask = obRemoveTask;
window.obAddCustomTask = obAddCustomTask;
window.obSetWaterMode = obSetWaterMode;
window.obToggleSundayReminder = obToggleSundayReminder;
window.obToggleAudio = obToggleAudio;
window.obPreviewSound = obPreviewSound;
window.obSetTheme = obSetTheme;
window.obToggleSelfCare = obToggleSelfCare;
window.completeOnboarding = completeOnboarding;
window.obSetAge = obSetAge;
window.obSetPace = obSetPace;
window.obShowBackup = obShowBackup;
