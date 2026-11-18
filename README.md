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
the vein, the bigger the chain. Blockers absorb the energy, so plan the path. The engine also supports layered stone/obsidian hit points and caged crystals.

The campaign is wrapped by **The Guardian** — a shield-sequence encounter on
level 27 — plus a **Relic Vault** of six once-only collectibles, a
date-seeded **Daily Challenge** with streaks, and **save-code export/import**
for moving progress between devices. The game installs as an offline PWA
(Home-screen Install App button), its text contrast passes WCAG AA, and core gameplay development is feature-complete. Commercial release preparation
is tracked separately; passing headless tests does not mean browser/device QA,
advertising approval or Play Store publication is complete.

The 2D evolution is live: a story mode with three regions (Crystal Forest,
Emberfall Canyon, Starlit Summit), a small cast led by Mira, region board
palettes, a second Guardian encounter at level 20 (Ember Warden), and
controlled service-worker updates that activate only on the next reload.

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
│   ├── ads.js          # Optional rewarded-ads adapter (no provider configured)
│   ├── ui.js           # Screens, HUD, level map, dialogs, save, daily, relics, install prompt
│   └── main.js         # Bootstrap / wiring / built-in self-test (CQTest)
├── dev/
│   ├── harness.js      # Headless test harness (dev only, not loaded by the game)
│   ├── bot.js          # Seeded playtest bot for win-rate measurement (dev only)
│   └── debug.js        # Local debug panel, loaded only with ?debug=1 (dev only)
├── android/           # Play Store (TWA) packaging prep — assetlinks template + Bubblewrap guide (see android/README.md)
├── tests/
│   └── game.test.js    # Node regression suite
└── images/
    ├── bg_cavern.jpg   # Cavern background
    └── bg_map.jpg      # Level-map background
```

## How to play

- **Swap** two adjacent gems by tapping/dragging to form a line of 3 or more.
- Matches **cascade**: cleared gems fall, new gems drop in, and chains score extra.
- Special gems are created from larger matches and clear rows, columns, or areas. A 2×2 square forges a Seeker Crystal that targets the next Guardian colour, a resonance vein, a blocker, or a needed collect colour. Every pair of special types has a deterministic combo; two Star Bombs trigger a delayed second-stage aftershock.
- **Resonance**: from level 21 on, match a crystal on a glowing vein node to send
  energy down the vein and chain-clear everything it reaches.
- Blockers include stone (1 hit), cracked stone (2 hits), ice (2 hits), and obsidian (3 hits). Caged crystals unlock on first clear/blast/resonance contact and remain on the board. Each level defines **move limits**, **objectives** (score, gem types, blockers, resonance, Guardian), and a **star rating**.
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
- **Rewarded revive (optional)**: no ads are configured. If an ad provider is ever
  wired up, the lose screen offers a "watch ad for +5 moves" revive — granted only
  on the provider's confirmation, once per attempt. The game is fully playable
  without ads.
- **Backing up progress**: Settings → *Export save code* gives a short code you
  can copy and store; paste it and press *Import save code* on any device.

## Tests

Phases 1–3 are implemented on the current feature branch: 2×2 Seeker creation, all special-pair combinations, delayed Star Bomb aftershock, objective-aware hints, locked crystals, layered blockers, dedicated Canvas visuals/audio, and a seeded bot sweep across all 27 levels.

Run the dependency-free engine, level-definition, UI-state, save/load, blocker,
resonance, Guardian, relic, daily-challenge, ads-adapter, install-prompt,
special-combo, renderer/audio syntax and 27-level bot regression suite with Node:

```bash
node tests/game.test.js
node tests/seo.test.js
node tests/commercial-ui.test.js
node tests/launch-readiness.test.js
```

GitHub Actions runs all four commands on every pull request to `main`. The Node suite also exercises `CQTest.run()` and the seeded bot; browser/device visual playtesting is a separate release check and is not implied by a passing headless suite.

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

The Home screen also shows an in-game Install App button as soon as the browser signals that installation is available; tapping it opens the native install dialog. If the browser does not offer installation, the button never appears.

For a Play Store release, the `android/` folder holds the TWA packaging prep
(assetlinks template + Bubblewrap guide); the required accounts, domain and
signing are owner-side — see `android/README.md`.

## Commercial launch status

The intended release is both the Website/PWA at `https://gogocompany.in/crystalquest/`
and a Google Play release packaged as a Trusted Web Activity (TWA). The Privacy
Policy and Terms of Use are linked from the game home screen and included in the
offline app shell. Optional push notifications require explicit opt-in and use
Firebase/GoGo Central as described in the Privacy Policy.

Advertising is deliberately disabled until a certified consent-management
platform and approved provider are configured. The current rewarded-revive
adapter has no provider. A TWA can display eligible web ads but does not provide
a native AdMob rewarded SDK; native rewarded ads require a native/Capacitor
wrapper and a separately tested bridge. See `android/README.md` for the release
path and owner-side blockers.

Before public launch, complete real-browser and Android-device QA, verify the
production domain's root-level Digital Asset Links file, generate/sign the AAB,
complete current Play Console declarations, and validate the live privacy/contact
details. These steps are not covered by headless CI.

## License

Original work. See the repository owner for licensing terms.
