// Bloom buddy — peer-to-peer mutual support system (client-side)
import { state, today } from '../state.js';
import { save, load } from '../storage.js';
import { haptic, escapeHtml } from '../utils.js';
import { bloomIcon, buddyIcon } from '../icons.js';
import { sendTelemetry, trackFeature } from '../telemetry.js';
import { addXP } from '../xp.js';
import { openSheet, closeAllSheets } from '../sheets.js';

// Late-bound cross-module references (avoid circular imports)
function switchTab(...args) { return window.switchTab?.(...args); }
function openCrisisSheet(...args) { return window.openCrisisSheet?.(...args); }

let bloomBuddyId = load('bloom_buddy_id', null);
// Generate buddy ID immediately so it shows in Settings
if (!bloomBuddyId) {
  bloomBuddyId = 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  save('bloom_buddy_id', bloomBuddyId);
}
let buddyState = load('bloom_buddy_state', { status: 'none' }); // none | searching | paired
let buddyCachedBuddies = load('bloom_buddy_list', []); // array of buddy objects
let buddyCachedMessages = {}; // keyed by pairId
let buddyLoading = false;
let buddyPollTimer = null;
let buddySyncDebounce = null;

function ensureBuddyId() {
  if (!bloomBuddyId) {
    bloomBuddyId = 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    save('bloom_buddy_id', bloomBuddyId);
  }
  return bloomBuddyId;
}

function getBuddyDisplayName() {
  return state.prefs?.name || '';
}

function getHabitPct() {
  const { pct } = getCompletionRate();
  return Math.round(pct * 100);
}

