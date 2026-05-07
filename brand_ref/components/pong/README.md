# Pong — self-contained page

Single-file **`pong.html`** (sidebar + canvas + inline CSS/JS). Copy the folder into any static host or open the file locally.

---

## Run it

- **Local:** open `pong.html` in a browser (file:// is fine).
- **Dev server:** serve this directory so relative URLs behave predictably.

---

## Plug into another site

1. Copy **`pong.html`** (or only the `.game-area` + `#pong-canvas` + `<script>` block into your layout).
2. Map **CSS variables** on `:root` — the game reads them every frame:
   - `--color-bg`, `--color-accent`, `--color-primary`, `--color-text`
3. Edit **Back** link: find `class="sidebar-back"` and set `href` to your home route (default is `/`).
4. **Fonts:** the page loads [DM Mono + Press Start 2P](https://fonts.google.com/) for UI and score/pause text. To match `luna-brand/assets`, you can swap the Google Fonts link for local `@font-face` (DM Mono woff2 + Nintendoid) and change the canvas `ctx.font` strings in the script.

---

## Docs for agents & humans

| File | Use |
|------|-----|
| **`pong.html`** | Source of truth — structure, constants, resize, input, AI, draw loop |
| `SPEC.md` | Behaviour spec (states, scoring, serve, collisions); see **Canonical deltas** below |
| `PHYSICS.md` | Collision math, speed cap, serve vector |
| `RENDERING.md` | Draw order and canvas styling (font name may differ — see deltas) |
| `ASSETS.md` | Fonts/audio paths for an extended build |
| `CHECKLIST.md` | Step-by-step rebuild from scratch |

### Canonical deltas (trust `pong.html` over older prose)

- **Levels:** `aiSpeed` values are `5.5`, `7.65`, `10.2` (not the older 6.5 / 9 / 12 table in `SPEC.md`).
- **AI:** Moves only when `ball.vx > 0` (ball heading right). Target uses `aiErrorOffset` randomized per serve from `AI_ERROR_FACTOR[level]` so difficulty stays beatable.
- **Resize:** If `W < 520`, paddle and ball sizes get small multipliers (`pm`, `bm`).
- **Input:** `mousemove` on `window`; `mouseleave` on `#game-area` clears mouse control. Touch uses **Pointer Events** on `#game-area` plus a `touchstart`/`touchmove` fallback when `PointerEvent` is missing.
- **Audio:** This bundle has **no** `<Audio>` hooks; `ASSETS.md` lists filenames if you want to wire SFX like the historical portfolio build.
- **Canvas font:** `'Press Start 2P'` in `draw()`, not Nintendoid (unless you change it).

---

## For AI assistants rebuilding the feature

1. Read **`pong.html`** start to end — the IIFE is self-contained (~650 lines with CSS).
2. Use **`PHYSICS.md`** + **`SPEC.md`** for math and state names; reconcile any mismatch with the **Canonical deltas** above.
3. Port to React/Vue/etc. by preserving: `ResizeObserver` on the game container, **device pixel** `canvas.width/height`, and the same update order (`update` → `draw` → rAF).
