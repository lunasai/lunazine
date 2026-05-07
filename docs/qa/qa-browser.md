# QA Audit — Browser / Device Matrix

Figma source: `portfolio_web` responsive + long-scroll references (same baseline used in breakpoint QA files)
Audit date: 2026-05-07

---

## Test matrix

- Browsers: Chrome (stable channel), Firefox, Safari (WebKit engine)
- Viewports: 1920, 1440, 1200, 768, 480
- Checks: font load/render parity, grid reflow, overflow/hardcoded edge cases, theme-toggle behavior parity

---

## Findings


| Section name                                 | What's wrong                                               | Figma value                                                                     | Current code value                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts (all browsers/all breakpoints)         | No discrepancy found.                                      | Display/Montagu + Mono/Space + ASCII/DM Mono as defined in Figma token set.     | `document.fonts.status = loaded` in all runs; computed `.about__ascii` = DM Mono, 12px, 300 in Chrome/Firefox/Safari.                                                                              |
| Grid / reflow (all browsers/all breakpoints) | No discrepancy found.                                      | No horizontal overflow; fixed-chrome inset tracks spacing token per breakpoint. | `overflowX = 0` in all runs; header/navbar/footer widths match expected inner lane (1760 @1920, 1360 @1440, 1120 @1200, 720 @768, 432 @480).                                                       |
| Responsive hardcoded edge cases              | No cross-browser break found after prior breakpoint fixes. | Work/About heights and row offsets vary by breakpoint and x-large rules.        | Computed parity in all browsers: work height 1024 @1920/1200/768/480, 774 @1440; work row top 387 @1920, 373 @1200, 277 @1440, 216 @768/480; about min-height 1024 @1920/1200/768/480, 1185 @1440. |
| Color / glyph consistency                    | No discrepancy found.                                      | Intro accent green (`#8eff8e`) and metrics leading `=` glyph in Figma.          | `accentColor = rgb(142, 255, 142)` in all browsers; first metrics arrow text `=` in all browsers.                                                                                                  |
| Component behavior (theme toggle)            | No discrepancy found.                                      | Footer toggle changes theme state (`dark` ↔ `light`) consistently.              | In all browsers: `dark -> light -> dark` state transition observed via `data-theme` attribute.                                                                                                     |


---

## Notes

- Chrome was tested via Playwright `channel: chrome` (stable Chrome executable).
- Firefox and Safari coverage used Playwright Firefox/WebKit engines.
- No browser-specific rendering or interaction defects were found in this pass.