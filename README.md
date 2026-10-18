# Crystal Quest: Gem Legends

An original, mobile-first **match-3 puzzle adventure** built as a pure static
HTML5 / CSS / JavaScript site — **no build step, no dependencies, no server code**.

Swap adjacent gems to line up three or more, trigger cascades, forge special
gems, and clear each level's objectives before you run out of moves. The game
ships with **20 handcrafted levels**, a level map, synthesized audio (Web Audio
API), and a responsive touch-first UI.

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
├── js/
│   ├── audio.js        # Web Audio API — synthesized SFX and music
│   ├── levels.js       # Level definitions (layouts, objectives, stars, hints)
│   ├── engine.js       # Core match-3 engine (board, matches, cascades, moves)
│   ├── render.js       # Canvas rendering of the board and effects
│   ├── ui.js           # Screens, HUD, level map, dialogs
│   └── main.js         # Bootstrap / wiring
└── images/
    ├── bg_cavern.jpg   # Cavern background
    └── bg_map.jpg      # Level-map background
```

## How to play

- **Swap** two adjacent gems by tapping/dragging to form a line of 3 or more.
- Matches **cascade**: cleared gems fall, new gems drop in, and chains score extra.
- Special gems are created from larger matches and clear rows, columns, or areas.
- Each level defines **move limits**, **objectives** (score, gem types, ice, etc.),
  and a **star rating**.
- Progress and stars are stored locally in the browser.

## Tests

Run the dependency-free engine, level-definition, UI-state, save/load, and blocker regression suite with:

```bash
node tests/game.test.js
```

## License

Original work. See the repository owner for licensing terms.
