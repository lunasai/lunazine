/*
 * js/rotating-metric.js
 *
 * Rotating metric ticker — interaction layer.
 *
 * Responsibilities:
 *   1. Bail immediately if prefers-reduced-motion: reduce
 *      (CSS already disables the animation and hides the pause button).
 *   2. Pause the ticker when it scrolls off-screen via IntersectionObserver.
 *   3. Pause/play toggle via the .rotating-metric__pause button (WCAG 2.2.2).
 *      Explicit user pause takes precedence and is not overridden by viewport events.
 *   4. Slow down the animation on hover (WAAPI updatePlaybackRate) and restore
 *      on pointer leave. Only applies when the ticker is running.
 *
 * State model:
 *   userPaused  — true when the user has toggled the button to "paused".
 *   inView      — true when the component intersects the viewport.
 *   shouldFreeze = userPaused || !inView
 *
 *   CSS class .is-frozen on .rotating-metric → animation-play-state: paused.
 *   WAAPI updatePlaybackRate() governs hover speed only when running.
 *
 * Dependencies: css/component-rotating-metric.css, modern browsers with WAAPI.
 */

(function () {
  'use strict';

  var container = document.querySelector('.rotating-metric');
  if (!container) return;

  var track = container.querySelector('.rotating-metric__track');
  var btn   = container.querySelector('.rotating-metric__pause');
  if (!track || !btn) return;

  /* Bail if user prefers reduced motion — no animation to manage. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── State ───────────────────────────────────────────────────────────── */

  var userPaused = false;
  var inView     = true; /* assume visible on init until IO fires */

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  function getAnimation() {
    return track.getAnimations()[0] || null;
  }

  /*
   * syncMotion — single source of truth for the frozen / running decision.
   * Called after any state change (viewport, user pause, or resume).
   */
  function syncMotion() {
    var shouldFreeze = userPaused || !inView;
    container.classList.toggle('is-frozen', shouldFreeze);

    /*
     * Restore playback rate to 1× whenever unfreezing so a stale hover
     * slowdown from before the pause does not persist on resume.
     */
    if (!shouldFreeze) {
      var anim = getAnimation();
      if (anim) anim.updatePlaybackRate(1.0);
    }
  }

  /* ── Off-screen pause via IntersectionObserver ───────────────────────── */

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      inView = entry.isIntersecting;
      syncMotion();
    });
  }, { threshold: 0 });

  io.observe(container);

  /* ── Pause / play button ─────────────────────────────────────────────── */

  btn.addEventListener('click', function () {
    userPaused = !userPaused;
    btn.setAttribute('aria-pressed', String(userPaused));
    btn.setAttribute('aria-label', userPaused ? 'Play metrics ticker' : 'Pause metrics ticker');
    syncMotion();
  });

  /* ── Hover: slow down when running ──────────────────────────────────────
   *
   * updatePlaybackRate() changes speed without resetting the current position,
   * so the slow-down is smooth. Rate 0.45 ≈ 70s for a 32s default loop,
   * which is comfortably readable without feeling frozen.
   *
   * Keyboard focus is intentionally excluded — no animation change on focus.
   */

  container.addEventListener('pointerenter', function () {
    if (userPaused || !inView) return;
    var anim = getAnimation();
    if (anim) anim.updatePlaybackRate(0.45);
  });

  container.addEventListener('pointerleave', function () {
    if (userPaused || !inView) return;
    var anim = getAnimation();
    if (anim) anim.updatePlaybackRate(1.0);
  });

}());
