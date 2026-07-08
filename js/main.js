// Bootstraps the Blind Typing Game.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const levels = window.TG.LEVELS;
    const progress = window.TG.storage.loadProgress(levels);
    window.TG.ui.init(progress, levels);
  });
})();
