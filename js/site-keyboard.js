/**
 * Site keyboard behaviour:
 * - Skip scrolls to #main-content without moving focus (next Tab → Home).
 * - Focusing fixed header/footer chrome scrolls the page so that control is in context.
 */
(function () {
  "use strict";

  var skip = document.querySelector(".skip-link");
  var main = document.getElementById("main-content");
  var header = document.querySelector(".site-header");
  var footer = document.querySelector(".site-footer");

  if (skip && main) {
    skip.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.__lenis) {
        window.__lenis.scrollTo("#main-content");
      } else {
        main.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function scrollForChrome(target) {
    if (!target || !(target instanceof Element)) return;

    if (header && header.contains(target)) {
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      return;
    }

    if (footer && footer.contains(target)) {
      var maxY = document.documentElement.scrollHeight;
      if (window.__lenis) {
        window.__lenis.scrollTo(maxY, { immediate: true });
      } else {
        window.scrollTo({ top: maxY, left: 0, behavior: "instant" });
      }
    }
  }

  document.addEventListener(
    "focusin",
    function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest("a, button, [tabindex='0']")) return;
      scrollForChrome(t);
    },
    true
  );
})();
