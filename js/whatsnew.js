import { state, getDayIndex } from './state.js';
import { save, load } from './storage.js';
import { VERSION, WHATS_NEW, SELF_CARE_CATEGORIES, DAILY_QUOTES } from './constants.js';
import { THEMES, setTheme } from './theme.js';
import { switchTab } from './router.js';
import { bloomIcon } from './icons.js';
import { haptic } from './utils.js';
function showWhatsNew(force = false) {
  if (!load('bloom_tutorial_done') && !force) return;
  if (!force && load('bloom_version') === VERSION) return;

  const isExistingUser = !!load('bloom_tutorial_done');
  const hasSeenReintro = load('bloom_reintro_v150', false);

  save('bloom_version', VERSION);

  const title = document.getElementById('whats-new-title');
  if (title) title.textContent = `What's new in v${VERSION} 🌿`;

  const list = document.getElementById('whats-new-list');
  if (list) {
    list.innerHTML = WHATS_NEW.map(item =>
      `<div class="whats-new-item"><div class="whats-new-dot"></div><div>${typeof item === 'string' ? item : item.text}</div></div>`
    ).join('');
  }

  const tourBtn = document.getElementById('whats-new-tour-btn');
  const hasTour = WHATS_NEW.some(i => i.spotlight);
  if (tourBtn) tourBtn.style.display = hasTour ? '' : 'none';

  openSheet('whats-new-sheet');

  // After What's New closes, show re-intro for existing users who haven't seen it
  if (isExistingUser && !hasSeenReintro && !force) {
    const sheet = document.getElementById('whats-new-sheet');
    if (sheet) {
      const observer = new MutationObserver(() => {
        if (!sheet.classList.contains('open')) {
          observer.disconnect();
          setTimeout(() => {
            if (!load('bloom_reintro_v150', false)) {
              openSheet('reintro-sheet');
            }
          }, 400);
        }
      });
      observer.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    }
  }
}

function dismissReintro() {
  save('bloom_reintro_v150', true);
  closeAllSheets();
}

let reintroStep = 0;
const REINTRO_STEPS = ['appearance', 'selfcare'];

function startReintro() {
  save('bloom_reintro_v150', true);
  closeAllSheets();
  reintroStep = 0;
  const overlay = document.getElementById('reintro-overlay');
  overlay.style.display = 'flex';
  renderReintroStep();
}

