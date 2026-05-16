import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import Dither from "./components/Dither.jsx";

function readViewportPixelSize() {
  if (typeof window === "undefined") return { w: 1, h: 1 };
  const vv = window.visualViewport;
  return {
    w: Math.max(1, Math.floor(vv?.width ?? window.innerWidth)),
    h: Math.max(1, Math.floor(vv?.height ?? window.innerHeight)),
  };
}

/**
 * Extra canvas size so counter-scroll parallax never reveals the solid panel fill.
 * Must stay in sync with `PARALLAX_FACTOR` in `js/experience-dither-parallax.js`.
 */
const EXPERIENCE_DITHER_PARALLAX_FACTOR = 0.9;

function readDitherFramePixelSize() {
  const { w, h } = readViewportPixelSize();
  const travel = Math.ceil(h * EXPERIENCE_DITHER_PARALLAX_FACTOR);
  return {
    w: w + Math.ceil(w * 0.1),
    h: h + 2 * travel + 128,
  };
}

const FALLBACK_DITHER_PALETTE = {
  bgColor: [0.12156862745098039, 0.11764705882352941, 0.3058823529411765],
  waveColor: [0.3333333333333333, 0.2627450980392157, 0.8941176470588236],
};

/** Set false before shipping: when true, wave animates even if the user prefers reduced motion. */
const DITHER_FORCE_ANIMATE = true;

function hexToRgb01(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

function readTokenColor(tokenName) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
  return raw.startsWith("#") ? hexToRgb01(raw) : null;
}

function readDitherPalette() {
  const rootEl = document.documentElement;
  const isLight = rootEl.dataset.theme === "light";
  const bgColor = readTokenColor("--color-base-blue-300");
  const waveColor = readTokenColor(isLight ? "--color-base-blue-600" : "--color-base-blue-900");

  return {
    bgColor: bgColor ?? FALLBACK_DITHER_PALETTE.bgColor,
    waveColor: waveColor ?? FALLBACK_DITHER_PALETTE.waveColor,
  };
}

function ExperiencePanelDitherMount() {
  const [ditherPalette, setDitherPalette] = useState(readDitherPalette);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [viewportPx, setViewportPx] = useState(readDitherFramePixelSize);

  useEffect(() => {
    const sync = () => setViewportPx(readDitherFramePixelSize());
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    const rootEl = document.documentElement;
    const syncPalette = () => setDitherPalette(readDitherPalette());
    const observer = new MutationObserver(syncPalette);
    observer.observe(rootEl, { attributes: true, attributeFilter: ["data-theme"] });
    syncPalette();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const enableMouse = useMemo(() => !reducedMotion, [reducedMotion]);

  return (
    <div
      className="experience-panel-dither__viewport-frame"
      style={{
        width: viewportPx.w,
        height: viewportPx.h,
      }}
    >
      <Dither
        pattern="simplex"
        waveColor={ditherPalette.waveColor}
        bgColor={ditherPalette.bgColor}
        disableAnimation={DITHER_FORCE_ANIMATE ? false : reducedMotion}
        enableMouseInteraction={enableMouse}
        pixelSize={1}
        colorNum={2}
        waveSpeed={0.1}
        waveFrequency={1.2}
        waveAmplitude={1}
        rotation={0}
        offset={[0, 0]}
        mouseRadius={0.35}
      />
    </div>
  );
}

function mount() {
  const el = document.getElementById("experience-panel-dither-root");
  if (!el) return;
  const root = createRoot(el);
  root.render(<ExperiencePanelDitherMount />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