// ── Buddy API helpers ─────────────────────────────────────
async function buddyApi(payload) {
  try {
    const res = await fetch('/api/buddy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch(e) {
    return { ok: false, reason: 'network' };
  }
}

async function syncBuddyStatus() {
  if (buddyState.status !== 'paired' && buddyState.status !== 'searching') return;
  const id = ensureBuddyId();
  const playerId = load('bloom_onesignal_pid', null);
  const shareMood = state.prefs?.buddyShareMood !== false;
  await buddyApi({
    action: 'sync',
    buddyId: id,
    mood: shareMood ? state.todayData?.mood : undefined,
    streak: state.xpData?.streak || 0,
    habitPct: getHabitPct(),
    oneSignalId: playerId,
  });
  // Also keep register up to date with name/playerId
  await buddyApi({
    action: 'register',
    buddyId: id,
    name: getBuddyDisplayName(),
    oneSignalId: playerId,
  });
}

function scheduleBuddySync() {
  if (buddySyncDebounce) return;
  buddySyncDebounce = setTimeout(() => {
    buddySyncDebounce = null;
    syncBuddyStatus();
  }, 3000);
}

async function fetchBuddyData() {
  if (buddyLoading) return;
  buddyLoading = true;
  const data = await buddyApi({ action: 'get-buddy', buddyId: ensureBuddyId() });
  buddyLoading = false;
  if (data.ok && data.paired) {
    buddyState = { status: 'paired' };
    buddyCachedBuddies = data.buddies || [];
    save('bloom_buddy_state', buddyState);
    save('bloom_buddy_list', buddyCachedBuddies);
    renderBuddyContent();
  } else if (data.ok && !data.paired) {
    if (buddyState.status === 'paired') {
      buddyState = { status: 'none' };
      buddyCachedBuddies = [];
      buddyCachedMessages = {};
      save('bloom_buddy_state', buddyState);
      save('bloom_buddy_list', []);
      renderBuddyContent();
    }
  }
}

async function fetchBuddyMessages(pairId) {
  const data = await buddyApi({ action: 'get-messages', buddyId: ensureBuddyId(), pairId });
  if (data.ok) {
    buddyCachedMessages[pairId] = data.messages || [];
    renderBuddyMessagesForPair(pairId);
    updateBuddyNavBadge();
  }
}

function updateBuddyNavBadge() {
  const navBtn = document.getElementById('nav-community');
  if (!navBtn) return;
  // Remove existing badge
  const existing = navBtn.querySelector('.buddy-nav-badge');
  if (existing) existing.remove();
  // Count total unread across all buddies
  let total = 0;
  buddyCachedBuddies.forEach(b => { total += getBuddyUnreadCount(b.pairId); });
  if (total > 0) {
    const badge = document.createElement('span');
    badge.className = 'buddy-nav-badge';
    badge.style.cssText = 'position:absolute;top:2px;right:50%;transform:translateX(12px);min-width:16px;height:16px;background:var(--sage);color:var(--bg);font-size:10px;font-weight:600;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 4px;pointer-events:none';
    badge.textContent = total;
    navBtn.style.position = 'relative';
    navBtn.appendChild(badge);
  }
}

function startBuddyPolling() {
  stopBuddyPolling();
  if (buddyState.status === 'paired') {
    buddyPollTimer = setInterval(() => {
      fetchBuddyData();
      fetchBuddyMessages();
    }, 300000); // 5 minutes
  } else if (buddyState.status === 'searching') {
    buddyPollTimer = setInterval(() => {
      fetchBuddyData(); // check if matched
    }, 30000); // 30 seconds while searching
  }
}

function stopBuddyPolling() {
  if (buddyPollTimer) { clearInterval(buddyPollTimer); buddyPollTimer = null; }
}

// ── Buddy actions ─────────────────────────────────────────
async function buddyRegisterAndSync() {
  const id = ensureBuddyId();
  const playerId = load('bloom_onesignal_pid', null);
  await buddyApi({
    action: 'register',
    buddyId: id,
    name: getBuddyDisplayName(),
    oneSignalId: playerId,
  });
}

async function buddyCreateInvite() {
  await buddyRegisterAndSync();
  const data = await buddyApi({ action: 'create-invite', buddyId: ensureBuddyId() });
  if (data.ok) {
    save('bloom_buddy_invite', data.code);
    renderBuddyInviteView(data.code);
  } else if (data.reason === 'already-paired') {
    buddyState = { status: 'paired' };
    save('bloom_buddy_state', buddyState);
    fetchBuddyData();
  }
}

async function buddyAcceptInvite(code) {
  if (!code || code.length < 4) return;
  await buddyRegisterAndSync();
  const data = await buddyApi({
    action: 'accept-invite',
    buddyId: ensureBuddyId(),
    code: code.toUpperCase().trim(),
  });
  if (data.ok) {
    buddyState = { status: 'paired' };
    save('bloom_buddy_state', buddyState);
    haptic('medium');
    switchTab('community');
    fetchBuddyData();
    showBuddyStatus('You\'re paired! Say hi to your new buddy.', 'var(--sage)');
  } else {
    const reasons = {
      'invalid': 'That code doesn\u2019t seem right. Double-check and try again?',
      'expired': 'This invite has expired. Ask your buddy for a new one.',
      'self-pair': 'That\u2019s your own invite code!',
      'max-buddies': 'You\u2019ve reached the buddy limit.',
      'inviter-max-buddies': 'The person who sent this has reached their buddy limit.',
      'already-buddies': 'You\u2019re already buddies with this person!',
    };
    showBuddyStatus(reasons[data.reason] || 'Something went wrong.', 'var(--amber)');
  }
}

async function buddyFindMatch(prefs) {
  await buddyRegisterAndSync();
  const data = await buddyApi({
    action: 'find-match',
    buddyId: ensureBuddyId(),
    prefs,
  });
  if (data.ok && data.matched) {
    buddyState = { status: 'paired' };
    save('bloom_buddy_state', buddyState);
    haptic('medium');
    closeAllSheets();
    fetchBuddyData();
  } else if (data.ok && data.queued) {
    buddyState = { status: 'searching' };
    save('bloom_buddy_state', buddyState);
    closeAllSheets();
    renderBuddyContent();
    startBuddyPolling();
  }
}

async function buddyCancelSearch() {
  await buddyApi({ action: 'cancel-search', buddyId: ensureBuddyId() });
  buddyState = { status: 'none' };
  save('bloom_buddy_state', buddyState);
  stopBuddyPolling();
  renderBuddyContent();
}

function checkBuddyMessageSafety(text) {
  // Warn about sharing personal info — high-confidence matches get a stronger warning
  const highConfidence = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // US phone numbers
    /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}\b/, // international phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // emails
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, // SSN pattern
  ];
  const mediumConfidence = [
    /\b\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|dr|drive|blvd|ln|lane|ct|court|way|pl|place)\b/i, // addresses
    /\b(instagram|snapchat|tiktok|discord|telegram|whatsapp|ig|snap|twitter|x\.com|reddit)\s*[:@]?\s*\w+/i, // social handles
    /\b@\w{2,30}\b/, // generic @handle
  ];

  for (const p of highConfidence) {
    if (p.test(text)) return { level: 'high', msg: 'This looks like it contains personal info (phone number, email, or ID). Sharing personal details with someone you don\'t know can be unsafe.' };
  }
  for (const p of mediumConfidence) {
    if (p.test(text)) return { level: 'medium', msg: 'This looks like it might contain personal info (address or social handle). bloom buddy is safer without sharing personal details.' };
  }
  return null;
}

