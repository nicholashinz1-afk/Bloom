/**
 * Bloom Widget Bridge
 *
 * Sends app state to the native Android widget via Capacitor.
 * On web (non-Capacitor), calls are silently no-ops.
 *
 * Usage: call updateWidget() after mood logs, streak updates,
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
 * Push current Bloom state to the Android widget.
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
    if (typeof state !== 'undefined' && state.todayData && state.todayData.mood) {
      todayMood = state.todayData.mood;
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

    await Plugins.BloomWidget.updateWidgetData({
      daysShownUp,
      todayMood,
      growthStage,
      growthEmoji
    });
  } catch (e) {
    // Silent fail on web or if plugin not available
    console.debug('Widget update skipped:', e.message);
  }
}

// Export for use in index.html
if (typeof window !== 'undefined') {
  window.updateWidget = updateWidget;
}
