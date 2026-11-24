# Crystal Quest: Gem Legends (crystal-quest-web) - Agent Instructions

Operating rules for any AI coding agent in this repository. KNOWLEDGE.md is the authoritative
project memory: read it fully before every session and update it after every significant change.

## Architecture invariants
- Single canvas 2D renderer (js/render.js), one RAF loop, animation lock via R.anim +
  Game.state === "resolving". Board is 8x8 with the CQGems palette.
- main is 2D-ONLY by owner decision. The 2D-only guard group in tests/game.test.js asserts no
  render3d/set-3d/gfx3d remnants and that js/render3d.js stays absent. Never reintroduce 3D.
- Story (js/story.js): 3 regions x 2 story beats, guardian levels 20 and 27; beats persist
  exact-once in world.story.

## Saves
- SAVE_VERSION stays 2. Old saves migrate silently (Save.absorbWorld; absorb only
  ["sfx","music","motion","symbols"]). Never break, rename or discard existing player saves.
- Corrupt/deeply invalid saves fall back to defaults without crashing boot.

## Service worker / PWA
- Any change to a precached asset requires a sw.js CACHE bump (cq-vN). The update flow is
  controlled: install does NOT skipWaiting; page posts SKIP_WAITING on updatefound; reloads
  guard against loops (cqReloading). Navigation pages cache under their own URLs; offline
  navigation prefers the requested page over the game shell.

## Testing requirements
- tests/game.test.js is the regression suite (32+ groups; the final output line must read
  "N regression groups passed."). tests/launch-readiness.test.js gates legal pages, offline
  cache and Android docs. Add/adjust tests with any behavior change; never weaken assertions.
- Test-shim constraints: DOM shims return minimal stubs; new UI code must guard optional DOM
  properties (classList/querySelector/scrollIntoView/offsetWidth).

## Ads, notifications, analytics
- js/ads.js is fail-closed: no ad may serve without a publisher ID and cmpReady = true done
  via a certified CMP. Never fake a rewarded-ad simulation.
- js/gogo-notifications.js + fcm/ : GoGo Central push module; keep the fail-closed config
  gate; the fcm service worker must install no fetch handler.

## Native / Android
- android/ and android-native/ packaging exists (Kotlin/Compose + TWA docs). Level geometry
  and rules must stay consistent with the web build; keep the web build canonical.

## Process
- Inspect before editing; smallest safe change; feature branch + PR; no force push; no direct
  commits to main; merge only with owner approval.
- No new npm dependencies or CDNs (zero-dependency architecture).
- Modifying minified/compressed object literals: recount all braces after inserted properties;
  never splice statements into comma/ternary expression chains.
- Anchor your edits on unique strings; match count must be exactly one before replace.
- Mobile-first target 360x800; preserve responsive behavior and 44px touch targets.
- Public pages must not expose GitHub repository links; never commit secrets; document
  environment variable names only.
