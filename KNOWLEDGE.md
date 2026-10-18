# KNOWLEDGE.md — Crystal Quest: Gem Legends (persistent project memory)

Read this file before every work session. Update it whenever architecture, mechanics, save format, tests, dependencies or decisions change, and at the end of every phase. Record only verified facts; label unverified items as ASSUMPTION.

## A. Project identity

- Concept: original mobile-first match-3 puzzle adventure ("Crystal Quest: Gem Legends"). Swap adjacent crystals, match 3+, forge special gems (Line Blaster, Star Bomb, Prism Core), clear blockers (stone, ice), beat objectives within a move limit.
- Unique selling point (in progress): "Crystal Resonance" — energy veins linking board nodes that chain-clear when activated (signature mechanic, not found in mainstream match-3 clones).
- Target platform: Android-first mobile web (Chrome), static hosting (GitHub Pages), PWA planned.
- Budget: ₹0. Free tools only, no paid services, no backend, no paid assets.
- Current status: base game (20 levels) + Crystal Resonance (26 levels total) + Phase 3 complete (bot, balance table, 6s idle auto-hint, `?debug=1` debug panel). Phase 4 complete: save schema v2 (migration + backup + corrupted-storage fallback + export/import code), Crystal Forest restoration screen with 5 star thresholds and story fragments (logic headless-tested; on-screen rendering NOT yet verified in a browser). Phase 5 complete: six-relic collection with exact-once claiming and a Relic Vault screen, plus the Guardian shield-sequence encounter as level 27 (27 levels total; logic headless-tested, 20/20 regression groups; browser rendering NOT yet verified). Next: Phase 6 (offline daily challenges, mobile polish, accessibility, PWA).

## B. Architecture map

Pure static site: no build step, no dependencies, no framework. Plain HTML/CSS/JS IIFE modules attached to `window`.

