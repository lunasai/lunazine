## Rendering (canvas) — draw order and styling

> **Note (brand kit):** Shipped `pong.html` uses **`40px` / `20px` `'Press Start 2P'`** for score, pause, and serve dots (responsive `scoreSize`). The font list below still describes the Nintendoid variant if you self-host `nintendoid-1.otf`.

### Per-frame color source

Each frame calls `getColors()` which reads CSS custom properties from `:root` / `[data-theme]`:

- `--color-bg`
- `--color-accent`
- `--color-primary`
- `--color-text`

This means theming updates are reflected **immediately** without restarting the game.

### Draw order (in `draw()`)

1) **Background**
   - Fill full canvas with `bg`

2) **Center dashed line**
   - `ctx.setLineDash([8, 10])`
   - `ctx.lineWidth = 4`
   - `ctx.strokeStyle = rgba(text, 0.15)`
   - Draw a vertical line at `x = W/2`

3) **Scores**
   - Font: `40px 'Nintendoid 1', monospace`
   - Fill color: `accent`
   - Alignment: `textAlign='center'`, `textBaseline='top'`
   - Left score at `(W/4, 36)`, right score at `(3W/4, 36)`
   - Formatting: 3 digits, left-padded with zeroes, capped at 999

4) **Paddles**
   - Fill color: `accent`
   - Left paddle rect at `(left.x, left.y, left.w, left.h)`
   - Right paddle rect at `(right.x, right.y, right.w, right.h)`

5) **Ball**
   - Fill color: `primary`
   - Rect at `(ball.x, ball.y, ball.size, ball.size)`

6) **Pause overlay** (only when paused)
   - Dim full screen with `rgba(0,0,0,0.45)`
   - Text “PAUSED”
     - Font: `40px 'Nintendoid 1', monospace`
     - Fill color: `accent`
     - Centered at `(W/2, H/2)`

7) **Serve indicator** (only when `serving && !paused`)
   - Text `• • •`
     - Font: `20px 'Nintendoid 1', monospace`
     - Fill color: `rgba(accent, 0.5)`
     - Position: `(W/2, H/2 + ball.size * 2)`

### Helper used for translucency

`hexToRgba(hex, alpha)` supports both `#rgb` and `#rrggbb`. If parsing fails, it falls back to white with the requested alpha.

