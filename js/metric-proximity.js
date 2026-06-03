/**
 * Proximity hover for work section metric items.
 *
 * Adds .is-near when the cursor approaches within THRESHOLD px of an item's
 * edges — triggering the fill animation early so it feels ready on arrival.
 * Once the cursor lands on the element, :hover takes over and .is-near is
 * dropped. On exit, proximity is suppressed until the cursor has fully left
 * the zone, so the fill retreats the moment the cursor leaves the element.
 *
 * Only active on pointer:fine devices. Touch falls back to plain :hover.
 */

(function () {
  const THRESHOLD = 40;

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let items = [];
  const wasHovered = new WeakMap();

  function collectItems() {
    items = Array.from(
      document.querySelectorAll('.section--work .metric-item')
    );
    for (const el of items) wasHovered.set(el, false);
  }

  function edgeDistance(rect, mx, my) {
    const dx = Math.max(rect.left - mx, 0, mx - rect.right);
    const dy = Math.max(rect.top - my, 0, my - rect.bottom);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onMouseMove(e) {
    const mx = e.clientX;
    const my = e.clientY;

    for (const el of items) {
      const rect = el.getBoundingClientRect();
      const dist = edgeDistance(rect, mx, my);
      const onElement = dist === 0;

      if (onElement) {
        // Cursor is on the element — hand off to :hover, clear proximity
        el.classList.remove('is-near');
        wasHovered.set(el, true);
      } else if (wasHovered.get(el)) {
        // Leaving — suppress proximity until fully outside the zone
        el.classList.remove('is-near');
        if (dist >= THRESHOLD) wasHovered.set(el, false);
      } else {
        // Approaching fresh — trigger early
        el.classList.toggle('is-near', dist < THRESHOLD);
      }
    }
  }

  function onSectionLeave() {
    for (const el of items) {
      el.classList.remove('is-near');
      wasHovered.set(el, false);
    }
  }

  function init() {
    collectItems();
    if (!items.length) return;

    document.addEventListener('mousemove', onMouseMove, { passive: true });

    const section = document.querySelector('.section--work');
    if (section) section.addEventListener('mouseleave', onSectionLeave);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
