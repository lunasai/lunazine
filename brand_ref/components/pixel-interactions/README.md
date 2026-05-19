# Pixel Interactions

Falling pixel cursor trail + interactive pixel mountain footer.  
Three files, zero dependencies beyond React.

```
pixel-interactions/
├── cursorDitherUtils.ts   Physics constants, accent color, handover bridge
├── CursorDitherTrail.tsx  Full-viewport cursor trail
└── PixelPileFooter.tsx    Pixel mountain footer canvas
```

---

## Quick start

### 1. Drop the three files into your project

No install required — just copy the folder.

### 2. Render both components

```tsx
import { CursorDitherTrail } from './pixel-interactions/CursorDitherTrail'
import { PixelPileFooter }   from './pixel-interactions/PixelPileFooter'

const DOT_SIZE = 3 // keep both values in sync

export function App() {
  return (
    <>
      {/* Sits above everything, intercepts clicks across the whole page */}
      <CursorDitherTrail dotSize={DOT_SIZE} />

      <main>{/* your page content */}</main>

      <footer>
        <PixelPileFooter dotSize={DOT_SIZE} height={120}>
          <p>Footer text here</p>
        </PixelPileFooter>
      </footer>
    </>
  )
}
```

That's it. Pixels fall from clicks, land in the mountain, hover erodes the pile.

**Tuning hover / explosion / gravity feel:** see [`docs/pixel-pile-tuning.md`](../../../docs/pixel-pile-tuning.md) (production values live in `js/pixel-interactions.js`).

---

## How it works

```
Click / drag anywhere
        │
        ▼
CursorDitherTrail  ── pixels fall under gravity ──▶  off-screen → removed
        │
        │  particle crosses .pixel-pile-footer top edge
        ▼
   handover bridge  (cursorDitherUtils.ts)
        │
        ▼
PixelPileFooter  ── lands in cellular-automaton grid ── settles ── drawn with Bayer dither
```

The two canvases never overlap a particle — `CursorDitherTrail` removes it the moment it's handed off, so there is no visual pop.

The footer uses a **falling-sand simulation**: each occupied cell tries to move down, then diagonally, each frame. This lets the pile reshape naturally when pixels land or are knocked loose.

---

## API

### `<CursorDitherTrail>`


| Prop        | Type     | Default                 | Notes                                               |
| ----------- | -------- | ----------------------- | --------------------------------------------------- |
| `dotSize`   | `number` | `3`                     | Grid cell size in px. Must match `PixelPileFooter`. |
| `className` | `string` | `"cursor-dither-trail"` | Canvas element class.                               |


### `<PixelPileFooter>`


| Prop        | Type        | Default               | Notes                                                                                                               |
| ----------- | ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `dotSize`   | `number`    | `3`                   | Grid cell size in px. Must match `CursorDitherTrail`.                                                               |
| `height`    | `number`    | `120`                 | Canvas height in px.                                                                                                |
| `children`  | `ReactNode` | —                     | Overlaid content (footer links, etc.).                                                                              |
| `className` | `string`    | `"pixel-pile-footer"` | **Important:** `CursorDitherTrail` queries this class to find the footer. Change it in both files if you rename it. |


---

## Customising

### Change the pixel color

Edit `getTrailColor()` in `cursorDitherUtils.ts`. Returns `{ r, g, b }` for dark and light mode:

```ts
export function getTrailColor() {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  return isDark
    ? { r: 138, g: 171, b: 255 }  // lavender
    : { r: 85, g: 67, b: 228 }    // purple
}
```

For a single fixed color, just return one object:

```ts
export function getTrailColor() {
  return { r: 142, g: 255, b: 142 } // always green
}
```

### Tune the physics

All constants are in `cursorDitherUtils.ts` and at the top of each component file:


| Constant              | File              | Effect                                            |
| --------------------- | ----------------- | ------------------------------------------------- |
| `GRAVITY`             | utils             | Fall speed (px/frame²). Higher = faster drop.     |
| `DRAG_X`              | utils             | Horizontal damping (0–1). Lower = tighter spread. |
| `HOVER_RADIUS`        | PixelPileFooter   | Detonation disc radius (px); uniform chance inside. |
| `HOVER_PROBABILITY`   | PixelPileFooter   | Per-frame ejection chance anywhere in the disc. |
| `PILE_GRAVITY`        | PixelPileFooter   | Gravity for airborne pile grains (stronger than trail). |
| `PILE_DRAG_X`         | PixelPileFooter   | Horizontal damping for pile grains (lower = wilder). |
| `PARTICLES_PER_EVENT` | CursorDitherTrail | Pixels spawned per click/move event.              |


### Mountain shape

`initPile` in `PixelPileFooter.tsx` builds the starting dome. Adjust `peakCells` multiplier (`0.0875`) for a taller or flatter mountain:

```ts
const peakCells = Math.floor(gridH * 0.0875) // 0 = flat, ~0.5 = half the canvas height
```

### Dark / light mode

The package reads `data-theme` on `<html>`. Set it to `"light"` for the light-mode color, anything else (or absent) for dark:

```html
<html data-theme="light"> <!-- light mode -->
<html>                     <!-- dark mode (default) -->
```

---

## Accessibility

Both components check `prefers-reduced-motion` on mount:

- `**CursorDitherTrail**` — no particles spawned, canvas stays empty.
- `**PixelPileFooter**` — draws the initial mountain as a single static frame; no animation loop, no hover interaction.

---

## TypeScript

The package is `.tsx` / `.ts` — no additional type packages needed beyond React's own types (`@types/react`).