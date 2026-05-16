---
name: design-system-audit
description: >
  Enforces Luna Borgo design system usage. Use when writing or reviewing CSS,
  adding a component, or checking token compliance, typography pairing, or
  accessibility rules (focus-visible, opacity floors, reduced-motion).
---

# Design System Audit

`css/tokens.css` is the single source of truth. All CSS custom properties are defined there — never copy raw values into components; always reference via `var(--…)`.

---

## Color

Use `--color-*` **semantic tokens** in all component and layout CSS.

| Token | Role |
|---|---|
| `--color-neutral-bg` | Page / panel background |
| `--color-neutral-bg-elevated` | Elevated surface (cards, modals) |
| `--color-neutral-fg` | Default body text |
| `--color-neutral-fg-muted` | Secondary / de-emphasised text |
| `--color-neutral-fg-on-accent` | Text on a filled accent surface |
| `--color-neutral-stroke` | Standard borders |
| `--color-neutral-stroke-subtle` | Hairline dividers |
| `--color-accent-bg` | Filled CTA, active indicator, footer background |
| `--color-accent-fg` | Highlight text on page background |
| `--color-highlight-fg` | Theme-specific highlight foreground |
| `--color-highlight-fg-on-highlight` | Text on highlight surface |
| `--overlay` | Modal / fullscreen scrim |

**Rules:**
- No raw hex or `rgba()` in component CSS.
- `--color-base-*` primitives stay inside `tokens.css` only.
- Exception: `fill="…"` attributes on SVG brand decoration.
- Light mode activates via `data-theme="light"` on `<html>` — semantic tokens remap automatically.

---

## Typography

| Text is… | `font-family` | `font-size` | `font-weight` |
|---|---|---|---|
| Mono UI / labels | `var(--font-mono)` | `var(--typography-mono)` | 400 |
| Fixed chrome (header + footer) | `var(--font-serif)` | `var(--typography-chrome)` (14px) | 400 |
| Heading / display | `var(--font-serif)` | `var(--typography-display)` | 300 Light |
| Title / section header | `var(--font-serif)` | `var(--typography-title)` | 500 Medium |
| Large body / intro | `var(--font-serif)` | `var(--typography-body-lg)` | 300 Light |
| Body copy | `var(--font-serif)` | `var(--typography-body-md)` | 300 Light |
| Supporting / caption | `var(--font-serif)` | `var(--typography-body-sm)` | 300 Light |
| ASCII art only | `var(--font-mono-ascii)` | `var(--typography-footnote)` | — |

**Responsive scale** (tokens update automatically via `tokens.css` breakpoints):

| Token | x-large | large | medium | small | x-small |
|---|---|---|---|---|---|
| `--typography-display` | 88px | 88px | 80px | 64px | 48px |
| `--typography-title` | 80px | 80px | 72px | 56px | 32px |
| `--typography-body-lg` | 32px | 40px | 24px | 24px | 24px |
| `--typography-body-md` | 24px | 24px | 20px | 20px | 20px |
| `--typography-body-sm` | 20px | 20px | 14px | 14px | 14px |
| `--typography-mono` | 14px | 14px | 14px | 14px | 14px |
| `--typography-chrome` | 14px (alias of mono) | — | — | — | — |
| `--typography-footnote` | 14px | 12px | 12px | 10px | 10px |

`--typography-body` is a backward-compat alias for `--typography-body-lg`; use `--typography-body-lg` in new code.

