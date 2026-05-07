## Rebuild checklist (from scratch)

> **Note (brand kit):** Cross-check **`pong.html`** in this folder for AI rules (track only when `ball.vx > 0`, error offset), pointer/touch input, narrow-width scaling, and optional audio (not in default HTML).

### Foundation

- [ ] Create page layout with a fixed-size game container (`.game-area`) and a `<canvas>`
- [ ] Implement canvas sizing (set `canvas.width/height` in JS, not just CSS)
- [ ] Add `ResizeObserver` on the container to call `resize()`

### State + config

- [ ] Add `LEVELS` table with `ballSpeed`, `aiSpeed`, `speedCap`, `serveDelay`
- [ ] Persist `levelIndex` in `localStorage` under `luna-pong-level`
- [ ] Create entity structs:
  - [ ] `leftPaddle`, `rightPaddle`: `{ x, y, w, h }`
  - [ ] `ball`: `{ x, y, size, vx, vy }`
  - [ ] `scores`: `{ left, right }`
- [ ] Add flags: `paused`, `serving`, plus a `serveTimer` handle

### Resize math

- [ ] In `resize()` compute:
  - [ ] `W = container.clientWidth`, `H = container.clientHeight`
  - [ ] `pw = round(W * 0.045)`, `ph = round(H * 0.262)`, `bs = round(W * 0.044)`
- [ ] Set paddles:
  - [ ] `left.x = 0`, `right.x = W - pw`, `w=pw`, `h=ph`
  - [ ] Clamp `y` into \([0, H-h]\)
- [ ] Set `ball.size = bs`
- [ ] Call `resetBall(1, true)`

### Input

- [ ] Mouse:
  - [ ] On `mousemove`: compute `mouseY` relative to canvas top
  - [ ] On container `mouseleave`: set `mouseY = -1`
- [ ] Touch:
  - [ ] On canvas `touchmove` (preventDefault): set `mouseY` from first touch
- [ ] Keyboard:
  - [ ] Track pressed keys by `e.code`
  - [ ] Pause on `Space` or `KeyP`
  - [ ] Level down/up on `KeyZ` / `KeyX`
  - [ ] Paddle move on `ArrowUp` / `ArrowDown` only when `mouseY < 0`

### Core game loop

- [ ] Implement `loop()` using `requestAnimationFrame`
- [ ] In each frame: `update()` then `draw()`

### Update() details

- [ ] Player paddle:
  - [ ] If mouse active: `y = mouseY - h/2`
  - [ ] Else: keyboard moves by `7` px/frame
  - [ ] Clamp y
- [ ] Early-out when `paused || serving`
- [ ] AI paddle:
  - [ ] Track ball center with max step `level.aiSpeed`
  - [ ] Clamp y
- [ ] Ball integrate: `x += vx`, `y += vy`
- [ ] Wall bounces (top/bottom) with snap + `vy` sign flip
- [ ] Paddle collisions (direction-gated AABB):
  - [ ] Snap ball outside paddle
  - [ ] Compute `relY` in \([-0.5, 0.5]\)
  - [ ] Multiply `vx` magnitude by `1.04` and flip sign appropriately
  - [ ] Set `vy = relY * level.ballSpeed * 2.2`
  - [ ] Clamp speed magnitude to `level.speedCap`
- [ ] Scoring:
  - [ ] If ball fully exits left: right++ → `resetBall(1, false)`
  - [ ] If ball exits right: left++ → `resetBall(-1, false)`

### Serve behavior

- [ ] `resetBall(direction, immediate)`:
  - [ ] Center ball, zero velocities, set `serving=true`
  - [ ] After delay (`serveDelay` unless immediate):
    - [ ] `serving=false`
    - [ ] `angle` random in \([-0.25, 0.25]\) radians
    - [ ] `vx = direction * speed * cos(angle)`
    - [ ] `vy = speed * sin(angle)`

### Rendering

- [ ] Read theme colors each frame from CSS custom properties
- [ ] Draw:
  - [ ] Background
  - [ ] Center dashed line (alpha 0.15)
  - [ ] Scores (3 digits, `Nintendoid 1`)
  - [ ] Paddles (accent)
  - [ ] Ball (primary)
  - [ ] Pause overlay and text
  - [ ] Serve dots while serving

### Audio

- [ ] Preload the 5 mp3 assets
- [ ] On play: clone Audio node so sounds can overlap
- [ ] Hook sound triggers:
  - [ ] wall bounce
  - [ ] left hit / right hit
  - [ ] score
  - [ ] serve launch

