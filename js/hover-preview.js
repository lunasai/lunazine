/*
  js/hover-preview.js
  Hover-preview card: shows a floating image thumbnail near the cursor
  when mousing over .hover-preview-link[data-preview-id] elements.

  Approach:
    · One shared card element (containing a <picture>) is created and
      appended to <body>.
    · Position is driven by CSS custom properties --hp-x / --hp-y
      (the card uses `transform: translate(var(--hp-x), var(--hp-y))`)
      to avoid layout recalculation on every mousemove.
    · Edge detection flips the card left/up so it never clips the viewport.
    · No-ops silently on touch-only devices (hover: none media query match).
    · The responsive image manifest (assets/previews/manifest.json) is
      fetched once, eagerly, as soon as the script executes. On first hover
      the manifest is already in-flight or resolved. If a hover fires before
      the manifest resolves, it queues the show and retries on resolve.
*/

(function () {
  'use strict';

  var MANIFEST_URL     = './assets/previews/manifest.json';
  var OFFSET_X         = 20;  /* gap between cursor and card edge */
  var OFFSET_Y         = 12;
  var isCoarsePointer  = window.matchMedia('(pointer: coarse)').matches;

  /* ── Manifest ──────────────────────────────────────────────────── */

  var manifest         = null;   /* populated once fetch resolves */
  var manifestPending  = [];     /* queued show calls waiting for manifest */

  var manifestPromise = fetch(MANIFEST_URL)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      manifest = data;
      /* Flush any show calls that arrived before the manifest resolved */
      var queue = manifestPending.splice(0);
      queue.forEach(function (fn) { fn(); });
    })
    .catch(function (err) {
      console.warn('hover-preview: manifest failed to load', err);
    });

  /* ── Create shared card element ──────────────────────────────── */

  /*
    Structure:
      .hover-preview-card
        └── picture
              ├── source[type="image/avif"]
              ├── source[type="image/webp"]
              └── img  (fallback + decode target)
  */
  var card         = document.createElement('div');
  var picture      = document.createElement('picture');
  var srcAvif      = document.createElement('source');
  var srcWebp      = document.createElement('source');
  var cardImg      = document.createElement('img');

  var SIZES        = '(max-width: 480px) calc(100vw - 48px), 390px';

  srcAvif.type     = 'image/avif';
  srcAvif.sizes    = SIZES;
  srcWebp.type     = 'image/webp';
  srcWebp.sizes    = SIZES;
  cardImg.alt      = '';
  cardImg.setAttribute('aria-hidden', 'true');
  cardImg.sizes    = SIZES;

  picture.appendChild(srcAvif);
  picture.appendChild(srcWebp);
  picture.appendChild(cardImg);

  card.className = 'hover-preview-card';
  card.appendChild(picture);
  document.body.appendChild(card);

  /* ── State ──────────────────────────────────────────────────────── */

  var activeLink  = null;
  var activeId    = null;
  var rafId       = null;
  var pendingX    = 0;
  var pendingY    = 0;
  var lastX       = 0;
  var lastY       = 0;

  /* ── Position helpers ─────────────────────────────────────────── */

  function positionCard(mouseX, mouseY) {
    var vw    = window.innerWidth;
    var vh    = window.innerHeight;
    var cardW = card.offsetWidth  || 0;
    var cardH = card.offsetHeight || 0;
    var PAD   = 12;

    var x = mouseX + OFFSET_X;
    var y = mouseY + OFFSET_Y;

    if (x + cardW > vw - PAD) { x = mouseX - OFFSET_X - cardW; }
    if (y + cardH > vh - PAD) { y = mouseY - OFFSET_Y - cardH; }

    x = Math.max(PAD, Math.min(x, vw - PAD - cardW));
    y = Math.max(PAD, Math.min(y, vh - PAD - cardH));

    card.style.setProperty('--hp-x', x + 'px');
    card.style.setProperty('--hp-y', y + 'px');
  }

  /* ── Throttle position updates via rAF ───────────────────────── */

  function schedulePosition(x, y) {
    lastX    = x;
    lastY    = y;
    pendingX = x;
    pendingY = y;
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      positionCard(pendingX, pendingY);
    });
  }

  /* ── Picture population ───────────────────────────────────────── */

  function applyEntry(entry) {
    var sources = entry.sources || {};

    srcAvif.srcset = sources.avif || '';
    srcWebp.srcset = sources.webp || '';

    /* Fallback: prefer jpg, then png, then first available format */
    var fallback = sources.jpg || sources.png || sources[Object.keys(sources)[0]] || '';

    /* Set src only when it changes to avoid unnecessary decode */
    if (cardImg.getAttribute('src') !== entry.src) {
      cardImg.src    = entry.src || '';
      cardImg.srcset = fallback;
      cardImg.alt    = entry.alt || '';
    }
  }

  /* ── Event handlers ───────────────────────────────────────────── */

  function showForLink(link, clientX, clientY) {
    var id = link.getAttribute('data-preview-id');
    if (!id) return;

    /* If manifest is still loading, queue and return */
    if (!manifest) {
      manifestPending.push(function () { showForLink(link, clientX, clientY); });
      return;
    }

    var entry = manifest[id];
    if (!entry) return;

    activeLink = link;
    activeId   = id;
    lastX      = clientX;
    lastY      = clientY;

    applyEntry(entry);

    positionCard(lastX, lastY);
    card.classList.add('is-visible');

    /* Re-position once image decodes so size is known */
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
    activeId   = null;
    card.classList.remove('is-visible');
  }

  function onEnter(e) { showForLink(e.currentTarget, e.clientX, e.clientY); }
  function onMove(e)  { if (!activeLink) return; schedulePosition(e.clientX, e.clientY); }
  function onLeave()  { hide(); }

  function onTap(e) {
    var link    = e.currentTarget;
    var isTouch = e.pointerType === 'touch';

    if (isTouch) { e.preventDefault(); }

    if (activeLink === link) {
      hide();
      return;
    }

    showForLink(link, e.clientX, e.clientY);
  }

  /* ── Bind to all hover-preview links ─────────────────────────── */

  var links = document.querySelectorAll('.hover-preview-link[data-preview-id]');

  links.forEach(function (link) {
    if (!isCoarsePointer) {
      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);
    }
    link.addEventListener('pointerdown', onTap);
  });

  if (!isCoarsePointer) {
    document.addEventListener('mousemove', onMove);
  }

  /* Tap/click anywhere else closes the preview */
  document.addEventListener('pointerdown', function (e) {
    if (!activeLink) return;
    if (e.target && e.target.closest && e.target.closest('.hover-preview-link[data-preview-id]')) return;
    hide();
  }, { capture: true });

  window.addEventListener('scroll', function () {
    if (!activeLink) return;
    hide();
  }, { passive: true });

}());
