import { state } from '../state.js';
import { save, load } from '../storage.js';
import { switchTab } from '../router.js';
const TUTORIAL_STEPS = [
  {
    tab: 'today',
    spotlight: null,
    cardPos: 'mid',
    title: 'Welcome to bloom 🌿',
    text: 'Let\'s take a quick look around so you feel right at home. Tap Next and we\'ll walk through everything together.',
    first: true,
  },
  {
    tab: 'today',
    spotlight: '#tab-today .tab-scroll',
    cardPos: 'bottom',
    title: 'Your Today tab',
    text: 'This is home base. Log your mood and sleep each morning, then check off habits as you go. Everything resets at midnight.',
    scrollToTop: true,
  },
  {
    tab: 'today',
    spotlight: '#nav-wellness',
    cardPos: 'bottom',
    pulse: true,
    title: '🫧 Wellness — journal & reflect',
    text: 'Tap here to write your daily journal or do your weekly reflection. bloom reads what you write and responds with something warm — it\'s a real conversation, not just logging.',
  },
  {
    tab: 'wellness',
    spotlight: '#journal-card',
    cardPos: 'bottom',
    title: 'Daily journal',
    text: 'A new prompt every day. Write as much or as little as you want, then tap "Save & reflect." bloom will respond to what you shared within a few seconds.',
    scrollToTop: true,
  },
  {
    tab: 'wellness',
    spotlight: '#breath-card',
    cardPos: 'top',
    title: '🌬 4-7-8 breathing',
    text: 'This lives at the bottom of Wellness and also appears inline when you\'re having a hard day. No tracking, no pressure — just a tool that\'s here whenever you need it.',
    scrollToBottom: true,
  },
  {
    tab: 'today',
    spotlight: '#nav-progress',
    cardPos: 'bottom',
    pulse: true,
    title: '✨ Progress',
    text: 'Track your sunlight, days shown up, and mood chart here. Every day you log anything adds to your total — and that number never goes down.',
  },
  {
    tab: 'progress',
    spotlight: '#tab-progress .tab-scroll',
    cardPos: 'top',
    title: 'Your progress & sunlight',
    text: 'Every day you show up gets counted — even hard days where you just log your mood. Missing a day is just missing a day, nothing is lost.',
    scrollToTop: true,
  },
  {
    tab: 'today',
    spotlight: '#nav-weekly',
    cardPos: 'bottom',
    pulse: true,
    title: '📋 Weekly',
    text: 'Your weekly goals, household tasks, and recent history live here. Separate from your daily habits.',
  },
  {
    tab: 'today',
    spotlight: '#crisis-heart',
    cardPos: 'top',
    pulse: true,
    title: '🤍 You\'re never alone',
    text: 'This quiet heart in the header is always here. Tap it any time for instant access to 988, Crisis Text Line, and online chat. It also appears as a shortcut when you log a low mood.',
  },
  {
    tab: 'today',
    spotlight: '#nav-community',
    cardPos: 'bottom',
    pulse: true,
    title: '💛 Encouragement wall',
    text: 'A shared, anonymous space. Leave a kind word for someone who needs it, or just scroll through and feel a little less alone. No profiles, no judgement — just warmth.',
  },
  {
    tab: 'today',
    spotlight: null,
    cardPos: 'mid',
    title: 'You\'re all set 🌱',
    text: 'Go at your own pace. There\'s no pressure to be perfect — bloom is here for the real, messy days too. Remember: bloom is a self-care companion, not a replacement for professional support. The 🤍 is always there if you need it.',
    last: true,
  },
];

let tutorialStep = 0;
let tutorialSpotlightEl = null;

function startTutorial() {
  tutorialStep = 0;
  renderTutorialStep();
}

function renderTutorialStep() {
  const overlay = document.getElementById('tutorial-overlay');
  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) { endTutorial(); return; }

  overlay.className = 'active';

  // Switch tab
  if (step.tab) switchTab(step.tab);

  // Scroll tab content if needed
  if (step.scrollToTop) {
    setTimeout(() => {
      const s = document.querySelector('#tab-' + step.tab + ' .tab-scroll');
      if (s) s.scrollTop = 0;
    }, 120);
  }
  if (step.scrollToBottom) {
    setTimeout(() => {
      const s = document.querySelector('#tab-' + step.tab + ' .tab-scroll');
      if (s) s.scrollTop = s.scrollHeight;
    }, 120);
  }

  setTimeout(() => buildTutorialOverlay(step), step.scrollToTop || step.scrollToBottom ? 200 : 50);
}

