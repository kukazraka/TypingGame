// On-screen US keyboard & finger guide: highlights the NEXT key to press
// (derived from the visible target text) and which finger should press it.
// It never displays what the player typed — only the upcoming target key —
// so the blind-typing invariant holds.
window.TG = window.TG || {};

(function () {
  const VISIBLE_KEY = "blindTypingGame.keyboardGuideVisible";

  // Key = [id, label, finger, flex]. Finger ids: hand (l/r) + finger
  // (p=pinky, r=ring, m=middle, i=index, t=thumb). finger=null → decorative.
  const KEY_ROWS = [
    [
      ["`", "`", "lp"], ["1", "1", "lp"], ["2", "2", "lr"], ["3", "3", "lm"],
      ["4", "4", "li"], ["5", "5", "li"], ["6", "6", "ri"], ["7", "7", "ri"],
      ["8", "8", "rm"], ["9", "9", "rr"], ["0", "0", "rp"], ["-", "-", "rp"],
      ["=", "=", "rp"], ["Backspace", "⌫", null, 1.7]
    ],
    [
      ["Tab", "⇥", null, 1.7],
      ["q", "q", "lp"], ["w", "w", "lr"], ["e", "e", "lm"], ["r", "r", "li"],
      ["t", "t", "li"], ["y", "y", "ri"], ["u", "u", "ri"], ["i", "i", "rm"],
      ["o", "o", "rr"], ["p", "p", "rp"], ["[", "[", "rp"], ["]", "]", "rp"],
      ["\\", "\\", "rp"]
    ],
    [
      ["Caps", "⇪", null, 2],
      ["a", "a", "lp"], ["s", "s", "lr"], ["d", "d", "lm"], ["f", "f", "li"],
      ["g", "g", "li"], ["h", "h", "ri"], ["j", "j", "ri"], ["k", "k", "rm"],
      ["l", "l", "rr"], [";", ";", "rp"], ["'", "'", "rp"],
      ["Enter", "⏎", null, 2]
    ],
    [
      ["ShiftL", "⇧", "lp", 2.5],
      ["z", "z", "lp"], ["x", "x", "lr"], ["c", "c", "lm"], ["v", "v", "li"],
      ["b", "b", "li"], ["n", "n", "ri"], ["m", "m", "ri"], [",", ",", "rm"],
      [".", ".", "rr"], ["/", "/", "rp"],
      ["ShiftR", "⇧", "rp", 2.5]
    ],
    [
      ["CtrlL", "ctrl", null, 1.4], ["AltL", "alt", null, 1.4],
      ["Space", "", "lt rt", 6.5],
      ["AltR", "alt", null, 1.4], ["CtrlR", "ctrl", null, 1.4]
    ]
  ];

  // Shifted symbol → the physical key that produces it.
  const SHIFTED = {
    "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6",
    "&": "7", "*": "8", "(": "9", ")": "0", "_": "-", "+": "=",
    "{": "[", "}": "]", "|": "\\", ":": ";", "\"": "'", "<": ",", ">": ".", "?": "/"
  };

  let container = null;
  const keyEls = {}; // id → { el, finger }
  const fingerEls = {}; // finger id → el
  let activeEls = [];

  function isVisible() {
    const raw = localStorage.getItem(VISIBLE_KEY);
    return raw === null ? true : raw === "true";
  }

  function setVisible(visible) {
    try {
      localStorage.setItem(VISIBLE_KEY, String(visible));
    } catch (err) {
      // ignore (private browsing)
    }
    if (container) container.classList.toggle("kb-container--hidden", !visible);
  }

  function buildHand(side) {
    const hand = document.createElement("div");
    hand.className = `kb-hand kb-hand--${side}`;
    const fingers = document.createElement("div");
    fingers.className = "kb-hand__fingers";
    const order = side === "left" ? ["p", "r", "m", "i", "t"] : ["t", "i", "m", "r", "p"];
    order.forEach((f) => {
      const fingerEl = document.createElement("div");
      fingerEl.className = `kb-finger kb-finger--${f}`;
      fingerEls[side[0] + f] = fingerEl;
      fingers.appendChild(fingerEl);
    });
    const palm = document.createElement("div");
    palm.className = "kb-hand__palm";
    palm.textContent = side === "left" ? "L" : "R";
    hand.appendChild(fingers);
    hand.appendChild(palm);
    return hand;
  }

  function build() {
    container.innerHTML = "";
    container.classList.add("kb-container");

    const rowsEl = document.createElement("div");
    rowsEl.className = "kb-rows";
    KEY_ROWS.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      row.forEach(([id, label, finger, flex]) => {
        const keyEl = document.createElement("div");
        keyEl.className =
          "kb-key" + (finger ? ` kb-key--${finger.split(" ")[0][1]}` : " kb-key--dead");
        if (id === "f" || id === "j") keyEl.classList.add("kb-key--home");
        keyEl.textContent = label;
        keyEl.style.flex = String(flex || 1);
        if (finger) keyEls[id] = { el: keyEl, finger };
        rowEl.appendChild(keyEl);
      });
      rowsEl.appendChild(rowEl);
    });

    const handsEl = document.createElement("div");
    handsEl.className = "kb-hands";
    handsEl.appendChild(buildHand("left"));
    handsEl.appendChild(buildHand("right"));

    container.appendChild(rowsEl);
    container.appendChild(handsEl);
  }

  function clearActive() {
    activeEls.forEach((elm) => elm.classList.remove("kb-key--active", "kb-finger--active"));
    activeEls = [];
  }

  // Resolve a target character to { keyId, needsShift }, or null if unmapped.
  function resolveChar(ch) {
    if (ch === " ") return { keyId: "Space", needsShift: false };
    if (keyEls[ch]) return { keyId: ch, needsShift: false };
    const lower = ch.toLowerCase();
    if (ch !== lower && keyEls[lower]) return { keyId: lower, needsShift: true };
    if (SHIFTED[ch]) return { keyId: SHIFTED[ch], needsShift: true };
    return null;
  }

  function activateKey(keyId) {
    const entry = keyEls[keyId];
    if (!entry) return;
    entry.el.classList.add("kb-key--active");
    activeEls.push(entry.el);
    entry.finger.split(" ").forEach((f) => {
      const fingerEl = fingerEls[f];
      if (fingerEl) {
        fingerEl.classList.add("kb-finger--active");
        activeEls.push(fingerEl);
      }
    });
  }

  // Highlight the key + finger for the next expected character (null clears).
  // Shifted characters also light up the opposite-hand Shift key.
  function setNext(ch) {
    if (!container) return;
    clearActive();
    if (!ch) return;
    const resolved = resolveChar(ch);
    if (!resolved) return;
    activateKey(resolved.keyId);
    if (resolved.needsShift) {
      const hand = keyEls[resolved.keyId].finger[0];
      activateKey(hand === "l" ? "ShiftR" : "ShiftL");
    }
  }

  function init(el) {
    container = el;
    build();
    setVisible(isVisible());
  }

  window.TG.keyboard = { init, setNext, isVisible, setVisible };
})();