| File | Responsibility |
|---|---|
| `index.html` | App shell: screens (home/map/world/relics/game), HUD, modals (pause/win/lose/settings incl. save export-import/help), canvas `#board-canvas`, live region, loading overlay, Crystal Forest SVG scene (5 `wf-*` milestone layers). Loads scripts in order: audio, levels, engine, render, ui, main. Inline conditional loader after main.js: when the URL contains `?debug=1`, dynamically loads `dev/bot.js` then `dev/debug.js` and calls `CQDev.debug.init()` (dev only, same-site files, nothing loads without the flag). |
| `styles.css` | All styling, mobile-first; CSS variables for theme; `body.reduced-motion` + `prefers-reduced-motion` support; world-screen styles (`.wf-layer` restore transition, progress bar, story cards, save export/import box) + relic-vault styles. |
| `js/audio.js` | `CQAudio` — Web Audio API synthesis (SFX + music loop), master/sfx/music gains, safe unlock on first gesture, no external audio files. |
| `js/levels.js` | `CQLevels.LEVELS` — 27 level objects `{id,name,moves,layout,objectives,stars,hint}`; a level may carry `guardian:{sequence}` (level 27). Layout strings 8x8: `.` empty, `#` hole, `S` stone, `I` ice, `R` resonance vein node (levels 21–26). `CQLevels.get(id)`. |
| `js/engine.js` | `CQEngine` — pure logic: 8x8 grid, seeded RNG (`makeRng`, mulberry32-like), `createBoard` (no initial match, guaranteed valid move), `findMatches`, `planSpecials` (4-run→line, 5-run→prism, L/T→bomb), `expandClears` (BFS special detonation), `applyGravity`, `canSwap` (includes prism+plain and special+special), `trySwap` (swap/combo/prism paths, emits animation steps), `resolveBoard` (cascade loop, guard 60), `shuffleBoard` (deterministic via rng), `damageBlockers`, `makeCtx`, `objectiveProgress/objectivesMet`, `starsFor`. Phase 2 additions: `parseTiles` (layout→tile map: hole/vein/normal), `hasVeins`, `veinClusters` (4-connected vein grouping), `applyResonance` (pure BFS, see D), `validateBoard` (grid↔layout invariant check), `RESONANCE_MAX_DEPTH=8`, `findHint(grid,rng)` seeded, `resolveSpecialCombo` now takes rng (no Math.random fallback), `makeCtx` sets `ctx.tiles` + `ctx.resonanceCleared` when the layout contains `R`, `objectiveProgress` supports `{type:"resonance",count}`. Phase 5 additions: `guardianAdvance(ctx,cleared)` (shield-sequence progress; `makeCtx` seeds `ctx.guardian={sequence,idx:0}`; hooked into all three clear paths), `objectiveProgress` supports `{type:"guardian"}`. |
| `js/render.js` | `CQRender` — canvas board rendering: cached gem/blocker sprites (per shape/special/size), `playSteps` animation queue (`swap/revert/clear/fall` step types), particles, popups, flashes, shake, hint/selected/cursor overlays, single rAF loop. Phase 2 additions: `R.setTiles(tiles)`, teal energy-vein drawing on vein nodes (pulsing when selected gem sits on a vein), staggered resonance energy-travel flashes inside clear steps, `RESONANCE xN` popup, teal particles. |
| `js/ui.js` | `CQSave` (schema v2: see D; load with v1→v2 migration + backup, corrupted-storage recovery, export/import code, `markForestSeen`), `World` helper (forest levels 1–10, 5 milestones at 3/8/15/22/30 stars, story texts, `forestStars`/`reached`/`newlyReached`, exposed as `CQWorld`), `Relics` helper (six relics with conditions + exact-once `claimNew`, exposed as `CQRelics`), `UI` (screens/toast/modals/level map/settings/world/relics + `buildWorld`/`buildRelics`, guardian objective chip in `renderObjectives`), `Game` controller (pointer/keyboard input, attemptSwap→playSteps→afterTurn win/lose/shuffle flow, pause/resume, manual hints, 6s idle auto-hint: `armIdle`/`clearIdle`/`autoHint` — timer resets on every pointer/key/swap input and after each resolution, cleared on pause/quit/level-change/win/lose; finishWin announces new forest milestones), `CQBoot`. |
| `js/main.js` | DOM-ready boot + `CQTest.run()` in-browser self test (43 checks incl. 16 resonance checks). |
| `dev/harness.js` | Headless test harness (dev only, not loaded by the game): browser shims, used by dev runner scripts. |
| `dev/bot.js` | Playtest bot (dev only, not loaded by index.html): deterministic seeded policies (`greedy` 1-ply heuristic + 20% exploration, `random`), `CQDev.bot.playLevel/runStats/proveSolvable` (`estimateProgress` has a guardian branch — bonus when a clear contains the expected shield colour); mirrors Game win/shuffle semantics (free deterministic auto-shuffle); all randomness via `CQEngine.makeRng`. |
| `dev/debug.js` | Local debug panel (dev only, loaded only with `?debug=1`): `CQDev.debug.run/runAll/resultText/init/enabled`. `run(levelId,plays,policy,seedBase)` wraps `CQDev.bot.runStats` (pure, deterministic, headless-testable); `runAll` sweeps all levels yielding between levels; `init()` builds the fixed-position panel (level select, plays, bot policy, seed, Run level / Run all buttons, text output) via createElement. No network, no tracking, no storage writes. |

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

