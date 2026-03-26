import { state, today, loadState, migrateJournalFormat, backfillJournalPrompts } from './state.js';
import { save, load } from './storage.js';
import { switchTab } from './router.js';
import { DAILY_HABITS, MEDICATION_HABIT, VERSION } from './constants.js';
function toggleSettingsSection(...args) { return window.toggleSettingsSection?.(...args); }
function showBackupSheet(...args) { return window.showBackupSheet?.(...args); }
function buddyRegisterAndSync(...args) { return window.buddyRegisterAndSync?.(...args); }
function initOneSignal() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: '90cb3151-0f7d-4848-afb4-1fb4c8c890a8',
      safari_web_id: 'web.onesignal.auto.3cd6b41f-0715-4da8-9007-02ca4af2dc44',
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    });

    // Capture player ID for buddy notifications
    try {
      OneSignal.User.PushSubscription.addEventListener('change', (e) => {
        if (e.current?.id) {
          save('bloom_onesignal_pid', e.current.id);
          // Always re-register so the server has the current player ID
          buddyRegisterAndSync();
          // Schedule push notifications now that we have a player ID
          setTimeout(() => scheduleAllPushNotifications(), 2000);
        }
      });
      const pid = OneSignal.User.PushSubscription.id;
      if (pid) {
        save('bloom_onesignal_pid', pid);
        // Sync with server in case the stored ID was lost or changed
        buddyRegisterAndSync();
      }
    } catch(e) {}

    // Request permission after a short delay if not yet granted
    setTimeout(async () => {
      try {
        const permission = await OneSignal.Notifications.permission;
        if (!permission) {
          await OneSignal.Notifications.requestPermission();
        }
      } catch(e) {}
    }, 3000);
  });
  const script = document.createElement('script');
  script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
  script.defer = true;
  document.head.appendChild(script);
}

// ============================================================
//  SERVICE WORKER
// ============================================================
function registerServiceWorker() {
  // OneSignalSDKWorker.js handles the service worker.
  // We do not register a competing blob: service worker.
}

// ============================================================
//  BACKUP REMINDER
// ============================================================
function isSafariBrowser() {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
}

function isSafariPWA() {
  return isSafariBrowser() && window.navigator.standalone === true;
}

function checkSafariDataWarning() {
  if (!isSafariBrowser()) return;
  const warned = load('bloom_safari_warned', false);
  if (warned) return;

  setTimeout(() => {
    const isPWA = isSafariPWA();
    const msg = isPWA
      ? 'Important: Safari on iOS may delete app data after 7 days of inactivity. Since you\'re using Bloom as an installed app, we strongly recommend saving a backup link now to protect your data.'
      : 'Important: Safari may delete website data after 7 days of inactivity. We strongly recommend saving a backup link to protect your journal entries, mood history, and habits.';

    if (confirm(msg + '\n\nWant to save a backup link now?')) {
      switchTab('settings');
      setTimeout(() => {
        toggleSettingsSection('data');
        showBackupSheet();
      }, 400);
    }
    save('bloom_safari_warned', true);
  }, 3000);
}

function checkBackupReminder() {
  const backupDate = load('bloom_backup_date');
  const history = load('bloom_history', {});
  const hasData = Object.keys(history).length > 0;
  if (!hasData) return;

  const now = Date.now();
  // Safari users get reminded every 7 days; others every 30
  const reminderInterval = isSafariBrowser()
    ? 7 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;

  if (!backupDate || (now - backupDate) > reminderInterval) {
    setTimeout(() => {
      const safariNote = isSafariBrowser() ? ' Safari may clear data after 7 days of inactivity — backups are especially important.' : '';
      if (confirm('Friendly reminder 🌿 — it\'s been a while since you saved a backup link.' + safariNote + ' Want to do that now?')) {
        switchTab('settings');
        setTimeout(() => {
          toggleSettingsSection('data');
          showBackupSheet();
        }, 400);
      }
      save('bloom_backup_date', now);
    }, 5000);
  }
}

// ============================================================
//  APP INIT
// ============================================================
// ============================================================
//  TUTORIAL SYSTEM — spotlight edition
// ============================================================

// Each step defines:
//   tab        — which tab to switch to
//   spotlight  — CSS selector of element to highlight (or null for full dim)
//   cardPos    — 'top'|'mid'|'bottom' — where the card appears
//   title/text — content

