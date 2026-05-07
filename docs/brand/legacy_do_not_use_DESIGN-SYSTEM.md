# Luna Borgo — Design System Reference

This document is the authoritative reference for all design tokens, type roles, breakpoints, spacing, and accessibility rules used across Luna Borgo's visual identity.

**Source files:**

- `../css/tokens.css` — all CSS custom properties (runtime source of truth)
- `../css/base.css` — font declarations and element defaults

---

## 1. Color System

### 1.1 Raw palette


| Token            | Dark mode value          | Light mode value    | Description                                     |
| ---------------- | ------------------------ | ------------------- | ----------------------------------------------- |
| `--bg`           | `#121426`                | `#F7F8FF`           | Page and panel background                       |
| `--ink`          | `#ffffff`                | `#09070D`           | Primary text — 100% opacity                     |
| `--muted`        | `rgba(255,255,255,0.80)` | `rgba(9,7,13,0.80)` | Default body text at 80%                        |
| `--muted-62`     | `rgba(255,255,255,0.62)` | `rgba(9,7,13,0.62)` | Footer / secondary text                         |
| `--muted-48`     | `rgba(255,255,255,0.48)` | `rgba(9,7,13,0.48)` | De-emphasised text                              |
| `--line`         | `rgba(255,255,255,0.08)` | `rgba(9,7,13,0.08)` | Hairline borders and dividers                   |
| `--accent`       | `#5543e4`                | `#5543e4`           | Core accent — unchanged across modes            |
| `--accent-light` | `rgb(138,138,255)`       | `rgb(85,67,228)`    | Lavender — darkens in light mode for legibility |
| `--green`        | `#8eff8e`                | `#8eff8e`           | Pong CTA + dark-mode highlight                  |
| `--green-fg`     | `#18161d`                | `#18161d`           | Text on green — dark for contrast               |
| `--overlay`      | `rgba(0,0,0,0.40)`       | `rgba(0,0,0,0.40)`  | Modal / fullscreen scrim                        |


### 1.2 Accent token family

All accent-related tokens reference `--accent` and are stable across themes unless noted.


| Token              | Value                                 | Role                                               |
| ------------------ | ------------------------------------- | -------------------------------------------------- |
| `--accent`         | `#5543e4`                             | Filled CTA, active indicator, footer background    |
| `--accent-fg`      | `#ffffff`                             | Text and icons on an accent-filled surface         |
| `--accent-light`   | `rgb(138,138,255)` / `rgb(85,67,228)` | Highlight text on page background (theme-specific) |
| `--accent-subtle`  | `rgba(217,223,255,1)`                 | Dim text layered on an accent surface              |
| `--accent-border`  | `rgba(255,255,255,0.32)`              | Border on an accent-filled surface                 |
| `--accent-shadow`  | `rgba(85,67,228,0.40)`                | Drop shadow for buttons on the page background     |
| `--accent-surface` | `#ffffff`                             | Pill / chip background on an accent surface        |
| `--accent-divider` | `rgba(0,0,0,0.15)`                    | Horizontal rule inside accent blocks               |


### 1.3 Semantic aliases

Use semantic aliases for new work. Short aliases (`--bg`, `--ink`, etc.) remain valid for legacy compatibility.


| Semantic alias                     | Maps to                                     | Role                                         |
| ---------------------------------- | ------------------------------------------- | -------------------------------------------- |
| `--semantic-neutral-bg`            | `--bg`                                      | Page and panel background                    |
| `--semantic-neutral-fg`            | `--muted`                                   | Default Figma text foreground (80% opacity)  |
| `--semantic-neutral-fg-strong`     | `--ink`                                     | Strong text and active states                |
| `--semantic-neutral-stroke-subtle` | `--line`                                    | Hairline borders and dividers                |
| `--semantic-accent-bg`             | `--accent`                                  | Filled CTA, active dot, footer background    |
| `--semantic-accent-fg`             | `--accent-light`                            | Highlight text on the page background        |
| `--semantic-highlight-fg`          | `--green` (dark) / `--accent-light` (light) | Theme-specific highlight foreground          |
| `--semantic-neutral-fg-on-accent`  | `--accent-fg`                               | Text / icons on filled accent surfaces       |
| `--semantic-selection-bg`          | `color-mix(accent 38%, bg)`                 | `::selection` background on neutral surfaces |
| `--semantic-selection-fg`          | `--semantic-neutral-fg-strong`              | `::selection` text on neutral surfaces       |


