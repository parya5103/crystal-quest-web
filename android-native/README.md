# Crystal Quest — Native Android (Kotlin)

Separate native Android app. Existing website/PWA files and its service worker remain untouched.

## Architecture
Kotlin 2.4.21, AGP 9.3.1, Gradle 9.5.0, KSP 2.3.12, Compose Material 3, MVVM/UDF, Hilt, Coroutines/StateFlow, Room and DataStore. Keep working in this architecture; do not create a parallel Cocos/Unity/Godot migration.

Package ID: `in.gogocompany.crystalquest`. Keep stable after first Play Console upload.

## Current native gameplay
- 8×8 six-gem board with deterministic generation, adjacent swap validation, match detection, gravity/refill cascades and scoring.
- Valid-match move consumption, score goal, explicit win/loss, continue/retry and no-valid-move reshuffle.
- The canonical 27-level campaign catalog is generated from `js/levels.js` during CI and includes layouts, objective metadata, guardian sequence data, hints and all three official score thresholds.
- Score-based star awards, best stars per level, unlocked-level progression and Room persistence are wired.
- Room save/restore, including migration defaults for newly added level metadata.
- Native **Import existing PWA progress** accepts the existing `CQSAVE2-` export code from the web game's Settings, restores campaign/best scores/stars/settings/relics/story/daily progress, and retains the original JSON snapshot. The web save remains untouched.
- UMP consent request, privacy-options entry point and consent-gated Google Mobile Ads Next-Gen initialization. Uses Google's test app ID; no production ad units or live ads configured.

## Important parity gap
The 27-level native progression is not yet a full port of the browser game. Blockers (stone/ice/obsidian/cages), special gem types and combinations, collect/clear/resonance objectives, Guardian sequences, Relics, story triggers, daily challenge, booster economy, guardian encounters, resonance mechanics, and complete browser import/export UX still need implementation and compatibility tests against `js/levels.js` and `js/engine.js`. Do not mark campaign parity complete until these are implemented and tested.

## Build
JDK 17, Gradle 9.5.0, AGP 9.3.1, Kotlin 2.4.21, KSP 2.3.12, Android SDK Platform 36 and Build Tools 36.0.0.

From the repository root, generate the campaign asset first:
`node scripts/generate-native-levels.cjs`

Then from `android-native/` run:
`gradle --no-daemon :app:testDebugUnitTest :app:assembleDebug :app:bundleRelease`.

CI publishes a debug APK and unsigned release AAB after tests. A signed Play upload bundle requires protected `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` properties; never commit keystores or passwords.

## Remaining release gates
Full browser-engine parity, original polished gem art/particle effects/audio/haptics, complete save migration beyond the current CQSAVE2 progress import, physical-device profiling and crash testing, verified production AdMob IDs/consent, signed AAB and Play Console review. A successful vertical-slice build is not a complete commercial release.
