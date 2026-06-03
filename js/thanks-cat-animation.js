/**
 * Thanks ASCII cat — motion in view only; eye blinks every 30s.
 */

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var cat = document.querySelector(".thanks__cat");
  var eye = cat && cat.querySelector(".thanks__cat-eye");
  var section = document.getElementById("thanks");
  if (!cat || !eye || !section) return;

  var BLINK_INTERVAL_MS = 30000;
  var blinkTimer = null;

  function clearBlinkTimer() {
    if (blinkTimer !== null) {
      window.clearTimeout(blinkTimer);
      blinkTimer = null;
    }
  }

  function scheduleBlink() {
    clearBlinkTimer();
    if (!cat.classList.contains("is-in-view")) return;

    blinkTimer = window.setTimeout(function () {
      blinkTimer = null;
      if (!cat.classList.contains("is-in-view")) return;

      eye.classList.remove("is-blinking");
      void eye.offsetWidth;
      eye.classList.add("is-blinking");
    }, BLINK_INTERVAL_MS);
  }

  eye.addEventListener("animationend", function (event) {
    if (event.animationName !== "thanks-cat-eye-blink") return;
    eye.classList.remove("is-blinking");
    scheduleBlink();
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        cat.classList.toggle("is-in-view", entry.isIntersecting);
        if (entry.isIntersecting) {
          scheduleBlink();
        } else {
          clearBlinkTimer();
          eye.classList.remove("is-blinking");
        }
      });
    },
    { threshold: 0.12 }
  );

  observer.observe(section);
})();