async function buddySendMessage(pairId) {
  const input = document.getElementById('buddy-input-' + pairId);
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();

  // Client-side safety check for personal information
  const warning = checkBuddyMessageSafety(text);
  if (warning) {
    if (warning.level === 'high') {
      // Two-step confirmation for high-confidence personal info
      if (!confirm(warning.msg + '\n\nAre you sure you want to share this?')) return;
      if (!confirm('Just to be safe — you\'re sharing what looks like personal info with someone you may not know. Confirm one more time to send.')) return;
    } else {
      if (!confirm(warning.msg + '\n\nSend anyway?')) return;
    }
  }

  const data = await buddyApi({
    action: 'send-message',
    buddyId: ensureBuddyId(),
    pairId,
    text,
  });

  if (data.ok) {
    input.value = '';
    if (!buddyCachedMessages[pairId]) buddyCachedMessages[pairId] = [];
    buddyCachedMessages[pairId].push(data.message);
    if (buddyCachedMessages[pairId].length > 50) buddyCachedMessages[pairId] = buddyCachedMessages[pairId].slice(-50);
    renderBuddyMessagesForPair(pairId);
    haptic('light');
    // If self-harm language detected, gently surface crisis resources
    if (data.flag === 'self-harm') openCrisisSheet();
  } else {
    const reasons = {
      'rate-limit': 'Easy there! Try again in a bit.',
      'harmful': 'Let\u2019s keep things gentle. Try rephrasing?',
      'filtered': 'Some words aren\u2019t allowed. Try rephrasing?',
      'not-paired': 'You\u2019re not paired with a buddy.',
    };
    showBuddyStatusForPair(pairId, reasons[data.reason] || 'Couldn\u2019t send. Try again?', 'var(--amber)');
  }
}

async function buddySendNudge(nudgeType, pairId) {
  const data = await buddyApi({
    action: 'nudge',
    buddyId: ensureBuddyId(),
    nudgeType,
    pairId,
  });
  if (data.ok) {
    if (!buddyCachedMessages[pairId]) buddyCachedMessages[pairId] = [];
    buddyCachedMessages[pairId].push(data.message);
    if (buddyCachedMessages[pairId].length > 50) buddyCachedMessages[pairId] = buddyCachedMessages[pairId].slice(-50);
    renderBuddyMessagesForPair(pairId);
    haptic('light');
    showBuddyStatusForPair(pairId, 'Sent!', 'var(--sage)');
  } else if (data.reason === 'rate-limit') {
    showBuddyStatusForPair(pairId, 'You\u2019ve sent a few nudges recently. Try again later.', 'var(--amber)');
  }
}

async function buddySendLove(pairId) {
  // Send a non-verbal bloom — just a 🌸, no words needed
  const data = await buddyApi({
    action: 'nudge',
    buddyId: ensureBuddyId(),
    nudgeType: 'love',
    pairId,
  });
  if (data.ok) {
    if (!buddyCachedMessages[pairId]) buddyCachedMessages[pairId] = [];
    buddyCachedMessages[pairId].push(data.message);
    if (buddyCachedMessages[pairId].length > 50) buddyCachedMessages[pairId] = buddyCachedMessages[pairId].slice(-50);
    renderBuddyMessagesForPair(pairId);
    haptic('medium');
    showBuddyStatusForPair(pairId, '🌸', 'var(--rose-light)');
  } else if (data.reason === 'rate-limit') {
    showBuddyStatusForPair(pairId, 'Try again in a bit.', 'var(--amber)');
  }
}

async function buddyUnpair(pairId) {
  // Check cooldown — prevent re-pairing for 24h after unpair
  const lastUnpair = load('bloom_buddy_last_unpair', 0);
  const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
  if (lastUnpair && (Date.now() - lastUnpair) < cooldownMs) {
    // Already in cooldown — still allow unpair, cooldown only blocks re-pair
  }
  if (!confirm('Unpair from this bloom buddy? You can find a new one after a 24-hour cool-down period.')) return;
  await buddyApi({ action: 'unpair', buddyId: ensureBuddyId(), pairId });
  // Set cooldown timestamp
  save('bloom_buddy_last_unpair', Date.now());
  // Remove from local cache
  buddyCachedBuddies = buddyCachedBuddies.filter(b => b.pairId !== pairId);
  delete buddyCachedMessages[pairId];
  if (buddyCachedBuddies.length === 0) {
    buddyState = { status: 'none' };
    stopBuddyPolling();
  }
  save('bloom_buddy_state', buddyState);
  save('bloom_buddy_list', buddyCachedBuddies);
  renderBuddyContent();
}

function checkBuddyCooldown() {
  const lastUnpair = load('bloom_buddy_last_unpair', 0);
  if (!lastUnpair) return false;
  const cooldownMs = 24 * 60 * 60 * 1000;
  return (Date.now() - lastUnpair) < cooldownMs;
}

function getBuddyCooldownRemaining() {
  const lastUnpair = load('bloom_buddy_last_unpair', 0);
  if (!lastUnpair) return 0;
  const cooldownMs = 24 * 60 * 60 * 1000;
  const remaining = cooldownMs - (Date.now() - lastUnpair);
  return Math.max(0, remaining);
}

