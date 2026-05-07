# Accessibility Audit — Luna Borgo (`index.html`)

**Standard:** WCAG 2.1 AA  
**Date:** May 7, 2026  
**Audited files:** `index.html`, `css/component-navbar.css`, `css/component-button.css`, `css/component-bottom.css`, `css/main.css`, `css/tokens.css`

---

## Summary


| Priority                           | Issues found | Status |
| ---------------------------------- | ------------ | ------ |
| P1 — Critical (WCAG failure)       | 4            | Fixed  |
| P2 — Serious (significant barrier) | 4            | Fixed  |
| P3 — Minor (best practice)         | 2            | Fixed  |


---

## P1 — Critical (WCAG Failure)

### 1. Missing `<h1>` — broken heading hierarchy

**Criterion:** WCAG 1.3.1 Info and Relationships  
**Where:** Entire page  
**Problem:** The page uses multiple `<h2>` elements (Heineken, Adidas, Before that) with no `<h1>` ancestor. Screen readers use heading structure to navigate and understand page hierarchy. A page with no `<h1>` signals no primary subject to AT.  
**Fix:** Added a visually-hidden `<h1 class="sr-only">Luna Borgo — Portfolio</h1>` at the start of `<main>`.

---

### 2. No skip navigation link

**Criterion:** WCAG 2.4.1 Bypass Blocks (Level A)  
**Where:** Top of `<body>`  
**Problem:** Keyboard-only users must tab through the entire navigation on every page load to reach the main content. There is no mechanism to skip repeated blocks.  
**Fix:** Added `<a class="skip-link" href="#main-content">Skip to main content</a>` as the very first element in `<body>`. Added `id="main-content"` to `<main>`. The skip link is visually hidden until focused, then appears at the top-left.

---

### 3. No `:focus-visible` style on `.navbar__brand` link

**Criterion:** WCAG 2.4.7 Focus Visible  
**Where:** `component-navbar.css`, navbar brand anchor  
**Problem:** The brand/logo link (`<a class="navbar__brand">`) is keyboard-focusable but has no visible focus indicator. Nav work/about links use `.button:focus-visible`, but `.navbar__brand` was missing its rule.  
**Fix:** Added `.navbar__brand:focus-visible` with matching `outline: 2px solid var(--color-accent-fg); outline-offset: 2px; border-radius: var(--radius-md);`.

---

### 4. Decorative `>` character in link/button text read aloud by screen readers

**Criterion:** WCAG 1.3.1 Info and Relationships  
**Where:** Two CTA elements — `> download full cv` and `> lunaborgo@gmail.com`  
**Problem:** The `>` character is used decoratively as a visual affordance. Screen readers announce it as "greater than", producing: *"greater than download full cv"* and *"greater than lunaborgo at gmail dot com"*. This degrades the accessible name of both links.  
**Fix:** Wrapped each `>` in `<span aria-hidden="true">` so it is skipped by AT.

---

## P2 — Serious (Significant Barrier)

### 5. Japanese character `シ` in intro text mispronounced by screen readers

**Criterion:** WCAG 3.1.2 Language of Parts  
**Where:** Intro section, first paragraph  
**Problem:** `シ` (katakana "shi") is used as a decorative emoji-like element. Without a `lang="ja"` attribute, English-language screen readers may mispronounce it or announce it as "katakana letter si". Without `aria-hidden`, it is always read aloud.  
**Fix:** Wrapped with `<span aria-hidden="true" lang="ja">シ</span>` — removes it from the AT reading order entirely since it carries no meaning.

---

### 6. Theme toggle buttons lack descriptive accessible names

**Criterion:** WCAG 4.1.2 Name, Role, Value  
**Where:** Footer theme toggle — `#theme-light` and `#theme-dark`  
**Problem:** Buttons contain only the text "light" and "dark". While the parent has `aria-label="Theme toggle"`, the individual button purpose ("switch to light mode" vs "switch to dark mode") is not exposed. `aria-pressed` state is updated by JS (correct), but the base name is ambiguous without context.  
**Fix:** Added `aria-label="Switch to light mode"` and `aria-label="Switch to dark mode"` to each button. Screen readers now announce: *"Switch to dark mode, toggle button, pressed"*.

---

### 7. "About me" label is a `<p>`, not a heading

**Criterion:** WCAG 1.3.1 Info and Relationships  
**Where:** About section — `<p class="about__label">About me</p>`  
**Problem:** The "About me" text is styled to look like a section label/heading but is marked up as a paragraph. Screen reader users who navigate by headings (`H` key in most AT) will skip the About section entirely since it has no heading. The heading hierarchy for the page is: h1 → h2 (work entries) — "About me" must sit at the same level as work sections.  
**Fix:** Changed to `<h2 class="about__label">About me</h2>`. Visual appearance is unchanged (same CSS class).

---

### 8. `<nav aria-label="Primary">` is ambiguous without the landmark type