**Rule:** Never use raw hex or `rgb()` values in component CSS. Always reference a token via `var(--…)`.

**Permitted exception:** `fill="…"` attributes inside `<svg>` brand decorations (vinyl labels, pixel art).

### 1.4 Dark / light theme

Activate light mode by setting `data-theme="light"` on the `<html>` element:

```html
<html data-theme="light">
```

For a smooth 600ms transition add `theme-transitioning` to `<html>` momentarily:

```js
document.documentElement.classList.add('theme-transitioning');
document.documentElement.setAttribute('data-theme', newTheme);
setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 600);
```

---

## 2. Typography

### 2.1 Font families


| Token                 | Value                                                          | Role                                     |
| --------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| `--font-display`      | `'Montagu Slab', Georgia, serif`                               | Display headings, editorial lines        |
| `--font-serif`        | alias → `--font-display`                                       | Use `--font-display` directly            |
| `--font-serif-legacy` | `'Fraunces', Georgia, serif`                                   | Legacy — avoid in new work               |
| `--font-mono`         | `'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace` | UI labels, uppercase nav/meta text       |
| `--font-mono-legacy`  | `'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace`    | Legacy — 3 unnamed component styles only |
| `--font-sans`         | `'Work Sans', system-ui, sans-serif`                           | Body copy that is not uppercase          |
| `--font-pixel`        | `'Press Start 2P', var(--font-mono)`                           | Pixel wordmark, easter-egg elements only |


**Google Fonts import URL:**

```
https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;500&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Montagu+Slab:opsz,wght@16..144,300&family=Press+Start+2P&family=Space+Mono:wght@400&family=Work+Sans:wght@300&display=swap
```

Local DM Mono woff2 files are in `../assets/fonts/` (DMMono-400, DMMono-400italic, DMMono-500) — served via `base.css` for `--font-mono-legacy`. Space Mono is network-only.

### 2.2 Type roles


| Role                    | Font token       | Size token             | Weight                           | Notes                                                              |
| ----------------------- | ---------------- | ---------------------- | -------------------------------- | ------------------------------------------------------------------ |
| **Display**             | `--font-display` | `--typography-display` | `--display-weight` (`300`)       | LH `1.2`, LS `−1px`. All h1 elements.                              |
| **Title**               | `--font-display` | `--typography-display` | `--display-weight-title` (`500`) | Medium-weight variant — case study / work item headings.           |
| **Body**                | `--font-display` | `--typography-body-lg` | `300`                            | LH `1.38`. Hero and intro paragraphs. Responsive: 20px→24px.       |
| **Body SM**             | `--font-display` | `--typography-body-sm` | `300`                            | LH `1.38`. Supporting copy, captions. Responsive: 14px→16px.       |
| **Mono / Uppercase UI** | `--font-mono`    | `--typography-body-md` | `500`                            | LS `0.04em`. Always `text-transform: uppercase`.                   |
| **Pixel brand**         | `--font-pixel`   | Component-specific     | `400`                            | Reserved for the Luna wordmark and intentional easter-egg moments. |


**Font assignment rule:**


| Text is…                               | Use                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `text-transform: uppercase`            | `var(--font-mono)` — always, no exceptions                                                      |
| Heading, display, or italic decorative | `var(--font-display)` + `--typography-display` / `--display-weight` or `--display-weight-title` |
| Hero / intro paragraph body copy       | `var(--font-display)` + `--typography-body-lg`                                                  |
| Supporting copy, captions              | `var(--font-display)` + `--typography-body-sm`                                                  |


### 2.3 Type scale — responsive values

`--typography-display` and the other scale tokens update automatically at each breakpoint when you import `tokens.css`. The table below documents all values for reference.


| Token                   | ≥ 1440px | 1200 – 1439px | 769 – 1199px | ≤ 768px     |
| ----------------------- | -------- | ------------- | ------------ | ----------- |
| `--typography-display`  | `40px`   | `40px`        | `32px`       | `24px`      |
| `--typography-subtitle` | `24px`   | `24px`        | `16px`       | `16px`      |
| `--typography-body-lg`  | `24px` ✓ | `20px` ✓      | —            | `16px` est. |
| `--typography-body-sm`  | `16px` ✓ | `14px` ✓      | —            | `12px` est. |
| `--typography-body-md`  | `14px`   | `14px`        | `12px`       | `12px`      |
| `--typography-footnote` | `12px`   | `12px`        | `12px`       | `10px`      |