function buddySafetyAction(pairId) {
  // Surface crisis resources and offer to unpair
  closeAllSheets();
  const sheet = document.getElementById('buddy-safety-content');
  if (sheet) {
    sheet.innerHTML = `
      <div style="text-align:center;padding:8px 0 16px">
        <div style="font-size:36px;margin-bottom:12px">🤍</div>
        <div style="font-family:Fraunces,serif;font-size:18px;font-weight:300;color:var(--cream);margin-bottom:8px">You're safe here</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:16px">
          If something about this buddy connection doesn't feel right — trust that feeling. You can unpair at any time, no questions asked.
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
        <button class="btn btn-secondary btn-block" onclick="closeAllSheets();openCrisisSheet()">🤍 Crisis & support resources</button>
        <button class="btn btn-secondary btn-block" onclick="closeAllSheets();buddyReportAndUnpair('${pairId}')">Report & unpair from this buddy</button>
        <button class="btn btn-secondary btn-block" onclick="closeAllSheets();buddyUnpair('${pairId}')">Just unpair (no report)</button>
        <button class="btn btn-ghost btn-block" onclick="closeAllSheets()">Go back</button>
      </div>
      <div style="font-size:11px;color:var(--text-muted);text-align:center;line-height:1.6">
        Reporting flags this buddy so they can be reviewed. It helps keep the community safe. Bloom buddies are for encouragement only — not therapy or crisis support.
      </div>
    `;
  }
  openSheet('buddy-safety-sheet');
}

async function buddyReportAndUnpair(pairId) {
  if (!confirm('Report this buddy for concerning behavior? This will unpair you and flag their account for review.')) return;
  try {
    await buddyApi({
      action: 'report-buddy',
      buddyId: ensureBuddyId(),
      pairId,
    });
  } catch(e) {}
  // Also unpair
  await buddyUnpair(pairId);
  showBuddyStatus('Buddy reported and unpaired. Thank you for helping keep the community safe.', 'var(--sage)');
}

function checkBuddyActivityTimeout() {
  // Show gentle notice if buddy hasn't been active in 14+ days
  if (!buddyCachedBuddies || buddyCachedBuddies.length === 0) return;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  buddyCachedBuddies.forEach(b => {
    const el = document.getElementById('buddy-timeout-' + b.pairId);
    if (!el) return;
    if (b.lastActive && (Date.now() - b.lastActive) > fourteenDays) {
      el.innerHTML = `<div style="background:rgba(201,149,74,0.08);border:1px solid rgba(201,149,74,0.15);border-radius:var(--r-md);padding:8px 12px;margin-top:8px;font-size:11px;color:var(--amber-light);line-height:1.5">
        This buddy hasn't been active in a while. That's okay — people take breaks. You can unpair anytime and find a new buddy when you're ready.
      </div>`;
    } else {
      el.innerHTML = '';
    }
  });
}

function toggleMultiBuddy(val) {
  if (!state.prefs) state.prefs = {};
  state.prefs.multiBuddy = val;
  save('bloom_prefs', state.prefs);
}