function renderReintroStep() {
  const body = document.getElementById('reintro-body');
  const footer = document.getElementById('reintro-footer');
  const step = REINTRO_STEPS[reintroStep];
  const stepLabel = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:16px;text-align:right">${reintroStep + 1} of ${REINTRO_STEPS.length}</div>`;

  if (step === 'appearance') {
    const currentTheme = state.prefs?.theme || 'forest';
    body.innerHTML = stepLabel + `
      <div style="font-family:Fraunces,serif;font-size:24px;font-weight:300;color:var(--cream);margin-bottom:6px">Make it yours</div>
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;line-height:1.6">Choose a palette that feels right. You can always change it in Settings.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${Object.entries(THEMES).map(([key, t]) => `
          <div onclick="reintroSetTheme('${key}')" id="reintro-theme-${key}" style="
            background:${t.bg};border:2px solid ${key === currentTheme ? t.primary : 'rgba(255,255,255,0.1)'};
            border-radius:var(--r-xl);padding:16px 14px;cursor:pointer;transition:border-color 0.2s,transform 0.15s;
            ${key === currentTheme ? 'transform:scale(1.03)' : ''}">
            <div style="display:flex;gap:5px;margin-bottom:10px">
              <div style="width:14px;height:14px;border-radius:50%;background:#7a9e7e"></div>
              <div style="width:14px;height:14px;border-radius:50%;background:#b07878"></div>
              <div style="width:14px;height:14px;border-radius:50%;background:#6a9ab0"></div>
              <div style="width:14px;height:14px;border-radius:50%;background:#c9954a"></div>
            </div>
            <div style="font-size:15px;font-weight:500;color:${t.primaryLight}">${t.emoji} ${t.name}</div>
            <div style="font-size:12px;color:${t.textSecondary};margin-top:3px">${t.description}</div>
            ${key === currentTheme ? `<div style="font-size:11px;color:${t.primary};margin-top:6px">Selected ✓</div>` : ''}
          </div>`).join('')}
      </div>`;

    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="closeReintro()" style="color:var(--text-muted);font-size:13px">Skip</button>
      <button class="btn btn-primary" style="flex:1" onclick="reintroNext()">Next →</button>`;

  } else if (step === 'selfcare') {
    const selected = state.prefs?.selfCareTasks || [];
    let html = stepLabel + `
      <div style="font-family:Fraunces,serif;font-size:24px;font-weight:300;color:var(--cream);margin-bottom:6px">Daily self-care</div>
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:6px;line-height:1.6">Small acts that matter — especially on hard days. Pick what feels possible, not what feels perfect.</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;font-style:italic;line-height:1.5">You can add or remove these any time in Settings. There's no right answer.</div>`;

    SELF_CARE_CATEGORIES.forEach(cat => {
      html += `<div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:15px">${cat.icon}</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--cream)">${cat.label}</div>
            <div style="font-size:11px;color:var(--text-muted)">${cat.sub}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${cat.tasks.map(t => {
            const on = selected.includes(t.id);
            const ps = `display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:99px;cursor:pointer;font-size:13px;background:${on ? 'rgba(var(--sage-rgb),0.2)' : 'rgba(255,255,255,0.04)'};border:1px solid ${on ? 'rgba(var(--sage-rgb),0.5)' : 'rgba(255,255,255,0.08)'};color:${on ? 'var(--sage-light)' : 'var(--text-secondary)'};transition:all 0.15s`;
            return `<div onclick="reintroToggleSC('${t.id}')" id="ri-sc-${t.id}" style="${ps}"><span>${t.icon}</span>${t.label}</div>`;
          }).join('')}
        </div>
      </div>`;
    });

    const medOn = selected.includes('sc_medication');
    const medPs = `display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:99px;cursor:pointer;font-size:13px;background:${medOn ? 'rgba(106,154,176,0.2)' : 'rgba(255,255,255,0.04)'};border:1px solid ${medOn ? 'rgba(106,154,176,0.4)' : 'rgba(255,255,255,0.08)'};color:${medOn ? 'var(--sky-light)' : 'var(--text-secondary)'};transition:all 0.15s`;
    html += `<div style="background:rgba(106,154,176,0.06);border:1px solid rgba(106,154,176,0.15);border-radius:var(--r-lg);padding:12px 14px;margin-bottom:20px">
      <div style="font-size:12px;color:var(--sky-light);font-weight:500;margin-bottom:4px">💊 Medication</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:10px">A private, judgment-free nudge. Just "did I remember?" — nothing more.</div>
      <div onclick="openMedicationSheet()" id="ri-sc-sc_medication" style="${medPs}">${medOn ? "💊 Medication ✓" : "💊 Set up reminder →"}</div>
    </div>`;

    body.innerHTML = html;
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="reintroBack()">← Back</button>
      <button class="btn btn-primary" style="flex:1" onclick="closeReintro()">All done 🌿</button>`;
  }
}

function reintroSetTheme(key) {
  setTheme(key);
  Object.keys(THEMES).forEach(k => {
    const el = document.getElementById('reintro-theme-' + k);
    if (!el) return;
    const t = THEMES[k];
    el.style.borderColor = k === key ? t.primary : 'rgba(255,255,255,0.1)';
    el.style.transform = k === key ? 'scale(1.03)' : 'scale(1)';
  });
}

function reintroToggleSC(id) {
  if (!state.prefs.selfCareTasks) state.prefs.selfCareTasks = [];
  const idx = state.prefs.selfCareTasks.indexOf(id);
  if (idx > -1) state.prefs.selfCareTasks.splice(idx, 1);
  else state.prefs.selfCareTasks.push(id);
  save('bloom_prefs', state.prefs);
  const el = document.getElementById('ri-sc-' + id);
  if (el) {
    const on = state.prefs.selfCareTasks.includes(id);
    const isMed = id === 'sc_medication';
    el.style.background = on ? (isMed ? 'rgba(106,154,176,0.2)' : 'rgba(var(--sage-rgb),0.2)') : 'rgba(255,255,255,0.04)';
    el.style.borderColor = on ? (isMed ? 'rgba(106,154,176,0.4)' : 'rgba(var(--sage-rgb),0.5)') : 'rgba(255,255,255,0.08)';
    el.style.color = on ? (isMed ? 'var(--sky-light)' : 'var(--sage-light)') : 'var(--text-secondary)';
  }
}

function reintroNext() {
  reintroStep++;
  if (reintroStep >= REINTRO_STEPS.length) {
    closeReintro();
  } else {
    const body = document.getElementById('reintro-body');
    if (body) body.scrollTop = 0;
    renderReintroStep();
  }
}

function reintroBack() {
  reintroStep = Math.max(0, reintroStep - 1);
  const body = document.getElementById('reintro-body');
  if (body) body.scrollTop = 0;
  renderReintroStep();
}

function closeReintro() {
  // Remove any tour spotlights that might be lingering
  document.getElementById('tour-spotlight')?.remove();
  document.getElementById('streak-welcome-overlay')?.remove();

  const overlay = document.getElementById('reintro-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    // Clear body content to prevent stale state
    const body = document.getElementById('reintro-body');
    const footer = document.getElementById('reintro-footer');
    if (body) body.innerHTML = '';
    if (footer) footer.innerHTML = '';
  }

  // Re-render today tab to show any newly selected self-care tasks
  renderTodayTab();

  // Show a warm completion toast
  setTimeout(() => {
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
      background:var(--bg-card);border:2px solid var(--sage);border-radius:99px;
      padding:12px 24px;font-size:14px;color:var(--cream);z-index:600;
      font-family:Fraunces,serif;font-style:italic;white-space:nowrap;
      animation:celebrateIn 0.4s ease forwards`;
    div.textContent = "You're all set 🌿";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
  }, 200);
}

