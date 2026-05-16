(function () {
  "use strict";

  /**
   * Counter-scroll factor: 1 = fully fixed dither in viewport; lower = more parallax drift.
   * Keep in sync with `EXPERIENCE_DITHER_PARALLAX_FACTOR` in `src/experience-panel-dither.jsx`
   * (dither canvas overscan uses this for vertical bleed).
   */
  var PARALLAX_FACTOR = 0.9;

  var experience = document.getElementById("experience");

  if (!experience) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  function readViewportHeight() {
    var vv = window.visualViewport;
    return Math.max(1, Math.floor(vv ? vv.height : window.innerHeight));
  }

  function initParallax(frame) {
    if (frame.getAttribute("data-parallax-init") === "1") return;
    frame.setAttribute("data-parallax-init", "1");

    gsap.fromTo(
      frame,
      {
        xPercent: -50,
        yPercent: -50,
        y: function () {
          return readViewportHeight() * PARALLAX_FACTOR;
        },
      },
      {
        xPercent: -50,
        yPercent: -50,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: experience,
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      }
    );
  }

  function tryInit() {
    var frame = document.querySelector(".experience-panel-dither__viewport-frame");
    if (frame) {
      initParallax(frame);
      return;
    }

    var root = document.getElementById("experience-panel-dither-root");
    if (!root) return;

    var obs = new MutationObserver(function () {
      var f = document.querySelector(".experience-panel-dither__viewport-frame");
      if (f) {
        obs.disconnect();
        initParallax(f);
      }
    });
    obs.observe(root, { childList: true, subtree: true });
  }

  tryInit();
}());
