// ── Tab routing, accessibility, gestures, UI enhancements ────
import { state } from './state.js';
import { staggerCards } from './ui.js';
import { haptic } from './utils.js';

// ============================================================
export function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
  const panel = document.getElementById('tab-' + tab);
  panel.classList.add('active');
  const navBtn = document.getElementById('nav-' + tab);
  if (navBtn) { navBtn.classList.add('active'); navBtn.setAttribute('aria-selected', 'true'); }
  // Highlight settings gear when settings tab is active
  const gear = document.getElementById('settings-gear');
  if (gear) gear.style.opacity = tab === 'settings' ? '0.8' : '0.35';
  // Haptic
  haptic('light');
  if (tab === 'today') renderTodayTab();
  if (tab === 'weekly') renderWeeklyTab();
  if (tab === 'wellness') renderWellnessTab();
  if (tab === 'progress') { renderProgressTab(); setTimeout(() => generateRollingInsight(), 800); }
  if (tab === 'community') { renderCommunityTab(); fetchBuddyData(); if (buddyState.status === 'paired') { buddyCachedBuddies.forEach(b => fetchBuddyMessages(b.pairId)); } }
  if (tab === 'settings') renderSettingsTab();
  // Stop buddy polling when leaving community tab
  if (tab !== 'community') stopBuddyPolling();
  // Stagger cards
  setTimeout(() => staggerCards(panel), 50);
}

// ============================================================
//  KEYBOARD NAVIGATION & ACCESSIBILITY
// ============================================================
export const TAB_ORDER = ['today', 'weekly', 'wellness', 'progress', 'community'];

document.addEventListener('keydown', (e) => {
  // Tab navigation: arrow keys when focus is on a nav button
  const active = document.activeElement;
  if (active && active.classList.contains('nav-btn') && active.getAttribute('role') === 'tab') {
    let idx = TAB_ORDER.indexOf(active.id.replace('nav-', ''));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      idx = (idx + 1) % TAB_ORDER.length;
      const next = document.getElementById('nav-' + TAB_ORDER[idx]);
      if (next) { next.focus(); switchTab(TAB_ORDER[idx]); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      idx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      const prev = document.getElementById('nav-' + TAB_ORDER[idx]);
      if (prev) { prev.focus(); switchTab(TAB_ORDER[idx]); }
    }
  }
  // Escape to close sheets
  if (e.key === 'Escape') {
    const openSheet = document.querySelector('.bottom-sheet.open');
    if (openSheet) { e.preventDefault(); closeAllSheets(); }
  }
});

// Focus trapping for bottom sheets
export function trapFocusInSheet(sheet) {
  const focusable = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first.focus();
  sheet._focusTrap = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  sheet.addEventListener('keydown', sheet._focusTrap);
}

export function releaseFocusTrap(sheet) {
  if (sheet._focusTrap) {
    sheet.removeEventListener('keydown', sheet._focusTrap);
    delete sheet._focusTrap;
  }
}

export function initAccessibility() {
  // Skip link target
  const main = document.querySelector('main');
  if (main && !main.getAttribute('tabindex')) main.setAttribute('tabindex', '-1');

  // Make all toggles keyboard accessible
  enhanceToggles();
  const observer = new MutationObserver(() => enhanceToggles());
  observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
}

export function enhanceToggles() {
  document.querySelectorAll('.toggle:not([role])').forEach(toggle => {
    toggle.setAttribute('role', 'checkbox');
    toggle.setAttribute('aria-checked', toggle.classList.contains('on') ? 'true' : 'false');
    toggle.setAttribute('tabindex', '0');
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle.click();
        // Update aria-checked after click
        setTimeout(() => {
          toggle.setAttribute('aria-checked', toggle.classList.contains('on') ? 'true' : 'false');
        }, 50);
      }
    });
    // Observe class changes for aria-checked
    const classObserver = new MutationObserver(() => {
      toggle.setAttribute('aria-checked', toggle.classList.contains('on') ? 'true' : 'false');
    });
    classObserver.observe(toggle, { attributes: true, attributeFilter: ['class'] });
  });
}

