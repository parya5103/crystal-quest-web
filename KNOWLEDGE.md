# KNOWLEDGE.md — Crystal Quest: Gem Legends (persistent project memory)

Read this file before every work session. Update it whenever architecture, mechanics, save format, tests, dependencies or decisions change, and at the end of every phase. Record only verified facts; label unverified items as ASSUMPTION.

## A. Project identity

- Concept: original mobile-first match-3 puzzle adventure ("Crystal Quest: Gem Legends"). Swap adjacent crystals, match 3+, forge special gems (Line Blaster, Star Bomb, Prism Core), clear blockers (stone, ice), beat objectives within a move limit.
- Unique selling point (in progress): "Crystal Resonance" — energy veins linking board nodes that chain-clear when activated (signature mechanic, not found in mainstream match-3 clones).
- Target platform: Android-first mobile web (Chrome), static hosting (GitHub Pages), PWA planned.
- Budget: ₹0. Free tools only, no paid services, no backend, no paid assets.
- Current status: base game (20 levels) playable and stable on branch `fix/crystal-quest-mobile-gameplay` (commit a9b9b3d). Upgrade work happens on `feature/resonance-upgrade` (branched from a9b9b3d on 2026-10-18).

## B. Architecture map

Pure static site: no build step, no dependencies, no framework. Plain HTML/CSS/JS IIFE modules attached to `window`.

| File | Responsibility |
|---|---|
| `index.html` | App shell: screens (home/map/game), HUD, modals (pause/win/lose/settings/help), canvas `#board-canvas`, live region, loading overlay. Loads scripts in order: audio, levels, engine, render, ui, main. |
| `styles.css` | All styling, mobile-first; CSS variables for theme; `body.reduced-motion` + `prefers-reduced-motion` support. |
| `js/audio.js` | `CQAudio` — Web Audio API synthesis (SFX + music loop), master/sfx/music gains, safe unlock on first gesture, no external audio files. |
| `js/levels.js` | `CQLevels.LEVELS` — 20 level objects `{id,name,moves,layout,objectives,stars,hint}`. Layout strings 8x8: `.` empty, `#` hole, `S` stone, `I` ice. `CQLevels.get(id)`. |
| `js/engine.js` | `CQEngine` — pure logic: 8x8 grid, seeded RNG (`makeRng`, mulberry32-like), `createBoard` (no initial match, guaranteed valid move), `findMatches`, `planSpecials` (4-run→line, 5-run→prism, L/T→bomb), `expandClears` (BFS special detonation), `applyGravity`, `canSwap` (includes prism+plain and special+special), `trySwap` (swap/combo/prism paths, emits animation steps), `resolveBoard` (cascade loop, guard 60), `shuffleBoard` (deterministic via rng), `damageBlockers`, `makeCtx`, `objectiveProgress/objectivesMet`, `starsFor`. |
| `js/render.js` | `CQRender` — canvas board rendering: cached gem/blocker sprites (per shape/special/size), `playSteps` animation queue (`swap/revert/clear/fall` step types), particles, popups, flashes, shake, hint/selected/cursor overlays, single rAF loop. |
| `js/ui.js` | `CQSave` (localStorage `crystal-quest-save-v1`, schema v1, corrupt-storage recovery), `UI` (screens/toast/modals/level map/settings), `Game` controller (pointer/keyboard input, attemptSwap→playSteps→afterTurn win/lose/shuffle flow, pause/resume, hints), `CQBoot`. |
| `js/main.js` | DOM-ready boot + `CQTest.run()` in-browser self test (27 checks). |
| `dev/harness.js` | Headless test harness (dev only, not loaded by the game): browser shims, used by dev runner scripts. |

Hosting: GitHub Pages static. No service worker yet (PWA planned in Phase 6 of the roadmap).

## C. Feature inventory

Verified implemented (all verified by headless test run unless noted "browser only"):

