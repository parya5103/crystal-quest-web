# Crystal Quest — Native Android (Kotlin)
Separate native Android app. Existing web/PWA files are untouched.
Stack: Kotlin 2.3.21, AGP 9.4.1, Gradle 9.6.0, Compose BOM 2026.09.00, Material 3, MVVM/UDF, Hilt, Coroutines/StateFlow, Room and DataStore.
First playable slice: 8x8 six-gem board, adjacent swap validation, match detection, cascades, scoring, move limit, restart and deterministic tests.
Build on JDK 17 with Android SDK Platform 37 and Build Tools 36.0.0: gradle --no-daemon :app:testDebugUnitTest :app:assembleDebug
The CI workflow pins Gradle 9.6.0. Generate a local wrapper with gradle wrapper --gradle-version 9.6.0.
Full 27-level campaign, Guardian/Relic/story systems, exact browser-save import/export, final sound assets, consent UI and signed Play bundle remain separate acceptance gates.
