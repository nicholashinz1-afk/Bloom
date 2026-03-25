// Bloom state — central app state + date helpers + journal helpers
import { save, load } from './storage.js';
import { JOURNAL_PROMPTS, JOURNAL_PROMPTS_LOW } from './constants.js';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dayOfWeek() { return new Date().getDay(); } // 0=Sun

function weekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDayIndex() {
  const d = new Date();
  return Math.floor(d.getTime() / 86400000);
}

function getWeekDates() {
  const dates = [];
  const d = new Date();
  const day = d.getDay();
  const monOffset = day === 0 ? -6 : 1 - day;
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() + monOffset + i);
    dates.push(`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`);
  }
  return dates;
}

// ============================================================
//  APP STATE
// ============================================================
let state = {};

function loadState() {
  state = {
    prefs:       load('bloom_prefs', null),
    todayData:   load('bloom_today_' + today(), {}),
    weekData:    load('bloom_week_' + weekStart(), {}),
    historyData: load('bloom_history', {}),
    xpData:      load('bloom_xp', { total: 0, level: 0, streak: 0, daysShowedUp: 0, currentRun: 0, lastStreakDate: null }),
    wellnessData:load('bloom_wellness', { journal: {}, reflections: {}, insights: [], wins: {}, affirmations: [] }),
    seenVersion: load('bloom_version', null),
    backupDate:  load('bloom_backup_date', null),
    buddyData:   load('bloom_buddy_state', { status: 'none' }),
  };
}

function saveState() {
  save('bloom_today_' + today(), state.todayData);
  save('bloom_week_' + weekStart(), state.weekData);
  save('bloom_history', state.historyData);
  save('bloom_xp', state.xpData);
  save('bloom_wellness', state.wellnessData);
}

function getJournalPrompt() {
  const offset = state.journalPromptOffset || 0;
  const mood = state.todayData?.mood;
  if (mood !== undefined && mood >= 0 && mood <= 1) return JOURNAL_PROMPTS_LOW[(getDayIndex() + offset) % JOURNAL_PROMPTS_LOW.length];
  return JOURNAL_PROMPTS[(getDayIndex() + offset) % JOURNAL_PROMPTS.length];
}

// ── Journal entry helpers (array-based storage) ─────────────
function getJournalEntries(date) {
  const raw = state.wellnessData?.journal?.[date];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  // Legacy single-object format
  return [{ text: raw.text, ai: raw.ai, savedAt: null, source: 'journal' }];
}

function getLatestJournalText(date) {
  return getJournalEntries(date).map(e => e.text).filter(Boolean).join('\n\n');
}

function migrateJournalFormat() {
  const journal = state.wellnessData?.journal;
  if (!journal) return;
  let migrated = false;
  Object.keys(journal).forEach(date => {
    const entry = journal[date];
    if (entry && !Array.isArray(entry) && typeof entry === 'object' && entry.text !== undefined) {
      journal[date] = [{ text: entry.text, ai: entry.ai || null, savedAt: null, prompt: null, source: 'journal' }];
      migrated = true;
    }
  });
  if (migrated) saveState();
}

export { state, today, dayOfWeek, weekStart, formatDateLabel, getDayIndex, getWeekDates, loadState, saveState, getJournalPrompt, getJournalEntries, getLatestJournalText, migrateJournalFormat };