// ============================================================
//  SWIPE GESTURE NAVIGATION
// ============================================================
(function initSwipeNav() {
  let startX = 0, startY = 0, swiping = false;
  const content = document.getElementById('tab-content');
  if (!content) return;

  content.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });

  content.addEventListener('touchend', (e) => {
    if (!swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

    const activeNav = document.querySelector('.nav-btn.active');
    if (!activeNav) return;
    const cur = TAB_ORDER.indexOf(activeNav.id.replace('nav-', ''));
    if (cur === -1) return;

    let next;
    if (dx < 0 && cur < TAB_ORDER.length - 1) next = cur + 1;
    else if (dx > 0 && cur > 0) next = cur - 1;
    else return;

    switchTab(TAB_ORDER[next]);
  }, { passive: true });
})();

// ============================================================
//  SCROLL PROGRESS INDICATOR
// ============================================================
export function initScrollProgress() {
  document.querySelectorAll('.tab-scroll').forEach(scroller => {
    if (scroller.querySelector('.scroll-progress')) return;
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    scroller.style.position = 'relative';
    scroller.prepend(bar);
    scroller.addEventListener('scroll', () => {
      const pct = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight);
      const clamped = Math.min(1, Math.max(0, pct));
      bar.style.width = (clamped * 100) + '%';
      bar.classList.toggle('visible', clamped > 0.01 && clamped < 0.99);
    }, { passive: true });
  });
}

// ============================================================
//  TOGGLE BOUNCE ENHANCEMENT
// ============================================================
const _origToggleClick = HTMLElement.prototype.click;
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.toggle');
  if (!toggle) return;
  toggle.style.setProperty('--toggle-x', toggle.classList.contains('on') ? '18px' : '0px');
  toggle.classList.add('just-toggled');
  setTimeout(() => toggle.classList.remove('just-toggled'), 350);
});

// ============================================================
//  STAT COUNTER BUMP ANIMATION
// ============================================================
export function animateStatBump(el) {
  if (!el) return;
  el.classList.remove('bumped');
  void el.offsetWidth;
  el.classList.add('bumped');
  setTimeout(() => el.classList.remove('bumped'), 400);
}

// Late-bound references to avoid circular dependencies — these
// render functions will be attached to window by their own modules.
function renderTodayTab()        { if (window.renderTodayTab)        window.renderTodayTab(); }
function renderWeeklyTab()       { if (window.renderWeeklyTab)       window.renderWeeklyTab(); }
function renderWellnessTab()     { if (window.renderWellnessTab)     window.renderWellnessTab(); }
function renderProgressTab()     { if (window.renderProgressTab)     window.renderProgressTab(); }
function renderCommunityTab()    { if (window.renderCommunityTab)    window.renderCommunityTab(); }
function renderSettingsTab()     { if (window.renderSettingsTab)     window.renderSettingsTab(); }
function generateRollingInsight(){ if (window.generateRollingInsight) window.generateRollingInsight(); }
function fetchBuddyData()       { if (window.fetchBuddyData)        window.fetchBuddyData(); }
function fetchBuddyMessages(id) { if (window.fetchBuddyMessages)    window.fetchBuddyMessages(id); }
function stopBuddyPolling()     { if (window.stopBuddyPolling)      window.stopBuddyPolling(); }
function closeAllSheets()       { if (window.closeAllSheets)        window.closeAllSheets(); }
// buddyState and buddyCachedBuddies accessed via window for late binding
function get_buddyState()       { return window.buddyState || { status: '' }; }
function get_buddyCachedBuddies(){ return window.buddyCachedBuddies || []; }
// Patch the references used in switchTab
const buddyState = new Proxy({}, { get: (_, prop) => get_buddyState()[prop] });
const buddyCachedBuddies = new Proxy([], { get: (target, prop) => { const arr = get_buddyCachedBuddies(); if (prop === 'forEach') return arr.forEach.bind(arr); return arr[prop]; } });

// Window bindings for onclick handlers
window.switchTab = switchTab;
