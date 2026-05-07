(function () {
  "use strict";

  /*
   * Handles all .js-copy-email buttons with two behaviours:
   *
   * 1. Inline swap  — button has data-copied-text="…"
   *    The button's own text changes to that value, then reverts after 2.8 s.
   *    Used by the footer "contact me" button.
   *
   * 2. External feedback — no data-copied-text
   *    Confirmation is written to the nearest .about__copy-feedback element.
   *    Used by the about-section button.
   */
  document.querySelectorAll(".js-copy-email").forEach(function (btn) {
    var email      = (btn.getAttribute("data-email") || "").trim();
    var copiedText = btn.getAttribute("data-copied-text");
    var originalText = btn.textContent.trim();
    var statusEl   = copiedText ? null : document.querySelector(".about__copy-feedback");
    var hideTimer;

    btn.addEventListener("click", async function () {
      if (!email) return;
      clearTimeout(hideTimer);

      try {
        await navigator.clipboard.writeText(email);
        if (copiedText !== null) {
          btn.textContent = copiedText;
        } else if (statusEl) {
          statusEl.textContent = "Copied to your clipboard.";
        }
      } catch {
        if (copiedText !== null) {
          btn.textContent = "could not copy";
        } else if (statusEl) {
          statusEl.textContent = "Could not copy — select the address above.";
        }
      }

      hideTimer = window.setTimeout(function () {
        if (copiedText !== null) {
          btn.textContent = originalText;
        } else if (statusEl) {
          statusEl.textContent = "";
        }
      }, 2800);
    });
  });
})();
