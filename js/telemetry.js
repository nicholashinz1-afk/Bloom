import { save as saveKey, load, today } from './storage.js';
import { VERSION } from './constants.js';
import { showToast } from './utils.js';

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
