/*
  js/hover-preview.js
  Hover-preview card: shows a floating image thumbnail near the cursor
  when mousing over .hover-preview-link[data-preview] elements.

  Approach:
    · One shared card element is created and appended to <body>.
    · Position is driven by CSS custom properties --hp-x / --hp-y
      (the card uses `transform: translate(var(--hp-x), var(--hp-y))`)
      to avoid layout recalculation on every mousemove.
    · Edge detection flips the card left/up so it never clips the viewport.
    · No-ops silently on touch-only devices (hover: none media query match).
*/

(function () {
  'use strict';

  var isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ── Positioning offsets ─────────────────────────────────────── */

  var OFFSET_X  = 20;  /* gap between cursor and card edge */
  var OFFSET_Y  = 12;

  /* ── Create shared card element ───────────────────────────────── */

  var card    = document.createElement('div');
  var cardImg = document.createElement('img');

  card.className = 'hover-preview-card';
  cardImg.alt    = '';
  cardImg.setAttribute('aria-hidden', 'true');
  card.appendChild(cardImg);
  document.body.appendChild(card);

  /* ── State ─────────────────────────────────────────────────────── */

  var activeLink   = null;
  var rafId        = null;
  var pendingX     = 0;
  var pendingY     = 0;
  var lastX        = 0;
  var lastY        = 0;

  /* ── Position helpers ─────────────────────────────────────────── */

  function positionCard(mouseX, mouseY) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    /*
      Use layout size (offsetWidth/offsetHeight) so we don't get tripped
      up by the entry transform (scale/rotate) which affects getBoundingClientRect().
    */
    var cardW = card.offsetWidth || 0;
    var cardH = card.offsetHeight || 0;
    var PAD = 12;

    /* Default: card appears to the right and slightly below cursor */
    var x = mouseX + OFFSET_X;
    var y = mouseY + OFFSET_Y;

    /* Flip horizontal if card would overflow right edge */
    if (x + cardW > vw - PAD) {
      x = mouseX - OFFSET_X - cardW;
    }

    /* Flip vertical if card would overflow bottom */
    if (y + cardH > vh - PAD) {
      y = mouseY - OFFSET_Y - cardH;
    }

    /* Clamp (prevents offscreen on narrow viewports) */
    x = Math.max(PAD, Math.min(x, vw - PAD - cardW));
    y = Math.max(PAD, Math.min(y, vh - PAD - cardH));

    card.style.setProperty('--hp-x', x + 'px');
    card.style.setProperty('--hp-y', y + 'px');
  }

  /* ── Throttle position updates via rAF ───────────────────────── */

  function schedulePosition(x, y) {
    lastX = x;
    lastY = y;
    pendingX = x;
    pendingY = y;
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      positionCard(pendingX, pendingY);
    });
  }

  /* ── Event handlers ───────────────────────────────────────────── */

  function showForLink(link, clientX, clientY) {
    var src = link.getAttribute('data-preview');
    if (!src) return;

    activeLink = link;
    lastX = clientX;
    lastY = clientY;

    /* Swap image source only when it changes */
    if (cardImg.getAttribute('src') !== src) {
      cardImg.src = src;
    }

    /*
      Position immediately, then re-position once the image loads/decodes
      (important for large PNG/JPEGs so the card doesn't clip).
    */
    positionCard(lastX, lastY);
    card.classList.add('is-visible');
    requestAnimationFrame(function () {
      if (!activeLink) return;
      positionCard(lastX, lastY);
    });

    if (typeof cardImg.decode === 'function') {
      cardImg.decode().catch(function () {}).then(function () {
        if (!activeLink) return;
        positionCard(lastX, lastY);
      });
    } else {
      cardImg.onload = function () {
        if (!activeLink) return;
        positionCard(lastX, lastY);
      };
    }
  }

  function hide() {
    activeLink = null;
    card.classList.remove('is-visible');
  }

  function onEnter(e) {
    var link = e.currentTarget;
    showForLink(link, e.clientX, e.clientY);
  }

  function onMove(e) {
    if (!activeLink) return;
    schedulePosition(e.clientX, e.clientY);
  }

  function onLeave() {
    hide();
  }

  function onTap(e) {
    var link = e.currentTarget;
    var isTouch = e.pointerType === 'touch';

    if (isTouch) {
      /*
        Prevent text selection / double-tap zoom quirks on iOS while
        still allowing scroll (we only prevent default on the target).
      */
      e.preventDefault();
    }

    if (activeLink === link) {
      hide();
      return;
    }

    showForLink(link, e.clientX, e.clientY);
  }

  /* ── Bind to all hover-preview links ─────────────────────────── */

  var links = document.querySelectorAll('.hover-preview-link[data-preview]');

  links.forEach(function (link) {
    if (!isCoarsePointer) {
      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);
    }
    link.addEventListener('pointerdown', onTap);
  });

  /*
    mousemove is on document so the card tracks even when the cursor
    moves faster than the link boundary fires.
  */
  if (!isCoarsePointer) {
    document.addEventListener('mousemove', onMove);
  }

  /* Tap/click anywhere else closes the preview */
  document.addEventListener('pointerdown', function (e) {
    if (!activeLink) return;
    if (e.target && e.target.closest && e.target.closest('.hover-preview-link[data-preview]')) return;
    hide();
  }, { capture: true });

  /* Scrolling should close it on mobile to avoid awkward overlays */
  window.addEventListener('scroll', function () {
    if (!activeLink) return;
    hide();
  }, { passive: true });

}());