- Idle auto-hint (Phase 3 remainder, headless-tested): after 6s idle in the playing state, a valid move is highlighted (reuses the `R.hint` visuals, silent — no SFX/announcement) for 4s, then the idle timer re-arms; any pointer/key/swap input, manual hint/shuffle, or completed resolution resets the timer; pause, resume (re-arms), quit, level change, win and lose all clear/re-arm it correctly. Hint search uses seeded `E.findHint`.
- Local debug panel (Phase 3 remainder, headless-tested): URL flag `?debug=1` (checked by the index.html inline loader AND `CQDev.debug.enabled`) loads `dev/bot.js` + `dev/debug.js` and shows a local stats panel: attempts, wins, win-rate, avg moves, avg score, shuffle count per level via the seeded bot; "Run level" and "Run all (10 plays)" buttons; invalid numeric inputs clamped. No network, no tracking, no storage. Nothing dev-related loads without the flag.
- Save schema v2 + migration + backup + export/import (Phase 4, headless-tested): v1 saves load and migrate transparently (original raw save backed up once under `crystal-quest-save-backup`); corrupted storage falls back to defaults; corrupt world resets without losing other progress; export produces a `CQSAVE2-` code that re-imports exactly; invalid codes rejected.
- Crystal Forest restoration (Phase 4; logic headless-tested, rendering browser-only): world screen with SVG scene, 5 milestone layers (fireflies, saplings, stream, bloom, Heart Crystal), progress bar (stars from levels 1–10 out of 30), 5 original story fragments, "New" badge until viewed, milestone toast after qualifying wins; accessible from the home screen.
- Relic collection (Phase 5, headless-tested): six relics with explicit unlock conditions tied to existing verified progress (star totals, forest restoration, resonance levels, the Guardian); Relic Vault screen; claiming is exact-once (persisted `world.relics` id list); combined milestone + relic toast after qualifying wins.
- Guardian encounter (Phase 5, headless-tested): level 27 "The Guardian" — shield-sequence objective `{type:"guardian"}` (always visible with expected-colour chip): the shield calls one gem colour at a time (sequence [0,3,1,5,4]); only clears containing the called colour advance it; win = all 5 segments broken within 16 moves; win/loss resolve exactly once through the game flow.
- Planned / not yet implemented: daily challenges, PWA (manifest/service worker), ad adapter, further world regions (Moon Temple, Ember Cavern, Frozen Observatory, Shattered Core).

Known base-game issues (verified in README, present on main; fixed on fix branch — verified by reading fix-branch levels.js): levels 14/19 ice objective counts now match layouts. README on `main` is stale relative to the fix branch.

## D. Technical rules

- Engine API contracts (as of base): `trySwap(grid,a,b,rng,ctx) -> {ok,reason?,steps,cascades}`; steps: `{t:"swap",a,b}`, `{t:"revert",a,b}`, `{t:"clear",cleared,blockers,forged,activated,score,combo,mult,label?}`, `{t:"fall",moves,spawns}`. `grid` cells: `{k:"g",g:0-5,s:special|null}`, `{k:"b",b:"stone"|"ice",hp}`, `{k:"e"}`, `null` (hole). `ctx` from `makeCtx(level)`: `{score,collected[6],blockersCleared{stone,ice},preferred,prismColor,rng,level}`.
- Move resolution: swap → (special combo | prism+plain | findMatches) → resolveBoard cascade loop (match → plan specials → expandClears → keep specials → score 60/clear × cascade mult + 200/forged + 100/blocker → damage adjacent blockers → forge specials → gravity) until no matches. Guard: 60 iterations.
- Save schema v2 (headless-tested): key `crystal-quest-save-v1` (unchanged key; version lives inside the data), data `{v:2,unlocked,stars{},best{},lastLevel,settings{sfx,music,motion,symbols},world:{forest:{seen:[milestone ids]}}}`. Backup key `crystal-quest-save-backup` (holds the raw pre-migration save; one slot; kept even across Save.reset for recovery). Export code: `CQSAVE2-` + custom base64 of the JSON (ASCII-only data by construction; own b64encode/b64decode, no btoa/atob). Migration: on load, if `parsed.v !== 2` → absorb valid fields, default world, write backup of the raw string, persist v2, return. Corrupt main JSON → defaults + remove key; corrupt `world` field → world resets to defaults, rest of the save kept; `seen` sanitized to unique strings. Import validates prefix, base64, JSON, and v===2; rejected imports leave the current save untouched.
- World restoration (headless-tested logic): Crystal Forest = levels 1–10; progress = sum of stars in that range (0–30; derived, never stored separately). Milestones at 3 (The First Spark), 8 (Saplings Stir), 15 (The Stream Returns), 22 (Canopy Bloom), 30 (Heart of the Forest) star crystals; each unlocks an SVG scene layer (`.restored` class) + a story fragment. `world.forest.seen` lists fragments the player has already viewed (marked when the world screen is opened via `Save.markForestSeen`, idempotent). finishWin toasts/announces milestones that a win newly crossed. UI rendering (buildWorld, SVG layers, export/import buttons) is browser-only — NOT verified without a browser.
- Guardian rules (Phase 5, headless-tested): a level may carry `guardian:{sequence:[...]}`; `makeCtx` seeds `ctx.guardian={sequence,idx:0}`. Every clear step (cascade, prism path, special combo) runs `guardianAdvance(ctx,cleared)` — the shield index advances only when the cleared set contains the next expected colour; progress surfaces as `step.guardian` and via `objectiveProgress` type `"guardian"` (done when `idx >= sequence.length`; exposes the expected next colour for the UI chip). Level 27: 16 moves, objectives [score 5000, guardian], stars [5000,7500,10000], sequence [0,3,1,5,4].
- Relic rules (Phase 5, headless-tested): `world.relics` = claimed relic ids (persisted; legacy v2 saves without the field absorb to `[]`; corrupt field resets to `[]` without losing other progress). `Relics.claimNew(saveData)` returns + persists newly eligible ids exactly once; conditions derive only from save data (star totals per level range, forest star sum, resonance-level stars, level-27 star). finishWin toasts newly claimed relics together with new forest milestones.
- Level objectives: `{type:"score",target}`, `{type:"collect",gem,count}`, `{type:"clear",blocker:"stone"|"ice",count}`, `{type:"resonance",count}`, `{type:"guardian"}` (shield sequence, level 27); all must be met to win; ≥1 star forced on win.
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
| 2026-10-18: sandbox filesystem wipe destroyed the uncommitted Phase 5 working copy (only chats/ survived) | Environment reset, not a code defect | Rebuilt all 14 files from the branch head via GitHub get_file_contents (resource.text) + write_file; re-applied the 32 recorded Phase 5 edits with single-occurrence asserts; one omitted edit (the 4 new test groups) caught and inserted | Recovered: 20/20 groups pass in the sandbox harness; lesson — commit each phase immediately after its tests pass |

