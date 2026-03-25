// Bloom UI — ripple, confetti, stagger animations
import { state } from './state.js';
import { THEMES } from './theme.js';

function addRipple(el, e) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = (e?.clientX ?? rect.left + rect.width/2) - rect.left;
  const y = (e?.clientY ?? rect.top + rect.height/2) - rect.top;
  const size = Math.max(rect.width, rect.height);
  const r = document.createElement('span');
  r.className = 'ripple';
  r.style.cssText = `width:${size}px;height:${size}px;left:${x - size/2}px;top:${y - size/2}px`;
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ── Confetti burst ───────────────────────────────────────────
function launchConfetti(cx, cy, count = 40) {
  const themeKey = state.prefs?.theme || 'forest';
  const colors = (THEMES[themeKey] || THEMES.forest).confetti;
  const shapes = ['2px','50%','0'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 160;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 60;
    const rot = (Math.random() - 0.5) * 720;
    const dur = 0.8 + Math.random() * 0.6;
    const delay = Math.random() * 0.2;
    p.style.cssText = `
      left:${cx-4}px;top:${cy-4}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      --tx:${tx}px;--ty:${ty}px;--rot:${rot}deg;
      --dur:${dur}s;--delay:${delay}s;
      --shape:${shapes[Math.floor(Math.random()*shapes.length)]};
      width:${5+Math.random()*6}px;height:${5+Math.random()*6}px;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), (dur + delay) * 1000 + 100);
  }
}

// ── Stagger card entrance animations ────────────────────────
function staggerCards(panel) {
  if (!panel) return;
  const cards = panel.querySelectorAll('.card, .insight-card, .history-day');
  cards.forEach((c, i) => {
    c.style.animationDelay = `${i * 40}ms`;
    c.classList.remove('card-enter');
    void c.offsetWidth; // reflow
    c.classList.add('card-enter');
  });
}

export { addRipple, launchConfetti, staggerCards };
