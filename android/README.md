# Android packaging and native-engine release

Crystal Quest has two separate release targets:

1. **Website + PWA:** keep https://gogocompany.in/crystalquest/ working. The existing web game and service worker are not replaced by this Android work.
2. **Native Android:** build a separate Kotlin + Jetpack Compose application for Google Play.

## Approved native architecture

The current approved implementation is **Kotlin + Jetpack Compose + Material 3**, with MVVM/UDF, Hilt, Coroutines/StateFlow, Room and DataStore. Continue in this architecture; do not start a parallel Cocos2d-x/C++ migration unless the owner explicitly changes the decision.

Package ID: `in.gogocompany.crystalquest`. Keep it stable after the first Play Console upload.

This is a native Android application, not a Trusted Web Activity (TWA). Trusted Web Activity compatibility is intentionally kept separate: the current Website/PWA remains separately published and must not be modified by native Android changes. Do not change any existing TWA manifest or signing identity used by other GoGo apps.

## Game parity requirements

- Preserve the original 27 level IDs, names, move limits, board layouts, objectives and star thresholds from `js/levels.js`.
- Port the existing engine rules from `js/engine.js`: blockers, ice, cages, special gems, combo interactions, gravity, cascades, resonance, Guardian sequences, win/loss and shuffle behavior.
- Preserve the existing browser save key, export/import format, progression, relics, daily streaks and story flags. Migration must be tested against real browser exports before being called complete.
- Keep all art, animation, music, sound and UI assets original to GoGo. Do not copy Candy Crush artwork, sounds, branding, level layouts or proprietary code.

## Ads and privacy

Use Google's User Messaging Platform and consent-gated Google Mobile Ads SDK. Only request ads when `canRequestAds()` is true. Use test app/ad IDs during development. Production IDs, privacy disclosures, regional consent behavior, child-directed treatment and ad placements require verification before release. Never grant a reward unless the rewarded-ad callback confirms completion. Rewarded ads are not yet implemented; do not grant in-game rewards from ad callbacks until the rewarded-ad flow is implemented and tested.

## Build and release gates

- [ ] All 27 official levels and objectives pass deterministic compatibility tests.
- [ ] Save import/export and migration tested using real browser-export fixtures.
- [ ] Gameplay, special gems, blockers, Guardian/Relic/story systems and audio are complete.
- [ ] Debug APK and release AAB build successfully in CI.
- [ ] Release AAB signed with protected upload-keystore secrets; never commit keystore/passwords.
- [ ] Physical Android device QA: touch, rotation policy, lifecycle, offline, FPS, memory, battery and crash-free sessions.
- [ ] AdMob test ads and UMP flows verified; Play Console Data safety, content rating and store listing completed.

## Current status

The Kotlin native project is in active development under `android-native/`. A vertical slice and CI workflow are not the same as a complete game or a Play-ready release. Keep this checklist honest and update it only when the corresponding evidence exists.
