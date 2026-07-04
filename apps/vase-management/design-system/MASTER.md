# Vase Management — Design System

## Brand

Vase Management is a premium, calm and operational SaaS product. The interface
uses restrained glass surfaces, generous spacing, soft depth and jade as its
signature. It must feel trustworthy before it feels decorative.

## Color

| Token | Light | Dark |
| --- | --- | --- |
| Canvas | `#f8faf8` | `#10141a` |
| Elevated canvas | `#eceeec` | `#1c2026` |
| Text | `#191c1b` | `#f1f5f3` |
| Muted text | `#5f6f64` | `#bbcabe` |
| Jade | `#006d43` | `#47e098` |
| Jade vivid | `#18c37e` | `#18c37e` |
| Danger | `#ba1a1a` | `#ffb4ab` |
| Warning | `#9e412a` | `#ffb59f` |
| Info | `#36684c` | `#9cd3b2` |

Use semantic CSS variables, never raw brand colors in feature components.

## Typography

- Interface and body: Manrope.
- Editorial and page titles: Newsreader.
- Monetary, fiscal and technical data: IBM Plex Mono.
- Minimum body size on mobile: 16px. Labels may be 12–14px only when paired
  with clear hierarchy and sufficient contrast.

## Shape and depth

- Controls: 12–14px radius.
- Cards: 20px radius.
- Dialogs and feature surfaces: 24–28px radius.
- Glass in light mode must be at least 82% opaque.
- Shadows are diffuse and low contrast; borders provide the primary edge.

## Motion

- Page enter/exit: 200/140ms, opacity plus 8px vertical travel.
- Dialog: backdrop 150ms; content 200ms from `scale(.98)`.
- Menus and accordions: 160–200ms.
- Hover: translate at most 1px; never resize layout.
- Disable non-essential movement under `prefers-reduced-motion`.

## Accessibility

- WCAG AA contrast for text and controls.
- 44×44px minimum interactive targets.
- Visible `:focus-visible` rings.
- Dialogs trap focus, close on Escape and restore focus to their trigger.
- Color is never the only status indicator.

