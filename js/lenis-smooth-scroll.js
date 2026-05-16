/**
 * Lenis smooth scroll + GSAP ScrollTrigger sync.
 * Slower wheel feel via wheelMultiplier; native scroll-behavior stays off in CSS.
 */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof Lenis === "undefined" || !window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;

  var lenis = new Lenis({
    wheelMultiplier: 0.6,
    touchMultiplier: 1,
    lerp: 0.072,
    smoothWheel: true,
    anchors: true,
    stopInertiaOnNavigate: true,
  });

  window.__lenis = lenis;

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  requestAnimationFrame(function () {
    ScrollTrigger.refresh();
  });
}());
