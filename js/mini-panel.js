/*
 * js/mini-panel.js
 *
 * Heatwave distortion on .mini-panel__icon-stage hover.
 * Lerp-animates feDisplacementMap[scale] from 0 → MAX on pointerenter,
 * back to 0 on pointerleave. The slow lerp factor (0.08) produces an
 * organic ease-in / ease-out that mirrors the heat-shimmer metaphor.
 *
 * Layer strategy:
 *   .mini-panel__bg (z-index: 0) — receives filter: url(#mini-panel-heatwave)
 *   .mini-panel__icon (z-index: 1) — sits above; stays undistorted.
 *
 * Dependencies:
 *   css/component-mini-panel.css
 *   #mini-panel-heatwave <filter> in the page's SVG sprite
 */

(function () {
  'use strict';

  /* Skip entirely under reduced motion — no filter animation */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var stage = document.querySelector('.mini-panel__icon-stage');
  if (!stage) return;

  var displacementMap = document.querySelector('#mini-panel-heatwave feDisplacementMap');
  if (!displacementMap) return;

  /* ── State ───────────────────────────────────────────────────────────── */

  var currentScale = 0;
  var targetScale  = 0;
  var rafId        = null;
  var MAX_SCALE    = 14;

  /* ── Animation loop ──────────────────────────────────────────────────── */

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    currentScale = lerp(currentScale, targetScale, 0.08);
    displacementMap.setAttribute('scale', currentScale.toFixed(3));

    if (Math.abs(currentScale - targetScale) > 0.04) {
      rafId = requestAnimationFrame(tick);
    } else {
      currentScale = targetScale;
      displacementMap.setAttribute('scale', currentScale);
      rafId = null;
    }
  }

  function startHeatwave() {
    targetScale = MAX_SCALE;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function stopHeatwave() {
    targetScale = 0;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  /* ── Listeners ───────────────────────────────────────────────────────── */

  stage.addEventListener('pointerenter', startHeatwave);
  stage.addEventListener('pointerleave', stopHeatwave);

}());
