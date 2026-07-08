// Player-vs-rival race visual, themed per level. Player position tracks how much
// of the level has been typed; rival position tracks the pace needed to hit the
// level's pass-WPM threshold. Driven by the engine's onProgress/onCharResult ticks.
window.TG = window.TG || {};

(function () {
  const TRACK_MAX_PERCENT = 90; // leave room so the vehicle icon doesn't overrun the finish flag

  function levelParDistance(level) {
    if (level.type === "timed") {
      // "Par" distance: total characters you'd type over the time limit at exactly minWpm.
      return (level.timeLimitSeconds / 60) * level.passCriteria.minWpm * 5;
    }
    return level.drills.reduce((sum, drill) => sum + drill.length, 0);
  }

  function createRace(trackEl, level) {
    const theme = level.raceTheme;
    const parDistance = Math.max(1, levelParDistance(level));

    trackEl.className = "race-track race-track--" + theme.key;
    trackEl.innerHTML =
      '<div class="race-theme-label">' + theme.label + '</div>' +
      '<div class="race-lane race-lane--rival">' +
        '<span class="race-vehicle race-vehicle--rival">' + theme.rivalIcon + '</span>' +
      '</div>' +
      '<div class="race-lane race-lane--player">' +
        '<span class="race-vehicle race-vehicle--player">' + theme.playerIcon + '</span>' +
      '</div>' +
      '<div class="race-finish">' + theme.finishIcon + '</div>';

    const playerEl = trackEl.querySelector(".race-vehicle--player");
    const rivalEl = trackEl.querySelector(".race-vehicle--rival");

    function setProgress(el, fraction) {
      const clamped = Math.max(0, Math.min(1, fraction));
      el.style.left = (clamped * TRACK_MAX_PERCENT) + "%";
    }

    function update({ elapsedMs, totalCharsTyped, limitMs }) {
      const elapsedMinutes = elapsedMs / 60000;
      const rivalFraction =
        level.type === "timed" && limitMs
          ? elapsedMs / limitMs
          : (elapsedMinutes * level.passCriteria.minWpm * 5) / parDistance;
      const playerFraction = totalCharsTyped / parDistance;
      setProgress(rivalEl, rivalFraction);
      setProgress(playerEl, playerFraction);
    }

    function pulse(correct) {
      playerEl.classList.remove("race-vehicle--boost", "race-vehicle--skid");
      void playerEl.offsetWidth; // restart animation if triggered again quickly
      playerEl.classList.add(correct ? "race-vehicle--boost" : "race-vehicle--skid");
    }

    setProgress(playerEl, 0);
    setProgress(rivalEl, 0);

    return { update, pulse };
  }

  window.TG.race = { createRace };
})();
