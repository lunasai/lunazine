/*
  js/hover-preview.js
  Hover-preview card: shows a floating image thumbnail near the cursor
  when mousing or focusing elements with a `data-preview-id` attribute
  (typically `.hover-preview-link`, and `.intro__name` in the hero).

  Approach:
    · One shared card element (containing a <picture>) is created and
      appended to <body>.
    · Position is driven by CSS custom properties --hp-x / --hp-y
      (the card uses `transform: translate(var(--hp-x), var(--hp-y))`)
      to avoid layout recalculation on every mousemove.
    · Edge detection flips the card left/up so it never clips the viewport.
    · Keyboard: Tab to a link (:focus-visible) opens the card anchored under
      the phrase; mousemove is ignored until hover/pointer re‑enters the link.
    · Touch (coarse pointer): tap toggles preview; one-time hint when #work
      scrolls into view (sessionStorage).
    · The responsive image manifest (assets/previews/manifest.json) is
      fetched once, eagerly, as soon as the script executes.
*/

(function () {
  'use strict';

  var MANIFEST_URL       = './assets/previews/manifest.json';
  var OFFSET_X           = 20; /* gap between cursor / anchor and card edge */
  var OFFSET_Y           = 12;
  var SESSION_TOUCH_HINT = 'luna_hp_touch_hint';
  var TOUCH_HINT_MS      = 14000;

  var isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ── Manifest ──────────────────────────────────────────────────── */

  var manifest        = null;
  var manifestPending = [];

  /* ── Inline thumbnail parallax (mouse + scroll) ──────────────────
     After the manifest resolves, inject a <img> wrapped in a <span>
     as a sibling immediately after every [data-preview-id] element.
     Red monotone is applied via CSS (component-hover-preview.css).

     Two additive contributions per frame:
       Mouse  — lateral X+Y drift relative to #work section centre.
       Scroll — vertical Y drift as the link moves through the viewport
                (link at centre → 0; at top/bottom edge → ±SCROLL_MAX).

     Each thumbnail has its own depth (0.6–1.4) so all five move at
     slightly different rates — the stereo offset reads as physical depth.
     Motion is lerped (factor 0.04) for a smooth, organic feel.
     No idle bob — inline elements bobbing reads as a bug.
     Entirely disabled under prefers-reduced-motion.
  ─────────────────────────────────────────────────────────────────── */

  var THUMB_PARALLAX_MOUSE  = 4; /* max mouse drift px at depth 1 (X + Y) */
  var THUMB_PARALLAX_SCROLL = 6; /* max scroll drift px at depth 1 (Y only) */
  var THUMB_LERP            = 0.04; /* lerp factor — responsive but soft */

  /** @type {Array<{ el, wrap, depth, currentX, currentY }>} */
  var thumbPairs       = [];
  var thumbMotionRafId = null;
  var thumbWorkVisible = false;
  var thumbWorkSection = null;
  var thumbNormMouseX  = 0;
  var thumbNormMouseY  = 0;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Stable −1…1 value derived from id + seed suffix. */
  function stableFromId(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) {
      h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    }
    return (h % 201 - 100) / 100;
  }

  /** Depth 0.6–1.4 — each thumb drifts at a different rate for stereo parallax. */
  function depthFromId(id) {
    return 0.6 + (stableFromId(id + ':d') + 1) / 2 * 0.8;
  }

  /* Pointer tracker — normalised to #work section centre (roughly −1…1). */
  function onThumbPointerMove(e) {
    if (!thumbWorkSection) return;
    var rect    = thumbWorkSection.getBoundingClientRect();
    var hw      = rect.width  / 2;
    var hh      = rect.height / 2;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    thumbNormMouseX = hw > 0 ? (clientX - (rect.left + hw)) / hw : 0;
    thumbNormMouseY = hh > 0 ? (clientY - (rect.top  + hh)) / hh : 0;
  }

  /* Continuous lerp loop — only alive when #work is in the viewport. */
  function runThumbLoop() {
    if (!thumbWorkVisible || prefersReducedMotion) { thumbMotionRafId = null; return; }

    thumbMotionRafId = requestAnimationFrame(function () {
      if (!thumbWorkVisible || prefersReducedMotion) { thumbMotionRafId = null; return; }

      var vh = window.innerHeight;

      thumbPairs.forEach(function (pair) {
        /* Scroll: normalised distance of link centre from viewport centre (-1…1) */
        var elRect     = pair.el.getBoundingClientRect();
        var scrollNorm = Math.max(-1, Math.min(1,
          (elRect.top + elRect.height / 2 - vh / 2) / (vh / 2)
        ));

        var tx = thumbNormMouseX * pair.depth * THUMB_PARALLAX_MOUSE;
        var ty = (thumbNormMouseY * pair.depth * THUMB_PARALLAX_MOUSE)
               + (scrollNorm      * pair.depth * THUMB_PARALLAX_SCROLL);

        pair.currentX += (tx - pair.currentX) * THUMB_LERP;
        pair.currentY += (ty - pair.currentY) * THUMB_LERP;
        pair.wrap.style.transform =
          'translate3d(' + pair.currentX.toFixed(2) + 'px,' + pair.currentY.toFixed(2) + 'px,0)';
      });

      runThumbLoop();
    });
  }

  function startThumbLoop() {
    if (thumbMotionRafId || prefersReducedMotion) return;
    runThumbLoop();
  }

  function stopThumbLoop() {
    if (thumbMotionRafId) { cancelAnimationFrame(thumbMotionRafId); thumbMotionRafId = null; }
  }

  function injectThumbs(data) {
    document.querySelectorAll('[data-preview-id]').forEach(function (el) {
      var id    = el.getAttribute('data-preview-id');
      var entry = data[id];
      if (!entry || !entry.src) return;

      var img = document.createElement('img');
      img.src = entry.src;
      img.alt = '';
      img.setAttribute('draggable', 'false');

      var wrap = document.createElement('span');
      wrap.className = 'hover-preview-thumb';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.appendChild(img);

      /* Split the last word so only it + the thumbnail are no-wrap.
         Preceding words remain free to wrap normally in the paragraph. */
      var raw       = el.textContent.trim();
      var lastSpace = raw.lastIndexOf(' ');
      var lastWord  = lastSpace >= 0 ? raw.slice(lastSpace + 1) : raw;
      var preceding = lastSpace >= 0 ? raw.slice(0, lastSpace)  : '';

      el.textContent = '';
      if (preceding) {
        el.appendChild(document.createTextNode(preceding + ' '));
      }

      var noWrap = document.createElement('span');
      noWrap.style.whiteSpace = 'nowrap';
      noWrap.appendChild(document.createTextNode(lastWord));
      noWrap.appendChild(wrap);
      el.appendChild(noWrap);

      thumbPairs.push({
        el:       el,
        wrap:     wrap,
        depth:    depthFromId(id),
        currentX: 0,
        currentY: 0,
      });

      /* ── Thumbnail hover: shows card + touch toggle ──────────────── */

      if (!isCoarsePointer) {
        wrap.addEventListener('mouseenter', function (e) {
          positionAnchorEl = null;
          showForLink(el, e.clientX, e.clientY, null);
        });
        wrap.addEventListener('mouseleave', function (e) {
          /* don't hide if cursor moves back to the trigger text */
          if (e.relatedTarget === el || (el.contains && el.contains(e.relatedTarget))) return;
          hide();
        });
      }

      wrap.addEventListener('pointerdown', function (e) {
        if (!isCoarsePointer) return;
        /* treat thumbnail tap same as tapping the trigger on touch devices */
        var fakeEvent = { currentTarget: el, clientX: e.clientX, clientY: e.clientY,
                          pointerType: e.pointerType, preventDefault: function () { e.preventDefault(); } };
        onTap(fakeEvent);
      });
    });

    if (!thumbPairs.length || prefersReducedMotion) return;

    /* Gate motion loop on #work visibility — no rAF cost when off-screen. */
    thumbWorkSection = document.getElementById('work');
    if (thumbWorkSection) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            thumbWorkVisible = entry.isIntersecting;
            if (thumbWorkVisible) { startThumbLoop(); }
            else                  { stopThumbLoop();  }
          });
        },
        { threshold: 0 }
      ).observe(thumbWorkSection);

      window.addEventListener('mousemove', onThumbPointerMove, { passive: true });
      window.addEventListener('touchmove', onThumbPointerMove, { passive: true });
    }
  }

  var manifestPromise = fetch(MANIFEST_URL)
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      manifest = data;
      injectThumbs(data);
      var queue = manifestPending.splice(0);
      queue.forEach(function (fn) {
        fn();
      });
    })
    .catch(function (err) {
      console.warn('hover-preview: manifest failed to load', err);
    });

  /* ── Create shared card element ──────────────────────────────── */

  var card    = document.createElement('div');
  var picture = document.createElement('picture');
  var srcAvif = document.createElement('source');
  var srcWebp = document.createElement('source');
  var cardImg = document.createElement('img');

  var SIZES =
    '(max-width: 480px) calc(100vw - 48px), min(780px, calc(100vw - 48px))';

  srcAvif.type  = 'image/avif';
  srcAvif.sizes = SIZES;
  srcWebp.type  = 'image/webp';
  srcWebp.sizes = SIZES;
  cardImg.alt   = '';
  cardImg.setAttribute('aria-hidden', 'true');
  cardImg.sizes = SIZES;

  picture.appendChild(srcAvif);
  picture.appendChild(srcWebp);
  picture.appendChild(cardImg);

  card.className = 'hover-preview-card';
  card.appendChild(picture);
  document.body.appendChild(card);

  /* ── Optional one-time touch hint ─────────────────────────────── */

  var touchHint            = null;
  var touchHintTimeoutId   = null;
  var touchHintIo          = null;

  function dismissTouchHint() {
    if (!touchHint || touchHint.hidden) return;
    touchHint.classList.remove('is-visible');
    touchHint.hidden = true;
    if (touchHintTimeoutId) {
      clearTimeout(touchHintTimeoutId);
      touchHintTimeoutId = null;
    }
    if (touchHintIo) {
      touchHintIo.disconnect();
      touchHintIo = null;
    }
    try {
      sessionStorage.setItem(SESSION_TOUCH_HINT, '1');
    } catch (e) {}
  }

  function initTouchHintIfNeeded() {
    if (!isCoarsePointer) return;
    try {
      if (sessionStorage.getItem(SESSION_TOUCH_HINT)) return;
    } catch (e) {
      return;
    }

    var work = document.getElementById('work');
    if (!work) return;

    touchHint = document.createElement('div');
    touchHint.id = 'preview-touch-hint';
    touchHint.className = 'preview-touch-hint';
    touchHint.setAttribute('role', 'status');
    touchHint.setAttribute('aria-live', 'polite');
    touchHint.hidden = true;
    touchHint.textContent =
      'Tap highlighted phrases for a preview · tap outside to close';
    document.body.appendChild(touchHint);

    touchHintIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          touchHintIo.disconnect();
          touchHintIo = null;
          touchHint.hidden = false;
          requestAnimationFrame(function () {
            touchHint.classList.add('is-visible');
          });
          touchHintTimeoutId = setTimeout(dismissTouchHint, TOUCH_HINT_MS);
        });
      },
      { threshold: 0.15 }
    );
    touchHintIo.observe(work);
  }

  /* ── State ──────────────────────────────────────────────────────── */

  var activeLink          = null;
  var activeId            = null;
  var rafId               = null;
  var pendingX            = 0;
  var pendingY            = 0;
  var lastX               = 0;
  var lastY               = 0;
  /** When set, card tracks this element’s box instead of mousemove */
  var positionAnchorEl    = null;

  /* ── Position helpers ─────────────────────────────────────────── */

  function coordsFromElement(el) {
    var rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    };
  }

  function positionCard(mouseX, mouseY) {
    var vw    = window.innerWidth;
    var vh    = window.innerHeight;
    var cardW = card.offsetWidth || 0;
    var cardH = card.offsetHeight || 0;
    var PAD   = 12;

    var x = mouseX + OFFSET_X;
    var y = mouseY + OFFSET_Y;

    if (x + cardW > vw - PAD) {
      x = mouseX - OFFSET_X - cardW;
    }
    if (y + cardH > vh - PAD) {
      y = mouseY - OFFSET_Y - cardH;
    }

    x = Math.max(PAD, Math.min(x, vw - PAD - cardW));
    y = Math.max(PAD, Math.min(y, vh - PAD - cardH));

    card.style.setProperty('--hp-x', x + 'px');
    card.style.setProperty('--hp-y', y + 'px');
  }

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

  function repositionFromAnchor() {
    if (!positionAnchorEl || activeLink !== positionAnchorEl) return;
    var pt = coordsFromElement(positionAnchorEl);
    lastX = pt.x;
    lastY = pt.y;
    positionCard(lastX, lastY);
  }

  /* ── Picture population ───────────────────────────────────────── */

  function applyEntry(entry) {
    var sources = entry.sources || {};

    srcAvif.srcset = sources.avif || '';
    srcWebp.srcset = sources.webp || '';

    var fallback =
      sources.jpg ||
      sources.png ||
      sources[Object.keys(sources)[0]] ||
      '';

    if (cardImg.getAttribute('src') !== entry.src) {
      cardImg.src = entry.src || '';
      cardImg.srcset = fallback;
      cardImg.alt = entry.alt || '';
    }
  }

  /* ── Event handlers ───────────────────────────────────────────── */

  function showForLink(link, clientX, clientY, anchorEl) {
    var id = link.getAttribute('data-preview-id');
    if (!id) return;

    if (!manifest) {
      manifestPending.push(function () {
        showForLink(link, clientX, clientY, anchorEl);
      });
      return;
    }

    var entry = manifest[id];
    if (!entry) return;

    activeLink       = link;
    activeId         = id;
    positionAnchorEl = anchorEl || null;

    if (positionAnchorEl) {
      var pt = coordsFromElement(positionAnchorEl);
      lastX = pt.x;
      lastY = pt.y;
    } else {
      lastX = clientX;
      lastY = clientY;
    }

    applyEntry(entry);

    positionCard(lastX, lastY);
    card.classList.add('is-visible');

    requestAnimationFrame(function () {
      if (!activeLink) return;
      repositionFromAnchor();
    });

    if (typeof cardImg.decode === 'function') {
      cardImg
        .decode()
        .catch(function () {})
        .then(function () {
          if (!activeLink) return;
          repositionFromAnchor();
        });
    } else {
      cardImg.onload = function () {
        if (!activeLink) return;
        repositionFromAnchor();
      };
    }
  }

  function hide() {
    activeLink       = null;
    activeId         = null;
    positionAnchorEl = null;
    card.classList.remove('is-visible');
  }

  function onEnter(e) {
    positionAnchorEl = null;
    showForLink(e.currentTarget, e.clientX, e.clientY, null);
  }

  function onMove(e) {
    if (!activeLink) return;
    if (positionAnchorEl) return;
    schedulePosition(e.clientX, e.clientY);
  }

  function onLeave(e) {
    /* Don't hide if the cursor is moving into the paired thumbnail */
    if (e && e.relatedTarget && e.relatedTarget.classList &&
        e.relatedTarget.classList.contains('hover-preview-thumb')) return;
    hide();
  }

  function onTap(e) {
    var link = e.currentTarget;

    dismissTouchHint();

    var isTouch = e.pointerType === 'touch';
    if (isTouch) {
      e.preventDefault();
    }

    positionAnchorEl = null;

    if (activeLink === link) {
      hide();
      return;
    }

    showForLink(link, e.clientX, e.clientY, null);
  }

  /** Desktop mouse uses hover only; touch / coarse pointers use tap toggle */
  function shouldHandlePointerTap(e) {
    if (e.pointerType === 'touch') return true;
    if (isCoarsePointer) return true;
    return false;
  }

  function onPointerDown(e) {
    if (!shouldHandlePointerTap(e)) return;
    onTap(e);
  }

  function isPreviewTrigger(el) {
    return el && el.nodeType === 1 && el.hasAttribute('data-preview-id');
  }

  function onFocusIn(e) {
    var link = e.target;
    if (!isPreviewTrigger(link)) return;

    var visibleFocus = true;
    try {
      visibleFocus = link.matches(':focus-visible');
    } catch (err) {}

    if (!visibleFocus) return;

    showForLink(link, 0, 0, link);
  }

  function onFocusOut(e) {
    var link = e.target;
    if (!isPreviewTrigger(link)) return;
    if (activeLink !== link) return;
    hide();
  }

  /* ── Preload preview images when the work section enters view ────
     Waits until the manifest is ready, then creates hidden Image objects
     for the best format the browser supports (avif → webp → jpg/png).
     This runs once per session and fires before the user has a chance
     to hover, so images are already decoded by the time they're needed.
  ───────────────────────────────────────────────────────────────── */

  function preloadManifestImages(data) {
    var supportsAvif = false;
    var supportsWebp = false;

    /* Quick canvas-based format sniff (sync, no network) */
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 1;
      supportsAvif = c.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    } catch (e) {}
    try {
      var c2 = document.createElement('canvas');
      c2.width = c2.height = 1;
      supportsWebp = c2.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {}

    Object.keys(data).forEach(function (id) {
      var entry   = data[id];
      var sources = entry.sources || {};
      /* Pick smallest modern format available in the manifest */
      var src = (supportsAvif && sources.avif)
        ? sources.avif.split(',')[0].trim().split(' ')[0]   /* first srcset descriptor */
        : (supportsWebp && sources.webp)
          ? sources.webp.split(',')[0].trim().split(' ')[0]
          : (entry.src || '');

      if (!src) return;
      var img   = new Image();
      img.decoding = 'async';
      img.src   = src;
    });
  }

  var preloadIo = null;
  var preloadDone = false;

  function schedulePreload() {
    if (preloadDone) return;
    var section = document.getElementById('work') || document.querySelector('[data-preview-id]');
    if (!section) return;

    preloadIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          preloadIo.disconnect();
          preloadIo   = null;
          preloadDone = true;

          /* If manifest is already loaded, preload now; otherwise wait for it */
          if (manifest) {
            preloadManifestImages(manifest);
          } else {
            manifestPending.push(function () {
              preloadManifestImages(manifest);
            });
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    );
    preloadIo.observe(section);
  }

  schedulePreload();

  /* ── Bind to all elements with data-preview-id ───────────────── */

  var links = document.querySelectorAll('[data-preview-id]');

  links.forEach(function (link) {
    if (!isCoarsePointer) {
      link.addEventListener('mouseenter', onEnter);
      link.addEventListener('mouseleave', onLeave);
    }
    link.addEventListener('pointerdown', onPointerDown);
    link.addEventListener('focusin', onFocusIn);
    link.addEventListener('focusout', onFocusOut);
  });

  if (!isCoarsePointer) {
    document.addEventListener('mousemove', onMove);
  }

  document.addEventListener(
    'pointerdown',
    function (e) {
      if (!activeLink) return;
      if (e.target && e.target.closest && e.target.closest('[data-preview-id]')) {
        return;
      }
      hide();
    },
    { capture: true }
  );

  window.addEventListener(
    'scroll',
    function () {
      if (!activeLink) return;
      /* During scroll (including Lenis smooth-scroll events) anchor the card
         to the hovered element so it repositions rather than disappears. */
      if (!positionAnchorEl) {
        positionAnchorEl = activeLink;
      }
      repositionFromAnchor();
    },
    { passive: true }
  );

  window.addEventListener('resize', function () {
    if (!activeLink) return;
    if (positionAnchorEl) {
      repositionFromAnchor();
    } else {
      positionCard(lastX, lastY);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    dismissTouchHint();
    hide();
  });
})();
