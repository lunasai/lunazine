/**
 * Work section metric items — exactly one active row at a time.
 *
 * Hit targets are the row boxes only (not label overflow).
 * Adjacent rows use a midpoint seam so the active row does not flicker
 * at boundaries. Inter-row gaps keep the current row until the seam is crossed.
 * Pointer:fine only.
 *
 * Scroll support: Lenis drives scroll via CSS transform, so mousemove never
 * fires when the page moves under a stationary cursor. We track the last known
 * cursor position and re-run the proximity check on every Lenis scroll tick
 * (falling back to the native scroll event) so is-near stays accurate during
 * scroll-through, giving the same full hover effect as a direct mouse-over.
 */

(function () {
  "use strict";

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var CLEAR_DELAY_MS = 160;
  var HIT_SLOP_Y = 2; /* invisible extension above/below each row box */

  var metricsGroups = [];
  var active = null;
  var rafId = 0;
  var pendingEvent = null;
  var pendingList = null;
  var clearTimerId = 0;
  var refreshRafId = 0;

  /* Last known cursor position — null until the cursor has entered a metrics group */
  var lastMx = null;
  var lastMy = null;

  /* rAF guard for the scroll-driven re-evaluation path */
  var scrollRafId = 0;

  function refreshGroupRects(group) {
    group.rects = group.items.map(function (el) {
      return el.getBoundingClientRect();
    });
  }

  function refreshAllRects() {
    metricsGroups.forEach(refreshGroupRects);
  }

  function scheduleRefreshRects() {
    if (refreshRafId) return;
    refreshRafId = window.requestAnimationFrame(function () {
      refreshRafId = 0;
      refreshAllRects();
    });
  }

  function cancelClearTimer() {
    if (!clearTimerId) return;
    window.clearTimeout(clearTimerId);
    clearTimerId = 0;
  }

  function scheduleClear() {
    cancelClearTimer();
    clearTimerId = window.setTimeout(function () {
      clearTimerId = 0;
      setActive(null);
    }, CLEAR_DELAY_MS);
  }

  function setActive(next) {
    if (active === next) return;
    if (active) active.classList.remove("is-near");
    active = next;
    if (active) active.classList.add("is-near");
  }

  function pointerInside(rect, mx, my) {
    return (
      mx >= rect.left &&
      mx <= rect.right &&
      my >= rect.top &&
      my <= rect.bottom
    );
  }

  function rowHitRect(rect) {
    return {
      top: rect.top - HIT_SLOP_Y,
      bottom: rect.bottom + HIT_SLOP_Y,
      left: rect.left,
      right: rect.right,
    };
  }

  function rowDirectHit(group, mx, my) {
    var matchIdx = -1;
    var closestY = Infinity;

    for (var i = 0; i < group.items.length; i++) {
      if (!pointerInside(rowHitRect(group.rects[i]), mx, my)) continue;
      var rect = group.rects[i];
      var midY = (rect.top + rect.bottom) * 0.5;
      var distY = Math.abs(my - midY);
      if (distY < closestY) {
        closestY = distY;
        matchIdx = i;
      }
    }

    return matchIdx === -1 ? null : group.items[matchIdx];
  }

  function resolveWithSeam(group, directHit, my) {
    if (!active || active === directHit) return directHit;

    var activeIdx = group.items.indexOf(active);
    var hitIdx = group.items.indexOf(directHit);

    if (activeIdx === -1 || hitIdx === -1) return directHit;
    if (Math.abs(hitIdx - activeIdx) !== 1) return directHit;

    var aRect = group.rects[activeIdx];
    var hRect = group.rects[hitIdx];
    var seam = (aRect.bottom + hRect.top) * 0.5;

    if (hitIdx > activeIdx) {
      return my >= seam ? directHit : active;
    }
    return my <= seam ? directHit : active;
  }

  function pickItemInGroup(group, mx, my) {
    var directHit = rowDirectHit(group, mx, my);
    if (!directHit) return null;
    return resolveWithSeam(group, directHit, my);
  }

  function updateFromPointer(list, mx, my) {
    cancelClearTimer();
    var group = metricsGroups.find(function (g) {
      return g.list === list;
    });
    if (!group) return;

    refreshGroupRects(group);

    var hit = pickItemInGroup(group, mx, my);
    if (hit) {
      setActive(hit);
      return;
    }

    /* Gap inside this list — hold the current row if it belongs here */
    if (active && group.items.indexOf(active) !== -1) return;

    setActive(null);
  }

  function onDocMouseMove(e) {
    lastMx = e.clientX;
    lastMy = e.clientY;
  }

  function onMouseMove(e) {
    cancelClearTimer();
    pendingEvent = e;
    pendingList = e.currentTarget;
    if (rafId) return;
    rafId = window.requestAnimationFrame(function () {
      rafId = 0;
      var ev = pendingEvent;
      var list = pendingList;
      pendingEvent = null;
      pendingList = null;
      if (!ev || !list) return;
      updateFromPointer(list, ev.clientX, ev.clientY);
    });
  }

  /**
   * Re-evaluate which metric item is under the cursor after a scroll tick.
   * Lenis moves elements via transform so rects change without any mouse event.
   * We refresh all rects and re-run the hit test against the last known cursor
   * position. If the cursor is outside every group we clear the active state.
   */
  function onScroll() {
    if (lastMx === null) return; /* cursor has never entered a metrics group */
    if (scrollRafId) return;
    scrollRafId = window.requestAnimationFrame(function () {
      scrollRafId = 0;

      /* Cancel any pending mousemove work — scroll result takes precedence */
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
        pendingEvent = null;
        pendingList = null;
      }

      refreshAllRects();

      var mx = lastMx;
      var my = lastMy;
      var hit = null;

      for (var i = 0; i < metricsGroups.length; i++) {
        var group = metricsGroups[i];
        var candidate = pickItemInGroup(group, mx, my);
        if (candidate) {
          hit = candidate;
          break;
        }
      }

      if (hit) {
        cancelClearTimer();
        setActive(hit);
      } else {
        /* Cursor is not over any row — clear immediately (no delay needed   */
        /* because the page moved, not the cursor, so there is no seam risk) */
        cancelClearTimer();
        setActive(null);
      }
    });
  }

  function onMetricsLeave(e) {
    var related = e.relatedTarget;
    if (related && related.closest && related.closest(".work__metrics")) {
      return;
    }
    pendingEvent = null;
    pendingList = null;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    scheduleClear();
  }

  function onMetricsEnter(e) {
    cancelClearTimer();
    var group = metricsGroups.find(function (g) {
      return g.list === e.currentTarget;
    });
    if (group) refreshGroupRects(group);
  }

  function init() {
    var lists = Array.from(
      document.querySelectorAll(".section--work .work__metrics")
    );

    metricsGroups = lists
      .map(function (list) {
        var listItems = Array.from(list.querySelectorAll(".metric-item"));
        if (!listItems.length) return null;
        return { list: list, items: listItems, rects: [] };
      })
      .filter(Boolean);

    if (!metricsGroups.length) return;

    refreshAllRects();

    metricsGroups.forEach(function (group) {
      group.list.addEventListener("mouseenter", onMetricsEnter);
      group.list.addEventListener("mousemove", onMouseMove, { passive: true });
      group.list.addEventListener("mouseleave", onMetricsLeave);
    });

    document.addEventListener("mousemove", onDocMouseMove, { passive: true });
    window.addEventListener("resize", scheduleRefreshRects, { passive: true });

    /*
     * Lenis scrolls via CSS transform so native scroll events don't fire.
     * Hook into the Lenis instance if available; keep the native listener as
     * a fallback for environments without Lenis (or if the instance loads late).
     */
    function attachLenisScroll() {
      if (window.__lenis) {
        window.__lenis.on("scroll", onScroll);
        return true;
      }
      return false;
    }

    if (!attachLenisScroll()) {
      /* Lenis not yet initialised — retry once after scripts have settled */
      window.addEventListener(
        "load",
        function () {
          if (!attachLenisScroll()) {
            /* No Lenis at all — fall back to native scroll */
            window.addEventListener("scroll", onScroll, { passive: true });
          }
        },
        { once: true }
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
