// Level data for the Blind Typing Game.
window.TG = window.TG || {};

window.TG.LEVELS = [
  {
    id: "l1-home-row",
    order: 1,
    title: "Home Row Basics",
    description: "Rest your fingers on ASDF JKL; and don't look down.",
    type: "chars",
    drills: [
      "asdf jkl; asdf jkl;",
      "fj dk sl a; fj dk sl a;",
      "ask fall jak all sad"
    ],
    passCriteria: { minAccuracy: 90, minWpm: 10 },
    raceTheme: { key: "car", label: "Street Race", playerIcon: "🏎️", rivalIcon: "🚙", finishIcon: "🏁" }
  },
  {
    id: "l2-home-row-words",
    order: 2,
    title: "Home Row Words",
    description: "Real words, still on the home row.",
    type: "words",
    drills: [
      "dad fall ask lad sad glad"
    ],
    passCriteria: { minAccuracy: 90, minWpm: 12 },
    raceTheme: { key: "bike", label: "Park Ride", playerIcon: "🚴", rivalIcon: "🚴‍♀️", finishIcon: "🏁" }
  },
  {
    id: "l3-top-row",
    order: 3,
    title: "Top Row Add-On",
    description: "Stretch up to QWERTYUIOP.",
    type: "chars",
    drills: [
      "qwer tyui op qwer tyui",
      "wet quip your true riot"
    ],
    passCriteria: { minAccuracy: 88, minWpm: 12 },
    raceTheme: { key: "horse", label: "Derby Dash", playerIcon: "🐎", rivalIcon: "🐴", finishIcon: "🏁" }
  },
  {
    id: "l4-bottom-row",
    order: 4,
    title: "Bottom Row Add-On",
    description: "Down to ZXCVBNM.",
    type: "chars",
    drills: [
      "zxcv bnm, zxcv bnm,",
      "mix zeal calm brave zoo"
    ],
    passCriteria: { minAccuracy: 88, minWpm: 12 },
    raceTheme: { key: "boat", label: "Harbor Sprint", playerIcon: "🚤", rivalIcon: "⛵", finishIcon: "🏁" }
  },
  {
    id: "l5-full-alphabet",
    order: 5,
    title: "Full Alphabet Flow",
    description: "Every letter, one classic sentence.",
    type: "chars",
    drills: [
      "the quick brown fox jumps over the lazy dog"
    ],
    passCriteria: { minAccuracy: 85, minWpm: 15 },
    raceTheme: { key: "jet", label: "Sky Chase", playerIcon: "✈️", rivalIcon: "🛩️", finishIcon: "🏁" }
  },
  {
    id: "l6-common-words",
    order: 6,
    title: "Common Words",
    description: "The words you'll type most often.",
    type: "words",
    drills: [
      "the be to of and a in that have I it for not on with he as you do"
    ],
    passCriteria: { minAccuracy: 88, minWpm: 18 },
    raceTheme: { key: "runner", label: "Track Sprint", playerIcon: "🏃", rivalIcon: "🏃‍♀️", finishIcon: "🏁" }
  },
  {
    id: "l7-sentences",
    order: 7,
    title: "Everyday Sentences",
    description: "Full sentences with real punctuation.",
    type: "sentences",
    drills: [
      "She sells seashells by the seashore.",
      "Practice makes progress, not perfection."
    ],
    passCriteria: { minAccuracy: 90, minWpm: 20 },
    raceTheme: { key: "skate", label: "Street Roll", playerIcon: "🛹", rivalIcon: "🛼", finishIcon: "🏁" }
  },
  {
    id: "l8-numbers-punctuation",
    order: 8,
    title: "Numbers & Punctuation",
    description: "Symbols and digits enter the mix.",
    type: "chars",
    drills: [
      "Order #4529: 12 items @ $3.75 each, total $45.00!",
      "Is it 50% off, or 15%?"
    ],
    passCriteria: { minAccuracy: 85, minWpm: 18 },
    raceTheme: { key: "rocket", label: "Orbit Run", playerIcon: "🚀", rivalIcon: "🛸", finishIcon: "🏁" }
  },
  {
    id: "l9-mixed-challenge",
    order: 9,
    title: "Mixed Challenge",
    description: "Case, punctuation, and numbers together.",
    type: "sentences",
    drills: [
      "In 2024, Dr. Alvarez shipped 3 releases — each one faster, safer, and (frankly) better than the last!",
      "\"Can you believe it?\" she asked, typing at 87 WPM without a single glance at her hands."
    ],
    passCriteria: { minAccuracy: 85, minWpm: 22 },
    raceTheme: { key: "moto", label: "Highway Run", playerIcon: "🏍️", rivalIcon: "🛵", finishIcon: "🏁" }
  },
  {
    id: "l10-speed-gauntlet",
    order: 10,
    title: "Speed Gauntlet",
    description: "60 seconds. Type as much as you can, blind.",
    type: "timed",
    timeLimitSeconds: 60,
    drillPool: [
      "the quick brown fox jumps over the lazy dog",
      "she sells seashells by the seashore",
      "practice makes progress not perfection",
      "a journey of a thousand miles begins with a single step",
      "the early bird catches the worm but the second mouse gets the cheese",
      "typing without looking builds real muscle memory",
      "focus on accuracy first and speed will follow",
      "keep your fingers on the home row at all times"
    ],
    passCriteria: { minAccuracy: 90, minWpm: 30 },
    raceTheme: { key: "f1", label: "Grand Prix", playerIcon: "🏎️", rivalIcon: "🚗", finishIcon: "🏆" }
  }
];