## F. Product roadmap (priority order)

1. Crystal Resonance (signature mechanic) — DONE (Phase 2, headless-tested; browser/viewport check pending).
2. Playtest bot + level balance (win-rates 85–95% for levels 1–10, breather levels after hard ones) + auto-hint (6s idle) + free deterministic auto-shuffle — DONE. Bot + balance: see G win-rate table; free auto-shuffle was already in base; 6s idle auto-hint + `?debug=1` debug panel implemented and headless-tested.
3. World restoration: Crystal Forest region — DONE (Phase 4). CSS/SVG world screen with 5 restoration milestones + story fragments; restoration driven by stars from levels 1–10; save schemaVersion 2 with safe v1 migration + single backup copy + corrupted-storage fallback + export/import as a copyable code string (Settings modal). Logic headless-tested; browser rendering verification pending.
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
| 27 | The Guardian | 96.5 | 10.7 | 5984.5 | 1 |

  - Levels 1–10 all within the 85–95% target band. Every level is solvable (≥1 bot win in its sweep; all failures were out-of-moves, no dead-board/illegal-move failures).
  - Difficulty curve after level 10 rises by design: hard spikes at L13/L14 (62–63%), L16 (61%), L17 (47%), L18 (55%), L20 finale (49%); breathers at L15 (82%) and L19 (76%); world-2 curve: L21/L22 tutorials (100%), L23 96.5%, L24 88%, L25 breather (100%), L26 finale 76%.
  - Tuning levers verified this session: L17 collect 26→24 (was 39%); L23 replaced the 16-node vein ring (trivially fast resonance — bot won in ~3.6 moves, 100% regardless of raised targets) with a single 6-node vertical vein (col 3, rows 1–6) + moves 13 + resonance 26; L26 moves 30→14, score 9000→12000, resonance 28→45, collect gem5 20→26.
  - Level validation replicated against the tuned levels.js: the `tests/game.test.js` group "all 26 level layouts match blocker-objective counts and start playable" (26 levels × 3 seeds: blocker-count match, no initial match, valid move, legal hint, hint swap accepted) — PASS in agent sandbox. Other test groups unchanged since the Phase 2 full-suite run.