let whatsNewTourStep = 0;
function startWhatsNewTour() {
  closeAllSheets();
  whatsNewTourStep = 0;
  const tourItems = WHATS_NEW.filter(i => i.spotlight);
  if (tourItems.length === 0) return;
  runWhatsNewTourStep(tourItems);
}

function cancelWhatsNewTour() {
  document.getElementById('tour-spotlight')?.remove();
  whatsNewTourStep = 0;
  // Return to today tab cleanly
  switchTab('today');
}

function runWhatsNewTourStep(items) {
  if (whatsNewTourStep >= items.length) {
    // Tour done
    const div = document.createElement('div');
    div.id = 'tour-done-toast';
    const doneAppRect = document.getElementById('app')?.getBoundingClientRect() || { left: 0, width: window.innerWidth };
    const doneCx = doneAppRect.left + doneAppRect.width / 2;
    div.style.cssText = `position:fixed;bottom:100px;left:${doneCx}px;transform:translateX(-50%);
      background:var(--bg-card);border:2px solid var(--sage);border-radius:99px;
      padding:12px 24px;font-size:14px;color:var(--cream);z-index:600;
      font-family:Fraunces,serif;font-style:italic;white-space:nowrap;
      animation:celebrateIn 0.4s ease forwards`;
    div.textContent = "You're all caught up 🌿";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
    return;
  }

  const item = items[whatsNewTourStep];

  // Switch to correct tab if needed
  if (item.tab) switchTab(item.tab);

  setTimeout(() => {
    const target = document.querySelector(item.spotlight);
    if (!target) {
      whatsNewTourStep++;
      runWhatsNewTourStep(items);
      return;
    }

    // Scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Show spotlight overlay
    showTourSpotlight(target, item.text, items.length, () => {
      whatsNewTourStep++;
      runWhatsNewTourStep(items);
    });
  }, item.tab ? 400 : 100);
}

