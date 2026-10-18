# KNOWLEDGE.md — Crystal Quest: Gem Legends (persistent project memory)

Read this file before every work session. Update it whenever architecture, mechanics, save format, tests, dependencies or decisions change, and at the end of every phase. Record only verified facts; label unverified items as ASSUMPTION.

## A. Project identity

- Concept: original mobile-first match-3 puzzle adventure ("Crystal Quest: Gem Legends"). Swap adjacent crystals, match 3+, forge special gems (Line Blaster, Star Bomb, Prism Core), clear blockers (stone, ice), beat objectives within a move limit.
- Unique selling point (in progress): "Crystal Resonance" — energy veins linking board nodes that chain-clear when activated (signature mechanic, not found in mainstream match-3 clones).
- Target platform: Android-first mobile web (Chrome), static hosting (GitHub Pages), PWA planned.
- Budget: ₹0. Free tools only, no paid services, no backend, no paid assets.
- Current status: base game (20 levels) + Crystal Resonance (26 levels total) implemented and headless-tested on `feature/resonance-upgrade` (Phase 2 commit 0ef53a4). Phase 3 balance pass complete: seeded playtest bot (`dev/bot.js`), greedy-bot sweeps recorded for all 26 levels (win-rate table in G), levels retuned to targets. Pending Phase 3 remainder: 6s idle auto-hint + `?debug=1` debug panel.

## B. Architecture map

Pure static site: no build step, no dependencies, no framework. Plain HTML/CSS/JS IIFE modules attached to `window`.

| File | Responsibility |
|---|---|
| `index.html` | App shell: screens (home/map/game), HUD, modals (pause/win/lose/settings/help), canvas `#board-canvas`, live region, loading overlay. Loads scripts in order: audio, levels, engine, render, ui, main. |
| `styles.css` | All styling, mobile-first; CSS variables for theme; `body.reduced-motion` + `prefers-reduced-motion` support. |
| `js/audio.js` | `CQAudio` — Web Audio API synthesis (SFX + music loop), master/sfx/music gains, safe unlock on first gesture, no external audio files. |
| `js/levels.js` | `CQLevels.LEVELS` — 26 level objects `{id,name,moves,layout,objectives,stars,hint}`. Layout strings 8x8: `.` empty, `#` hole, `S` stone, `I` ice, `R` resonance vein node (levels 21–26). `CQLevels.get(id)`. |
| `js/engine.js` | `CQEngine` — pure logic: 8x8 grid, seeded RNG (`makeRng`, mulberry32-like), `createBoard` (no initial match, guaranteed valid move), `findMatches`, `planSpecials` (4-run→line, 5-run→prism, L/T→bomb), `expandClears` (BFS special detonation), `applyGravity`, `canSwap` (includes prism+plain and special+special), `trySwap` (swap/combo/prism paths, emits animation steps), `resolveBoard` (cascade loop, guard 60), `shuffleBoard` (deterministic via rng), `damageBlockers`, `makeCtx`, `objectiveProgress/objectivesMet`, `starsFor`. Phase 2 additions: `parseTiles` (layout→tile map: hole/vein/normal), `hasVeins`, `veinClusters` (4-connected vein grouping), `applyResonance` (pure BFS, see D), `validateBoard` (grid↔layout invariant check), `RESONANCE_MAX_DEPTH=8`, `findHint(grid,rng)` seeded, `resolveSpecialCombo` now takes rng (no Math.random fallback), `makeCtx` sets `ctx.tiles` + `ctx.resonanceCleared` when the layout contains `R`, `objectiveProgress` supports `{type:"resonance",count}`. |
| `js/render.js` | `CQRender` — canvas board rendering: cached gem/blocker sprites (per shape/special/size), `playSteps` animation queue (`swap/revert/clear/fall` step types), particles, popups, flashes, shake, hint/selected/cursor overlays, single rAF loop. Phase 2 additions: `R.setTiles(tiles)`, teal energy-vein drawing on vein nodes (pulsing when selected gem sits on a vein), staggered resonance energy-travel flashes inside clear steps, `RESONANCE xN` popup, teal particles. |
| `js/ui.js` | `CQSave` (localStorage `crystal-quest-save-v1`, schema v1, corrupt-storage recovery), `UI` (screens/toast/modals/level map/settings), `Game` controller (pointer/keyboard input, attemptSwap→playSteps→afterTurn win/lose/shuffle flow, pause/resume, hints), `CQBoot`. |
| `js/main.js` | DOM-ready boot + `CQTest.run()` in-browser self test (43 checks incl. 16 resonance checks). |
| `dev/harness.js` | Headless test harness (dev only, not loaded by the game): browser shims, used by dev runner scripts. |
| `dev/bot.js` | Playtest bot (dev only, not loaded by index.html): deterministic seeded policies (`greedy` 1-ply heuristic + 20% exploration, `random`), `CQDev.bot.playLevel/runStats/proveSolvable`; mirrors Game win/shuffle semantics (free deterministic auto-shuffle); all randomness via `CQEngine.makeRng`. |

