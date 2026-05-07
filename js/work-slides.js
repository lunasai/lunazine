/*
  js/work-slides.js
  Work section: progress bar + slide animations.

  Scroll navigation is now handled entirely by the browser via CSS:
    html { scroll-snap-type: y mandatory }
    .section--work { scroll-snap-stop: always }

  This file's only jobs:
    1. Toggle .is-active on the slide currently in the viewport
       (drives CSS @keyframes fade-up animations).
    2. Update the progress bar fill on slide change.
    3. Fade in the about section once on first entry.
*/

(function () {
  'use strict';

  /* ── Elements ───────────────────────────────────────────────── */

  var slides       = Array.from(document.querySelectorAll('.section--work'));
  var progressFill = document.querySelector('.progress-bar__fill');

  if (!slides.length || !progressFill) return;

  var numSlides = slides.length;

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
      var slide = entry.target;
      var idx   = slides.indexOf(slide);

      slide.classList.toggle('is-active', entry.isIntersecting);

      if (entry.isIntersecting && idx >= 0) {
        progressFill.style.transform = 'scaleY(' + (idx + 1) / numSlides + ')';
      }
    });
  }, { threshold: 0.5 });

  slides.forEach(function (slide) { slideObserver.observe(slide); });

  /* ── About section: fade-up on first entry ──────────────────── */

  /*
    Opt-in pattern: .will-animate is added by JS so the section is
    fully visible without JS. .is-visible is added once by IO then
    the observer disconnects.
  */
  var aboutSection = document.querySelector('.section--about');

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
