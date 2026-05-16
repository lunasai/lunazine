(function () {
  "use strict";

  var DEFAULT_MS = 2800;

  function feedbackDuration(el) {
    var raw = (el && el.getAttribute("data-feedback-ms")) || "";
    var n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MS;
  }

  /* Clipboard · Figma status=feedback (thumb + copied) */
  document.querySelectorAll(".js-copy-email").forEach(function (btn) {
    var email = (btn.getAttribute("data-email") || "").trim();
    var feedbackFace = btn.querySelector(".button__face--feedback");
    if (!feedbackFace) return;

    var labelEl = feedbackFace.querySelector(".button__feedback-label");
    var okLabel = labelEl ? labelEl.textContent.trim() : "copied";
    var errorLabel = btn.getAttribute("data-feedback-error") || "couldn't copy";
    var restoreTimer;

    btn.addEventListener("click", async function () {
      if (!email) return;
      window.clearTimeout(restoreTimer);

      try {
        await navigator.clipboard.writeText(email);
        if (labelEl) labelEl.textContent = okLabel;
      } catch {
        if (labelEl) labelEl.textContent = errorLabel;
      }

      btn.classList.add("is-feedback");
      restoreTimer = window.setTimeout(function () {
        btn.classList.remove("is-feedback");
        if (labelEl) labelEl.textContent = okLabel;
      }, feedbackDuration(btn));
    });
  });

  /* CV download · Figma status=feedback (thumb + downloaded) */
  document.querySelectorAll(".js-feedback-download").forEach(function (link) {
    var feedbackFace = link.querySelector(".button__face--feedback");
    if (!feedbackFace || link.tagName !== "A") return;

    var labelEl = feedbackFace.querySelector(".button__feedback-label");
    var okLabel = labelEl ? labelEl.textContent.trim() : "downloaded";
    var restoreTimer;

    link.addEventListener("click", function () {
      window.clearTimeout(restoreTimer);
      if (labelEl) labelEl.textContent = okLabel;

      link.classList.add("is-feedback");
      restoreTimer = window.setTimeout(function () {
        link.classList.remove("is-feedback");
      }, feedbackDuration(link));
    });
  });
})();
