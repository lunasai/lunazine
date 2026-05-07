/**
 * bottom-clock.js
 * Ticks the .bottom__time element in real Amsterdam time.
 * Colons are wrapped in .bottom__time-sep spans so CSS can apply
 * the retro step-blink animation independently of the digits.
 */
(function () {
  "use strict";

  var timeEl = document.querySelector(".bottom__time");
  if (!timeEl) return;

  var fmt = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    var parts = fmt.formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });

    var h = map.hour   || "00";
    var m = map.minute || "00";
    var s = map.second || "00";

    /* keep datetime attribute in sync for semantics */
    timeEl.setAttribute("datetime", h + ":" + m + ":" + s);

    /* colons in aria-hidden spans so screen readers read "22 00 00 AMS" cleanly */
    timeEl.innerHTML =
      h +
      '<span class="bottom__time-sep" aria-hidden="true">:</span>' +
      m +
      '<span class="bottom__time-sep" aria-hidden="true">:</span>' +
      s +
      "\u00a0AMS"; /* non-breaking space before timezone label */
  }

  tick();
  setInterval(tick, 1000);
})();
