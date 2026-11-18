# Android packaging and native-engine release

Crystal Quest has two intended release targets:

1. **Website + PWA:** keep the currently published browser game at https://gogocompany.in/crystalquest/ available throughout the native-engine transition.
2. **Google Play:** develop a true native 2D Android game client; do not replace the browser game with a website-only TWA wrapper.

The current public browser app is not a **Trusted Web Activity (TWA)** migration target. This is a separate native Cocos2d-x Android game project. Keep the web/PWA delivery unchanged during native development.

## Approved permanent Android application ID

`in.gogocompany.crystalquest`

This is the intended permanent Play Store application ID. Do not change it after the first Play Console upload. The Play App Signing certificate fingerprint and root Digital Asset Links file must be added only after the actual signing setup is created.

## Proposed technology direction: Candy Crush-class 2D architecture

Candy Crush Saga is not a public open-source template. Public reporting describes King's long-running game technology as its proprietary Fiction / Fiction Factory cross-platform C++ engine. Some historical development workflows also used Unity and other internal tools; there is no public basis to claim one exact engine for every Candy Crush release. References:
- https://www.figma.com/customers/how-king-brings-game-design-together/
- https://gamesbeat.com/steven-collins-interview/

**GoGo's approved direction:** use **Cocos2d-x with C++ for the planned Android game client**. This is a practical open-source direction for a native C++ 2D game. Cocos2d-x is a cross-platform C++ 2D framework with native Android support, GPU-backed rendering, sprite sheets, particle systems, skeletal animation support, audio and touch input:
- https://www.cocos.com/en/cocos2d-x
- https://github.com/cocos2d/cocos2d-x

This is **not King's proprietary Fiction engine**, and it will not reproduce King's private source code or exact internals. The current Website/PWA remains live in its existing web implementation while the proposed native Android client is developed separately in C++. Keep level definitions and compatibility fixtures in portable, versioned data so both clients can stay behaviorally aligned. The web and planned native clients will initially have separate runtime code; do not claim a single shared C++ codebase for browser and Android.

### Migration strategy (safe, staged)

- Keep the current live web/PWA build working while the new engine project is developed separately.
- Native scaffold now uses a pinned Cocos2d-x v4 source revision, C++17, Gradle/AGP, Android NDK and CMake. CI builds the Android app and separately runs the native gameplay-rule tests.
- The native scene now loads the original 27 level definitions and deterministic initial boards exported from `js/levels.js` + `js/engine.js`; it supports six gem colours, match detection, cascades, score/move objectives, blockers, irregular board cells and native-only progress persistence.
- The first vertical slice is still a foundation: special-gem combos, Guardian/Relic/Resonance mechanics, exact RNG parity, sound assets, richer sprite animation and cross-client save import remain to be ported and tested.
- Preserve the current 27-level data, level IDs, game rules, progression, relics, Guardian encounters, daily challenge and existing player save/export compatibility. Add explicit migration tests before replacing any production save path.
- Create a visual asset pipeline for original Crystal Quest art: high-resolution gem sprites, atlas packing, particle effects, polished UI, transitions, sound and haptics. Do not copy Candy Crush artwork, sounds, branding, level layouts or other copyrighted assets.
- Compare the native Android build and H5 build on real devices and browsers before switching the live PWA.
- Only promote the Cocos build to production after parity, performance, accessibility, save migration and offline tests pass.

## Ads and monetization

The current live web game deliberately keeps ads disabled. Do not enable ads until a certified CMP, correct regional consent flow, verified publisher/slot IDs and policy review are complete.

The native Android scaffold now includes UMP 4.0.0, Google Mobile Ads Next-Gen 1.6.0, a consent-gated initialization helper and a privacy-options entry point. It does not yet request or display ads because production AdMob app/ad-unit IDs and publisher privacy messages have not been configured. The default app ID is Google's test app ID; pass `-PADMOB_APP_ID=ca-app-pub-...~...` for a production build only after the AdMob app is registered and UMP messages are configured. Website/PWA ads remain a separate web-provider integration. Never show live ads or grant rewards based on an unverified ad callback.

## Privacy and store disclosures

Before release, publish and link the game's Privacy Policy and support contact. Keep the Play Store Data safety form, content rating, ads declaration and in-app disclosures consistent with the actual SDKs and data collected. No ad SDK may initialize before the required consent flow.

## Android release requirements

- [x] Add a Cocos2d-x v4 / C++17 Android project scaffold and a reproducible CI build workflow.
- [ ] Confirm the CI-produced APK/AAB build is green and install the APK on physical Android devices.
- [ ] Port the complete game with parity tests for all 27 levels, special combos, Guardians, Relics, Resonance and web-save import/export.
- [ ] Configure application ID `in.gogocompany.crystalquest` in the native Android build.
- [ ] Configure Android target API 36 or the newer Play requirement applicable at submission.
- [ ] Generate a signed AAB and record the Play App Signing SHA-256 certificate fingerprint.
- [ ] Publish and verify Digital Asset Links at `https://gogocompany.in/.well-known/assetlinks.json` only if a TWA is retained for any separate web-shell use. A native Cocos app does not need TWA verification to launch its game.
- [x] Add UMP consent flow, privacy-options UI and GMA Next-Gen initialization gate (test app ID only; no ad requests yet).
- [ ] Add production AdMob app/ad-unit IDs, privacy messages and age/audience treatment; then test rewarded/banner formats using test ads.
- [ ] Complete Play Store listing, content rating, Data safety, internal testing and physical-device QA.

## Current status

This document records the approved package ID and native-engine implementation direction. The repository now contains the Cocos2d-x Android project scaffold, native match-3 scene, C++ gameplay rules, campaign export script and Android CI workflow. CI and device validation remain release gates; no signed AAB, AdMob integration, Play Console listing or physical-device QA is claimed complete.