function buildTutorialOverlay(step) {
  const overlay = document.getElementById('tutorial-overlay');
  const total = TUTORIAL_STEPS.length;

  // Find spotlight element and get its rect
  let spotRect = null;
  let spotEl = null;
  if (step.spotlight) {
    spotEl = document.querySelector(step.spotlight);
    if (spotEl) spotRect = spotEl.getBoundingClientRect();
  }

  const dots = TUTORIAL_STEPS.map((_,i) =>
    `<div class="tutorial-dot${i === tutorialStep ? ' active' : ''}"></div>`
  ).join('');

  // Build SVG cutout backdrop
  const W = window.innerWidth;
  const H = window.innerHeight;
  let backdropHTML = '';

  if (spotRect) {
    const pad = 8;
    const r = 16;
    const x = Math.max(0, spotRect.left - pad);
    const y = Math.max(0, spotRect.top - pad);
    const w = Math.min(W, spotRect.width + pad * 2);
    const h = Math.min(H, spotRect.height + pad * 2);

    backdropHTML = `
      <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="tut-mask">
            <rect width="${W}" height="${H}" fill="white"/>
            <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="black"/>
          </mask>
        </defs>
        <rect width="${W}" height="${H}" fill="rgba(0,0,0,0.78)" mask="url(#tut-mask)"/>
      </svg>
      <div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;border:2px solid rgba(var(--sage-rgb),0.6);pointer-events:none;box-shadow:0 0 0 3px rgba(var(--sage-rgb),0.15)${step.pulse ? ',0 0 20px rgba(var(--sage-rgb),0.3)' : ''}">
        ${step.pulse ? `<div style="position:absolute;inset:-6px;border-radius:${r+6}px;border:2px solid rgba(var(--sage-rgb),0.3);animation:tutPulse 1.6s ease-in-out infinite"></div>` : ''}
      </div>`;
  } else {
    backdropHTML = `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.78)"></div>`;
  }

  // Calculate card position — avoid covering the spotlight
  let cardClass = 'pos-mid';
  if (step.cardPos === 'top' && spotRect) {
    cardClass = 'pos-top';
  } else if (step.cardPos === 'bottom' && spotRect) {
    cardClass = 'pos-bottom';
  }

  overlay.innerHTML = `
    ${backdropHTML}
    <div class="tutorial-card ${cardClass}">
      <div class="tutorial-step-label">Step ${tutorialStep + 1} of ${total}</div>
      <div class="tutorial-title">${step.title}</div>
      <div class="tutorial-text">${step.text}</div>
      <div class="tutorial-footer">
        <div class="tutorial-dots">${dots}</div>
        <div style="display:flex;gap:8px">
          ${tutorialStep > 0 ? `<button class="btn btn-ghost btn-sm" id="tut-back">← Back</button>` : ''}
          ${step.last
            ? `<button class="btn btn-primary btn-sm" id="tut-end">Let's go 🌿</button>`
            : `<button class="btn btn-primary btn-sm" id="tut-next">Next →</button>`
          }
        </div>
      </div>
      ${step.first ? `<button id="tut-skip" style="position:absolute;top:14px;right:14px;background:none;border:none;color:var(--text-muted);font-size:12px;cursor:pointer">Skip</button>` : ''}
    </div>
  `;

  // Wire buttons via addEventListener (no inline onclick)
  document.getElementById('tut-next')?.addEventListener('click', tutorialNext);
  document.getElementById('tut-back')?.addEventListener('click', tutorialBack);
  document.getElementById('tut-end')?.addEventListener('click', endTutorial);
  document.getElementById('tut-skip')?.addEventListener('click', endTutorial);
}

function tutorialNext() {
  tutorialStep++;
  renderTutorialStep();
}

function tutorialBack() {
  tutorialStep = Math.max(0, tutorialStep - 1);
  renderTutorialStep();
}

function endTutorial() {
  const overlay = document.getElementById('tutorial-overlay');
  overlay.innerHTML = '';
  overlay.className = '';
  save('bloom_tutorial_done', true);
  save('bloom_version', VERSION); // mark version seen — no What's New on first launch
  switchTab('today');
}

function checkShowTutorial() {
  if (!load('bloom_tutorial_done')) {
    // First-time user — show tutorial, skip What's New
    setTimeout(startTutorial, 700);
  } else {
    // Returning user — show What's New if version is new
    showWhatsNew();
  }
}

export { TUTORIAL_STEPS, startTutorial, renderTutorialStep, buildTutorialOverlay, tutorialNext, tutorialBack, endTutorial, checkShowTutorial };
window.startTutorial = startTutorial; window.tutorialNext = tutorialNext;
window.tutorialBack = tutorialBack; window.endTutorial = endTutorial;