function migrateToNewDailyHabits() {
  if (!state.prefs) return;
  const p = state.prefs;
  if (p._migratedDailyHabits) return;

  // Migrate old m_teeth/e_teeth to new brush_teeth with 'both'
  if (p.habits && (p.habits.m_teeth === true || p.habits.e_teeth === true)) {
    if (!p.dailyHabits) p.dailyHabits = {};
    if (!p.habitTimes) p.habitTimes = {};
    if (!p.dailyHabits.brush_teeth) {
      p.dailyHabits.brush_teeth = true;
      p.habitTimes.brush_teeth = 'both';
    }
  }

  // Migrate old body care self-care tasks to daily habits
  const bodyCareMigration = {
    sc_brush_hair: 'brush_hair',
    sc_wash_face: 'wash_face',
    sc_get_dressed: 'get_dressed',
    sc_floss: 'floss',
    sc_skincare: 'skincare',
  };
  const scTasks = p.selfCareTasks || [];
  const scRoutines = p.selfCareRoutines || {};
  Object.entries(bodyCareMigration).forEach(([oldId, newId]) => {
    if (scTasks.includes(oldId)) {
      if (!p.dailyHabits) p.dailyHabits = {};
      if (!p.habitTimes) p.habitTimes = {};
      p.dailyHabits[newId] = true;
      const oldRoutine = scRoutines[oldId];
      if (oldRoutine === 'morning') p.habitTimes[newId] = 'am';
      else if (oldRoutine === 'evening') p.habitTimes[newId] = 'pm';
      else p.habitTimes[newId] = 'any';
      // Remove from self-care
      p.selfCareTasks = p.selfCareTasks.filter(id => id !== oldId);
      if (p.selfCareRoutines) delete p.selfCareRoutines[oldId];
    }
  });

  // Migrate old medication to new daily habit
  if (scTasks.includes('sc_medication') || (p.medicationTiming && p.medicationTiming.length > 0)) {
    if (!p.dailyHabits) p.dailyHabits = {};
    if (!p.habitTimes) p.habitTimes = {};
    p.dailyHabits.medication = true;
    const medTiming = p.medicationTiming || ['once'];
    if (medTiming.includes('once') || (medTiming.includes('morning') && !medTiming.includes('evening'))) {
      p.habitTimes.medication = 'am';
    } else if (medTiming.includes('evening') && !medTiming.includes('morning')) {
      p.habitTimes.medication = 'pm';
    } else if (medTiming.includes('morning') && medTiming.includes('evening')) {
      p.habitTimes.medication = 'both';
    } else {
      p.habitTimes.medication = 'any';
    }
    // Remove from self-care
    if (p.selfCareTasks) p.selfCareTasks = p.selfCareTasks.filter(id => !id.startsWith('sc_medication'));
  }

  // Migrate today's completion data to new keys
  const td = state.todayData;
  if (td) {
    if (td.m_teeth && !td.brush_teeth_am) td.brush_teeth_am = true;
    if (td.e_teeth && !td.brush_teeth_pm) td.brush_teeth_pm = true;
    // Migrate body care self-care completions
    const sc = td.selfCare || {};
    const scToDaily = { sc_brush_hair: 'brush_hair', sc_wash_face: 'wash_face', sc_get_dressed: 'get_dressed', sc_floss: 'floss', sc_skincare: 'skincare' };
    Object.entries(scToDaily).forEach(([oldId, newId]) => {
      if (sc[oldId]) {
        const time = p.habitTimes?.[newId] || 'any';
        if (time === 'am' || time === 'both') td[newId + '_am'] = true;
        else if (time === 'pm') td[newId + '_pm'] = true;
        else td[newId + '_any'] = true;
      }
    });
    // Migrate medication completions
    if (sc.sc_medication || sc.sc_medication_morning || sc.sc_medication_evening) {
      const medTime = p.habitTimes?.medication || 'am';
      if (sc.sc_medication_morning || sc.sc_medication) {
        if (medTime === 'am' || medTime === 'both' || medTime === 'any') td.medication_am = true;
        if (medTime === 'any') td.medication_any = true;
      }
      if (sc.sc_medication_evening) {
        if (medTime === 'pm' || medTime === 'both') td.medication_pm = true;
      }
    }
    save('bloom_today_' + today(), td);
  }

  p._migratedDailyHabits = true;
  save('bloom_prefs', p);
}

// ============================================================
//  BLOOM BUDDY
// ============================================================

async function checkForUpdate() {
  try {
    // Bypass service worker cache with cache-busting query param
    const url = window.location.href.split('?')[0] + '?_v=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const match = html.match(/const VERSION\s*=\s*'([^']+)'/);
    if (match && match[1] !== VERSION) {
      // Clear service worker caches before reloading
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      // Force service worker to update
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update()));
      }
      // Hard reload — bypass cache
      window.location.reload(true);
    }
  } catch(e) { /* offline or network error — skip silently */ }
}

// ── Force refresh on service worker update ──────────────────
// Deferred to after app init to avoid reload loops during boot
function listenForSWUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!window._swReloading) {
        window._swReloading = true;
        window.location.reload();
      }
    });
  }
}

export { initOneSignal, registerServiceWorker, isSafariBrowser, isSafariPWA,
  checkSafariDataWarning, checkBackupReminder, migrateToNewDailyHabits,
  checkForUpdate, listenForSWUpdate };
