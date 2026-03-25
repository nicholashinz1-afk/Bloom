// Bloom — app entry point
// Imports all modules and boots the application

// Core
import { state, today, weekStart, loadState, saveState } from './state.js';
import { initDB, save, load, restoreFromDB, checkStorageQuota } from './storage.js';
import { bloomIcon } from './icons.js';

// Features
import { initTheme, applySeasonalTheme } from './theme.js';
import { switchTab, initAccessibility, initScrollProgress } from './router.js';
import { renderTodayTab } from './tabs/today.js';
import { renderDailyQuote, showWhatsNew } from './whatsnew.js';
import { updateStreak, checkMilestones, checkWelcomeBack } from './streaks.js';
import { sendTelemetry, trackEvent } from './telemetry.js';
import { renderOnboarding } from './features/onboarding.js';
import { tryRestoreFromURL } from './backup.js';
import { checkAutoGenerateInsight } from './tabs/progress.js';

// Notifications & reminders
import { checkDailyAffirmation, checkNewWeek, handleVisibilityChange,
  checkScheduledReminders, checkWaterReminders, checkMedicationReminders,
  checkEveningNudge, checkNudgeCredit } from './notifications.js';

// Buddy system
import { buddyRegisterAndSync, buddyAcceptInvite, fetchBuddyData,
  syncBuddyStatus, buddyState } from './features/buddy.js';

// Initialization helpers
import { initOneSignal, registerServiceWorker, checkSafariDataWarning,
  checkBackupReminder, migrateToNewDailyHabits, checkForUpdate,
  listenForSWUpdate } from './init.js';

// Seasonal & custom
import { checkWeeklySummaryNotification } from './seasonal.js';
import { checkMonthlyReflection } from './features/hardday.js';
import { checkShowTutorial } from './features/tutorial.js';

// ── Side-effect imports (register window globals) ──
import './habits.js';
import './celebrate.js';
import './sheets.js';
import './backup.js';
import './notifications.js';
import './tabs/today.js';
import './tabs/weekly.js';
import './tabs/wellness.js';
import './tabs/progress.js';
import './tabs/community.js';
import './tabs/settings.js';
import './features/buddy.js';
import './features/onboarding.js';
import './features/tutorial.js';
import './features/hardday.js';
import './features/mood.js';
import './whatsnew.js';
import './seasonal.js';

// ── Window bindings for cross-module late-bound references ──
window.loadState = loadState;
window.saveState = saveState;
window.checkForUpdate = checkForUpdate;
window.renderDailyQuote = renderDailyQuote;
window.initApp = initApp;
window.checkAutoGenerateInsight = checkAutoGenerateInsight;

// ── App initialization ──────────────────────────────────────

function initApp() {
  loadState();
  migrateToNewDailyHabits();
  initTheme();

  // Restore hard day dimming if active
  if (state.hardDayMode || (state.todayData?.mood !== undefined && state.todayData.mood <= 1 && state.todayData._hardDayActivated)) {
    document.body.classList.add('hard-day-active');
  }

  // Restore high contrast mode
  if (state.prefs?.highContrast) {
    document.body.classList.add('high-contrast');
  }

  checkForUpdate();
  trackEvent('session_start');
  renderDailyQuote();
  applySeasonalTheme();
  checkNewWeek();
  checkMonthlyReflection();
  checkDailyAffirmation();
  checkAutoGenerateInsight();
  checkStorageQuota();
  checkWelcomeBack();
  renderTodayTab();
  updateStreak();
  checkMilestones();
  initOneSignal();

  // Buddy: always register so admin fallback works
  buddyRegisterAndSync();
  fetchBuddyData();
  if (buddyState.status !== 'none') {
    syncBuddyStatus();
  }

  const pendingBuddyInvite = load('bloom_pending_buddy_invite', null);
  if (pendingBuddyInvite) {
    save('bloom_pending_buddy_invite', null);
    setTimeout(() => {
      buddyRegisterAndSync().then(() => buddyAcceptInvite(pendingBuddyInvite));
    }, 1000);
  } else {
    showWhatsNew();
  }

  checkBackupReminder();
  checkSafariDataWarning();
  checkShowTutorial();
  checkScheduledReminders();
  checkWaterReminders();
  checkMedicationReminders();
  checkEveningNudge();
  checkNudgeCredit();
  checkWeeklySummaryNotification();

  const headerIcon = document.getElementById('header-bloom-icon');
  if (headerIcon) headerIcon.innerHTML = bloomIcon(26);
  const navIcon = document.getElementById('nav-today-icon');
  if (navIcon) navIcon.innerHTML = bloomIcon(20);

  listenForSWUpdate();
  initAccessibility();
  setTimeout(initScrollProgress, 100);
}

async function main() {
  await initDB();
  await restoreFromDB();

  const restored = await tryRestoreFromURL();
  if (restored) {
    loadState();
  }

  // Check for buddy invite link (?buddy=CODE)
  const buddyInviteParam = new URLSearchParams(location.search).get('buddy');
  if (buddyInviteParam) {
    save('bloom_pending_buddy_invite', buddyInviteParam.toUpperCase().trim());
    history.replaceState({}, '', location.pathname);
  }

  const prefs = load('bloom_prefs');

  if (!prefs || !prefs.onboarded) {
    renderOnboarding();
  } else {
    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    initApp();
  }

  registerServiceWorker();
}

// Boot
main();