function showBuddyStatus(text, color) {
  const el = document.getElementById('buddy-status-msg');
  if (!el) return;
  el.textContent = text;
  el.style.color = color || 'var(--text-muted)';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function showBuddyStatusForPair(pairId, text, color) {
  const el = document.getElementById('buddy-status-' + pairId);
  if (!el) return;
  el.textContent = text;
  el.style.color = color || 'var(--text-muted)';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function buddyTimeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

// ── Unread message tracking ──────────────────────────────────
function getBuddyLastSeen(pairId) {
  const all = load('bloom_buddy_last_seen', {});
  return all[pairId] || 0;
}

function markBuddyMessagesRead(pairId) {
  const msgs = buddyCachedMessages[pairId] || [];
  if (!msgs.length) return;
  const latestTs = Math.max(...msgs.map(m => m.ts || 0));
  const all = load('bloom_buddy_last_seen', {});
  if (latestTs > (all[pairId] || 0)) {
    all[pairId] = latestTs;
    save('bloom_buddy_last_seen', all);
  }
}

function getBuddyUnreadCount(pairId) {
  const msgs = buddyCachedMessages[pairId] || [];
  const lastSeen = getBuddyLastSeen(pairId);
  const myId = bloomBuddyId;
  return msgs.filter(m => m.from !== myId && (m.ts || 0) > lastSeen).length;
}

// ── Buddy UI rendering ────────────────────────────────────
function renderBuddyContent() {
  const container = document.getElementById('buddy-section');
  if (!container) return;

  let html = '';

  // Info header (always shown)
  html += `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 0 4px">
    ${buddyIcon(24)}
    <div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream)">bloom buddy</div>
    <button onclick="openSheet('buddy-info-sheet')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--text-muted);padding:4px" title="What is bloom buddy?">&#9432;</button>
  </div>`;

  if (buddyState.status === 'paired' && buddyCachedBuddies.length > 0) {
    // Stacked buddy cards
    buddyCachedBuddies.forEach((b, i) => {
      html += renderBuddyCard(b, i);
    });
    // Add another buddy button
    html += `<div style="text-align:center;padding:8px 0 4px">
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('buddy-add-section').style.display=document.getElementById('buddy-add-section').style.display==='none'?'block':'none'">+ Add another buddy</button>
    </div>`;
    html += `<div id="buddy-add-section" style="display:none">${renderBuddySetup()}</div>`;
    container.innerHTML = html;
    // Fetch messages for each buddy
    buddyCachedBuddies.forEach(b => fetchBuddyMessages(b.pairId));
    checkBuddyActivityTimeout();
    startBuddyPolling();
  } else if (buddyState.status === 'searching') {
    html += renderBuddySearching();
    container.innerHTML = html;
    startBuddyPolling();
  } else {
    html += `<div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:12px;line-height:1.6">Partner with someone for mutual encouragement<br>and accountability.</div>`;
    html += renderBuddySetup();
    container.innerHTML = html;
  }
}

// Buddy onboarding state
let buddyOnboardStep = 0;
const BUDDY_ONBOARD_SEEN_KEY = 'bloom_buddy_onboard_seen';

function renderBuddySetup() {
  const hasSeenOnboard = load(BUDDY_ONBOARD_SEEN_KEY, false);
  if (!hasSeenOnboard) {
    return renderBuddyOnboarding();
  }
  return renderBuddyPairingOptions();
}

function renderBuddyOnboarding() {
  const steps = [
    {
      emoji: '🤝',
      title: 'What is bloom buddy?',
      text: 'Bloom buddy pairs you with someone for mutual encouragement. Invite a friend you trust, or get matched anonymously — either way you can share moods, send nudges, and support each other.',
    },
    {
      emoji: '🚫',
      title: 'What buddies are not',
      text: 'Buddies are not therapists, counselors, or crisis responders. If you need real support, tap the 🤍 in the header anytime for crisis resources.',
    },
    {
      emoji: '🛡️',
      title: 'Staying safe',
      text: 'If you\'re matched with someone new, never share personal info (phone, address, socials). If anything feels wrong, use the safety button on any buddy card to get help or unpair instantly.',
    },
  ];

  const step = steps[buddyOnboardStep] || steps[0];
  const isLast = buddyOnboardStep >= steps.length - 1;

  return `
    <div class="buddy-onboard-step">
      <div class="buddy-onboard-progress">
        ${steps.map((_, i) => `<div class="buddy-onboard-dot${i <= buddyOnboardStep ? ' active' : ''}" role="img" aria-label="Step ${i+1}${i <= buddyOnboardStep ? ', completed' : ''}"></div>`).join('')}
      </div>
      <div style="font-size:48px;margin-bottom:16px">${step.emoji}</div>
      <div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream);margin-bottom:10px">${step.title}</div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:24px;padding:0 8px">${step.text}</div>
      <div style="display:flex;gap:10px;justify-content:center">
        ${buddyOnboardStep > 0 ? `<button class="btn btn-ghost btn-sm" onclick="buddyOnboardPrev()">Back</button>` : ''}
        <button class="btn btn-primary" onclick="${isLast ? 'completeBuddyOnboard()' : 'buddyOnboardNext()'}">${isLast ? 'I understand — let\'s go' : 'Next'}</button>
      </div>
    </div>
  `;
}

function buddyOnboardNext() {
  buddyOnboardStep++;
  renderBuddyContent();
}

function buddyOnboardPrev() {
  buddyOnboardStep = Math.max(0, buddyOnboardStep - 1);
  renderBuddyContent();
}

function completeBuddyOnboard() {
  save(BUDDY_ONBOARD_SEEN_KEY, true);
  buddyOnboardStep = 0;
  renderBuddyContent();
}

function renderBuddyPairingOptions() {
  // Check cooldown after unpair
  if (checkBuddyCooldown()) {
    const remaining = getBuddyCooldownRemaining();
    const hours = Math.ceil(remaining / 3600000);
    return `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:40px;margin-bottom:12px">🌿</div>
        <div style="font-family:Fraunces,serif;font-size:18px;font-weight:300;color:var(--cream);margin-bottom:10px">Taking a breather</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:16px">
          After unpairing, there's a 24-hour cool-down before you can pair with someone new. This gives you space to reset.
        </div>
        <div style="font-size:14px;color:var(--amber-light);margin-bottom:8px">~${hours} hour${hours !== 1 ? 's' : ''} remaining</div>
        <div style="font-size:12px;color:var(--text-muted)">You can still use all other bloom features.</div>
      </div>
    `;
  }

  return `
    <div style="text-align:center;padding:8px 0 16px">
      <div style="margin-bottom:8px">${buddyIcon(48)}</div>
      <div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream)">bloom buddy</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:6px;line-height:1.6">Partner with someone for mutual encouragement<br>and accountability. Share moods, trade nudges,<br>and keep each other going.</div>
    </div>
    <div id="buddy-status-msg" style="font-size:12px;text-align:center;margin:8px 0;display:none"></div>

    <div style="background:rgba(106,154,176,0.08);border:1px solid rgba(106,154,176,0.15);border-radius:var(--r-lg);padding:12px 14px;margin-bottom:14px;font-size:12px;color:var(--sky-light);line-height:1.6">
      <strong style="color:var(--cream)">Before you pair up:</strong> Buddies are for mutual encouragement — not therapy or crisis support. Never share personal info (phone, address, socials). If anything feels off, use the safety button on any buddy card, or tap 🤍 for crisis resources.
    </div>

    <div class="buddy-setup-option" onclick="buddyCreateInvite()">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:24px">📬</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--cream)">Invite someone I know</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Share a code with a friend or partner</div>
        </div>
      </div>
    </div>

    <div class="buddy-setup-option" onclick="openBuddyMatchSheet()">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:24px">🔀</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--cream)">Match me with someone</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Get paired with someone on a similar journey</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;text-align:center">Have an invite code?</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="buddy-code-input" placeholder="Enter code" maxlength="6" style="flex:1;text-transform:uppercase;text-align:center;font-size:16px;letter-spacing:3px;padding:10px;font-family:Fraunces,serif">
        <button class="btn btn-primary btn-sm" onclick="buddyAcceptInvite(document.getElementById('buddy-code-input').value)" style="min-width:60px">Join</button>
      </div>
    </div>
  `;
}

function renderBuddyInviteView(code) {
  const container = document.getElementById('buddy-section');
  if (!container) return;

  const shareUrl = location.origin + '/?buddy=' + code;

  container.innerHTML = `
    <div style="text-align:center;padding:8px 0 16px">
      <div style="font-size:32px;margin-bottom:8px">📬</div>
      <div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream)">Share this code</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:6px;line-height:1.6">Send it to someone you trust. They\u2019ll enter it<br>in their Bloom app to pair up with you.</div>
    </div>
    <div id="buddy-status-msg" style="font-size:12px;text-align:center;margin:8px 0;display:none"></div>

    <div class="buddy-invite-code">${escapeHtml(code)}</div>

    <div style="display:flex;gap:8px;justify-content:center;margin:16px 0">
      <button class="btn btn-primary btn-sm" onclick="buddyShareInvite('${escapeHtml(code)}', '${escapeHtml(shareUrl)}')">Share</button>
      <button class="btn btn-secondary btn-sm" onclick="buddyCopyCode('${escapeHtml(code)}')">Copy code</button>
    </div>

    <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px">
      This code expires in 48 hours.
    </div>

    <div style="text-align:center;margin-top:16px">
      <button class="btn btn-ghost btn-sm" onclick="renderBuddyContent()">Back</button>
    </div>
  `;
}

function buddyShareInvite(code, url) {
  if (navigator.share) {
    navigator.share({
      title: 'Be my bloom buddy',
      text: 'Join me on Bloom! Use code ' + code + ' or tap the link:',
      url: url,
    }).catch(() => {});
  } else {
    buddyCopyCode(code);
  }
}

function buddyCopyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showBuddyStatus('Code copied!', 'var(--sage)');
  }).catch(() => {
    showBuddyStatus('Couldn\u2019t copy. Code: ' + code, 'var(--amber)');
  });
}

