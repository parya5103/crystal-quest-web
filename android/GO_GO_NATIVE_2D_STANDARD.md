# GoGo Native 2D Android Engineering Standard

This repository's native Android client follows the shared GoGo game technology direction:

- **Engine:** Cocos2d-x v4, C++17 gameplay code, CMake and Android NDK.
- **Rendering:** native 2D sprites/sprite atlases, batched rendering where appropriate, particles, authored transitions and responsive safe-area-aware UI.
- **Input:** native touch/pointer handling with explicit pause, focus-loss and lifecycle handling.
- **Assets:** original GoGo-owned art/audio only; texture atlases, documented source files and reproducible export settings.
- **Build:** Android App Bundle (AAB), reproducible CI build, pinned toolchain/dependencies, no secrets in source control.
- **Quality:** deterministic gameplay tests, save compatibility tests, device profiling, offline launch and accessibility checks.

## Separation of concerns

The two games share the engine, build conventions, release checklists and reusable platform services only. They do **not** share gameplay rules or board implementations:

- Crystal Quest owns match-3 board rules, cascades, combos, Guardians, Relics, levels and its existing save format.
- Arrow Out owns winding-path arrow generation, exit-corridor rules, campaign/daily puzzles, hints, undo, hearts and its existing save format.

Keep each game's current JavaScript Website/PWA implementation live. The native C++ app is a separate client. Share only explicitly versioned portable data/contracts where parity tests prove compatibility; never replace a web save or level format by assumption.

## Release safety gates

Do not call a native build production-ready until all of these are evidenced:

1. A clean Cocos2d-x Android build from CI using the pinned NDK/CMake toolchain.
2. A playable native vertical slice on a physical Android device.
3. Deterministic tests for game rules and level/puzzle fixtures.
4. Save import/export compatibility tests and a tested rollback path.
5. 60 FPS target profiling on a representative mid-range Android device, with measured frame-time and memory results (report actual measurements; do not invent them).
6. App lifecycle, touch, audio focus, offline launch, rotation/orientation and accessibility checks.
7. Privacy/consent before any ad SDK initialization; use test ads until policy and publisher configuration are verified.
8. Signed AAB, Play App Signing fingerprint, Play Console internal test and completed store disclosures.

Never commit keystores, signing passwords, service-account JSON, ad secrets or user data. Use GitHub Actions secrets for release signing. Do not enable live ads or reward a user without a verified rewarded-ad completion callback.

## Toolchain policy

Cocos2d-x is a separate native dependency, not a JavaScript package. Pin the exact engine release/commit and Android NDK/CMake versions in the native build before enabling release CI. Do not download a floating `latest` dependency in a release workflow. Check current Google Play target API requirements at submission time.
