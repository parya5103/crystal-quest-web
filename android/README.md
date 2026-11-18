# Android packaging and native-engine release

Crystal Quest has two intended release targets:

1. **Website + PWA:** keep the currently published browser game at https://gogocompany.in/crystalquest/ available throughout the native-engine transition.
2. **Google Play:** build a true native 2D game client, not a website-only TWA wrapper.

## Approved permanent Android application ID

`in.gogocompany.crystalquest`

This ID is the intended permanent Play Store application ID. Do not change it after the first Play Console upload. The Play App Signing certificate fingerprint and root Digital Asset Links file must be added only after the actual signing setup is created.

## Technology direction: Candy Crush-class 2D architecture

Candy Crush Saga is not a public open-source template. Public reporting describes King's long-running game technology as its proprietary Fiction / Fiction Factory cross-platform C++ engine. Some historical development workflows also used Unity and other internal tools; there is no public basis to claim one exact engine for every Candy Crush release. References:
- https://www.figma.com/customers/how-king-brings-game-design-together/
- https://gamesbeat.com/steven-collins-interview/

**Decision for GoGo:** use **Cocos Creator 3.8 LTS-compatible project architecture** as the practical, commercially usable cross-platform path. Cocos Creator uses a C++ native engine core on Android and a web runtime for H5, with TypeScript/JavaScript game scripting. It supports both Android and web publishing from a shared project:
- https://docs.cocos.com/creator/3.8/manual/en/editor/publish/
- https://docs.cocos.com/creator/3.8/manual/en/editor/publish/native-options
- https://docs.cocos.com/creator/3.8/manual/en/scripting/language-support.html

This is **not King's proprietary engine**, and the TypeScript gameplay layer is not the same as King's private C++ codebase. It is a realistic route to native GPU-accelerated 2D rendering, sprite atlases, particles, skeletal animation, audio, touch input, and a shared Android + H5 game project without pretending the current Canvas app is already native.

### Migration strategy (safe, staged)

- Keep the current live web/PWA build working while the new engine project is developed separately.
- First port a single playable vertical slice: board rendering, touch swap, match detection, cascades, scoring, move count, win/loss, audio and save/load.
- Preserve the current 27-level data, level IDs, game rules, progression, relics, Guardian encounters, daily challenge and existing player save/export compatibility. Add explicit migration tests before replacing any production save path.
- Create a visual asset pipeline for original Crystal Quest art: high-resolution gem sprites, atlas packing, particle effects, polished UI, transitions, sound and haptics. Do not copy Candy Crush artwork, sounds, branding, level layouts or other copyrighted assets.
- Compare the native Android build and H5 build on real devices and browsers before switching the live PWA.
- Only promote the Cocos build to production after parity, performance, accessibility, save migration and offline tests pass.

## Ads and monetization

The current live web game deliberately keeps ads disabled. Do not enable ads until a certified CMP, correct regional consent flow, verified publisher/slot IDs and policy review are complete.

The native Android build can integrate the Google Mobile Ads SDK / AdMob rewarded ads through a supported native integration after consent, privacy disclosures and test-ad verification. Website/PWA ads remain a separate web-provider integration. Never show live ads or grant rewards based on an unverified ad callback.

## Android release requirements

- [ ] Create the Cocos Creator project and prove the vertical slice on Android and H5.
- [ ] Port the complete game with compatibility tests for all 27 levels and existing saves.
- [ ] Configure application ID `in.gogocompany.crystalquest` in the native Android build.
- [ ] Configure Android target API 36 or the newer Play requirement applicable at submission.
- [ ] Generate a signed AAB and record the Play App Signing SHA-256 certificate fingerprint.
- [ ] Publish and verify Digital Asset Links at `https://gogocompany.in/.well-known/assetlinks.json` only if a TWA is retained for any separate web-shell use. A native Cocos app does not need TWA verification to launch its game.
- [ ] Integrate and test native AdMob only after consent and policy setup.
- [ ] Complete Play Store listing, content rating, Data safety, internal testing and physical-device QA.

## Current status

This document records the approved package ID and native-engine direction. It does **not** claim that a Cocos project, Android Studio project, signed AAB, AdMob integration, Play Console listing or device QA has already been completed. Those are implementation and release gates.
