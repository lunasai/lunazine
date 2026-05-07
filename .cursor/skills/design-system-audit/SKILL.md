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

| Text is… | `font-family` | `font-size` |
|---|---|---|
| `text-transform: uppercase` | `var(--font-mono)` | `var(--typography-mono)` |
| Heading / display | `var(--font-serif)` | `var(--typography-display)` or `var(--typography-title)` |
| Body / intro copy | `var(--font-serif)` | `var(--typography-body)` |
| Supporting copy / caption | `var(--font-serif)` | `var(--typography-body-sm)` |
| ASCII art only | `var(--font-mono-ascii)` | `var(--typography-footnote)` |

**Responsive scale** (tokens update automatically via `tokens.css` breakpoints):

| Token | ≥1440px | 1200–1439px | ≤768px |
|---|---|---|---|
| `--typography-display` | 40px | 32px | 28px |
| `--typography-title` | 32px | 24px | 24px |
| `--typography-body` | 24px | 20px | 18px |
| `--typography-body-sm` | 16px | 14px | 14px |
| `--typography-mono` | 14px | 14px | 12px |
| `--typography-footnote` | 12px | 12px | 12px |

**Rules:**
- Display/title: `font-weight: var(--font-weight-light)` (300) for display, `var(--font-weight-medium)` (500) for title.
- Mono: always `text-transform: uppercase`; `letter-spacing: var(--letter-spacing-mono)` (0.04em).
- Minimum font size anywhere: **11px**.
- No hardcoded `font-family` strings — use tokens only.

---

## Spacing

Scale: `--space-1` (4px) · `--space-2` (8px) · `--space-3` (12px) · `--space-4` (16px) · `--space-5` (20px) · `--space-6` (24px) · `--space-8` (32px) · `--space-10` (40px) · `--space-12` (48px)

Page margins: `--spacing-margin` (responsive: 24px mobile → 40px desktop → 80px x-large).

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
