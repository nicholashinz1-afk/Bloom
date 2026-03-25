// Bloom storage — localStorage wrappers + IndexedDB mirror
import { state } from './state.js';
import { haptic } from './utils.js';

const DB_NAME = 'bloom_db';
const DB_VERSION = 1;
let db = null;

function initDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('kv')) {
          d.createObjectStore('kv', { keyPath: 'k' });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(); };
      req.onerror = () => resolve();
    } catch(e) { resolve(); }
  });
}

async function dbSet(key, value) {
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ k: key, v: value });
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    } catch(e) { resolve(); }
  });
}

async function dbGet(key) {
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.v : null);
      req.onerror = () => resolve(null);
    } catch(e) { resolve(null); }
  });
}

async function dbGetAll() {
  if (!db) return {};
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').getAll();
      req.onsuccess = () => {
        const out = {};
        (req.result || []).forEach(r => { out[r.k] = r.v; });
        resolve(out);
      };
      req.onerror = () => resolve({});
    } catch(e) { resolve({}); }
  });
}

function save(key, value) {
  const str = JSON.stringify(value);
  try { localStorage.setItem(key, str); } catch(e) {
    // Quota exceeded — show warning
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      if (!state._storageWarningShown) {
        state._storageWarningShown = true;
        setTimeout(() => showStorageWarning(), 500);
      }
    }
  }
  dbSet(key, str);
}

function showStorageWarning() {
  const existing = document.getElementById('storage-warning');
  if (existing) return;
  const div = document.createElement('div');
  div.id = 'storage-warning';
  div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999;max-width:360px;padding:16px 20px;background:rgba(201,149,74,0.15);border:1px solid rgba(201,149,74,0.4);border-radius:var(--r-lg);backdrop-filter:blur(10px)';
  div.innerHTML = `
    <div style="font-size:14px;font-weight:500;color:var(--amber-light);margin-bottom:6px">Storage almost full</div>
    <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">Your data is getting close to the storage limit. Consider creating a backup in Settings.</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="trimHistory();this.parentElement.parentElement.remove()" style="background:rgba(201,149,74,0.2);border:1px solid rgba(201,149,74,0.4);color:var(--amber-light)">Auto-trim old data</button>
      <button class="btn btn-ghost btn-sm" onclick="this.parentElement.parentElement.remove()">Dismiss</button>
    </div>`;
  document.body.appendChild(div);
}

function trimHistory() {
  const history = state.historyData;
  const dates = Object.keys(history).sort();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  let trimmed = 0;
  dates.forEach(d => {
    if (d < cutoffStr) { delete history[d]; trimmed++; }
  });
  if (trimmed > 0) {
    save('bloom_history', history);
    haptic('medium');
  }
}

function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      if (quota && usage / quota > 0.8) {
        showStorageWarning();
      }
    });
  }
  // Also auto-trim history beyond 90 days on every boot
  const history = state.historyData;
  if (history) {
    const dates = Object.keys(history).sort();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    let trimmed = 0;
    dates.forEach(d => {
      if (d < cutoffStr) { delete history[d]; trimmed++; }
    });
    if (trimmed > 0) save('bloom_history', history);
  }
}

function load(key, def = null) {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return JSON.parse(v);
  } catch(e) {}
  return def;
}

async function restoreFromDB() {
  const all = await dbGetAll();
  for (const [k, v] of Object.entries(all)) {
    try {
      if (localStorage.getItem(k) === null) {
        localStorage.setItem(k, v);
      }
    } catch(e) {}
  }
}


export { initDB, dbSet, dbGet, dbGetAll, save, load, showStorageWarning, trimHistory, checkStorageQuota, restoreFromDB };
window.trimHistory = trimHistory;
window.showStorageWarning = showStorageWarning;
