/*
  js/work-slides.js
  Unified scroll-reveal for work, feedback, and about.

  Pattern (applied to work, feedback, and about):
    1. JS adds will-animate to each container (opt-in: content fully
       readable without JS).
    2. A single IntersectionObserver adds in-view to each animated
       element when it crosses the threshold, then unobserves it.
    3. CSS keyframes + animation-fill-mode:both keep opacity:1 forever.
    4. Under prefers-reduced-motion, in-view is applied immediately to
       all targets — no animation runs, nothing stays hidden.

  Intro is CSS-only (fires on page load) and is not touched here.
*/

(function () {
  'use strict';

  /* ── Scroll reveal ──────────────────────────────────────────────
     Each entry declares a container selector and the child elements
     to observe inside it. Sections not present in the DOM are
     silently skipped.

     Threshold 0.2: reveal when 20% of the element is in view.
     rootMargin bottom -5%: small buffer so elements don't pop in
     right at the very edge of the viewport.
  */
  var revealSections = [
    {
      container: '#work',
      items: '.work__title, .work__projects .work__body p, .work__projects .work__metrics'
    },
    {
      container: '.section--feedback',
      items: '.feedback__title'
    },
    {
      container: '.section--about',
      items: '.about__tagline, .about__label, .about__body p, .about__cta'
    }
  ];

  var allRevealItems = [];

  revealSections.forEach(function (def) {
    var el = document.querySelector(def.container);
    if (!el) return;
    el.classList.add('will-animate');
    var items = Array.from(el.querySelectorAll(def.items));
    allRevealItems = allRevealItems.concat(items);
  });

  if (!allRevealItems.length) return;

  /* Reduced motion: reveal everything immediately, skip observer */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    allRevealItems.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });

  allRevealItems.forEach(function (el) { revealObserver.observe(el); });

}());
