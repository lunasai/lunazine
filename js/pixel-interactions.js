/**
 * pixel-interactions.js
 *
 * Falling-pixel cursor trail + interactive pixel-pile footer.
 * Vanilla JS translation of the brand_ref/components/pixel-interactions suite.
 *
 * No dependencies. Respects prefers-reduced-motion.
 * Reads data-theme on <html> to pick dark/light accent color.
 */
(function () {
  "use strict";

  // ─── Physics ──────────────────────────────────────────────────────────────────

  const GRAVITY = 0.18;
  const DRAG_X  = 0.97;
  const DOT_SIZE = 3;

  // ─── Color ────────────────────────────────────────────────────────────────────
  // Reads --color-accent-fg from the CSS token so pixel trails match accent UI.

  function getTrailColor() {
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent-fg").trim();
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  // ─── Reduced-motion gate ──────────────────────────────────────────────────────

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─── Handover bridge ──────────────────────────────────────────────────────────
  // Cursor trail hands off when a grain enters the pile band: full viewport height
  // anchored to the footer (see pileBandHeightPx). Airborne grains draw on the
  // trail canvas so they stay visible above sections like .section--thanks.

  let onParticleHandover = null;

  // ─── Bayer 8×8 dither matrix ─────────────────────────────────────────────────

  const BAYER_8X8 = [
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ];

  // ═══════════════════════════════════════════════════════════════════════════════
  // CURSOR DITHER TRAIL
  // Fixed, full-viewport canvas that spawns falling pixel particles on click/drag.
  // ═══════════════════════════════════════════════════════════════════════════════

  const PARTICLES_PER_EVENT = 5;
  const MIN_LIFETIME = 300;
  const MAX_LIFETIME = 600;

  const trailCanvas = document.createElement("canvas");
  trailCanvas.className = "cursor-dither-trail";
  Object.assign(trailCanvas.style, {
    position:      "fixed",
    top:           "0",
    left:          "0",
    width:         "100vw",
    height:        "100vh",
    pointerEvents: "none",
    zIndex:        "9999",
  });
  document.body.appendChild(trailCanvas);

  const trailCtx = trailCanvas.getContext("2d");
  let trailW = window.innerWidth;
  let trailH = window.innerHeight;
  trailCanvas.width  = trailW;
  trailCanvas.height = trailH;

  window.addEventListener("resize", () => {
    trailW = window.innerWidth;
    trailH = window.innerHeight;
    trailCanvas.width  = trailW;
    trailCanvas.height = trailH;
  });

  const trailParticles = [];
  let isPressed = false;

  function spawnParticles(cx, cy) {
    const color = getTrailColor();
    for (let i = 0; i < PARTICLES_PER_EVENT; i++) {
      trailParticles.push({
        trueX:    cx,
        trueY:    cy,
        x:        Math.round(cx / DOT_SIZE) * DOT_SIZE,
        y:        Math.round(cy / DOT_SIZE) * DOT_SIZE,
        vx:       (Math.random() - 0.5) * 3.0,
        vy:       (Math.random() - 0.5) * 0.8,
        lifetime: MIN_LIFETIME + Math.floor(Math.random() * (MAX_LIFETIME - MIN_LIFETIME + 1)),
        age:      0,
        r:        color.r,
        g:        color.g,
        b:        color.b,
      });
    }
  }

  function isInteractiveTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        "a,button,input,textarea,select,summary,[role='button'],[role='link'],[data-no-pixels]"
      )
    );
  }

  function setPressed(next) {
    isPressed = next;
  }

  function onPressLikeStart(clientX, clientY, target) {
    if (reducedMotion) return;
    if (isInteractiveTarget(target)) return;
    spawnParticles(clientX, clientY);
  }

  function onPressLikeMove(clientX, clientY, target) {
    if (reducedMotion || !isPressed) return;
    if (isInteractiveTarget(target)) return;
    spawnParticles(clientX, clientY);
  }

  // Prefer Pointer Events (covers mouse + touch + pen)
  if ("PointerEvent" in window) {
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (!e.isPrimary) return;
        setPressed(true);
        onPressLikeStart(e.clientX, e.clientY, e.target);
      },
      { passive: true }
    );

    window.addEventListener(
      "pointermove",
      (e) => {
        if (!e.isPrimary) return;
        onPressLikeMove(e.clientX, e.clientY, e.target);
      },
      { passive: true }
    );

    window.addEventListener("pointerup", () => setPressed(false), { passive: true });
    window.addEventListener("pointercancel", () => setPressed(false), { passive: true });
  } else {
    // Fallback for older browsers: mouse + touch
    window.addEventListener(
      "mousedown",
      (e) => {
        setPressed(true);
        onPressLikeStart(e.clientX, e.clientY, e.target);
      },
      { passive: true }
    );

    window.addEventListener(
      "mousemove",
      (e) => {
        onPressLikeMove(e.clientX, e.clientY, e.target);
      },
      { passive: true }
    );

    window.addEventListener("mouseup", () => setPressed(false), { passive: true });

    window.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        setPressed(true);
        onPressLikeStart(t.clientX, t.clientY, e.target);
      },
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        onPressLikeMove(t.clientX, t.clientY, e.target);
      },
      { passive: true }
    );

    window.addEventListener("touchend", () => setPressed(false), { passive: true });
    window.addEventListener("touchcancel", () => setPressed(false), { passive: true });
  }

  function simulateTrailParticlesForFrame(footerRect, pileBandTop) {
    for (let i = trailParticles.length - 1; i >= 0; i--) {
      const p = trailParticles[i];
      p.age++;
      p.vy    += GRAVITY;
      p.vx    *= DRAG_X;
      p.trueX += p.vx;
      p.trueY += p.vy;

      const inPileBand =
        footerRect &&
        pileBandTop !== Infinity &&
        p.trueY >= pileBandTop &&
        p.trueX >= footerRect.left &&
        p.trueX <= footerRect.right;

      if (inPileBand && onParticleHandover) {
        onParticleHandover({
          trueX: p.trueX,
          trueY: p.trueY,
          vx:    p.vx,
          vy:    p.vy,
          r:     p.r,
          g:     p.g,
          b:     p.b,
        });
        trailParticles.splice(i, 1);
        continue;
      }

      if (p.trueY > trailH + 20 || p.age >= p.lifetime) {
        trailParticles.splice(i, 1);
        continue;
      }

      p.x = Math.round(p.trueX / DOT_SIZE) * DOT_SIZE;
      p.y = Math.round(p.trueY / DOT_SIZE) * DOT_SIZE;
    }
  }

  function drawTrailParticlesOnCanvas() {
    for (let i = 0; i < trailParticles.length; i++) {
      const p = trailParticles[i];
      const alpha = 1 - p.age / p.lifetime;
      trailCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`;
      trailCtx.fillRect(p.x, p.y, DOT_SIZE, DOT_SIZE);
    }
  }

  function trailOnlyFrame() {
    trailCtx.clearRect(0, 0, trailW, trailH);
    simulateTrailParticlesForFrame(null, Infinity);
    drawTrailParticlesOnCanvas();
    requestAnimationFrame(trailOnlyFrame);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PIXEL PILE FOOTER
  // Canvas inside .pixel-pile-footer that runs a falling-sand simulation.
  // ═══════════════════════════════════════════════════════════════════════════════

  /* Hover / pile physics — see docs/pixel-pile-tuning.md */
  const MAX_PILE_PARTICLES       = 10000;
  const HOVER_RADIUS             = 72;
  const HOVER_PROBABILITY        = 0.24;
  const PILE_GRAVITY             = 0.25;
  const PILE_DRAG_X              = 0.93;
  const HOVER_JITTER             = 5;
  const HOVER_SWIPE_SCALE        = 0.24;
  const HOVER_BAT_IMPULSE        = 0.5;  /* half-strength contact pop — vibe without full blast */
  const HOVER_SPEED_CHANCE_MAX   = 0.14;
  const HOVER_SPEED_CHANCE_K     = 0.038;
  const AIR_KICK_RADIUS          = 32;
  const AIR_KICK_SWIPE           = 0.06;
  const DEPTH_EJECT_BIAS         = 0.42; /* deeper grains in a column eject less */
  const MAX_LAUNCH_SPEED         = 8;
  const SWIPE_SMOOTHING          = 0.38;
  const ARC_CROSS_DAMP           = 0.42; /* softer than 0.32 — more arc on fast swipes */
  const PEAK_RATIO               = 0.03;

  /** Pile simulation band height (px), pinned to viewport bottom — tracks innerHeight. */
  let pileBandHeightPx = Math.round(window.innerHeight);
  /** Last committed grid dimensions (for resize + localStorage invalidation). */
  let cachedGridW = 0;
  let cachedGridH = 0;

  function syncPileBandHeightFromViewport() {
    pileBandHeightPx = Math.round(window.innerHeight);
  }

  function getGridH() {
    return Math.max(1, Math.ceil(pileBandHeightPx / DOT_SIZE));
  }

  function getGridW() {
    if (!pileGrid) return 0;
    const gh = getGridH();
    return gh ? Math.round(pileGrid.length / gh) : 0;
  }

  const pileContainer = document.querySelector(".pixel-pile-footer");
  if (!pileContainer) {
    requestAnimationFrame(trailOnlyFrame);
    return;
  }

  syncPileBandHeightFromViewport();

  const pileCanvas = document.createElement("canvas");
  Object.assign(pileCanvas.style, {
    position:      "absolute",
    bottom:        "0",
    top:           "auto",
    left:          "0",
    width:         "100%",
    height:        pileBandHeightPx + "px",
    pointerEvents: "none",
    zIndex:        "0",
  });
  pileContainer.insertBefore(pileCanvas, pileContainer.firstChild);

  const pileCtx = pileCanvas.getContext("2d");

  let pileGrid     = null;
  const pileParticles = [];

  /** Pile-local pointer + swipe (updated on move; decayed each frame for air kicks). */
  let pilePointerX     = 0;
  let pilePointerY     = 0;
  let pileSwipeVx      = 0;
  let pileSwipeVy      = 0;
  let pileSwipeSpeed   = 0;
  let pilePointerActive = false;
  let pileHoverLastX   = null;
  let pileHoverLastY   = null;

  // ── Grid helpers ──────────────────────────────────────────────────────────────

  function initPile(gridW) {
    const gh        = getGridH();
    const grid      = new Uint8Array(gridW * gh);
    const peakCells = Math.floor(gh * PEAK_RATIO);

    for (let c = 0; c < gridW; c++) {
      const xNorm = (2 * c) / gridW - 1;
      const h = Math.round(peakCells * Math.sqrt(Math.max(0, 1 - xNorm * xNorm)));
      for (let r = gh - 1; r >= gh - h; r--) {
        grid[r * gridW + c] = 1;
      }
    }
    return grid;
  }

  const STORAGE_KEY = "pixelPileGrid";

  function savePileGrid() {
    if (!pileGrid) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        w:    getGridW(),
        h:    getGridH(),
        data: Array.from(pileGrid),
      }));
    } catch (e) {
      // Ignore quota errors
    }
  }

  function resizePile() {
    syncPileBandHeightFromViewport();

    const w         = Math.max(1, Math.round(window.innerWidth));
    const newGridW  = Math.ceil(w / DOT_SIZE);
    const newGridH  = getGridH();

    pileCanvas.width  = w;
    pileCanvas.height = pileBandHeightPx;
    pileCanvas.style.height = pileBandHeightPx + "px";

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const expectedLen = newGridW * newGridH;
        if (
          saved &&
          saved.w === newGridW &&
          saved.h === newGridH &&
          Array.isArray(saved.data) &&
          saved.data.length === expectedLen
        ) {
          pileGrid = new Uint8Array(saved.data);
          cachedGridW = newGridW;
          cachedGridH = newGridH;
          return;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    if (
      (cachedGridW !== 0 && cachedGridW !== newGridW) ||
      (cachedGridH !== 0 && cachedGridH !== newGridH)
    ) {
      localStorage.removeItem(STORAGE_KEY);
    }

    pileGrid = initPile(newGridW);
    cachedGridW = newGridW;
    cachedGridH = newGridH;
  }

  resizePile();
  requestAnimationFrame(resizePile);

  const ro = new ResizeObserver(resizePile);
  ro.observe(pileContainer);
  window.addEventListener("resize", resizePile);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizePile);
  }

  // Persist the grid every 5 s (saving every frame would be too expensive)
  setInterval(savePileGrid, 5000);

  // ── Hover interaction (swipe + bat — cat-playing-with-sand feel) ───────────────

  function pileLocalFromClient(clientX, clientY) {
    const rect      = pileContainer.getBoundingClientRect();
    const canvasTop = rect.bottom - pileBandHeightPx;
    return {
      x: clientX - rect.left,
      y: clientY - canvasTop,
      rect,
      canvasTop,
    };
  }

  function isClientInPileBand(clientX, clientY) {
    const { x, y, rect, canvasTop } = pileLocalFromClient(clientX, clientY);
    return (
      clientX >= rect.left && clientX <= rect.right &&
      clientY >= canvasTop && clientY <= rect.bottom
    );
  }

  function updatePilePointer(clientX, clientY) {
    const { x, y } = pileLocalFromClient(clientX, clientY);
    if (pileHoverLastX !== null) {
      const rawDx = x - pileHoverLastX;
      const rawDy = y - pileHoverLastY;
      pileSwipeVx =
        pileSwipeVx * (1 - SWIPE_SMOOTHING) + rawDx * SWIPE_SMOOTHING;
      pileSwipeVy =
        pileSwipeVy * (1 - SWIPE_SMOOTHING) + rawDy * SWIPE_SMOOTHING;
      pileSwipeSpeed = Math.hypot(pileSwipeVx, pileSwipeVy);
    } else {
      pileSwipeVx = 0;
      pileSwipeVy = 0;
      pileSwipeSpeed = 0;
    }
    pileHoverLastX    = x;
    pileHoverLastY    = y;
    pilePointerX      = x;
    pilePointerY      = y;
    pilePointerActive = true;
  }

  /** Rows below the topmost grain in this column (0 = surface grain). */
  function columnDepthFromTop(gridW, r, c) {
    let topR = -1;
    for (let rr = 0; rr <= r; rr++) {
      if (pileGrid[rr * gridW + c] === 1) {
        topR = rr;
        break;
      }
    }
    return topR < 0 ? 0 : r - topR;
  }

  function clampLaunchVelocity(vx, vy) {
    let speed = Math.hypot(vx, vy);
    if (speed > MAX_LAUNCH_SPEED && speed > 0) {
      const scale = MAX_LAUNCH_SPEED / speed;
      vx *= scale;
      vy *= scale;
    }
    /* Arcs: dominant swipe axis stays; cross-axis is heavily damped. */
    if (Math.abs(pileSwipeVx) > Math.abs(pileSwipeVy) * 1.2) {
      vy *= ARC_CROSS_DAMP;
    } else if (Math.abs(pileSwipeVy) > Math.abs(pileSwipeVx) * 1.2) {
      vx *= ARC_CROSS_DAMP;
    }
    return { vx, vy };
  }

  function clearPilePointer() {
    pilePointerActive = false;
    pileHoverLastX    = null;
    pileHoverLastY    = null;
    pileSwipeVx       = 0;
    pileSwipeVy       = 0;
    pileSwipeSpeed    = 0;
  }

  function ejectVelocityFromSwipe(pxX, pxY, cursorX, cursorY) {
    const dx   = pxX - cursorX;
    const dy   = pxY - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx   = dist > 0 ? dx / dist : 0;
    const ny   = dist > 0 ? dy / dist : 0;
    const jitterX = (Math.random() - 0.5) * HOVER_JITTER;
    const jitterY = (Math.random() - 0.5) * HOVER_JITTER;
    return clampLaunchVelocity(
      jitterX + pileSwipeVx * HOVER_SWIPE_SCALE + nx * HOVER_BAT_IMPULSE,
      jitterY + pileSwipeVy * HOVER_SWIPE_SCALE + ny * HOVER_BAT_IMPULSE
    );
  }

  function pileSandSettleStep(gridW, gh) {
    const leftFirst = Math.random() > 0.5;
    for (let r = gh - 2; r >= 0; r--) {
      for (let c = 0; c < gridW; c++) {
        if (pileGrid[r * gridW + c] !== 1) continue;

        const below  = (r + 1) * gridW + c;
        const belowL = (r + 1) * gridW + (c - 1);
        const belowR = (r + 1) * gridW + (c + 1);

        if (pileGrid[below] === 0) {
          pileGrid[r * gridW + c] = 0;
          pileGrid[below] = 1;
        } else {
          const canL = c > 0                && pileGrid[belowL] === 0;
          const canR = c < gridW - 1        && pileGrid[belowR] === 0;
          if (canL && canR) {
            pileGrid[r * gridW + c] = 0;
            pileGrid[leftFirst ? belowL : belowR] = 1;
          } else if (canL) {
            pileGrid[r * gridW + c] = 0;
            pileGrid[belowL] = 1;
          } else if (canR) {
            pileGrid[r * gridW + c] = 0;
            pileGrid[belowR] = 1;
          }
        }
      }
    }
  }

  function handleHover(clientX, clientY) {
    if (reducedMotion || !pileGrid) return;
    updatePilePointer(clientX, clientY);

    const gridW = getGridW();
    const gh    = getGridH();
    const color = getTrailColor();
    const chanceBoost = Math.min(
      pileSwipeSpeed * HOVER_SPEED_CHANCE_K,
      HOVER_SPEED_CHANCE_MAX
    );
    const baseChance = HOVER_PROBABILITY + chanceBoost;

    for (let r = 0; r < gh; r++) {
      for (let c = 0; c < gridW; c++) {
        if (pileGrid[r * gridW + c] === 0) continue;

        const pxX = c * DOT_SIZE + DOT_SIZE / 2;
        const pxY = r * DOT_SIZE + DOT_SIZE / 2;
        const dx   = pxX - pilePointerX;
        const dy   = pxY - pilePointerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= HOVER_RADIUS) continue;

        const t = 1 - dist / HOVER_RADIUS;
        const depth = columnDepthFromTop(gridW, r, c);
        const ejectChance =
          baseChance * t * t * Math.pow(DEPTH_EJECT_BIAS, depth);

        if (Math.random() < ejectChance) {
          pileGrid[r * gridW + c] = 0;

          if (pileParticles.length < MAX_PILE_PARTICLES) {
            const vel = ejectVelocityFromSwipe(pxX, pxY, pilePointerX, pilePointerY);
            pileParticles.push({
              trueX:    pxX,
              trueY:    pxY,
              vx:       vel.vx,
              vy:       vel.vy,
              age:      0,
              lifetime: 55 + Math.floor(Math.random() * 75),
              r:        color.r,
              g:        color.g,
              b:        color.b,
            });
          }
        }
      }
    }
  }

  function onPilePointerMove(clientX, clientY) {
    if (isClientInPileBand(clientX, clientY)) {
      handleHover(clientX, clientY);
    } else {
      clearPilePointer();
    }
  }

  window.addEventListener("mousemove", (e) => {
    onPilePointerMove(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!e.touches[0]) return;
    onPilePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener("mouseleave", clearPilePointer, { passive: true });

  // ── Particle handover from trail ───────────────────────────────────────────────

  onParticleHandover = function (p) {
    if (reducedMotion) return;
    if (pileParticles.length >= MAX_PILE_PARTICLES) return;
    const rect = pileContainer.getBoundingClientRect();
    pileParticles.push({
      trueX:    p.trueX - rect.left,
      trueY:    Math.max(0, p.trueY - (rect.bottom - pileBandHeightPx)),
      vx:       p.vx,
      vy:       p.vy,
      age:      0,
      lifetime: 400,
      r:        p.r,
      g:        p.g,
      b:        p.b,
    });
  };

  // ── Animation loop ─────────────────────────────────────────────────────────────

  function drawStaticPile() {
    if (!pileGrid) return;
    const gw    = getGridW();
    const gh    = getGridH();
    const color = getTrailColor();
    for (let r = 0; r < gh; r++) {
      for (let c = 0; c < gw; c++) {
        if (pileGrid[r * gw + c] === 1) {
          const bayerVal = BAYER_8X8[(r % 8) * 8 + (c % 8)] / 64.0;
          const alpha    = 0.55 + bayerVal * 0.45;
          pileCtx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha.toFixed(3)})`;
          pileCtx.fillRect(c * DOT_SIZE, r * DOT_SIZE, DOT_SIZE, DOT_SIZE);
        }
      }
    }
  }

  function pilePhysicsStep() {
    if (!pileGrid) return;

    const currentGridW = getGridW();
    const gh           = getGridH();

    if (
      pilePointerActive &&
      pileSwipeSpeed > 0.4 &&
      (Math.abs(pileSwipeVx) > 0.08 || Math.abs(pileSwipeVy) > 0.08)
    ) {
      const kickR2 = AIR_KICK_RADIUS * AIR_KICK_RADIUS;
      for (let i = 0; i < pileParticles.length; i++) {
        const p  = pileParticles[i];
        const dx = p.trueX - pilePointerX;
        const dy = p.trueY - pilePointerY;
        if (dx * dx + dy * dy < kickR2) {
          p.vx += pileSwipeVx * AIR_KICK_SWIPE;
          p.vy += pileSwipeVy * AIR_KICK_SWIPE;
        }
      }
    }

    for (let i = pileParticles.length - 1; i >= 0; i--) {
      const p = pileParticles[i];
      p.age++;
      p.vy    += PILE_GRAVITY;
      p.vx    *= PILE_DRAG_X;
      p.trueX += p.vx;
      p.trueY += p.vy;

      const drawX = Math.round(p.trueX / DOT_SIZE) * DOT_SIZE;
      const drawY = Math.round(p.trueY / DOT_SIZE) * DOT_SIZE;
      const gridC = Math.floor(drawX / DOT_SIZE);
      const gridR = Math.floor(drawY / DOT_SIZE);

      let landed = gridR >= gh - 1;
      if (!landed && gridC >= 0 && gridC < currentGridW) {
        const checkR = Math.max(0, gridR);
        if (
          pileGrid[checkR * currentGridW + gridC] === 1 ||
          pileGrid[(checkR + 1) * currentGridW + gridC] === 1
        ) {
          landed = true;
        }
      }

      if (landed) {
        let targetR = Math.min(Math.max(0, gridR), gh - 1);
        while (targetR > 0 && pileGrid[targetR * currentGridW + gridC] === 1) targetR--;
        if (gridC >= 0 && gridC < currentGridW) pileGrid[targetR * currentGridW + gridC] = 1;
        pileParticles.splice(i, 1);
      } else if (p.age >= p.lifetime) {
        pileParticles.splice(i, 1);
      }
    }

    pileSandSettleStep(currentGridW, gh);

    pileSwipeVx    *= 0.88;
    pileSwipeVy    *= 0.88;
    pileSwipeSpeed  = Math.hypot(pileSwipeVx, pileSwipeVy);
  }

  function drawPileAirborneOnTrail() {
    const rect      = pileContainer.getBoundingClientRect();
    const canvasTop = rect.bottom - pileBandHeightPx;

    for (let i = 0; i < pileParticles.length; i++) {
      const p = pileParticles[i];
      const drawX = Math.round(p.trueX / DOT_SIZE) * DOT_SIZE;
      const drawY = Math.round(p.trueY / DOT_SIZE) * DOT_SIZE;
      const sx    = rect.left + drawX;
      const sy    = canvasTop + drawY;
      const alpha = 1 - p.age / p.lifetime;
      trailCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`;
      trailCtx.fillRect(sx, sy, DOT_SIZE, DOT_SIZE);
    }
  }

  function pileDrawSettledOnly() {
    if (!pileGrid) return;

    const w  = pileCanvas.width;
    const gw = getGridW();
    const gh = getGridH();
    pileCtx.clearRect(0, 0, w, pileBandHeightPx);

    const color = getTrailColor();

    for (let r = 0; r < gh; r++) {
      for (let c = 0; c < gw; c++) {
        if (pileGrid[r * gw + c] === 1) {
          const bayerVal = BAYER_8X8[(r % 8) * 8 + (c % 8)] / 64.0;
          const alpha    = 0.55 + bayerVal * 0.45;
          pileCtx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha.toFixed(3)})`;
          pileCtx.fillRect(c * DOT_SIZE, r * DOT_SIZE, DOT_SIZE, DOT_SIZE);
        }
      }
    }
  }

  function unifiedFrame() {
    const footerEl   = document.querySelector(".pixel-pile-footer");
    const footerRect = footerEl ? footerEl.getBoundingClientRect() : null;
    const pileBandTop = footerRect ? footerRect.bottom - pileBandHeightPx : Infinity;

    simulateTrailParticlesForFrame(footerRect, pileBandTop);
    pilePhysicsStep();

    trailCtx.clearRect(0, 0, trailW, trailH);
    drawTrailParticlesOnCanvas();
    drawPileAirborneOnTrail();
    pileDrawSettledOnly();

    requestAnimationFrame(unifiedFrame);
  }

  if (reducedMotion) {
    // Single static frame — no animation
    requestAnimationFrame(drawStaticPile);
  } else {
    requestAnimationFrame(unifiedFrame);
  }
})();
