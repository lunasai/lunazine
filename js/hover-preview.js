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

  /* ── Bail out on touch / coarse-pointer devices ───────────────── */

  if (
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  ) return;

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

  /* ── Position helpers ─────────────────────────────────────────── */

  function positionCard(mouseX, mouseY) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var rect = card.getBoundingClientRect();
    var cardW = rect.width || 0;
    var cardH = rect.height || 0;
    var PAD = 8;

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
    pendingX = x;
    pendingY = y;
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      positionCard(pendingX, pendingY);
    });
  }

  /* ── Event handlers ───────────────────────────────────────────── */

  function onEnter(e) {
    var link = e.currentTarget;
    var src  = link.getAttribute('data-preview');
    if (!src) return;

    activeLink = link;

    /* Swap image source only when it changes */
    if (cardImg.getAttribute('src') !== src) {
      cardImg.src = src;
    }

    positionCard(e.clientX, e.clientY);
    card.classList.add('is-visible');
  }

  function onMove(e) {
    if (!activeLink) return;
    schedulePosition(e.clientX, e.clientY);
  }

  function onLeave() {
    activeLink = null;
    card.classList.remove('is-visible');
  }

  /* ── Bind to all hover-preview links ─────────────────────────── */

  var links = document.querySelectorAll('.hover-preview-link[data-preview]');

  links.forEach(function (link) {
    link.addEventListener('mouseenter', onEnter);
    link.addEventListener('mouseleave', onLeave);
  });

  /*
    mousemove is on document so the card tracks even when the cursor
    moves faster than the link boundary fires.
  */
  document.addEventListener('mousemove', onMove);

}());
