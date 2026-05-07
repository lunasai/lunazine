import { useRef, useEffect, useCallback } from "react"
import { GRAVITY, DRAG_X, getTrailColor, getParticleHandoverCallback } from "./cursorDitherUtils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Particle {
  trueX: number
  trueY: number
  x: number
  y: number
  vx: number
  vy: number
  lifetime: number
  age: number
  r: number
  g: number
  b: number
}

interface CursorDitherTrailProps {
  /**
   * Side length of each pixel square in px.
   * Use the same value as `PixelPileFooter` `dotSize` so grids align.
   * Default: 3
   */
  dotSize?: number
  className?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PARTICLES_PER_EVENT = 5
const MIN_LIFETIME = 300
const MAX_LIFETIME = 600

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Full-viewport fixed canvas that spawns falling pixel particles on click/drag.
 *
 * Behaviour:
 *  - Click       → burst of PARTICLES_PER_EVENT pixels at cursor
 *  - Click+drag  → continuous stream while mouse button is held
 *  - Each pixel falls under GRAVITY, fades to transparent, then is removed
 *  - When a pixel crosses into `.pixel-pile-footer`, it is handed off to
 *    PixelPileFooter via the shared handover callback (no visual pop)
 *
 * Respects `prefers-reduced-motion`: no particles are spawned.
 */
export function CursorDitherTrail({
  dotSize = 3,
  className = "cursor-dither-trail",
}: CursorDitherTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const spawnParticles = useCallback(
    (
      particles: Particle[],
      x: number,
      y: number,
      color: { r: number; g: number; b: number }
    ) => {
      for (let i = 0; i < PARTICLES_PER_EVENT; i++) {
        const vx = (Math.random() - 0.5) * 3.0
        const vy = (Math.random() - 0.5) * 0.8
        particles.push({
          trueX: x,
          trueY: y,
          x: Math.round(x / dotSize) * dotSize,
          y: Math.round(y / dotSize) * dotSize,
          vx,
          vy,
          lifetime: MIN_LIFETIME + Math.floor(Math.random() * (MAX_LIFETIME - MIN_LIFETIME + 1)),
          age: 0,
          ...color,
        })
      }
    },
    [dotSize]
  )

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const onResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener("resize", onResize)

    const particles: Particle[] = []
    let isPressed = false

    const onMove = (e: MouseEvent) => {
      if (reducedMotion || !isPressed) return
      spawnParticles(particles, e.clientX, e.clientY, getTrailColor())
    }
    window.addEventListener("mousemove", onMove)

    const onDown = (e: MouseEvent) => {
      isPressed = true
      if (reducedMotion) return
      spawnParticles(particles, e.clientX, e.clientY, getTrailColor())
    }
    const onUp = () => { isPressed = false }
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)

    let rafId: number

    const tick = () => {
      ctx.clearRect(0, 0, width, height)

      // Look up footer element each frame so position is always current
      const footerEl = document.querySelector(".pixel-pile-footer")
      const footerRect = footerEl?.getBoundingClientRect()
      const onParticleHandover = getParticleHandoverCallback()

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age++

        p.vy += GRAVITY
        p.vx *= DRAG_X
        p.trueX += p.vx
        p.trueY += p.vy

        // ── Hand off to PixelPileFooter when the pixel enters footer bounds ──
        if (footerRect && p.trueY > footerRect.top && onParticleHandover) {
          if (p.trueX >= footerRect.left && p.trueX <= footerRect.right) {
            onParticleHandover({ trueX: p.trueX, trueY: p.trueY, vx: p.vx, vy: p.vy, r: p.r, g: p.g, b: p.b })
            particles.splice(i, 1)
            continue
          }
        }

        if (p.trueY > height + 20 || p.age >= p.lifetime) {
          particles.splice(i, 1)
          continue
        }

        p.x = Math.round(p.trueX / dotSize) * dotSize
        p.y = Math.round(p.trueY / dotSize) * dotSize

        const alpha = 1 - p.age / p.lifetime
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`
        ctx.fillRect(p.x, p.y, dotSize, dotSize)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(rafId)
    }
  }, [dotSize, spawnParticles])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  )
}

export default CursorDitherTrail