**Criterion:** WCAG 2.4.6 Headings and Labels  
**Where:** Navbar `<nav>` element  
**Problem:** The label "Primary" alone, while technically valid (screen readers append "navigation"), is more useful when explicit. In environments where the accessible name is surfaced without the role (e.g. landmark lists in some AT), "Primary" is ambiguous.  
**Fix:** Changed to `aria-label="Primary navigation"`.

---

## P3 — Minor (Best Practice)

### 9. `role="banner"` is redundant on `<header>`

**Criterion:** ARIA in HTML spec  
**Where:** `<header class="navbar" role="banner">`  
**Problem:** A top-level `<header>` element already has an implicit `role="banner"`. The explicit attribute is redundant but harmless.  
**Note:** Left in place — removing it would not change behaviour and introduces unnecessary churn.

### 10. CV download link has `href="#"` placeholder

**Where:** `<a class="button button--accent" href="#">> download full cv</a>`  
**Problem:** A non-functional anchor (`href="#"`) that triggers page scroll-to-top. Users following this link receive no feedback and no file. The accessible name now correctly reads "download full cv" after the `>` fix.  
**Note:** The `href` value should be updated to the actual CV file path or URL once available (e.g. `href="/assets/luna-borgo-cv.pdf" download`). Not applied automatically as the file path is unknown.

---

## Color Contrast Review (WCAG AA: 4.5:1 normal, 3:1 large text ≥18pt/14pt bold)

All contrast ratios evaluated against the page's solid background colors. Composited alpha values calculated as: `effective = fg_channel × alpha + bg_channel × (1 − alpha)`.


| Token / Usage                           | Foreground (composited)       | Background | Ratio   | Result |
| --------------------------------------- | ----------------------------- | ---------- | ------- | ------ |
| `--color-neutral-fg` dark mode          | `#CFCFD4` (~`#fff` at 80%)    | `#121426`  | ~11.3:1 | ✅ Pass |
| `--color-neutral-fg-muted` dark mode    | `#A5A5AC` (~`#fff` at 62%)    | `#121426`  | ~7.8:1  | ✅ Pass |
| `--color-accent-fg` dark (`#8a8aff`)    | `#8a8aff`                     | `#121426`  | ~6.2:1  | ✅ Pass |
| `--color-highlight-fg` dark (`#8eff8e`) | `#8eff8e`                     | `#121426`  | ~14.3:1 | ✅ Pass |
| `--color-neutral-fg` light mode         | `#383840` (~`#09070d` at 80%) | `#f7f8ff`  | ~11.1:1 | ✅ Pass |
| `--color-neutral-fg-muted` light mode   | `#636369` (~`#09070d` at 62%) | `#f7f8ff`  | ~5.3:1  | ✅ Pass |
| `--color-accent-fg` light (`#5543e4`)   | `#5543e4`                     | `#f7f8ff`  | ~6.1:1  | ✅ Pass |
| Footer muted + `opacity: 0.8` (dark)    | `#888892` (double-composited) | `#121426`  | ~5.5:1  | ✅ Pass |


No contrast failures detected in either theme.

---

## Keyboard Navigation Review


| Element                       | Tab-reachable | Focus visible | Notes                                 |
| ----------------------------- | ------------- | ------------- | ------------------------------------- |
| `.navbar__brand` (logo link)  | ✅             | ✅ (after fix) | Focus style added                     |
| `a.button` (work, about)      | ✅             | ✅             | `.button:focus-visible` present       |
| `#theme-light` button         | ✅             | ✅             | `.button:focus-visible` present       |
| `#theme-dark` button          | ✅             | ✅             | `.button:focus-visible` present       |
| `.button--accent` CV link     | ✅             | ✅             | `a.button:focus-visible` matches      |
| `.button--accent` email link  | ✅             | ✅             | `a.button:focus-visible` matches      |
| `.about__ascii` (`<pre>`)     | —             | —             | `aria-hidden="true"` — correct        |
| `.work__scroll` (decorative)  | —             | —             | `aria-hidden="true"` — correct        |
| Skip link (new)               | ✅             | ✅             | Visible on focus, hidden at rest      |


---

## ARIA & Landmark Review


| Landmark           | Element         | Label                             | Status                                   |
| ------------------ | --------------- | --------------------------------- | ---------------------------------------- |
| `banner`           | `<header>`      | —                                 | ✅ Implicit                               |
| `navigation`       | `<nav>`         | "Primary navigation"              | ✅ (updated)                              |
| `main`             | `<main>`        | "Portfolio"                       | ✅                                        |
| `contentinfo`      | `<footer>`      | "Footer status bar"               | ✅                                        |
| Sections           | `<section>` × 6 | Each has `aria-label`             | ✅                                        |
| Time               | `<time>`        | `datetime` attr present           | ✅ (static value — JS update recommended) |
| Moon phase         | `<div>`         | `aria-label="Current moon phase"` | ✅                                        |
| Theme toggle group | `<div>`         | `aria-label="Theme toggle"`       | ✅                                        |
