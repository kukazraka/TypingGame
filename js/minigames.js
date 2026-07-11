// Mini-game registry: each level pair gets a different game visual, all driven by
// the same engine callbacks (onProgress → update, onCharResult → pulse) so the
// blind-typing engine stays untouched. Every game implements the same contract:
//   create(trackEl, level) → { update({elapsedMs, totalCharsTyped, limitMs}), pulse(correct) }
// None of these visuals ever display what the player typed — only target text
// (already visible in the prompt) and correct/incorrect feedback.
window.TG = window.TG || {};

(function () {
  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function parDistance(level) {
    if (level.type === "timed") {
      return (level.timeLimitSeconds / 60) * level.passCriteria.minWpm * 5;
    }
    return Math.max(1, level.drills.reduce((sum, d) => sum + d.length, 0));
  }

  // Player progress vs the pace needed to hit the level's pass WPM, both 0..1.
  function fractions(level, { elapsedMs, totalCharsTyped, limitMs }) {
    const par = parDistance(level);
    const rival =
      level.type === "timed" && limitMs
        ? elapsedMs / limitMs
        : ((elapsedMs / 60000) * level.passCriteria.minWpm * 5) / par;
    return { player: clamp01(totalCharsTyped / par), rival: clamp01(rival) };
  }

  function rePulse(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation if re-triggered quickly
    el.classList.add(cls);
  }

  // ---------- Falling letters (levels 3-4) ----------
  // Upcoming target characters rain down; each keystroke zaps the lowest one
  // into the catcher — green pop when correct, red flash when not.

  function createFall(trackEl, level) {
    const theme = level.raceTheme;
    const fullText = (level.drills || []).join("");
    const QUEUE = 7;
    let pos = 0;

    trackEl.className = "race-track fall-track";
    trackEl.innerHTML =
      '<div class="race-theme-label">' + theme.label + '</div>' +
      '<div class="fall-sky"></div>' +
      '<div class="fall-catcher">' + theme.playerIcon + '</div>' +
      '<div class="fall-meter"><div class="fall-meter__fill"></div><div class="fall-meter__rival"></div></div>';

    const sky = trackEl.querySelector(".fall-sky");
    const catcher = trackEl.querySelector(".fall-catcher");
    const fill = trackEl.querySelector(".fall-meter__fill");
    const rivalTick = trackEl.querySelector(".fall-meter__rival");

    // Deterministic horizontal scatter so chips don't re-shuffle on re-render.
    function xFor(i) {
      return 12 + ((i * 37) % 72);
    }

    function makeChip(ch, i) {
      const chip = document.createElement("span");
      chip.className = "fall-chip" + (i === 0 ? " fall-chip--next" : "");
      if (ch === " ") {
        chip.classList.add("fall-chip--space");
        chip.textContent = "space";
      } else {
        chip.textContent = ch;
      }
      chip.style.left = xFor(pos + i) + "%";
      chip.style.top = 74 - i * 11 + "%";
      chip.style.opacity = String(1 - i * 0.1);
      return chip;
    }

    function render() {
      sky.innerHTML = "";
      const upcoming = fullText.slice(pos, pos + QUEUE);
      [...upcoming].forEach((ch, i) => sky.appendChild(makeChip(ch, i)));
      catcher.style.left = xFor(pos) + "%";
    }

    function update(progress) {
      const f = fractions(level, progress);
      pos = progress.totalCharsTyped; // authoritative (covers backspace reverts)
      fill.style.width = f.player * 100 + "%";
      rivalTick.style.left = f.rival * 100 + "%";
      render();
    }

    function pulse(correct) {
      const next = sky.querySelector(".fall-chip--next");
      if (next) {
        next.classList.add(correct ? "fall-chip--zap" : "fall-chip--miss");
        next.classList.remove("fall-chip--next");
      }
      rePulse(catcher, correct ? "fall-catcher--catch" : "fall-catcher--shake");
      pos++; // optimistic; re-synced on the next update tick
      const zapped = next;
      setTimeout(() => zapped && zapped.remove(), 350);
      // Re-render the rest of the queue shifted down, keeping the zapped chip animating.
      const survivors = sky.querySelectorAll(".fall-chip:not(.fall-chip--zap):not(.fall-chip--miss)");
      survivors.forEach((c) => c.remove());
      const upcoming = fullText.slice(pos, pos + QUEUE);
      [...upcoming].forEach((ch, i) => sky.appendChild(makeChip(ch, i)));
      catcher.style.left = xFor(pos) + "%";
    }

    render();
    return { update, pulse };
  }

  // ---------- Balloon climb (levels 5-6) ----------
  // Vertical race: the player's balloon rises with typed progress, the rival
  // climbs at the level's pass-WPM pace.

  function createClimb(trackEl, level) {
    const theme = level.raceTheme;
    trackEl.className = "race-track climb-track";
    trackEl.innerHTML =
      '<div class="race-theme-label">' + theme.label + '</div>' +
      '<div class="climb-sky">' +
        '<div class="climb-finish">' + theme.finishIcon + '</div>' +
        '<span class="climb-cloud climb-cloud--a">☁️</span>' +
        '<span class="climb-cloud climb-cloud--b">☁️</span>' +
        '<span class="climb-actor climb-actor--rival">' + theme.rivalIcon + '</span>' +
        '<span class="climb-actor climb-actor--player">' + theme.playerIcon + '</span>' +
      '</div>';

    const player = trackEl.querySelector(".climb-actor--player");
    const rival = trackEl.querySelector(".climb-actor--rival");

    function update(progress) {
      const f = fractions(level, progress);
      player.style.bottom = f.player * 74 + "%";
      rival.style.bottom = f.rival * 74 + "%";
    }

    function pulse(correct) {
      rePulse(player, correct ? "climb-actor--lift" : "climb-actor--wobble");
    }

    update({ elapsedMs: 0, totalCharsTyped: 0 });
    return { update, pulse };
  }

  // ---------- Bridge builder (levels 7-8) ----------
  // Planks appear across a canyon proportional to progress; the player walks
  // out on the newest plank while the rival crosses a rope at pace.

  function createBridge(trackEl, level) {
    const theme = level.raceTheme;
    const PLANKS = 18;

    let planksHTML = "";
    for (let i = 0; i < PLANKS; i++) {
      planksHTML += '<span class="bridge-plank"></span>';
    }

    trackEl.className = "race-track bridge-track";
    trackEl.innerHTML =
      '<div class="race-theme-label">' + theme.label + '</div>' +
      '<div class="bridge-scene">' +
        '<span class="bridge-rival">' + theme.rivalIcon + '</span>' +
        '<div class="bridge-cliff bridge-cliff--left"></div>' +
        '<div class="bridge-cliff bridge-cliff--right"><span class="bridge-flag">' + theme.finishIcon + '</span></div>' +
        '<div class="bridge-planks">' + planksHTML + '</div>' +
        '<span class="bridge-player">' + theme.playerIcon + '</span>' +
      '</div>';

    const planks = trackEl.querySelectorAll(".bridge-plank");
    const player = trackEl.querySelector(".bridge-player");
    const rival = trackEl.querySelector(".bridge-rival");

    function update(progress) {
      const f = fractions(level, progress);
      const lit = Math.round(f.player * PLANKS);
      planks.forEach((p, i) => p.classList.toggle("bridge-plank--on", i < lit));
      player.style.left = 6 + f.player * 76 + "%";
      rival.style.left = 6 + f.rival * 76 + "%";
    }

    function pulse(correct) {
      rePulse(player, correct ? "bridge-player--hop" : "bridge-player--wobble");
    }

    update({ elapsedMs: 0, totalCharsTyped: 0 });
    return { update, pulse };
  }

  // ---------- Space run (levels 9-10) ----------
  // Rocket flies through a scrolling starfield toward the goal; mistakes spark
  // a small explosion at the hull.

  function createSpace(trackEl, level) {
    const theme = level.raceTheme;
    trackEl.className = "race-track space-track";
    trackEl.innerHTML =
      '<div class="race-theme-label">' + theme.label + '</div>' +
      '<div class="space-field">' +
        '<span class="space-finish">' + theme.finishIcon + '</span>' +
        '<span class="space-actor space-actor--rival">' + theme.rivalIcon + '</span>' +
        '<span class="space-actor space-actor--player">' + theme.playerIcon + '</span>' +
      '</div>';

    const field = trackEl.querySelector(".space-field");
    const player = trackEl.querySelector(".space-actor--player");
    const rival = trackEl.querySelector(".space-actor--rival");

    function update(progress) {
      const f = fractions(level, progress);
      player.style.left = 4 + f.player * 80 + "%";
      rival.style.left = 4 + f.rival * 80 + "%";
    }

    function pulse(correct) {
      if (correct) {
        rePulse(player, "space-actor--thrust");
      } else {
        rePulse(player, "space-actor--hit");
        const boom = document.createElement("span");
        boom.className = "space-boom";
        boom.style.left = player.style.left || "4%";
        field.appendChild(boom);
        boom.textContent = "💥";
        setTimeout(() => boom.remove(), 450);
      }
    }

    update({ elapsedMs: 0, totalCharsTyped: 0 });
    return { update, pulse };
  }

  // ---------- Registry ----------

  const GAMES = {
    race: (trackEl, level) => TG.race.createRace(trackEl, level),
    fall: createFall,
    climb: createClimb,
    bridge: createBridge,
    space: createSpace
  };

  function create(trackEl, level) {
    const key = (level.raceTheme && level.raceTheme.game) || "race";
    const factory = GAMES[key] || GAMES.race;
    return factory(trackEl, level);
  }

  window.TG.minigames = { create };
})();
