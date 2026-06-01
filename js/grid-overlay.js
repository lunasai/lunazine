/**
 * Luna Borgo — Grid Overlay  (dev-only tool)
 * js/grid-overlay.js
 *
 * Builds the 12-column grid overlay DOM and wires up the toggle.
 *
 * Controls:
 *   • Press  G  anywhere on the page (not while focused in an input)
 *   • Click the badge in the bottom-right corner
 *
 * State persists in sessionStorage so the overlay survives
 * page refreshes during a dev session.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'lb-grid-overlay-visible';
  const COL_COUNT = 12;

  /* ── Build overlay ──────────────────────────────────────────── */

  const overlay = document.createElement('div');
  overlay.id = 'grid-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('role', 'presentation');

  const colGrid = document.createElement('div');
  colGrid.className = 'grid-overlay__cols';

  for (let i = 1; i <= COL_COUNT; i++) {
    const col = document.createElement('div');
    col.className = 'grid-overlay__col';

    const label = document.createElement('span');
    label.className = 'grid-overlay__col-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = i;

    col.appendChild(label);
    colGrid.appendChild(col);
  }

  overlay.appendChild(colGrid);
  document.body.appendChild(overlay);

  /* ── Viewport label helpers ─────────────────────────────────── */

  const BREAKPOINTS = [
    { name: 'x-small', max: 480 },
    { name: 'small',   max: 768 },
    { name: 'medium',  max: 1024 },
    { name: 'large',   max: 1919 },
    { name: 'x-large', max: Infinity },
  ];

  function getBreakpoint(w) {
    return BREAKPOINTS.find(function (bp) { return w <= bp.max; }).name;
  }

  /* ── Build toggle badge ─────────────────────────────────────── */

  const badge = document.createElement('button');
  badge.id = 'grid-overlay-badge';
  badge.type = 'button';
  badge.setAttribute('aria-label', 'Toggle grid overlay (press G)');
  badge.setAttribute('title', 'Toggle grid overlay (G)');

  const bpLabel = document.createElement('span');
  bpLabel.className = 'grid-overlay-badge__bp';

  const pxLabel = document.createElement('span');
  pxLabel.className = 'grid-overlay-badge__px';

  badge.innerHTML =
    '<span class="grid-overlay-badge__dot" aria-hidden="true"></span>' +
    'Grid' +
    '<span class="grid-overlay-badge__key" aria-hidden="true">G</span>' +
    '<span class="grid-overlay-badge__sep" aria-hidden="true"></span>';

  const viewport = document.createElement('span');
  viewport.className = 'grid-overlay-badge__viewport';
  viewport.setAttribute('aria-hidden', 'true');
  viewport.appendChild(bpLabel);
  viewport.appendChild(pxLabel);
  badge.appendChild(viewport);

  document.body.appendChild(badge);

  function updateViewportLabel() {
    var w = window.innerWidth;
    bpLabel.textContent = getBreakpoint(w);
    pxLabel.textContent = w + 'px';
  }

  updateViewportLabel();
  window.addEventListener('resize', updateViewportLabel);

  /* ── State management ───────────────────────────────────────── */

  let visible = sessionStorage.getItem(STORAGE_KEY) === 'true';

  function setVisible(next) {
    visible = next;
    overlay.classList.toggle('is-visible', visible);
    badge.classList.toggle('is-active', visible);
    badge.setAttribute('aria-pressed', visible);
    try {
      sessionStorage.setItem(STORAGE_KEY, visible);
    } catch (_) {
      // sessionStorage unavailable — silently ignore
    }
  }

  /* Initialise from persisted state */
  setVisible(visible);

  /* ── Event listeners ────────────────────────────────────────── */

  badge.addEventListener('click', function () {
    setVisible(!visible);
  });

  document.addEventListener('keydown', function (e) {
    /* Skip when a text field is focused */
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (document.activeElement && document.activeElement.isContentEditable) return;

    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      setVisible(!visible);
    }
  });
})();
