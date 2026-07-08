// Countdown, celebration animations, and procedural music for the Blind Typing Game.
// All audio is generated with the Web Audio API — no external assets.
window.TG = window.TG || {};

(function () {
  const NOTE = {
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
    A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98
  };

  // Victory jingle per race theme: [frequency, durationSeconds] pairs played in sequence.
  const JINGLES = {
    car:    { wave: "sawtooth", notes: [[NOTE.C5, .12], [NOTE.E5, .12], [NOTE.G5, .12], [NOTE.C6, .3]] },
    bike:   { wave: "triangle", notes: [[NOTE.E5, .15], [NOTE.G5, .15], [NOTE.A5, .15], [NOTE.G5, .12], [NOTE.C6, .35]] },
    horse:  { wave: "square",   notes: [[NOTE.G5, .1], [NOTE.G5, .1], [NOTE.E5, .12], [NOTE.G5, .1], [NOTE.C6, .32]] },
    boat:   { wave: "sine",     notes: [[NOTE.D5, .2], [NOTE.F5, .2], [NOTE.A5, .2], [NOTE.D6, .4]] },
    jet:    { wave: "sawtooth", notes: [[NOTE.C5, .09], [NOTE.D5, .09], [NOTE.E5, .09], [NOTE.G5, .09], [NOTE.C6, .12], [NOTE.E6, .3]] },
    runner: { wave: "triangle", notes: [[NOTE.E5, .1], [NOTE.E5, .1], [NOTE.F5, .12], [NOTE.G5, .12], [NOTE.C6, .3]] },
    skate:  { wave: "square",   notes: [[NOTE.A5, .12], [NOTE.G5, .12], [NOTE.A5, .12], [NOTE.C6, .15], [NOTE.E6, .3]] },
    rocket: { wave: "sawtooth", notes: [[NOTE.C5, .09], [NOTE.E5, .09], [NOTE.G5, .09], [NOTE.C6, .09], [NOTE.E6, .12], [NOTE.G6, .35]] },
    moto:   { wave: "square",   notes: [[NOTE.G5, .12], [NOTE.B5, .12], [NOTE.D6, .12], [NOTE.G6, .32]] },
    f1: {
      wave: "triangle",
      notes: [
        [NOTE.C5, .12], [NOTE.E5, .12], [NOTE.G5, .12], [NOTE.C6, .25],
        [NOTE.A5, .12], [NOTE.C6, .25], [NOTE.E6, .4],
        [NOTE.G5, .12], [NOTE.A5, .12], [NOTE.B5, .12], [NOTE.C6, .25],
        [NOTE.E6, .25], [NOTE.G6, .6],
        [NOTE.E6, .15], [NOTE.C6, .15], [NOTE.E6, .15], [NOTE.G6, .8]
      ]
    }
  };

  const CONFETTI_COLORS = ["#4ade80", "#7c9dff", "#facc15", "#f87171", "#e879f9"];

  let audioCtx = null;
  let timeouts = [];
  let activeResolve = null; // resolve fn of the celebration promise currently on screen

  function getCtx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function tone(freq, at, dur, wave, vol) {
    if (!TG.engine.isSoundEnabled()) return;
    try {
      const ctx = getCtx();
      const t = ctx.currentTime + at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (err) {
      // audio not available; fail silently
    }
  }

  function playJingle(themeKey) {
    const jingle = JINGLES[themeKey] || JINGLES.car;
    let at = 0;
    jingle.notes.forEach(([freq, dur]) => {
      if (freq) tone(freq, at, dur, jingle.wave, 0.12);
      at += dur;
    });
  }

  function schedule(fn, ms) {
    timeouts.push(setTimeout(fn, ms));
  }

  function clearScheduled() {
    timeouts.forEach(clearTimeout);
    timeouts = [];
  }

  function overlay() {
    return document.getElementById("fx-overlay");
  }

  function hideOverlay() {
    const o = overlay();
    o.className = "fx-overlay";
    o.innerHTML = "";
    o.onclick = null;
  }

  // Abort whatever is running (countdown or celebration) WITHOUT resolving its
  // promise — used when the player quits or a new session starts over the top.
  function cancel() {
    clearScheduled();
    activeResolve = null;
    hideOverlay();
  }

  // Finish the current celebration normally (or via tap-to-skip), resolving its promise.
  function endCelebration() {
    const resolve = activeResolve;
    cancel();
    if (resolve) resolve();
  }

  // ---------- Countdown ----------

  function countdown(onDone) {
    cancel();
    const o = overlay();
    o.className = "fx-overlay active fx-overlay--light";
    const steps = ["3", "2", "1", "GO!"];
    steps.forEach((label, i) => {
      schedule(() => {
        const isGo = label === "GO!";
        o.innerHTML = `<div class="fx-count${isGo ? " fx-count--go" : ""}">${label}</div>`;
        tone(isGo ? NOTE.G5 : 330, 0, isGo ? 0.3 : 0.12, "square", 0.1);
      }, i * 500);
    });
    schedule(() => {
      hideOverlay();
      onDone();
    }, steps.length * 500);
  }

  // ---------- Celebrations ----------

  function confettiHTML(count) {
    let html = "";
    for (let i = 0; i < count; i++) {
      const left = (Math.random() * 100).toFixed(1);
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const dur = (1.8 + Math.random() * 1.6).toFixed(2);
      const delay = (Math.random() * 0.9).toFixed(2);
      const tilt = Math.floor(Math.random() * 360);
      html += `<span class="fx-confetti" style="left:${left}%;background:${color};animation-duration:${dur}s;animation-delay:${delay}s;transform:rotate(${tilt}deg)"></span>`;
    }
    return html;
  }

  function celebrate(level, isFinal) {
    cancel();
    return new Promise((resolve) => {
      activeResolve = resolve;
      const o = overlay();
      o.className = "fx-overlay active";
      o.onclick = endCelebration;
      if (isFinal) {
        buildFinale(o, level);
      } else {
        buildLevelPassed(o, level);
      }
    });
  }

  function buildLevelPassed(o, level) {
    const theme = level.raceTheme;
    o.innerHTML =
      confettiHTML(30) +
      `<div class="fx-center">
         <div class="fx-title">Level ${level.order} Passed!</div>
         <div class="fx-sub">${theme.label} complete</div>
       </div>
       <span class="fx-actor fx-cruise">${theme.playerIcon}</span>`;
    playJingle(theme.key);
    schedule(endCelebration, 2400);
  }

  function buildFinale(o, level) {
    const theme = level.raceTheme;
    o.innerHTML =
      confettiHTML(80) +
      `<div class="fx-center">
         <div class="fx-title fx-title--big">🏁 GRAND PRIX CHAMPION 🏁</div>
         <div id="fx-caption" class="fx-caption"></div>
         <div id="fx-trophy-slot" class="fx-trophy-slot"></div>
       </div>
       <span id="fx-rival" class="fx-actor fx-stall">${theme.rivalIcon}</span>
       <div class="fx-skip">tap anywhere to skip</div>`;
    playJingle("f1");

    const captions = [
      "The rival never saw you coming. To be fair, you weren't looking either.",
      "10/10 levels beaten — your eyes are officially unemployed.",
      "Your keyboard has filed a complaint: “too fast, too furious.”"
    ];
    const setCaption = (i) => {
      const c = document.getElementById("fx-caption");
      if (c) c.textContent = captions[i];
    };

    schedule(() => setCaption(0), 400);

    // Rival spins out mid-screen with a crash puff.
    schedule(() => {
      const rival = document.getElementById("fx-rival");
      if (rival) rival.insertAdjacentHTML("afterend", '<span class="fx-crash">💥💨</span>');
    }, 1700);

    // Player zooms past doing a victory flip.
    schedule(() => {
      overlay().insertAdjacentHTML("beforeend", `<span class="fx-actor fx-zoom">${theme.playerIcon}</span>`);
    }, 2600);

    // Trophy drop, fireworks, and sparkle notes.
    schedule(() => {
      const slot = document.getElementById("fx-trophy-slot");
      if (slot) slot.innerHTML = '<span class="fx-trophy">🏆</span>';
      setCaption(1);
      for (let i = 0; i < 6; i++) {
        const left = (10 + Math.random() * 80).toFixed(1);
        const top = (10 + Math.random() * 50).toFixed(1);
        schedule(() => {
          overlay().insertAdjacentHTML(
            "beforeend",
            `<span class="fx-firework" style="left:${left}%;top:${top}%">🎆</span>`
          );
          tone(i % 2 ? NOTE.E6 : NOTE.G6, 0, 0.15, "triangle", 0.08);
        }, i * 450);
      }
    }, 3800);

    schedule(() => setCaption(2), 6300);
    schedule(endCelebration, 8800);
  }

  window.TG.fx = { countdown, celebrate, cancel };
})();
