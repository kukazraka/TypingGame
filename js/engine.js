// Core blind-typing engine: keystroke capture, correctness judging, WPM/accuracy, sound.
window.TG = window.TG || {};

(function () {
  const SOUND_KEY = "blindTypingGame.soundEnabled";

  function isSoundEnabled() {
    const raw = localStorage.getItem(SOUND_KEY);
    return raw === null ? true : raw === "true";
  }

  function setSoundEnabled(enabled) {
    try {
      localStorage.setItem(SOUND_KEY, String(enabled));
    } catch (err) {
      // ignore
    }
  }

  let audioCtx = null;
  function playTone(freq, duration) {
    if (!isSoundEnabled()) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      // audio not available; fail silently
    }
  }

  function playCorrect() {
    playTone(660, 0.08);
  }

  function playIncorrect() {
    playTone(180, 0.15);
  }

  function pickNextDrill(pool, lastDrill) {
    if (pool.length === 1) return pool[0];
    let next = lastDrill;
    while (next === lastDrill) {
      next = pool[Math.floor(Math.random() * pool.length)];
    }
    return next;
  }

  // Creates a typing session for a level. `handlers` may include:
  //   onCharResult({charIndex, correct, reverted})
  //   onDrillStart({drillIndex, text, isTimed})
  //   onDrillComplete({drillIndex})
  //   onProgress({elapsedMs, totalCharsTyped, limitMs})
  //   onSessionComplete(summary)
  function createSession(level, inputEl, handlers) {
    handlers = handlers || {};
    const isTimed = level.type === "timed";
    const drills = isTimed ? [pickNextDrill(level.drillPool, null)] : level.drills.slice();

    const state = {
      level,
      drills,
      currentDrillIndex: 0,
      currentText: drills[0],
      charIndex: 0,
      drillCharResults: [],
      totalCharsTyped: 0,
      correctChars: 0,
      startTime: null,
      endTime: null,
      finished: false,
      timerId: null
    };

    function currentChar() {
      return state.currentText[state.charIndex];
    }

    function handleChar(typed) {
      if (state.finished || !typed) return;
      if (state.startTime === null) {
        state.startTime = performance.now();
        startProgressTimer();
      }

      const expected = currentChar();
      const correct = typed === expected;
      state.totalCharsTyped++;
      if (correct) state.correctChars++;
      state.drillCharResults.push(correct);

      handlers.onCharResult &&
        handlers.onCharResult({ charIndex: state.charIndex, correct, reverted: false });

      correct ? playCorrect() : playIncorrect();

      state.charIndex++;

      if (state.charIndex >= state.currentText.length) {
        const finishedDrillIndex = state.currentDrillIndex;
        handlers.onDrillComplete && handlers.onDrillComplete({ drillIndex: finishedDrillIndex });
        advanceDrill();
      }
    }

    function handleBackspace() {
      if (state.finished || state.charIndex === 0) return;
      state.charIndex--;
      const wasCorrect = state.drillCharResults.pop();
      state.totalCharsTyped--;
      if (wasCorrect) state.correctChars--;
      handlers.onCharResult &&
        handlers.onCharResult({ charIndex: state.charIndex, correct: wasCorrect, reverted: true });
    }

    function advanceDrill() {
      state.drillCharResults = [];
      if (isTimed) {
        // Timed levels keep going until the timer ends this session.
        const next = pickNextDrill(level.drillPool, state.currentText);
        state.drills.push(next);
        state.currentDrillIndex++;
        state.currentText = next;
        state.charIndex = 0;
        handlers.onDrillStart &&
          handlers.onDrillStart({ drillIndex: state.currentDrillIndex, text: state.currentText, isTimed: true });
        return;
      }

      if (state.currentDrillIndex + 1 >= state.drills.length) {
        endSession();
        return;
      }
      state.currentDrillIndex++;
      state.currentText = state.drills[state.currentDrillIndex];
      state.charIndex = 0;
      handlers.onDrillStart &&
        handlers.onDrillStart({ drillIndex: state.currentDrillIndex, text: state.currentText, isTimed: false });
    }

    function startProgressTimer() {
      const limitMs = isTimed ? level.timeLimitSeconds * 1000 : undefined;
      state.timerId = setInterval(() => {
        const elapsedMs = performance.now() - state.startTime;
        handlers.onProgress &&
          handlers.onProgress({ elapsedMs, totalCharsTyped: state.totalCharsTyped, limitMs });
        if (isTimed && elapsedMs >= limitMs) {
          endSession();
        }
      }, 150);
    }

    function endSession() {
      if (state.finished) return;
      state.finished = true;
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
      state.endTime = performance.now();
      detachInput();

      const elapsedMs = state.startTime ? state.endTime - state.startTime : 0;
      const elapsedMinutes = Math.max(elapsedMs / 60000, 1 / 60000);
      const wpm = Math.round((state.totalCharsTyped / 5) / elapsedMinutes);
      const accuracy =
        state.totalCharsTyped === 0
          ? 100
          : Math.round((state.correctChars / state.totalCharsTyped) * 100);

      const passed =
        accuracy >= level.passCriteria.minAccuracy && wpm >= level.passCriteria.minWpm;

      handlers.onSessionComplete &&
        handlers.onSessionComplete({
          wpm,
          accuracy,
          elapsedMs,
          totalCharsTyped: state.totalCharsTyped,
          correctChars: state.correctChars,
          passed
        });
    }

    function onInput(e) {
      const value = inputEl.value;
      if (!value) return;
      const typed = (e.data && e.data.length === 1) ? e.data : value.slice(-1);
      inputEl.value = "";
      handleChar(typed);
    }

    function onKeydown(e) {
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      }
    }

    function attachInput() {
      inputEl.value = "";
      inputEl.addEventListener("input", onInput);
      inputEl.addEventListener("keydown", onKeydown);
      inputEl.focus();
    }

    function detachInput() {
      inputEl.removeEventListener("input", onInput);
      inputEl.removeEventListener("keydown", onKeydown);
    }

    function start() {
      attachInput();
      handlers.onDrillStart &&
        handlers.onDrillStart({ drillIndex: 0, text: state.currentText, isTimed });
    }

    function destroy() {
      if (state.timerId) clearInterval(state.timerId);
      detachInput();
    }

    return { start, destroy, endSession, state };
  }

  window.TG.engine = {
    createSession,
    isSoundEnabled,
    setSoundEnabled
  };
})();
