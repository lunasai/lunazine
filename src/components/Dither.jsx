/* eslint-disable react/no-unknown-property */
import { useRef, useEffect, forwardRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, wrapEffect } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import * as THREE from "three";

import "./Dither.css";

const waveVertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const waveFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 4;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p + fbm(p2)); 
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }
  vec3 col = mix(vec3(0.0), waveColor, f);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Static paper-grain pattern (no time, no advection).
 * Reuses existing uniforms so the same uniform map works for both shaders:
 *   waveFrequency → grain scale (higher = finer grain)
 *   waveAmplitude → grain contrast (0 = flat mid-gray, 1 = full noise range)
 *   waveColor     → paper base color
 *   waveSpeed/time → unused
 */
const paperFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float scale = max(waveFrequency, 0.0001);
  float fine = vnoise(frag * (0.5 * scale));
  float coarse = vnoise(frag * (0.04 * scale));
  float n = mix(0.5, mix(coarse, fine, 0.65), clamp(waveAmplitude, 0.0, 1.0));

  if (enableMouseInteraction == 1) {
    vec2 uv = (frag / resolution) - 0.5;
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    float aspect = resolution.x / resolution.y;
    uv.x *= aspect;
    mouseNDC.x *= aspect;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    n -= 0.35 * effect;
  }

  vec3 col = mix(vec3(0.0), waveColor, n);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Animated simplex-noise pattern with built-in Bayer 8x8 dither between two
 * colors. Mirrors the "dithering / shape: simplex" preset from shaders.paper.design.
 *
 * Prop mapping:
 *   waveColor     → colorFront (high noise values)
 *   bgColor       → colorBack  (low noise values)
 *   waveSpeed     → noise drift speed (Paper "speed")
 *   waveFrequency → noise scale (Paper "scale" — higher = finer features)
 *   waveAmplitude → contrast around mid-gray (0 = flat, 1 = full noise range)
 *   pixelSize     → output cell size in device pixels (Paper "size")
 *   colorNum      → quantization levels (2 = pure two-tone like the preset)
 *   rotation      → noise field rotation (radians)
 *   offset        → noise field offset (vec2)
 */
const simplexFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec3 bgColor;
uniform float pixelSize;
uniform float colorNum;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;
uniform float rotation;
uniform vec2 offset;

vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute3(vec3 x) { return mod289v3(((x * 34.0) + 1.0) * x); }

// Ashima Arts / Ian McEwan 2D simplex noise. Returns approx [-1, 1].
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                          dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

const float simplexBayer8x8[64] = float[64](
   0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0, 16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0, 19.0/64.0, 47.0/64.0, 31.0/64.0,
   8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0, 59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0, 24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0, 27.0/64.0, 39.0/64.0, 23.0/64.0,
   2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0, 49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0, 18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0, 17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0, 58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0, 57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0, 26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0, 25.0/64.0, 37.0/64.0, 21.0/64.0
);

