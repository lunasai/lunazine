## Spec (behavioral) — Pong in `pong.html`

> **Note (brand kit):** `pong.html` in this folder is the **source of truth**. This spec matches the overall design; level `aiSpeed` values, AI “error offset”, narrow-screen scaling, and input handlers may differ — see `README.md` → *Canonical deltas*.

### High-level structure

- **DOM**
  - Container: `.game-area` (has `cursor: none`)
  - Canvas: `#pong-canvas` fills container (`width/height: 100%` in CSS; real pixel size set in JS)
- **Main loop**
  - `loop()` calls `update()` then `draw()` then `requestAnimationFrame(loop)`
- **Responsive sizing**
  - Uses `ResizeObserver` on `canvas.parentElement`
  - On resize: recompute `W`, `H`, sizes of paddles/ball, clamp paddle positions, then `resetBall(1, true)`

### Core constants (dimensionless ratios)

All geometry is derived from the current container size:

- **PADDLE_W_PCT**: `0.045` of `W`
- **PADDLE_H_PCT**: `0.262` of `H`
- **BALL_SIZE_PCT**: `0.044` of `W`
- **KB_SPEED**: `7` pixels per frame (keyboard movement)

### Levels (difficulty / speed presets)

There are three levels (index 0..2), persisted in `localStorage` as `luna-pong-level`:

- Level 01: `{ ballSpeed: 8.5, aiSpeed: 6.5, speedCap: 19, serveDelay: 600 }`
- Level 02: `{ ballSpeed: 11,  aiSpeed: 9,   speedCap: 25, serveDelay: 400 }`
- Level 03: `{ ballSpeed: 14,  aiSpeed: 12,  speedCap: 32, serveDelay: 250 }`

Level changes:

- Can be changed via sidebar buttons (`.level-btn[data-level]`) or keys `Z`/`X`
- When changed mid-rally (`!serving`), the current ball velocity is scaled by:
  - `ratio = newLevel.ballSpeed / oldLevel.ballSpeed`
  - then `capSpeed()` is applied

### Game state

- **Dimensions**: `W`, `H`
- **Flags**
  - `paused`: toggled by `Space` or `P`
  - `serving`: true between `resetBall()` and actual launch
- **Scores**: `scores.left`, `scores.right` (displayed 000..999)
- **Entities**
  - `leftPaddle`: `{ x, y, w, h }` (x=0)
  - `rightPaddle`: `{ x, y, w, h }` (x=W-w)
  - `ball`: `{ x, y, size, vx, vy }`

### Serve / reset rules

`resetBall(direction, immediate)`:

- Places ball at center and sets `vx=vy=0`
- Sets `serving=true`
- Starts a timeout (delay is level-dependent unless `immediate=true`)
- When timer fires:
  - `serving=false`
  - Choose `angle` in approximately \([-0.25, 0.25]\) radians:
    - `angle = (Math.random() * 0.5 - 0.25)`
  - Launch:
    - `ball.vx = direction * level.ballSpeed * cos(angle)`
    - `ball.vy = level.ballSpeed * sin(angle)`

Direction used:

- After right scores: `resetBall(1, false)` (serve toward right)
- After left scores:  `resetBall(-1, false)` (serve toward left)
- After resize:       `resetBall(1, true)` (immediate serve state reset)

### Input rules

- **Mouse**
  - Global `mousemove`: `mouseY = e.clientY - canvasRect.top`
  - On parent `mouseleave`: `mouseY = -1` (disables mouse control)
- **Touch**
  - Canvas `touchmove` (non-passive): sets `mouseY` from finger position
- **Keyboard**
  - `keydown`: stores `keys[e.code]=true`
    - Pause toggle: `Space` or `KeyP` (prevents default for Space)
    - Level: `KeyZ`/`KeyX`
  - `keyup`: removes key from `keys`

Player paddle update (each frame):

- If `mouseY >= 0`: `leftPaddle.y = mouseY - leftPaddle.h/2`
- Else:
  - `ArrowUp` → `leftPaddle.y -= KB_SPEED`
  - `ArrowDown` → `leftPaddle.y += KB_SPEED`
- Then clamp to \([0, H - leftPaddle.h]\)

### AI rules (right paddle)

Only runs when `!paused && !serving`.

- Track ball center:
  - `diff = (ball center y) - (right paddle center y)`
- If `|diff| > 1`:
  - `rightPaddle.y += sign(diff) * min(level.aiSpeed, |diff|)`
- Then clamp to \([0, H - rightPaddle.h]\)

### Ball update rules

Only runs when `!paused && !serving`.

- Integrate position: `ball.x += ball.vx`, `ball.y += ball.vy`
- **Wall bounces**
  - If `ball.y <= 0`: set `ball.y=0`, `ball.vy=abs(ball.vy)`
  - If `ball.y + size >= H`: set `ball.y=H-size`, `ball.vy=-abs(ball.vy)`

### Paddle collisions

Collision checks are AABB overlaps conditioned on ball direction:

- **Left paddle** triggers only when `ball.vx < 0`
- **Right paddle** triggers only when `ball.vx > 0`

On collision:

- Snap the ball out of the paddle (prevents sticking)
  - Left: `ball.x = leftPaddle.x + leftPaddle.w`
  - Right: `ball.x = rightPaddle.x - ball.size`
- Compute relative hit position:
  - `relY = ((ball center y - paddle.y) / paddle.h) - 0.5`  → range approx \([-0.5, 0.5]\)
- Apply response:
  - Multiply the horizontal speed by `1.04` and flip direction accordingly
  - Set `ball.vy = relY * level.ballSpeed * 2.2`
  - Apply `capSpeed()`

### Speed cap

`capSpeed()` clamps the magnitude of \((vx, vy)\) to `level.speedCap`.

### Scoring

- If `ball.x + ball.size < 0`: right scores; then `resetBall(1, false)`
- If `ball.x > W`: left scores; then `resetBall(-1, false)`

