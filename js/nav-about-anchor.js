/**
 * On stacked feedback + about (≤1024px), the nav "about" link should land on
 * #feedback — the top of the duo block — not midway into the about section.
 */
(function () {
  "use strict";

  var MQ = window.matchMedia("(max-width: 1024px)");
  var aboutLinks = document.querySelectorAll('a[href="#about"]');

  if (!aboutLinks.length) return;

  aboutLinks.forEach(function (link) {
    link.dataset.aboutNav = "true";
  });

  function syncAboutHref() {
    document.querySelectorAll("[data-about-nav]").forEach(function (link) {
      link.setAttribute("href", MQ.matches ? "#feedback" : "#about");
    });
  }

  function scrollToFeedback(immediate) {
    var feedback = document.getElementById("feedback");
    if (!feedback) return;

    if (window.__lenis) {
      window.__lenis.scrollTo("#feedback", immediate ? { immediate: true } : undefined);
    } else {
      feedback.scrollIntoView({
        behavior: immediate ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  function correctAboutHashOnLoad() {
    if (!MQ.matches || window.location.hash !== "#about") return;
    scrollToFeedback(true);
  }

  syncAboutHref();
  MQ.addEventListener("change", syncAboutHref);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", correctAboutHashOnLoad);
  } else {
    correctAboutHashOnLoad();
  }
}());
