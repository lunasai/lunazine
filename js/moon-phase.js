/**
 * moon-phase.js
 * Computes the current lunar phase and points the navbar moon <use> at the
 * matching symbol (moon icons live in index.html’s main svg-symbol-sprite;
 * paths are synced from assets/moon-icon via npm run sync:moon).
 *
 * Uses illumination geometry from SunCalc (MIT © Vladimir Agafonkin) —
 * moon position per http://aa.quae.nl/en/reken/hemelpositie.html ,
 * illumination per NASA IDL / Meeus Astronomical Algorithms Ch. 48.
 * This tracks real elongation + limb angle instead of a single drifting
 * synodic anchor (which skewed icons vs almanacs).
 */
(function () {
  "use strict";

  var PI = Math.PI;
  var sin = Math.sin;
  var cos = Math.cos;
  var tan = Math.tan;
  var atan2 = Math.atan2;
  var asin = Math.asin;
  var acos = Math.acos;
  var rad = PI / 180;

  var e = rad * 23.4397; /* obliquity of Earth */

  var dayMs = 86400000;
  var J1970 = 2440588;
  var J2000 = 2451545;

  function toJulian(date) {
    return date.valueOf() / dayMs - 0.5 + J1970;
  }

  function toDays(date) {
    return toJulian(date) - J2000;
  }

  function rightAscension(l, b) {
    return atan2(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
  }

  function declination(l, b) {
    return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
  }

  function solarMeanAnomaly(d) {
    return rad * (357.5291 + 0.98560028 * d);
  }

  function eclipticLongitude(M) {
    var C =
      rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M));
    var P = rad * 102.9372;
    return M + C + P + PI;
  }

  function sunCoords(d) {
    var M = solarMeanAnomaly(d);
    var L = eclipticLongitude(M);
    return {
      dec: declination(L, 0),
      ra:  rightAscension(L, 0),
    };
  }

  function moonCoords(d) {
    var L = rad * (218.316 + 13.176396 * d);
    var M = rad * (134.963 + 13.064993 * d);
    var F = rad * (93.272 + 13.229350 * d);
    var l = L + rad * 6.289 * sin(M);
    var b = rad * 5.128 * sin(F);
    var dist = 385001 - 20905 * cos(M);
    return {
      ra:   rightAscension(l, b),
      dec:  declination(l, b),
      dist: dist,
    };
  }

  /**
   * @returns {{ fraction: number, angle: number }}
   * fraction 0…1 ≈ illuminated fraction of lunar disk.
   * angle < 0 ⇒ waxing (evening crescent grows); angle ≥ 0 ⇒ waning.
   */
  function getMoonIllumination(date) {
    var d = toDays(date);
    var s = sunCoords(d);
    var m = moonCoords(d);
    var sdist = 149598000;

    var cosPhi =
      sin(s.dec) * sin(m.dec) +
      cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra);
    var phi = acos(Math.min(1, Math.max(-1, cosPhi)));

    var inc = atan2(sdist * sin(phi), m.dist - sdist * cos(phi));
    var angle = atan2(
      cos(s.dec) * sin(s.ra - m.ra),
      sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra)
    );

    return {
      fraction: (1 + cos(inc)) / 2,
      angle:    angle,
    };
  }

  /* Named icons + tooltip (thresholds on illuminated fraction) */
  function getPhaseFromIllumination(ill) {
    var f = ill.fraction;
    var waxing = ill.angle < 0;

    /* Near new: both limbs ~invisible */
    if (f < 0.02) {
      return { symbolId: "moon-new-moon", label: "New Moon" };
    }
    if (f >= 0.98) {
      return { symbolId: "moon-full-moon", label: "Full Moon" };
    }

    if (waxing) {
      if (f < 0.45) {
        return { symbolId: "moon-waxing-crescent", label: "Waxing Crescent" };
      }
      if (f < 0.55) {
        return { symbolId: "moon-first-quarter", label: "First Quarter" };
      }
      return { symbolId: "moon-waxing-gibbous", label: "Waxing Gibbous" };
    }

    if (f < 0.45) {
      return { symbolId: "moon-waning-crescent", label: "Waning Crescent" };
    }
    if (f < 0.55) {
      return { symbolId: "moon-third-quarter", label: "Third Quarter" };
    }
    return { symbolId: "moon-waning-gibbous", label: "Waning Gibbous" };
  }

  var useEl = document.getElementById("moon-logo-use");
  if (!useEl) return;

  var phase = getPhaseFromIllumination(getMoonIllumination(new Date()));
  var fragment = "#" + phase.symbolId;

  useEl.setAttribute("href", fragment);
  if (typeof useEl.setAttributeNS === "function") {
    useEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", fragment);
  }

  var logoMark = document.querySelector(".navbar__logo-mark");
  if (logoMark) logoMark.dataset.tooltip = phase.label;
})();