Hosting: GitHub Pages static. No service worker yet (PWA planned in Phase 6 of the roadmap).

## C. Feature inventory

Verified implemented (all verified by headless test run unless noted "browser only"):

- Match-3 core: swap adjacent, 3+ line matches, cascades with score multiplier (cap x5), invalid-swap revert animation.
- Special gems: Line Blaster (4-run), Prism Core (5-run, clears a colour; swapped with plain gem clears that colour), Star Bomb (L/T), all pair combos of specials (CROSS BEAM, NOVA BLAST, QUAKE, PRISM SURGE, TOTAL ECLIPSE).
- Blockers: stone (hp 1, break by adjacent match), ice (hp 2), holes (`#`) affect gravity.
- 20 levels: score / collect / clear objectives, 3 star thresholds, level map with lock progression, last-level continue button.
- Crystal Resonance (Phase 2, headless-tested): vein nodes (`R` in layouts, levels 21–26) linked in clusters; matching on a vein node sends energy along the vein; chain-clears gems, absorbed by blockers, destroys specials without detonating them; deterministic, depth-capped, per-resolution visited set; `{type:"resonance",count}` objective; vein rendering + energy-travel animation + `RESONANCE xN` popup + `resonance` SFX; levels 21–26: First Resonance, Vein Weaver, Chain Current, Resonance Array, Quiet Hollow (breather), Harmonic Vault.
- Playtest bot + balance pass (Phase 3, headless-verified): `dev/bot.js` greedy/random seeded bot; win-rates measured for all 26 levels (table in G); 16 levels retuned to meet targets (levels 1–10 all within the 85–95% band); every level proven solvable by the bot (≥1 win per sweep).
- Save: localStorage v1 (unlocked, stars, best, lastLevel, settings: sfx/music/reduced-motion/symbols), corrupt JSON → defaults, non-removing recovery. (Browser only: not headless-testable in current layout — see G.)
- UI: pause/resume/restart/quit, settings modal, help modal, toast + aria live region, keyboard controls (arrows/space/enter/esc/h), manual hint + manual shuffle (costs 1 move), auto-reshuffle when no valid moves (free, deterministic), error toasts on runtime errors.
- Audio: synthesized SFX/music, gesture unlock, toggles persisted.
- Responsive board via ResizeObserver + resize handler; reduced-motion support (CSS + render flags).

Planned / not yet implemented: 6s idle auto-hint + `?debug=1` local debug panel (Phase 3 remainder), Crystal Forest world restoration, save schemaVersion migration + export/import, relics + Guardian, daily challenges, PWA (manifest/service worker), ad adapter.

Known base-game issues (verified in README, present on main; fixed on fix branch — verified by reading fix-branch levels.js): levels 14/19 ice objective counts now match layouts. README on `main` is stale relative to the fix branch.

## D. Technical rules