- `tests/game.test.js` (Node, `node tests/game.test.js`): NOT run with real Node this session (no Node in this environment). An equivalent replication of the full suite was executed in the agent sandbox against the current working files — 20/20 groups pass (12 prior + 4 Phase-4 groups: v1 migration + backup, corrupted storage + corrupt world, export/import round trip + rejections, world restoration milestones/persistence; + 4 Phase-5 groups: guardian engine mechanics, guardian win/loss exactly-once, guardian solvability/balance, relics). The file list also loads `dev/bot.js` + `dev/debug.js`. Real-Node run pending.
- Phase 4 (2026-10-18, save v2 + Crystal Forest): syntax parse of all game/dev JS files + the index.html inline loader — OK. Full `tests/game.test.js` replication: 16/16 groups pass. New groups: (a) v1 save migrates to v2 with all progress kept, raw v1 backed up under `crystal-quest-save-backup`, main key rewritten, second load stable; (b) corrupt main JSON → defaults + key removed, corrupt `world:"garbage"` → world resets but unlocked/stars kept, junk seen entries sanitized to unique strings; (c) export/import round trip (progress + world survive, persists to storage, rejected codes — empty, bad prefix, garbage base64, v1 export — leave the current save untouched); (d) forest stars derived from levels 1–10, milestone unlock at thresholds, `markForestSeen` idempotent + persists across reload, `newlyReached` boundary math, finishWin milestone toast fired exactly on the first qualifying win. One real bug found and fixed during the pass: extra closing brace at the end of `buildWorld` (caught by the parse check before running tests).
- Phase 5 (2026-10-18, relics + Guardian): syntax parse of all changed files — OK. Full `tests/game.test.js` replication: 20/20 groups pass. New groups: (a) guardian engine mechanics (5-length sequence constants; hooks into real trySwap paths); (b) guardian win and loss resolve exactly once through Game.afterTurn; (c) guardian solvability/balance via the seeded bot — proveSolvable greedy wins on the first seeded play, runStats greedy 193/200 = 96.5% (avg 10.7 moves, avg 5984.5 score, 1 shuffle, 7 out-of-moves failures), random 107/200 = 53.5%; (d) relics: conditions, exact-once claiming, persistence across reload, corrupt `world.relics` resets safely, reset clears claimed relics. Guardian tuning was measured, not guessed: initial 30 moves / 4 colours gave a 100% greedy win-rate; final 16 moves / 5 colours [0,3,1,5,4].
- Size budget verified (2026-10-18): code + markup + styles = 147,653 bytes; images bg_cavern.jpg 124,087 + bg_map.jpg 215,572 bytes (sizes verified via GitHub API); total ≈ 487 KB < 2 MB budget.
- Phase 3 remainder (2026-10-18, idle auto-hint + debug panel): syntax parse of all game/dev JS files + the index.html inline loader — OK (`tests/game.test.js` parses only after stripping its `#!/usr/bin/env node` shebang; a Node-only artifact, not a defect). Full `tests/game.test.js` replication: 12/12 groups pass. New group (a) idle auto-hint lifecycle: arms with a 6000 ms delay, shows hint on fire, consumes the idle timer, schedules a 4 s auto-hide, re-arms after hint expiry, cleared by pause(), re-armed by resume(), cleared on the afterTurn win path. New group (b) debug runner: `CQDev.debug.run` deterministic (deepEqual on repeated identical runs), attempts/wins/winRate correct, unknown level → null, `resultText` contains level/plays/wins, resonance tutorial L21 winnable in 3 seeded plays. Debug-flag regex checks (`?debug=1`, `?debug=10`, `&debug=1`, `?xdebug=1`) behave correctly. No Math.random in any gameplay or dev-tool code path (grep; the single hit in dev/bot.js is a comment).
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
| 2026-10-18 | Idle auto-hint implemented as a re-arming timer cycle in `Game` (armIdle/clearIdle/autoHint) rather than a one-shot timer | Spec requires: highlight after 6s idle, reset on input, cleared on pause/quit/level change; re-arming cycle keeps hints available during long idles without stacking timers | js/ui.js | New regression group (a) in tests/game.test.js — 12/12 groups pass |
| 2026-10-18 | Idle hint is visual-only (no SFX/aria announcement), unlike the manual Hint button | Idle hints fire without user intent; sound/announcement would be intrusive; manual hint keeps its audio feedback | js/ui.js | Code inspection + regression group (a) |
| 2026-10-18 | Debug panel loaded via conditional inline loader in index.html (`?debug=1` → dev/bot.js + dev/debug.js + `CQDev.debug.init()`), with a pure testable core (`run`/`resultText`) and thin DOM shell (`init`) | Zero cost for normal players (nothing loads without the flag), headless-testable core, single place to remove before any release | index.html, dev/debug.js, js/ui.js (no ui change), tests/game.test.js | New regression group (b) — 12/12 groups pass; flag regex checks pass |
| 2026-10-18 | Save v2 keeps the localStorage key `crystal-quest-save-v1` (version lives in the data as `v:2`) | Changing the key would orphan every existing player save; migration on first load covers the version bump | js/ui.js | Migration regression group (a) passes: v1 → v2, backup written, progress kept |
| 2026-10-18 | Restoration progress is derived from stars in levels 1–10, never stored as a counter; only `world.forest.seen` (viewed fragment ids) is persisted | Single source of truth — progress can never desync from actual stars; still gives one-time "New" story badges | js/ui.js | World restoration group (d) passes |
| 2026-10-18 | Export code = `CQSAVE2-` + own base64 implementation (no btoa/atob) | btoa/atob are browser-only and deprecated for unicode; save data is ASCII by construction; keeps headless testability | js/ui.js | Export/import group (c) passes incl. rejection paths |
| 2026-10-18 | Save backup (`crystal-quest-save-backup`) is written once at v1→v2 migration and intentionally kept even across Settings "Reset Progress" | Owner recovery path if a migration bug ever surfaces; reset clears progress, not the safety net | js/ui.js | Migration group (a) asserts backup contents |
| 2026-10-18 | Guardian tuned from 30 moves / 4-colour sequence (100% greedy win-rate) to 16 moves / 5-colour sequence [0,3,1,5,4] | Move budget + colour count are the effective difficulty levers; measured with the seeded bot (200 plays per policy) | js/levels.js, dev/bot.js | runStats + solvability group PASS (20/20) |
| 2026-10-18 | Relic claiming is exact-once via a persisted `world.relics` id list (save v stays 2; legacy saves absorb to `[]`), not derived on the fly | A derived list could re-toast after reload; persistence guarantees the reward fires once | js/ui.js | relics group PASS (20/20) |