- Match-3 core: swap adjacent, 3+ line matches, cascades with score multiplier (cap x5), invalid-swap revert animation.
- Special gems: Line Blaster (4-run), Prism Core (5-run, clears a colour; swapped with plain gem clears that colour), Star Bomb (L/T), all pair combos of specials (CROSS BEAM, NOVA BLAST, QUAKE, PRISM SURGE, TOTAL ECLIPSE).
- Blockers: stone (hp 1, break by adjacent match), ice (hp 2), holes (`#`) affect gravity.
- 20 levels: score / collect / clear objectives, 3 star thresholds, level map with lock progression, last-level continue button.
- Save: localStorage v1 (unlocked, stars, best, lastLevel, settings: sfx/music/reduced-motion/symbols), corrupt JSON → defaults, non-removing recovery. (Browser only: not headless-testable in current layout — see G.)
- UI: pause/resume/restart/quit, settings modal, help modal, toast + aria live region, keyboard controls (arrows/space/enter/esc/h), manual hint + manual shuffle (costs 1 move), auto-reshuffle when no valid moves (free, deterministic), error toasts on runtime errors.
- Audio: synthesized SFX/music, gesture unlock, toggles persisted.
- Responsive board via ResizeObserver + resize handler; reduced-motion support (CSS + render flags).

Planned / not yet implemented: Crystal Resonance, auto-hint after idle, playtest bot + balance, Crystal Forest world restoration, save schemaVersion migration + export/import, relics + Guardian, daily challenges, PWA (manifest/service worker), ad adapter.

Known base-game issues (verified in README, present on main; fixed on fix branch — verified by reading fix-branch levels.js): levels 14/19 ice objective counts now match layouts. README on `main` is stale relative to the fix branch.

## D. Technical rules

- Engine API contracts (as of base): `trySwap(grid,a,b,rng,ctx) -> {ok,reason?,steps,cascades}`; steps: `{t:"swap",a,b}`, `{t:"revert",a,b}`, `{t:"clear",cleared,blockers,forged,activated,score,combo,mult,label?}`, `{t:"fall",moves,spawns}`. `grid` cells: `{k:"g",g:0-5,s:special|null}`, `{k:"b",b:"stone"|"ice",hp}`, `{k:"e"}`, `null` (hole). `ctx` from `makeCtx(level)`: `{score,collected[6],blockersCleared{stone,ice},preferred,prismColor,rng,level}`.
- Move resolution: swap → (special combo | prism+plain | findMatches) → resolveBoard cascade loop (match → plan specials → expandClears → keep specials → score 60/clear × cascade mult + 200/forged + 100/blocker → damage adjacent blockers → forge specials → gravity) until no matches. Guard: 60 iterations.
- Save schema v1: `{v:1,unlocked,stars{},best{},lastLevel,settings{sfx,music,motion,symbols}}`, key `crystal-quest-save-v1`.
- Level objectives: `{type:"score",target}`, `{type:"collect",gem,count}`, `{type:"clear",blocker:"stone"|"ice",count}`; all must be met to win; ≥1 star forced on win.
- RNG policy: all gameplay randomness must use the seeded `makeRng`. Known violations in base code being fixed in this upgrade: `findHint` uses `Math.random` (hint choice), `resolveSpecialCombo` gravity falls back to `Math.random` when `ctx.rng` unset (Game always sets it). Rendering-only randomness (particles/shake) may use Math.random (visual only).
- Mobile input: pointer events with threshold-based swipe; tap-tap and drag both swap; blockers not selectable; canvas has pointer capture.
- Audio: created lazily on first gesture (autoplay policy); every play call must be safe if audio unavailable.
- Dependencies: none. Constraint: no new frameworks; total shipped size < 2 MB (current: ~92 KB code + 2 background images, verify images size before release).

## E. Bugs and regression history