- Engine API contracts (as of base): `trySwap(grid,a,b,rng,ctx) -> {ok,reason?,steps,cascades}`; steps: `{t:"swap",a,b}`, `{t:"revert",a,b}`, `{t:"clear",cleared,blockers,forged,activated,score,combo,mult,label?}`, `{t:"fall",moves,spawns}`. `grid` cells: `{k:"g",g:0-5,s:special|null}`, `{k:"b",b:"stone"|"ice",hp}`, `{k:"e"}`, `null` (hole). `ctx` from `makeCtx(level)`: `{score,collected[6],blockersCleared{stone,ice},preferred,prismColor,rng,level}`.
- Move resolution: swap → (special combo | prism+plain | findMatches) → resolveBoard cascade loop (match → plan specials → expandClears → keep specials → score 60/clear × cascade mult + 200/forged + 100/blocker → damage adjacent blockers → forge specials → gravity) until no matches. Guard: 60 iterations.
- Save schema v1: `{v:1,unlocked,stars{},best{},lastLevel,settings{sfx,music,motion,symbols}}`, key `crystal-quest-save-v1`.
- Level objectives: `{type:"score",target}`, `{type:"collect",gem,count}`, `{type:"clear",blocker:"stone"|"ice",count}`, `{type:"resonance",count}`; all must be met to win; ≥1 star forced on win.
- Crystal Resonance rules (Phase 2, verified by CQTest):
  - Tiles: `R` in a level layout marks a vein node. `makeCtx` parses the layout into `ctx.tiles` (`"h"` hole / `"v"` vein / `"n"` normal). Vein nodes form 4-connected clusters (`veinClusters`).
  - Activation: after any clear step (normal match cascade, prism path, or special combo) whose cleared set includes ≥1 gem standing on a vein node, `applyResonance` runs on the same step. Cost: 0 moves (rides an existing clear; no extra move is consumed).
  - Chaining: BFS from the cleared vein cells (sources, depth 0) along vein tiles only. Each new node contributes its cell: gems are shattered (become holes, collected in `ctx.collected`), specials are destroyed WITHOUT detonating, blockers absorb one hit (via `damageBlockers`) and stop energy from propagating past them, holes/empties on a vein pass energy through. One shared visited set per resolution prevents duplicate triggers; sources are never re-cleared (they are already empty).
  - Depth cap: `RESONANCE_MAX_DEPTH=8` — energy travels at most 8 nodes per path (depth 0 source + 7 hops), i.e. `chain ≤ 7` gems beyond sources on a straight vein. Verified by test: straight 7-node vein from a source yields order length 10, chain 7.
  - Scoring: 30 pts per resonance-shattered gem + 50 × (chain−1) bonus; counts toward `ctx.resonanceCleared` for `{type:"resonance"}` objectives and toward `collect` objectives.
  - Safety: after every resolution the board passes `validateBoard` (grid matches layout holes, cells well-formed) and has zero leftover matches; cascade guard unchanged at 60.
- RNG policy: all gameplay randomness must use the seeded `makeRng`. Fixed in Phase 2: `findHint(grid,rng)` is now seeded (passes rng from Game), `resolveSpecialCombo` takes rng (Math.random fallback removed). Remaining known Math.random uses are rendering-only (particles/shake) and are allowed (visual only). No gameplay Math.random remains.
- Mobile input: pointer events with threshold-based swipe; tap-tap and drag both swap; blockers not selectable; canvas has pointer capture.
- Audio: created lazily on first gesture (autoplay policy); every play call must be safe if audio unavailable.
- Dependencies: none. Constraint: no new frameworks; total shipped size < 2 MB (current: ~92 KB code + 2 background images, verify images size before release).

## E. Bugs and regression history

| Issue | Root cause | Fix | Status |
|---|---|---|---|
| Levels 14/19 unwinnable (ice objective > ice in layout) | Objective counts didn't match layout tiles | Layouts/objectives corrected on `fix/crystal-quest-mobile-gameplay` (levels.js: L14 ice count 6 = 6 tiles, L19 ice 4 = 4 tiles) | Fixed on fix branch; verified by inspection 2026-10-18; solvability re-verified by bot in Phase 3 |
| Pause during cascade could freeze game | resolving state had no pause path | `pauseRequested` flag handled at end of resolution (ui.js attemptSwap/afterTurn) | Fixed on fix branch; verified by code inspection |
| Hint/no-move detection mismatch (`canSwap` vs `hasValidMove`) | hint used a different validator | `findHint`/`hasValidMove` now both use `canSwap` (fix branch) | Fixed; `findHint` Math.random converted to seeded rng in Phase 2 (test: determinism with same seed) |
| Headless `save: module available` test fails in minimal harness | Minimal harness loads only engine/levels/main; CQSave lives in ui.js | Not a code defect: full harness (ui.js + shims, mirrors tests/game.test.js) passes all save tests. Optional later: extract Save to its own module | Closed (clarified) |

## F. Product roadmap (priority order)

