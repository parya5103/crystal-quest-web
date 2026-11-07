# Crystal Quest — Security & Quality Audit

Date: 2026-11-07
Scope: repository `parya5103/crystal-quest-web` (static Canvas 2D match-3 game, GitHub Pages hosting).
Method: manual source audit of the full repository, per GoGo Company master security pass. Open-source tooling: Gitleaks (MIT) and Trivy (Apache-2.0) added as CI scans; CodeQL and Dependabot added for action/dependency hygiene.

## Architecture (verified)

- Vanilla JavaScript + Canvas 2D. No build step, no framework, no backend, no database.
- Offline support: `sw.js` versioned cache (`cq-v16` at audit time), scoped to this app's `cq-*` caches only.
- Ads: a rewarded-only `CQAds` adapter with no provider registered by default (game fully playable without ads), plus a single AdSense display slot on the main menu.
- No visitor-facing GitHub repository links anywhere in the codebase (verified by search).

## Findings

### Fixed in this PR

1. **High — AdSense consent gate was region-guessing, not fail-closed.** `js/ads.js` served the menu display ad to visitors outside a guessed EEA/UK/Switzerland region even though no certified consent-management platform is wired in (`cmpReady === false`). Guessing a visitor's region from `navigator.language` and `Intl` timezone is not a consent signal and is an AdSense policy risk.
   - Fix: replaced the guess with a fail-closed `adsAllowed()` gate, mirroring the already-merged GoGo/Sarkari/PikaNews consent fixes. The ad slot now stays hidden for every visitor until a certified CMP integration exists and sets `cmpReady` to true.
   - Evidence: `js/ads.js` (consent block; `consentRegionLikely` removed, `adsAllowed` added).
2. **Required companion — service worker cache bump.** `js/ads.js` is precached by the service worker, so players would keep the old ad logic until the cache version changed.
   - Fix: `sw.js` cache bumped `cq-v16` → `cq-v17` (old caches delete on activation; save data lives in localStorage and is untouched).
   - Evidence: `sw.js` (`var CACHE = 'cq-v17'`).
3. **Medium — no CI at all.** The repository had no workflows, no dependency/action scanning, no secret scanning.
   - Fix: added `security-scan.yml` (Gitleaks full-history secret scan + Trivy fs scan with a CRITICAL gate), `codeql.yml` (CodeQL JavaScript analysis), and `dependabot.yml` (weekly `github-actions` updates). All third-party actions are pinned to full commit SHAs.
4. **Low — dev debug backdoor documented.** `index.html` loads `dev/bot.js` and `dev/debug.js` when the page URL contains `?debug=1`. These are development-only helpers shipped to production.
   - Decision: documented, not removed this round (no security impact found in the scripts; removing them is a separate decision for the game author). The service worker already refuses to cache `/dev/` paths.

### Verified non-issues / honest notes

- **Rewarded ads are honest.** `CQAds.register` is a provider-optional adapter. No fake or simulated ad is ever shown; rewards are granted only inside a real provider's `onReward` callback. No provider is registered today, so rewarded features stay disabled by design.
- **AdSense integration is single-slot and menu-only.** One labelled home-screen slot, loader tag in `index.html`; gameplay screens never carry ads. Publisher ID and slot are set via attributes only.
- **Security headers are impossible on GitHub Pages.** Static hosting on GitHub Pages does not let an app set CSP, HSTS, or other security headers. This is a documented platform limitation shared by all GoGo Company sites on Pages; it is tracked at the company level, not fixable here.
- **No secrets committed.** No tokens, keys, or credentials exist in the repository or its history (Gitleaks will enforce this in CI from now on).

## Remaining risks / not verified

- No browser, device, or live-URL testing was performed in this pass (CI checks only). Lighthouse, axe-core, and OWASP ZAP runs against the live Pages URL are recommended as a follow-up round; they cannot run from the authoring sandbox used here.
- The dev debug flag (`?debug=1`) remains present by decision; revisit if the dev scripts are ever removed from the repo.

## License notes

- Gitleaks: MIT. Trivy / trivy-action: Apache-2.0. CodeQL/Dependabot: GitHub-hosted services (no license conflict; no code copied into this repo).
- No UI library, ad server, or header-bidding library was adopted: the game is framework-free vanilla JS by design, and AdSense-only monetization does not need Prebid.js or Revive Adserver.
