/**
 * Thanks ASCII cat — motion in view only; eye blinks every 15s.
 * Blinks 2s after the section enters view, then every 15s.
 */

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var cat = document.querySelector(".thanks__cat");
  var eye = cat && cat.querySelector(".thanks__cat-eye");
  var section = document.getElementById("thanks");
  if (!cat || !eye || !section) return;

  var BLINK_INITIAL_DELAY_MS = 2000;
  var BLINK_INTERVAL_MS = 15000;
  var blinkTimer = null;

  function clearBlinkTimer() {
    if (blinkTimer !== null) {
      window.clearTimeout(blinkTimer);
      blinkTimer = null;
    }
  }

  function triggerBlink() {
    if (!cat.classList.contains("is-in-view")) return;

    eye.classList.remove("is-blinking");
    void eye.offsetWidth;
    eye.classList.add("is-blinking");
  }

  function scheduleBlink(delayMs) {
    clearBlinkTimer();
    if (!cat.classList.contains("is-in-view")) return;

    blinkTimer = window.setTimeout(function () {
      blinkTimer = null;
      triggerBlink();
    }, delayMs);
  }

  eye.addEventListener("animationend", function (event) {
    if (event.animationName !== "thanks-cat-eye-blink") return;
    eye.classList.remove("is-blinking");
    scheduleBlink(BLINK_INTERVAL_MS);
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        cat.classList.toggle("is-in-view", entry.isIntersecting);
        if (entry.isIntersecting) {
          scheduleBlink(BLINK_INITIAL_DELAY_MS);
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
