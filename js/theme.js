import { state } from './state.js';
import { save } from './storage.js';
import { bloomIcon } from './icons.js';
function renderSettingsTab(...args) { return window.renderSettingsTab?.(...args); }
function getSeasonalAccent() {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return { name: 'spring', color: '#a8c5ab', hint: 'rgba(168,197,171,0.08)' };
  if (month >= 5 && month <= 7) return { name: 'summer', color: '#e0b87a', hint: 'rgba(224,184,122,0.08)' };
  if (month >= 8 && month <= 10) return { name: 'autumn', color: '#c9954a', hint: 'rgba(201,149,74,0.08)' };
  return { name: 'winter', color: '#9ec4d8', hint: 'rgba(158,196,216,0.08)' };
}

function applySeasonalTheme() {
  const season = getSeasonalAccent();
  document.documentElement.style.setProperty('--seasonal', season.color);
  document.documentElement.style.setProperty('--seasonal-hint', season.hint);
}

// ============================================================
//  COLOR THEMES
// ============================================================
const THEMES = {
  forest: {
    name: 'Forest', emoji: '🌿', description: 'Deep green, grounded',
    bg: '#0d1610', bgMid: '#111a13', bgCard: '#162019', bgElevated: '#1c2a1f',
    bgOverlay: 'rgba(13,22,16,0.93)',
    primary: '#7a9e7e', primaryLight: '#a8c5ab', primaryDim: '#2e4d32',
    textSecondary: '#8a9e8c', textMuted: '#4a5e4c', seasonal: '#a8c5ab',
    accent: 'linear-gradient(90deg, #1a2e1c, #4a7a4e, #7a9e7e, #4a7a4e, #1a2e1c)',
    confetti: ['#7a9e7e','#a8c5ab','#5c8a60','#c8deca','#e8e0d0'],
  },
  ocean: {
    name: 'Ocean', emoji: '🌊', description: 'Deep blue, calm',
    bg: '#0d1318', bgMid: '#101820', bgCard: '#141e28', bgElevated: '#1a2838',
    bgOverlay: 'rgba(13,19,24,0.93)',
    primary: '#6a9ab0', primaryLight: '#9ec4d8', primaryDim: '#1a3a50',
    textSecondary: '#88aec0', textMuted: '#4e6e80', seasonal: '#9ec4d8',
    accent: 'linear-gradient(90deg, #0d1a28, #3a6a80, #6a9ab0, #3a6a80, #0d1a28)',
    confetti: ['#6a9ab0','#9ec4d8','#4a7a90','#b8dae8','#e8e0d0'],
  },
  rose: {
    name: 'Rose', emoji: '🌸', description: 'Warm mauve, soft',
    bg: '#180d10', bgMid: '#201015', bgCard: '#281418', bgElevated: '#341820',
    bgOverlay: 'rgba(24,13,16,0.93)',
    primary: '#b07878', primaryLight: '#d4a8a8', primaryDim: '#4a2030',
    textSecondary: '#c09898', textMuted: '#7a5060', seasonal: '#d4a8a8',
    accent: 'linear-gradient(90deg, #2a1418, #804858, #b07878, #804858, #2a1418)',
    confetti: ['#b07878','#d4a8a8','#c89090','#e8c8c8','#e8e0d0'],
  },
  amber: {
    name: 'Amber', emoji: '🌅', description: 'Warm gold, cozy',
    bg: '#180f08', bgMid: '#20130a', bgCard: '#28180c', bgElevated: '#342010',
    bgOverlay: 'rgba(24,15,8,0.93)',
    primary: '#c9954a', primaryLight: '#e0b87a', primaryDim: '#5c3f1a',
    textSecondary: '#c0a070', textMuted: '#785838', seasonal: '#e0b87a',
    accent: 'linear-gradient(90deg, #281a0a, #8a6530, #c9954a, #8a6530, #281a0a)',
    confetti: ['#c9954a','#e0b87a','#a87830','#f0d8a0','#e8e0d0'],
  },
  pastel: {
    name: 'Pastel', emoji: '🧸', description: 'Soft, gentle, quiet',
    bg: '#1a1a22', bgMid: '#1e1e28', bgCard: '#24242e', bgElevated: '#2c2c38',
    bgOverlay: 'rgba(26,26,34,0.93)',
    primary: '#b5a8c8', primaryLight: '#d4c8e8', primaryDim: '#3e3650',
    textSecondary: '#b0a8c0', textMuted: '#686080', seasonal: '#d4c8e8',
    accent: 'linear-gradient(90deg, #22202e, #7a6e98, #b5a8c8, #7a6e98, #22202e)',
    confetti: ['#b5a8c8','#d4c8e8','#9888b8','#e0d8f0','#e8e0d0'],
  },
  pride: {
    name: 'Pride', emoji: '🏳️‍🌈', description: 'Warm, inclusive, radiant',
    bg: '#12101a', bgMid: '#161420', bgCard: '#1c1a28', bgElevated: '#242232',
    bgOverlay: 'rgba(18,16,26,0.93)',
    primary: '#c8a0d8', primaryLight: '#e0c0f0', primaryDim: '#3e2850',
    textSecondary: '#c0a8d0', textMuted: '#6a5880', seasonal: '#e0c0f0',
    pride: true,
    accent: 'linear-gradient(90deg, #e04050, #e87030, #e8c840, #50b868, #4080d0, #9050c8)',
    confetti: ['#e04050','#e87030','#e8c840','#50b868','#4080d0','#9050c8'],
  },
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)].join(',');
}