void main() {
  // Chunky cell snap so adjacent fragments share noise sample and Bayer index.
  float ps = max(pixelSize, 1.0);
  vec2 cell = floor(gl_FragCoord.xy / ps);
  vec2 fragCenter = cell * ps + 0.5 * ps;

  // Aspect-corrected coords; vertical span is [-0.5, 0.5].
  float minRes = min(resolution.x, resolution.y);
  vec2 uv = (fragCenter - 0.5 * resolution.xy) / minRes;

  float cs = cos(rotation);
  float sn = sin(rotation);
  uv = mat2(cs, -sn, sn, cs) * uv;
  uv += offset;
  uv *= max(waveFrequency, 0.0001);

  float t = time * waveSpeed;
  float n = snoise(uv + vec2(t, t * 0.5));

  float v = n * 0.5 + 0.5;
  v = clamp(mix(0.5, v, max(waveAmplitude, 0.0)), 0.0, 1.0);

  if (enableMouseInteraction == 1) {
    vec2 fragUV = (fragCenter / resolution.xy - 0.5);
    vec2 mouseNDC = (mousePos / resolution.xy - 0.5) * vec2(1.0, -1.0);
    float aspect = resolution.x / resolution.y;
    fragUV.x *= aspect;
    mouseNDC.x *= aspect;
    float dist = length(fragUV - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    v -= 0.35 * effect;
    v = clamp(v, 0.0, 1.0);
  }

  // Bayer 8x8 ordered dither, indexed by chunky cell so the pattern is stable.
  int bx = int(mod(cell.x, 8.0));
  int by = int(mod(cell.y, 8.0));
  float threshold = simplexBayer8x8[by * 8 + bx];
  float levels = max(colorNum, 2.0);
  float dithered = clamp(floor(v * (levels - 1.0) + threshold) / (levels - 1.0), 0.0, 1.0);

  gl_FragColor = vec4(mix(bgColor, waveColor, dithered), 1.0);
}
`;

const ditherFragmentShader = `
precision highp float;
uniform float colorNum;
uniform float pixelSize;
const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv * resolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  float bias = 0.2;
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void mainImage(in vec4 inputColor, in vec2 uv, out vec4 outputColor) {
  vec2 normalizedPixelSize = pixelSize / resolution;
  vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
  vec4 color = texture2D(inputBuffer, uvPixel);
  color.rgb = dither(uv, color.rgb);
  outputColor = color;
}
`;

class RetroEffectImpl extends Effect {
  constructor() {
    const uniforms = new Map([
      ["colorNum", new THREE.Uniform(4.0)],
      ["pixelSize", new THREE.Uniform(2.0)],
    ]);
    super("RetroEffect", ditherFragmentShader, { uniforms });
    this.uniforms = uniforms;
  }
  set colorNum(v) {
    this.uniforms.get("colorNum").value = v;
  }
  get colorNum() {
    return this.uniforms.get("colorNum").value;
  }
  set pixelSize(v) {
    this.uniforms.get("pixelSize").value = v;
  }
  get pixelSize() {
    return this.uniforms.get("pixelSize").value;
  }
}

const WrappedRetro = wrapEffect(RetroEffectImpl);

const RetroEffect = forwardRef((props, ref) => {
  const { colorNum, pixelSize } = props;
  return <WrappedRetro ref={ref} colorNum={colorNum} pixelSize={pixelSize} />;
});
RetroEffect.displayName = "RetroEffect";

function DitheredWaves({
  waveSpeed,
  waveFrequency,
  waveAmplitude,
  waveColor,
  bgColor,
  colorNum,
  pixelSize,
  disableAnimation,
  enableMouseInteraction,
  mouseRadius,
  pattern,
  rotation,
  offset,
}) {
  const mouseRef = useRef(new THREE.Vector2());
  const materialRef = useRef(null);
  const { viewport, size, gl } = useThree();

  const waveUniformsRef = useRef({
    time: new THREE.Uniform(0),
    resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
    waveSpeed: new THREE.Uniform(waveSpeed),
    waveFrequency: new THREE.Uniform(waveFrequency),
    waveAmplitude: new THREE.Uniform(waveAmplitude),
    waveColor: new THREE.Uniform(new THREE.Color(...waveColor)),
    bgColor: new THREE.Uniform(new THREE.Color(...bgColor)),
    pixelSize: new THREE.Uniform(pixelSize),
    colorNum: new THREE.Uniform(colorNum),
    mousePos: new THREE.Uniform(new THREE.Vector2(0, 0)),
    enableMouseInteraction: new THREE.Uniform(enableMouseInteraction ? 1 : 0),
    mouseRadius: new THREE.Uniform(mouseRadius),
    rotation: new THREE.Uniform(rotation),
    offset: new THREE.Uniform(new THREE.Vector2(offset[0], offset[1])),
  });

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const w = Math.floor(size.width * dpr),
      h = Math.floor(size.height * dpr);
    const res = waveUniformsRef.current.resolution.value;
    if (res.x !== w || res.y !== h) {
      res.set(w, h);
    }
  }, [size, gl]);

  useEffect(() => {
    if (!enableMouseInteraction) {
      mouseRef.current.set(-9999, -9999);
      return undefined;
    }

    const handlePointerMove = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        mouseRef.current.set(-9999, -9999);
        return;
      }

      const dpr = gl.getPixelRatio();
      mouseRef.current.set(x * dpr, y * dpr);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [enableMouseInteraction, gl]);

  const prevColor = useRef([...waveColor]);
  const prevBgColor = useRef([...bgColor]);
  useFrame(() => {
    const u = materialRef.current?.uniforms ?? waveUniformsRef.current;

    if (!disableAnimation) {
      u.time.value = performance.now() * 0.001;
    }

    if (u.waveSpeed.value !== waveSpeed) u.waveSpeed.value = waveSpeed;
    if (u.waveFrequency.value !== waveFrequency) u.waveFrequency.value = waveFrequency;
    if (u.waveAmplitude.value !== waveAmplitude) u.waveAmplitude.value = waveAmplitude;
    if (u.pixelSize.value !== pixelSize) u.pixelSize.value = pixelSize;
    if (u.colorNum.value !== colorNum) u.colorNum.value = colorNum;
    if (u.rotation.value !== rotation) u.rotation.value = rotation;

    if (!prevColor.current.every((v, i) => v === waveColor[i])) {
      u.waveColor.value.set(...waveColor);
      prevColor.current = [...waveColor];
    }
    if (!prevBgColor.current.every((v, i) => v === bgColor[i])) {
      u.bgColor.value.set(...bgColor);
      prevBgColor.current = [...bgColor];
    }

    if (u.offset.value.x !== offset[0] || u.offset.value.y !== offset[1]) {
      u.offset.value.set(offset[0], offset[1]);
    }

    u.enableMouseInteraction.value = enableMouseInteraction ? 1 : 0;
    u.mouseRadius.value = mouseRadius;

    if (enableMouseInteraction) {
      u.mousePos.value.copy(mouseRef.current);
    }
  });

  return (
    <>
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          key={pattern}
          ref={materialRef}
          vertexShader={waveVertexShader}
          fragmentShader={
            pattern === "simplex"
              ? simplexFragmentShader
              : pattern === "paper"
                ? paperFragmentShader
                : waveFragmentShader
          }
          uniforms={waveUniformsRef.current}
        />
      </mesh>

      {/* Diagnostic: bypass postprocessing to verify the base wave animates. */}
    </>
  );
}

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  bgColor = [0, 0, 0],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
  pattern = "wave",
  rotation = 0,
  offset = [0, 0],
}) {
  return (
    <Canvas
      className="dither-container"
      camera={{ position: [0, 0, 6] }}
      dpr={1}
      frameloop="always"
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <DitheredWaves
        waveSpeed={waveSpeed}
        waveFrequency={waveFrequency}
        waveAmplitude={waveAmplitude}
        waveColor={waveColor}
        bgColor={bgColor}
        colorNum={colorNum}
        pixelSize={pixelSize}
        disableAnimation={disableAnimation}
        enableMouseInteraction={enableMouseInteraction}
        mouseRadius={mouseRadius}
        pattern={pattern}
        rotation={rotation}
        offset={offset}
      />
    </Canvas>
  );
}
