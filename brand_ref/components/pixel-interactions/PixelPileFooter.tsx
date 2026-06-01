import { useRef, useEffect, useCallback, type ReactNode } from "react"
import { getTrailColor, setParticleHandoverCallback } from "./cursorDitherUtils"
import type { HandoverParticle } from "./cursorDitherUtils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveParticle {
  trueX: number
  trueY: number
  vx: number
  vy: number
  age: number
  lifetime: number
  r: number
  g: number
  b: number
}

interface PixelPileFooterProps {
  /** Side length of each pixel square. Must match `CursorDitherTrail` `dotSize`. Default: 3 */
  dotSize?: number
  /** Canvas height in px. Default: 120 */
  height?: number
  /** Overlay content rendered on top of the canvas (e.g. footer text). */
  children?: ReactNode
  /**
   * CSS class name for the wrapper div.
   * CursorDitherTrail queries `.pixel-pile-footer` to trigger handover —
   * only change this if you update the selector in CursorDitherTrail too.
   */
  className?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
// NOT used by index.html — production site loads js/pixel-interactions.js.
// Edit that file to tune the live pile; keep these in sync for brand_ref only.

const MAX_PARTICLES = 10000
const HOVER_RADIUS = 72
const HOVER_PROBABILITY = 0.32
const HOVER_EJECT_BUDGET = 50
const HOVER_EJECT_SPEED_BONUS = 4
const HOVER_EJECT_SPEED_CAP = 60
const PILE_GRAVITY = 0.25
const PILE_DRAG_X = 0.96
const HOVER_JITTER = 5
const HOVER_SWIPE_SCALE = 0.24
const HOVER_BAT_IMPULSE = 0.4
const HOVER_SPEED_CHANCE_MAX = 0.14
const HOVER_SPEED_CHANCE_K = 0.038
const AIR_KICK_RADIUS = 32
const AIR_KICK_SWIPE = 0.06
const DEPTH_EJECT_BIAS = 0.82
const MAX_LAUNCH_SPEED = 8
const SWIPE_SMOOTHING = 0.38
const ARC_CROSS_DAMP = 0.72
const LAUNCH_LIFT_ON_SWIPE = 0.45
const LAND_SEARCH_COLS = 2


// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Canvas-based footer with a pixel mountain that:
 *  - Starts as a dome-shaped pile of pixels (falling-sand simulation)
 *  - Erodes when the cursor hovers nearby (stochastic ejection)
 *  - Accepts pixels handed off from CursorDitherTrail and lets them land
 *  - Renders the pile with an 8×8 Bayer dither pattern for a stippled look
 *
 * Respects `prefers-reduced-motion`: draws a single static frame, no animation.
 */
export function PixelPileFooter({
  dotSize = 3,
  height = 120,
  children,
  className = "pixel-pile-footer",
}: PixelPileFooterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef<Uint8Array | null>(null)
  const particlesRef = useRef<ActiveParticle[]>([])
  const rafIdRef = useRef<number>(0)

  // ── Initialization ────────────────────────────────────────────────────────

  const initPile = useCallback((gridW: number, gridH: number) => {
    const grid = new Uint8Array(gridW * gridH)
    // Peak height ≈ 8.75% of grid rows — subtle dome, not a wall
    const peakCells = Math.floor(gridH * 0.0875)

    for (let c = 0; c < gridW; c++) {
      // Dome profile: h(c) = peak * sqrt(1 - ((2c/W) - 1)²)
      const xNorm = (2 * c) / gridW - 1
      const h = Math.round(peakCells * Math.sqrt(Math.max(0, 1 - xNorm * xNorm)))
      for (let r = gridH - 1; r >= gridH - h; r--) {
        grid[r * gridW + c] = 1
      }
    }
    gridRef.current = grid
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const gridH = Math.ceil(height / dotSize)

    const resizeCanvas = () => {
      const el = containerRef.current
      const c = canvasRef.current
      if (!el || !c) return
      const w = Math.max(1, Math.round(el.getBoundingClientRect().width))
      c.width = w
      c.height = height
      initPile(Math.ceil(w / dotSize), gridH)
    }

    resizeCanvas()
    requestAnimationFrame(resizeCanvas)

    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(container)
    window.addEventListener("resize", resizeCanvas)

    const gridWFor = (): number => {
      const g = gridRef.current
      return g && gridH >= 1 ? g.length / gridH : 0
    }

    // ── Hover (swipe scoop) — keep in sync with js/pixel-interactions.js ──

    let pointerX = 0
    let pointerY = 0
    let swipeVx = 0
    let swipeVy = 0
    let swipeSpeed = 0
    let pointerActive = false
    let hoverLastX: number | null = null
    let hoverLastY: number | null = null
    const updatePointer = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      if (hoverLastX !== null) {
        const rawDx = x - hoverLastX
        const rawDy = y - hoverLastY
        swipeVx = swipeVx * (1 - SWIPE_SMOOTHING) + rawDx * SWIPE_SMOOTHING
        swipeVy = swipeVy * (1 - SWIPE_SMOOTHING) + rawDy * SWIPE_SMOOTHING
        swipeSpeed = Math.hypot(swipeVx, swipeVy)
      } else {
        swipeVx = 0
        swipeVy = 0
        swipeSpeed = 0
      }
      hoverLastX = x
      hoverLastY = y
      pointerX = x
      pointerY = y
      pointerActive = true
    }

    const clearPointer = () => {
      pointerActive = false
      hoverLastX = null
      hoverLastY = null
      swipeVx = 0
      swipeVy = 0
      swipeSpeed = 0
    }

    const columnDepthFromTop = (grid: Uint8Array, gridW: number, r: number, c: number) => {
      let topR = -1
      for (let rr = 0; rr <= r; rr++) {
        if (grid[rr * gridW + c] === 1) {
          topR = rr
          break
        }
      }
      return topR < 0 ? 0 : r - topR
    }

    const clampLaunch = (vx: number, vy: number) => {
      let speed = Math.hypot(vx, vy)
      if (speed > MAX_LAUNCH_SPEED && speed > 0) {
        const scale = MAX_LAUNCH_SPEED / speed
        vx *= scale
        vy *= scale
      }
      if (Math.abs(swipeVx) > Math.abs(swipeVy) * 1.2) vy *= ARC_CROSS_DAMP
      else if (Math.abs(swipeVy) > Math.abs(swipeVx) * 1.2) vx *= ARC_CROSS_DAMP
      return { vx, vy }
    }

    const ejectVelocity = (pxX: number, pxY: number) => {
      const dx = pxX - pointerX
      const dy = pxY - pointerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const nx = dist > 0 ? dx / dist : 0
      const ny = dist > 0 ? dy / dist : 0
      const jitterX = (Math.random() - 0.5) * HOVER_JITTER
      const jitterY = (Math.random() - 0.5) * HOVER_JITTER
      let vx = jitterX + swipeVx * HOVER_SWIPE_SCALE + nx * HOVER_BAT_IMPULSE
      let vy = jitterY + swipeVy * HOVER_SWIPE_SCALE + ny * HOVER_BAT_IMPULSE
      if (Math.abs(swipeVx) > Math.abs(swipeVy) * 1.1) vy -= LAUNCH_LIFT_ON_SWIPE
      return clampLaunch(vx, vy)
    }

    const placeLandedGrain = (
      grid: Uint8Array,
      gridW: number,
      gridR: number,
      gridC: number
    ) => {
      let bestR = -1
      let bestC = gridC
      let bestScore = Infinity
      for (let dc = -LAND_SEARCH_COLS; dc <= LAND_SEARCH_COLS; dc++) {
        const tc = gridC + dc
        if (tc < 0 || tc >= gridW) continue
        let targetR = Math.min(Math.max(0, gridR), gridH - 1)
        while (targetR > 0 && grid[targetR * gridW + tc] === 1) targetR--
        if (grid[targetR * gridW + tc] === 1) continue
        const score = Math.abs(dc) * 2 + Math.abs(targetR - gridR)
        if (score < bestScore) {
          bestScore = score
          bestR = targetR
          bestC = tc
        }
      }
      if (bestR >= 0) grid[bestR * gridW + bestC] = 1
    }

    const sandSettleStep = (grid: Uint8Array, gridW: number) => {
      const leftFirst = Math.random() > 0.5
      for (let r = gridH - 2; r >= 0; r--) {
        for (let c = 0; c < gridW; c++) {
          if (grid[r * gridW + c] !== 1) continue
          const below = (r + 1) * gridW + c
          const belowL = (r + 1) * gridW + (c - 1)
          const belowR = (r + 1) * gridW + (c + 1)
          if (grid[below] === 0) {
            grid[r * gridW + c] = 0
            grid[below] = 1
          } else {
            const canL = c > 0 && grid[belowL] === 0
            const canR = c < gridW - 1 && grid[belowR] === 0
            if (canL && canR) {
              grid[r * gridW + c] = 0
              grid[leftFirst ? belowL : belowR] = 1
            } else if (canL) {
              grid[r * gridW + c] = 0
              grid[belowL] = 1
            } else if (canR) {
              grid[r * gridW + c] = 0
              grid[belowR] = 1
            }
          }
        }
      }
    }

    const sandSpreadStep = (grid: Uint8Array, gridW: number) => {
      for (let r = gridH - 2; r >= 0; r--) {
        for (let c = 0; c < gridW; c++) {
          if (grid[r * gridW + c] !== 1) continue
          if (grid[(r + 1) * gridW + c] !== 1) continue
          const canL =
            c > 0 &&
            grid[r * gridW + (c - 1)] === 0 &&
            grid[(r + 1) * gridW + (c - 1)] === 0
          const canR =
            c < gridW - 1 &&
            grid[r * gridW + (c + 1)] === 0 &&
            grid[(r + 1) * gridW + (c + 1)] === 0
          if (canL && canR) {
            if (Math.random() > 0.5) {
              grid[r * gridW + c] = 0
              grid[r * gridW + (c - 1)] = 1
            } else {
              grid[r * gridW + c] = 0
              grid[r * gridW + (c + 1)] = 1
            }
          } else if (canL) {
            grid[r * gridW + c] = 0
            grid[r * gridW + (c - 1)] = 1
          } else if (canR) {
            grid[r * gridW + c] = 0
            grid[r * gridW + (c + 1)] = 1
          }
        }
      }
    }

    const handleHover = (clientX: number, clientY: number) => {
      if (reducedMotion || !gridRef.current) return
      updatePointer(clientX, clientY)

      const grid = gridRef.current
      const particles = particlesRef.current
      const color = getTrailColor()
      const gridW = gridWFor()
      const budget =
        HOVER_EJECT_BUDGET +
        Math.min(Math.floor(swipeSpeed * HOVER_EJECT_SPEED_BONUS), HOVER_EJECT_SPEED_CAP)

      const candidates: {
        r: number
        c: number
        pxX: number
        pxY: number
        weight: number
        sortKey?: number
      }[] = []

      for (let r = 0; r < gridH; r++) {
        for (let c = 0; c < gridW; c++) {
          if (grid[r * gridW + c] === 0) continue

          const pxX = c * dotSize + dotSize / 2
          const pxY = r * dotSize + dotSize / 2
          const dx = pxX - pointerX
          const dy = pxY - pointerY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist >= HOVER_RADIUS) continue

          const t = 1 - dist / HOVER_RADIUS
          const depth = columnDepthFromTop(grid, gridW, r, c)
          const weight = t * Math.pow(DEPTH_EJECT_BIAS, depth)
          candidates.push({ r, c, pxX, pxY, weight })
        }
      }

      for (let i = 0; i < candidates.length; i++) {
        candidates[i].sortKey =
          -Math.log(Math.random() + 1e-9) / candidates[i].weight
      }
      candidates.sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0))

