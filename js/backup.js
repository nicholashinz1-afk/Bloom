import { state, today, saveState, loadState } from './state.js';
import { save, load } from './storage.js';
import { haptic } from './utils.js';
import { sendTelemetry, trackEvent } from './telemetry.js';
import { VERSION } from './constants.js';
import { openSheet } from './sheets.js';

export async function showBackupSheet() {
  openSheet('backup-sheet');
  await generateBackupLink();
  trackEvent('backup_created');
}
window.showBackupSheet = showBackupSheet;

// ── Backup encryption helpers (AES-GCM via Web Crypto) ────
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  // Combine salt + iv + ciphertext into one base64 string
  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encoded, passphrase) {
  const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ciphertext = raw.slice(28);
  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

// Simple compression using built-in CompressionStream API (gzip)
async function compressString(str) {
  try {
    const blob = new Blob([str]);
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = await new Response(stream).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
  } catch(e) {
    // Fallback: uncompressed base64
    return btoa(encodeURIComponent(str));
  }
}

async function decompressString(b64) {
  try {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const blob = new Blob([raw]);
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch(e) {
    // Fallback: try uncompressed base64
    return decodeURIComponent(atob(b64));
  }
}

export async function generateBackupLink() {
  try {
    const data = {
      prefs: load('bloom_prefs'),
      xp: load('bloom_xp'),
      history: load('bloom_history'),
      wellness: load('bloom_wellness'),
    };
    const jsonStr = JSON.stringify(data);
    const encoded = await compressString(jsonStr);
    const url = `${location.origin}${location.pathname}?restore=${encoded}`;
    if (url.length > 16000) {
      // URL too long even after compression — warn user
      const el = document.getElementById('backup-url-display');
      if (el) el.textContent = 'Your data is too large for a URL link. Use the encrypted backup export instead.';
      return;
    }
    const el = document.getElementById('backup-url-display');
    if (el) el.textContent = url;
    state._backupURL = url;
  } catch(e) {
    const el = document.getElementById('backup-url-display');
    if (el) el.textContent = 'Could not generate link — data may be too large. Use encrypted export instead.';
  }
}
window.generateBackupLink = generateBackupLink;

export function copyBackupLink() {
  if (state._backupURL) {
    navigator.clipboard?.writeText(state._backupURL).then(() => {
      const btn = event.target;
      btn.textContent = 'Copied! ✓';
      setTimeout(() => { btn.textContent = 'Copy link'; }, 2000);
    }).catch(() => alert('Copy this link:\n\n' + state._backupURL));
  }
}
window.copyBackupLink = copyBackupLink;

export async function exportEncryptedJSON() {
  const passphrase = prompt('Choose a passphrase to encrypt your backup.\n\nYou will need this passphrase to restore your data. Keep it safe!');
  if (!passphrase) return;
  if (passphrase.length < 4) { alert('Passphrase must be at least 4 characters.'); return; }

  const data = {
    version: VERSION,
    exported: new Date().toISOString(),
    prefs: load('bloom_prefs'),
    xp: load('bloom_xp'),
    today: load('bloom_today_' + today()),
    history: load('bloom_history'),
    wellness: load('bloom_wellness'),
  };

  try {
    const encrypted = await encryptData(data, passphrase);
    const wrapper = { bloom_encrypted: true, data: encrypted };
    const blob = new Blob([JSON.stringify(wrapper)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bloom-encrypted-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Encrypted backup saved!');
  } catch(e) {
    alert('Encryption failed. Try again or use the unencrypted export.');
  }
}
window.exportEncryptedJSON = exportEncryptedJSON;

export function exportJSON() {
  const data = {
    version: VERSION,
    exported: new Date().toISOString(),
    prefs: load('bloom_prefs'),
    xp: load('bloom_xp'),
    today: load('bloom_today_' + today()),
    history: load('bloom_history'),
    wellness: load('bloom_wellness'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bloom-export-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
window.exportJSON = exportJSON;

export function exportCSV() {
  const history = load('bloom_history') || {};
  const dates = Object.keys(history).sort();
  if (dates.length === 0) { showToast('No history data to export yet.'); return; }

  // Build CSV rows
  const rows = [['Date', 'Mood', 'Water (glasses)', 'Meals', 'Habits Completed', 'Total Habits', 'Journal Entry']];
  dates.forEach(date => {
    const day = history[date] || {};
    const mood = day.mood || '';
    const water = day.water || 0;
    const meals = day.meals || 0;
    const habitsCompleted = day.habitsCompleted || 0;
    const totalHabits = day.totalHabits || 0;
    const journal = (day.journal || '').replace(/"/g, '""').replace(/\n/g, ' ');
    rows.push([date, mood, water, meals, habitsCompleted, totalHabits, `"${journal}"`]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bloom-history-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!');
}
window.exportCSV = exportCSV;

export function exportTherapistPDF() {
  const history = load('bloom_history') || {};
  const dates = Object.keys(history).sort();
  if (dates.length === 0) { showToast('No history data to export yet.'); return; }

  const name = state.prefs?.name || 'User';
  const last30 = dates.slice(-30);
  const moodLabels = ['Low', 'Rough', 'Okay', 'Good', 'Great'];

  // Build mood data for chart
  const moodData = last30.map(d => {
    const day = history[d] || {};
    return { date: d, mood: day.mood, sleep: day.sleep };
  });

  // Calculate summary stats
  const moodsRecorded = moodData.filter(d => d.mood !== undefined && d.mood >= 0);
  const avgMood = moodsRecorded.length > 0 ? (moodsRecorded.reduce((s, d) => s + d.mood, 0) / moodsRecorded.length) : null;
  const lowDays = moodsRecorded.filter(d => d.mood <= 1).length;
  const journalDays = last30.filter(d => {
    const wd = state.wellnessData?.journal?.[d];
    return wd && wd.text;
  }).length;

  // Build simple text-based mood chart
  const chartRows = moodData.map(d => {
    const mStr = d.mood !== undefined && d.mood >= 0 ? moodLabels[d.mood] : '—';
    const bar = d.mood !== undefined && d.mood >= 0 ? '█'.repeat(d.mood + 1) + '░'.repeat(4 - d.mood) : '     ';
    return `${d.date}  ${bar}  ${mStr}`;
  }).join('\n');

  // Collect feeling words frequency
  const feelingCounts = {};
  last30.forEach(d => {
    const day = history[d];
    if (day?.feelings) day.feelings.forEach(f => { feelingCounts[f] = (feelingCounts[f] || 0) + 1; });
  });
  const topFeelings = Object.entries(feelingCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Build report
  const report = `
BLOOM — WELLNESS REPORT FOR THERAPIST/COUNSELOR
Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Name: ${name}
Period: ${last30[0] || '—'} to ${last30[last30.length - 1] || '—'} (${last30.length} days)

NOTE: This report was generated by bloom, a self-care companion app.
bloom is not a clinical tool. This data reflects self-reported mood and
habit tracking, not clinical assessments. It is provided to support
conversations with a licensed mental health professional.

═══════════════════════════════════════════════════════
 MOOD SUMMARY
═══════════════════════════════════════════════════════

Average mood: ${avgMood !== null ? avgMood.toFixed(1) + '/4 (' + moodLabels[Math.round(avgMood)] + ')' : 'No data'}
Days recorded: ${moodsRecorded.length} of ${last30.length}
Low/Rough days: ${lowDays} (${moodsRecorded.length > 0 ? Math.round(lowDays / moodsRecorded.length * 100) : 0}%)
Journal entries: ${journalDays}

${topFeelings.length > 0 ? `Most reported feelings:\n${topFeelings.map(([f, c]) => `  • ${f} (${c} days)`).join('\n')}` : ''}

═══════════════════════════════════════════════════════
 DAILY MOOD LOG (Last ${last30.length} days)
═══════════════════════════════════════════════════════
Scale: Low(0) → Great(4)

${chartRows}

═══════════════════════════════════════════════════════
 HABIT COMPLETION
═══════════════════════════════════════════════════════

${last30.map(d => {
  const day = history[d] || {};
  const habits = Object.keys(day).filter(k => (k.startsWith('m_') || k.startsWith('e_') || k.startsWith('w_')) && day[k] === true);
  return `${d}: ${habits.length} habit${habits.length !== 1 ? 's' : ''} completed`;
}).join('\n')}

═══════════════════════════════════════════════════════
 JOURNAL EXCERPTS (Last 30 days)
═══════════════════════════════════════════════════════

${last30.map(d => {
  const entry = state.wellnessData?.journal?.[d];
  if (!entry || !entry.text) return null;
  return `[${d}]\n${entry.text.slice(0, 300)}${entry.text.length > 300 ? '...' : ''}\n`;
}).filter(Boolean).join('\n') || 'No journal entries in this period.'}

═══════════════════════════════════════════════════════

This report is for informational purposes only and should be
interpreted in context of a therapeutic conversation. The mood
scale is subjective and self-reported.

Generated by bloom (bloomhabits.app)
`.trim();

  // Download as text file (universally readable, no dependencies)
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bloom-therapist-report-${today()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Therapist report exported!');
}
window.exportTherapistPDF = exportTherapistPDF;

export async function importJSON(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  // Check if it's an encrypted backup
  if (parsed.bloom_encrypted) {
    const passphrase = prompt('This backup is encrypted. Enter your passphrase to restore:');
    if (!passphrase) return false;
    try {
      const data = await decryptData(parsed.data, passphrase);
      applyRestoreData(data);
      showToast('Encrypted backup restored!');
      return true;
    } catch(e) {
      alert('Wrong passphrase or corrupted backup. Please try again.');
      return false;
    }
  }

  // Unencrypted backup
  applyRestoreData(parsed);
  return true;
}
window.importJSON = importJSON;

export function applyRestoreData(data) {
  if (data.prefs) save('bloom_prefs', data.prefs);
  if (data.xp) save('bloom_xp', data.xp);
  if (data.today) save('bloom_today_' + today(), data.today);
  if (data.history) save('bloom_history', data.history);
  if (data.wellness) save('bloom_wellness', data.wellness);
}

export async function tryRestoreFromURL() {
  const params = new URLSearchParams(location.search);
  const encoded = params.get('restore');
  if (!encoded) return false;
  try {
    // Try compressed format first, fall back to legacy uncompressed
    const jsonStr = await decompressString(encoded);
    const data = JSON.parse(jsonStr);
    applyRestoreData(data);
    history.replaceState({}, '', location.pathname);
    return true;
  } catch(e) { return false; }
}
