/**
 * Work metrics — ASCII letter scramble on row hover (.is-near).
 * Visible text nodes lock left → right; sr-only copy is left untouched.
 */

(function () {
  "use strict";

  var DURATION_MS = 480;
  var CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#@$%&*-_+=<>/";

  var canAnimate =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canAnimate) return;

  var running = new Map();

  function randomChar() {
    return CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }

  function collectSegments(textEl) {
    var segments = [];
    var walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(".sr-only")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var node;
    while ((node = walker.nextNode())) {
      segments.push({
        node: node,
        value: node.nodeValue,
      });
    }

    return segments;
  }

  function totalLength(segments) {
    var n = 0;
    for (var i = 0; i < segments.length; i++) {
      n += segments[i].value.length;
    }
    return n;
  }

  function restoreSegments(segments) {
    for (var i = 0; i < segments.length; i++) {
      segments[i].node.nodeValue = segments[i].value;
    }
  }

  function renderFrame(state, lockedCount) {
    var idx = 0;

    for (var s = 0; s < state.segments.length; s++) {
      var seg = state.segments[s];
      var out = "";

      for (var c = 0; c < seg.value.length; c++) {
        var ch = seg.value.charAt(c);
        if (idx < lockedCount) {
          out += ch;
        } else if (ch === " ") {
          out += " ";
        } else {
          out += randomChar();
        }
        idx += 1;
      }

      seg.node.nodeValue = out;
    }
  }

  function stop(textEl) {
    var state = running.get(textEl);
    if (!state) return;

    if (state.rafId) window.cancelAnimationFrame(state.rafId);
    restoreSegments(state.segments);
    running.delete(textEl);
    textEl.classList.remove("is-scrambling");
  }

  function tick(textEl) {
    var state = running.get(textEl);
    if (!state) return;

    var elapsed = performance.now() - state.start;
    var progress = Math.min(1, elapsed / state.duration);
    var lockedCount = Math.floor(progress * state.total);

    renderFrame(state, lockedCount);

    if (progress >= 1) {
      restoreSegments(state.segments);
      running.delete(textEl);
      textEl.classList.remove("is-scrambling");
      return;
    }

    state.rafId = window.requestAnimationFrame(function () {
      tick(textEl);
    });
  }

  function start(textEl) {
    stop(textEl);

    var segments = collectSegments(textEl);
    if (!segments.length) return;

    var state = {
      segments: segments,
      total: totalLength(segments),
      duration: DURATION_MS,
      start: performance.now(),
      rafId: 0,
    };

    running.set(textEl, state);
    textEl.classList.add("is-scrambling");
    tick(textEl);
  }

  function onClassChange(item) {
    var textEl = item.querySelector(".metric-item__text");
    if (!textEl) return;

    if (item.classList.contains("is-near")) {
      start(textEl);
    } else {
      stop(textEl);
    }
  }

  function watchItem(item) {
    onClassChange(item);
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === "class") {
          onClassChange(item);
          break;
        }
      }
    });
    observer.observe(item, { attributes: true, attributeFilter: ["class"] });
  }

  function init() {
    var items = document.querySelectorAll(".section--work .metric-item");
    if (!items.length) return;
    items.forEach(watchItem);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
