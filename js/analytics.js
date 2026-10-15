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

  /* Where on the page a contact control lives, for the `location` prop */
  function contactLocation(el) {
    if (el.closest('.bottom')) return 'bottom_bar';
    if (el.closest('#thanks')) return 'thanks_section';
    return 'about_section';
  }

  /* ── Email copy ─────────────────────────────────────────────────── */

  document.querySelectorAll('.js-copy-email').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var location = contactLocation(btn);
      track('email_copy', { location: location });
    });
  });

  /* ── CV download ────────────────────────────────────────────────── */

  document.querySelectorAll('.js-feedback-download').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var location = contactLocation(btn);
      track('cv_download', { location: location });
    });
  });

  /* ── LinkedIn ───────────────────────────────────────────────────── */

  document.querySelectorAll('a[href*="linkedin.com"]').forEach(function (link) {
    link.addEventListener('click', function () {
      track('linkedin_click', { location: contactLocation(link) });
    });
  });

  /* ── Nav links ──────────────────────────────────────────────────── */

  document.querySelectorAll('.navbar a[href]').forEach(function (link) {
    link.addEventListener('click', function () {
      track('nav_click', { target: link.getAttribute('href') });
    });
  });

  /* ── Project links (About) ──────────────────────────────────────── */

  document.querySelectorAll('.about__link').forEach(function (link) {
    link.addEventListener('click', function () {
      track('project_click', {
        project: link.textContent.trim(),
        href: link.getAttribute('href'),
      });
    });
  });

  /* ── Play Pong ──────────────────────────────────────────────────── */

  var pongLink = document.querySelector('.thanks__pong-link');
  if (pongLink) {
    pongLink.addEventListener('click', function () {
      track('pong_click');
    });
  }

  /* ── Work-section hover previews ────────────────────────────────── */
  /*
    Fires when someone dwells on a [data-preview-id] element long enough for the
    preview to matter (not on every incidental mouse-over), and once per element
    per page load so a hover-jitter can't inflate the count. Keyboard focus
    counts immediately.
  */

  var DWELL_MS = 400;
  var seenPreviews = {};

  function trackPreview(el) {
    var id = el.getAttribute('data-preview-id');
    if (!id || seenPreviews[id]) return;
    seenPreviews[id] = true;
    track('preview_open', { preview: id, label: el.textContent.trim() });
  }

  document.querySelectorAll('[data-preview-id]').forEach(function (el) {
    var timer = null;

    el.addEventListener('mouseenter', function () {
      timer = setTimeout(function () { trackPreview(el); }, DWELL_MS);
    });

    el.addEventListener('mouseleave', function () {
      if (timer) { clearTimeout(timer); timer = null; }
    });

    el.addEventListener('focus', function () { trackPreview(el); });
  });

  /* ── Ticker modal ───────────────────────────────────────────────
     Driven by events from work-ticker.js. Props:
       artefact — the card's caption (stable even when headlines change)
       project  — "Company × Project" eyebrow
       via      — how it happened (click / keyboard / button / arrow / esc / backdrop) */

  var tickerViewed = 0;

  function tickerProps(item, via) {
    return {
      artefact: item.dataset.caption || '',
      project:  item.dataset.label || '',
      via:      via || '',
    };
  }

  document.addEventListener('ticker:open', function (e) {
    tickerViewed = 1;
    track('ticker_item_open', tickerProps(e.detail.item, e.detail.via));
  });

  document.addEventListener('ticker:change', function (e) {
    if (!e.detail.via) return; /* the change fired while opening — already counted */
    tickerViewed++;
    track('ticker_item_view', tickerProps(e.detail.item, e.detail.via));
  });

  document.addEventListener('ticker:close', function (e) {
    track('ticker_close', { viewed: tickerViewed, via: (e.detail && e.detail.via) || '' });
  });


  /* ── Section reach ──────────────────────────────────────────────
     Fires once per page view when a section reaches the middle of the
     viewport. Intro is skipped — every visit starts there. */

  if ('IntersectionObserver' in window) {
    var reachObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var name = entry.target.className.match(/section--([\w-]+)/);
        track('section_view', { section: name ? name[1] : entry.target.id });
        reachObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -50% 0px' });

    document.querySelectorAll('main .section:not(.section--intro)').forEach(function (el) {
      reachObserver.observe(el);
    });
  }
})();
