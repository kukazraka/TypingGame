// Screen flow, DOM rendering, and event wiring for the Blind Typing Game.
window.TG = window.TG || {};

(function () {
  let progress = null;
  let levels = null;
  let currentLevel = null;
  let currentSession = null;
  let currentRace = null;
  let justUnlockedLevel = null;

  const el = {}; // populated in init() with DOM references

  function qs(id) {
    return document.getElementById(id);
  }

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    qs(`screen-${name}`).classList.add("active");
  }

  function starsFor(levelState, passCriteria) {
    if (!levelState.completed) return 0;
    const wpmRatio = levelState.bestWpm / passCriteria.minWpm;
    if (wpmRatio >= 1.5) return 3;
    if (wpmRatio >= 1.2) return 2;
    return 1;
  }

  // ---------- Level Select ----------

  function renderLevelSelect() {
    el.levelGrid.innerHTML = "";
    levels.forEach((level) => {
      const state = progress.levels[level.id];
      const card = document.createElement("button");
      card.className = "level-card" + (state.unlocked ? "" : " locked");
      card.type = "button";

      const orderEl = document.createElement("div");
      orderEl.className = "level-card__order";
      orderEl.textContent = state.unlocked ? String(level.order) : "🔒";
      card.appendChild(orderEl);

      const titleEl = document.createElement("div");
      titleEl.className = "level-card__title";
      titleEl.textContent = level.title;
      card.appendChild(titleEl);

      if (state.unlocked) {
        const descEl = document.createElement("div");
        descEl.className = "level-card__desc";
        descEl.textContent = level.description;
        card.appendChild(descEl);

        if (state.completed) {
          const statsEl = document.createElement("div");
          statsEl.className = "level-card__stats";
          const stars = starsFor(state, level.passCriteria);
          statsEl.innerHTML =
            `<span class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>` +
            `<span>${state.bestWpm} WPM · ${state.bestAccuracy}%</span>`;
          card.appendChild(statsEl);
        }

        card.addEventListener("click", () => openLevelIntro(level.id));
      } else {
        card.addEventListener("click", () => {
          card.classList.add("shake");
          setTimeout(() => card.classList.remove("shake"), 400);
        });
      }

      el.levelGrid.appendChild(card);
    });

    const sessions = progress.totals.totalSessionsPlayed;
    const mins = Math.round(progress.totals.totalTimeTypingMs / 60000);
    el.menuStats.textContent = sessions
      ? `${sessions} session${sessions === 1 ? "" : "s"} played · ${mins} min of blind typing`
      : "";
  }

  // ---------- Level Intro ----------

  function openLevelIntro(levelId) {
    currentLevel = levels.find((l) => l.id === levelId);
    el.introTitle.textContent = `Level ${currentLevel.order} · ${currentLevel.title}`;
    el.introDescription.textContent = currentLevel.description;
    const c = currentLevel.passCriteria;
    el.introCriteria.textContent = `Pass: ${c.minWpm}+ WPM at ${c.minAccuracy}%+ accuracy`;
    if (currentLevel.type === "timed") {
      el.introCriteria.textContent += ` · ${currentLevel.timeLimitSeconds}s time limit`;
    }
    const state = progress.levels[levelId];
    if (state.completed) {
      el.introBest.textContent = `Best: ${state.bestWpm} WPM · ${state.bestAccuracy}% accuracy`;
      el.introBest.style.display = "";
    } else {
      el.introBest.style.display = "none";
    }
    showScreen("intro");
  }

  // ---------- Blind Typing Session ----------

  function renderPrompt(text) {
    el.sessionPrompt.innerHTML = "";
    [...text].forEach((ch) => {
      const charSpan = document.createElement("span");
      charSpan.className = "prompt-char";
      charSpan.textContent = ch;
      el.sessionPrompt.appendChild(charSpan);
    });
  }

  function markPromptChar(index, correct) {
    const charSpan = el.sessionPrompt.children[index];
    if (!charSpan) return;
    charSpan.classList.remove("prompt-char--correct", "prompt-char--incorrect");
    charSpan.classList.add(correct ? "prompt-char--correct" : "prompt-char--incorrect");
  }

  function revertPromptChar(index) {
    const charSpan = el.sessionPrompt.children[index];
    if (!charSpan) return;
    charSpan.classList.remove("prompt-char--correct", "prompt-char--incorrect");
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    return `${totalSeconds}s`;
  }

  function startSession() {
    TG.fx.cancel();
    if (currentSession) {
      currentSession.destroy();
      currentSession = null;
    }

    const state = progress.levels[currentLevel.id];
    state.attempts++;
    state.lastPlayed = new Date().toISOString();
    progress.totals.totalSessionsPlayed++;
    TG.storage.saveProgress(progress);

    showScreen("session");
    el.sessionLevelLabel.textContent = `Level ${currentLevel.order} · ${currentLevel.title}`;
    el.sessionStatus.textContent = "Get ready…";
    el.sessionPrompt.innerHTML = "";
    currentRace = TG.minigames.create(el.sessionRace, currentLevel);

    TG.fx.countdown(createAndStartEngineSession);
  }

  function createAndStartEngineSession() {
    currentSession = TG.engine.createSession(currentLevel, el.hiddenInput, {
      onDrillStart({ drillIndex, text, isTimed }) {
        renderPrompt(text);
        if (!isTimed) {
          el.sessionStatus.textContent = `Drill ${drillIndex + 1} / ${currentLevel.drills.length}`;
        }
      },
      onCharResult({ charIndex, correct, reverted }) {
        if (reverted) {
          revertPromptChar(charIndex);
        } else {
          markPromptChar(charIndex, correct);
          currentRace.pulse(correct);
        }
      },
      onProgress({ elapsedMs, totalCharsTyped, limitMs }) {
        currentRace.update({ elapsedMs, totalCharsTyped, limitMs });
        if (currentLevel.type === "timed") {
          el.sessionStatus.textContent = `Time left: ${formatTime(limitMs - elapsedMs)}`;
        }
      },
      onSessionComplete(summary) {
        finishSession(summary);
      }
    });

    currentSession.start();
  }

  function quitSession() {
    TG.fx.cancel();
    if (currentSession) currentSession.destroy();
    currentSession = null;
    currentRace = null;
    renderLevelSelect();
    showScreen("menu");
  }

  // ---------- Results ----------

  function finishSession(summary) {
    currentSession = null;
    currentRace = null;
    const state = progress.levels[currentLevel.id];
    const prevBestWpm = state.bestWpm;
    const prevBestAccuracy = state.bestAccuracy;
    const isNewBest = summary.wpm > prevBestWpm || summary.accuracy > prevBestAccuracy;

    state.bestWpm = Math.max(state.bestWpm, summary.wpm);
    state.bestAccuracy = Math.max(state.bestAccuracy, summary.accuracy);
    progress.totals.totalTimeTypingMs += summary.elapsedMs;

    justUnlockedLevel = null;
    if (summary.passed) {
      state.completed = true;
      const nextLevel = levels.find((l) => l.order === currentLevel.order + 1);
      if (nextLevel) {
        const nextState = progress.levels[nextLevel.id];
        if (!nextState.unlocked) {
          nextState.unlocked = true;
          justUnlockedLevel = nextLevel;
        }
      }
    }

    TG.storage.saveProgress(progress);

    el.resultsBanner.textContent = summary.passed ? "Level Passed!" : "Try Again";
    el.resultsBanner.className = "results-banner " + (summary.passed ? "passed" : "failed");
    el.resultsWpm.textContent = summary.wpm;
    el.resultsAccuracy.textContent = summary.accuracy + "%";
    const stars = summary.passed ? starsFor(state, currentLevel.passCriteria) : 0;
    el.resultsStars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    el.resultsBest.style.display = isNewBest && summary.passed ? "" : "none";
    if (justUnlockedLevel) {
      el.resultsNextBtn.textContent = `Level ${justUnlockedLevel.order} →`;
      el.resultsNextBtn.style.display = "";
    } else {
      el.resultsNextBtn.style.display = "none";
    }

    if (summary.passed) {
      const isFinal = currentLevel.order === levels[levels.length - 1].order;
      TG.fx.celebrate(currentLevel, isFinal).then(() => showScreen("results"));
    } else {
      showScreen("results");
    }
  }

  // ---------- Init ----------

  function cacheDom() {
    el.levelGrid = qs("level-grid");
    el.menuStats = qs("menu-stats");
    el.resetBtn = qs("reset-btn");
    el.screenSession = qs("screen-session");
    el.introTitle = qs("intro-title");
    el.introDescription = qs("intro-description");
    el.introCriteria = qs("intro-criteria");
    el.introBest = qs("intro-best");
    el.introStartBtn = qs("intro-start-btn");
    el.introBackBtn = qs("intro-back-btn");
    el.sessionLevelLabel = qs("session-level-label");
    el.sessionPrompt = qs("session-prompt");
    el.sessionRace = qs("session-race");
    el.sessionStatus = qs("session-status");
    el.sessionQuitBtn = qs("session-quit-btn");
    el.hiddenInput = qs("hidden-input");
    el.resultsBanner = qs("results-banner");
    el.resultsWpm = qs("results-wpm");
    el.resultsAccuracy = qs("results-accuracy");
    el.resultsStars = qs("results-stars");
    el.resultsBest = qs("results-best");
    el.resultsRetryBtn = qs("results-retry-btn");
    el.resultsMenuBtn = qs("results-menu-btn");
    el.resultsNextBtn = qs("results-next-btn");
    el.soundToggleBtn = qs("sound-toggle-btn");
  }

  function wireEvents() {
    el.introStartBtn.addEventListener("click", startSession);
    el.introBackBtn.addEventListener("click", () => showScreen("menu"));
    el.sessionQuitBtn.addEventListener("click", quitSession);
    el.resultsRetryBtn.addEventListener("click", startSession);
    el.resultsMenuBtn.addEventListener("click", () => {
      renderLevelSelect();
      showScreen("menu");
    });
    el.resultsNextBtn.addEventListener("click", () => {
      if (justUnlockedLevel) openLevelIntro(justUnlockedLevel.id);
    });

    el.soundToggleBtn.addEventListener("click", () => {
      const enabled = !TG.engine.isSoundEnabled();
      TG.engine.setSoundEnabled(enabled);
      updateSoundToggle();
    });

    el.resetBtn.addEventListener("click", () => {
      const ok = window.confirm("Reset all progress? Unlocked levels, stars, and best scores will be cleared.");
      if (!ok) return;
      TG.fx.cancel();
      if (currentSession) {
        currentSession.destroy();
        currentSession = null;
      }
      progress = TG.storage.initDefaultProgress(levels);
      TG.storage.saveProgress(progress);
      renderLevelSelect();
      showScreen("menu");
    });

    // Escape quits the current session (works during the countdown too).
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el.screenSession.classList.contains("active")) {
        quitSession();
      }
    });

    // Clicking anywhere on the session screen re-focuses the hidden input,
    // so typing recovers if focus was lost (e.g. after clicking elsewhere).
    el.screenSession.addEventListener("click", (e) => {
      if (currentSession && e.target !== el.sessionQuitBtn) {
        el.hiddenInput.focus();
      }
    });
  }

  function updateSoundToggle() {
    const enabled = TG.engine.isSoundEnabled();
    el.soundToggleBtn.textContent = enabled ? "🔊 Sound On" : "🔇 Sound Off";
  }

  function init(loadedProgress, loadedLevels) {
    progress = loadedProgress;
    levels = loadedLevels;
    cacheDom();
    wireEvents();
    updateSoundToggle();
    renderLevelSelect();
    showScreen("menu");
  }

  window.TG.ui = { init };
})();