✓ confirmed from Figma · est. = estimated, confirm against mobile frame · `--body-md-letter-spacing: 0.04em` (proportional, no breakpoint override)

---

## 3. Breakpoints

CSS custom properties cannot be used inside `@media` conditions without build tooling. Media queries use literal `px` values; comments reference the token name.


| Token              | Value    | CSS query (max-width)        | CSS query (min-width)        | Figma frame |
| ------------------ | -------- | ---------------------------- | ---------------------------- | ----------- |
| `--screen-x-small` | `480px`  | `@media (max-width: 480px)`  | —                            | 375 / 480   |
| `--screen-small`   | `768px`  | `@media (max-width: 768px)`  | —                            | 768         |
| `--screen-medium`  | `1200px` | `@media (max-width: 1199px)` | `@media (min-width: 1200px)` | 1200        |
| `--screen-large`   | `1440px` | `@media (max-width: 1439px)` | `@media (min-width: 1440px)` | 1440        |
| `--screen-x-large` | `1920px` | —                            | `@media (min-width: 1920px)` | 1920        |


### Responsive ranges in use


| Range            | Media query                                          | Notes                            |
| ---------------- | ---------------------------------------------------- | -------------------------------- |
| X-large desktop  | `@media (min-width: 1680px)`                         | Footnote font size increases     |
| Standard desktop | `@media (min-width: 1200px)`                         | Two-column layouts, full sidebar |
| Medium desktop   | `@media (max-width: 1439px) and (min-width: 1200px)` | Compact desktop variant          |
| Bridge           | `@media (max-width: 1199px) and (min-width: 769px)`  | Tablet / small laptop            |
| Mobile           | `@media (max-width: 768px)`                          | Single-column, fixed top bar     |
| X-small phone    | `@media (max-width: 480px)`                          | Compact spacing tweaks           |


**JavaScript breakpoint constant:** Use `769` (one pixel above `--screen-small`) as the desktop fence for any JS-driven layout decisions, matching the `769px` min-width CSS fence.

---

## 4. Spacing & Layout

### 4.1 Spacing scale


| Token         | Value  | Use                                |
| ------------- | ------ | ---------------------------------- |
| `--space-xs`  | `6px`  | Tight intra-component gaps         |
| `--space-sm`  | `8px`  | Icon padding, badge insets         |
| `--space-md`  | `12px` | Component padding (compact)        |
| `--space-lg`  | `16px` | Mobile page padding                |
| `--space-xl`  | `20px` | Mid-density component padding      |
| `--space-2xl` | `24px` | Compact page padding, media gap    |
| `--space-3xl` | `32px` | Medium component separation        |
| `--space-4xl` | `40px` | Standard page padding, section gap |
| `--space-5xl` | `48px` | Row gap between content rows       |


### 4.2 Named page tokens


| Token                  | Value  | Role                                     |
| ---------------------- | ------ | ---------------------------------------- |
| `--space-page`         | `40px` | Horizontal page padding (desktop)        |
| `--space-page-compact` | `24px` | Horizontal page padding (medium desktop) |
| `--space-page-x-small` | `16px` | Horizontal page padding (mobile)         |
| `--space-section`      | `40px` | Vertical gap between page sections       |
| `--space-row-gap`      | `48px` | Vertical gap between content rows        |
| `--space-media-gap`    | `24px` | Gap between media items in a grid        |


### 4.3 Structural sizes


| Token                         | Value    | Role                                                   |
| ----------------------------- | -------- | ------------------------------------------------------ |
| `--size-top-bar`              | `68px`   | Fixed navigation bar height                            |
| `--size-sidebar-x-small`      | `200px`  | Sidebar width at ≤ 480px                               |
| `--size-sidebar-medium`       | `240px`  | Sidebar width at 1200px                                |
| `--size-sidebar-x-large`      | `320px`  | Sidebar width at ≥ 1920px                              |
| `--size-home-content-x-small` | `343px`  | Central content max-width at 375px                     |
| `--size-home-content-small`   | `688px`  | Central content max-width at 768px                     |
| `--size-home-content-medium`  | `920px`  | Central content max-width at 1200px                    |
| `--size-home-content-large`   | `1120px` | Central content max-width at 1440px                    |
| `--size-home-content-x-large` | `1520px` | Central content max-width at 1920px                    |
| `--size-content-left`         | `480px`  | Inner left column — text columns in two-column layouts |
| `--size-case-column`          | `536px`  | Main content width in case study layout                |
| `--size-work-title-medium`    | `340px`  | Work list title column at 1200px                       |