1. Crystal Resonance (signature mechanic) — DONE (Phase 2, headless-tested; browser/viewport check pending).
2. Playtest bot + level balance (win-rates 85–95% for levels 1–10, breather levels after hard ones) + auto-hint (6s idle) + free deterministic auto-shuffle — bot + balance DONE (see G win-rate table); free auto-shuffle already in base; 6s idle auto-hint + `?debug=1` debug panel pending.
3. World restoration: Crystal Forest region (CSS/SVG visuals, restoration progress, story fragments), save schemaVersion + migration + backup + export/import.
4. Relics collection + one Guardian encounter (shield-sequence objective).
5. Daily challenges (offline, date-seeded, prevalidated templates, once-per-day rewards, clock-backwards safe).
6. Mobile polish, accessibility (WCAG AA contrast, colorblind-safe shapes — shapes already exist, verify contrast), performance, PWA (manifest, versioned service worker, offline).
7. Optional rewarded-ads adapter (no live ads until a provider is verified by the owner).

## G. Testing and release status

- Baseline (2026-10-18, branch point a9b9b3d): syntax parse of all 6 JS files — OK (via `new Function` parse in headless harness). `CQTest.run()` headless: 26/27 pass; 1 fail is `save: module available` (browser-only module, see E). Browser run of CQTest not yet performed this session.
- Phase 2 (2026-10-18, after Resonance implementation): syntax parse of all 6 JS files — OK. Two headless runs: (1) minimal harness (engine/levels/main only): 42/43, only fail = `save: module available` (minimal harness does not load ui.js; not a code defect). (2) full harness mirroring `tests/game.test.js` (loads audio/levels/engine/ui/main + DOM shims + render stub): all 10 Node regression groups pass, including a full `CQTest.run()` with `result.pass === true` asserted (43/43 incl. save tests). Resonance coverage: API present, parseTiles, veinClusters, activation on match, chain/order data, objective progress, board validity, visited-set duplicate prevention, depth cap (order 10 / chain 7), blocker absorb+stop, specials destroyed without detonating, special-combo swap triggers resonance, determinism same-seed, levels 21–26 valid (veins + validateBoard + hasValidMove + initial match-free).
- Phase 3 (2026-10-18, balance pass): greedy bot (`CQDev.bot.runStats`, default seed base, seed = levelId*100003 + i*7) swept all 26 levels against the tuned `js/levels.js`. Win-rate table (100 plays/level; resonance levels 21–26 at 200 plays):

| L | Name | Win% | Avg moves (wins) | Avg score (wins) | Shuffles |
|---|---|---|---|---|---|
| 1 | Crystal Gate | 93 | 8.1 | 4986 | 0 |
| 2 | Amber Hollow | 93 | 14.4 | 8130 | 2 |
| 3 | Twin Veins | 88 | 16.8 | 9203 | 2 |
| 4 | Stonewatch | 86 | 10.4 | 5683 | 1 |
| 5 | Frozen Shelf | 88 | 20.3 | 10256 | 16 |
| 6 | Prism Descent | 87 | 16.4 | 9188 | 0 |
| 7 | The Lattice | 85 | 16.7 | 9840 | 1 |
| 8 | Cascade Falls | 91 | 14.5 | 8644 | 0 |
| 9 | Hollow Crown | 89 | 18.4 | 7451 | 38 |
| 10 | Glacier Vault | 85 | 22.8 | 11215 | 24 |
| 11 | Ember Run | 94 | 16.9 | 9662 | 0 |
| 12 | Shattered Span | 74 | 17.0 | 11044 | 2 |
| 13 | Deep Current | 62 | 21.5 | 14314 | 0 |
| 14 | Obsidian Ring | 63 | 19.8 | 9994 | 47 |
| 15 | Starfall Basin | 82 | 17.5 | 10682 | 1 |
| 16 | Frost Lattice | 61 | — | — | — |
| 17 | Verdant Maze | 47 | 22.3 | 11677 | — |
| 18 | Solar Forge | 55 | 22.7 | 14522 | 0 |
| 19 | Crystal Throne | 76 | — | — | — |
| 20 | Gem Legends | 49 | — | — | — |
| 21 | First Resonance | 100 | — | — | 0 |
| 22 | Vein Weaver | 100 | — | — | — |
| 23 | Chain Current | 96.5 | 8.4 | 10040 | 0 |
| 24 | Resonance Array | 88 | — | — | — |
| 25 | Quiet Hollow | 100 | — | — | — |
| 26 | Harmonic Vault | 76 | 10.3 | 14595 | — |

  - Levels 1–10 all within the 85–95% target band. Every level is solvable (≥1 bot win in its sweep; all failures were out-of-moves, no dead-board/illegal-move failures).
  - Difficulty curve after level 10 rises by design: hard spikes at L13/L14 (62–63%), L16 (61%), L17 (47%), L18 (55%), L20 finale (49%); breathers at L15 (82%) and L19 (76%); world-2 curve: L21/L22 tutorials (100%), L23 96.5%, L24 88%, L25 breather (100%), L26 finale 76%.
  - Tuning levers verified this session: L17 collect 26→24 (was 39%); L23 replaced the 16-node vein ring (trivially fast resonance — bot won in ~3.6 moves, 100% regardless of raised targets) with a single 6-node vertical vein (col 3, rows 1–6) + moves 13 + resonance 26; L26 moves 30→14, score 9000→12000, resonance 28→45, collect gem5 20→26.
  - Level validation replicated against the tuned levels.js: the `tests/game.test.js` group "all 26 level layouts match blocker-objective counts and start playable" (26 levels × 3 seeds: blocker-count match, no initial match, valid move, legal hint, hint swap accepted) — PASS in agent sandbox. Other test groups unchanged since the Phase 2 full-suite run.
