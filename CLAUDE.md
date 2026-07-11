# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based "blind typing" trainer: the target text stays visible, but the player's own keystrokes are **never echoed on screen**. Feedback is limited to per-character color tinting on the prompt and a themed race mini-game. This blind constraint is the core product invariant — do not add any UI that displays what the user typed.

## Running & developing

Pure vanilla HTML/CSS/JS with **no build step, no dependencies, no tests**. Open `index.html` directly (`file://`) or serve the folder:

```
python3 -m http.server 8765    # then open http://localhost:8765
```

`.claude/launch.json` defines this as the `typing-game` preview server. There is no lint/build/test tooling — verification is manual in the browser (play a level, refresh to confirm persistence, check the DevTools console for errors).

## Architecture

Scripts load as **plain `<script>` tags** (not ES modules — this is deliberate so `file://` works without CORS issues) in a strict dependency order set in `index.html`:

```
storage.js → levels.js → engine.js → race.js → minigames.js → keyboard.js → fx.js → ui.js → main.js
```

Each file is an IIFE that attaches one API to a shared global `window.TG` namespace. If you add a module, wire it into the namespace and insert its `<script>` tag **before** its consumers.

- **`levels.js`** — `TG.LEVELS`, an ordered array of level objects. A level has `id`, `order`, `title`, `type` (`chars`|`words`|`sentences`|`timed`), `drills` (array of strings typed in sequence) or `drillPool`+`timeLimitSeconds` for `timed`, `passCriteria: {minWpm, minAccuracy}`, and `raceTheme` (icons + `key` used for per-level race styling and victory jingle). This is pure data — the primary file to edit when changing content/difficulty. Respect each level's implied key-set (e.g. level 2 drills must stay on the home row).
- **`storage.js`** — `TG.storage.{loadProgress, saveProgress, initDefaultProgress}`. Single localStorage key `blindTypingGame.progress`, a versioned object (`version`, `levels{}`, `totals{}`). `loadProgress` self-heals: missing/corrupt data falls back to defaults, and levels newly added to `TG.LEVELS` are back-filled. `saveProgress` degrades to an in-memory fallback if localStorage throws (private browsing).
- **`engine.js`** — `TG.engine.createSession(level, inputEl, handlers)` plus sound-toggle helpers. **This is where the blind mechanic lives**: keystrokes are captured via `input`/`beforeinput` on an off-screen `#hidden-input`, and `inputEl.value` is cleared after **every** keystroke so nothing typed ever accumulates or is visible. Scoring: gross WPM = `(totalCharsTyped/5)/elapsedMinutes`, accuracy = correct/attempted; timing starts on first keystroke. Policy is **forgiving-but-tracked** — wrong keys still advance the cursor (so the blind player never gets silently stuck) but count as errors; Backspace reverts. The engine is UI-agnostic and drives everything through the `handlers` callbacks: `onCharResult`, `onDrillStart`, `onDrillComplete`, `onProgress`, `onSessionComplete`.
- **`race.js`** — `TG.race.createRace(trackEl, level)` → `{update, pulse}`. The horizontal race mini-game (levels 1-2): player vehicle position tracks typed progress; a rival vehicle paces at the level's `minWpm` threshold.
- **`minigames.js`** — `TG.minigames.create(trackEl, level)`, a registry dispatching on `raceTheme.game` (`race`|`fall`|`climb`|`bridge`|`space`). Each level pair gets a different game visual — falling letters, balloon climb, bridge builder, space run — but **all implement the same `{update({elapsedMs, totalCharsTyped, limitMs}), pulse(correct)}` contract**, fed by the engine's `onProgress` and `onCharResult`. New games go in this registry; they must never render typed characters (target text is fine — it's already visible in the prompt). The `fall` game requires static `drills` (it derives the letter queue from `drills.join("")` and cursor position = `totalCharsTyped`), so don't assign it to `timed` levels.
- **`keyboard.js`** — `TG.keyboard.{init, setNext, isVisible, setVisible}`. On-screen US keyboard + finger guide shown below the mini-game during sessions, with a show/hide toggle persisted in localStorage (`blindTypingGame.keyboardGuideVisible`). `setNext(ch)` highlights the key (plus opposite-hand Shift when needed) and finger for the next **target** character — only ever feed it target-text characters, never what the player typed.
- **`fx.js`** — `TG.fx.{countdown, celebrate, cancel}`. Owns the full-screen `#fx-overlay`: the 3-2-1-GO pre-session countdown, per-theme victory celebrations, and the extended comedic finale for the final level (`celebrate(level, isFinal)` returns a Promise that resolves when the animation ends or is tap-skipped). **All audio is procedurally generated with the Web Audio API** — no asset files. Any celebratory sound belongs here, gated on `TG.engine.isSoundEnabled()`.
- **`ui.js`** — `TG.ui.init(progress, levels)`. The orchestrator/state machine. Toggles the four `.screen` sections (menu → intro → session → results), renders the prompt as per-character `<span>`s, and wires the engine + race + fx together. The screen flow sequence for a session is: `countdown → engine session → celebrate() Promise → results`. Owns robustness behaviors (Escape-to-quit, click-to-refocus the hidden input, reset-progress).
- **`main.js`** — bootstrap on `DOMContentLoaded`: load progress, call `TG.ui.init`.

## Conventions

- New progress fields go through `initDefaultProgress` (for defaults + back-fill) and bump the schema `version` only if a migration in `storage.js` is needed.
- The engine must stay presentation-free — visual/audio effects react to its callbacks; don't reach into the DOM from `engine.js`.
