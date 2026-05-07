# Luna Borgo — Brand Direction

Visual language, voice, and communication guidelines for anyone building a new asset — website, slide deck, PDF, or social — within Luna's brand.

> Full positioning, proof hierarchy, and messaging system: `Personal Brand.md` in the portfolio workspace root.

---

## 1. Creative Concept

**Organic + synthetic.** The tension between natural warmth and systematic precision, held in one place without resolving into either.

In practice: the brand should feel like something *grown* and something *built* coexist in the same frame. Not "techy designer" and not "ethereal artist" — both simultaneously. This is not a stylistic trick; it is the literal description of how Luna works.

**The positioning in one line:** "I build the systems behind brands that need to move at scale without losing their soul."

---

## 2. Logo

### 2.1 Files


| File                       | Use                                    |
| -------------------------- | -------------------------------------- |
| `../assets/logo_dark.svg`  | On dark backgrounds (`--bg: #121426`)  |
| `../assets/logo_light.svg` | On light backgrounds (`--bg: #F7F8FF`) |
| `../assets/favicon.svg`    | Browser tab / app icon                 |


Always use the variant that provides sufficient contrast with the background. Never invert a logo file in CSS; use the correct variant.

### 2.2 Usage rules

- **Her name is a design object, not a navigation label.** Luna's name should command space — large, typographically prominent. Do not tuck it into a nav bar in small caps or a 14px label.
- Maintain clear space equal to the cap-height of the wordmark on all sides before other content.
- Do not distort, recolor, or apply opacity to the logo SVGs. The SVG fill values are intentional brand exceptions (see design system hardcoded exception).
- On accent-colored backgrounds (footer, CTA blocks), test legibility — both logo variants exist specifically for this reason.

### 2.3 Icon sprite

`../assets/icons.svg` contains all UI icons as a symbol sprite. Reference symbols with:

```html
<svg aria-hidden="true" focusable="false">
  <use href="../assets/icons.svg#icon-name" />
</svg>
```

---

## 3. Color in Practice

The palette is intentionally minimal: one deep navy background, one white/near-black text pair, one accent purple, one green for specific moments.

**Rules:**

- The accent (`#5543e4`) is punctuation — not decoration. Use it for the one thing that matters most on a screen.
- Never build a palette from multiple saturated colors. One hyper-saturated accent is the rule.
- Layer grain texture over any rich color field. Flat fills alone read as unfinished.
- Dark mode is the primary mode. Light mode uses the same palette inverted; the accent hue is identical.

**Text on accent surfaces:** always use `--semantic-neutral-fg-on-accent` (`#ffffff`) or `--accent-subtle` (`rgba(217,223,255,1)`). Never place dark ink directly on the accent background.

---

## 4. Typography in Practice

### 4.1 The pairing

The system uses a deliberate serif/mono pairing — not a typical serif/sans combination.


| Role                      | Family                             | Personality                                          |
| ------------------------- | ---------------------------------- | ---------------------------------------------------- |
| Display / editorial       | Montagu Slab (light optical serif) | Humanist warmth, slightly literary — the Storyteller |
| UI / labels / body        | DM Mono                            | Precision, system, craft — the Architect             |
| Body copy (non-uppercase) | Work Sans                          | Clean legibility without the formality of mono       |
| Pixel wordmark            | Press Start 2P / Nintendoid 1      | Computing nostalgia — the easter-egg register only   |


**What not to do:** do not use one typeface for everything (signals no typographic point of view). Do not substitute Helvetica, Circular, or any Swiss-neutral grotesque — these read as generic.

### 4.2 Uppercase rule

All text with `text-transform: uppercase` must use `var(--font-mono)`. No exceptions. The tracking of DM Mono at uppercase is intentional — `0.28px` desktop, `0.24px` below 1200px.

### 4.3 Display headings