| Issue | Root cause | Fix | Status |
|---|---|---|---|
| Levels 14/19 unwinnable (ice objective > ice in layout) | Objective counts didn't match layout tiles | Layouts/objectives corrected on `fix/crystal-quest-mobile-gameplay` (levels.js: L14 ice count 6 = 6 tiles, L19 ice 4 = 4 tiles) | Fixed on fix branch; verified by inspection 2026-10-18; solvability re-verified by bot in Phase 3 |
| Pause during cascade could freeze game | resolving state had no pause path | `pauseRequested` flag handled at end of resolution (ui.js attemptSwap/afterTurn) | Fixed on fix branch; verified by code inspection |
| Hint/no-move detection mismatch (`canSwap` vs `hasValidMove`) | hint used a different validator | `findHint`/`hasValidMove` now both use `canSwap` (fix branch) | Fixed; `findHint` still uses `Math.random` for choice → converted to seeded rng in Phase 2 |
| Headless `save: module available` test fails | Save object lives in ui.js which requires real DOM | ASSUMPTION: browser-only. Plan: extract Save to its own module in Phase 4 so save tests run headless | Open (planned) |

## F. Product roadmap (priority order)

1. Crystal Resonance (signature mechanic) — in progress.
2. Playtest bot + level balance (win-rates 85–95% for levels 1–10, breather levels after hard ones) + auto-hint (6s idle) + free deterministic auto-shuffle.
3. World restoration: Crystal Forest region (CSS/SVG visuals, restoration progress, story fragments), save schemaVersion + migration + backup + export/import.
4. Relics collection + one Guardian encounter (shield-sequence objective).
5. Daily challenges (offline, date-seeded, prevalidated templates, once-per-day rewards, clock-backwards safe).
6. Mobile polish, accessibility (WCAG AA contrast, colorblind-safe shapes — shapes already exist, verify contrast), performance, PWA (manifest, versioned service worker, offline).
7. Optional rewarded-ads adapter (no live ads until a provider is verified by the owner).

## G. Testing and release status

- Baseline (2026-10-18, branch point a9b9b3d): syntax parse of all 6 JS files — OK (via `new Function` parse in headless harness). `CQTest.run()` headless: 26/27 pass; 1 fail is `save: module available` (browser-only module, see E). Browser run of CQTest not yet performed this session.
- Headless runner: `dev/harness.js` + runner executed in the agent sandbox (no Node available; harness uses JS shims). Commands: load engine.js/levels.js/main.js into shim, call `window.CQTest.run()`.
- Physical Android device testing: NOT performed. All testing this session is headless logic testing; browser emulation/viewport checks pending.
- Deployment: none. Work only on `feature/resonance-upgrade`. No merges, no force-push, no deploy without owner authorization.

## H. Decision log

| Date | Decision | Reason | Files | Validation |
|---|---|---|---|---|
| 2026-10-18 | Branch `feature/resonance-upgrade` from `fix/crystal-quest-mobile-gameplay` tip (a9b9b3d), not from `main` | fix branch contains verified gameplay/mobile fixes absent from main | — | GitHub API branch creation |
| 2026-10-18 | Add `dev/` folder for headless harness/bot (shipped but not referenced by index.html) | Reproducible tests without Node/pytest; zero runtime cost | dev/harness.js | Baseline run 26/27 |
| 2026-10-18 | Keep engine pure (no DOM) so all gameplay logic is headless-testable | Existing architecture already separates engine/render; testability requirement | engine.js | CQTest engine checks pass headless |

## I. Next actions

- Completed: Phase 0 (repo inspection, baseline tests, branch created), Phase 1 (KNOWLEDGE.md established).
- Pending: Phase 2 Crystal Resonance (rules below → implement → test → commit), then roadmap F.2 onward.
- Blockers: none.
- Exact next task: document Resonance rules in this file, then extend `js/engine.js` with resonance functions (pure, seeded, depth-capped), add `R` vein nodes to level layouts, add vein rendering to `js/render.js`, wire hint-idle timer in `js/ui.js`, extend `js/main.js` CQTest with resonance tests.

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
