(function () {
  'use strict';

  const playLink = document.querySelector('.thanks__pong-link');
  const overlay  = document.getElementById('pong-overlay');
  const canvas   = document.getElementById('pong-canvas');
  if (!playLink || !overlay || !canvas) return;

  const ctx = canvas.getContext('2d');

  // ── Game config ──────────────────────────────────────────────
  const LEVELS = [
    { ballSpeed: 8.5,  aiSpeed: 5.5,  speedCap: 19, serveDelay: 600 },
    { ballSpeed: 11,   aiSpeed: 7.65, speedCap: 25, serveDelay: 400 },
    { ballSpeed: 14,   aiSpeed: 10.2, speedCap: 32, serveDelay: 250 },
  ];
  const KB_SPEED        = 7;
  const PADDLE_W_PCT    = 0.045;
  const PADDLE_H_PCT    = 0.262;
  const BALL_SIZE_PCT   = 0.044;
  const AI_ERROR_FACTOR = [0.63, 0.35, 0.14];

  const SAFE_TOP    = 90;
  const SAFE_BOTTOM = 80;
  const SCRIM       = 0.92;
  const EXIT_DURATION = 1500;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Intro timeline (ms from click) ───────────────────────────
  const T = reducedMotion
    ? {
        HINT_START:      0,
        HINT_FADE:       200,
        DIGIT_FADE_IN:   0,
        DIGIT_HOLD:      350,
        DIGIT_CROSSFADE: 0,
        REVEAL_DURATION: 0,
      }
    : {
        HINT_START:      200,
        HINT_FADE:       400,
        DIGIT_FADE_IN:   400,
        DIGIT_HOLD:      700,
        DIGIT_CROSSFADE: 300,
        REVEAL_DURATION: 600,
      };

  T.BEAT1_END   = T.DIGIT_FADE_IN + T.DIGIT_HOLD;
  T.BEAT2_END   = T.BEAT1_END + T.DIGIT_CROSSFADE + T.DIGIT_HOLD;
  T.REVEAL_START = T.BEAT2_END + T.DIGIT_CROSSFADE + T.DIGIT_HOLD;
  T.PLAY_START  = T.REVEAL_START + T.REVEAL_DURATION;

  // ── State ────────────────────────────────────────────────────
  let levelIndex = Math.min(2, Math.max(0, parseInt(localStorage.getItem('luna-pong-level') || '0', 10)));
  let W = 0, H = 0;
  let running       = false;
  let paused        = false;
  let serving       = true;
  let timelineStart = 0;
  let playStarted   = false;
  let serveTimer    = null;
  let rafId         = null;
  let mouseY        = -1;
  let keys          = {};
  let scores        = { left: 0, right: 0 };
  let aiErrorOffset = 0;

  let leftPaddle  = { x: 0, y: 0, w: 0, h: 0 };
  let rightPaddle = { x: 0, y: 0, w: 0, h: 0 };
  let ball        = { x: 0, y: 0, size: 0, vx: 0, vy: 0 };

  // ── Easing ───────────────────────────────────────────────────
  function clamp(t) { return Math.min(1, Math.max(0, t)); }
  function easeOutCubic(t)  { t = clamp(t); return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t)   { t = clamp(t); return t * t * t; }
  function easeInOutCubic(t) {
    t = clamp(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ── Colors ───────────────────────────────────────────────────
  function getColors() {
    const s = getComputedStyle(document.documentElement);
    return {
      bg:     s.getPropertyValue('--color-neutral-bg').trim()        || '#fefaf1',
      accent: s.getPropertyValue('--color-accent-bg').trim()         || '#d93a3e',
      ball:   s.getPropertyValue('--color-accent-bg-subtle').trim()  || '#fedb97',
      text:   s.getPropertyValue('--color-neutral-fg-strong').trim() || '#09070d',
    };
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r)) return `rgba(9,7,13,${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function elapsedMs() {
    return timelineStart > 0 ? performance.now() - timelineStart : 0;
  }

  // ── Timeline helpers ─────────────────────────────────────────
  function hintAlpha(elapsed) {
    const peak = 0.38;
    if (elapsed < T.HINT_START) return 0;
    if (elapsed < T.HINT_START + T.HINT_FADE) {
      return peak * easeOutCubic((elapsed - T.HINT_START) / T.HINT_FADE);
    }
    if (elapsed < T.REVEAL_START) return peak;
    if (elapsed < T.PLAY_START) {
      return peak * (1 - easeOutCubic((elapsed - T.REVEAL_START) / T.REVEAL_DURATION));
    }
    return 0;
  }

  function scrimAlpha(elapsed) {
    if (elapsed < T.REVEAL_START) return SCRIM;
    if (elapsed < T.PLAY_START) {
      return SCRIM * (1 - easeOutCubic((elapsed - T.REVEAL_START) / T.REVEAL_DURATION));
    }
    return 0;
  }

  function courtAlpha(elapsed) {
    if (elapsed < T.REVEAL_START) return 0;
    if (elapsed < T.PLAY_START) {
      return easeOutCubic((elapsed - T.REVEAL_START) / T.REVEAL_DURATION);
    }
    return 1;
  }

  // Returns [{ text, alpha }] — may contain two entries during crossfade
  function countdownDigits(elapsed) {
    if (elapsed >= T.REVEAL_START) return [];

    if (elapsed < T.BEAT1_END) {
      const a = elapsed < T.DIGIT_FADE_IN
        ? easeOutCubic(elapsed / Math.max(T.DIGIT_FADE_IN, 1))
        : 1;
      return [{ text: '3', alpha: a }];
    }

    if (elapsed < T.BEAT1_END + T.DIGIT_CROSSFADE) {
      const p = (elapsed - T.BEAT1_END) / Math.max(T.DIGIT_CROSSFADE, 1);
      const e = T.DIGIT_CROSSFADE > 0 ? easeInOutCubic(p) : 1;
      return [{ text: '3', alpha: 1 - e }, { text: '2', alpha: e }];
    }

    if (elapsed < T.BEAT2_END) {
      return [{ text: '2', alpha: 1 }];
    }

    if (elapsed < T.BEAT2_END + T.DIGIT_CROSSFADE) {
      const p = (elapsed - T.BEAT2_END) / Math.max(T.DIGIT_CROSSFADE, 1);
      const e = T.DIGIT_CROSSFADE > 0 ? easeInOutCubic(p) : 1;
      return [{ text: '2', alpha: 1 - e }, { text: '1', alpha: e }];
    }

    return [{ text: '1', alpha: 1 }];
  }

  // ── Enter / exit ─────────────────────────────────────────────
  function enter() {
    scores        = { left: 0, right: 0 };
    paused        = false;
    serving       = true;
    playStarted   = false;
    mouseY        = -1;
    keys          = {};
    running       = true;
    timelineStart = performance.now();

    document.body.classList.add('pong-active');
    overlay.removeAttribute('aria-hidden');
    if (window.__lenis) window.__lenis.stop();

    layoutCourt();
    rafId = requestAnimationFrame(loop);
  }

  function exit() {
    running       = false;
    timelineStart = 0;
    playStarted   = false;
    cancelAnimationFrame(rafId);
    clearTimeout(serveTimer);

    document.body.classList.remove('pong-active');
    overlay.setAttribute('aria-hidden', 'true');

    setTimeout(() => {
      if (window.__lenis) window.__lenis.start();
    }, reducedMotion ? 0 : EXIT_DURATION);
  }

  playLink.addEventListener('click', (e) => {
    e.preventDefault();
    enter();
  });

  // ── Physics helpers ──────────────────────────────────────────
  function capSpeed() {
    const cap = LEVELS[levelIndex].speedCap;
    const mag = Math.hypot(ball.vx, ball.vy);
    if (mag > cap) {
      ball.vx = (ball.vx / mag) * cap;
      ball.vy = (ball.vy / mag) * cap;
    }
  }

  function randomizeAiError() {
    const factor = AI_ERROR_FACTOR[levelIndex];
    aiErrorOffset = (Math.random() - 0.5) * rightPaddle.h * factor * 2;
  }

  function resetBall(direction, immediate) {
    ball.x  = W / 2 - ball.size / 2;
    ball.y  = H / 2 - ball.size / 2;
    ball.vx = 0;
    ball.vy = 0;
    serving = true;
    clearTimeout(serveTimer);
    randomizeAiError();
    const delay = immediate ? 0 : LEVELS[levelIndex].serveDelay;
    serveTimer = setTimeout(() => {
      serving = false;
      const angle = Math.random() * 0.5 - 0.25;
      const spd   = LEVELS[levelIndex].ballSpeed;
      ball.vx = direction * spd * Math.cos(angle);
      ball.vy = spd * Math.sin(angle);
    }, delay);
  }

  function beginPlay() {
    if (playStarted) return;
    playStarted = true;
    resetBall(1, false);
  }

  // ── Layout (no serve timer during intro) ─────────────────────
  function layoutCourt() {
    W = overlay.clientWidth;
    H = overlay.clientHeight;
    canvas.width  = W;
    canvas.height = H;

    const isNarrow = W < 520;
    const pm = isNarrow ? 1.15 : 1;
    const bm = isNarrow ? 1.1  : 1;
    const pw = Math.round(W * PADDLE_W_PCT * pm);
    const ph = Math.round(H * PADDLE_H_PCT * pm);
    const bs = Math.round(W * BALL_SIZE_PCT * bm);

    leftPaddle.w  = pw; leftPaddle.h = ph; leftPaddle.x = 0;
    rightPaddle.w = pw; rightPaddle.h = ph; rightPaddle.x = W - pw;
    leftPaddle.y  = H / 2 - ph / 2;
    rightPaddle.y = H / 2 - ph / 2;
    ball.size     = bs;
    ball.x        = W / 2 - bs / 2;
    ball.y        = H / 2 - bs / 2;
    ball.vx = 0;
    ball.vy = 0;
  }

  const ro = new ResizeObserver(() => { if (running) layoutCourt(); });
  ro.observe(overlay);

  // ── Input ────────────────────────────────────────────────────
  function yFromClientY(clientY) {
    return clientY - canvas.getBoundingClientRect().top;
  }

  window.addEventListener('mousemove', (e) => {
    if (!running) return;
    mouseY = yFromClientY(e.clientY);
  });

  overlay.addEventListener('mouseleave', () => { mouseY = -1; });

  overlay.addEventListener('pointerdown', (e) => {
    if (!running || e.pointerType === 'mouse') return;
    e.preventDefault();
    mouseY = yFromClientY(e.clientY);
    try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
  }, { passive: false });

  overlay.addEventListener('pointermove', (e) => {
    if (!running || e.pointerType === 'mouse') return;
    e.preventDefault();
    mouseY = yFromClientY(e.clientY);
  }, { passive: false });

  if (!window.PointerEvent) {
    canvas.addEventListener('touchstart', (e) => {
      if (!running) return;
      e.preventDefault();
      if (e.touches[0]) mouseY = yFromClientY(e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!running) return;
      e.preventDefault();
      if (e.touches[0]) mouseY = yFromClientY(e.touches[0].clientY);
    }, { passive: false });
  }

  window.addEventListener('keydown', (e) => {
    if (!running) return;
    keys[e.code] = true;
    if (playStarted && (e.code === 'Space' || e.code === 'KeyP')) {
      e.preventDefault();
      paused = !paused;
    }
    if (e.code === 'Escape') exit();
    if (playStarted && e.code === 'KeyZ') setLevel(levelIndex - 1);
    if (playStarted && e.code === 'KeyX') setLevel(levelIndex + 1);
  });
  window.addEventListener('keyup', (e) => { delete keys[e.code]; });

  function setLevel(newIndex) {
    const old = LEVELS[levelIndex];
    levelIndex = Math.min(2, Math.max(0, newIndex));
    const nw = LEVELS[levelIndex];
    if (!serving) {
      const ratio = nw.ballSpeed / old.ballSpeed;
      ball.vx *= ratio;
      ball.vy *= ratio;
      capSpeed();
    }
    localStorage.setItem('luna-pong-level', levelIndex);
  }

  // ── Update ───────────────────────────────────────────────────
  function update() {
    const elapsed = elapsedMs();

    if (elapsed >= T.PLAY_START) beginPlay();

    if (mouseY >= 0) {
      leftPaddle.y = mouseY - leftPaddle.h / 2;
    } else {
      if (keys['ArrowUp'])   leftPaddle.y -= KB_SPEED;
      if (keys['ArrowDown']) leftPaddle.y += KB_SPEED;
    }
    leftPaddle.y = Math.max(0, Math.min(H - leftPaddle.h, leftPaddle.y));

    if (!playStarted || paused || serving) return;

    if (ball.vx > 0) {
      const target = (ball.y + ball.size / 2) + aiErrorOffset - (rightPaddle.h / 2);
      const diff   = target - rightPaddle.y;
      if (Math.abs(diff) > 1) {
        rightPaddle.y += Math.sign(diff) * Math.min(LEVELS[levelIndex].aiSpeed, Math.abs(diff));
      }
    }
    rightPaddle.y = Math.max(0, Math.min(H - rightPaddle.h, rightPaddle.y));

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= 0)             { ball.y = 0;             ball.vy =  Math.abs(ball.vy); }
    if (ball.y + ball.size >= H) { ball.y = H - ball.size; ball.vy = -Math.abs(ball.vy); }

    const ballCx = ball.x + ball.size / 2;
    const ballCy = ball.y + ball.size / 2;

    if (ball.vx < 0 &&
        ball.x             < leftPaddle.x + leftPaddle.w &&
        ball.x + ball.size > leftPaddle.x &&
        ballCy             > leftPaddle.y &&
        ballCy             < leftPaddle.y + leftPaddle.h) {
      ball.x = leftPaddle.x + leftPaddle.w;
      const relY = ((ballCy - leftPaddle.y) / leftPaddle.h) - 0.5;
      ball.vx    = Math.abs(ball.vx) * 1.04;
      ball.vy    = relY * LEVELS[levelIndex].ballSpeed * 2.2;
      capSpeed();
      randomizeAiError();
    }

    if (ball.vx > 0 &&
        ball.x + ball.size > rightPaddle.x &&
        ball.x             < rightPaddle.x + rightPaddle.w &&
        ballCy             > rightPaddle.y &&
        ballCy             < rightPaddle.y + rightPaddle.h) {
      ball.x = rightPaddle.x - ball.size;
      const relY = ((ballCy - rightPaddle.y) / rightPaddle.h) - 0.5;
      ball.vx    = -Math.abs(ball.vx) * 1.04;
      ball.vy    = relY * LEVELS[levelIndex].ballSpeed * 2.2;
      capSpeed();
    }

    if (ball.x + ball.size < 0) { scores.right = Math.min(999, scores.right + 1); resetBall(1,  false); }
    if (ball.x > W)             { scores.left  = Math.min(999, scores.left  + 1); resetBall(-1, false); }
  }

  // ── Draw helpers ─────────────────────────────────────────────
  function drawCourt(c, alpha) {
    if (alpha <= 0.001) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.setLineDash([8, 10]);
    ctx.lineWidth   = 4;
    ctx.strokeStyle = hexToRgba(c.text, 0.10);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    const scoreSize = W < 480 ? 12 : 18;
    ctx.font         = `${scoreSize}px 'Space Mono', monospace`;
    ctx.fillStyle    = c.accent;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(scores.left).padStart(3, '0'),  W / 4,     SAFE_TOP);
    ctx.fillText(String(scores.right).padStart(3, '0'), 3 * W / 4, SAFE_TOP);

    ctx.fillStyle = c.accent;
    ctx.fillRect(leftPaddle.x,  leftPaddle.y,  leftPaddle.w, leftPaddle.h);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);

    ctx.fillStyle = c.ball;
    ctx.fillRect(ball.x, ball.y, ball.size, ball.size);

    ctx.restore();
  }

  function drawScrim(alpha) {
    if (alpha <= 0.001) return;
    ctx.fillStyle = `rgba(254,250,241,${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCountdownDigits(digits, c) {
    const cdSize = W < 480 ? 48 : 72;
    ctx.font         = `${cdSize}px 'Space Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    for (const { text, alpha } of digits) {
      if (alpha <= 0.001) continue;
      ctx.fillStyle = hexToRgba(c.accent, alpha);
      ctx.fillText(text, W / 2, H / 2);
    }
  }

  function drawIntroHint(c, alpha) {
    if (alpha <= 0.001) return;
    const hintSize = W < 480 ? 10 : 12;
    ctx.font         = `${hintSize}px 'Space Mono', monospace`;
    ctx.fillStyle    = hexToRgba(c.text, alpha);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('space — pause  ·  esc — exit', W / 2, H / 2 - 64);
  }

  function drawPlayHint(c, pausedNow) {
    const hintY = H - SAFE_BOTTOM;
    ctx.font         = `10px 'Space Mono', monospace`;
    ctx.fillStyle    = hexToRgba(c.text, 0.25);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      pausedNow ? 'space — resume  ·  esc — exit' : 'space — pause  ·  esc — exit',
      W / 2,
      hintY
    );
  }

  // ── Draw ─────────────────────────────────────────────────────
  function draw() {
    const c       = getColors();
    const elapsed = elapsedMs();
    const courtA  = courtAlpha(elapsed);
    const scrimA  = scrimAlpha(elapsed);
    const hintA   = hintAlpha(elapsed);
    const digits  = countdownDigits(elapsed);
    const scoreSize = W < 480 ? 12 : 18;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    drawCourt(c, courtA);
    drawScrim(scrimA);

    if (digits.length) drawCountdownDigits(digits, c);
    if (hintA > 0) drawIntroHint(c, hintA);

    if (playStarted && serving && !paused) {
      ctx.font         = `${scoreSize}px 'Space Mono', monospace`;
      ctx.fillStyle    = hexToRgba(c.accent, 0.45 * courtA);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('• • •', W / 2, H / 2 + ball.size * 2);
    }

    if (paused) {
      ctx.fillStyle = `rgba(254,250,241,${(0.88 * Math.max(courtA, 1)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.font         = `${scoreSize}px 'Space Mono', monospace`;
      ctx.fillStyle    = c.accent;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', W / 2, H / 2);
    }

    if (playStarted && hintA <= 0) drawPlayHint(c, paused);
  }

  // ── Loop ─────────────────────────────────────────────────────
  function loop() {
    if (!running) return;
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }
})();