h1 elements use `--font-display` at `--typography-display` with weight `300` and `letter-spacing: -1px`. The slightly negative tracking is characteristic of the brand's editorial register — do not tighten further or set to zero.

### 4.4 Scale

The type scale has four named steps. Use them in sequence — do not create intermediate sizes:

```
Display  →  Subtitle  →  Body MD  →  Footnote
  40px         24px        14px        12px    (desktop)
```

All four steps respond automatically when `tokens.css` is imported. See `DESIGN-SYSTEM.md § 2.3` for the full responsive table.

---

## 5. Imagery & Texture

Direction traced to the FigJam moodboard (board: `EOTEGEJUeediSdV3BZm5Ng`).

### Film grain

The primary texture reference. Heavy, analog grain over a rich gradient — this is a material choice, not a CSS filter trick. Grain adds warmth and depth to any color field. Apply it whenever a background or hero surface would otherwise be a flat fill.

### Botanical macro

Image style for organic moments: real nature (flowers, plants) photographed with shallow depth-of-field, slightly abstracted by a grid or geometric mark overlay. Reference: the FLORA AI image on the moodboard.

### Dither / pixel art

Use in "system / infrastructure" contexts and moments of levity. The pixel aesthetic earns its nostalgia — it references genuine affection for computing history (the Mac and apple pixel art on the moodboard). Do not apply it decoratively without the narrative context.

### Halo & glow

Hero images: a precise technical object (laptop, screen, component) emitting soft light in a soft-focus, atmospheric environment. This is the visual metaphor for Luna's positioning — something technical glowing in something organic. Use for hero sections, section breaks, and any moment that needs to feel significant without being loud.

### Abstract / morphing forms

For motion or interactive moments: form shifting, not elements entering and exiting on a timeline. If there is animation, it should feel like matter changing state.

### Cartographic precision

Technical diagrams with dotted lines and dense information, for content about systems, architecture, and process. Make them beautiful — do not default to plain wireframes.

---

## 6. Layout Principles

### Breathing room

The brand does not cluster everything to the center. Layouts should have clear structure *and* deliberate empty space. The grid is a skeleton, not a container to fill.

### Name as visual anchor

"Luna" appears large as a standalone typographic element. Her name commands a full composition moment — not a 14px nav label.

### Asymmetry within a grid

Compositions that are still organized but not rigidly symmetric. Different-sized content blocks in close proximity without merging. Not a strict column grid, not chaos.

### Layers of depth

Foreground, midground, atmospheric background — rather than flat panels side by side. Multiple elements overlap or sit in close proximity. The visual system has depth.

### Metric as layout element

A single large number or short phrase (`72`, `40 → 1`) can hold full composition weight. A metric is a layout element, not a caption.

---

## 7. Do / Don't


| Do                                                             | Don't                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Layer grain texture over any rich color field                  | Use flat fills as primary backgrounds                            |
| Set Luna's name large — it is a visual anchor                  | Tuck her name into a nav bar in small caps                       |
| Use one hyper-saturated accent color as punctuation            | Build a palette from multiple saturated colors                   |
| Pair an editorial serif with a technical mono/sans             | Use one typeface for everything                                  |
| Use botanical photography with geometric marks overlaid        | Use stock photography of people looking at laptops               |
| Allow atmospheric depth (blur / halo) in hero moments          | Make every image sharp and equally legible                       |
| Give a metric its own typographic moment (`72`, large)         | List metrics inside a bullet run in a paragraph                  |
| Use dither / pixel texture in system / infrastructure contexts | Apply pixel aesthetic decoratively without earned nostalgia      |
| Let the layout breathe — asymmetry within a grid               | Fill every container edge-to-edge                                |
| Reference the Escher quote visually (order from chaos)         | Use generic "minimal portfolio" white space as a style statement |


---

## 8. Voice — Quick Reference

Full voice documentation: `Personal Brand.md § 3`.

### The five voice attributes

**1. Warm precision**
Warm without being vague. Claims are grounded in specifics.

