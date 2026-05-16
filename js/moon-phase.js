/**
 * moon-phase.js
 * Computes the current lunar phase and points the navbar moon <use> at the
 * matching symbol in components/moon-sprite.html (same document).
 * Paths use fill="currentColor" → inherits .navbar__logo-mark color (neutral fg).
 * The site favicon uses PNG/ICO only — navbar moon tracks the live phase.
 * No external dependencies — uses a Julian date anchor formula.
 */
(function () {
  "use strict";

  /* Known new moon: 2000-01-06 18:14 UTC (J2000 reference) */
  var KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14));
  var SYNODIC_DAYS   = 29.53058867;

  function getLunarAge(date) {
    var elapsed = (date - KNOWN_NEW_MOON) / 86400000; /* ms → days */
    return ((elapsed % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  }

  /* Maps lunar age (0–29.53 days) to sprite symbol id and tooltip label */
  function getPhase(age) {
    if (age < 1.85)  return { symbolId: "moon-new-moon",         label: "New Moon"        };
    if (age < 7.38)  return { symbolId: "moon-waxing-crescent",  label: "Waxing Crescent" };
    if (age < 9.22)  return { symbolId: "moon-first-quarter",  label: "First Quarter"   };
    if (age < 14.77) return { symbolId: "moon-waxing-gibbous",   label: "Waxing Gibbous"  };
    if (age < 16.61) return { symbolId: "moon-full-moon",      label: "Full Moon"       };
    if (age < 22.15) return { symbolId: "moon-waning-gibbous",   label: "Waning Gibbous"  };
    if (age < 23.99) return { symbolId: "moon-third-quarter",    label: "Third Quarter"   };
    return             { symbolId: "moon-waning-crescent",  label: "Waning Crescent" };
  }

  var useEl = document.getElementById("moon-logo-use");
  if (!useEl) return;

  var phase    = getPhase(getLunarAge(new Date()));
  var fragment = "#" + phase.symbolId;

  useEl.setAttribute("href", fragment);
  /* Safari / older WebKit */
  if (typeof useEl.setAttributeNS === "function") {
    useEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", fragment);
  }

  var logoMark = document.querySelector(".navbar__logo-mark");
  if (logoMark) logoMark.dataset.tooltip = phase.label;
})();
