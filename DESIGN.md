---
version: alpha
colors:
  background: "#070a1c"
  background-raised: "#0d1230"
  surface: "#131a3d"
  text: "#eaf2ff"
  text-muted: "#a8b6d8"
  primary: "#4be5d4"
  primary-deep: "#168b96"
  accent: "#ff4d9d"
  reward: "#ffd66b"
  danger: "#ff5f6d"
typography:
  display:
    fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif'
  body:
    fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif'
  utility:
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace'
rounded:
  small: "10px"
  control: "13px"
  card: "16px"
  modal: "24px"
components:
  primary-action:
    minHeight: "48px"
    emphasis: "bright teal gradient with pressed depth"
  game-board:
    surface: "deep blue glass with restrained teal-violet edge glow"
  level-card:
    radius: "16px"
    state-current: "teal focus glow"
    state-perfected: "warm gold edge"
  objective-chip:
    surface: "translucent midnight glass"
    completed: "teal confirmation with gold meter fill"
omitted:
  - section: spacing
    reason: "Existing CSS layout and safe-area geometry remain canonical; no new spacing scale is introduced in this phase."
---
# Crystal Quest — Design System

## Overview

Crystal Quest is a touch-first 2D match-3 fantasy adventure for casual mobile players. The interface should feel like exploring a luminous underground crystal world: tactile, legible, energetic, and rewarding. The product register leads: board clarity and immediate playability always outrank decorative effects.

**North Star:** a hand-polished crystal atlas wrapped around a responsive puzzle board. The signature is the luminous teal crystal language against a deep midnight-cavern environment, with warm gold reserved for earned rewards.

**Avoid:** generic casino UI, noisy neon overload, tiny mobile controls, photorealistic 3D treatment, and decoration that competes with the board.

## Colors

The deep navy family owns the background and surfaces. Teal is the primary interaction and progress color; gold means stars, rewards, and perfected completion; pink is reserved for combo energy; red is reserved for danger and low-move pressure. Never rely on color alone to communicate a state.

Runtime ownership remains the existing `styles.css` custom properties. This document mirrors the accepted values; it does not generate a second token system.

| Design token | Runtime source |
|---|---|
| background | `--deep` |
| background-raised | `--deep-2` |
| surface | `--panel-solid` / `--panel` |
| text / text-muted | `--ink` / `--ink-dim` |
| primary / primary-deep | `--teal` / `--teal-dark` |
| accent | `--pink` |
| reward | `--gold` |
| danger | `--danger` |

The commercial polish layer may add component-scoped glass and glow tokens, but must not redefine semantic roles.

## Typography

Use the established Trebuchet/Segoe/system stack. Display text is bold and compact, with restrained letter spacing for world and level headings. Body copy remains short, high-contrast, and conversational. Numeric move counts, scores, and level identifiers use tabular numerals where available. Avoid loading remote fonts or adding runtime font dependencies.

## Layout

Mobile portrait is the primary play context. Respect safe-area insets and keep the board as the dominant visual object. The game HUD and objective chips sit above the board; primary controls remain below it and reachable by thumb. The home screen prioritizes one clear Play action, then secondary destinations. Level, world, and relic content use bounded scroll regions without moving the fixed app shell.

At narrow widths, preserve readable labels and minimum touch areas rather than shrinking the board controls indiscriminately. Landscape layouts may compress vertical spacing, but must keep pause, objectives, and the full board usable. Desktop uses a centered play surface with a restrained maximum width.

## Elevation & Depth

Use layered midnight surfaces, subtle inset highlights, and selective edge glows to create crystal depth. The board receives the strongest frame treatment. Modal surfaces may use blur and gradient depth; ordinary text and utility controls should remain quiet. Avoid stacking multiple heavy shadows on every element.

## Shapes

Use rounded rectangles for controls and cards, pill shapes for compact status and reward indicators, and a softly rounded board frame. Maintain the established 10/13/16/24px radius vocabulary. Avoid fully pill-shaped large buttons and sharp editorial grids; the game should feel tactile rather than administrative.

## Components

- **Primary action:** teal gradient, dark readable label, visible pressed depth, and a stable 48px minimum height.
- **Secondary action:** quiet translucent surface with a clear border and visible focus.
- **Game board:** highest visual priority; keep gem silhouettes, blockers, selection rings, and effects distinguishable.
- **HUD:** moves, score, and objectives must remain legible during active play. Low moves use danger semantics; completed objectives use positive confirmation.
- **Level cards:** current level uses teal emphasis; perfected levels use gold; locked levels remain visibly unavailable.
- **Feedback:** combo banners can use the pink energy accent; toasts remain short and must not obscure the board for long.
- **Dialogs:** preserve readable content, safe-area padding, keyboard focus visibility, and a clear primary action.

## Do's and Don'ts

- Do keep animations short, purposeful, and tied to a game event.
- Do respect the in-game reduced-motion setting and `prefers-reduced-motion`.
- Do preserve touch, keyboard, and visible focus behavior.
- Do keep gameplay, save compatibility, and the 27-level campaign independent of visual polish.
- Don't add external fonts, UI frameworks, 3D runtimes, or heavyweight effects.
- Don't make ads look like game controls or disguise sponsored content.
- Don't add reward claims or progression UI until the reward is actually granted and persisted.
- Don't let glow, blur, or motion reduce contrast or board readability.