- `tests/game.test.js` (Node, `node tests/game.test.js`): NOT run with real Node this session (no Node in this environment). An equivalent replication of the full suite was executed in the agent sandbox against the current working files — 10/10 groups pass. Assertion `LV.LEVELS.length` updated 20 → 26 (legitimate count change with 6 new levels; not a weakening). Real-Node run pending.
- NOT VERIFIED: real-browser CQTest run, real-Node test run, 360x800 / other viewport emulation (no browser emulation available in this session), touch interaction, animation quality, audio. Physical Android device testing: NOT performed.
- Headless runner: `dev/harness.js` + runner executed in the agent sandbox (no Node available; harness uses JS shims). Commands: load engine.js/levels.js/main.js into shim, call `window.CQTest.run()`.
- Physical Android device testing: NOT performed. All testing this session is headless logic testing; browser emulation/viewport checks pending.
- Deployment: none. Work only on `feature/resonance-upgrade`. No merges, no force-push, no deploy without owner authorization.

## H. Decision log

| Date | Decision | Reason | Files | Validation |
|---|---|---|---|---|
| 2026-10-18 | Branch `feature/resonance-upgrade` from `fix/crystal-quest-mobile-gameplay` tip (a9b9b3d), not from `main` | fix branch contains verified gameplay/mobile fixes absent from main | — | GitHub API branch creation |
| 2026-10-18 | Add `dev/` folder for headless harness/bot (shipped but not referenced by index.html) | Reproducible tests without Node/pytest; zero runtime cost | dev/harness.js | Baseline run 26/27 |
| 2026-10-18 | Keep engine pure (no DOM) so all gameplay logic is headless-testable | Existing architecture already separates engine/render; testability requirement | engine.js | CQTest engine checks pass headless |
| 2026-10-18 | Resonance rides existing clear steps (activation = a clear set that touches a vein node) instead of a separate move/action | Minimal engine extension, no new input mode, zero extra move cost, deterministic per resolution | engine.js, levels.js, render.js, ui.js, audio.js, main.js | 16 resonance checks pass headless |
| 2026-10-18 | Depth-cap semantics fixed as "energy travels at most 8 nodes per path" (source depth 0 + 7 hops → chain 7 on a straight vein) | RESONANCE_MAX_DEPTH=8 counts nodes, not hops; initial test expected hop semantics and was corrected to match the documented rule (test expectation fix, not a weakening — chain 7 and order 10 both asserted) | engine.js, main.js | depth-cap test passes headless |
| 2026-10-18 | Removed an environment-injected media-guard script tag (`tmly` guard, ~2.9 KB) found committed in index.html on the feature branch | It was not authored game code, injects third-party network behaviour, violates the no-tracking/no-network constraint | index.html | Local copy stripped; verified by inspecting repo index.html via GitHub API before strip |
| 2026-10-18 | Authoritative file pipeline: fetch content via GitHub `get_file_contents` (resource.text) and write locally via `write_file`; NEVER use `jq` to extract file content from tool results | `jq` extraction corrupted UTF-8 (em-dashes became mojibake in levels.js/index.html in a previous session) | — | UTF-8 verified (charCode 8212) after pipeline switch |
| 2026-10-18 | `findHint` takes optional rng; `resolveSpecialCombo` signature now takes rng (no Math.random fallback) | RNG policy: all gameplay randomness seeded | engine.js | determinism test passes headless |
| 2026-10-18 | Added `dev/bot.js` seeded playtest bot (greedy + random policies, free deterministic auto-shuffle) | Phase 3 requirement: reproducible win-rate measurement and solvability proof without Math.random | dev/bot.js | runStats sweeps on all 26 levels (table in G) |
| 2026-10-18 | Phase 3 balance: retuned 16 of 26 levels via greedy-bot sweeps; levels 1–10 tuned into the 85–95% band; L17 collect 26→24 (user-flagged too hard at 39%); L23 layout replaced with a single 6-node vertical vein + moves 13 (old 16-node ring made resonance trivial, 100% win-rate regardless of target raises); L26 finale moves 30→14 with raised targets (move budget is the effective difficulty lever) | Meet Phase 3 win-rate targets; keep hard-level/breather rhythm after level 10 | js/levels.js | 100 plays/level (200 for resonance levels 21–26); table in G; level-validation group PASS |

