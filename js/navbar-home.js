/**
 * Make the logo type reliably scroll to the top/intro.
 * The brand link can be a no-op when already on the page (scroll restoration),
 * so we explicitly scroll the intro section into view.
 */
(function () {
  "use strict";

  var brandTexts = document.querySelectorAll(".navbar__name, .navbar__logo-type");
  var intro = document.getElementById("intro");

  if (!brandTexts.length || !intro) return;

  function onBrandTextClick(e) {
    e.preventDefault();
    e.stopPropagation();

    try {
      history.replaceState(null, "", "#intro");
    } catch (_) {
      // Ignore history failures (e.g. file://)
    }

    intro.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  brandTexts.forEach(function (el) {
    el.addEventListener("click", onBrandTextClick);
  });
})();
