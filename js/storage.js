// localStorage persistence for the Blind Typing Game.
window.TG = window.TG || {};

(function () {
  const STORAGE_KEY = "blindTypingGame.progress";
  const CURRENT_VERSION = 1;

  let memoryFallback = null;

  function initDefaultProgress(levels) {
    const levelsState = {};
    levels.forEach((level, index) => {
      levelsState[level.id] = {
        unlocked: index === 0,
        completed: false,
        bestWpm: 0,
        bestAccuracy: 0,
        attempts: 0,
        lastPlayed: null
      };
    });
    return {
      version: CURRENT_VERSION,
      levels: levelsState,
      totals: {
        totalSessionsPlayed: 0,
        totalTimeTypingMs: 0
      }
    };
  }

  function migrate(data) {
    // No migrations needed yet; placeholder for future schema bumps.
    if (data.version < CURRENT_VERSION) {
      data.version = CURRENT_VERSION;
    }
    return data;
  }

  function loadProgress(levels) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initDefaultProgress(levels);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.levels) {
        return initDefaultProgress(levels);
      }
      // Ensure any newly-added levels (e.g. after an update) exist in saved state.
      const defaults = initDefaultProgress(levels);
      levels.forEach((level) => {
        if (!parsed.levels[level.id]) {
          parsed.levels[level.id] = defaults.levels[level.id];
        }
      });
      if (!parsed.totals) parsed.totals = defaults.totals;
      return migrate(parsed);
    } catch (err) {
      console.warn("TG.storage: failed to load progress, using defaults.", err);
      return initDefaultProgress(levels);
    }
  }

  function saveProgress(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      memoryFallback = null;
    } catch (err) {
      console.warn("TG.storage: localStorage unavailable, using in-memory fallback.", err);
      memoryFallback = state;
    }
  }

  window.TG.storage = {
    loadProgress,
    saveProgress,
    initDefaultProgress
  };
})();