**Rules:**
- `--typography-display`: `font-weight: var(--font-weight-light)` (300); `line-height: var(--line-height-tight)` (1.2); `letter-spacing: var(--letter-spacing-tight)` (−0.01em).
- `--typography-title`: `font-weight: var(--font-weight-medium)` (500); `line-height: var(--line-height-title)` (1.0); `letter-spacing: var(--letter-spacing-tight)` (−0.01em).
- `--typography-body-lg`: `font-weight: var(--font-weight-light)` (300); `line-height: var(--line-height-body-lg)` (1.4); `letter-spacing: var(--letter-spacing-body-lg)` (-0.03em).
- `--typography-body-md`: `font-weight: var(--font-weight-light)` (300); `line-height: var(--line-height-normal)` (1.38); `letter-spacing: var(--letter-spacing-body-md)` (−0.03em).
- `--typography-body-sm`: `font-weight: var(--font-weight-light)` (300); `line-height: var(--line-height-normal)` (1.38); `letter-spacing: var(--letter-spacing-body)` (0em).
- **Letter case:** sentence case in markup everywhere — no `text-transform` on `html` or body copy. Proper nouns capitalised in source.
- Fixed chrome (`.navbar`, `.bottom`, nav/footer `.button`): `letter-spacing: var(--letter-spacing-chrome)` (−0.04em); same in light and dark — no theme-specific font overrides.
- Mono: `letter-spacing: var(--letter-spacing-mono)` (−0.04em).
- Minimum font size anywhere: **10px**.
- No hardcoded `font-family` strings — use tokens only.

---

## Spacing

Scale: `--space-1` (4px) · `--space-2` (8px) · `--space-3` (12px) · `--space-4` (16px) · `--space-5` (20px) · `--space-6` (24px) · `--space-8` (32px) · `--space-10` (40px) · `--space-12` (48px)

Page margins: `--spacing-margin` (responsive: 24px mobile → 40px desktop → 80px x-large).

Thanks section top padding: `--spacing-thanks-padding-top` — 144px (large / x-large) · 160px (medium, ≤1024px) · 80px (small / x-small, ≤768px).

Breakpoints — use literal `px` in `@media` (CSS variables can't be used there):

| Token | px | Usage |
|---|---|---|
| `--screen-x-small` | 480px | `@media (max-width: 480px)` |
| `--screen-small` | 768px | `@media (max-width: 768px)` |
| `--screen-medium` | 1200px | `@media (max-width: 1200px)` |
| `--screen-large` | 1440px | `@media (min-width: 1440px)` |
| `--screen-x-large` | 1920px | `@media (min-width: 1920px)` |

Hardcoded `px` values allowed only when no token fits — add a `/* no token */` comment.

---

## Accessibility

**Focus:**
```css
.element:focus-visible {
  outline: 2px solid var(--color-accent-bg);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```
Required on every `<a>`, `<button>`, and focusable element. Elements on accent surfaces may use `var(--color-neutral-fg-on-accent)` instead.

**Opacity floors** — never go below these on text-bearing elements:

| Context | Minimum |
|---|---|
| Body paragraphs | 0.78 |
| UI labels, muted text | 0.65 |
| Absolute floor | 0.45 |

**Reduced motion** — any element starting at `opacity: 0` or using `transform`/`animation` must have:
```css
@media (prefers-reduced-motion: reduce) {
  .element { opacity: 1; transform: none; animation: none; }
}
```

**Border radius:** `--radius-sm` (2px) for focus rings and chips; `--radius-md` (4px) where a softer edge is needed.

---

## Legacy names — do not use

These names appear in `docs/brand/legacy_do_not_use_DESIGN-SYSTEM.md` but are **not defined** in current `tokens.css`:

`--bg` · `--ink` · `--muted` · `--muted-62` · `--muted-48` · `--line` · `--accent` · `--accent-light` · `--accent-fg` · `--accent-subtle` · `--accent-border` · `--accent-shadow` · `--accent-surface` · `--accent-divider` · `--green` · `--green-fg` · `--semantic-*`

Use the `--color-*` equivalents from the Color table above.

---

## Spot-checks

Run these against any CSS file before finalising:

```bash
# Raw color values in component CSS
rg '#[0-9a-fA-F]{3,8}|rgba?\(' css/ --glob '!tokens.css' -n

# Base primitives leaking into components
rg 'var\(--color-base-' css/ --glob '!tokens.css' -n

# Legacy token names still in use
rg 'var\(--(bg|ink|muted|accent-light|line|accent-fg|green)\b' css/ -n
```

No output = clean. Any match is a violation (review inline comments before fixing — some are intentional with justification).