      const count = Math.min(budget, candidates.length)
      for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) break
        const cell = candidates[i]
        grid[cell.r * gridW + cell.c] = 0
        const vel = ejectVelocity(cell.pxX, cell.pxY)
        particles.push({
          trueX: cell.pxX,
          trueY: cell.pxY,
          vx: vel.vx,
          vy: vel.vy,
          age: 0,
          lifetime: 55 + Math.floor(Math.random() * 75),
          ...color,
        })
      }
    }

    const onPointerMove = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        handleHover(clientX, clientY)
      } else {
        clearPointer()
      }
    }

    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY)
    }

    if (!reducedMotion) {
      window.addEventListener("mousemove", onMouseMove, { passive: true })
      window.addEventListener("touchmove", onTouchMove, { passive: true })
      window.addEventListener("mouseleave", clearPointer, { passive: true })
    }

    // ── Particle Handover (from CursorDitherTrail) ────────────────────────

    const onHandover = (p: HandoverParticle) => {
      if (reducedMotion || !containerRef.current) return
      if (particlesRef.current.length >= MAX_PARTICLES) return

      const rect = containerRef.current.getBoundingClientRect()
      particlesRef.current.push({
        trueX: p.trueX - rect.left,
        trueY: Math.max(0, p.trueY - rect.top),
        vx: p.vx,
        vy: p.vy,
        age: 0,
        lifetime: 400,
        r: p.r,
        g: p.g,
        b: p.b,
      })
    }
    setParticleHandoverCallback(onHandover)

    // ── Animation Loop ────────────────────────────────────────────────────

    const tick = () => {
      const w = canvas.width
      const grid = gridRef.current
      if (!grid) return
      const currentGridW = grid.length / gridH
      ctx.clearRect(0, 0, w, height)

      const color = getTrailColor()
      const particles = particlesRef.current

      if (
        pointerActive &&
        swipeSpeed > 0.4 &&
        (Math.abs(swipeVx) > 0.08 || Math.abs(swipeVy) > 0.08)
      ) {
        const kickR2 = AIR_KICK_RADIUS * AIR_KICK_RADIUS
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          const dx = p.trueX - pointerX
          const dy = p.trueY - pointerY
          if (dx * dx + dy * dy < kickR2) {
            p.vx += swipeVx * AIR_KICK_SWIPE
            p.vy += swipeVy * AIR_KICK_SWIPE
          }
        }
      }

      // 1. Update & draw in-flight particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age++
        p.vy += PILE_GRAVITY
        p.vx *= PILE_DRAG_X
        p.trueX += p.vx
        p.trueY += p.vy

        const drawX = Math.round(p.trueX / dotSize) * dotSize
        const drawY = Math.round(p.trueY / dotSize) * dotSize
        const gridC = Math.floor(drawX / dotSize)
        const gridR = Math.floor(drawY / dotSize)

        // Land on bottom edge or on top of the pile
        let landed = gridR >= gridH - 1
        if (!landed && gridC >= 0 && gridC < currentGridW) {
          const checkR = Math.max(0, gridR)
          if (grid[checkR * currentGridW + gridC] === 1 || grid[(checkR + 1) * currentGridW + gridC] === 1) {
            landed = true
          }
        }

        if (landed && gridC >= 0 && gridC < currentGridW) {
          placeLandedGrain(grid, currentGridW, gridR, gridC)
          particles.splice(i, 1)
        } else if (p.age >= p.lifetime) {
          particles.splice(i, 1)
        } else {
          const alpha = 1 - p.age / p.lifetime
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`
          ctx.fillRect(drawX, drawY, dotSize, dotSize)
        }
      }

      sandSettleStep(grid, currentGridW)
      sandSpreadStep(grid, currentGridW)
      sandSettleStep(grid, currentGridW)

      swipeVx *= 0.88
      swipeVy *= 0.88
      swipeSpeed = Math.hypot(swipeVx, swipeVy)

      // 3. Draw the pile with Bayer dither alpha modulation
      for (let r = 0; r < gridH; r++) {
        for (let c = 0; c < currentGridW; c++) {
          if (grid[r * currentGridW + c] === 1) {
            ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`
            ctx.fillRect(c * dotSize, r * dotSize, dotSize, dotSize)
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    if (reducedMotion) {
      // Single static frame — no rAF loop
      const grid = gridRef.current
      if (grid) {
        const gw = grid.length / gridH
        const color = getTrailColor()
        for (let r = 0; r < gridH; r++) {
          for (let c = 0; c < gw; c++) {
            if (grid[r * gw + c] === 1) {
              ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`
              ctx.fillRect(c * dotSize, r * dotSize, dotSize, dotSize)
            }
          }
        }
      }
    } else {
      rafIdRef.current = requestAnimationFrame(tick)
    }

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("mouseleave", clearPointer)
      setParticleHandoverCallback(null)
      cancelAnimationFrame(rafIdRef.current)
    }
  }, [dotSize, height, initPile])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: `${height}px`, overflow: "hidden" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {children}
    </div>
  )
}

export default PixelPileFooter
