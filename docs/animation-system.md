# Animation system — Luna web

This document describes how scroll and section animations work on the site, and how to extend them without regressions.

## Files involved


| Area                                             | Primary files                               |
| ------------------------------------------------ | ------------------------------------------- |
| Scroll-entry work (#work), feedback, about | `[js/work-slides.js](../js/work-slides.js)` |
| All visual timing, keyframes, reduced motion     | `[css/main.css](../css/main.css)`           |
| Soft scroll snap (not content motion)            | `[js/scroll-snap.js](../js/scroll-snap.js)` |


---

## Core patterns (use these consistently)

### 1. Opt-in visibility (progressive enhancement)

**Rule:** Anything that starts hidden for animation must only be hidden when JavaScript has opted in.

- **How:** JS adds a class such as `will-animate` when the script runs. Base HTML/CSS without that class must leave content fully readable.
- **Why:** Users without JS, broken scripts, or aggressive blockers still get content.

**Do not** hide animated elements with a blanket rule like `.section--work .work__body { opacity: 0; }` unless it is scoped under `.will-animate`.

### 2. One-shot scroll triggers (no toggle)

**Rule:** Scroll-driven entrance animations must run **once**, then stay in their final state. Do not drive animations with a class that is **removed** when the section leaves the viewport (that causes content to vanish or replay).

**Pattern:**

1. JS adds `will-animate` on load (opt-in hide).
2. `IntersectionObserver` fires when the target intersects.
3. JS adds a **permanent** marker on that target (`in-view`) and **stops observing** that target (`unobserve`).

**Work (#work):** `in-view` on each animated child (title, each `<p>`, each `.work__metrics`), one observer with `unobserve` after reveal — scroll order replaces a single long stagger.
**Feedback / About:** same `in-view` class on their selected child elements.

### 3. CSS mechanics: keyframes vs transitions


| Section          | Mechanism                                                                 | Why                                                                                                         |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Intro (hero)** | `@keyframes` + `animation` with `**animation-fill-mode: both`**           | Runs on page load; no JS. `both` holds the “before” state during the delay, then the “after” state forever. |
| **Work (#work)** | Shared `fade-up` reveal when `.in-view` is set; metric cards add component-level choreography | Each block animates when scrolled into view; metric cards use the same trigger but sequence card → icon → body internally. |
| **Experience**   | Dither background only                                                    | No `will-animate` / `fade-up`; the experience panel uses its own dither background in `[css/component-experience-panel.css](../css/component-experience-panel.css)`. |
| **Feedback**     | Shared `fade-up` reveal when `.in-view` is set                            | Quote cards stagger via `animation-delay` on `.feedback-card` children. |
| **About**        | Shared `fade-up` reveal when `.in-view` is set                            | About copy uses the same per-element reveal language as Work.                                           |


When adding new scroll-triggered motion inside a **tall** block, prefer **per-element** observers (work pattern) so users do not miss off-screen delays.

### 4. Scope animations to the intended subtree

**Work** animations are scoped to `#work` via classes on that section plus descendants under `.work__projects` (tag, paragraphs, metrics). That way other `.section--work` blocks (e.g. “Before that”) are not forced into the same stagger or initial hidden state.

When adding a new subsection inside `#work`, either:

- Reuse the same selectors / observer list in `[js/work-slides.js](../js/work-slides.js)` if the new nodes match (e.g. another `.work__body p`), or
- Extend the reveal list and add matching rules under `.in-view` in `[css/main.css](../css/main.css)`.

---

## Section-by-section reference

### Intro (`section--intro`)

- **Trigger:** Page load (no IntersectionObserver).
- **CSS:** `[css/main.css](../css/main.css)` — `intro-fade-up`, applied to `.intro__text p:first-child` and `:last-child` with staggered delays (300ms / 420ms), 700ms duration, `cubic-bezier(0.22, 1, 0.36, 1)`, `both`.
- **JS:** None.

### Work merged portfolio block (`#work`)

- **Trigger:** Per element — `.work__title`, every `.work__projects .work__body p`, and each `.work__projects .work__metrics`. Shared `IntersectionObserver` with `threshold: 0.2` and `rootMargin: 0px 0px -5% 0px` (tune in `[js/work-slides.js](../js/work-slides.js)`).
- **JS:** Adds `will-animate` to `#work`. On intersect for a node, adds `in-view` and `unobserve`s that node only.
- **CSS:** `[css/main.css](../css/main.css)` — unrevealed nodes use `:not(.in-view)` under `.will-animate` for `opacity: 0`; revealed text nodes get the shared `fade-up` animation.
- **Metric cards:** `[css/component-lightup-metric.css](../css/component-lightup-metric.css)` uses the parent `.work__metrics.in-view` trigger to sequence card scale/fade, icon scale, and body fade.
- **Reduced motion:** JS adds `in-view` to **all** reveal items immediately so nothing stays hidden; CSS clears animation.
- **Important:** If you add or remove paragraphs, the observer uses `querySelectorAll` — no CSS per-`nth-child` updates required. New block types (e.g. a figure) need the selector list and a matching CSS line.

### Experience (`section--experience`)

- **Trigger:** None — not listed in `[js/work-slides.js](../js/work-slides.js)` reveal sections.
- **JS / CSS:** No scroll-entry. Experience panel dither is mounted by `src/experience-panel-dither.jsx`; no CRT, heatwave, scanlines, row reveal, or separate panel scroll script.

### About (`section--about`)

- **Trigger:** Per element — `.about__tagline`, `.about__label`, every `.about__body p`, and `.about__cta`.
- **JS:** Adds `will-animate` to `.section--about`. On intersect for each target, adds `in-view` and unobserves that target.
- **CSS:** Uses the same shared `fade-up` reveal as Work and feedback.

### Feedback (`section--feedback`)

- **Trigger:** Per element — `.feedback__title` and each `.feedback-card`.
- **JS:** Adds `will-animate` to `.section--feedback`. On intersect for each target, adds `in-view` and unobserves that target.
- **CSS:** Same shared `fade-up` as Work; staggered delays on `.feedback-card:nth-child(n).in-view` in `[css/main.css](../css/main.css)`.

## Reduced motion (`prefers-reduced-motion: reduce`)

Global: `[css/main.css](../css/main.css)` — `html { scroll-behavior: auto; }`.

- **Intro:** Animations disabled on hero paragraphs (content remains visible by default).
- **Work:** Elements with `.in-view`: `animation: none` and `opacity: 1` (and RM users get that class on all items at init). Component-level metric card motion is also disabled.
- **About:** Transforms disabled; shorter opacity-only transition.

When adding animations, **always** add a reduced-motion branch: disable motion and ensure text and interactive targets meet contrast and visibility requirements (see project design-system skill for opacity floors and focus styles).

---

## Relationship to scroll snap

`[js/scroll-snap.js](../js/scroll-snap.js)` implements optional soft snapping. It does not control section fade-ins. Very tall sections may skip snapping by design so users can read without being pulled. Changing section heights affects snap behaviour, not the animation class logic above.

---

## Guidelines for humans

1. **Prefer one-shot observers** for “animate on first view” effects; disconnect after success.
2. **Never** use `toggle(class, isIntersecting)` for entrance animations unless you explicitly want repeat on every entry.
3. **Keep** `will-animate` (or equivalent) as the gate for “hidden until animated”; document new class names here.
4. **Align** easing with existing curves: `cubic-bezier(0.22, 1, 0.36, 1)` for primary motions unless design specifies otherwise.
5. **Test** with reduced motion enabled in the OS/browser.
6. **Test** with JS disabled: hero may still animate (CSS-only intro); work, feedback, and about must be fully readable if you rely on opt-in classes correctly.

---

## Guidelines for AI / automation

When implementing or refactoring animations:

1. Read `[js/work-slides.js](../js/work-slides.js)` and the animation blocks in `[css/main.css](../css/main.css)` before changing behaviour.
2. For `#work`, keep **per-element** reveals (`in-view` + shared `IntersectionObserver` + `unobserve`). If a component needs an internal sequence, trigger it from the parent `.in-view` state inside the component CSS.
3. Do not reintroduce `**is-active` toggling** on sections for entrance animations; that pattern caused invisible content when scrolling away.
4. Scope new rules narrowly (e.g. `#work` or `.work__projects`) so secondary `.section--work` layouts are unaffected.
5. After edits, grep for `opacity: 0` on content that is not under an opt-in class.
6. Update **this document** if you add a new section pattern, new class names, or change IO thresholds.

---

### Rotating metric ticker (`.rotating-metric`)

- **Trigger:** Continuous CSS loop (`@keyframes rotating-metric-scroll`) — no scroll-entry reveal.
- **Files:**
  - `[css/component-rotating-metric.css](../css/component-rotating-metric.css)` — keyframe, track, badge hover, frozen state, reduced-motion
  - `[components/rotating-metric.html](../components/rotating-metric.html)` — HTML partial (duplicated track for seamless loop)
  - `[js/rotating-metric.js](../js/rotating-metric.js)` — WAAPI hover slowdown, IntersectionObserver off-screen pause, pause button
- **Loop mechanism:** Two identical `.rotating-metric__items` blocks inside the track; `translateX(-50%)` moves exactly one block-width, creating a seamless infinite loop.
- **State class:** `.is-frozen` on `.rotating-metric` → `animation-play-state: paused`. Managed by JS only; CSS provides no default hidden state, so content is always readable without JS.
- **WCAG 2.2.2 (Pause, Stop, Hide):** `.rotating-metric__pause` button (`aria-pressed`, `aria-label` updated by JS) gives users a mechanism to pause. `aria-pressed="true"` communicates the paused state to assistive technology.
- **Off-screen pause:** `IntersectionObserver` (`threshold: 0`) watches the outer `.rotating-metric` element. Sets `inView` flag; `syncMotion()` applies `.is-frozen` when `!inView || userPaused`. Explicit user pause is not overridden when the element scrolls back into view.
- **Hover slowdown:** WAAPI `updatePlaybackRate(0.45)` on `pointerenter`, `1.0` on `pointerleave`. Only fires when not frozen. No animation on keyboard focus. Scoped to `(hover: hover) and (pointer: fine)` in CSS for badge highlight; pointer events in JS are similarly fine-pointer only in practice.
- **Symbol dependency:** Uses `<use href="#metric-badge-star">` which resolves to the inline SVG sprite defined in `index.html` (lines 30–34). Standalone preview pages must include a local copy of that `<symbol>` — see `[previews/rotating-metric.html](../previews/rotating-metric.html)`.
- **Reduced motion:** JS bails early; CSS sets `animation: none`, `will-change: auto`, `overflow-x: auto` (content scrollable), and hides the pause button (no animation to control).
- **No `role="marquee"`:** The outer wrapper uses `role="region"` + `aria-labelledby`. Marquee is a live-region role that causes continuous screen-reader announcements; region is appropriate for a labelled landmark.

---

## Quick checklist (new feature)

- Content visible with JS off (or only acceptable CSS-only animation)
- Opt-in class applied by JS before hiding anything
- One-shot per target: `unobserve` (or disconnect) after each reveal so animations do not replay
- No animation driven by a class that is removed on scroll-away
- `prefers-reduced-motion` handled
- Selectors still match DOM if you change number/order of children