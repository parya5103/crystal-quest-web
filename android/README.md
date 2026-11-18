# Android packaging and Google Play release

Crystal Quest has two release targets:

1. **Website + PWA:** the static web game at https://gogocompany.in/crystalquest/ with installability and offline caching.
2. **Google Play:** package the same hosted experience as an Android Trusted Web Activity (TWA) using Bubblewrap.

The repository contains packaging preparation only. It is not yet a signed Android project or a Play Store submission.

## TWA approach

A TWA keeps the game running as the hosted website inside a verified Android browser experience. It avoids maintaining a separate native gameplay implementation and keeps the web and Android releases on the same codebase.

A TWA can render web-page advertising when the website's provider, consent flow and policies allow it. It does **not** expose the native Google Mobile Ads SDK to page JavaScript. The existing `CQAds` rewarded-revive adapter therefore remains unavailable in a TWA unless a compatible web rewarded provider is integrated. If native AdMob rewarded ads are a launch requirement, use a Capacitor/native Android wrapper and implement/test the native bridge instead of pretending the current adapter is live.

## Required owner-side setup

1. Create or use a Google Play developer account and complete its identity/account verification.
2. Choose and permanently confirm the Android application ID/package name.
3. Install Node.js and Bubblewrap CLI in a trusted desktop or Termux environment.
4. Initialize Bubblewrap from the production manifest:
   `bubblewrap init --manifest https://gogocompany.in/crystalquest/manifest.json`
5. Generate a signed Android App Bundle (AAB) and record the **Play App Signing** SHA-256 certificate fingerprint from Play Console.
6. Replace the placeholders in `ASSETLINKS.template.json` and publish the final JSON at:
   `https://gogocompany.in/.well-known/assetlinks.json`
   This must be served from the domain root, not from `/crystalquest/`.
7. Verify Digital Asset Links and launch the TWA on a physical Android device.
8. Prepare Play Store listing assets, screenshots, app description, content rating and Data safety declarations.
9. Upload to internal testing first; test install, launch, offline behavior, navigation, back button, status/navigation bars, notifications and updates before any production rollout.

## Website/PWA monetization vs Play Store

The current game deliberately keeps all ads disabled. The AdSense loader is not present in the page, the consent-management platform is not configured, and no rewarded provider is registered. Do not remove this fail-closed behavior until a certified CMP, correct region-specific consent configuration, verified publisher/slot IDs and policy review are complete.

For the website/PWA, web display ads can be integrated only after consent and provider approval. For a TWA, web ads remain subject to the same website policy and consent requirements. Native AdMob rewarded ads require a native wrapper such as Capacitor plus a tested native bridge; they are not supplied by the current TWA.

## Release blockers to close

- [ ] Confirm legal publisher/controller name and a real privacy contact channel.
- [ ] Publish and review the Privacy Policy and Terms pages.
- [ ] Confirm final package name and Play App Signing certificate.
- [ ] Publish and verify root-level Digital Asset Links.
- [ ] Generate and sign the AAB; verify the bundle on real devices.
- [ ] Complete Play Console declarations and testing requirements using the rules current at submission time.
- [ ] Decide whether Android release is a TWA (web ads only) or a native/Capacitor app (native AdMob possible).
- [ ] Perform physical-device QA on supported Android versions and screen sizes.

## Important notes

- A GitHub Pages project path cannot host `/.well-known/assetlinks.json` at the domain root. The custom domain `gogocompany.in` is the intended verification host.
- Do not hard-code a target API level from an old guide. Check the current Play Console requirement when creating the release.
- Do not publish placeholder package IDs, certificate fingerprints, privacy contacts or unverified claims.