function applyTheme(themeKey) {
  const t = THEMES[themeKey] || THEMES.forest;
  const r = document.documentElement.style;
  r.setProperty('--bg',             t.bg);
  r.setProperty('--bg-mid',         t.bgMid);
  r.setProperty('--bg-card',        t.bgCard);
  r.setProperty('--bg-elevated',    t.bgElevated);
  r.setProperty('--bg-overlay',     t.bgOverlay);
  r.setProperty('--sage',           t.primary);
  r.setProperty('--sage-light',     t.primaryLight);
  r.setProperty('--sage-dim',       t.primaryDim);
  r.setProperty('--sage-rgb',       hexToRgb(t.primary));
  r.setProperty('--sage-light-rgb', hexToRgb(t.primaryLight));
  r.setProperty('--text-secondary', t.textSecondary);
  r.setProperty('--text-muted',     t.textMuted);
  r.setProperty('--seasonal',       t.seasonal);
  r.setProperty('--pride-active',   t.pride ? '1' : '0');
  r.setProperty('--theme-accent',   t.accent);
  r.setProperty('--theme-accent-height', t.pride ? '3px' : '2px');
  document.body.style.background = t.bg;
  // Set theme class on body for per-theme CSS signatures
  document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
  document.body.classList.add('theme-' + themeKey);
}

function initTheme() {
  applyTheme(state.prefs?.theme || 'forest');
}

function setTheme(key) {
  if (!state.prefs) state.prefs = {};
  state.prefs.theme = key;
  save('bloom_prefs', state.prefs);
  applyTheme(key);
  const headerIcon = document.getElementById('header-bloom-icon');
  if (headerIcon) headerIcon.innerHTML = bloomIcon(26);
  const navIcon = document.getElementById('nav-today-icon');
  if (navIcon) navIcon.innerHTML = bloomIcon(20);
  renderSettingsTab();
  // Keep settings section open
  setTimeout(() => {
    const sh = document.getElementById('sh-appearance');
    const sb = document.getElementById('sb-appearance');
    if (sh && sb) { sh.classList.add('open'); sb.classList.add('open'); }
  }, 50);
}

// ============================================================
//  DAILY AFFIRMATION
// ============================================================

export { getSeasonalAccent, applySeasonalTheme, THEMES, hexToRgb, applyTheme, initTheme, setTheme };
window.setTheme = setTheme;
