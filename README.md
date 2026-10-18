# Crystal Quest: Gem Legends

An original, mobile-first **match-3 puzzle adventure** built as a pure static
HTML5 / CSS / JavaScript site — **no build step, no dependencies, no server code**.

Swap adjacent gems to line up three or more, trigger cascades, forge special
gems, and clear each level's objectives before you run out of moves. The game
ships with **27 handcrafted levels**, a level map, synthesized audio (Web Audio
API), and a responsive touch-first UI.

Levels 21–26 introduce the game's signature mechanic, **Crystal Resonance**:
glowing energy veins run through the board. Match a crystal on a vein node and
energy travels down the vein, shattering every crystal it reaches — the longer
the vein, the bigger the chain. Blockers absorb the energy, so plan the path.

## Running it locally

The game is fully static, so any static file server works. From the project root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

> Opening `index.html` directly via `file://` may work, but a local server is
> recommended so that relative asset paths and audio behave consistently.

## Project structure

```
.
├── index.html          # App shell, meta tags, canvas + UI containers
├── styles.css          # All styling (mobile-first, responsive)
├── manifest.json       # PWA web app manifest
├── sw.js               # Versioned offline service worker
├── icon.svg            # App icon (SVG)
├── js/
│   ├── audio.js        # Web Audio API — synthesized SFX and music
│   ├── levels.js       # Level definitions (layouts, objectives, stars, hints)
│   ├── engine.js       # Core match-3 engine (board, matches, cascades, resonance)
│   ├── render.js       # Canvas rendering of the board, veins and effects
│   ├── ui.js           # Screens, HUD, level map, dialogs, save
│   └── main.js         # Bootstrap / wiring / built-in self-test (CQTest)
├── dev/
│   ├── harness.js      # Headless test harness (dev only, not loaded by the game)
│   ├── bot.js          # Seeded playtest bot for win-rate measurement (dev only)
│   └── debug.js        # Local debug panel, loaded only with ?debug=1 (dev only)
├── tests/
│   └── game.test.js    # Node regression suite
└── images/
    ├── bg_cavern.jpg   # Cavern background
    └── bg_map.jpg      # Level-map background
```

## How to play

- **Swap** two adjacent gems by tapping/dragging to form a line of 3 or more.
- Matches **cascade**: cleared gems fall, new gems drop in, and chains score extra.
- Special gems are created from larger matches and clear rows, columns, or areas.
- **Resonance**: from level 21 on, match a crystal on a glowing vein node to send
  energy down the vein and chain-clear everything it reaches.
- Each level defines **move limits**, **objectives** (score, gem types, ice,
  resonance, etc.), and a **star rating**.
- Progress and stars are stored locally in your browser.
- **Crystal Forest**: stars earned in levels 1–10 restore the forest — open
  **Crystal Forest** from the main menu to watch it heal and read its story.
- **The Guardian**: level 27 — the shield answers one gem colour at a time; match the
  colour shown beside the shield counter to crack each segment before your moves run out.
- **Relic Vault**: reach star milestones (forest restoration, resonance levels, the
  Guardian) to claim six relics — open **Relics** from the main menu; each is granted once
  and adds a piece of the legend.
- **Daily Challenge**: a fresh date-seeded level every day (rotating templates: stones,
  harvest, ice, resonance) — win it once a day to grow your streak; a changed phone
  clock never breaks the streak.
- **Backing up progress**: Settings → *Export save code* gives a short code you
  can copy and store; paste it and press *Import save code* on any device.

## Tests

Run the dependency-free engine, level-definition, UI-state, save/load, blocker,
resonance, guardian, relic and daily-challenge regression suite with Node:

```bash
node tests/game.test.js
```

The game also ships an in-browser self-test (`CQTest`, defined in
`js/main.js`) and a dev-only headless harness (`dev/harness.js`) for running
the engine suite without a browser.

### Debug panel (dev only)

Open the game with `?debug=1` in the URL (e.g. `index.html?debug=1`) to load
a local playtest panel that runs the seeded bot against any level and shows
attempts, wins, win rate, average moves and average score. Nothing is loaded
without the flag; the panel makes no network requests and stores nothing.

## Installing as an app (PWA)

Over HTTPS the game can be installed from the Chrome menu ("Install app" /
"Add to Home screen"): it opens standalone and starts offline thanks to a
versioned service worker. Updates arrive whenever the cache version in
`sw.js` is bumped. On `file://` or plain `http://` hosting the game runs
exactly as before, just without the offline cache.

## License

Original work. See the repository owner for licensing terms.
