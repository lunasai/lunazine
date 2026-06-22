/*
  js/analytics.js
  Custom Umami event tracking for lunazine.
  Depends on: Umami script loaded before this file runs.
*/

(function () {
  'use strict';

  function track(event, data) {
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track(event, data);
    }
  }

  /* ── Email copy ─────────────────────────────────────────────────── */

  document.querySelectorAll('.js-copy-email').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var location = btn.closest('.bottom') ? 'bottom_bar' : 'about_section';
      track('email_copy', { location: location });
    });
  });

  /* ── CV download ────────────────────────────────────────────────── */

  document.querySelectorAll('.js-feedback-download').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var location = btn.closest('.bottom') ? 'bottom_bar' : 'about_section';
      track('cv_download', { location: location });
    });
  });

  /* ── LinkedIn ───────────────────────────────────────────────────── */

  var linkedin = document.querySelector('a[href*="linkedin.com"]');
  if (linkedin) {
    linkedin.addEventListener('click', function () {
      track('linkedin_click');
    });
  }

  /* ── Nav links ──────────────────────────────────────────────────── */

  document.querySelectorAll('.navbar a[href]').forEach(function (link) {
    link.addEventListener('click', function () {
      track('nav_click', { target: link.getAttribute('href') });
    });
  });

  /* ── Play Pong ──────────────────────────────────────────────────── */

  var pongLink = document.querySelector('.thanks__pong-link');
  if (pongLink) {
    pongLink.addEventListener('click', function () {
      track('pong_click');
    });
  }

  /* ── Ticker modal open ──────────────────────────────────────────── */

  var tickerModal = document.querySelector('.ticker-modal');
  if (tickerModal) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.attributeName === 'class') {
          var isOpen = tickerModal.classList.contains('is-open');
          if (isOpen) {
            var label = tickerModal.querySelector('.ticker-modal__label');
            var title = tickerModal.querySelector('.ticker-modal__title');
            track('ticker_item_open', {
              label: label ? label.textContent.trim() : '',
              title: title ? title.textContent.trim() : '',
            });
          }
        }
      });
    });
    observer.observe(tickerModal, { attributes: true });
  }

})();
