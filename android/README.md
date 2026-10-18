# Android packaging prep (Play Store / TWA)

Everything needed to wrap the shipped PWA into a Play Store app with a
Trusted Web Activity (TWA). The web app already meets the technical
requirements: valid manifest.json, HTTPS hosting, offline support via
sw.js, and an SVG icon.

## What is here

- ASSETLINKS.template.json - template for /.well-known/assetlinks.json.
  Replace YOUR.PACKAGE.NAME and YOUR_APP_SIGNING_SHA256_FINGERPRINT with
  the real values (Play Console: Release, Setup, App signing), then host
  the file at the domain root so Android verifies the link between site
  and app.

## Packaging steps (Bubblewrap, free, no Android Studio)

1. Install Node.js (desktop or Termux on Android), then in an empty
   folder: npm init -y && npm i -D @bubblewrap/cli
2. bubblewrap init --manifest https://YOUR-SITE/manifest.json
   (reads the live web manifest and generates the Android project)
3. bubblewrap build - produces a signed .aab plus the SHA-256
   fingerprint needed for the assetlinks file
4. Paste the fingerprint into ASSETLINKS.template.json, host it at
   /.well-known/assetlinks.json, rebuild, and upload the .aab to the
   Play Console

## Hosting caveat (GitHub Pages project site)

assetlinks.json must live at the domain root. A GitHub Pages project
site serves under username.github.io/repo/ and cannot provide that, so
Play Store verification needs a custom domain or a user site. Owner
decision.

## Owner actions before any Play Store release

- Google Play developer account: one-time registration fee (NOT zero budget).
- Privacy policy URL + Play Console data-safety form.
- Content rating questionnaire; declare the audience (puzzle game).
- Target API level: keep current with Play requirements (API 34+ at time of writing).
- Ads decision: no ads are configured; a TWA cannot script rewarded ads,
  so keep the PWA ad-free or switch to a Capacitor build with a native ad
  plugin.
