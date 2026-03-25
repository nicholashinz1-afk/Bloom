import { save as saveKey, load } from './storage.js';
import { today } from './state.js';
import { VERSION } from './constants.js';
import { showToast } from './utils.js';

// Anonymous user ID for unique user counts (no PII — just a random token)
let _bloomUid = load('bloom_uid', null);
if (!_bloomUid) {
  _bloomUid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  saveKey('bloom_uid', _bloomUid);
}
export { _bloomUid };

export function sendTelemetry(type, data) {
  try {
    fetch('/api/diagnostics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data }),
    }).catch(() => {});
  } catch(e) {}
}

export function trackFeature(feature) { sendTelemetry('feature_use', { feature }); }
export function trackEvent(eventName, meta) { sendTelemetry(eventName, meta ? { meta } : {}); }

// ── API response time tracking ────────────────────────────
export async function timedFetch(url, options) {
  const start = performance.now();
  const endpoint = url.replace(/^\/api\//, '').split('?')[0];
  try {
    const res = await fetch(url, options);
    const duration = Math.round(performance.now() - start);
    sendTelemetry('api_timing', { meta: { endpoint, duration, status: res.status } });
    return res;
  } catch(err) {
    const duration = Math.round(performance.now() - start);
    sendTelemetry('api_timing', { meta: { endpoint, duration, status: 0, error: err.message?.slice(0, 100) } });
    throw err;
  }
}

// ── API health checks ─────────────────────────────────────
export async function runHealthChecks() {
  const endpoints = ['claude', 'buddy', 'wall', 'diagnostics'];
  const results = {};
  await Promise.all(endpoints.map(async (ep) => {
    try {
      const res = await fetch('/api/' + ep + '?check=health');
      results[ep] = await res.json();
    } catch(e) {
      results[ep] = { ok: false, service: ep, error: e.message };
    }
  }));
  sendTelemetry('health_check', { meta: results });
  return results;
}

// Run health check on session start (after a short delay to not block load)
setTimeout(() => runHealthChecks(), 5000);

// ── Error boundary wrapper ────────────────────────────────
export function errorBoundary(fn, context) {
  return function(...args) {
    try {
      const result = fn.apply(this, args);
      if (result && typeof result.catch === 'function') {
        return result.catch(err => {
          sendTelemetry('error_boundary', { meta: { context, message: String(err.message || err).slice(0, 300) } });
          throw err;
        });
      }
      return result;
    } catch(err) {
      sendTelemetry('error_boundary', { meta: { context, message: String(err.message || err).slice(0, 300) } });
      throw err;
    }
  };
}

// ── Session start diagnostics ─────────────────────────────
export function captureSessionDiagnostics() {
  // Delay to ensure both navigation metrics and IndexedDB are ready
  setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const sessionMeta = {
      loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      domReady: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
      returning: !!load('bloom_state', null),
      tabVisible: !document.hidden,
      online: navigator.onLine,
      idbAvailable: !!window._bloomDb,
    };
    sendTelemetry('session_diagnostics', { meta: sessionMeta });
  }, 5000);
}
captureSessionDiagnostics();

// ── Mood pattern tracking ─────────────────────────────────
export function trackMoodPattern(val) {
  const history = load('bloom_history', {});
  const recentDays = Object.keys(history).sort().slice(-7);
  const recentMoods = recentDays.map(d => history[d]?.mood).filter(m => m !== undefined && m >= 0);
  const meta = {
    current: val,
    recentAvg: recentMoods.length ? +(recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length).toFixed(1) : null,
    recentCount: recentMoods.length,
    trend: recentMoods.length >= 3 ? (recentMoods[recentMoods.length - 1] - recentMoods[0] > 0 ? 'improving' : recentMoods[recentMoods.length - 1] - recentMoods[0] < 0 ? 'declining' : 'stable') : 'insufficient_data',
    isLow: val >= 0 && val <= 1,
    isUnknown: val === -1,
  };
  sendTelemetry('mood_pattern', { meta });
}

// ── AI reflection journey tracking ────────────────────────
export function trackAIJourney(context, source) {
  // Access state lazily via late-bound reference to avoid circular imports
  const s = window._getBloomState?.() || {};
  sendTelemetry('ai_journey', { meta: { context, source, hasName: !!(s?.prefs?.name), hardDay: !!s?.hardDayMode } });
}

window.onerror = function(message, source, lineno, colno, error) {
  const errLog = load('bloom_error_log', []);
  errLog.push({ message: String(message).slice(0, 300), url: source, line: lineno, ts: Date.now() });
  if (errLog.length > 50) errLog.splice(0, errLog.length - 50);
  saveKey('bloom_error_log', errLog);
  sendTelemetry('error', {
    message: String(message).slice(0, 300),
    stack: error?.stack ? String(error.stack).slice(0, 500) : '',
    url: source ? String(source).slice(0, 200) : '',
  });
};

window.addEventListener('unhandledrejection', function(event) {
  const msg = event.reason?.message || String(event.reason).slice(0, 300);
  const errLog = load('bloom_error_log', []);
  errLog.push({ message: 'Unhandled promise: ' + msg, ts: Date.now() });
  if (errLog.length > 50) errLog.splice(0, errLog.length - 50);
  saveKey('bloom_error_log', errLog);
  sendTelemetry('error', { message: 'Unhandled promise: ' + msg, stack: event.reason?.stack ? String(event.reason.stack).slice(0, 500) : '' });
});

export function exportDiagnostics() {
  const diag = {
    exported: new Date().toISOString(), version: VERSION,
    userAgent: navigator.userAgent, platform: navigator.platform,
    screen: { w: screen.width, h: screen.height },
    safari: typeof isSafariBrowser === 'function' ? isSafariBrowser() : false,
    errors: load('bloom_error_log', []),
    aiFeedback: load('bloom_ai_feedback', []),
    historyDays: Object.keys(load('bloom_history', {})).length,
    buddyPaired: (load('bloom_buddy_state', {})).status === 'paired',
  };
  if (navigator.storage?.estimate) {
    navigator.storage.estimate().then(est => {
      diag.storageEstimate = { usage: est.usage, quota: est.quota };
      _dlDiag(diag);
    }).catch(() => _dlDiag(diag));
  } else { _dlDiag(diag); }
}
function _dlDiag(d) {
  const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = `bloom-diagnostics-${today()}.json`; a.click();
  URL.revokeObjectURL(u); showToast('Diagnostics exported!');
}

// Attach to window for HTML onclick access
window.exportDiagnostics = exportDiagnostics;
