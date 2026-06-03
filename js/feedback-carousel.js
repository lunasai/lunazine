/**
 * Feedback section — timed carousel.
 *
 * Cross-fades one quote at a time on a fixed interval. A thin progress bar
 * fills left-to-right as the timer counts down. Hovering or focusing inside
 * the section pauses both the timer and the bar exactly where they are;
 * leaving resumes from that point. Tap, click, or horizontal drag/swipe in
 * the nav zone advances or goes back (swipe left → next, right → prev).
 */

(function () {
  var DURATION = 12000; // ms per slide

  var section = document.querySelector('.section--feedback');
  if (!section) return;

  var cards  = Array.from(section.querySelectorAll('.feedback-card'));
  var inner  = section.querySelector('.feedback__inner');
  var quotes = section.querySelector('.feedback__quotes');
  var block  = section.querySelector('.feedback__block');
  if (cards.length < 2 || !inner || !quotes || !block) return;

  /* ── Progress bar (injected inside dark block) ───────────────────── */

  var progress = document.createElement('div');
  progress.className = 'feedback__progress';
  progress.setAttribute('aria-hidden', 'true');

  var fill = document.createElement('div');
  fill.className = 'feedback__progress-fill';
  progress.appendChild(fill);
  block.appendChild(progress);

  section.style.setProperty('--feedback-carousel-duration', (DURATION / 1000) + 's');

  /* ── State ──────────────────────────────────────────────────────── */

  var current   = 0;
  var timeout   = null;
  var startedAt = 0;   // when the current tick started
  var remaining = DURATION;

  /* ── Core ───────────────────────────────────────────────────────── */

  function showCard(index) {
    cards.forEach(function (card, i) {
      var isActive = i === index;
      card.classList.toggle('is-active', isActive);
      card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    /* Restart fade-up on the incoming card (matches work scroll-reveal pattern) */
    var active = cards[index];
    active.style.animation = 'none';
    void active.offsetWidth;
    active.style.animation = '';

    current = index;
  }

  function restartBar() {
    fill.style.animationPlayState = '';
    fill.classList.remove('is-running');
    // Force reflow so removing + re-adding the class restarts the animation
    void fill.offsetWidth;
    fill.classList.add('is-running');
  }

  function advance() {
    showCard((current + 1) % cards.length);
    restartBar();
    tick(DURATION);
  }

  function tick(delay) {
    clearTimeout(timeout);
    startedAt = Date.now();
    remaining = delay;
    timeout = setTimeout(advance, delay);
  }

  /* ── Pause / resume ─────────────────────────────────────────────── */

  function pause() {
    if (timeout === null) return;
    clearTimeout(timeout);
    timeout = null;
    // Record how much time is left on the current slide
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
    fill.style.animationPlayState = 'paused';
  }

  function resume() {
    if (timeout !== null) return;
    fill.style.animationPlayState = 'running';
    tick(remaining);
  }

  /* ── Custom cursor + click — shared hit zone around the dark block ── */

  var cursor = null;
  var HIT_PAD = { top: 40, right: 16, bottom: 40, left: 40 };

  function inFeedbackNavZone(clientX, clientY) {
    var blockRect   = block.getBoundingClientRect();
    var sectionRect = section.getBoundingClientRect();
    var zoneLeft   = Math.max(sectionRect.left, blockRect.left - HIT_PAD.left);
    var zoneRight  = Math.min(sectionRect.right, blockRect.right + HIT_PAD.right);
    var zoneTop    = Math.max(sectionRect.top, blockRect.top - HIT_PAD.top);
    var zoneBottom = Math.min(sectionRect.bottom, blockRect.bottom + HIT_PAD.bottom);

    return (
      clientX >= zoneLeft &&
      clientX <= zoneRight &&
      clientY >= zoneTop &&
      clientY <= zoneBottom
    );
  }

  function goToSlide(index) {
    showCard(index);
    restartBar();
    tick(DURATION);
  }

  function navigateFromPointer(clientX) {
    var blockRect = block.getBoundingClientRect();
    var isLeft = clientX < blockRect.left + blockRect.width / 2;
    var next = isLeft
      ? (current - 1 + cards.length) % cards.length
      : (current + 1) % cards.length;
    goToSlide(next);
  }

  function navigateFromSwipe(deltaX) {
    /* Swipe left (negative dx) → next; swipe right → prev */
    var next = deltaX < 0
      ? (current + 1) % cards.length
      : (current - 1 + cards.length) % cards.length;
    goToSlide(next);
  }

  function setNavActive(active) {
    section.classList.toggle('is-feedback-nav-active', active);
    if (!cursor) return;
    if (active) {
      cursor.classList.add('is-visible');
    } else {
      cursor.classList.remove('is-visible');
    }
  }

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    cursor = document.createElement('div');
    cursor.className = 'feedback-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = 'next →';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', function (e) {
      if (!inFeedbackNavZone(e.clientX, e.clientY)) {
        setNavActive(false);
        return;
      }

      var blockRect = block.getBoundingClientRect();
      var isLeft = e.clientX < blockRect.left + blockRect.width / 2;
      cursor.textContent = isLeft ? '← prev' : 'next →';
      cursor.style.setProperty('--fc-x', (e.clientX + 14) + 'px');
      cursor.style.setProperty('--fc-y', (e.clientY - 28) + 'px');
      setNavActive(true);
    }, { passive: true });
  }

  /* ── Drag / swipe + tap (pointer — touch + mouse) ─────────────── */

  var DRAG_THRESHOLD = 48;
  var DRAG_SLOP = 10;
  var drag = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    isHorizontal: false,
  };

  function resetDrag() {
    drag.active = false;
    drag.pointerId = null;
    drag.isHorizontal = false;
    section.classList.remove('is-feedback-dragging');
  }

  function releaseDragCapture(pointerId) {
    try {
      section.releasePointerCapture(pointerId);
    } catch (_) {
      /* capture may already be released */
    }
  }

  section.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!inFeedbackNavZone(e.clientX, e.clientY)) return;

    drag.active = true;
    drag.pointerId = e.pointerId;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.isHorizontal = false;

    pause();
    section.setPointerCapture(e.pointerId);
  });

  section.addEventListener('pointermove', function (e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;

    if (!drag.isHorizontal) {
      if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        releaseDragCapture(e.pointerId);
        resetDrag();
        if (!section.matches(':hover')) resume();
        return;
      }
      drag.isHorizontal = true;
      section.classList.add('is-feedback-dragging');
      setNavActive(false);
    }

    e.preventDefault();
  }, { passive: false });

  function finishPointer(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    var dx = e.clientX - drag.startX;

    if (drag.isHorizontal && Math.abs(dx) >= DRAG_THRESHOLD) {
      navigateFromSwipe(dx);
    } else if (!drag.isHorizontal && inFeedbackNavZone(e.clientX, e.clientY)) {
      navigateFromPointer(e.clientX);
    }

    resetDrag();
    releaseDragCapture(e.pointerId);

    if (!section.matches(':hover')) resume();
  }

  section.addEventListener('pointerup', finishPointer);
  section.addEventListener('pointercancel', finishPointer);

  /* ── Pause / resume event listeners ────────────────────────────── */

  section.addEventListener('mouseenter', pause);
  section.addEventListener('mouseleave', resume);

  section.addEventListener('focusin', pause);
  section.addEventListener('focusout', function () {
    if (!section.contains(document.activeElement)) resume();
  });

  /* ── Aria ───────────────────────────────────────────────────────── */

  quotes.setAttribute('aria-live', 'polite');
  quotes.setAttribute('aria-atomic', 'true');

  /* ── Init ───────────────────────────────────────────────────────── */

  showCard(0);
  restartBar();
  tick(DURATION);
})();
