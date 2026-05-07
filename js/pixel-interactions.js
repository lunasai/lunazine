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

  function getTrailColor() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    return isDark
      ? { r: 138, g: 171, b: 255 }   // lavender
      : { r: 85,  g: 67,  b: 228 };  // purple
  }

  // ─── Reduced-motion gate ──────────────────────────────────────────────────────

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─── Handover bridge ──────────────────────────────────────────────────────────
  // CursorDitherTrail calls this when a particle crosses into the footer rect.

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

  window.addEventListener("mousemove", (e) => {
    if (reducedMotion || !isPressed) return;
    spawnParticles(e.clientX, e.clientY);
  });

  window.addEventListener("mousedown", (e) => {
    isPressed = true;
    if (reducedMotion) return;
    spawnParticles(e.clientX, e.clientY);
  });

  window.addEventListener("mouseup", () => { isPressed = false; });

  function trailTick() {
    trailCtx.clearRect(0, 0, trailW, trailH);

    const footerEl   = document.querySelector(".pixel-pile-footer");
    const footerRect = footerEl ? footerEl.getBoundingClientRect() : null;

    for (let i = trailParticles.length - 1; i >= 0; i--) {
      const p = trailParticles[i];
      p.age++;
      p.vy     += GRAVITY;
      p.vx     *= DRAG_X;
      p.trueX  += p.vx;
      p.trueY  += p.vy;

      // Hand off to PixelPileFooter when entering footer bounds
      if (footerRect && p.trueY > footerRect.top && onParticleHandover) {
        if (p.trueX >= footerRect.left && p.trueX <= footerRect.right) {
          onParticleHandover({ trueX: p.trueX, trueY: p.trueY, vx: p.vx, vy: p.vy, r: p.r, g: p.g, b: p.b });
          trailParticles.splice(i, 1);
          continue;
        }
      }

      if (p.trueY > trailH + 20 || p.age >= p.lifetime) {
        trailParticles.splice(i, 1);
        continue;
      }

      p.x = Math.round(p.trueX / DOT_SIZE) * DOT_SIZE;
      p.y = Math.round(p.trueY / DOT_SIZE) * DOT_SIZE;

      const alpha = 1 - p.age / p.lifetime;
      trailCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`;
      trailCtx.fillRect(p.x, p.y, DOT_SIZE, DOT_SIZE);
    }

    requestAnimationFrame(trailTick);
  }

  requestAnimationFrame(trailTick);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PIXEL PILE FOOTER
  // Canvas inside .pixel-pile-footer that runs a falling-sand simulation.
  // ═══════════════════════════════════════════════════════════════════════════════

  const PILE_HEIGHT      = 600;
  const MAX_PILE_PARTICLES = 2000;
  const HOVER_RADIUS     = 40;
  const HOVER_PROBABILITY = 0.08;
  const PEAK_RATIO       = 0.03; // starting dome: barely visible bump at center

  const gridH = Math.ceil(PILE_HEIGHT / DOT_SIZE);

  const pileContainer = document.querySelector(".pixel-pile-footer");
  if (!pileContainer) return;

  const pileCanvas = document.createElement("canvas");
  Object.assign(pileCanvas.style, {
    position:      "absolute",
    bottom:        "0",
    top:           "auto",
    left:          "0",
    width:         "100%",
    height:        PILE_HEIGHT + "px",
    pointerEvents: "none",
    zIndex:        "-1",
  });
  pileContainer.insertBefore(pileCanvas, pileContainer.firstChild);

  const pileCtx = pileCanvas.getContext("2d");

  let pileGrid     = null;
  const pileParticles = [];

  // ── Grid helpers ──────────────────────────────────────────────────────────────

  function getGridW() {
    return pileGrid ? Math.round(pileGrid.length / gridH) : 0;
  }

  function initPile(gridW) {
    const grid     = new Uint8Array(gridW * gridH);
    const peakCells = Math.floor(gridH * PEAK_RATIO);

    for (let c = 0; c < gridW; c++) {
      const xNorm = (2 * c) / gridW - 1;
      const h = Math.round(peakCells * Math.sqrt(Math.max(0, 1 - xNorm * xNorm)));
      for (let r = gridH - 1; r >= gridH - h; r--) {
        grid[r * gridW + c] = 1;
      }
    }
    return grid;
  }

  function resizePile() {
    const w = Math.max(1, Math.round(pileContainer.getBoundingClientRect().width));
    pileCanvas.width  = w;
    pileCanvas.height = PILE_HEIGHT;
    pileCanvas.style.height = PILE_HEIGHT + "px";
    pileGrid = initPile(Math.ceil(w / DOT_SIZE));
  }

  resizePile();
  requestAnimationFrame(resizePile);

  const ro = new ResizeObserver(resizePile);
  ro.observe(pileContainer);
  window.addEventListener("resize", resizePile);

  // ── Hover interaction ──────────────────────────────────────────────────────────

  function handleHover(clientX, clientY) {
    if (reducedMotion || !pileGrid) return;
    const rect  = pileContainer.getBoundingClientRect();
    const x     = clientX - rect.left;
    const y     = clientY - rect.top;
    const gridW = getGridW();
    const color = getTrailColor();

    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        if (pileGrid[r * gridW + c] === 0) continue;

        const pxX = c * DOT_SIZE + DOT_SIZE / 2;
        const pxY = r * DOT_SIZE + DOT_SIZE / 2;
        const dx  = pxX - x;
        const dy  = pxY - y;

        if (dx * dx + dy * dy < HOVER_RADIUS * HOVER_RADIUS) {
          if (Math.random() < HOVER_PROBABILITY) {
            pileGrid[r * gridW + c] = 0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nx   = dist > 0 ? dx / dist : (Math.random() - 0.5);
            const ny   = dist > 0 ? dy / dist : -1;

            if (pileParticles.length < MAX_PILE_PARTICLES) {
              pileParticles.push({
                trueX:    pxX,
                trueY:    pxY,
                vx:       nx + (Math.random() - 0.5) * 2,
                vy:       ny - 1,
                age:      0,
                lifetime: 80 + Math.floor(Math.random() * 100),
                r:        color.r,
                g:        color.g,
                b:        color.b,
              });
            }
          }
        }
      }
    }
  }

  pileContainer.addEventListener("mousemove",  (e) => handleHover(e.clientX, e.clientY));
  pileContainer.addEventListener("touchmove",  (e) => {
    if (e.touches[0]) handleHover(e.touches[0].clientX, e.touches[0].clientY);
  });

  // ── Particle handover from trail ───────────────────────────────────────────────

  onParticleHandover = function (p) {
    if (reducedMotion) return;
    if (pileParticles.length >= MAX_PILE_PARTICLES) return;
    const rect = pileContainer.getBoundingClientRect();
    pileParticles.push({
      trueX:    p.trueX - rect.left,
      trueY:    Math.max(0, p.trueY - rect.top),
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
    const color = getTrailColor();
    for (let r = 0; r < gridH; r++) {
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

  function pileTick() {
    if (!pileGrid) {
      requestAnimationFrame(pileTick);
      return;
    }

    const w            = pileCanvas.width;
    const currentGridW = getGridW();
    pileCtx.clearRect(0, 0, w, PILE_HEIGHT);

    const color = getTrailColor();

    // 1. Update & draw in-flight particles
    for (let i = pileParticles.length - 1; i >= 0; i--) {
      const p = pileParticles[i];
      p.age++;
      p.vy    += GRAVITY;
      p.vx    *= DRAG_X;
      p.trueX += p.vx;
      p.trueY += p.vy;

      const drawX = Math.round(p.trueX / DOT_SIZE) * DOT_SIZE;
      const drawY = Math.round(p.trueY / DOT_SIZE) * DOT_SIZE;
      const gridC = Math.floor(drawX / DOT_SIZE);
      const gridR = Math.floor(drawY / DOT_SIZE);

      let landed = gridR >= gridH - 1;
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
        let targetR = Math.min(Math.max(0, gridR), gridH - 1);
        while (targetR > 0 && pileGrid[targetR * currentGridW + gridC] === 1) targetR--;
        if (gridC >= 0 && gridC < currentGridW) pileGrid[targetR * currentGridW + gridC] = 1;
        pileParticles.splice(i, 1);
      } else if (p.age >= p.lifetime) {
        pileParticles.splice(i, 1);
      } else {
        const alpha = 1 - p.age / p.lifetime;
        pileCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`;
        pileCtx.fillRect(drawX, drawY, DOT_SIZE, DOT_SIZE);
      }
    }

    // 2. Falling-sand simulation — cells settle downward / diagonally
    const leftFirst = Math.random() > 0.5;
    for (let r = gridH - 2; r >= 0; r--) {
      for (let c = 0; c < currentGridW; c++) {
        if (pileGrid[r * currentGridW + c] !== 1) continue;

        const below  = (r + 1) * currentGridW + c;
        const belowL = (r + 1) * currentGridW + (c - 1);
        const belowR = (r + 1) * currentGridW + (c + 1);

        if (pileGrid[below] === 0) {
          pileGrid[r * currentGridW + c] = 0;
          pileGrid[below] = 1;
        } else {
          const canL = c > 0                   && pileGrid[belowL] === 0;
          const canR = c < currentGridW - 1    && pileGrid[belowR] === 0;
          if (canL && canR) {
            pileGrid[r * currentGridW + c] = 0;
            pileGrid[leftFirst ? belowL : belowR] = 1;
          } else if (canL) {
            pileGrid[r * currentGridW + c] = 0;
            pileGrid[belowL] = 1;
          } else if (canR) {
            pileGrid[r * currentGridW + c] = 0;
            pileGrid[belowR] = 1;
          }
        }
      }
    }

    // 3. Draw settled pile with Bayer dither alpha
    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < currentGridW; c++) {
        if (pileGrid[r * currentGridW + c] === 1) {
          const bayerVal = BAYER_8X8[(r % 8) * 8 + (c % 8)] / 64.0;
          const alpha    = 0.55 + bayerVal * 0.45;
          pileCtx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha.toFixed(3)})`;
          pileCtx.fillRect(c * DOT_SIZE, r * DOT_SIZE, DOT_SIZE, DOT_SIZE);
        }
      }
    }

    requestAnimationFrame(pileTick);
  }

  if (reducedMotion) {
    // Single static frame — no animation
    requestAnimationFrame(drawStaticPile);
  } else {
    requestAnimationFrame(pileTick);
  }
})();