function showTourSpotlight(el, text, total, onNext) {
  // Remove any existing spotlight
  document.getElementById('tour-spotlight')?.remove();

  const appEl = document.getElementById('app');
  const appRect = appEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const pad = 8;

  // Positions relative to the app container
  const relLeft = elRect.left - appRect.left;
  const relTop = elRect.top - appRect.top;
  const appW = appRect.width;
  const appH = appRect.height;

  const overlay = document.createElement('div');
  overlay.id = 'tour-spotlight';
  overlay.style.cssText = `position:fixed;top:${appRect.top}px;left:${appRect.left}px;width:${appW}px;height:${appH}px;z-index:700;pointer-events:none;overflow:hidden`;

  // Whether info card should go above or below the target
  const elMid = elRect.top - appRect.top + elRect.height / 2;
  const showAbove = elMid > appH / 2;
  const cardPos = showAbove
    ? `bottom:${appH - relTop + 16}px`
    : `top:${relTop + elRect.height + pad + 12}px`;

  overlay.innerHTML = `
    <svg width="${appW}" height="${appH}" style="position:absolute;top:0;left:0">
      <defs>
        <mask id="tour-mask">
          <rect width="${appW}" height="${appH}" fill="white"/>
          <rect x="${relLeft - pad}" y="${relTop - pad}"
            width="${elRect.width + pad*2}" height="${elRect.height + pad*2}"
            rx="12" fill="black"/>
        </mask>
      </defs>
      <rect width="${appW}" height="${appH}" fill="rgba(0,0,0,0.7)" mask="url(#tour-mask)"/>
      <rect x="${relLeft - pad}" y="${relTop - pad}"
        width="${elRect.width + pad*2}" height="${elRect.height + pad*2}"
        rx="12" fill="none" stroke="var(--sage, #5a9e60)" stroke-width="2"
        style="animation:pulse 1.5s ease-in-out infinite"/>
    </svg>
    <div style="
      position:absolute;
      left:16px;right:16px;
      ${cardPos};
      background:var(--bg-card);border:2px solid var(--sage);border-radius:20px;
      padding:16px 18px;pointer-events:all;
      box-shadow:0 8px 32px rgba(0,0,0,0.8)">
      <div style="font-size:11px;color:var(--sage-light);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">
        What's new — ${whatsNewTourStep + 1} of ${total}
      </div>
      <div style="font-size:14px;color:var(--cream);line-height:1.5;margin-bottom:14px;font-family:Fraunces,serif;font-style:italic">
        ${text}
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="cancelWhatsNewTour()" style="
          background:none;border:1px solid rgba(255,255,255,0.15);
          color:var(--text-muted);border-radius:99px;padding:8px 16px;
          font-size:13px;cursor:pointer;font-family:Instrument Sans,sans-serif">
          Skip tour
        </button>
        <button id="tour-next-btn" style="
          flex:1;background:rgba(var(--sage-rgb),0.2);border:1px solid var(--sage);
          color:var(--sage-light);border-radius:99px;padding:8px 16px;
          font-size:13px;cursor:pointer;font-family:Instrument Sans,sans-serif">
          ${whatsNewTourStep + 1 >= total ? 'Done ✓' : 'Next →'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('tour-next-btn').addEventListener('click', () => {
    overlay.remove();
    onNext();
  });
}

// ============================================================
//  DAILY QUOTE
// ============================================================
function renderDailyQuote() {
  const el = document.getElementById('daily-quote');
  if (!el) return;
  // Use a seeded shuffle so same day = same quote, but distribution covers all quotes before repeating
  const dayIdx = getDayIndex();
  const cycle = Math.floor(dayIdx / DAILY_QUOTES.length);
  const posInCycle = dayIdx % DAILY_QUOTES.length;
  // Simple hash-based permutation per cycle
  const seed = cycle * 7 + 3;
  const idx = (posInCycle * 17 + seed) % DAILY_QUOTES.length;
  el.textContent = DAILY_QUOTES[idx];
}

// ============================================================
//  ONBOARDING
// ============================================================
export { showWhatsNew, renderDailyQuote, dismissReintro, startReintro, startWhatsNewTour, cancelWhatsNewTour, showTourSpotlight };
window.dismissReintro = dismissReintro;
window.startReintro = startReintro;
window.reintroSetTheme = reintroSetTheme;
window.reintroToggleSC = reintroToggleSC;
window.reintroNext = reintroNext;
window.reintroBack = reintroBack;
window.closeReintro = closeReintro;
window.startWhatsNewTour = startWhatsNewTour;
window.cancelWhatsNewTour = cancelWhatsNewTour;
