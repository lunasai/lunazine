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
  /* ?reduce-motion in the URL forces the static layout (handy for testing). */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    /[?&]reduce-motion\b/.test(window.location.search);

  /* ── DOM refs ──────────────────────────────────────────────────── */

  var viewport = document.querySelector('.ticker__viewport');
  var track    = document.querySelector('.ticker__track');
  var cursor     = document.querySelector('.ticker-cursor');
  var cursorText = document.querySelector('.ticker-cursor__text');
  if (!viewport || !track || !cursor) return;

  /* ── Static mode (reduced motion): user-driven scroll strip ──────── */

  function initStaticStrip() {
    var section = viewport.closest('.section--ticker');
    if (section) section.classList.add('is-static');

    /* Keyboard: make the strip focusable so arrow keys scroll it natively */
    viewport.setAttribute('tabindex', '0');
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', 'Work artefacts. Scroll horizontally with arrow keys, the buttons below, or by dragging.');

    /* Prev / next buttons — a visible, discoverable alternative to keys */
    var nav = document.createElement('div');
    nav.className = 'ticker__nav';
    function makeBtn(dir, label, glyph) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ticker__nav-btn';
      b.setAttribute('aria-label', label);
      b.textContent = glyph;
      b.addEventListener('click', function () {
        viewport.scrollBy({ left: dir * viewport.clientWidth * 0.8, behavior: 'auto' });
      });
      return b;
    }
    var prev = makeBtn(-1, 'Previous work artefacts', '\u2190');
    var next = makeBtn(1, 'Next work artefacts', '\u2192');
    nav.appendChild(prev);
    nav.appendChild(next);
    viewport.insertAdjacentElement('afterend', nav);

    function updateNav() {
      var max = viewport.scrollWidth - viewport.clientWidth - 1;
      prev.disabled = viewport.scrollLeft <= 0;
      next.disabled = viewport.scrollLeft >= max;
    }
    viewport.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    window.addEventListener('load', updateNav);
    updateNav();

    /* Arrow keys / Home / End when the strip is focused */
    viewport.addEventListener('keydown', function (e) {
      var step = viewport.clientWidth * 0.5;
      if (e.key === 'ArrowRight') viewport.scrollBy({ left: step });
      else if (e.key === 'ArrowLeft') viewport.scrollBy({ left: -step });
      else if (e.key === 'Home') viewport.scrollTo({ left: 0 });
      else if (e.key === 'End') viewport.scrollTo({ left: viewport.scrollWidth });
      else return;
      e.preventDefault();
    });

    /* Mouse drag-to-scroll (touch already scrolls natively) */
    var down = false, moved = false, startX = 0, startLeft = 0;
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false;
      startX = e.clientX; startLeft = viewport.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        viewport.classList.add('is-dragging');
      }
      if (moved) viewport.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      viewport.classList.remove('is-dragging');
      if (moved) {
        wasDrag = true;
        setTimeout(function () { wasDrag = false; }, 0);
      }
    });
    /* Stop images/links being dragged natively */
    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  if (reducedMotion) initStaticStrip();

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
        clone.removeAttribute('role');
        clone.removeAttribute('aria-label');
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
  var wasDrag       = false; /* true for the click event that ends a drag */
  /* 10px threshold: large enough that normal trackpad click movement
     never triggers a drag, small enough that intentional scrubbing
     starts immediately. */
  var DRAG_THRESHOLD = 10;

  viewport.addEventListener('pointerdown', function (e) {
    /* Reduced motion: viewport scrolls natively; don't hijack the pointer */
    if (reducedMotion) return;
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
      wasDrag = true;
      setTimeout(function () { wasDrag = false; }, 0);
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


  /* ── Detail modal: media + project context side by side ─────────── */

  var modal = document.querySelector('.ticker-modal');
  if (modal) {
    var mInner  = modal.querySelector('.ticker-modal__inner');
    var mMedia  = modal.querySelector('.ticker-modal__frame');
    var mPanel  = modal.querySelector('.ticker-modal__panel');
    var mLabel  = modal.querySelector('.ticker-modal__label');
    var mTitle  = modal.querySelector('.ticker-modal__title');
    var mDesc   = modal.querySelector('.ticker-modal__desc');
    var mMeta   = modal.querySelector('.ticker-modal__meta');
    var mCount  = modal.querySelector('.ticker-modal__count');
    var mClose  = modal.querySelector('.ticker-modal__close');
    var mNavBtns = Array.from(modal.querySelectorAll('.ticker-modal__nav-btn'));
    var mCursor = modal.querySelector('.modal-cursor');
    var lastFocus = null;
    var currentIndex = -1;

    /* Only the original (non-cloned) items are navigable */
    function getItems() {
      return Array.from(track.querySelectorAll('.ticker__item:not([aria-hidden="true"])'));
    }

    function pickSrc(item) {
      /* Largest webp candidate if available, else the <img> src */
      var src = item.querySelector('picture source[type="image/webp"]');
      if (src && src.srcset) {
        var parts = src.srcset.split(',').map(function (c) { return c.trim().split(/\s+/)[0]; });
        return parts[parts.length - 1];
      }
      var img = item.querySelector('img:not(.ticker__item-poster)');
      return img ? img.currentSrc || img.src : '';
    }

    function setMeta(key, value) {
      var row = modal.querySelector('[data-meta="' + key + '"]');
      if (!row) return;
      row.hidden = !value;
      row.querySelector('dd').textContent = value || '';
    }

    function buildMedia(item) {
      var old = mMedia.querySelector('video');
      if (old) old.pause();
      mMedia.textContent = '';
      var vid = item.querySelector('video');
      var poster = item.querySelector('.ticker__item-poster');
      var el;
      if (vid && !reducedMotion) {
        el = document.createElement('video');
        el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true;
        el.setAttribute('playsinline', '');
        vid.querySelectorAll('source').forEach(function (sEl) { el.appendChild(sEl.cloneNode(true)); });
        if (poster) el.poster = poster.getAttribute('src');
        el.play && el.play().catch(function () {});
      } else {
        el = document.createElement('img');
        /* Static poster for videos (reduced motion only reaches here) and
           for GIFs under reduced motion; otherwise the animated GIF itself */
        var isGif = item.classList.contains('ticker__item--gif');
        el.src = poster && (vid || (isGif && reducedMotion))
          ? poster.getAttribute('src')
          : pickSrc(item);
        var base = item.querySelector('img');
        el.alt = base ? base.alt : '';
      }
      el.className = 'ticker-modal__img';
      mMedia.appendChild(el);
    }

    /* via: how the change happened ('button' | 'arrow'); null when opening */
    function showIndex(i, via) {
      var items = getItems();
      if (!items.length) return;
      currentIndex = (i + items.length) % items.length;
      var item = items[currentIndex];

      buildMedia(item);
      /* Eyebrow: "Company • Project" (+ year when set) */
      var eyebrow = (item.dataset.label || '').split(/\s+[—–-]\s+/);
      if (item.dataset.year) eyebrow.push(item.dataset.year);
      mLabel.textContent = eyebrow.filter(Boolean).join(' \u2022 ');
      mTitle.textContent = item.dataset.headline || item.dataset.caption || '';
      setMeta('company', item.dataset.company);
      setMeta('role',    item.dataset.role);
      mMeta.hidden = !(item.dataset.company || item.dataset.role);
      mDesc.textContent = item.dataset.desc || '';
      mDesc.hidden = !item.dataset.desc;
      mCount.textContent = (currentIndex + 1) + ' of ' + items.length;
      mPanel.scrollTop = 0;
      document.dispatchEvent(new CustomEvent('ticker:change', { detail: { item: item, index: currentIndex, via: via || null } }));
    }

    function openModal(item, via) {
      lastFocus = document.activeElement;
      /* Loop clones are appended in the same order as the originals, so
         map any clicked card back to its original by position */
      var all = Array.from(track.querySelectorAll('.ticker__item'));
      showIndex(all.indexOf(item) % getItems().length, null);

      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      document.body.classList.add('ticker-modal-open');
      if (window.__lenis) window.__lenis.stop();
      modal.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('ticker:open', { detail: { item: item, index: currentIndex, via: via } }));
    }

    function closeModal(via) {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('ticker-modal-open');
      if (mCursor) mCursor.classList.remove('is-visible');
      if (window.__lenis) window.__lenis.start();
      var v = mMedia.querySelector('video');
      if (v) v.pause();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('ticker:close', { detail: { via: via } }));
    }

    /* Open: click (ignoring clicks that ended a drag) or Enter/Space */
    track.addEventListener('click', function (e) {
      var item = e.target.closest('.ticker__item');
      if (!item || wasDrag) return;
      openModal(item, 'click');
    });
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var item = e.target.closest('.ticker__item');
      if (!item) return;
      e.preventDefault();
      openModal(item, 'keyboard');
    });
    originalItems_forFocus();

    /* Prev / next */
    mNavBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        showIndex(currentIndex + Number(btn.dataset.dir), 'button');
      });
    });

    /* Close: backdrop click, close button */
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal('backdrop');
    });
    mClose.addEventListener('click', function () { closeModal('button'); });

    /* Keyboard: Esc closes, arrows navigate, Tab cycles inside the card */
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeModal('esc'); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); showIndex(currentIndex + 1, 'arrow'); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); showIndex(currentIndex - 1, 'arrow'); return; }
      if (e.key === 'Tab') {
        var focusables = [mClose].concat(mNavBtns);
        var idx = focusables.indexOf(document.activeElement);
        var next = idx === -1
          ? (e.shiftKey ? focusables.length - 1 : 0)
          : (idx + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
        e.preventDefault();
        focusables[next].focus();
      }
    });

    /* "Close" cursor pill over the backdrop only (fine pointers) */
    modal.addEventListener('mousemove', function (e) {
      if (!mCursor) return;
      mCursor.style.setProperty('--mc-x', e.clientX + 'px');
      mCursor.style.setProperty('--mc-y', e.clientY + 'px');
      mCursor.classList.toggle('is-visible', e.target === modal);
    });
    modal.addEventListener('mouseleave', function () {
      if (mCursor) mCursor.classList.remove('is-visible');
    });
  }

  function originalItems_forFocus() {
    Array.from(track.querySelectorAll('.ticker__item')).forEach(function (it) {
      it.setAttribute('tabindex', '0');
      it.setAttribute('role', 'button');
      var base = it.querySelector('img');
      it.setAttribute('aria-label', 'Open ' + (it.dataset.caption || (base && base.alt) || 'project') + ' details');
    });
  }

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