- On-brand: "I move fluidly between strategic vision and hands-on craft, defining foundations that create clarity for teams."
- Off-brand: "I'm passionate about creating meaningful user experiences."

**2. Complexity made honest**
Name the mess before naming the solution.

- On-brand: "Regional apps led to fragmented experiences. In 2022, we merged over 40 regional platforms into one."
- Off-brand: "I led a major platform consolidation initiative to improve consistency."

**3. Human before metric**
Numbers appear after the human story, not instead of it.

- On-brand: "Teams describe the biggest change as how they work together — 75% highlight better collaboration."
- Off-brand: "Achieved 75% collaboration improvement score."

**4. Credible informality**
First person, direct address, occasional humor without sacrificing authority.

- On-brand: "Recommending socks with shoes had failed countless times before. I revamped the UI and it worked."
- Off-brand: "Leveraged cross-functional synergies to drive iterative optimization."

**5. Multilingual humanity**
Olá · Hallo · Hola · Hello · Ciao — this is identity, not decoration.

- On-brand: Use as an opener/closer. Once per asset.
- Off-brand: Mid-body copy. Forced as a LinkedIn hook without the warmth that earns it.

### Signature moves


| Move                         | What                                                                      | When                                                      | When to stop                                       |
| ---------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| **Multilingual hello strip** | Olá · Hallo · Hola · Hello · Ciao                                         | Portfolio header, email sign-off                          | Never mid-body. Once per asset.                    |
| **Escher quote**             | "We adore chaos because we love to produce order" — M.C. Escher           | Portfolio intro, speaker bio, framing structural thinking | Not in cold outreach. One appearance per document. |
| **Chapter framing**          | "Chapter One / Two / Three…" structure                                    | Case studies, long-form posts                             | Not in executive summaries or bios.                |
| **Coffee / name humor**      | "Rumor has it saying my name three times while brewing coffee also works" | About pages, email PS, closing slides                     | Once per context. Never in cover letters.          |
| **Flash metrics**            | ⚡️ `40 regional platforms → 1`                                            | Portfolio callout panels, LinkedIn proof clusters         | Not in narrative paragraphs.                       |


---

## 9. Brand Pillars (Summary)

Three lenses that are always active simultaneously.

**The Chameleon** — adapts to different environments, teams, and constraints. Shapes solutions that fit the context rather than forcing a style. Tags: `Brand expression systems` · `Visual design` · `Design Ops` · `Experimentation`

**The Architect** — constantly connecting dots and creating systems. Thinks in structures, enjoys cleaning up big messes, turns complexity into something cohesive, scalable, and elegant. Tags: `Strategy & Roadmap` · `System architecture` · `Design tokens & theming` · `Automation & AI`

**The Storyteller** — finds beauty in the ordinary and coherence in messes. Influences without force, brings people together. Tags: `Community Building` · `Change management` · `Executive alignment` · `Accessibility`

---

## 10. Asset Inventory


| Asset                   | Path                                     | Notes                  |
| ----------------------- | ---------------------------------------- | ---------------------- |
| Logo — dark background  | `../assets/logo_dark.svg`                | Use on `--bg: #121426` |
| Logo — light background | `../assets/logo_light.svg`               | Use on `--bg: #F7F8FF` |
| Favicon                 | `../assets/favicon.svg`                  | Browser tab / PWA icon |
| Icon sprite             | `../assets/icons.svg`                    | SVG symbol sprite      |
| DM Mono 400             | `../assets/fonts/DMMono-400.woff2`       | Regular weight         |
| DM Mono 400 italic      | `../assets/fonts/DMMono-400italic.woff2` | Italic                 |
| DM Mono 500             | `../assets/fonts/DMMono-500.woff2`       | Medium — UI labels     |
| Nintendoid 1            | `../assets/fonts/nintendoid-1.otf`       | Pixel wordmark only    |


