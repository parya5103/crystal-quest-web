# Crystal Quest — Native Android (Kotlin)
Separate native Android app. Existing web/PWA files are untouched.
Stack: Kotlin 2.4.21, AGP 9.3.1, Gradle 9.5.0, Compose BOM 2026.09.00, Material 3, MVVM/UDF, Hilt, Coroutines/StateFlow, Room and DataStore.
First playable slice: 8x8 six-gem board, adjacent swap validation, match detection, gravity/refill cascades, scoring, move limit, restart, persisted board state and deterministic tests.
Legacy save adapter recognizes the exact crystal-quest-save-v1 key and maps the existing v2 campaign/world fields. Import/export file-picker flow and full live campaign restoration still need end-to-end validation.
UMP consent request, privacy-options entry point and consent-gated Google Mobile Ads Next-Gen initialization are wired. The app ID defaults to Google's test app ID; no production ad unit is configured and no live ads are requested.
Build on JDK 17 with Android SDK Platform 37 and Build Tools 36.0.0: gradle --no-daemon :app:testDebugUnitTest :app:assembleDebug :app:bundleRelease
CI pins Gradle 9.5.0 and publishes a debug APK plus unsigned release AAB. A signed Play upload bundle requires a protected upload keystore. Supply `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` as Gradle properties (or `ORG_GRADLE_PROJECT_...` environment secrets); never commit the keystore or passwords.
Remaining gates: all 27 levels, Guardian/Relic/story mechanics, special combos, final audio assets, import/export UX, physical-device profiling, crash testing and Play release checks.
