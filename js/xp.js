import { LEVELS } from './constants.js';
import { THEMES } from './theme.js';
import { state, saveState } from './state.js';
import { haptic, playSound } from './utils.js';
import { launchConfetti } from './ui.js';

export function getLevel(xp) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) lv = l; else break; }
  return lv;
}

export function getNextLevel(xp) {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (xp < LEVELS[i+1].min) return LEVELS[i+1];
  }
  return null;
}

export function showXPFloat(amount, el) {
  const rect = el.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'xp-float';
  div.textContent = `+${amount} ☀️`;
  div.style.left = (rect.left + rect.width/2 - 30) + 'px';
  div.style.top = (rect.top - 10) + 'px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1500);
}

export function burstParticles(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const colors = ['#7a9e7e','#c9954a','#b07878','#6a9ab0','#a8c5ab'];
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (i / 8) * Math.PI * 2;
    const dist = 30 + Math.random() * 30;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    p.style.cssText = `left:${cx-4}px;top:${cy-4}px;background:${colors[i%colors.length]};--particle-end:translate(${tx}px,${ty}px)`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

export function burstHearts(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const hearts = ['💗','💕','💖','🩷','♥️'];
  for (let i = 0; i < 7; i++) {
    const h = document.createElement('div');
    h.textContent = hearts[i % hearts.length];
    h.style.cssText = `position:fixed;pointer-events:none;font-size:${12 + Math.random()*10}px;z-index:10000;left:${cx}px;top:${cy}px;opacity:1;transition:all 0.9s cubic-bezier(.2,.8,.3,1)`;
    document.body.appendChild(h);
    const angle = (i / 7) * Math.PI * 2;
    const dist = 35 + Math.random() * 35;
    requestAnimationFrame(() => {
      h.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist - 20}px) scale(0.4)`;
      h.style.opacity = '0';
    });
    setTimeout(() => h.remove(), 1000);
  }
}

// ── Level-up check + celebration ────────────────────────────
export let lastLevel = null;
export function checkLevelUp(oldXP, newXP) {
  const oldLv = getLevel(oldXP);
  const newLv = getLevel(newXP);
  if (newLv.name !== oldLv.name) {
    showLevelUp(oldLv, newLv);
  }
}

export function getLevelIndex(level) {
  return LEVELS.findIndex(l => l.name === level.name);
}

export function buildFlowerSVG(levelIdx, animated = false) {
  // Stages: 0=Seedling, 1=Sprout, 2=Blooming, 3=Thriving, 4=Radiant, 5=Glowing
  const i = Math.min(levelIdx, 5);
  const potColor = '#6b5a4a';
  const potLight = '#8a7560';
  const soilColor = '#4a3d30';
  const stemColor = '#5a8a5e';
  const leafColor = '#7a9e7e';
  const leafLight = '#a8c5ab';

  // Height of stem grows with level
  const stemH = [15, 35, 55, 65, 70, 75][i];
  const stemTop = 160 - stemH;
  const anim = animated ? 'class="flower-grow"' : '';

  let plant = '';
  if (i === 0) {
    // Seedling — tiny sprout with one unfurling leaf
    plant = `<g ${anim}>
      <line x1="100" y1="160" x2="100" y2="${stemTop}" stroke="${stemColor}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="95" cy="${stemTop + 2}" rx="8" ry="5" fill="${leafColor}" transform="rotate(-30 95 ${stemTop + 2})"/>
    </g>`;
  } else if (i === 1) {
    // Sprout — taller stem with two leaves
    plant = `<g ${anim}>
      <line x1="100" y1="160" x2="100" y2="${stemTop}" stroke="${stemColor}" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="88" cy="${stemTop + 20}" rx="12" ry="6" fill="${leafColor}" transform="rotate(-40 88 ${stemTop + 20})"/>
      <ellipse cx="112" cy="${stemTop + 12}" rx="12" ry="6" fill="${leafLight}" transform="rotate(35 112 ${stemTop + 12})"/>
      <ellipse cx="96" cy="${stemTop + 2}" rx="6" ry="10" fill="${leafColor}" transform="rotate(-10 96 ${stemTop + 2})"/>
    </g>`;
  } else if (i === 2) {
    // Blooming — flower bud opening
    plant = `<g ${anim}>
      <line x1="100" y1="160" x2="100" y2="${stemTop + 15}" stroke="${stemColor}" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="85" cy="${stemTop + 35}" rx="14" ry="7" fill="${leafColor}" transform="rotate(-35 85 ${stemTop + 35})"/>
      <ellipse cx="115" cy="${stemTop + 28}" rx="14" ry="7" fill="${leafLight}" transform="rotate(35 115 ${stemTop + 28})"/>
      <circle cx="100" cy="${stemTop + 12}" r="14" fill="#d4a8a8" opacity="0.7"/>
      <circle cx="92" cy="${stemTop + 8}" r="8" fill="#b07878" opacity="0.8"/>
      <circle cx="108" cy="${stemTop + 8}" r="8" fill="#c49090" opacity="0.8"/>
      <circle cx="100" cy="${stemTop + 16}" r="8" fill="#b07878" opacity="0.7"/>
      <circle cx="100" cy="${stemTop + 10}" r="5" fill="#e0b87a" opacity="0.9"/>
    </g>`;
  } else if (i === 3) {
    // Thriving — full sunflower
    plant = `<g ${anim}>
      <line x1="100" y1="160" x2="100" y2="${stemTop + 18}" stroke="${stemColor}" stroke-width="4.5" stroke-linecap="round"/>
      <ellipse cx="82" cy="${stemTop + 42}" rx="16" ry="7" fill="${leafColor}" transform="rotate(-35 82 ${stemTop + 42})"/>
      <ellipse cx="118" cy="${stemTop + 35}" rx="16" ry="7" fill="${leafLight}" transform="rotate(35 118 ${stemTop + 35})"/>
      <ellipse cx="82" cy="${stemTop + 55}" rx="13" ry="6" fill="${leafLight}" transform="rotate(-45 82 ${stemTop + 55})"/>
      ${[0,45,90,135,180,225,270,315].map(a =>
        `<ellipse cx="100" cy="${stemTop + 5}" rx="5" ry="12" fill="#e0b87a" opacity="0.8" transform="rotate(${a} 100 ${stemTop + 14})"/>`
      ).join('')}
      <circle cx="100" cy="${stemTop + 14}" r="10" fill="#c9954a"/>
      <circle cx="100" cy="${stemTop + 14}" r="6" fill="#8a6530"/>
    </g>`;
  } else if (i === 4) {
    // Radiant — glowing bloom with sparkles
    plant = `<g ${anim}>
      <line x1="100" y1="160" x2="100" y2="${stemTop + 18}" stroke="${stemColor}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="78" cy="${stemTop + 42}" rx="18" ry="8" fill="${leafColor}" transform="rotate(-30 78 ${stemTop + 42})"/>
      <ellipse cx="122" cy="${stemTop + 35}" rx="18" ry="8" fill="${leafLight}" transform="rotate(30 122 ${stemTop + 35})"/>
      <ellipse cx="80" cy="${stemTop + 58}" rx="14" ry="6" fill="${leafLight}" transform="rotate(-45 80 ${stemTop + 58})"/>
      ${[0,36,72,108,144,180,216,252,288,324].map(a =>
        `<ellipse cx="100" cy="${stemTop + 2}" rx="6" ry="14" fill="#9ec4d8" opacity="0.7" transform="rotate(${a} 100 ${stemTop + 14})"/>`
      ).join('')}
      <circle cx="100" cy="${stemTop + 14}" r="11" fill="#6a9ab0" opacity="0.9"/>
      <circle cx="100" cy="${stemTop + 14}" r="6" fill="#e8f4f8"/>
      <circle cx="78" cy="${stemTop}" r="2" fill="#fff" opacity="0.7" class="sparkle"/>
      <circle cx="124" cy="${stemTop + 6}" r="1.5" fill="#fff" opacity="0.6" class="sparkle" style="animation-delay:0.5s"/>
      <circle cx="100" cy="${stemTop - 8}" r="2" fill="#fff" opacity="0.8" class="sparkle" style="animation-delay:1s"/>
    </g>`;
  } else {
    // Glowing — magnificent full bloom with golden glow
    plant = `<g ${anim}>
      <line x1="100" y1="160" x2="100" y2="${stemTop + 18}" stroke="${stemColor}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="75" cy="${stemTop + 45}" rx="20" ry="8" fill="${leafColor}" transform="rotate(-30 75 ${stemTop + 45})"/>
      <ellipse cx="125" cy="${stemTop + 38}" rx="20" ry="8" fill="${leafLight}" transform="rotate(30 125 ${stemTop + 38})"/>
      <ellipse cx="78" cy="${stemTop + 60}" rx="16" ry="7" fill="${leafLight}" transform="rotate(-45 78 ${stemTop + 60})"/>
      <ellipse cx="120" cy="${stemTop + 55}" rx="14" ry="6" fill="${leafColor}" transform="rotate(40 120 ${stemTop + 55})"/>
      <circle cx="100" cy="${stemTop + 14}" r="22" fill="#e0b87a" opacity="0.2" class="glow-pulse"/>
      ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a =>
        `<ellipse cx="100" cy="${stemTop}" rx="5" ry="14" fill="#e0b87a" opacity="0.8" transform="rotate(${a} 100 ${stemTop + 14})"/>`
      ).join('')}
      <circle cx="100" cy="${stemTop + 14}" r="12" fill="#c9954a"/>
      <circle cx="100" cy="${stemTop + 14}" r="7" fill="#e0b87a"/>
      ${[0,1,2,3,4].map(j => {
        const ax = 70 + j * 15 + (j % 2) * 5;
        const ay = stemTop - 5 + (j % 3) * 8;
        return `<circle cx="${ax}" cy="${ay}" r="${1.5 + (j % 2)}" fill="#fff" opacity="${0.5 + j * 0.1}" class="sparkle" style="animation-delay:${j * 0.4}s"/>`;
      }).join('')}
    </g>`;
  }

  return `<svg viewBox="30 40 140 190" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:200px;height:auto;display:block;margin:0 auto">
    ${plant}
    <path d="M72 160 L72 190 Q72 200 82 200 L118 200 Q128 200 128 190 L128 160 Z" fill="${potColor}"/>
    <path d="M68 155 L132 155 L128 165 L72 165 Z" fill="${potLight}"/>
    <ellipse cx="100" cy="162" rx="28" ry="5" fill="${soilColor}"/>
  </svg>`;
}

export function showLevelUp(oldLevel, newLevel) {
  haptic('heavy');
  playSound('milestone');

  const oldIdx = getLevelIndex(oldLevel);
  const newIdx = getLevelIndex(newLevel);

  const div = document.createElement('div');
  div.id = 'levelup-overlay';
  div.innerHTML = `
    <div class="levelup-card" style="max-width:320px">
      <div id="levelup-flower" style="margin-bottom:16px">
        ${buildFlowerSVG(oldIdx)}
      </div>
      <div style="font-family:Fraunces,serif;font-size:13px;color:var(--sage);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Level up!</div>
      <div style="font-family:Fraunces,serif;font-size:26px;font-weight:300;color:var(--cream);margin-bottom:8px">${newLevel.name} ${newLevel.emoji}</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px">Your bloom is growing. Keep nurturing it.</div>
      <button class="btn btn-primary btn-block" id="levelup-close">Keep blooming 🌿</button>
    </div>
  `;
  document.body.appendChild(div);

  // Animate: show old flower briefly, then grow to new
  setTimeout(() => {
    const container = document.getElementById('levelup-flower');
    if (container) {
      container.innerHTML = buildFlowerSVG(newIdx, true);
      launchConfetti(window.innerWidth / 2, window.innerHeight / 2, 60);
    }
  }, 800);

  document.getElementById('levelup-close').addEventListener('click', () => div.remove());
  setTimeout(() => { if (div.parentNode) div.remove(); }, 10000);
}

// ── Enhanced addXP with level-up check ──────────────────────
export function addXP(amount, sourceEl) {
  const oldXP = state.xpData.total || 0;
  state.xpData.total = oldXP + amount;
  saveState();
  if (sourceEl) showXPFloat(amount, sourceEl);
  checkLevelUp(oldXP, state.xpData.total);
  updateProgressTab();
}

// ── Water fill animation ─────────────────────────────────────
export function animateWaterBottle(index) {
  const bottles = document.querySelectorAll('.water-bottle');
  const bottle = bottles[index];
  if (!bottle) return;
  bottle.classList.add('filling');
  haptic('medium');
  setTimeout(() => bottle.classList.remove('filling'), 600);

  // Droplet splash particles
  const rect = bottle.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.4;
  for (let j = 0; j < 6; j++) {
    const drop = document.createElement('div');
    const angle = (Math.PI * 0.3) + (Math.random() * Math.PI * 0.4); // upward arc
    const dist = 15 + Math.random() * 25;
    const tx = Math.cos(angle) * dist * (Math.random() > 0.5 ? 1 : -1);
    const ty = -Math.sin(angle) * dist;
    drop.className = 'particle';
    const splashColor = (THEMES[state.prefs?.theme || 'forest'] || THEMES.forest).primaryLight;
    drop.style.cssText = `left:${cx}px;top:${cy}px;width:5px;height:5px;background:${splashColor};border-radius:50%;--particle-end:translate(${tx}px,${ty}px);animation-duration:0.5s`;
    document.body.appendChild(drop);
    setTimeout(() => drop.remove(), 600);
  }
}

// ── Mood bounce ──────────────────────────────────────────────
export function bounceMoodBtn(val) {
  const btns = document.querySelectorAll('.mood-btn');
  btns.forEach((btn, i) => {
    if (i === val) {
      btn.classList.remove('bounce');
      void btn.offsetWidth;
      btn.classList.add('bounce');
      setTimeout(() => btn.classList.remove('bounce'), 400);
    }
  });
}

// Note: updateProgressTab is defined later in the app and will be available
// at runtime. We reference it here; the caller must ensure it's in scope.
// In the monolith, it's a global function. During modularization, it may
// need to be passed in or imported from its own module.
function updateProgressTab() {
  if (typeof window.updateProgressTab === 'function') {
    window.updateProgressTab();
  }
}
