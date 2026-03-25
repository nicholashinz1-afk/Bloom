// Bloom community tab — encouragement wall + buddy list
import { state } from '../state.js';
import { save, load } from '../storage.js';
import { haptic, escapeHtml } from '../utils.js';
import { bloomIcon, buddyIcon } from '../icons.js';
import { sendTelemetry, trackFeature, timedFetch } from '../telemetry.js';
import { renderBuddyContent } from '../features/buddy.js';

// Late-bound cross-module references (avoid circular imports)
function openCrisisSheet(...args) { return window.openCrisisSheet?.(...args); }

let wallMessages = [];
let wallLoading = false;
let wallPosting = false;
let wallHearted = load('bloom_wall_hearted', {});
let wallFingerprint = load('bloom_wall_fp', null);
if (!wallFingerprint) {
  wallFingerprint = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  save('bloom_wall_fp', wallFingerprint);
}

async function fetchWallMessages() {
  wallLoading = true;
  try {
    const res = await timedFetch('/api/wall');
    const data = await res.json();
    wallMessages = data.messages || [];
  } catch(e) {
    // Fallback: show seed messages if API unavailable
    wallMessages = getWallSeedMessages();
  }
  wallLoading = false;
}

function getWallSeedMessages() {
  return [
    { id: 'seed1', text: 'You showed up today. That matters.', hearts: 12, ts: Date.now() - 86400000 },
    { id: 'seed2', text: 'Sending a hug to whoever needs it right now', hearts: 24, ts: Date.now() - 43200000 },
    { id: 'seed3', text: 'One step at a time. You are not behind.', hearts: 18, ts: Date.now() - 21600000 },
    { id: 'seed4', text: 'Someone out there is proud of you', hearts: 31, ts: Date.now() - 7200000 },
    { id: 'seed5', text: 'Rest is not giving up. It is how you keep going.', hearts: 15, ts: Date.now() - 3600000 },
    { id: 'seed6', text: 'The fact that you are trying is enough', hearts: 22, ts: Date.now() - 1800000 },
    { id: 'seed7', text: 'Your feelings are real and they are valid', hearts: 19, ts: Date.now() - 900000 },
    { id: 'seed8', text: 'Even on hard days, you are still growing', hearts: 27, ts: Date.now() - 600000 },
  ];
}

function renderCommunityTab() {
  const scroll = document.getElementById('community-scroll');
  if (!scroll) return;

  let html = '';

  // Wall header
  html += `<div style="text-align:center;padding:8px 0 16px">
    <div style="font-size:32px;margin-bottom:8px">💛</div>
    <div style="font-family:Fraunces,serif;font-size:20px;font-weight:300;color:var(--cream)">Encouragement wall${infoIcon('wall')}</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-top:6px;line-height:1.6">Anonymous words of kindness from the bloom community.<br>Leave something gentle for someone who needs it.</div>
  </div>`;

  // Post form
  html += `<div class="card" id="wall-post-card">
    <div style="display:flex;gap:8px;align-items:flex-end">
      <textarea id="wall-input" placeholder="Leave a kind word for someone..." rows="2" maxlength="140" style="flex:1;resize:none" oninput="updateWallCharCount()"></textarea>
      <button class="btn btn-primary btn-sm" id="wall-post-btn" onclick="postToWall()" style="min-width:60px">Post</button>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px">
      <div style="font-size:11px;color:var(--text-muted);font-style:italic">Anonymous — no one knows it's you</div>
      <div id="wall-char-count" style="font-size:11px;color:var(--text-muted)">0/140</div>
    </div>
    <div id="wall-post-status" style="font-size:12px;margin-top:6px;display:none"></div>
  </div>`;

  // Messages
  html += `<div id="wall-messages">`;
  if (wallLoading) {
    html += `<div class="card" style="text-align:center">
      <div class="ai-thinking" style="justify-content:center;margin:12px 0"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
      <div style="font-size:13px;color:var(--text-muted)">Loading encouragement...</div>
    </div>`;
  } else if (wallMessages.length === 0) {
    html += `<div class="card" style="text-align:center;padding:20px">
      <div style="font-size:24px;margin-bottom:8px">🌱</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:14px;color:var(--text-secondary);line-height:1.7">A quiet space for shared encouragement.</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:6px">Be the first to share something kind.</div>
    </div>`;
  } else {
    wallMessages.forEach(msg => {
      const timeAgo = getTimeAgo(msg.ts);
      const hearted = wallHearted[msg.id];
      html += `<div class="card wall-message" style="padding:14px 16px;margin-bottom:8px">
        <div style="font-size:14px;color:var(--cream);line-height:1.6;font-family:Fraunces,serif;font-style:italic">"${escapeHtml(msg.text)}"</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
          <div style="display:flex;align-items:center;gap:12px">
            <button onclick="heartWallMessage('${msg.id}')" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:99px;transition:all 0.2s;${hearted ? 'background:rgba(201,149,74,0.15)' : ''}" ${hearted ? 'disabled' : ''}>
              <span style="font-size:14px">${hearted ? '💛' : '🤍'}</span>
              <span style="font-size:12px;color:${hearted ? 'var(--amber-light)' : 'var(--text-muted)'}">${msg.hearts || 0}</span>
            </button>
            <button onclick="reportWallMessage('${msg.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-muted);opacity:0.5;padding:4px" title="Report">flag</button>
          </div>
          <div style="font-size:11px;color:var(--text-muted)">${timeAgo}</div>
        </div>
      </div>`;
    });
  }
  html += `</div>`;

  // Community guidelines
  html += `<div style="text-align:center;padding:12px 16px 20px">
    <div style="font-size:11px;color:var(--text-muted);line-height:1.7">
      This is a safe, moderated space. Messages are anonymous and screened automatically.
      <br>Be kind. Be real. Be gentle with each other.
    </div>
  </div>`;

  // bloom buddy section (below wall)
  html += `<div style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px">
    <div id="buddy-section"></div>
  </div>`;

  scroll.innerHTML = html;

  // Auto-fetch wall if not loaded
  if (!wallLoading && wallMessages.length === 0 && !state._wallFetched) {
    state._wallFetched = true;
    fetchWallMessages().then(() => renderWallMessages());
  }

  // Render buddy section
  renderBuddyContent();
}

