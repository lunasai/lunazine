(function () {
  "use strict";

  var work = document.getElementById("work");
  var experience = document.getElementById("experience");

  if (!work || !experience) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: work,
    pin: true,
    start: "bottom bottom",
    endTrigger: experience,
    end: "top top",
    pinSpacing: false,
    invalidateOnRefresh: true
  });
}());
