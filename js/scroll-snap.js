/*
  js/scroll-snap.js
  Soft section snapping with custom easing physics.

  How it works:
    1. After the user stops scrolling (100ms debounce), find the section
       whose centre is closest to the viewport centre.
    2. If that section is within the snap zone (±40% of viewport height
       from centre) but not already well-centred (>8px offset), animate
       to it using a custom ease-out-quart curve over 1000ms.
    3. A guard flag blocks re-triggering while the animation is running.

  Easing — ease-out-quart:
    Fast initial movement that decelerates sharply into the landing point.
    Feels snappy and intentional without the abruptness of a hard snap.

  Tuning:
    DEBOUNCE_MS   — how long after the last scroll event to wait before snapping.
    DURATION_MS   — animation duration. Higher = more dramatic deceleration.
    SNAP_ZONE     — fraction of viewport height. 0.4 = snaps when section
                    centre is within 40% of viewport height from screen centre.
    DEAD_ZONE_PX  — skip animation if already this close (avoids micro-jitter).
*/

(function () {
  'use strict';

  var DEBOUNCE_MS  = 100;
  var DURATION_MS  = 1000;
  var SNAP_ZONE    = 0.4;   /* fraction of viewport height */
  var DEAD_ZONE_PX = 8;

  var sections = Array.from(
    document.querySelectorAll('.section--intro, .section--work, .section--about')
  );

  if (!sections.length) return;

  var scrollTimer = null;
  var animId      = null;
  var isAnimating = false;

  /* ── Easing ─────────────────────────────────────────────────── */

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  /* ── Animated scroll ─────────────────────────────────────────── */

  function animateTo(targetY) {
    if (animId) cancelAnimationFrame(animId);

    var startY     = window.scrollY;
    var distance   = targetY - startY;
    var startTime  = null;

    isAnimating = true;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed  = timestamp - startTime;
      var progress = Math.min(elapsed / DURATION_MS, 1);
      var ease     = easeOutQuart(progress);

      window.scrollTo(0, startY + distance * ease);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        isAnimating = false;
        animId = null;
      }
    }

    animId = requestAnimationFrame(step);
  }

  /* ── Nearest section ─────────────────────────────────────────── */

  function findNearest() {
    var viewCentre = window.innerHeight / 2;
    var snapLimit  = window.innerHeight * SNAP_ZONE;
    var best       = null;
    var bestDist   = Infinity;

    sections.forEach(function (section) {
      var rect       = section.getBoundingClientRect();
      var secCentre  = rect.top + Math.min(rect.height, window.innerHeight) / 2;
      var dist       = Math.abs(secCentre - viewCentre);

      if (dist < bestDist) {
        bestDist = dist;
        best     = { section: section, dist: dist, rect: rect };
      }
    });

    /* Only snap when inside the snap zone and not already centred */
    if (best && best.dist > DEAD_ZONE_PX && best.dist < snapLimit) {
      return best;
    }
    return null;
  }

  /* ── Scroll listener ─────────────────────────────────────────── */

  window.addEventListener('scroll', function () {
    /* Cancel any running animation the moment the user scrolls again */
    if (isAnimating) {
      if (animId) cancelAnimationFrame(animId);
      isAnimating = false;
      animId = null;
    }

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      var nearest = findNearest();
      if (!nearest) return;

      /* Target: scroll position that centres the section in the viewport.
         For sections taller than the viewport, align the top so the user
         sees the beginning — a centred snap would hide the header area. */
      var rect      = nearest.section.getBoundingClientRect();
      var targetY;

      if (nearest.section.classList.contains('section--about') ||
          rect.height > window.innerHeight * 1.1) {
        /* Tall section: snap top into view */
        targetY = window.scrollY + rect.top;
      } else {
        /* Normal section: centre in viewport */
        targetY = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
      }

      animateTo(Math.max(0, targetY));
    }, DEBOUNCE_MS);
  }, { passive: true });

}());
