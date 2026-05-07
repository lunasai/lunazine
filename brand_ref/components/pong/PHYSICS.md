## Physics + math notes

> **Note (brand kit):** Constants in **`pong.html`** (per-frame integration, paddles, cap) override any stale numbers in older docs.

### Coordinate system

- Origin (0,0) is top-left of the canvas
- Positive x goes right, positive y goes down

### Entity shapes

- Paddles are axis-aligned rectangles (AABB)
- Ball is a square (AABB) of side `ball.size`

### Integration (per frame)

- `ball.x += ball.vx`
- `ball.y += ball.vy`

This implementation is **frame-based** (no `dt`), so speed depends on refresh rate. If you rebuild with `dt`, treat all speeds as “px per frame at ~60fps” and scale accordingly.

### Wall collisions (top/bottom)

Top:

- Condition: `ball.y <= 0`
- Response:
  - `ball.y = 0`
  - `ball.vy = abs(ball.vy)`

Bottom:

- Condition: `ball.y + ball.size >= H`
- Response:
  - `ball.y = H - ball.size`
  - `ball.vy = -abs(ball.vy)`

### Paddle collision detection (AABB overlap)

General overlap test used (with additional direction gating):

- Overlap in x:
  - Left paddle: `ball.x <= left.x + left.w` and `ball.x + size >= left.x`
  - Right paddle: `ball.x + size >= right.x` and `ball.x <= right.x + right.w`
- Overlap in y:
  - `ball.y + size >= paddle.y` and `ball.y <= paddle.y + paddle.h`

Also requires:

- Left: `ball.vx < 0`
- Right: `ball.vx > 0`

### Paddle collision response (adds “english”)

1. **Snap ball out of paddle**

- Left: `ball.x = left.x + left.w`
- Right: `ball.x = right.x - ball.size`

1. **Compute hit position along paddle**

- Ball center y: `ballCY = ball.y + size/2`
- Relative position (normalized, centered):


relY = \frac{ballCY - paddle.y}{paddle.h} - 0.5


This is roughly in [-0.5, 0.5]. Values near 0 hit the middle; values near ±0.5 hit the ends.

1. **Update velocity**

- Horizontal speed increases by 4% per paddle hit:
  - Left: `ball.vx =  abs(ball.vx) * 1.04`
  - Right: `ball.vx = -abs(ball.vx) * 1.04`
- Vertical speed is reset based on hit position:


ball.vy = relY \cdot level.ballSpeed \cdot 2.2


1. **Clamp speed magnitude**

Compute magnitude:


spd = \sqrt{vx^2 + vy^2}


If `spd > level.speedCap`, renormalize:


vx \leftarrow \frac{vx}{spd}\cdot cap,\quad
vy \leftarrow \frac{vy}{spd}\cdot cap


### Serve launch vector

When serve timer ends:

- `angle` in [-0.25, 0.25] radians
- Launch:


vx = direction \cdot speed \cdot \cos(angle),\quad
vy = speed \cdot \sin(angle)


Notes:

- This keeps the serve mostly horizontal with a small vertical component.
- `direction` is either `+1` or `-1`.