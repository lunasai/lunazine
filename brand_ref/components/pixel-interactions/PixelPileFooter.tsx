import { useRef, useEffect, useCallback, type ReactNode } from "react"
import { GRAVITY, DRAG_X, getTrailColor, setParticleHandoverCallback } from "./cursorDitherUtils"
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

const MAX_PARTICLES = 2000

/** Pixels within this radius of the cursor get disturbed on hover. */
const HOVER_RADIUS = 40

/** Probability (0–1) that an in-range pixel is ejected per frame on hover. Lower = slower erosion. */
const HOVER_PROBABILITY = 0.08

// Bayer 8×8 ordered dither matrix — gives the static pixel pile its stippled look.
const BAYER_8X8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]

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

    // ── Hover Interaction ─────────────────────────────────────────────────

    const handleHover = (clientX: number, clientY: number) => {
      if (reducedMotion || !gridRef.current || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const grid = gridRef.current
      const particles = particlesRef.current
      const color = getTrailColor()
      const gridW = gridWFor()

      for (let r = 0; r < gridH; r++) {
        for (let c = 0; c < gridW; c++) {
          if (grid[r * gridW + c] === 0) continue

          const pxX = c * dotSize + dotSize / 2
          const pxY = r * dotSize + dotSize / 2
          const dx = pxX - x
          const dy = pxY - y

          if (dx * dx + dy * dy < HOVER_RADIUS * HOVER_RADIUS) {
            if (Math.random() < HOVER_PROBABILITY) {
              grid[r * gridW + c] = 0

              const dist = Math.sqrt(dx * dx + dy * dy)
              const nx = dist > 0 ? dx / dist : (Math.random() - 0.5)
              const ny = dist > 0 ? dy / dist : -1

              if (particles.length < MAX_PARTICLES) {
                particles.push({
                  trueX: pxX,
                  trueY: pxY,
                  vx: nx * 1 + (Math.random() - 0.5) * 2,
                  vy: ny * 1 - 1,
                  age: 0,
                  lifetime: 80 + Math.floor(Math.random() * 100),
                  ...color,
                })
              }
            }
          }
        }
      }
    }

    const onMouseMove = (e: MouseEvent) => handleHover(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleHover(e.touches[0].clientX, e.touches[0].clientY)
    }

    if (!reducedMotion) {
      container.addEventListener("mousemove", onMouseMove)
      container.addEventListener("touchmove", onTouchMove)
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

      // 1. Update & draw in-flight particles
      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age++
        p.vy += GRAVITY
        p.vx *= DRAG_X
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

        if (landed) {
          let targetR = Math.min(Math.max(0, gridR), gridH - 1)
          while (targetR > 0 && grid[targetR * currentGridW + gridC] === 1) targetR--
          if (gridC >= 0 && gridC < currentGridW) grid[targetR * currentGridW + gridC] = 1
          particles.splice(i, 1)
        } else if (p.age >= p.lifetime) {
          particles.splice(i, 1)
        } else {
          const alpha = 1 - p.age / p.lifetime
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`
          ctx.fillRect(drawX, drawY, dotSize, dotSize)
        }
      }

      // 2. Falling-sand simulation — pixels settle downward/diagonally
      const leftFirst = Math.random() > 0.5
      for (let r = gridH - 2; r >= 0; r--) {
        for (let c = 0; c < currentGridW; c++) {
          if (grid[r * currentGridW + c] !== 1) continue

          const below = (r + 1) * currentGridW + c
          const belowL = (r + 1) * currentGridW + (c - 1)
          const belowR = (r + 1) * currentGridW + (c + 1)

          if (grid[below] === 0) {
            grid[r * currentGridW + c] = 0
            grid[below] = 1
          } else {
            const canL = c > 0 && grid[belowL] === 0
            const canR = c < currentGridW - 1 && grid[belowR] === 0
            if (canL && canR) {
              grid[r * currentGridW + c] = 0
              grid[leftFirst ? belowL : belowR] = 1
            } else if (canL) {
              grid[r * currentGridW + c] = 0
              grid[belowL] = 1
            } else if (canR) {
              grid[r * currentGridW + c] = 0
              grid[belowR] = 1
            }
          }
        }
      }

      // 3. Draw the pile with Bayer dither alpha modulation
      for (let r = 0; r < gridH; r++) {
        for (let c = 0; c < currentGridW; c++) {
          if (grid[r * currentGridW + c] === 1) {
            const bayerVal = BAYER_8X8[(r % 8) * 8 + (c % 8)] / 64.0
            const alpha = 0.55 + bayerVal * 0.45
            ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha.toFixed(3)})`
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
              const bayerVal = BAYER_8X8[(r % 8) * 8 + (c % 8)] / 64.0
              const alpha = 0.55 + bayerVal * 0.45
              ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha.toFixed(3)})`
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
      container.removeEventListener("mousemove", onMouseMove)
      container.removeEventListener("touchmove", onTouchMove)
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