## I. Next actions

- Completed: Phase 0 (repo inspection, baseline tests, branch created), Phase 1 (KNOWLEDGE.md established), Phase 2 (Crystal Resonance, commit 0ef53a4), Phase 3 (bot + balance + idle auto-hint + debug panel, commit 652c4d7, 12/12 groups), Phase 4 (save schema v2 with migration/backup/corruption-fallback/export-import, Crystal Forest restoration screen, commit ed001a4, 16/16 groups), Phase 5 (six-relic collection with exact-once claiming + Relic Vault screen, Guardian shield-sequence encounter as level 27, 20/20 regression groups, this commit).
- Pending: Phase 6 — offline daily challenges (date-seeded, prevalidated templates, once-per-day rewards, clock-backwards safe), mobile polish, accessibility (WCAG AA contrast, verify colorblind-safe shapes), performance, PWA (manifest, versioned service worker, offline). Then Phase 7 (optional ad adapter) and Phase 8 (final regression + report).
- Blockers: none.
- Exact next task: design the daily-challenge template set (seed = local date, deterministic level generation validated at creation with the seeded bot), extend save v2 with the same absorb pattern (e.g. `world.daily:{date,rewarded}`), add the daily entry point to the home screen; then the accessibility/contrast audit, mobile polish, and PWA (manifest + versioned service worker, offline shell).

## J. Asset and license log

- `images/bg_cavern.jpg` (124,087 bytes), `images/bg_map.jpg` (215,572 bytes) — sizes verified via GitHub API 2026-10-18; pre-existing in repo; ASSUMPTION: owner-provided originals. Total shipped size ≈ 487 KB < 2 MB budget.
- All gem/blocker sprites: procedurally drawn on canvas in `js/render.js` (self-generated, no license issues).
- Crystal Forest world scene: inline SVG in `index.html` + CSS transitions in `styles.css` (self-generated, no external assets).
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