## I. Next actions

- Completed: Phase 0 (repo inspection, baseline tests, branch created), Phase 1 (KNOWLEDGE.md established), Phase 2 (Crystal Resonance implemented, headless-tested, committed 0ef53a4), Phase 3 balance pass (dev/bot.js + all-26-level win-rate table + level retuning, this commit).
- Pending: Phase 3 remainder — 6s idle auto-hint timer in ui.js (cleaned up on pause/quit/level change) + `?debug=1` local debug panel (attempts/wins/avg moves/avg score per level); then roadmap F.3 onward.
- Blockers: none.
- Exact next task: add the 6s idle auto-hint to `Game` in js/ui.js (reuse `showHint` visuals, timer reset on every input/resolution, cleared on pause/quit/level change), add the `?debug=1` debug panel (local only, no network/tracking), headless-test both (timer cleanup paths, determinism), then start Phase 4 (Crystal Forest world restoration + save schemaVersion migration with backup).

## J. Asset and license log

- `images/bg_cavern.jpg`, `images/bg_map.jpg`: pre-existing in repo; ASSUMPTION: owner-provided originals. Size not yet verified (do so before release; < 2 MB total budget).
- All gem/blocker sprites: procedurally drawn on canvas in `js/render.js` (self-generated, no license issues).
- All audio: Web Audio synthesis in `js/audio.js` (self-generated).
- Icons/level UI SVG: inline SVG in `js/ui.js` (self-generated).
- Fonts: system fonts ("Trebuchet MS", sans-serif fallbacks).

## K. Android packaging and store requirements (planned; not started)

- Ad adapter plan (Phase 7): optional interface `isAvailable/show/onRewarded/onClosed/onError`; default no-op reports unavailable; rewarded-only (extra moves/continue); game must be fully playable with ads unavailable; reward only on real provider confirmation. No provider configured yet — ads are NOT live.
- Ad provider options (all need owner account, none configured): AdMob (via Google Play services in TWA wrapper is not scriptable — needs native layer), Unity Ads (same limitation). For a pure TWA/Bubblewrap package, rewarded web ads are unreliable; realistic options: keep web PWA (no ads), or package with Capacitor + a native ad plugin (requires owner Google AdMob account + consent flow).
- Consent: GDPR/UMP consent required before ads in EEA/UK; children's content policy applies (puzzle game must declare target audience; if "child-directed", only certified ad networks and no personalization).
- TWA via Bubblewrap: needs `manifest.json` + `assetlinks.json` hosting, a domain, and a Play Store app; Capacitor path needs local Android SDK build (free but complex on phone).
- Play Store requirements (owner action, ₹25 one-time — NOT zero budget): developer account, privacy policy URL, data-safety form, target API level (currently API 34+ required), content rating questionnaire, app signing.
- What must be done by the owner: decide ads vs no-ads, create accounts, pay registration if Play Store desired, host privacy policy.
