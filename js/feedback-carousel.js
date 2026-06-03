/**
 * Feedback section — timed carousel.
 *
 * Cross-fades one quote at a time on a fixed interval. A thin progress bar
 * fills left-to-right as the timer counts down. Hovering or focusing inside
 * the section pauses both the timer and the bar exactly where they are;
 * leaving resumes from that point.
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

  /* ── Custom cursor with proximity ──────────────────────────────── */

  var cursor = null;
  var CURSOR_THRESHOLD = 60; // px beyond inner's edges

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    cursor = document.createElement('div');
    cursor.className = 'feedback-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = 'next →';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', function (e) {
      var rect = inner.getBoundingClientRect();

      var dx   = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      var dy   = Math.max(rect.top  - e.clientY, 0, e.clientY - rect.bottom);
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CURSOR_THRESHOLD) {
        var isLeft = e.clientX < rect.left + rect.width / 2;
        cursor.textContent = isLeft ? '← prev' : 'next →';
        cursor.style.setProperty('--fc-x', (e.clientX + 14) + 'px');
        cursor.style.setProperty('--fc-y', (e.clientY - 28) + 'px');
        cursor.classList.add('is-visible');
      } else {
        cursor.classList.remove('is-visible');
      }
    }, { passive: true });
  }

  /* ── Click to advance / go back ─────────────────────────────────── */

  block.addEventListener('click', function (e) {
    var rect   = block.getBoundingClientRect();
    var isLeft = e.clientX < rect.left + rect.width / 2;
    var next   = isLeft
      ? (current - 1 + cards.length) % cards.length
      : (current + 1) % cards.length;

    showCard(next);
    restartBar();
    tick(DURATION);
  });

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