function renderBuddySearching() {
  return `
    <div class="buddy-searching">
      <div style="font-size:32px;margin-bottom:12px">🌱</div>
      <div style="font-family:Fraunces,serif;font-size:18px;font-weight:300;color:var(--cream)">Looking for your buddy...</div>
      <div class="buddy-searching-dots"><span></span><span></span><span></span></div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-top:8px">
        We\u2019ll pair you with someone who\u2019s on a similar journey.<br>
        You\u2019ll get a notification when matched!
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:16px" onclick="buddyCancelSearch()">Cancel search</button>
    </div>
  `;
}

function toggleBuddyCard(pid) {
  const body = document.getElementById('buddy-body-' + pid);
  const chevron = document.getElementById('buddy-chevron-' + pid);
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (chevron) chevron.textContent = open ? '▸' : '▾';
  if (!open) fetchBuddyMessages(pid);
}

function renderBuddyCard(b, index) {
  const moods = ['\ud83d\ude14 Low', '\ud83d\ude15 Rough', '\ud83d\ude10 Okay', '\ud83d\ude42 Good', '\ud83d\ude0a Great'];
  const moodDisplay = b.mood !== undefined && b.mood !== null ? (b.mood === -1 ? '🤷 Unsure' : moods[b.mood] || '\u2014') : '\u2014';
  const pctWidth = Math.min(100, Math.max(0, b.habitPct || 0));
  const pid = b.pairId;
  const isFirst = index === 0;
  const multipleCards = buddyCachedBuddies.length > 1;
  const unreadCount = getBuddyUnreadCount(pid);
  const unreadBadge = unreadCount > 0
    ? `<span class="buddy-unread-badge">${unreadCount} new</span>`
    : '';

  return `
    <div class="buddy-card" style="margin-bottom:12px">
      <div class="buddy-card-header" onclick="${multipleCards ? `toggleBuddyCard('${pid}')` : ''}" style="${multipleCards ? 'cursor:pointer' : ''}">
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <div class="buddy-name">${escapeHtml(b.name || 'Buddy')}'s day${unreadBadge}</div>
          <span style="font-size:12px;color:var(--text-muted)">${moodDisplay}</span>
        </div>
        ${multipleCards ? `<span id="buddy-chevron-${pid}" style="font-size:14px;color:var(--text-muted);transition:transform 0.2s">${isFirst ? '▾' : '▸'}</span>` : ''}
      </div>
      <div id="buddy-body-${pid}" style="display:${isFirst || !multipleCards ? 'block' : 'none'}">
        <div class="buddy-stats">
          <div class="buddy-stat"><span>${moodDisplay}</span></div>
          <div class="buddy-stat">🌿 <span class="buddy-stat-value">${b.streak || 0}</span> days shown up</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:12px;color:var(--text-secondary)">Habits</span>
          <div class="buddy-habit-bar" style="flex:1"><div class="buddy-habit-fill" style="width:${pctWidth}%"></div></div>
          <span style="font-size:12px;color:var(--text-muted)">${pctWidth}%</span>
        </div>

        <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:12px;color:var(--text-secondary)">Quick nudge</div>
            <button class="buddy-love-btn" onclick="buddySendLove('${pid}')" title="Send a bloom — no words needed" style="background:none;border:1px solid rgba(176,120,120,0.3);border-radius:99px;padding:5px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all 0.25s;color:var(--rose-light);font-size:12px;font-family:'Instrument Sans',sans-serif">
              <span style="font-size:14px" class="buddy-love-icon">🌸</span> Send love
            </button>
          </div>
          <div class="buddy-nudge-row">
            <div class="buddy-nudge-btn" onclick="buddySendNudge('thinking','${pid}')">Thinking of you 💭</div>
            <div class="buddy-nudge-btn" onclick="buddySendNudge('gotthis','${pid}')">You got this 💪</div>
            <div class="buddy-nudge-btn" onclick="buddySendNudge('proud','${pid}')">Proud of you 🌟</div>
            <div class="buddy-nudge-btn" onclick="buddySendNudge('easytoday','${pid}')">Take it easy 🤗</div>
          </div>
        </div>

        <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05)">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">Messages</div>
          <div class="buddy-messages" id="buddy-msgs-${pid}">
            <div style="text-align:center;font-size:12px;color:var(--text-muted);padding:8px">Loading...</div>
          </div>
          <div class="buddy-msg-input">
            <textarea id="buddy-input-${pid}" placeholder="Say something kind..." rows="1" maxlength="200"></textarea>
            <button class="btn btn-primary btn-sm" onclick="buddySendMessage('${pid}')" style="min-width:54px">Send</button>
          </div>
        </div>

        <div id="buddy-timeout-${pid}"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <button class="btn btn-ghost btn-sm" style="font-size:10px;color:var(--text-muted)" onclick="buddySafetyAction('${pid}')">Something feels wrong</button>
          <button class="btn btn-ghost btn-sm" style="font-size:10px;color:var(--text-muted)" onclick="buddyUnpair('${pid}')">Unpair</button>
        </div>
      </div>
    </div>
    <div id="buddy-status-${pid}" style="font-size:12px;text-align:center;margin:4px 0 8px;display:none"></div>
  `;
}

