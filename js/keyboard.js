// On-screen US keyboard & finger guide: highlights the NEXT key to press
// (derived from the visible target text) and overlays semi-transparent hands
// whose fingers rest on the home row; the guide finger physically travels to
// the target key and presses it. It never displays what the player typed —
// only the upcoming target key — so the blind-typing invariant holds.
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

  // One overlay finger per real finger. Its tip rests on `home`; `len`/`w`
  // are sized for a 30px key height and scale with the real key size.
  // `tilt` gives a natural splay; thumbs angle inward over the space bar
  // (`homeShift` offsets them from the space bar's center).
  const FINGERS = [
    { id: "lp", type: "p", home: "a", len: 58, w: 14, tilt: -7 },
    { id: "lr", type: "r", home: "s", len: 72, w: 15, tilt: -3 },
    { id: "lm", type: "m", home: "d", len: 78, w: 15, tilt: 0 },
    { id: "li", type: "i", home: "f", len: 72, w: 15, tilt: 3 },
    { id: "lt", type: "t", home: "Space", len: 38, w: 16, tilt: 42, homeShift: -0.17 },
    { id: "rt", type: "t", home: "Space", len: 38, w: 16, tilt: -42, homeShift: 0.17 },
    { id: "ri", type: "i", home: "j", len: 72, w: 15, tilt: -3 },
    { id: "rm", type: "m", home: "k", len: 78, w: 15, tilt: 0 },
    { id: "rr", type: "r", home: "l", len: 72, w: 15, tilt: 3 },
    { id: "rp", type: "p", home: ";", len: 58, w: 14, tilt: 7 }
  ];

  let container = null;
  let handsLayer = null;
  let layoutWidth = 0; // container width the current layout was computed for
  const keyEls = {}; // id → { el, finger }
  const fingerEls = {}; // finger id → { outer, body, def }
  const palmEls = {}; // "l"/"r" → el
  const anchors = {}; // finger id → { x, y } home/rest tip position
  let activeKeyEls = [];
  let activeFingers = [];

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
    if (container) {
      container.classList.toggle("kb-container--hidden", !visible);
      if (visible) ensureLayout();
    }
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

    handsLayer = document.createElement("div");
    handsLayer.className = "kb-hands-layer";
    ["l", "r"].forEach((side) => {
      const palm = document.createElement("div");
      palm.className = "kb-palm";
      palmEls[side] = palm;
      handsLayer.appendChild(palm);
    });
    FINGERS.forEach((def) => {
      const outer = document.createElement("div");
      outer.className = `kb-finger kb-finger--type-${def.type}`;
      const body = document.createElement("div");
      body.className = "kb-finger__body";
      outer.appendChild(body);
      fingerEls[def.id] = { outer, body, def };
      handsLayer.appendChild(outer);
    });

    container.appendChild(rowsEl);
    container.appendChild(handsLayer);
  }

  // Position fingers/palms from the real key geometry. Runs lazily because
  // offsets are 0 while the session screen is hidden (display: none).
  function ensureLayout() {
    if (!container) return false;
    const width = container.offsetWidth;
    if (!width) return false;
    if (width === layoutWidth) return true;
    layoutWidth = width;

    const scale = keyEls.f.el.offsetHeight / 30;
    FINGERS.forEach((def) => {
      const home = keyEls[def.home].el;
      const x = home.offsetLeft + home.offsetWidth * (0.5 + (def.homeShift || 0));
      const y = home.offsetTop + home.offsetHeight / 2;
      const w = def.w * scale;
      anchors[def.id] = { x, y };
      const f = fingerEls[def.id];
      f.outer.style.left = `${x - w / 2}px`;
      f.outer.style.top = `${y - 6 * scale}px`;
      f.outer.style.width = `${w}px`;
      f.outer.style.height = `${def.len * scale}px`;
      if (!f.outer.classList.contains("kb-finger--active")) {
        f.outer.style.transform = `rotate(${def.tilt}deg)`;
      }
    });

    ["l", "r"].forEach((side) => {
      const xPinky = anchors[side + "p"].x;
      const xIndex = anchors[side + "i"].x;
      const middle = fingerEls[side + "m"];
      const palmW = Math.abs(xIndex - xPinky) + 40 * scale;
      const palm = palmEls[side];
      palm.style.left = `${(xPinky + xIndex) / 2 - palmW / 2}px`;
      palm.style.top = `${anchors[side + "m"].y + middle.def.len * scale - 6 * scale}px`;
      palm.style.width = `${palmW}px`;
      palm.style.height = `${44 * scale}px`;
    });

    handsLayer.classList.add("kb-hands-layer--ready");
    return true;
  }

  function clearActive() {
    activeKeyEls.forEach((el) => el.classList.remove("kb-key--active"));
    activeKeyEls = [];
    activeFingers.forEach((f) => {
      f.outer.classList.remove("kb-finger--active");
      f.outer.style.transform = `rotate(${f.def.tilt}deg)`; // back to home rest
    });
    activeFingers = [];
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

  // Light the key and send the owning finger's tip traveling to it.
  function activateKey(keyId) {
    const entry = keyEls[keyId];
    if (!entry) return;
    entry.el.classList.add("kb-key--active");
    activeKeyEls.push(entry.el);

    const keyX = entry.el.offsetLeft + entry.el.offsetWidth / 2;
    const keyY = entry.el.offsetTop + entry.el.offsetHeight / 2;
    entry.finger.split(" ").forEach((fid) => {
      const f = fingerEls[fid];
      let a = anchors[fid];
      if (!a && ensureLayout()) a = anchors[fid]; // layout may have just become measurable
      if (!f || !a) return;
      // Thumbs already rest on the space bar; they press in place.
      const dx = fid[1] === "t" ? 0 : keyX - a.x;
      const dy = fid[1] === "t" ? 0 : keyY - a.y;
      f.outer.style.transform = `translate(${dx}px, ${dy}px) rotate(${f.def.tilt}deg)`;
      f.outer.classList.add("kb-finger--active");
      activeFingers.push(f);
    });
  }

  // Highlight the key + finger for the next expected character (null clears).
  // Shifted characters also send the opposite-hand pinky to its Shift key.
  function setNext(ch) {
    if (!container) return;
    ensureLayout();
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
    window.addEventListener("resize", () => {
      layoutWidth = 0; // force re-measure on next layout pass
      ensureLayout();
    });
  }

  window.TG.keyboard = { init, setNext, isVisible, setVisible };
})();
