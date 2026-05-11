/*
  js/work-slides.js
  Work section: progress bar + slide animations.

  Scroll navigation is now handled entirely by the browser via CSS:
    html { scroll-snap-type: y mandatory }
    .section--work { scroll-snap-stop: always }

  This file's only jobs:
    1. Toggle .is-active on the slide currently in the viewport
       (drives CSS @keyframes fade-up animations).
    2. Update the progress bar continuously from raw scroll position
       so the fill is proportional to how far down the full page
       you are — reaching 100% only at the very bottom.
    3. Fade in the about section once on first entry.
*/

(function () {
  'use strict';

  /* ── Elements ───────────────────────────────────────────────── */

  var slides       = Array.from(document.querySelectorAll('.section--work'));
  var aboutSection = document.querySelector('.section--about');
  var progressFill = document.querySelector('.progress-bar__fill');

  if (!slides.length || !progressFill) return;

  /* ── Progress bar: continuous scroll position ───────────────────
     Reads scrollY / (scrollHeight - innerHeight) on every scroll
     event via rAF so the fill tracks actual page position rather
     than discrete section steps.
  */
  var rafId = null;

  function updateProgress() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var ratio     = maxScroll > 0 ? scrollTop / maxScroll : 0;
    progressFill.style.transform = 'scaleY(' + ratio + ')';
    rafId = null;
  }

  window.addEventListener('scroll', function () {
    if (!rafId) rafId = requestAnimationFrame(updateProgress);
  }, { passive: true });

  /* Seed the bar on load (e.g. back-navigation restores scroll position) */
  updateProgress();

  /* ── Slide visibility: IntersectionObserver ─────────────────── */

  /*
    threshold: 0.5 — a slide is "active" when more than half of it
    is in the viewport. With scroll-snap this aligns cleanly with
    the snap position.

    is-active is toggled (added on entry, removed on exit) so the
    CSS @keyframes animation re-fires each time the slide enters.
  */
  var slideObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('is-active', entry.isIntersecting);
    });
  }, { threshold: 0.3 });

  slides.forEach(function (slide) { slideObserver.observe(slide); });

  /* ── About section: fade-up on first entry ──────────────────── */

  /*
    Opt-in pattern: .will-animate is added by JS so the section is
    fully visible without JS. .is-visible is added once by IO then
    the observer disconnects.
  */
  if (aboutSection) {
    aboutSection.classList.add('will-animate');

    var aboutObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        aboutSection.classList.add('is-visible');
        aboutObserver.disconnect();
      }
    }, { threshold: 0.12 });

    aboutObserver.observe(aboutSection);
  }

}());
