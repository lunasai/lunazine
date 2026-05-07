// ─── Physics Constants ────────────────────────────────────────────────────────

/**
 * Gravity: px/frame² added to vy each tick.
 * At 60 fps → ~648 px/s² — strong, satisfying pull.
 */
export const GRAVITY = 0.18

/** Horizontal air resistance — keeps scatter tight so the fall dominates. */
export const DRAG_X = 0.97

// ─── Color ────────────────────────────────────────────────────────────────────

/**
 * Returns the accent color for particles, toggled by `data-theme` on <html>.
 * Swap these RGB values to match your own palette.
 *
 *   dark  → lavender  #8aabff  rgb(138, 171, 255)
 *   light → purple    #5543e4  rgb(85,  67,  228)
 */
export function getTrailColor(): { r: number; g: number; b: number } {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  return isDark
    ? { r: 138, g: 171, b: 255 }
    : { r: 85, g: 67, b: 228 }
}

// ─── Particle Handover System ────────────────────────────────────────────────
//
// When a falling trail particle crosses into the footer's bounding rect,
// CursorDitherTrail removes it from its own canvas and passes it here so
// PixelPileFooter can continue the physics seamlessly.

export interface HandoverParticle {
  trueX: number
  trueY: number
  vx: number
  vy: number
  r: number
  g: number
  b: number
}

type HandoverCallback = (p: HandoverParticle) => void
let onParticleHandover: HandoverCallback | null = null

export function setParticleHandoverCallback(cb: HandoverCallback | null) {
  onParticleHandover = cb
}

export function getParticleHandoverCallback(): HandoverCallback | null {
  return onParticleHandover
}
