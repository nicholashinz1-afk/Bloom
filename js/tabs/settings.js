import { state, today, weekStart, saveState } from '../state.js';
import { save, load } from '../storage.js';
import { haptic, playSound, escapeHtml } from '../utils.js';
import { celebrate } from '../celebrate.js';
import { DAILY_HABITS, MEDICATION_HABIT, SELF_CARE_CATEGORIES, SELF_CARE_TASKS, VERSION } from '../constants.js';
import { THEMES, setTheme } from '../theme.js';
import { bloomIcon } from '../icons.js';
import { sendTelemetry, trackFeature, exportDiagnostics } from '../telemetry.js';
import { showBackupSheet } from '../backup.js';
import { openSheet, closeAllSheets } from '../sheets.js';
import { switchTab } from '../router.js';
import { renderTodayTab } from './today.js';
import { scheduleAllPushNotifications } from '../notifications.js';
function renderSettingsTab() {
  const scroll = document.getElementById('settings-scroll');
  if (!scroll) return;

  const prefs = state.prefs;
  const xp = state.xpData;
  const level = getLevel(xp.total || 0);
  const notifs = prefs.notifications || {};
  const goals = prefs.goals || {};

  let html = '';

  // ── GROUP: YOUR SETUP ────────────────────────────────────────
  html += `<div class="settings-group">
    <div class="settings-group-header" onclick="toggleSettingsGroup('setup')" role="button" aria-expanded="true" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSettingsGroup('setup')}">
      <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted)">Your setup</span>
      <span class="settings-group-chevron" id="sg-chevron-setup" style="font-size:10px;color:var(--text-muted);transition:transform 0.2s">▾</span>
    </div>
    <div class="settings-group-body" id="sg-body-setup">`;

  // ── PROFILE ──────────────────────────────────────────────────
  html += settingsSection('profile', '👤 Profile', `
    <div class="toggle-row" style="border-bottom:none;margin-bottom:12px">
      <div><div class="toggle-label">Your name</div></div>
      <input type="text" id="settings-name" value="${prefs.name || ''}" style="width:140px;padding:6px 10px;font-size:13px" onchange="saveSettingsName()">
    </div>
    <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:32px">${level.emoji}</div>
      <div>
        <div style="font-size:15px;font-weight:500;color:var(--cream)">${level.name}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${xp.total || 0} sunlight total</div>
      </div>
    </div>
    <div class="divider"></div>
    <div style="display:flex;align-items:center;gap:12px">
      <div style="font-size:24px">🌿</div>
      <div>
        <div style="font-size:15px;font-weight:500;color:var(--cream)">${xp.daysShowedUp || 0} days shown up</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Current run: ${xp.currentRun || 0} day${(xp.currentRun || 0) !== 1 ? 's' : ''} in a row</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.6">
      Every day you show up adds to your total — it never goes down, even if you miss a day.
    </div>
  `);

  // ── APPEARANCE ──────────────────────────────────────────────
  const currentTheme = prefs.theme || 'forest';
  const celebPref = prefs.celebrationIntensity || 'auto';
  const highContrastOn = prefs.highContrast || false;

  html += settingsSection('appearance', '🎨 Appearance', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${Object.entries(THEMES).map(([key, t]) => {
        const dots = t.pride
          ? ['#e04050','#e87030','#e8c840','#50b868','#4080d0','#9050c8'].map(c =>
              `<div style="width:12px;height:12px;border-radius:50%;background:${c}"></div>`).join('')
          : `<div style="width:12px;height:12px;border-radius:50%;background:${t.primary}"></div>
             <div style="width:12px;height:12px;border-radius:50%;background:${t.primaryLight};opacity:0.7"></div>
             <div style="width:12px;height:12px;border-radius:50%;background:${t.primary};opacity:0.5"></div>
             <div style="width:12px;height:12px;border-radius:50%;background:${t.primaryLight};opacity:0.4"></div>`;
        return `
        <div onclick="setTheme('${key}')" style="
          background:${t.bg};border:2px solid ${key === currentTheme ? t.primary : 'rgba(255,255,255,0.08)'};
          border-radius:var(--r-lg);padding:0;cursor:pointer;
          transition:border-color 0.2s;position:relative;overflow:hidden">
          <div style="height:3px;background:${t.accent};border-radius:var(--r-lg) var(--r-lg) 0 0"></div>
          <div style="padding:12px 12px 14px">
            <div style="display:flex;gap:5px;margin-bottom:8px">${dots}</div>
            <div style="font-size:13px;font-weight:500;color:${t.primaryLight}">${t.emoji} ${t.name}</div>
            <div style="font-size:11px;color:${t.textSecondary};margin-top:2px">${t.description}</div>
          </div>
          ${key === currentTheme ? `<div style="position:absolute;top:8px;right:8px;font-size:12px;color:${t.primary}">✓</div>` : ''}
        </div>`;
      }).join('')}
    </div>

    <div class="divider"></div>

    <div class="toggle-row" style="padding:12px 0">
      <div>
        <div class="toggle-label">High contrast mode</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Stronger text contrast and bolder colors for easier reading</div>
      </div>
      <div class="toggle${highContrastOn ? ' on' : ''}" onclick="toggleHighContrast()"></div>
    </div>

    <div class="divider"></div>

    <div style="margin-top:8px">
      <div class="toggle-label" style="margin-bottom:8px">Celebration intensity</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:10px">How much fanfare when you complete habits</div>
      <div class="radio-group">
        ${[
          { id: 'auto', label: 'Auto — matches your mood (quieter on hard days)' },
          { id: 'full', label: 'Full — confetti, sounds, and particles every time' },
          { id: 'subtle', label: 'Subtle — gentle toasts and soft sounds, no confetti' },
          { id: 'quiet', label: 'Quiet — simple checkmarks, no effects' },
        ].map(o => `<div class="radio-option${celebPref === o.id ? ' selected' : ''}" onclick="setCelebrationIntensity('${o.id}')">
          <div class="radio-dot"></div>
          <div class="radio-label">${o.label}</div>
        </div>`).join('')}
      </div>
    </div>
  `);

  // Group divider — Habits
  html += `<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);padding:20px 4px 8px">Habits & tracking</div>`;

  // Progressive disclosure toggle — only show if user is still in the gated period
  const pdActive = prefs.progressiveDisclosure !== false;
  const pdWeek = getUserWeekNumber();
  if (pdActive && pdWeek < 4) {
    html += settingsSection('progressive', '🌱 Easing you in', `
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:12px">
        Bloom introduces features gradually so your first week isn't overwhelming. You're in <strong style="color:var(--cream)">week ${pdWeek}</strong>.
      </div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:14px">
        ${pdWeek < 2 ? 'Self-care tasks unlock next week. Journaling and wellness unlock in week 3.' :
          pdWeek < 3 ? 'Journaling and wellness unlock next week.' :
          'Almost everything is unlocked!'}
      </div>
      <div class="toggle-row" style="padding:8px 0">
        <div>
          <div class="toggle-label">Show me everything now</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Skip the gradual introduction and unlock all features</div>
        </div>
        <div class="toggle" onclick="disableProgressiveDisclosure()"></div>
      </div>
    `);
  }

  // ── DAILY HABITS ─────────────────────────────────────────────
  const dh = prefs.dailyHabits || {};
  const ht = prefs.habitTimes || {};
  const timeLabels = { am: '☀️ AM', pm: '🌙 PM', both: '☀️🌙 Both', any: '✦ Any' };
  const timeOptions = ['am', 'pm', 'both', 'any'];

  function dailyHabitSettingsRow(h) {
    const on = !!dh[h.id];
    let row = `<div class="toggle-row" style="flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px;flex:1">
        <span style="font-size:18px">${h.icon}</span>
        <div class="toggle-label">${h.label}</div>
      </div>
      <div class="toggle${on ? ' on' : ''}" onclick="toggleDailyHabitPref('${h.id}')"></div>`;
    if (on) {
      const curTime = ht[h.id] || h.defaultTime || 'any';
      row += `<div style="display:flex;gap:4px;width:100%;margin-top:8px;margin-left:28px">
        ${timeOptions.map(opt => {
          const sel = curTime === opt;
          return `<div onclick="setHabitTime('${h.id}','${opt}')" style="
            padding:4px 10px;border-radius:99px;cursor:pointer;font-size:11px;
            background:${sel ? 'rgba(var(--sage-rgb),0.2)' : 'rgba(255,255,255,0.04)'};
            border:1px solid ${sel ? 'rgba(var(--sage-rgb),0.4)' : 'rgba(255,255,255,0.08)'};
            color:${sel ? 'var(--sage-light)' : 'var(--text-muted)'}">${timeLabels[opt]}</div>`;
        }).join('')}
      </div>`;
    }
    row += `</div>`;
    return row;
  }

  let dailyHtml = DAILY_HABITS.map(h => dailyHabitSettingsRow(h)).join('');

  // Medication — visually separated
  const medOn = !!dh.medication;
  dailyHtml += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(106,154,176,0.15)">
    <div style="font-size:12px;color:var(--sky-light);font-weight:500;margin-bottom:8px">💊 Medication</div>
    <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:10px">A private, judgment-free nudge. Just "did I remember?" — nothing more.</div>
    <div class="toggle-row" style="flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px;flex:1">
        <span style="font-size:18px">💊</span>
        <div class="toggle-label">Medication reminder</div>
      </div>
      <div class="toggle${medOn ? ' on' : ''}" onclick="toggleDailyHabitPref('medication')"></div>`;
  if (medOn) {
    const medTime = ht.medication || 'any';
    dailyHtml += `<div style="display:flex;gap:4px;width:100%;margin-top:8px;margin-left:28px">
      ${timeOptions.map(opt => {
        const sel = medTime === opt;
        return `<div onclick="setHabitTime('medication','${opt}')" style="
          padding:4px 10px;border-radius:99px;cursor:pointer;font-size:11px;
          background:${sel ? 'rgba(106,154,176,0.2)' : 'rgba(255,255,255,0.04)'};
          border:1px solid ${sel ? 'rgba(106,154,176,0.4)' : 'rgba(255,255,255,0.08)'};
          color:${sel ? 'var(--sky-light)' : 'var(--text-muted)'}">${timeLabels[opt]}</div>`;
      }).join('')}
    </div>
    <div style="margin-top:8px;margin-left:28px;font-size:11px;color:var(--sky);cursor:pointer" onclick="openSettingsSection('notifications')">🔔 Set up medication reminders in Notifications ›</div>`;
  }
  dailyHtml += `</div></div>`;

  // Meal tracking
  dailyHtml += `<div class="divider"></div>
    <div class="toggle-row">
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">🍽</span>
          <div class="toggle-label">Track daily meals</div>
        </div>
        <div class="toggle-sub" style="margin-left:26px;line-height:1.5">Adds Breakfast, Lunch & Dinner — a gentle reminder that eating is self-care, not a food diary.</div>
      </div>
      <div class="toggle${prefs.habits?.track_meals ? ' on' : ''}" onclick="toggleMealTracking()"></div>
    </div>`;

  html += settingsSection('daily', '☀️ Daily habits', dailyHtml);

  // ── HABIT CUES (Implementation Intentions) ─────────────
  {
    const triggers = prefs.habitTriggers || {};
    const ht = prefs.habitTimes || {};
    let triggerHtml = `<div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:12px">
      Link each habit to a moment in your day — "I will [habit] when [cue]."
    </div>
    <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:16px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:var(--r-md);border:1px solid rgba(255,255,255,0.05)">
      <span style="color:var(--sky-light)">ℹ️ Why cues work:</span> Research shows that pairing a new habit with an existing routine (like "after I pour my coffee") makes you 2-3x more likely to follow through. Your cue shows beneath each habit as a gentle reminder.
    </div>`;

    let hasTriggerHabits = false;

    function triggerInput(id, label, icon, placeholder) {
      hasTriggerHabits = true;
      return `<div style="margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">${icon} ${label}</div>
        <input type="text" id="trigger-${id}" value="${escapeHtml(triggers[id] || '')}" placeholder="${placeholder}" style="box-sizing:border-box" onchange="saveHabitTrigger('${id}')" onfocus="setTimeout(()=>this.scrollIntoView({block:'center',behavior:'smooth'}),300)">
      </div>`;
    }

    // Daily habits — respect AM/PM/Both/Anytime time settings
    const allDaily = [...DAILY_HABITS.filter(h => dh[h.id]), ...(dh.medication ? [MEDICATION_HABIT] : [])];
    allDaily.forEach(h => {
      const time = ht[h.id] || h.defaultTime || 'any';
      if (time === 'both') {
        triggerHtml += triggerInput(h.id + '_am', h.label + ' (morning)', h.icon, 'e.g. After waking up...');
        triggerHtml += triggerInput(h.id + '_pm', h.label + ' (evening)', h.icon, 'e.g. Before bed...');
      } else if (time === 'am') {
        triggerHtml += triggerInput(h.id + '_am', h.label + ' (morning)', h.icon, 'e.g. After waking up...');
      } else if (time === 'pm') {
        triggerHtml += triggerInput(h.id + '_pm', h.label + ' (evening)', h.icon, 'e.g. Before bed...');
      } else {
        triggerHtml += triggerInput(h.id, h.label, h.icon, 'e.g. After morning coffee...');
      }
    });

    // Self-care tasks
    const enabledSelfCare = [];
    SELF_CARE_CATEGORIES.forEach(cat => {
      cat.tasks.forEach(task => {
        if (prefs.selfCare?.[task.id]) enabledSelfCare.push(task);
      });
    });
    if (enabledSelfCare.length > 0) {
      triggerHtml += `<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin:8px 0 12px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">Self-care</div>`;
      enabledSelfCare.forEach(t => {
        triggerHtml += triggerInput(t.id, t.label, t.icon, 'e.g. When I first get up...');
      });
    }

    if (hasTriggerHabits) {
      html += settingsSection('triggers', '🔗 Habit cues' + infoIcon('cues'), triggerHtml);
    }
  }

  // ── WEEKLY HABITS & TASKS ────────────────────────────────────
  const tasks = prefs.householdTasks || [];
  const defaultTasks = [
    { id: 'laundry',    name: 'Laundry',    icon: '🧺' },
    { id: 'trash',      name: 'Trash',      icon: '🗑' },
    { id: 'dishes',     name: 'Dishes',     icon: '🍽' },
    { id: 'clean_room', name: 'Clean room', icon: '🧹' },
  ];

  let weeklyHtml = `
    ${[
      { id: 'w_shower',   icon: '🚿', label: 'Shower' },
      { id: 'w_exercise', icon: '💪', label: 'Exercise' },
      { id: 'w_outside',  icon: '🌿', label: 'Go outside' },
      { id: 'w_therapy',  icon: '🛋️', label: 'Go to therapy' },
    ].map(h => `<div class="toggle-row">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">${h.icon}</span>
        <div class="toggle-label">${h.label}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        ${prefs.habits?.[h.id] !== false ? goalStepper('', h.id, goals[h.id] || 3, true) : ''}
        <div class="toggle${prefs.habits?.[h.id] !== false ? ' on' : ''}" onclick="toggleHabitPref('${h.id}')"></div>
      </div>
    </div>`).join('')}
    <div class="divider"></div>
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;font-weight:500">Household tasks</div>`;

  defaultTasks.forEach(t2 => {
    const active = tasks.some(t3 => t3.id === t2.id);
    weeklyHtml += `<div class="toggle-row">
      <div><div class="toggle-label">${t2.icon} ${t2.name}</div></div>
      <div class="toggle${active ? ' on' : ''}" onclick="toggleHouseholdPref('${t2.id}','${t2.name}','${t2.icon}')"></div>
    </div>`;
  });

  const customTasks = tasks.filter(t2 => !defaultTasks.some(d => d.id === t2.id));
  customTasks.forEach(t2 => {
    weeklyHtml += `<div class="toggle-row">
      <div><div class="toggle-label">✏️ ${t2.name}</div></div>
      <div onclick="removeCustomTask('${t2.id}')" style="font-size:12px;color:var(--rose-light);cursor:pointer">Remove</div>
    </div>`;
  });

  weeklyHtml += `<div style="display:flex;gap:8px;margin-top:12px">
    <input type="text" id="custom-task-input" placeholder="Add custom task...">
    <button class="btn btn-primary btn-sm" onclick="addCustomTask()">Add</button>
  </div>`;

  html += settingsSection('goals', '📅 Weekly habits & tasks', weeklyHtml);

  // ── SELF-CARE TASKS ──────────────────────────────────────────
  const selectedSC = prefs.selfCareTasks || [];
  let scHtml = `
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">
      Small daily acts that matter. Pick what feels possible — you can always change these.
    </div>`;

  const scRoutines = prefs.selfCareRoutines || {};
  SELF_CARE_CATEGORIES.forEach(cat => {
    scHtml += `<div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">${cat.icon} ${cat.label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${cat.tasks.map(t2 => {
          const on = selectedSC.includes(t2.id);
          const ps = `display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:99px;cursor:pointer;font-size:12px;background:${on ? 'rgba(var(--sage-rgb),0.18)' : 'rgba(255,255,255,0.04)'};border:1px solid ${on ? 'rgba(var(--sage-rgb),0.45)' : 'rgba(255,255,255,0.08)'};color:${on ? 'var(--sage-light)' : 'var(--text-secondary)'};transition:all 0.15s`;
          return `<div onclick="toggleSelfCareTask('${t2.id}')" id="sc-pill-${t2.id}" style="${ps}"><span>${t2.icon}</span>${t2.label}</div>`;
        }).join('')}
      </div>
      ${cat.tasks.filter(t2 => selectedSC.includes(t2.id)).map(t2 => {
        const r = scRoutines[t2.id] || 'anytime';
        return `<div style="display:flex;align-items:center;gap:6px;margin-top:6px;margin-left:4px">
          <span style="font-size:11px;color:var(--text-muted);width:90px">${t2.icon} ${t2.label}</span>
          <div style="display:flex;gap:4px">
            ${['morning','evening','anytime'].map(opt => {
              const sel = r === opt;
              const labels = {morning:'☀️ AM', evening:'🌙 PM', anytime:'Any'};
              return `<div onclick="setSCRoutine('${t2.id}','${opt}')" style="
                padding:3px 8px;border-radius:99px;cursor:pointer;font-size:10px;
                background:${sel ? 'rgba(var(--sage-rgb),0.2)' : 'rgba(255,255,255,0.04)'};
                border:1px solid ${sel ? 'rgba(var(--sage-rgb),0.4)' : 'rgba(255,255,255,0.08)'};
                color:${sel ? 'var(--sage-light)' : 'var(--text-muted)'}">${labels[opt]}</div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  });

  scHtml += `<div style="font-size:11px;color:var(--text-muted);margin-top:12px;font-style:italic;line-height:1.6;text-align:center">
    This is entirely yours. Add, remove, or change anything, any time.
  </div>`;

  html += settingsSection('selfcare', '💚 Daily self-care', scHtml);

  // ── CUSTOM CHECK-INS ──────────────────────────────────────────
  const ccs = getCustomCheckins();
  let ccHtml = `<div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">
    Track anything that matters to you. These appear on your Daily tab as simple daily questions.
  </div>`;

  if (ccs.length > 0) {
    ccs.forEach(cc => {
      const typeLabels = { yesno: 'Yes/No', scale: '1-5 Scale', number: 'Counter' };
      ccHtml += `<div class="toggle-row">
        <div>
          <div class="toggle-label">${cc.name}</div>
          <div class="toggle-sub">${typeLabels[cc.type] || cc.type}</div>
        </div>
        <div onclick="removeCustomCheckin('${cc.id}')" style="font-size:12px;color:var(--rose-light);cursor:pointer">Remove</div>
      </div>`;
    });
  }

  if (ccs.length < 10) {
    ccHtml += `<div style="margin-top:12px">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input type="text" id="custom-checkin-name" placeholder="e.g. Did I take a walk?" style="flex:1">
        <select id="custom-checkin-type" style="padding:6px 10px;font-size:13px;background:var(--bg-elevated);color:var(--cream);border:1px solid rgba(255,255,255,0.1);border-radius:var(--r-sm)">
          <option value="yesno">Yes/No</option>
          <option value="scale">1-5 Scale</option>
          <option value="number">Counter</option>
        </select>
      </div>
      <button class="btn btn-primary btn-sm" onclick="addCustomCheckin()">Add check-in</button>
    </div>`;
  } else {
    ccHtml += `<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Maximum 10 custom check-ins reached.</div>`;
  }

  html += settingsSection('checkins', '📝 Custom check-ins', ccHtml);

  // Group divider — Social
  html += `<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);padding:20px 4px 8px">Social</div>`;

  // ── BLOOM BUDDY ────────────────────────────────────────────
  const multiBuddyOn = prefs.multiBuddy || false;
  const myBuddyId = load('bloom_buddy_id', 'Not yet generated');
  const buddyShareMoodOn = prefs.buddyShareMood !== false; // default true
  html += settingsSection('buddy', buddyIcon(18) + ' bloom buddy', `
    <div class="toggle-row" style="padding:12px 0">
      <div>
        <div class="toggle-label">Share mood with buddy</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Let your buddy see your current mood and get notified on rough days</div>
      </div>
      <div class="toggle${buddyShareMoodOn ? ' on' : ''}" onclick="state.prefs.buddyShareMood=!${buddyShareMoodOn};saveState();renderSettingsTab()"></div>
    </div>
    <div class="toggle-row" style="padding:12px 0">
      <div>
        <div class="toggle-label">Allow multiple buddies</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Let more than one person pair with you</div>
      </div>
      <div class="toggle${multiBuddyOn ? ' on' : ''}" onclick="toggleMultiBuddy(!${multiBuddyOn});renderSettingsTab()"></div>
    </div>
    <div style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Your Buddy ID</div>
      <div style="font-size:11px;color:var(--text-secondary);font-family:monospace;word-break:break-all;background:var(--bg-mid);padding:8px 10px;border-radius:var(--r-md)">${escapeHtml(myBuddyId)}</div>
    </div>
  `);

  // Group divider — System
  html += `<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);padding:20px 4px 8px">System</div>`;

  // ── NOTIFICATIONS & SOUND ────────────────────────────────────
  const medHabitOn = prefs.dailyHabits?.medication;
  const medTimeVal = prefs.habitTimes?.medication || 'am';
  const medRemindMode = notifs.medicationReminders || 'auto';

  let notifHtml = `
    <div class="toggle-row">
      <div><div class="toggle-label">Sound feedback</div><div class="toggle-sub">Soft chimes on habits, breathing, and milestones</div></div>
      <div class="toggle${prefs.audio !== false ? ' on' : ''}" onclick="toggleAudioPref()"></div>
    </div>
    <div class="divider"></div>
    <div class="toggle-row">
      <div><div class="toggle-label">Habit reminders</div><div class="toggle-sub">Teeth brushing at 8am & 9pm, evening check-in at 7pm</div></div>
      <div class="toggle${notifs.habitReminders ? ' on' : ''}" onclick="toggleNotif('habitReminders')"></div>
    </div>`;

  if (notifs.habitReminders) {
    // Water reminders
    notifHtml += `
    <div class="divider"></div>
    <div class="toggle-label" style="margin-bottom:4px;color:var(--text-secondary)">💧 Water reminders</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;line-height:1.5">Between noon and 9pm, until you hit your goal.</div>
    <div class="radio-group">
      ${['smart','hourly','off'].map(m => {
        const labels = {
          smart: 'Smart — every 4 hours if under goal (noon, 4pm, 8pm)',
          hourly: 'Every hour',
          off: 'Off',
        };
        return `<div class="radio-option${(notifs.waterMode||'smart') === m ? ' selected' : ''}" onclick="setWaterMode('${m}')">
          <div class="radio-dot"></div>
          <div class="radio-label">${labels[m]}</div>
        </div>`;
      }).join('')}
    </div>`;

    // Medication reminders (only if medication is enabled)
    if (medHabitOn) {
      const timeDesc = medTimeVal === 'am' ? '9am' : medTimeVal === 'pm' ? '8pm' : medTimeVal === 'both' ? '9am & 8pm' : 'noon';
      const followupDesc = medTimeVal === 'am' ? '11am' : medTimeVal === 'pm' ? '10pm' : medTimeVal === 'both' ? '11am & 10pm' : '2pm';
      const medOpts = [
        { id: 'auto', label: 'Remind + follow up — ' + timeDesc + ', then ' + followupDesc + ' if not logged' },
        { id: 'gentle', label: 'Once only — ' + timeDesc + ', no follow-up' },
        { id: 'off', label: 'Off — no medication reminders' },
      ];
      notifHtml += '<div class="divider"></div>' +
        '<div class="toggle-label" style="margin-bottom:4px;color:var(--sky-light)">💊 Medication reminders</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;line-height:1.5">Based on your ' + (medTimeVal === 'both' ? 'AM & PM' : medTimeVal.toUpperCase()) + ' schedule.</div>' +
        '<div class="radio-group">' +
        medOpts.map(function(o) {
          return '<div class="radio-option' + (medRemindMode === o.id ? ' selected' : '') + '" onclick="setMedRemindMode(\'' + o.id + '\')">' +
            '<div class="radio-dot"></div>' +
            '<div class="radio-label">' + o.label + '</div>' +
          '</div>';
        }).join('') +
        '</div>';
    }
  }

  notifHtml += `
    <div class="divider"></div>
    <div class="toggle-row">
      <div><div class="toggle-label">Weekly reflection reminder</div><div class="toggle-sub">Notified Saturday & Sunday when reflection opens</div></div>
      <div class="toggle${notifs.sundayReminder ? ' on' : ''}" onclick="toggleNotif('sundayReminder')"></div>
    </div>
    <div class="divider"></div>
    <div class="toggle-row">
      <div><div class="toggle-label">Weekly summary</div><div class="toggle-sub">A gentle Sunday evening recap of your mood, progress, and journal activity</div></div>
      <div class="toggle${notifs.weeklySummary ? ' on' : ''}" onclick="toggleNotif('weeklySummary')"></div>
    </div>
    <div class="divider"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="resetServiceWorker()">↺ Fix notifications</button>
      <button class="btn btn-ghost btn-sm" onclick="testPushNotification()">🔔 Test notification</button>
    </div>
    <div id="notif-test-status" style="font-size:12px;color:var(--text-muted);margin-top:8px;white-space:pre-wrap"></div>`;

  html += settingsSection('notifications', '🔔 Notifications & sound', notifHtml);

  // ── DATA & PRIVACY ────────────────────────────────────────────
  html += settingsSection('data', '🔒 Data & privacy', `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px">
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.7">
        <div style="font-weight:500;color:var(--cream);margin-bottom:4px">Your data belongs to you</div>
        Everything in bloom stays on this device — your journal, moods, habits, reflections. Never uploaded, never shared, never seen by anyone else.
        <div style="margin-top:6px;color:var(--text-muted)">AI responses send your prompt to Claude, but nothing is stored or linked to your identity.</div>
        <div style="margin-top:6px;color:var(--text-muted)">Encouragement wall posts are shared without your name or identity — no personal data is attached.</div>
      </div>
    </div>
    ${isSafariBrowser() ? `<div style="background:rgba(255,180,80,0.08);border:1px solid rgba(255,180,80,0.15);border-radius:var(--r-lg);padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--amber-light);line-height:1.6">
      ⚠️ <strong>Safari users:</strong> Safari may delete website data after 7 days of inactivity. Save a backup link regularly to protect your data.
    </div>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-secondary btn-block" onclick="showBackupSheet()">💾 Save restore link</button>
      <button class="btn btn-secondary btn-block" onclick="exportEncryptedJSON()">🔐 Export encrypted backup</button>
      <button class="btn btn-secondary btn-block" onclick="exportJSON()">📤 Export my data (unencrypted)</button>
      <button class="btn btn-secondary btn-block" onclick="exportCSV()">📊 Export history as CSV</button>
      <button class="btn btn-secondary btn-block" onclick="exportTherapistPDF()">📋 Export therapist-friendly report</button>
      <button class="btn btn-ghost btn-block" onclick="resetToday()">↺ Reset today's data</button>
      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:8px;padding-top:8px">
        <button class="btn btn-ghost btn-block" onclick="exportDiagnostics()">🔧 Export diagnostics (for bug reports)</button>
      </div>
    </div>
  `);

  // Group divider — Info
  html += `</div></div>`; // Close sg-body-setup and settings-group

  // ── GROUP: ABOUT & INFO ──────────────────────────────────────
  html += `<div class="settings-group">
    <div class="settings-group-header" onclick="toggleSettingsGroup('about')" role="button" aria-expanded="true" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSettingsGroup('about')}">
      <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted)">About & info</span>
      <span class="settings-group-chevron" id="sg-chevron-about" style="font-size:10px;color:var(--text-muted);transition:transform 0.2s">▾</span>
    </div>
    <div class="settings-group-body" id="sg-body-about">`;

  // ── SCIENCE ──────────────────────────────────────────────────
  html += settingsSection('science', '📚 Science behind bloom', `
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">
      Every feature in bloom is grounded in peer-reviewed research. Tap below to explore the evidence behind mood tracking, journaling, habit cues, breathing exercises, and more.
    </div>
    <button class="btn btn-ghost btn-sm" onclick="openScienceSheet()">📖 View research & sources</button>
  `);

  // ── ABOUT ────────────────────────────────────────────────────
  html += settingsSection('about', '🌿 About bloom', `
    <div style="font-family:Fraunces,serif;font-style:italic;font-size:15px;color:var(--sage-light);line-height:1.6;margin-bottom:12px">
      A gentle place to show up for yourself.
    </div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Version ${VERSION}</div>
    <div style="background:rgba(var(--sage-rgb),0.06);border:1px solid rgba(var(--sage-rgb),0.12);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.7">
        <strong style="color:var(--cream)">bloom is a self-care companion, not a substitute for professional mental health care.</strong>
        It is not therapy, counseling, or medical advice. If you are struggling, please reach out to a licensed therapist or counselor. Tap the 🤍 in the header any time for immediate crisis resources.
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:10px;line-height:1.6">
        bloom is intended for users aged 16 and older.
      </div>
    </div>
    <div style="background:rgba(var(--sage-rgb),0.06);border:1px solid rgba(var(--sage-rgb),0.12);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.7">
        <strong style="color:var(--cream)">It's okay to take a break from bloom.</strong>
        If tracking your habits or mood ever starts to feel like pressure instead of support, step away. bloom will be here when you come back — no guilt, no lost progress that matters. Your well-being always comes first.
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="showWhatsNew(true)">📋 View release notes</button>
  `);

  // ── MODERATION TRANSPARENCY ──────────────────────────────────
  html += settingsSection('moderation', '🛡️ How moderation works', `
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">
      <div style="font-weight:500;color:var(--cream);margin-bottom:8px;font-size:14px">Keeping this space safe</div>

      <p style="margin-bottom:10px">Bloom automatically screens messages on the encouragement wall and in buddy conversations. Here's how it works:</p>

      <div style="background:rgba(176,120,120,0.08);border:1px solid rgba(176,120,120,0.15);border-radius:var(--r-md);padding:10px 14px;margin-bottom:10px">
        <div style="font-weight:500;color:var(--rose-light);margin-bottom:4px">Blocked</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6">Directed harm toward others and targeted slurs are blocked and cannot be posted. This keeps the community safe.</div>
      </div>

      <div style="background:rgba(201,149,74,0.08);border:1px solid rgba(201,149,74,0.15);border-radius:var(--r-md);padding:10px 14px;margin-bottom:10px">
        <div style="font-weight:500;color:var(--amber-light);margin-bottom:4px">Content warning (allowed)</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6">Some messages may be flagged as potentially inappropriate for this space — crude language, off-topic content, etc. These messages are still posted but appear blurred with a content warning. You can choose to view them or leave them hidden. This keeps the wall focused on encouragement while respecting that the message was shared.</div>
      </div>

      <div style="background:rgba(201,149,74,0.08);border:1px solid rgba(201,149,74,0.15);border-radius:var(--r-md);padding:10px 14px;margin-bottom:10px">
        <div style="font-weight:500;color:var(--amber-light);margin-bottom:4px">Crisis support (allowed)</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6">If we detect language that suggests you might be in crisis, your message is still posted — but we'll gently surface crisis resources. Your feelings are always valid here.</div>
      </div>

      <div style="background:rgba(var(--sage-rgb),0.08);border:1px solid rgba(var(--sage-rgb),0.15);border-radius:var(--r-md);padding:10px 14px;margin-bottom:10px">
        <div style="font-weight:500;color:var(--sage-light);margin-bottom:4px">Allowed</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6">Venting, frustration, and honest expression are welcome. This is a mental health app — we don't filter difficult emotions. Words like "hurt," "struggling," and "overwhelmed" belong here.</div>
      </div>

      <p style="margin-top:12px;font-size:12px;color:var(--text-muted)">Bloom is designed to hold space for hard feelings, not suppress them. If you see something concerning on the wall, use the "flag" button to report it. Messages with repeated moderation flags may result in restricted access to community features.</p>
    </div>
  `);

  // ── PRIVACY POLICY & TERMS ────────────────────────────────────
  html += settingsSection('privacy', '📜 Privacy policy & terms', `
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">
      <div style="font-weight:500;color:var(--cream);margin-bottom:8px;font-size:14px">Privacy Policy</div>

      <p style="margin-bottom:10px"><strong style="color:var(--cream)">What stays on your device:</strong><br>
      Your journal entries, mood logs, habit data, affirmations, sleep data, wellness tracking, and all personal reflections are stored only in your browser's local storage. They are never uploaded to any server, never shared, and never seen by anyone else.</p>

      <p style="margin-bottom:10px"><strong style="color:var(--cream)">What is sent to external services:</strong></p>
      <ul style="padding-left:18px;margin-bottom:10px">
        <li style="margin-bottom:6px"><strong>AI reflections:</strong> When you use AI features (journal reflections, weekly insights, monthly reflections), your prompt text is sent to Anthropic's Claude API to generate a response. This data is not stored or linked to your identity by Bloom or Anthropic. <em>Note: For very low mood entries and hard day mode, Bloom uses pre-written responses instead of AI.</em></li>
        <li style="margin-bottom:6px"><strong>Bloom Buddy:</strong> If you use the buddy feature, your display name, mood (if sharing is on), streak count, habit completion percentage, and messages are stored on our server (Redis/Vercel KV) to enable the pairing. Your journal entries, specific habits, and other private data are never shared.</li>
        <li style="margin-bottom:6px"><strong>Encouragement Wall:</strong> Posts you submit to the community wall are stored on our server without any identifying information attached.</li>
        <li style="margin-bottom:6px"><strong>Push Notifications:</strong> If enabled, OneSignal processes a device identifier for delivery. No personal content is included.</li>
      </ul>

      <p style="margin-bottom:10px"><strong style="color:var(--cream)">Backups:</strong><br>
      Backup links contain your personal data encoded in the URL. We recommend using the encrypted export option to protect your data with a passphrase. Never share unencrypted backup links in public or shared spaces.</p>

      <p style="margin-bottom:10px"><strong style="color:var(--cream)">Analytics & tracking:</strong><br>
      Bloom does not use analytics, tracking pixels, or any third-party tracking services. There are no ads.</p>

      <div style="border-top:1px solid rgba(255,255,255,0.06);margin:16px 0;padding-top:16px">
        <div style="font-weight:500;color:var(--cream);margin-bottom:8px;font-size:14px">Terms of Use</div>

        <p style="margin-bottom:10px"><strong style="color:var(--cream)">Not medical advice:</strong><br>
        Bloom is a self-care companion app. It is not therapy, counseling, medical advice, or crisis intervention. It is not a substitute for professional mental health care. If you are in crisis, please use the 🤍 crisis resources or contact emergency services.</p>

        <p style="margin-bottom:10px"><strong style="color:var(--cream)">AI-generated content:</strong><br>
        AI reflections are generated by a language model. They may occasionally be inaccurate, unhelpful, or inappropriate. They should not be relied upon for mental health decisions. A "Did this feel helpful?" option is provided so you can flag unhelpful responses.</p>

        <p style="margin-bottom:10px"><strong style="color:var(--cream)">Buddy system:</strong><br>
        Bloom Buddy connects you with other users for encouragement. We provide content moderation but cannot guarantee the behavior of other users. Never share personal identifying information with buddies you don't know. You can unpair at any time.</p>

        <p style="margin-bottom:10px"><strong style="color:var(--cream)">Age requirement:</strong><br>
        Bloom is intended for users aged 16 and older.</p>

        <p style="margin-bottom:10px"><strong style="color:var(--cream)">Data responsibility:</strong><br>
        Because your data is stored locally on your device, you are responsible for maintaining backups. Bloom is not liable for data loss due to browser clearing, device changes, or Safari's storage policies.</p>
      </div>

      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Last updated: March 2026</div>
    </div>
  `);

  html += `</div></div>`; // Close sg-body-about and settings-group

  // ── SHARE BLOOM ──────────────────────────────────────────────
  html += `
  <div style="margin:8px 0 4px;padding:20px 16px;background:linear-gradient(135deg,rgba(var(--sage-rgb),0.12),rgba(var(--sage-rgb),0.04));border:1px solid rgba(var(--sage-rgb),0.2);border-radius:var(--r-xl);text-align:center">
    <div style="font-size:32px;margin-bottom:10px">${bloomIcon(40)}</div>
    <div style="font-family:Fraunces,serif;font-size:17px;font-weight:300;color:var(--cream);margin-bottom:6px">Know someone who might need this?</div>
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px">bloom is free. Share it with someone you care about.</div>
    <button class="btn btn-primary" onclick="shareApp()" style="background:var(--sage);color:#0a1a0b;padding:12px 32px;font-size:15px">🌿 Share bloom</button>
  </div>`;

  html += `<div style="text-align:center;padding:20px 0 8px;font-size:11px;color:var(--text-muted)">bloom v${VERSION} · made with care 🌿</div>`;

  scroll.innerHTML = html;
}

function settingsSection(id, title, bodyHtml) {
  return `<div class="settings-section" id="section-${id}">
    <div class="settings-header" id="sh-${id}" onclick="toggleSettingsSection('${id}')" role="button" aria-expanded="false" aria-controls="sb-${id}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSettingsSection('${id}')}">
      <div class="settings-header-title">${title}</div>
      <div class="settings-chevron" aria-hidden="true">▾</div>
    </div>
    <div class="settings-body" id="sb-${id}" role="region" aria-labelledby="sh-${id}">${bodyHtml}</div>
  </div>`;
}

function toggleSettingsGroup(groupId) {
  const body = document.getElementById('sg-body-' + groupId);
  const chevron = document.getElementById('sg-chevron-' + groupId);
  const header = body?.previousElementSibling;
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
  if (header) header.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
}

function toggleSettingsSection(id) {
  const header = document.getElementById('sh-' + id);
  const body = document.getElementById('sb-' + id);
  const isOpen = body.classList.contains('open');
  // Close all and reset aria-expanded
  document.querySelectorAll('.settings-header').forEach(h => { h.classList.remove('open'); h.setAttribute('aria-expanded', 'false'); });
  document.querySelectorAll('.settings-body').forEach(b => b.classList.remove('open'));
  if (!isOpen) {
    header.classList.add('open');
    header.setAttribute('aria-expanded', 'true');
    body.classList.add('open');
  }
}

function openSettingsSection(id) {
  // Open the target section
  document.querySelectorAll('.settings-header').forEach(h => h.classList.remove('open'));
  document.querySelectorAll('.settings-body').forEach(b => b.classList.remove('open'));
  const header = document.getElementById('sh-' + id);
  const body = document.getElementById('sb-' + id);
  if (header) header.classList.add('open');
  if (body) body.classList.add('open');
  // Scroll to it
  const section = document.getElementById('section-' + id);
  if (section) setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function goalStepper(name, key, val, compact = false) {
  if (compact) {
    return `<div class="stepper">
      <div class="stepper-btn" onclick="adjustGoal('${key}',-1)">−</div>
      <div class="stepper-val" id="goal-${key}">${val}x</div>
      <div class="stepper-btn" onclick="adjustGoal('${key}',1)">+</div>
    </div>`;
  }
  return `<div class="toggle-row">
    <div class="toggle-label">${name}</div>
    <div class="stepper">
      <div class="stepper-btn" onclick="adjustGoal('${key}',-1)">−</div>
      <div class="stepper-val" id="goal-${key}">${val}x</div>
      <div class="stepper-btn" onclick="adjustGoal('${key}',1)">+</div>
    </div>
  </div>`;
}

function openMedicationSheet() {
  const body = document.getElementById('medication-sheet-body');
  if (!body) return;
  const current = state.prefs?.medicationTiming || ['once'];
  const times = [
    { id: 'morning',   icon: '🌅', label: 'Morning',    sub: 'Start of day' },
    { id: 'afternoon', icon: '☀️', label: 'Afternoon',  sub: 'Midday' },
    { id: 'evening',   icon: '🌙', label: 'Evening',    sub: 'End of day' },
  ];
  let html = `
    <div class="sheet-title">💊 Medication reminder</div>
    <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:20px">
      A private, judgment-free nudge. Choose which times of day are relevant to you — you can change this any time.
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">`;
  times.forEach(t => {
    const on = current.includes(t.id);
    html += `<div onclick="toggleMedTime('${t.id}')" id="med-time-${t.id}" style="
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 16px;border-radius:var(--r-lg);cursor:pointer;
      background:${on ? 'rgba(106,154,176,0.14)' : 'rgba(106,154,176,0.06)'};
      border:1px solid ${on ? 'rgba(106,154,176,0.4)' : 'rgba(106,154,176,0.15)'};
      transition:all 0.15s">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">${t.icon}</span>
        <div>
          <div style="font-size:14px;color:var(--sky-light);font-weight:500">${t.label}</div>
          <div style="font-size:12px;color:var(--text-muted)">${t.sub}</div>
        </div>
      </div>
      <div id="med-check-${t.id}" style="font-size:18px;color:var(--sky-light);opacity:${on ? '1' : '0.3'}">${on ? '✓' : '○'}</div>
    </div>`;
  });
  const onceOn = current.includes('once');
  html += `<div style="height:1px;background:rgba(255,255,255,0.06);margin:4px 0"></div>
    <div onclick="toggleMedTime('once')" id="med-time-once" style="
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 16px;border-radius:var(--r-lg);cursor:pointer;
      background:${onceOn ? 'rgba(106,154,176,0.14)' : 'rgba(106,154,176,0.06)'};
      border:1px solid ${onceOn ? 'rgba(106,154,176,0.4)' : 'rgba(106,154,176,0.15)'};
      transition:all 0.15s">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">💊</span>
        <div>
          <div style="font-size:14px;color:var(--sky-light);font-weight:500">Once a day</div>
          <div style="font-size:12px;color:var(--text-muted)">Single daily reminder</div>
        </div>
      </div>
      <div id="med-check-once" style="font-size:18px;color:var(--sky-light);opacity:${onceOn ? '1' : '0.3'}">${onceOn ? '✓' : '○'}</div>
    </div>
  </div>
  <div style="display:flex;gap:10px">
    <button class="btn btn-primary" style="flex:1" onclick="saveMedicationTiming()">Save</button>
    <button class="btn btn-ghost" onclick="closeAllSheets()">Cancel</button>
  </div>`;
  body.innerHTML = html;
  openSheet('medication-sheet');
}

function toggleMedTime(time) {
  if (!state.prefs.medicationTiming) state.prefs.medicationTiming = [];
  const times = state.prefs.medicationTiming;

  // 'once' is mutually exclusive with specific times
  if (time === 'once') {
    state.prefs.medicationTiming = times.includes('once') ? [] : ['once'];
  } else {
    // Remove 'once' if selecting specific times
    const withoutOnce = times.filter(t2 => t2 !== 'once');
    const idx = withoutOnce.indexOf(time);
    if (idx > -1) withoutOnce.splice(idx, 1);
    else withoutOnce.push(time);
    state.prefs.medicationTiming = withoutOnce;
  }

  // Update UI
  openMedicationSheet();
}

function saveMedicationTiming() {
  const timing = state.prefs.medicationTiming || [];
  // Make sure sc_medication is in selfCareTasks if any timing is set
  if (!state.prefs.selfCareTasks) state.prefs.selfCareTasks = [];
  if (timing.length > 0) {
    // Add the base medication task id so hasMedication check passes
    if (!state.prefs.selfCareTasks.includes('sc_medication')) {
      state.prefs.selfCareTasks.push('sc_medication');
    }
  } else {
    // Remove medication entirely if no times selected
    state.prefs.selfCareTasks = state.prefs.selfCareTasks.filter(id => id !== 'sc_medication');
  }
  save('bloom_prefs', state.prefs);
  closeAllSheets();
  renderTodayTab();
  renderSettingsTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-selfcare');
    const sb = document.getElementById('sb-selfcare');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function toggleSelfCareTask(id) {
  if (!state.prefs.selfCareTasks) state.prefs.selfCareTasks = [];
  const idx = state.prefs.selfCareTasks.indexOf(id);
  if (idx > -1) {
    state.prefs.selfCareTasks.splice(idx, 1);
    // Also remove routine assignment
    if (state.prefs.selfCareRoutines) delete state.prefs.selfCareRoutines[id];
  } else {
    state.prefs.selfCareTasks.push(id);
  }
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-selfcare');
    const sb = document.getElementById('sb-selfcare');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function setSCRoutine(taskId, routine) {
  if (!state.prefs.selfCareRoutines) state.prefs.selfCareRoutines = {};
  state.prefs.selfCareRoutines[taskId] = routine;
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-selfcare');
    const sb = document.getElementById('sb-selfcare');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function toggleHabitPref(id) {
  if (!state.prefs.habits) state.prefs.habits = {};
  state.prefs.habits[id] = state.prefs.habits[id] === false ? true : false;
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-daily');
    const sb = document.getElementById('sb-daily');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
    const sh2 = document.getElementById('sh-goals');
    const sb2 = document.getElementById('sb-goals');
    if (sh2 && sb2) { sh2.classList.add('open'); sb2.classList.add('open'); }
  }, 50);
}

function toggleDailyHabitPref(id) {
  if (!state.prefs.dailyHabits) state.prefs.dailyHabits = {};
  state.prefs.dailyHabits[id] = !state.prefs.dailyHabits[id];
  // Set default time if enabling and no time set
  if (state.prefs.dailyHabits[id] && !state.prefs.habitTimes?.[id]) {
    if (!state.prefs.habitTimes) state.prefs.habitTimes = {};
    const habit = DAILY_HABITS.find(h => h.id === id) || MEDICATION_HABIT;
    state.prefs.habitTimes[id] = habit.defaultTime || 'any';
  }
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-daily');
    const sb = document.getElementById('sb-daily');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function setHabitTime(id, time) {
  if (!state.prefs.habitTimes) state.prefs.habitTimes = {};
  const oldTime = state.prefs.habitTimes[id];
  state.prefs.habitTimes[id] = time;

  // Migrate today's completion data to new time slot keys
  const td = state.todayData;
  const oldSlots = oldTime === 'both' ? ['am','pm'] : oldTime === 'any' ? ['any'] : [oldTime || 'any'];
  const newSlots = time === 'both' ? ['am','pm'] : time === 'any' ? ['any'] : [time];
  // Collect any completions from old slots
  const wasDone = oldSlots.some(s => td[id + '_' + s]);
  if (wasDone) {
    // Clear old slots
    oldSlots.forEach(s => { delete td[id + '_' + s]; });
    // Set new slots
    newSlots.forEach(s => { td[id + '_' + s] = true; });
    saveState();
  }

  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-daily');
    const sb = document.getElementById('sb-daily');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function tapDailyHabit(id, timeSlot, el) {
  const key = id + '_' + timeSlot; // e.g. brush_teeth_am, brush_teeth_pm
  const wasDone = state.todayData[key];
  state.todayData[key] = !wasDone;

  if (!wasDone) {
    const xpVal = XP_VALUES[key] || 15;
    addXP(xpVal, el);
    checkFirstTaskStreak();
    celebrate(id, el);
  } else {
    const xpVal = XP_VALUES[key] || 15;
    state.xpData.total = Math.max(0, (state.xpData.total || 0) - xpVal);
    haptic('light');
    saveState();
    updateProgressTab();
    showUndoToast(key, xpVal);
  }

  saveState();
  archiveToday();
  renderTodayTab();
  checkAllDone();
  scheduleBuddySync();
}

function adjustGoal(key, delta) {
  if (!state.prefs.goals) state.prefs.goals = {};
  const cur = state.prefs.goals[key] || 3;
  state.prefs.goals[key] = Math.max(1, Math.min(7, cur + delta));
  save('bloom_prefs', state.prefs);
  const el = document.getElementById('goal-' + key);
  if (el) el.textContent = state.prefs.goals[key] + 'x';
}

function toggleMealTracking() {
  if (!state.prefs.habits) state.prefs.habits = {};
  state.prefs.habits.track_meals = !state.prefs.habits.track_meals;
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
  // Reopen daily section
  setTimeout(() => {
    const sh = document.getElementById('sh-daily');
    const sb = document.getElementById('sb-daily');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function saveSettingsName() {
  const input = document.getElementById('settings-name');
  if (input) { state.prefs.name = input.value; save('bloom_prefs', state.prefs); }
}

function saveHabitTrigger(habitId) {
  const input = document.getElementById('trigger-' + habitId);
  if (!input) return;
  if (!state.prefs.habitTriggers) state.prefs.habitTriggers = {};
  state.prefs.habitTriggers[habitId] = input.value.trim();
  save('bloom_prefs', state.prefs);
}

function toggleHouseholdPref(id, name, icon) {
  if (!state.prefs.householdTasks) state.prefs.householdTasks = [];
  const idx = state.prefs.householdTasks.findIndex(t => t.id === id);
  if (idx > -1) {
    state.prefs.householdTasks.splice(idx, 1);
  } else {
    state.prefs.householdTasks.push({ id, name, icon });
  }
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  setTimeout(() => { const sh = document.getElementById('sh-tasks'); const sb = document.getElementById('sb-tasks'); if(sh&&sb){sh.classList.add('open');sb.classList.add('open');} }, 50);
}

function addCustomTask() {
  const input = document.getElementById('custom-task-input');
  if (!input || !input.value.trim()) return;
  if (!state.prefs.householdTasks) state.prefs.householdTasks = [];
  const id = 'custom_' + Date.now();
  state.prefs.householdTasks.push({ id, name: input.value.trim(), icon: '✏️' });
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  setTimeout(() => { const sh = document.getElementById('sh-tasks'); const sb = document.getElementById('sb-tasks'); if(sh&&sb){sh.classList.add('open');sb.classList.add('open');} }, 50);
}

function removeCustomTask(id) {
  state.prefs.householdTasks = (state.prefs.householdTasks || []).filter(t => t.id !== id);
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
}

async function resetServiceWorker() {
  const status = document.getElementById('notif-test-status');
  const update = (msg) => { if (status) status.textContent = msg; };
  update('Resetting...');

  try {
    // Unregister all existing service workers
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
    update('Unregistered ' + regs.length + ' worker(s). Registering OneSignal worker...');

    // Re-register OneSignal worker
    const reg = await navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' });
    update('✓ Worker registered!\nScope: ' + reg.scope + '\nTap "Test notification" now.');
  } catch(e) {
    update('Error: ' + e.message);
  }
}

function testNotification() {
  const status = document.getElementById('notif-test-status');
  const update = (msg) => { if (status) status.style.whiteSpace = 'pre-wrap', status.textContent = msg; };

  const lines = [
    'Notification API: ' + ('Notification' in window ? '✓' : '✗'),
    'Permission: ' + (window.Notification?.permission || 'unknown'),
    'ServiceWorker: ' + ('serviceWorker' in navigator ? '✓' : '✗'),
    'OneSignal: ' + (window.OneSignal ? '✓' : '✗'),
  ];
  update(lines.join('\n'));

  if (Notification.permission !== 'granted') {
    Notification.requestPermission().then(p => {
      lines.push('Permission result: ' + p);
      update(lines.join('\n'));
    });
    return;
  }

  // List all registered service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      if (regs.length === 0) {
        lines.push('SW registrations: NONE — OneSignalSDKWorker.js not found');
        update(lines.join('\n'));
        return;
      }
      regs.forEach((reg, i) => {
        lines.push('SW ' + (i+1) + ': ' + reg.scope + ' (' + (reg.active ? 'active' : reg.installing ? 'installing' : 'waiting') + ')');
      });
      update(lines.join('\n'));

      // Try to show notification via the active registration
      const active = regs.find(r => r.active);
      if (!active) {
        lines.push('No active SW found yet.');
        update(lines.join('\n'));
        return;
      }
      active.showNotification('bloom 🌿', {
        body: "Test — notifications are working!",
        icon: '/icon.svg',
      }).then(() => {
        lines.push('✓ Notification sent!');
        update(lines.join('\n'));
      }).catch(e => {
        lines.push('Error: ' + e.message);
        update(lines.join('\n'));
      });
    });
  }
}

function toggleHighContrast() {
  if (!state.prefs) state.prefs = {};
  state.prefs.highContrast = !state.prefs.highContrast;
  save('bloom_prefs', state.prefs);
  document.body.classList.toggle('high-contrast', state.prefs.highContrast);
  renderSettingsTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-appearance');
    const sb = document.getElementById('sb-appearance');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function disableProgressiveDisclosure() {
  if (!state.prefs) state.prefs = {};
  state.prefs.progressiveDisclosure = false;
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  renderTodayTab();
}

function setCelebrationIntensity(mode) {
  if (!state.prefs) state.prefs = {};
  state.prefs.celebrationIntensity = mode;
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-appearance');
    const sb = document.getElementById('sb-appearance');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function toggleAudioPref() {
  state.prefs.audio = state.prefs.audio === false ? true : false;
  save('bloom_prefs', state.prefs);
  if (state.prefs.audio) playSound('habit'); // preview on enable
  renderSettingsTab();
  setTimeout(() => {
    const sh = document.getElementById('sh-notifications');
    const sb = document.getElementById('sb-notifications');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

function setWaterMode(mode) {
  if (!state.prefs.notifications) state.prefs.notifications = {};
  state.prefs.notifications.waterMode = mode;
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  setTimeout(() => { const sh = document.getElementById('sh-notifications'); const sb = document.getElementById('sb-notifications'); if(sh&&sb){sh.classList.add('open');sb.classList.add('open');} }, 50);
  setTimeout(() => scheduleAllPushNotifications(), 1000);
}

function setMedRemindMode(mode) {
  if (!state.prefs.notifications) state.prefs.notifications = {};
  state.prefs.notifications.medicationReminders = mode;
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  setTimeout(() => { const sh = document.getElementById('sh-notifications'); const sb = document.getElementById('sb-notifications'); if(sh&&sb){sh.classList.add('open');sb.classList.add('open');} }, 50);
  setTimeout(() => scheduleAllPushNotifications(), 1000);
}

function toggleNotif(key) {
  if (!state.prefs.notifications) state.prefs.notifications = {};
  state.prefs.notifications[key] = !state.prefs.notifications[key];
  save('bloom_prefs', state.prefs);
  renderSettingsTab();
  // Re-schedule push notifications when preferences change
  setTimeout(() => scheduleAllPushNotifications(), 1000);
}

function shareApp() {
  const shareData = {
    title: 'bloom — a gentle self-care app',
    text: 'I\'ve been using bloom to track my habits and take care of myself. No guilt, no pressure — just small steps every day. Thought you might like it 🌿',
    url: window.location.origin + window.location.pathname,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    // Fallback: copy URL
    navigator.clipboard?.writeText(shareData.url).then(() => {
      const btn = document.querySelector('[onclick="shareApp()"]');
      if (btn) { btn.textContent = '✓ Link copied!'; setTimeout(() => renderSettingsTab(), 2000); }
    }).catch(() => {
      alert('Share bloom:\n\n' + shareData.url);
    });
  }
}

function resetToday() {
  if (!confirm('Reset all of today\'s logged data? This cannot be undone.')) return;
  save('bloom_today_' + today(), {});
  state.todayData = {};
  state.showAffirm = false;
  state.allDone = false;
  renderTodayTab();
}

export { renderSettingsTab, settingsSection, toggleSettingsGroup, toggleSettingsSection, openSettingsSection };
window.renderSettingsTab = renderSettingsTab;
window.state = state;
window.saveState = saveState;
window.toggleSettingsGroup = toggleSettingsGroup;
window.toggleSettingsSection = toggleSettingsSection;
window.openSettingsSection = openSettingsSection;
window.openMedicationSheet = openMedicationSheet;
window.toggleMedTime = toggleMedTime;
window.saveMedicationTiming = saveMedicationTiming;
window.toggleSelfCareTask = toggleSelfCareTask;
window.setSCRoutine = setSCRoutine;
window.toggleHabitPref = toggleHabitPref;
window.toggleDailyHabitPref = toggleDailyHabitPref;
window.setHabitTime = setHabitTime;
window.tapDailyHabit = tapDailyHabit;
window.adjustGoal = adjustGoal;
window.toggleMealTracking = toggleMealTracking;
window.saveSettingsName = saveSettingsName;
window.saveHabitTrigger = saveHabitTrigger;
window.toggleHouseholdPref = toggleHouseholdPref;
window.addCustomTask = addCustomTask;
window.removeCustomTask = removeCustomTask;
window.resetServiceWorker = resetServiceWorker;
window.testNotification = testNotification;
window.toggleHighContrast = toggleHighContrast;
window.disableProgressiveDisclosure = disableProgressiveDisclosure;
window.setCelebrationIntensity = setCelebrationIntensity;
window.toggleAudioPref = toggleAudioPref;
window.setWaterMode = setWaterMode;
window.setMedRemindMode = setMedRemindMode;
window.toggleNotif = toggleNotif;
window.shareApp = shareApp;
window.goalStepper = goalStepper;
window.resetToday = resetToday;
