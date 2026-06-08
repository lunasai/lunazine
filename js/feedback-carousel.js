/*
  js/feedback-carousel.js
  Feedback section — full-width timed carousel.

  Behaviour:
    · GSAP slides the card track to the active card index
    · Active segment fills left→right over DURATION ms (CSS animation)
    · Hovering or focusing inside the section pauses the timer + fill
    · Clicking a segment jumps to that card
    · Horizontal drag/swipe advances or goes back
    · prefers-reduced-motion: auto-advance disabled; segment fill instant
*/

(function () {
  'use strict';

  var DURATION        = 14000;  // ms per slide (half speed)
  var CARD_GAP        = 16;     // matches --space-4
  var SLIDE_DURATION  = 0.55;   // GSAP slide seconds
  var DRAG_THRESHOLD  = 30;
  var DRAG_SLOP       = 8;
  var WHEEL_THRESHOLD = 40;     // px of accumulated horizontal delta before committing

  var section  = document.querySelector('.section--feedback');
  if (!section) return;

  var track    = section.querySelector('.feedback__track');
  var viewport = section.querySelector('.feedback__viewport');
  var cards    = Array.from(section.querySelectorAll('.feedback-card'));
  var barFill  = section.querySelector('.feedback__bar-fill');

  if (!track || !viewport || cards.length < 2) return;

  var gsap = window.gsap;
  if (!gsap) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile      = window.matchMedia('(max-width: 768px)').matches;

  /* ── Clone cards for seamless infinite loop ───────────────────── */
  /* Append one full copy so we can always scroll forward.
     When position reaches the clone set we snap back to index 0. */
  var totalCards = cards.length;
  cards.forEach(function (card) {
    var clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  /* ── State ────────────────────────────────────────────────────── */

  var current   = 0;   /* logical index 0…totalCards-1 */
  var position  = 0;   /* actual DOM index used for x offset (can go up to 2× set) */
  var timeout   = null;
  var startedAt = 0;
  var remaining = DURATION;
  var isPaused  = false;

  /* ── Card width ───────────────────────────────────────────────── */

  function cardWidth() {
    return cards[0] ? cards[0].offsetWidth : 320;
  }

  /* ── Slide to position ────────────────────────────────────────── */

  function slideTo(pos, instant) {
    position = pos;
    current  = pos % totalCards;

    var offset = -(position * (cardWidth() + CARD_GAP));

    if (instant || reducedMotion) {
      gsap.set(track, { x: offset });
    } else {
      gsap.to(track, {
        x: offset,
        duration: SLIDE_DURATION,
        ease: 'power2.inOut',
        overwrite: true,
      });
    }

    /* Fill bar 0→100% over `remaining` ms */
    if (barFill && !reducedMotion) {
      gsap.fromTo(
        barFill,
        { width: '0%' },
        { width: '100%', duration: remaining / 1000, ease: 'none', overwrite: true }
      );
    }
  }

  /* ── Timer ────────────────────────────────────────────────────── */

  function advance() {
    goTo(position + 1);
  }

  function tick(delay) {
    clearTimeout(timeout);
    startedAt = Date.now();
    remaining = delay;
    if (!reducedMotion) {
      timeout = setTimeout(advance, delay);
    }
  }

  function pause() {
    if (isPaused) return;
    isPaused = true;
    clearTimeout(timeout);
    timeout = null;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));

    if (barFill) gsap.getTweensOf(barFill).forEach(function (t) { t.pause(); });
  }

  function resume() {
    if (!isPaused) return;
    isPaused = false;

    if (barFill) gsap.getTweensOf(barFill).forEach(function (t) { t.resume(); });

    tick(remaining);
  }


  /* ── Navigate helper ─────────────────────────────────────────── */

  function goTo(nextPos) {
    if (barFill) gsap.set(barFill, { width: '0%' });
    remaining = DURATION;
    var clamped = Math.max(0, nextPos);
    if (clamped >= totalCards) {
      slideTo(clamped);
      gsap.delayedCall(SLIDE_DURATION, function () {
        gsap.set(track, { x: 0 });
        position = 0;
        current  = 0;
      });
    } else {
      slideTo(clamped);
    }
    tick(DURATION);
  }

  /* ── Pause / resume on hover and focus ───────────────────────── */

  section.addEventListener('mouseenter', pause);
  section.addEventListener('mouseleave', function () {
    if (!drag.active) resume();
  });

  section.addEventListener('focusin',  pause);
  section.addEventListener('focusout', function () {
    if (!section.contains(document.activeElement)) resume();
  });

  /* ── Drag / swipe (pointer events) ───────────────────────────── */

  var drag = {
    active:       false,
    pointerId:    null,
    startX:       0,
    startY:       0,
    isHorizontal: false,
    trackStartX:  0,
  };

  function resetDrag() {
    drag.active       = false;
    drag.pointerId    = null;
    drag.isHorizontal = false;
    section.classList.remove('is-dragging');
  }

  track.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag.active      = true;
    drag.pointerId   = e.pointerId;
    drag.startX      = e.clientX;
    drag.startY      = e.clientY;
    drag.isHorizontal = false;
    drag.trackStartX = gsap.getProperty(track, 'x');
    pause();
  });

  window.addEventListener('pointermove', function (e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;

    if (!drag.isHorizontal) {
      if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        resetDrag();
        resume();
        return;
      }
      drag.isHorizontal = true;
      section.classList.add('is-dragging');
    }

    e.preventDefault();
    gsap.set(track, { x: drag.trackStartX + dx });
  }, { passive: false });

  window.addEventListener('pointerup', function (e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    var dx = e.clientX - drag.startX;

    if (drag.isHorizontal && Math.abs(dx) >= DRAG_THRESHOLD) {
      goTo(dx < 0 ? position + 1 : Math.max(0, position - 1));
    } else {
      slideTo(position, false);
    }

    resetDrag();
    if (!section.matches(':hover')) resume();
  });

  /* ── Trackpad / wheel horizontal swipe ───────────────────────── */

  var wheelAccum   = 0;
  var wheelTimer   = null;
  var wheelLocked  = false; /* one commit per gesture */

  viewport.addEventListener('wheel', function (e) {
    /* Ignore vertical-dominant scrolls (page scroll) */
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.5) return;

    e.preventDefault();
    pause();
    wheelAccum += e.deltaX;

    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () {
      if (!wheelLocked && Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
        wheelLocked = true;
        goTo(wheelAccum > 0 ? position + 1 : Math.max(0, position - 1));
      }
      wheelAccum  = 0;
      wheelLocked = false;
      if (!section.matches(':hover')) resume();
    }, 120);
  }, { passive: false });

  /* ── Keyboard: ArrowLeft / ArrowRight when section is focused ── */

  viewport.setAttribute('tabindex', '0');
  viewport.setAttribute('aria-label', 'Quotes carousel — use arrow keys to navigate');

  viewport.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(position + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(Math.max(0, position - 1)); }
  });

  /* ── Init ─────────────────────────────────────────────────────── */

  /* On mobile the viewport scrolls natively; don't run JS carousel */
  if (isMobile) return;

  slideTo(0, true);
  tick(DURATION);

}());
