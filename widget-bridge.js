/**
 * Bloom Widget Bridge
 *
 * Sends app state to the native Android widgets via Capacitor.
 * On web (non-Capacitor), all calls are silent no-ops.
 *
 * Usage: call updateWidget() after mood logs, XP changes,
 * or growth stage changes. It reads from Bloom's existing state.
 */

const GROWTH_STAGES = [
  { name: 'Seed', emoji: '🌱' },
  { name: 'Seedling', emoji: '🌱' },
  { name: 'Sprout', emoji: '🌿' },
  { name: 'Budding', emoji: '🌿' },
  { name: 'Blooming', emoji: '🌸' },
  { name: 'Flowering', emoji: '🌸' },
  { name: 'Flourishing', emoji: '🌺' },
  { name: 'Rooted', emoji: '🌳' },
  { name: 'Evergreen', emoji: '🌳' },
  { name: 'Full Bloom', emoji: '🌻' },
  { name: 'Perennial', emoji: '🌻' },
  { name: 'Grove', emoji: '🏡' },
  { name: 'Canopy', emoji: '🏡' },
  { name: 'Ecosystem', emoji: '🌍' }
];

const MOOD_LABELS = {
  0: '😔 Low',
  1: '😕 Rough',
  2: '😐 Okay',
  3: '🙂 Good',
  4: '😊 Great',
  '-1': '🤷 Unsure'
};

/**
 * Check if running inside Capacitor native shell
 */
function isNative() {
  return typeof window !== 'undefined' &&
    window.Capacitor &&
    window.Capacitor.isNativePlatform &&
    window.Capacitor.isNativePlatform();
}

/**
 * Push current Bloom state to all Android widgets.
 * Safe to call from anywhere. No-ops on web.
 */
async function updateWidget() {
  if (!isNative()) return;

  try {
    const { Plugins } = window.Capacitor;
    if (!Plugins || !Plugins.BloomWidget) return;

    // Read from Bloom's state (assumes global `state` object)
    const daysShownUp = (typeof state !== 'undefined' && state.daysShowedUp) || 0;

    // Today's mood from today's data
    let todayMood = '';
    if (typeof state !== 'undefined' && state.todayData && state.todayData.mood != null) {
      const moodVal = state.todayData.mood;
      todayMood = MOOD_LABELS[moodVal] || '';
    }

    // Growth stage from XP data
    let growthStage = 'Seed';
    let growthEmoji = '🌱';
    if (typeof state !== 'undefined' && state.xpData) {
      const levelIdx = state.xpData.levelIdx || 0;
      if (levelIdx >= 0 && levelIdx < GROWTH_STAGES.length) {
        growthStage = GROWTH_STAGES[levelIdx].name;
        growthEmoji = GROWTH_STAGES[levelIdx].emoji;
      }
    }

    // Voice preference for the nudge widget
    let voicePreference = 'reflective';
    if (typeof state !== 'undefined' && state.prefs && state.prefs.voice) {
      voicePreference = state.prefs.voice;
    }

    await Plugins.BloomWidget.updateWidgetData({
      daysShownUp,
      todayMood,
      growthStage,
      growthEmoji,
      voicePreference
    });
  } catch (e) {
    // Silent fail on web or if plugin not available
    console.debug('Widget update skipped:', e.message);
  }
}

/**
 * Check if app was opened from the mood widget with a pending mood tap.
 * Call this on app startup (inside Capacitor) to process widget mood taps.
 * Returns the mood value if pending, or null.
 */
async function checkWidgetMood() {
  if (!isNative()) return null;

  try {
    const { Plugins } = window.Capacitor;
    if (!Plugins || !Plugins.BloomWidget) return null;

    const result = await Plugins.BloomWidget.checkPendingMood();
    if (result && result.hasPendingMood) {
      return result.moodValue;
    }
  } catch (e) {
    console.debug('Widget mood check skipped:', e.message);
  }
  return null;
}

// Export for use in index.html
if (typeof window !== 'undefined') {
  window.updateWidget = updateWidget;
  window.checkWidgetMood = checkWidgetMood;
}
