/*
  js/work-ticker.js
  Infinite horizontal image ticker with custom cursor and cream modal.

  Behaviour:
    · GSAP infinite x-translate loop (cloned items for seamless wrap)
    · Slows to 25% speed on mouseenter; restores on mouseleave
    · Drag-to-scrub: pauses tween, offsets track position, resumes on release
    · "View" pill cursor follows mouse with a spring lag
    · Click opens a cream modal with the full image + Space Mono caption
    · Escape or close button dismisses the modal
    · prefers-reduced-motion: GSAP tween skipped; static grid via CSS
*/

(function () {
  'use strict';

  if (!window.gsap) return;

  var gsap = window.gsap;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── DOM refs ──────────────────────────────────────────────────── */

  var viewport = document.querySelector('.ticker__viewport');
  var track    = document.querySelector('.ticker__track');
  var cursor     = document.querySelector('.ticker-cursor');
  var cursorText = document.querySelector('.ticker-cursor__text');
  if (!viewport || !track || !cursor) return;

  var originalItems = [];

  /* ── Measure content width (single set, not cloned) ─────────────── */

  function getContentWidth() {
    var total = 0;
    originalItems.forEach(function (item) {
      /* Use getBoundingClientRect for sub-pixel accuracy to prevent
         micro-stutters at the loop wrap point. */
      total += item.getBoundingClientRect().width;
    });
    return total;
  }

  /* ── GSAP tween ─────────────────────────────────────────────────── */

  var tween = null;
  var TICKER_DURATION = 40; /* seconds for one full loop */
  var cachedContentWidth = 0;
  var isHovering = false;

  function initTween() {
    if (reducedMotion) return;

    /* Guard: don't start before all media has its natural dimensions.
       Excludes poster fallback imgs (not needed for width calculation).
       Videos need readyState >= HAVE_METADATA so offsetWidth is non-zero. */
    var imgs   = Array.from(track.querySelectorAll('img:not(.ticker__item-poster)'));
    var videos = Array.from(track.querySelectorAll('video'));
    var notReady = imgs.some(function (img) { return !img.complete || img.naturalWidth === 0; })
                || videos.some(function (vid) { return vid.readyState < 1; });
    if (notReady) return;

    /* Kill any previous tween before creating a new one. */
    if (tween) { tween.kill(); tween = null; }

    /* Clone items for seamless infinite loop ─────────────────────
       We do this ONLY ONCE after everything is ready, so clones have
       the correct natural dimensions from the start.
    ────────────────────────────────────────────────────────────────── */
    if (originalItems.length === 0) {
      originalItems = Array.from(track.querySelectorAll('.ticker__item'));
      originalItems.forEach(function (item) {
        var clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.removeAttribute('tabindex');
        /* Ensure videos in clones also autoplay */
        var cloneVids = clone.querySelectorAll('video');
        cloneVids.forEach(function(v) { v.play().catch(function() {}); });
        track.appendChild(clone);
      });
    }

    cachedContentWidth = getContentWidth();
    if (cachedContentWidth <= 0) return;

    /* Standard infinite loop: animate from current position to -contentWidth.
       We use a relative value "-=" so it works after dragging. */
    tween = gsap.to(track, {
      x: "-=" + cachedContentWidth,
      duration: TICKER_DURATION,
      ease: "none",
      repeat: -1,
      modifiers: {
        /* The modifier ensures x always stays within [ -cachedContentWidth, 0 ].
           This makes the loop truly infinite and seamless regardless of
           how long it runs or where it's dragged to. */
        x: gsap.utils.unitize(function (x) {
          return parseFloat(x) % cachedContentWidth;
        })
      }
    });

    /* Respect current hover state — if the mouse is already inside the
       viewport when the tween is (re)created (e.g. after a drag), apply
       the slow-hover timescale immediately rather than waiting for the
       next mouseenter event, which will never fire since the mouse didn't
       leave and re-enter. */
    if (isHovering) tween.timeScale(0.4);
  }

  /* Re-init on resize (content width changes with font/zoom) */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (tween) {
        tween.kill();
        gsap.set(track, { x: 0 });
      }
      tween = null;
      initTween();
    }, 200);
  });

  /* ── Speed control on hover ──────────────────────────────────────── */

  viewport.addEventListener('mouseenter', function () {
    isHovering = true;
    if (tween) tween.timeScale(0.4);
  });

  viewport.addEventListener('mouseleave', function () {
    isHovering = false;
    if (tween) tween.timeScale(1);
  });

  /* ── Drag-to-scrub ──────────────────────────────────────────────── */

  var isDragging    = false;
  var dragStartX    = 0;
  var trackStartX   = 0;
  var hasDragged    = false;
  /* 10px threshold: large enough that normal trackpad click movement
     never triggers a drag, small enough that intentional scrubbing
     starts immediately. */
  var DRAG_THRESHOLD = 10;

  viewport.addEventListener('pointerdown', function (e) {
    isDragging  = true;
    hasDragged  = false;
    dragStartX  = e.clientX;
    trackStartX = gsap.getProperty(track, 'x');
    if (tween) tween.pause();
    if (window.__lenis) window.__lenis.stop();
  });

  window.addEventListener('pointermove', function (e) {
    if (!isDragging) return;
    var delta = e.clientX - dragStartX;
    /* Only commit to drag once threshold is crossed — don't move
       the track on a tiny natural click wobble. */
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      if (!hasDragged) {
        hasDragged = true;
        track.classList.add('is-dragging');
      }
      gsap.set(track, { x: trackStartX + delta });
    }
  });

  window.addEventListener('pointerup', function () {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    if (window.__lenis) window.__lenis.start();

    if (hasDragged) {
      /* Tween's internal playhead no longer matches the DOM position after
         a drag — kill and reinit from the current dragged-to position so
         the loop resumes seamlessly without a visible jump. */
      if (tween) { tween.kill(); tween = null; }
      /* Normalise current x into the [-contentWidth, 0] range */
      var currentX = parseFloat(gsap.getProperty(track, 'x'));
      var cw = cachedContentWidth || getContentWidth();
      var normX = cw > 0 ? ((currentX % cw) - cw) % cw : 0;
      gsap.set(track, { x: normX });
      initTween();
    } else if (tween) {
      tween.play();
    }
    /* hasDragged is intentionally left for the click handler to consume
       so it can suppress the post-drag click event. */
  });

  /* ── Custom cursor ──────────────────────────────────────────────── */

  var cursorVisible = false;
  var cursorX = 0;
  var cursorY = 0;

  function updateCursorPos(e) {
    cursorX = e.clientX;
    cursorY = e.clientY;
    /* Drive position via CSS custom properties for GPU compositing */
    cursor.style.setProperty('--tc-x', cursorX + 'px');
    cursor.style.setProperty('--tc-y', cursorY + 'px');
  }

  viewport.addEventListener('mouseenter', function (e) {
    updateCursorPos(e);
    if (!cursorVisible) {
      cursorVisible = true;
      cursor.classList.add('is-visible');
    }
  });

  viewport.addEventListener('mousemove', function (e) {
    updateCursorPos(e);
  });

  viewport.addEventListener('mouseleave', function () {
    if (cursorVisible) {
      cursorVisible = false;
      cursor.classList.remove('is-visible');
    }
  });

  /* ── Item hover highlight ───────────────────────────────────────── */

  track.addEventListener('mouseover', function (e) {
    var item = e.target.closest('.ticker__item');
    if (!item) return;
    item.classList.add('is-hovered');
    var caption = item.dataset.caption || '';
    var label   = item.dataset.label   || '';
    var text = caption && label ? caption + ' \u2014 ' + label : caption || label || 'View';
    setCursorText(text);
  });

  track.addEventListener('mouseout', function (e) {
    var item = e.target.closest('.ticker__item');
    if (!item) return;
    item.classList.remove('is-hovered');
    setCursorText('View');
  });

  function setCursorText(text) {
    /* Duplicate with a separator for seamless marquee loop */
    var sep = '\u00a0\u00a0\u00a0\u00b7\u00a0\u00a0\u00a0';
    cursorText.textContent = text + sep + text + sep;
  }

  /* Click: consume hasDragged flag so drag doesn't register as a click */
  track.addEventListener('click', function () {
    if (hasDragged) hasDragged = false;
  });

  /* ── Init ──────────────────────────────────────────────────────── */

  /* Wait for all ticker media (images + video metadata) before starting
     the tween. Poster fallback imgs are excluded — they load async and
     aren't needed for width calculation.
     Videos need readyState >= HAVE_METADATA (1) so their natural
     dimensions are available for offsetWidth calculation. */
  function initWhenReady() {
    var imgs   = Array.from(track.querySelectorAll('img:not(.ticker__item-poster)'));
    var videos = Array.from(track.querySelectorAll('video'));

    var pendingImgs = imgs.filter(function (img) {
      return !img.complete || img.naturalWidth === 0;
    });
    var pendingVids = videos.filter(function (vid) {
      return vid.readyState < 1; /* < HAVE_METADATA */
    });

    var total = pendingImgs.length + pendingVids.length;

    if (!total) {
      requestAnimationFrame(initTween);
      return;
    }

    var done = 0;
    function onSettle() {
      done++;
      if (done === total) requestAnimationFrame(initTween);
    }

    pendingImgs.forEach(function (img) {
      img.addEventListener('load',  onSettle, { once: true });
      img.addEventListener('error', onSettle, { once: true });
    });

    pendingVids.forEach(function (vid) {
      vid.addEventListener('loadedmetadata', onSettle, { once: true });
      vid.addEventListener('error',          onSettle, { once: true });
    });
  }

  initWhenReady();

}());
