(function () {
  'use strict';

  const playLink = document.querySelector('.thanks__pong-link');
  const overlay  = document.getElementById('pong-overlay');
  const canvas   = document.getElementById('pong-canvas');
  if (!playLink || !overlay || !canvas) return;

  const ctx = canvas.getContext('2d');

  // ── Game config ──────────────────────────────────────────────
  // Speeds are relative so the game feels the same at any viewport size:
  // ballSpeed/speedCap are court-widths per second, aiSpeed and KB_SPEED
  // are court-heights per second. Converted to px/s where applied.
  const LEVELS = [
    { ballSpeed: 0.55, aiSpeed: 0.60, speedCap: 1.10, serveDelay: 600 },
    { ballSpeed: 0.72, aiSpeed: 0.82, speedCap: 1.45, serveDelay: 400 },
    { ballSpeed: 0.92, aiSpeed: 1.10, speedCap: 1.85, serveDelay: 250 },
  ];
  const KB_SPEED        = 0.75;
  const PADDLE_W_PCT    = 0.045;
  const PADDLE_H_PCT    = 0.262;
  const BALL_SIZE_PCT   = 0.044;
  const AI_ERROR_FACTOR = [0.63, 0.35, 0.14];

  const MOUSE_SMOOTHING = 20;    // paddle follow snappiness (higher = tighter)
  const ENGLISH_FACTOR  = 0.35;  // how much paddle velocity transfers to ball vy
  const MAX_DT          = 0.032; // clamp dt across tab switches / hitches
  const WIN_SCORE       = 7;     // first to this wins the match

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
  let lastFrame     = 0;

  let shakeMag = 0;
  let shakeEnd = 0;
  let scorePop = { side: null, end: 0 };
  let gameOver = null; // null | 'left' | 'right' (winning side)

  let leftPaddle  = { x: 0, y: 0, w: 0, h: 0, vy: 0 };
  let rightPaddle = { x: 0, y: 0, w: 0, h: 0, vy: 0 };
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

  // ── Sound (square-wave blips, no assets) ─────────────────────
  let audioCtx = null;

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function blip(freq, dur, slideTo) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const t   = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
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
    gameOver      = null;
    serving       = true;
    playStarted   = false;
    mouseY        = -1;
    keys          = {};
    running       = true;
    timelineStart = performance.now();
    lastFrame     = timelineStart;
    shakeEnd      = 0;
    scorePop      = { side: null, end: 0 };
    ensureAudio();

    document.body.classList.add('pong-active');
    overlay.removeAttribute('aria-hidden');
    if (window.__lenis) window.__lenis.stop();

    layoutCourt();
    rafId = requestAnimationFrame(loop);
  }

  function exit({ resumeScroll = false } = {}) {
    running       = false;
    timelineStart = 0;
    playStarted   = false;
    cancelAnimationFrame(rafId);
    clearTimeout(serveTimer);

    document.body.classList.remove('pong-active');
    overlay.setAttribute('aria-hidden', 'true');

    const lenisDelay = resumeScroll || reducedMotion ? 0 : EXIT_DURATION;
    setTimeout(() => {
      if (window.__lenis) window.__lenis.start();
    }, lenisDelay);
  }

  function scrollToHash(hash) {
    if (window.__lenis) {
      window.__lenis.scrollTo(hash);
      return;
    }
    const target = document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function onChromeClick(e) {
    if (!running) return;
    const el = e.target.closest('a, button');
    if (!el) return;

    const anchor = el.closest('a');
    const href   = anchor?.getAttribute('href');
    const hash   = href && href.startsWith('#');

    exit({ resumeScroll: true });

    if (hash) {
      e.preventDefault();
      requestAnimationFrame(() => scrollToHash(href));
    }
  }

  document.querySelectorAll('.site-header, .site-footer').forEach((root) => {
    root.addEventListener('click', onChromeClick, true);
  });

  playLink.addEventListener('click', (e) => {
    e.preventDefault();
    enter();
  });

  // ── Physics helpers ──────────────────────────────────────────
  function capSpeed() {
    const cap = LEVELS[levelIndex].speedCap * W;
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
      const spd   = LEVELS[levelIndex].ballSpeed * W;
      ball.vx = direction * spd * Math.cos(angle);
      ball.vy = spd * Math.sin(angle);
      blip(440, 0.05);
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

  const ro = new ResizeObserver(() => {
    if (!running) return;
    layoutCourt();
    // Velocities are px/s derived from the old court size — re-serve.
    if (playStarted) resetBall(1, false);
  });
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

  // Tap / click anywhere restarts from the win screen (touch has no spacebar)
  overlay.addEventListener('pointerdown', () => {
    if (running && gameOver) rematch();
  });

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
      if (gameOver) rematch();
      else paused = !paused;
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

  // ── Hit feedback ─────────────────────────────────────────────
  function paddleHitFx() {
    shakeMag = 3;
    shakeEnd = performance.now() + 120;
    blip(520, 0.06);
  }

  function scoreFx(side) {
    scorePop = { side, end: performance.now() + 350 };
    blip(210, 0.28, 130);
  }

  function endGame(side) {
    gameOver = side;
    clearTimeout(serveTimer);
    serving = true;
    ball.x  = W / 2 - ball.size / 2;
    ball.y  = H / 2 - ball.size / 2;
    ball.vx = 0;
    ball.vy = 0;
    // Ascending jingle for a win, descending for a loss
    if (side === 'left') blip(330, 0.35, 880);
    else                 blip(330, 0.35, 110);
  }

  function rematch() {
    scores   = { left: 0, right: 0 };
    scorePop = { side: null, end: 0 };
    gameOver = null;
    paused   = false;
    resetBall(1, false);
  }

  // ── Update ───────────────────────────────────────────────────
  function update(dt) {
    const elapsed = elapsedMs();

    if (elapsed >= T.PLAY_START) beginPlay();

    const prevLeftY = leftPaddle.y;
    if (mouseY >= 0) {
      // Smoothed follow — gives the paddle weight and makes its velocity
      // meaningful for english on contact.
      const target = mouseY - leftPaddle.h / 2;
      leftPaddle.y += (target - leftPaddle.y) * (1 - Math.exp(-MOUSE_SMOOTHING * dt));
    } else {
      if (keys['ArrowUp'])   leftPaddle.y -= KB_SPEED * H * dt;
      if (keys['ArrowDown']) leftPaddle.y += KB_SPEED * H * dt;
    }
    leftPaddle.y  = Math.max(0, Math.min(H - leftPaddle.h, leftPaddle.y));
    leftPaddle.vy = dt > 0 ? (leftPaddle.y - prevLeftY) / dt : 0;

    if (!playStarted || paused || serving) return;

    const prevRightY = rightPaddle.y;
    if (ball.vx > 0) {
      const target = (ball.y + ball.size / 2) + aiErrorOffset - (rightPaddle.h / 2);
      const diff   = target - rightPaddle.y;
      if (Math.abs(diff) > 1) {
        rightPaddle.y += Math.sign(diff) * Math.min(LEVELS[levelIndex].aiSpeed * H * dt, Math.abs(diff));
      }
    }
    rightPaddle.y  = Math.max(0, Math.min(H - rightPaddle.h, rightPaddle.y));
    rightPaddle.vy = dt > 0 ? (rightPaddle.y - prevRightY) / dt : 0;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y <= 0)             { ball.y = 0;             ball.vy =  Math.abs(ball.vy); blip(300, 0.05); }
    if (ball.y + ball.size >= H) { ball.y = H - ball.size; ball.vy = -Math.abs(ball.vy); blip(300, 0.05); }

    const ballCx = ball.x + ball.size / 2;
    const ballCy = ball.y + ball.size / 2;

    if (ball.vx < 0 &&
        ball.x             < leftPaddle.x + leftPaddle.w &&
        ball.x + ball.size > leftPaddle.x &&
        ballCy             > leftPaddle.y &&
        ballCy             < leftPaddle.y + leftPaddle.h) {
      ball.x = leftPaddle.x + leftPaddle.w;
      const relY = ((ballCy - leftPaddle.y) / leftPaddle.h) - 0.5;
      const eng  = Math.max(-H, Math.min(H, leftPaddle.vy)) * ENGLISH_FACTOR;
      ball.vx    = Math.abs(ball.vx) * 1.04;
      ball.vy    = relY * LEVELS[levelIndex].ballSpeed * W * 2.2 + eng;
      capSpeed();
      randomizeAiError();
      paddleHitFx();
    }

    if (ball.vx > 0 &&
        ball.x + ball.size > rightPaddle.x &&
        ball.x             < rightPaddle.x + rightPaddle.w &&
        ballCy             > rightPaddle.y &&
        ballCy             < rightPaddle.y + rightPaddle.h) {
      ball.x = rightPaddle.x - ball.size;
      const relY = ((ballCy - rightPaddle.y) / rightPaddle.h) - 0.5;
      const eng  = Math.max(-H, Math.min(H, rightPaddle.vy)) * ENGLISH_FACTOR;
      ball.vx    = -Math.abs(ball.vx) * 1.04;
      ball.vy    = relY * LEVELS[levelIndex].ballSpeed * W * 2.2 + eng;
      capSpeed();
      paddleHitFx();
    }

    if (ball.x + ball.size < 0) {
      scores.right += 1;
      if (scores.right >= WIN_SCORE) endGame('right');
      else { scoreFx('right'); resetBall(1, false); }
    }
    if (ball.x > W) {
      scores.left += 1;
      if (scores.left >= WIN_SCORE) endGame('left');
      else { scoreFx('left'); resetBall(-1, false); }
    }
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

    const now = performance.now();

    const scoreSize = W < 480 ? 12 : 18;
    ctx.fillStyle    = c.accent;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const drawScore = (value, x, side) => {
      let size = scoreSize;
      if (scorePop.side === side && now < scorePop.end) {
        size = scoreSize * (1 + 0.5 * easeOutCubic((scorePop.end - now) / 350));
      }
      ctx.font = `${size}px 'Space Mono', monospace`;
      ctx.fillText(String(value).padStart(3, '0'), x, SAFE_TOP);
    };
    drawScore(scores.left,  W / 4,     'left');
    drawScore(scores.right, 3 * W / 4, 'right');

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

    const nowT    = performance.now();
    const shaking = !reducedMotion && nowT < shakeEnd;
    if (shaking) {
      const p = (shakeEnd - nowT) / 120;
      ctx.save();
      ctx.translate(
        (Math.random() * 2 - 1) * shakeMag * p,
        (Math.random() * 2 - 1) * shakeMag * p
      );
    }
    drawCourt(c, courtA);
    if (shaking) ctx.restore();
    drawScrim(scrimA);

    if (digits.length) drawCountdownDigits(digits, c);
    if (hintA > 0) drawIntroHint(c, hintA);

    if (playStarted && serving && !paused && !gameOver) {
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

    if (gameOver) {
      ctx.fillStyle = 'rgba(254,250,241,0.92)';
      ctx.fillRect(0, 0, W, H);

      const bigSize = W < 480 ? 32 : 48;
      ctx.font         = `${bigSize}px 'Space Mono', monospace`;
      ctx.fillStyle    = c.accent;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gameOver === 'left' ? 'YOU WIN' : 'CPU WINS', W / 2, H / 2 - 24);

      ctx.font      = `${scoreSize}px 'Space Mono', monospace`;
      ctx.fillStyle = hexToRgba(c.text, 0.55);
      ctx.fillText(
        `${String(scores.left).padStart(3, '0')} — ${String(scores.right).padStart(3, '0')}`,
        W / 2,
        H / 2 + 28
      );

      ctx.font      = `10px 'Space Mono', monospace`;
      ctx.fillStyle = hexToRgba(c.text, 0.35);
      ctx.fillText('space — rematch  ·  esc — exit', W / 2, H / 2 + 68);
    }

    if (playStarted && hintA <= 0 && !gameOver) drawPlayHint(c, paused);
  }

  // ── Loop ─────────────────────────────────────────────────────
  function loop(now) {
    if (!running) return;
    const dt  = Math.min(MAX_DT, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }
})();