function renderWallMessages() {
  const container = document.getElementById('wall-messages');
  if (!container) return;
  let html = '';
  if (wallMessages.length === 0) {
    html += `<div class="card" style="text-align:center;padding:20px">
      <div style="font-size:24px;margin-bottom:8px">🌱</div>
      <div style="font-family:Fraunces,serif;font-style:italic;font-size:14px;color:var(--text-secondary);line-height:1.7">A quiet space for shared encouragement.</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:6px">Be the first to share something kind.</div>
    </div>`;
  } else {
    wallMessages.forEach(msg => {
      const timeAgo = getTimeAgo(msg.ts);
      const hearted = wallHearted[msg.id];
      html += `<div class="card wall-message" style="padding:14px 16px;margin-bottom:8px">
        <div style="font-size:14px;color:var(--cream);line-height:1.6;font-family:Fraunces,serif;font-style:italic">"${escapeHtml(msg.text)}"</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
          <div style="display:flex;align-items:center;gap:12px">
            <button onclick="heartWallMessage('${msg.id}')" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:99px;transition:all 0.2s;${hearted ? 'background:rgba(201,149,74,0.15)' : ''}" ${hearted ? 'disabled' : ''}>
              <span style="font-size:14px">${hearted ? '💛' : '🤍'}</span>
              <span style="font-size:12px;color:${hearted ? 'var(--amber-light)' : 'var(--text-muted)'}">${msg.hearts || 0}</span>
            </button>
            <button onclick="reportWallMessage('${msg.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-muted);opacity:0.5;padding:4px" title="Report">flag</button>
          </div>
          <div style="font-size:11px;color:var(--text-muted)">${timeAgo}</div>
        </div>
      </div>`;
    });
  }
  container.innerHTML = html;
}

function updateWallCharCount() {
  const input = document.getElementById('wall-input');
  const count = document.getElementById('wall-char-count');
  if (input && count) count.textContent = `${input.value.length}/140`;
}

async function postToWall() {
  const input = document.getElementById('wall-input');
  const status = document.getElementById('wall-post-status');
  const btn = document.getElementById('wall-post-btn');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  if (text.length < 3) {
    showWallStatus('A little more? Even a few words can mean the world.', 'var(--amber)');
    return;
  }

  btn.disabled = true;
  btn.textContent = '...';
  try {
    const res = await timedFetch('/api/wall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'post', text, fp: wallFingerprint }),
    });
    const data = await res.json();
    if (data.ok) {
      input.value = '';
      updateWallCharCount();
      haptic('medium');
      showWallStatus('Your words are out there now, making someone\'s day a little brighter.', 'var(--sage)');
      // Refresh messages only, preserve textarea
      await fetchWallMessages();
      renderWallMessages();
      // If self-harm language detected, gently surface crisis resources
      if (data.flag === 'self-harm') setTimeout(() => openCrisisSheet(), 800);
    } else {
      const reasons = {
        'length': 'Message should be 3-140 characters.',
        'harmful': 'Let\'s keep this space gentle and safe. Try rephrasing?',
        'filtered': 'Some words aren\'t allowed here to keep this space safe. Try rephrasing?',
        'rate-limit': 'You\'ve shared recently — come back in a bit to post again.',
        'no-text': 'Write a few words of encouragement.',
      };
      showWallStatus(reasons[data.reason] || 'Something went wrong. Try again?', 'var(--amber)');
    }
  } catch(e) {
    showWallStatus('Couldn\'t connect. Your kindness will have to wait a moment.', 'var(--text-muted)');
  }
  btn.disabled = false;
  btn.textContent = 'Post';
}

function showWallStatus(text, color) {
  const status = document.getElementById('wall-post-status');
  if (!status) return;
  status.style.display = 'block';
  status.style.color = color;
  status.textContent = text;
  setTimeout(() => { if (status) status.style.display = 'none'; }, 5000);
}

async function heartWallMessage(id) {
  if (wallHearted[id]) return;
  wallHearted[id] = true;
  save('bloom_wall_hearted', wallHearted);
  haptic('light');

  // Optimistic update
  const msg = wallMessages.find(m => m.id === id);
  if (msg) msg.hearts = (msg.hearts || 0) + 1;
  renderWallMessages();

  try {
    await timedFetch('/api/wall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'heart', id }),
    });
  } catch(e) {}
}

async function reportWallMessage(id) {
  if (confirm('Report this message as inappropriate?')) {
    try {
      await timedFetch('/api/wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report', id }),
      });
      wallMessages = wallMessages.filter(m => m.id !== id);
      renderWallMessages();
      haptic('medium');
    } catch(e) {}
  }
}

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export { renderCommunityTab, fetchWallMessages, renderWallMessages, getTimeAgo };

window.renderCommunityTab = renderCommunityTab;
window.postToWall = postToWall;
window.heartWallMessage = heartWallMessage;
window.reportWallMessage = reportWallMessage;
window.updateWallCharCount = updateWallCharCount;
window.fetchWallMessages = fetchWallMessages;
