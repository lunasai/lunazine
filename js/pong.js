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

  // Chrome safe zone: fixed header/footer sit at 40px inset + ~30px height.
  const SAFE_TOP    = 90;
  const SAFE_BOTTOM = 80;

  // ── Transition timing ────────────────────────────────────────
  // ENTER_DELAY: how long after enter() before countdown starts.
  // Lets the CSS overlay fade-in (1.5 s) mostly complete before the
  // first number appears, so both animations overlap gracefully.
  const ENTER_DELAY    = 900;   // ms
  const BEAT_DURATION  = 1100;  // ms per countdown digit
  const BEAT_FADE_IN   = 320;   // ms — digit rises in
  const BEAT_FADE_OUT  = 320;   // ms — digit fades out before next
  const EXIT_DURATION  = 1500;  // ms — matches CSS overlay fade-out

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── State ────────────────────────────────────────────────────
  let levelIndex = Math.min(2, Math.max(0, parseInt(localStorage.getItem('luna-pong-level') || '0', 10)));
  let W = 0, H = 0;
  let running          = false;
  let paused           = false;
  let serving          = true;
  let countdown        = 0;    // 3 → 2 → 1 → 0 (game live)
  let countdownBeatStart = 0;  // performance.now() when current digit appeared
  let enterTimer       = null;
  let countdownTimer   = null;
  let serveTimer       = null;
  let rafId            = null;
  let mouseY           = -1;
  let keys             = {};
  let scores           = { left: 0, right: 0 };
  let aiErrorOffset    = 0;

  let leftPaddle  = { x: 0, y: 0, w: 0, h: 0 };
  let rightPaddle = { x: 0, y: 0, w: 0, h: 0 };
  let ball        = { x: 0, y: 0, size: 0, vx: 0, vy: 0 };

  // ── Easing ───────────────────────────────────────────────────
  function easeOutCubic(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }
  function easeInCubic(t)  { return Math.pow(Math.min(1, Math.max(0, t)), 3); }

  // ── Colors (reads live from CSS tokens) ─────────────────────
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

  // ── Countdown ────────────────────────────────────────────────
  function startCountdown() {
    countdown          = 3;
    countdownBeatStart = performance.now();
    serving            = true;
    clearTimeout(countdownTimer);

    const beatMs = reducedMotion ? 600 : BEAT_DURATION;

    function tick() {
      countdown -= 1;
      if (countdown <= 0) {
        countdown = 0;
        resetBall(1, false);
      } else {
        countdownBeatStart = performance.now();
        countdownTimer = setTimeout(tick, beatMs);
      }
    }
    countdownTimer = setTimeout(tick, beatMs);
  }

  // Alpha for the current countdown digit, derived every draw frame
  // from how far through the beat we are.
  function countdownAlpha() {
    if (reducedMotion) return 1;
    const elapsed = performance.now() - countdownBeatStart;
    if (elapsed < BEAT_FADE_IN) {
      return easeOutCubic(elapsed / BEAT_FADE_IN);
    }
    if (elapsed > BEAT_DURATION - BEAT_FADE_OUT) {
      return 1 - easeInCubic((elapsed - (BEAT_DURATION - BEAT_FADE_OUT)) / BEAT_FADE_OUT);
    }
    return 1;
  }

  // ── Enter / exit ─────────────────────────────────────────────
  function enter() {
    scores  = { left: 0, right: 0 };
    paused  = false;
    mouseY  = -1;
    keys    = {};
    running = true;

    document.body.classList.add('pong-active');
    overlay.removeAttribute('aria-hidden');
    if (window.__lenis) window.__lenis.stop();

    resize();
    rafId = requestAnimationFrame(loop);

    // Delay countdown so it emerges as the overlay finishes fading in
    clearTimeout(enterTimer);
    enterTimer = setTimeout(startCountdown, reducedMotion ? 0 : ENTER_DELAY);
  }

  function exit() {
    running = false;
    clearTimeout(serveTimer);
    clearTimeout(countdownTimer);
    clearTimeout(enterTimer);
    countdown = 0;

    document.body.classList.remove('pong-active');
    overlay.setAttribute('aria-hidden', 'true');

    // Keep lenis paused until overlay has finished fading out
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

  // ── Resize ───────────────────────────────────────────────────
  function resize() {
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
    leftPaddle.y  = Math.min(leftPaddle.y,  H - ph);
    rightPaddle.y = Math.min(rightPaddle.y, H - ph);
    ball.size = bs;

    resetBall(1, true);
  }

  const ro = new ResizeObserver(() => { if (running) resize(); });
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
    if (e.code === 'Space' || e.code === 'KeyP') {
      e.preventDefault();
      paused = !paused;
    }
    if (e.code === 'Escape') exit();
    if (e.code === 'KeyZ') setLevel(levelIndex - 1);
    if (e.code === 'KeyX') setLevel(levelIndex + 1);
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
    if (mouseY >= 0) {
      leftPaddle.y = mouseY - leftPaddle.h / 2;
    } else {
      if (keys['ArrowUp'])   leftPaddle.y -= KB_SPEED;
      if (keys['ArrowDown']) leftPaddle.y += KB_SPEED;
    }
    leftPaddle.y = Math.max(0, Math.min(H - leftPaddle.h, leftPaddle.y));

    if (paused || serving || countdown > 0) return;

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

  // ── Draw ─────────────────────────────────────────────────────
  function draw() {
    const c = getColors();
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Center dashed divider
    ctx.save();
    ctx.setLineDash([8, 10]);
    ctx.lineWidth   = 4;
    ctx.strokeStyle = hexToRgba(c.text, 0.10);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();

    // Scores
    const scoreSize = W < 480 ? 12 : 18;
    ctx.font         = `${scoreSize}px 'Space Mono', monospace`;
    ctx.fillStyle    = c.accent;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(scores.left).padStart(3, '0'),  W / 4,     SAFE_TOP);
    ctx.fillText(String(scores.right).padStart(3, '0'), 3 * W / 4, SAFE_TOP);

    // Paddles
    ctx.fillStyle = c.accent;
    ctx.fillRect(leftPaddle.x,  leftPaddle.y,  leftPaddle.w, leftPaddle.h);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);

    // Ball
    ctx.fillStyle = c.ball;
    ctx.fillRect(ball.x, ball.y, ball.size, ball.size);

    // Serve dots
    if (serving && !paused && countdown === 0) {
      ctx.font         = `${scoreSize}px 'Space Mono', monospace`;
      ctx.fillStyle    = hexToRgba(c.accent, 0.45);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('• • •', W / 2, H / 2 + ball.size * 2);
    }

    // ── Countdown overlay ───────────────────────────────────────
    // Alpha is computed per-frame from elapsed time within the beat,
    // so the digit eases in and out smoothly without setInterval flicker.
    if (countdown > 0) {
      const a = countdownAlpha();

      // Scrim: cream tint that fades with the digit
      ctx.fillStyle = `rgba(254,250,241,${(0.88 * a).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);

      // Controls hint — appears above the digit
      const hintSize = W < 480 ? 10 : 12;
      ctx.font         = `${hintSize}px 'Space Mono', monospace`;
      ctx.fillStyle    = hexToRgba(c.text, 0.38 * a);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('space — pause  ·  esc — exit', W / 2, H / 2 - 64);

      // Digit — scales very slightly on entry for presence
      const cdSize   = W < 480 ? 48 : 72;
      const scale    = reducedMotion ? 1 : 0.88 + 0.12 * easeOutCubic(
        Math.min(1, (performance.now() - countdownBeatStart) / BEAT_FADE_IN)
      );
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(scale, scale);
      ctx.font         = `${cdSize}px 'Space Mono', monospace`;
      ctx.fillStyle    = hexToRgba(c.accent, a);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(countdown), 0, 0);
      ctx.restore();
    }

    // ── Pause overlay ───────────────────────────────────────────
    if (paused) {
      ctx.fillStyle = 'rgba(254,250,241,0.88)';
      ctx.fillRect(0, 0, W, H);
      ctx.font         = `${scoreSize}px 'Space Mono', monospace`;
      ctx.fillStyle    = c.accent;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', W / 2, H / 2);
    }

    // Commands hint (game + pause; hidden during countdown)
    if (countdown === 0) {
      const hintY = H - SAFE_BOTTOM;
      ctx.font         = `10px 'Space Mono', monospace`;
      ctx.fillStyle    = hexToRgba(c.text, 0.25);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        paused ? 'space — resume  ·  esc — exit' : 'space — pause  ·  esc — exit',
        W / 2,
        hintY
      );
    }
  }

  // ── Loop ─────────────────────────────────────────────────────
  function loop() {
    if (!running) return;
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }
})();