### 4.4 Border radius


| Token         | Value | Use                                  |
| ------------- | ----- | ------------------------------------ |
| `--radius-sm` | `2px` | Focus outline, pill/chip edges, tags |


The visual language is almost flat. `2px` is the only border-radius in the system.

---

## 5. Accessibility Rules

### 5.1 Focus styles

Every `<a>`, `<button>`, or focusable element must include `:focus-visible`:

```css
.element:focus-visible {
  outline: 2px solid var(--semantic-accent-bg);
  outline-offset: 2px;     /* 2px for inline; 3–4px for block rows */
  border-radius: var(--radius-sm);
}
```

Exception: elements sitting on a filled accent background (e.g. CTA buttons, contact modal) may use `var(--semantic-neutral-fg-on-accent)` for the outline color.

`base.css` provides a global `:focus-visible` default. Override at component level as needed.

### 5.2 Opacity floors

Never set opacity below these values on text-bearing elements:


| Element type                                     | Minimum opacity |
| ------------------------------------------------ | --------------- |
| Running body paragraphs                          | `0.78`          |
| UI labels, muted text, toggle labels, footer     | `0.65`          |
| Absolute floor — nothing text-bearing goes below | `0.45`          |


### 5.3 Font size minimum

Do not introduce UI text smaller than `11px` at any breakpoint.

### 5.4 Reduced motion

Any element that starts with `opacity: 0` and animates in must have an override in `@media (prefers-reduced-motion: reduce)` that sets it to its final visible state:

```css
@media (prefers-reduced-motion: reduce) {
  .my-animated-element {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
```

`base.css` includes a global reduced-motion reset that disables all transitions and animations. Component-specific animated elements should still declare their own overrides as documentation.

---

## 6. Token Quick Reference Card

Copy this into a new project's CSS comment header or Notion/Confluence page.

```
COLORS
  Background ......... --bg / --semantic-neutral-bg
  Text ............... --ink / --semantic-neutral-fg-strong
  Muted text ......... --muted / --semantic-neutral-fg
  Secondary text ..... --muted-62
  Hairline ........... --line / --semantic-neutral-stroke-subtle
  Accent fill ........ --accent / --semantic-accent-bg   (#5543e4)
  Accent text ........ --accent-light / --semantic-accent-fg
  On-accent text ..... --accent-fg / --semantic-neutral-fg-on-accent
  Highlight .......... --semantic-highlight-fg
  Green .............. --green (#8eff8e)
  Overlay ............ --overlay

FONTS
  Display / body ....... --font-display   (Montagu Slab, serif)
  Mono / UI ............ --font-mono      (Space Mono)
  Mono legacy .......... --font-mono-legacy (DM Mono, 3 components)
  Sans ................. --font-sans      (Work Sans)
  Pixel wordmark ....... --font-pixel     (Press Start 2P / Nintendoid)

TYPE SCALE (1200px → ≥1440px → ≤768px)
  Display ....  40 / 40 / 24px    --typography-display
  Subtitle ...  24 / 24 / 16px    --typography-subtitle
  Body LG ....  20 / 24 / 16px*   --typography-body-lg   (Montagu Slab)
  Body SM ....  14 / 16 / 12px*   --typography-body-sm   (Montagu Slab)
  Body MD ....  14 / 14 / 12px    --typography-body-md   (Space Mono, LS 0.04em)
  Footnote ...  12 / 12 / 10px    --typography-footnote
  * estimated mobile values

BREAKPOINTS (use literal px in @media)
  480px   --screen-x-small
  768px   --screen-small
  1200px  --screen-medium
  1440px  --screen-large
  1920px  --screen-x-large

SPACING
  Page padding ........ --space-page (40px) / --space-page-compact (24px)
  Section gap ......... --space-section (40px)
  Row gap ............. --space-row-gap (48px)
  Media gap ........... --space-media-gap (24px)
```

