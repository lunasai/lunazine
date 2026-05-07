/**
 * moon-phase.js
 * Computes the current lunar phase and updates the navbar logo mark
 * (#moon-logo) to the matching SVG icon from assets/moon-icon/.
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

  /* Maps lunar age (0–29.53 days) to SVG filename and display label */
  function getPhase(age) {
    if (age < 1.85)  return { file: "new moon.svg",        label: "New Moon"        };
    if (age < 7.38)  return { file: "waxing crescent.svg", label: "Waxing Crescent" };
    if (age < 9.22)  return { file: "first quarter.svg",   label: "First Quarter"   };
    if (age < 14.77) return { file: "waxing gibbous.svg",  label: "Waxing Gibbous"  };
    if (age < 16.61) return { file: "full moon.svg",       label: "Full Moon"       };
    if (age < 22.15) return { file: "waning gibbous.svg",  label: "Waning Gibbous"  };
    if (age < 23.99) return { file: "third quarter.svg",   label: "Third Quarter"   };
    return             { file: "waning crescent.svg",  label: "Waning Crescent" };
  }

  var img = document.getElementById("moon-logo");
  if (!img) return;

  var phase     = getPhase(getLunarAge(new Date()));
  var logoMark  = img.parentElement;

  img.src = "./assets/moon-icon/" + encodeURIComponent(phase.file);

  if (logoMark) logoMark.dataset.tooltip = phase.label;
})();