function renderBuddyMessagesForPair(pairId) {
  const container = document.getElementById('buddy-msgs-' + pairId);
  if (!container) return;
  const myId = bloomBuddyId;
  const msgs = buddyCachedMessages[pairId] || [];

  if (msgs.length === 0) {
    container.innerHTML = '<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:8px">No messages yet. Send a nudge!</div>';
    markBuddyMessagesRead(pairId);
    return;
  }

  let html = '';
  msgs.forEach(msg => {
    const isMine = msg.from === myId;
    const isNudge = msg.type === 'nudge';
    const cls = isMine ? 'buddy-msg sent' : 'buddy-msg received';
    const nudgeCls = isNudge ? ' nudge' : '';
    html += `<div class="${cls}${nudgeCls}">${escapeHtml(msg.text)}</div>`;
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
  // Mark messages as read now that they're visible
  markBuddyMessagesRead(pairId);
  updateBuddyNavBadge();
}

// ── Match preferences bottom sheet ────────────────────────
let buddyMatchPrefs = { frequency: null, focus: [] };

function openBuddyMatchSheet() {
  buddyMatchPrefs = { frequency: null, focus: [] };
  const content = document.getElementById('buddy-match-content');
  if (content) content.innerHTML = renderBuddyMatchForm();
  openSheet('buddy-match-sheet');
}

function selectBuddyPref(type, value) {
  if (type === 'focus') {
    const idx = buddyMatchPrefs.focus.indexOf(value);
    if (idx === -1) buddyMatchPrefs.focus.push(value);
    else buddyMatchPrefs.focus.splice(idx, 1);
    document.querySelectorAll(`[data-pref-type="focus"]`).forEach(btn => {
      btn.classList.toggle('selected', buddyMatchPrefs.focus.includes(btn.dataset.prefValue));
    });
  } else {
    buddyMatchPrefs[type] = value;
    document.querySelectorAll(`[data-pref-type="${type}"]`).forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.prefValue === value);
    });
  }
  // Update submit button
  const submit = document.getElementById('buddy-match-submit');
  if (submit) {
    const ready = buddyMatchPrefs.frequency && buddyMatchPrefs.focus.length > 0;
    submit.style.opacity = ready ? '1' : '0.4';
    submit.style.pointerEvents = ready ? 'auto' : 'none';
  }
  haptic('light');
}

