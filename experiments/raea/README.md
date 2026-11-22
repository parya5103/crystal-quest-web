# RAEA visual experiment — Crystal Quest

Status: **experimental / not integrated into the live game**.

This folder tests RAEA as a GPU-rendered creative tool for a short Crystal Quest intro and future visual assets. The production game remains the existing dependency-free Canvas 2D/PWA project. This experiment does not replace or modify gameplay, save data, service worker, ads, analytics, or mobile input.

## Why this boundary

- The current production game is static HTML/CSS/vanilla JavaScript and already has a mature match-3 engine, renderer, 27 levels, local save migration/export-import, and PWA support.
- RAEA compositions are React/TypeScript, frame-driven and rendered/played by a native desktop engine. That is a separate runtime, not a drop-in browser Canvas renderer.
- Therefore the first safe use is asset production (intro/video/stills), not embedding RAEA in the production PWA or porting match-3 rules.

## Licence / commercial-use check

The upstream RAEA README states FSL-1.1-ALv2: use, modify and redistribute for permitted purposes other than a product that competes with RAEA; each version changes to Apache-2.0 two years after its release. RAEA also includes third-party components under their own licences; see upstream NOTICE. This experiment only uses the RAEA SDK API and contains no copied engine source. Re-check the exact licence and NOTICE for the pinned RAEA release before shipping any generated or bundled output commercially.

Upstream:
- https://github.com/shinyobjectz/raea
- https://raea.io/docs/start/install/
- https://raea.io/docs/start/first-game/
- https://raea.io/docs/reference/cli/render/

## Run on Windows

Install RAEA from its official installer (free; no API key/account required):

```powershell
irm https://raea.io/install.ps1 | iex
raea --version
```

From the repository root:

```powershell
raea render experiments/raea/crystal-quest-intro.tsx --frame 150 -o crystal-quest-intro.png
raea render experiments/raea/crystal-quest-intro.tsx -o crystal-quest-intro.mp4
```

RAEA requires Windows 10/11, a DirectX 12 or Vulkan GPU driver, and the Microsoft Visual C++ Redistributable (x64). Its Windows build is described upstream as the least-tested desktop target. Linux x86_64 is also supported upstream; follow the official install page.

## Acceptance gate before using outputs

1. Render frame 150 and the full 10-second MP4 without errors.
2. Inspect the still and video for clipped text, missing glyphs, flicker, layout drift and GPU artefacts.
3. Confirm the visual treatment matches the shipped Crystal Quest palette and branding.
4. Keep the output outside the production app until it is reviewed.
5. Do not merge any RAEA runtime dependency into the production game unless a separate compatibility, licence, size, performance and mobile-support review passes.

## Known limitation

This authoring environment cannot execute the native RAEA desktop/GPU runtime or verify output on the user's Windows/Linux machine. The composition is authored against the documented RAEA Composition/useCurrentFrame/interpolate API, but it remains **unrendered and unverified** until the commands above run on a supported desktop.
