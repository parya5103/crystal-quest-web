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
- First port a single playable vertical slice: board rendering, touch swap, match detection, cascades, scoring, move count, win/loss, audio and save/load.
- Preserve the current 27-level data, level IDs, game rules, progression, relics, Guardian encounters, daily challenge and existing player save/export compatibility. Add explicit migration tests before replacing any production save path.
- Create a visual asset pipeline for original Crystal Quest art: high-resolution gem sprites, atlas packing, particle effects, polished UI, transitions, sound and haptics. Do not copy Candy Crush artwork, sounds, branding, level layouts or other copyrighted assets.
- Compare the native Android build and H5 build on real devices and browsers before switching the live PWA.
- Only promote the Cocos build to production after parity, performance, accessibility, save migration and offline tests pass.

## Ads and monetization

The current live web game deliberately keeps ads disabled. Do not enable ads until a certified CMP, correct regional consent flow, verified publisher/slot IDs and policy review are complete.

The planned native Android build can integrate the Google Mobile Ads SDK / AdMob rewarded ads through a supported native integration after consent, privacy disclosures and test-ad verification. Website/PWA ads remain a separate web-provider integration. Never show live ads or grant rewards based on an unverified ad callback.

## Privacy and store disclosures

Before release, publish and link the game's Privacy Policy and support contact. Keep the Play Store Data safety form, content rating, ads declaration and in-app disclosures consistent with the actual SDKs and data collected. No ad SDK may initialize before the required consent flow.

## Android release requirements

- [ ] Create a Cocos2d-x C++ Android project and prove the vertical slice on a physical Android device.
- [ ] Port the complete game with compatibility tests for all 27 levels and existing saves.
- [ ] Configure application ID `in.gogocompany.crystalquest` in the native Android build.
- [ ] Configure Android target API 36 or the newer Play requirement applicable at submission.
- [ ] Generate a signed AAB and record the Play App Signing SHA-256 certificate fingerprint.
- [ ] Publish and verify Digital Asset Links at `https://gogocompany.in/.well-known/assetlinks.json` only if a TWA is retained for any separate web-shell use. A native Cocos app does not need TWA verification to launch its game.
- [ ] Integrate and test native AdMob only after consent and policy setup.
- [ ] Complete Play Store listing, content rating, Data safety, internal testing and physical-device QA.

## Current status

This document records the approved package ID and proposed native-engine direction. It does **not** claim that a Cocos project, Android Studio project, signed AAB, AdMob integration, Play Console listing or device QA has already been completed. Those are implementation and release gates. The repository currently contains a dependency-light C++ gameplay-logic test foundation only.