function renderBuddyMatchForm() {
  return `
    <div style="padding:4px 20px 20px">
      <div class="sheet-title">Find a bloom buddy</div>
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px">
        Quick questions so we can match you with someone compatible.
      </p>

      <div style="font-size:14px;color:var(--cream);margin-bottom:10px;font-weight:500">How often do you check in?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        <div class="buddy-pref-option" data-pref-type="frequency" data-pref-value="daily" onclick="selectBuddyPref('frequency','daily')">
          <div style="font-size:20px;margin-bottom:4px">📅</div>
          <div>Daily</div>
        </div>
        <div class="buddy-pref-option" data-pref-type="frequency" data-pref-value="few-days" onclick="selectBuddyPref('frequency','few-days')">
          <div style="font-size:20px;margin-bottom:4px">🗓</div>
          <div>Every few days</div>
        </div>
      </div>

      <div style="font-size:14px;color:var(--cream);margin-bottom:10px;font-weight:500">What are you working on?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:24px">
        <div class="buddy-pref-option" data-pref-type="focus" data-pref-value="self-care" onclick="selectBuddyPref('focus','self-care')">
          <div style="font-size:20px;margin-bottom:4px">🧴</div>
          <div>Self-care</div>
        </div>
        <div class="buddy-pref-option" data-pref-type="focus" data-pref-value="mental-health" onclick="selectBuddyPref('focus','mental-health')">
          <div style="font-size:20px;margin-bottom:4px">🧠</div>
          <div>Mental health</div>
        </div>
        <div class="buddy-pref-option" data-pref-type="focus" data-pref-value="habits" onclick="selectBuddyPref('focus','habits')">
          <div style="font-size:20px;margin-bottom:4px">🌱</div>
          <div>Habits</div>
        </div>
      </div>

      <div class="btn btn-primary" id="buddy-match-submit" style="width:100%;text-align:center;opacity:0.4;pointer-events:none" onclick="buddyFindMatch(buddyMatchPrefs)">Find my buddy</div>
    </div>
  `;
}


export { bloomBuddyId, buddyState, buddyCachedBuddies, buddyCachedMessages,
  ensureBuddyId, getBuddyDisplayName, getHabitPct, buddyApi,
  syncBuddyStatus, scheduleBuddySync, fetchBuddyData, fetchBuddyMessages,
  updateBuddyNavBadge, startBuddyPolling, stopBuddyPolling,
  buddyRegisterAndSync, buddyCreateInvite, buddyAcceptInvite,
  buddyFindMatch, buddyCancelSearch, checkBuddyMessageSafety,
  buddySendMessage, buddySendNudge, buddySendLove, buddyUnpair,
  checkBuddyCooldown, getBuddyCooldownRemaining, buddySafetyAction,
  buddyReportAndUnpair, checkBuddyActivityTimeout, toggleMultiBuddy,
  showBuddyStatus, showBuddyStatusForPair, buddyTimeAgo,
  getBuddyLastSeen, markBuddyMessagesRead, getBuddyUnreadCount,
  renderBuddyContent, renderBuddySetup, renderBuddyOnboarding,
  renderBuddyPairingOptions, renderBuddyInviteView, renderBuddySearching,
  renderBuddyCard, renderBuddyMessagesForPair, renderBuddyMatchForm,
  openBuddyMatchSheet, selectBuddyPref };

window.buddyRegisterAndSync = buddyRegisterAndSync;
window.buddyCreateInvite = buddyCreateInvite;
window.buddyAcceptInvite = buddyAcceptInvite;
window.buddyFindMatch = buddyFindMatch;
window.buddyCancelSearch = buddyCancelSearch;
window.buddySendMessage = buddySendMessage;
window.buddySendNudge = buddySendNudge;
window.buddySendLove = buddySendLove;
window.buddyUnpair = buddyUnpair;
window.buddySafetyAction = buddySafetyAction;
window.buddyReportAndUnpair = buddyReportAndUnpair;
window.toggleMultiBuddy = toggleMultiBuddy;
window.toggleBuddyCard = toggleBuddyCard;
window.renderBuddyContent = renderBuddyContent;
window.renderBuddySetup = renderBuddySetup;
window.buddyOnboardNext = buddyOnboardNext;
window.buddyOnboardPrev = buddyOnboardPrev;
window.completeBuddyOnboard = completeBuddyOnboard;
window.buddyShareInvite = buddyShareInvite;
window.buddyCopyCode = buddyCopyCode;
window.openBuddyMatchSheet = openBuddyMatchSheet;
window.selectBuddyPref = selectBuddyPref;
window.markBuddyMessagesRead = markBuddyMessagesRead;
window.stopBuddyPolling = stopBuddyPolling;
window.startBuddyPolling = startBuddyPolling;
window.fetchBuddyData = fetchBuddyData;
window.fetchBuddyMessages = fetchBuddyMessages;
window.buddyState = buddyState;
window.buddyCachedBuddies = buddyCachedBuddies;
