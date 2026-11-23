import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  LinearFilter,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { PRESETS, toNumeric, mixInto, dampInto, cloneNumeric, type Numeric } from './presets';
import {
  FLAMES, HALO_SECTORS, VORTEX_ARMS, MALA_BEADS, FORM_KEYS, buildForms, buildFormsAsync, lettersForm, makeDirs, makeSeeds, nameForm,
  type FormKey,
} from './forms';
import type { Tier } from '../tiers';

/* ------------------------------------------------------------------ shaders */

const fullVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/* the smoke, rendered at reduced resolution (it is soft, so nobody can tell) */
const bgFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uGlow;
uniform float uScale;
uniform float uWarp;
uniform float uLight;
uniform float uOct;
uniform float uDeep;
uniform vec2 uPointer;
uniform float uDrift;
uniform float uFlash;
uniform float uVeil;
uniform float uDawn;
uniform float uDawnW;
// a page turning from light to dark: the night spreads in like ink (Magic's day and night pages)
uniform float uInk;
uniform float uInkT;
uniform vec2 uInkL;
uniform vec3 uDA;
uniform vec3 uDB;
uniform vec3 uDC;
uniform vec3 uNA;
uniform vec3 uNB;
uniform vec3 uNC;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uOct) break;
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uDrift;
  vec2 sp = p * uScale;

  vec2 q = vec2(fbm(sp + vec2(0.0, t * 0.6)), fbm(sp + vec2(5.2, 1.3) - t * 0.4));
  vec2 r = q;
  if (uDeep > 0.5) {
    r = vec2(fbm(sp + uWarp * q + vec2(1.7, 9.2) + t * 0.3),
             fbm(sp + uWarp * q + vec2(8.3, 2.8) - t * 0.25));
  }
  float n = fbm(sp + uWarp * r);

  float tone = smoothstep(0.18, 0.86, n);
  vec3 col = mix(uA, uB, tone);
  float hi = smoothstep(0.52, 1.05, n + 0.35 * length(q) - 0.18);
  col = mix(col, uC, hi * 0.85);
  float L = uLight;

  if (uInk > 0.001) {
    vec3 dayC = mix(mix(uDA, uDB, tone), uDC, hi * 0.85);
    vec3 nightC = mix(mix(uNA, uNB, tone), uNC, hi * 0.85);
    // ink creeps in from the edges of the page and pools in blots
    float blot = fbm(p * 3.1 + vec2(3.1, 7.7) + uTime * 0.02);
    float field = clamp(length(p * vec2(0.78, 1.0)) * 0.62 + blot * 0.75 - 0.3, 0.0, 1.0);
    float th = mix(1.08, -0.08, uInkT);
    float m = smoothstep(th - 0.035, th + 0.035, field);
    vec3 inkCol = mix(dayC, nightC, m);
    // the wet edge of the ink is darkest, with a thin line of gold where it dries
    float edge = 1.0 - smoothstep(0.0, 0.05, abs(field - th));
    inkCol = mix(inkCol, uNA * 0.6, edge * 0.55 * (1.0 - m));
    inkCol += uNC * edge * 0.18 * m;
    col = mix(col, inkCol, uInk);
    L = mix(uLight, mix(uInkL.x, uInkL.y, m), uInk);
  }

  float d = length(p - uPointer);
  col += uGlow * (0.15 + 0.12 * uFlash) * exp(-d * d * 2.6) * (1.0 - 0.6 * L);

  float vig = smoothstep(1.35, 0.15, length(p * vec2(0.9, 1.0)));
  col *= mix(1.0, mix(0.32, 1.0, vig), 1.0 - 0.75 * L);

  float sky = smoothstep(0.55, -0.75, p.y);
  float band = exp(-pow((p.y + 0.42) * 5.0, 2.0));
  col = mix(col, col * 0.3, uDawnW * (1.0 - uDawn));
  col += (uC * sky * 0.6 + uGlow * band * 0.4) * uDawn * uDawnW;

  col += uGlow * uFlash * 0.55;

  if (uVeil > 0.001) {
    float sm = fbm(sp * 1.4 + vec2(0.0, uTime * 0.25));
    float s = 0.25 + (1.0 - vUv.y) + sm * 0.55;
    float cover = smoothstep(s - 0.2, s + 0.05, uVeil * 2.0);
    col = mix(col, mix(uA * 0.6, uB * 0.85, sm), cover);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

/* full-resolution pass: the upscaled smoke, plus the crisp moon and film grain */
const copyFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tBg;
uniform vec2 uRes;
uniform float uTime;
uniform float uGrain;
uniform vec2 uMoonPos;
uniform float uMoonR;
uniform float uMoonPhase;
uniform float uMoonVis;
uniform vec3 uMoonTint;
uniform float uMoonMode; // 0 moon, 1 lunar eclipse (blood moon), 2 solar eclipse (dark disc, corona)
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec3 col = texture2D(tBg, vUv).rgb;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  if (uMoonVis > 0.001) {
    vec2 m = (p - uMoonPos) / uMoonR;
    float d = length(m);
    float disc = smoothstep(1.0, 0.97, d);
    float edge = sqrt(max(0.0, 1.0 - m.y * m.y));
    float c = cos(6.28318 * uMoonPhase);
    float lit = uMoonPhase < 0.5
      ? smoothstep(-0.05, 0.05, m.x - edge * c)
      : smoothstep(-0.05, 0.05, -edge * c - m.x);
    float illum = 0.5 - 0.5 * c;           // illuminated fraction
    vec2 cm = m * 4.0;
    vec2 ci = floor(cm), cf = fract(cm);
    cf = cf * cf * (3.0 - 2.0 * cf);
    float cn = mix(mix(hash(ci), hash(ci + vec2(1.0, 0.0)), cf.x), mix(hash(ci + vec2(0.0, 1.0)), hash(ci + vec2(1.0, 1.0)), cf.x), cf.y);
    float crater = 0.84 + 0.16 * cn; // soft grey seas on the moon's face
    vec3 moon = mix(col * 0.55 + uMoonTint * 0.04, uMoonTint * crater, lit);
    if (uMoonMode > 0.5 && uMoonMode < 1.5) moon = vec3(0.62, 0.16, 0.08) * crater; // blood moon
    if (uMoonMode > 1.5) moon = vec3(0.01);                                          // the sun hidden
    col = mix(col, moon, disc * uMoonVis);
    float halo = exp(-max(0.0, d - 1.0) * 3.2) * (1.0 - disc);
    col += uMoonTint * halo * 0.18 * illum * uMoonVis * step(uMoonMode, 0.5);
    if (uMoonMode > 1.5) { // corona streamers around the hidden sun
      float ang = atan(m.y, m.x);
      float streak = 0.6 + 0.4 * sin(ang * 9.0 + uTime * 0.2) * sin(ang * 4.0 - uTime * 0.13);
      col += vec3(1.0, 0.93, 0.8) * exp(-max(0.0, d - 1.0) * (4.0 - 1.5 * streak)) * (1.0 - disc) * 0.9 * uMoonVis;
    }
  }
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

const moteVert = /* glsl */ `
uniform float uTime;
uniform float uTravel;
uniform float uSize;
uniform float uPR;
uniform float uVeil;
attribute float aSeed;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.z = mod(p.z + uTravel, 34.0) - 30.0;
  p.x += sin(uTime * 0.25 + aSeed * 31.0) * 0.25;
  p.y += cos(uTime * 0.2 + aSeed * 17.0) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  gl_PointSize = uSize * uPR * (0.35 + aSeed) * (6.0 / max(depth, 0.5));
  vAlpha = smoothstep(34.0, 16.0, depth) * smoothstep(0.4, 2.4, depth) * (0.35 + 0.65 * fract(aSeed * 7.0)) * (1.0 - uVeil);
}`;

const moteFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  a *= a;
  gl_FragColor = vec4(uColor * a * vAlpha * uOpacity, 1.0);
}`;

const formVert = /* glsl */ `
uniform float uTime;
uniform float uMix;
uniform float uT;
uniform float uScatter;
uniform float uSize;
uniform float uPR;
uniform float uFit;
uniform float uZoom;
uniform vec2 uShift;
uniform vec4 uW1; // flames, water, silk, stars
uniform vec4 uW2; // letters, eye, horizon, sigils
uniform vec4 uW3; // vortex, halo, name, dust
uniform vec4 uW4; // mala, lamps, agni, lotus
uniform vec4 uW5; // yantra, temple, tree, crossroads
uniform vec4 uW6; // rose, pentacle, astrolabe, moons
uniform vec4 uW7; // chakras, bowl, (spare), (spare)
uniform float uAngMala;
uniform float uAngFlame;
uniform float uAngVortex;
uniform float uAngHalo;
uniform float uRise;
uniform float uVeil;
uniform vec2 uNameC0;
uniform vec2 uNameC;
uniform float uNameS;
uniform vec2 uTouch;
uniform float uTouchAmt;
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec3 aSnap;
attribute float aSeed;
attribute vec3 aDir;
varying float vA;
varying float vSeed;
const float CZ = -10.0;
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
void main() {
  vec3 scrub = mix(aFrom, aTo, uMix);
  vec3 p = mix(aSnap, scrub, uT);
  p += aDir * uScatter * (sin(3.14159 * uMix) + sin(3.14159 * uT));
  p.xy = mix(p.xy, (p.xy - uNameC0) * uNameS + uNameC, uW3.z);

  vec2 fc = vec2(0.0, 0.25);
  p.xy = mix(p.xy, fc + rot(p.xy - fc, uAngFlame), uW1.x);
  vec2 rd = normalize(p.xy - fc + 1e-4);
  p.xy += rd * sin(uTime * 9.0 + aSeed * 40.0) * 0.02 * uW1.x;
  float dw = length(vec2(p.x / 1.2, p.z - (CZ - 1.0)));
  p.y += sin(dw * 2.3 - uTime * 1.3) * 0.16 * uW1.y;
  p.z += sin(p.x * 0.7 + p.y * 0.9 + uTime * 0.8) * 0.45 * uW1.z;
  p.y += sin(p.x * 0.5 + uTime * 0.6) * 0.18 * uW1.z;
  p.xy = mix(p.xy, rot(p.xy, sin(uTime * 0.25) * 0.1), uW2.x);
  vec2 ec = vec2(0.0, 0.45);
  p.xy = mix(p.xy, ec + (p.xy - ec) * (1.0 + 0.035 * sin(uTime * 1.2)), uW2.y);
  p.z += sin(uTime * 0.4 + aSeed * 10.0) * 0.25 * uW2.w;
  p.y += sin(uTime * 0.3 + aSeed * 7.0) * 0.06 * uW2.w;
  vec2 uv = rot(vec2(p.x, (p.z - CZ) / 0.5), uAngVortex);
  p = mix(p, vec3(uv.x, uv.y * 0.42, CZ + uv.y * 0.5), uW3.x);
  vec2 hc = vec2(0.0, 1.7);
  p.xy = mix(p.xy, hc + rot(p.xy - hc, uAngHalo), uW3.y);
  float wr = uW2.z * step(0.55, aSeed);
  float climb = fract(uTime * 0.045 + aSeed * 3.7);
  p.y += climb * 4.5 * wr * uRise;
  p.x += sin(uTime * 0.5 + aSeed * 20.0) * 0.15 * wr;

  // mala: turns one bead per count, and breathes
  vec2 mc = vec2(0.0, 0.3);
  p.xy = mix(p.xy, mc + rot(p.xy - mc, uAngMala) * (1.0 + 0.012 * sin(uTime * 0.9)), uW4.x);
  // lamps bob on the water
  p.y += sin(uTime * 0.8 + p.x * 0.6 + p.z * 0.4) * 0.05 * uW4.y;
  // agni: flames rise from the pit, narrow and thin out
  float fl = uW4.z * step(0.16, aSeed);
  float rise = fract(uTime * 0.42 + aSeed * 5.3);
  float narrow = 1.0 - rise * 0.75;
  p.y += rise * 2.7 * fl;
  p.x = mix(p.x, p.x * narrow + sin(uTime * 2.2 + aSeed * 30.0 + rise * 6.0) * 0.14 * rise, fl);
  p.z = mix(p.z, CZ + (p.z - CZ) * narrow, fl);

  // yantra: breathes and turns a few degrees, never more
  vec2 yc = vec2(0.0, 0.3);
  p.xy = mix(p.xy, yc + (p.xy - yc) * (1.0 + 0.015 * sin(uTime * 0.7)), uW5.x);
  // temple: floats, like a memory of marble
  p.y += sin(uTime * 0.35) * 0.06 * uW5.y;
  p.z += sin(uTime * 0.5 + p.x * 0.8) * 0.12 * uW5.y;
  // tree: the branches sway, more towards their tips
  float sway = max(0.0, p.y - 0.6);
  p.x += sin(uTime * 0.6 + p.y * 1.3) * 0.05 * sway * uW5.z;
  // crossroads: the light where the roads meet breathes, and a few lights walk in along the roads
  vec2 xc = vec2(0.0, 0.3);
  float xr = length(p.xy - xc);
  p.xy = mix(p.xy, xc + (p.xy - xc) * (1.0 + 0.08 * sin(uTime * 1.1) * smoothstep(0.5, 0.0, xr)), uW5.w);
  float walker = uW5.w * step(aSeed, 0.1) * step(0.5, xr);
  float walk = fract(uTime * 0.05 + aSeed * 9.7);
  p.xy = mix(p.xy, xc + (p.xy - xc) * (1.0 - walk * 0.86), walker);
  // lotus: breathes slowly, the water rings a little more
  vec2 lc = vec2(0.0, -1.15);
  p.xy = mix(p.xy, lc + (p.xy - lc) * (1.0 + 0.025 * sin(uTime * 0.5)), uW4.w);
  // chakras: a slow light rises up the line, each centre glows as it passes
  float rising = fract(uTime * 0.08);
  float at = 1.0 - smoothstep(0.0, 0.5, abs((p.y + 2.4) / 6.0 - rising) * 6.0);
  p.xy *= mix(1.0, 1.0 + 0.04 * at, uW7.x);
  // bowl: floats, turning a few degrees
  vec2 bc = vec2(0.0, -0.2);
  p.xy = mix(p.xy, bc + (p.xy - bc) * (1.0 + 0.012 * sin(uTime * 0.5)), uW7.y);
  p.y += sin(uTime * 0.4) * 0.05 * uW7.y;

  // the astrolabe turns slowly; the rose opens and closes a little; the pentacle and moons glow in place
  vec2 ac = vec2(0.0, 0.3);
  p.xy = mix(p.xy, ac + rot(p.xy - ac, uTime * 0.03), uW6.z);
  p.xy = mix(p.xy, ac + (p.xy - ac) * (1.0 + 0.03 * sin(uTime * 0.6)), uW6.x);

  p.xy = p.xy * uFit * uZoom + uShift;

  // touch: the form parts and swirls around a finger or cursor, then settles back
  vec2 td = p.xy - uTouch;
  float tr = length(td);
  float tf = exp(-tr * tr / 1.1) * uTouchAmt;
  vec2 tdir = td / (tr + 1e-3);
  float push = 0.32 + 0.55 * uW1.w + 0.25 * uW1.x + 0.2 * uW2.w;
  p.xy += tdir * tf * push + vec2(-tdir.y, tdir.x) * tf * 0.22;
  p.y += sin(tr * 7.0 - uTime * 7.0) * 0.1 * tf * uW1.y;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float twinkle = 1.0 + sin(uTime * 2.6 + aSeed * 60.0) * 0.5 * uW1.w + sin(uTime * 9.0 + aSeed * 80.0) * 0.25 * uW4.y;
  gl_PointSize = uSize * uPR * (0.55 + aSeed * 0.9) * twinkle * (10.0 / max(depth, 0.5)) * (1.0 + tf * 0.6);
  vA = (0.55 + 0.45 * fract(aSeed * 13.0)) * smoothstep(40.0, 12.0, depth) * smoothstep(0.5, 3.0, depth) * (1.0 - uVeil);
  vA *= 1.0 - wr * uRise * smoothstep(0.55, 1.0, climb);
  vA *= 1.0 + tf * 0.8;
  vA *= 1.0 - fl * smoothstep(0.5, 1.0, rise);
  vSeed = aSeed;
}`;

const formFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uInk;
uniform float uOpacity;
uniform float uLight;
varying float vA;
varying float vSeed;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  a *= a;
  vec3 col = mix(uColor, uColor2, vSeed * 0.6);
  col = mix(col, uInk, uLight);
  float alpha = a * vA * uOpacity;
  gl_FragColor = vec4(col * alpha, alpha * uLight);
}`;

/* a heading turning into dust that drifts into the world */
const dustVert = /* glsl */ `
uniform float uP;
uniform float uTime;
uniform float uSize;
uniform float uPR;
uniform vec2 uOff;
uniform float uBurn;
attribute vec3 aDir;
attribute float aSeed;
varying float vA;
varying float vP;
void main() {
  float p = uP;
  vP = p;
  float sp = p * p; // the letters hold their shape at first, then come apart
  vec3 q = position + aDir * (sp * 3.0) + vec3(0.0, sp * 1.8, 0.0);
  q.xy += uOff * (1.0 - 0.5 * p); // follows the page a little, then lets go
  // burning: the letters catch, then rise as embers and smoke
  vec3 ember = position + vec3(sin(uTime * 3.0 + aSeed * 20.0) * 0.18 * p, p * (1.2 + aSeed * 2.8), aDir.z * p * 0.6);
  q = mix(q, ember, uBurn);
  q.x += sin(uTime * 0.8 + aSeed * 30.0) * 0.12 * p;
  vec4 mv = modelViewMatrix * vec4(q, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPR * (0.6 + aSeed * 0.8) * (6.0 / max(-mv.z, 0.5));
  vA = smoothstep(0.0, 0.06, p) * (1.0 - smoothstep(0.5, 1.0, p)) * (0.6 + 0.4 * aSeed);
  vA = mix(vA, (1.0 - smoothstep(0.35 + aSeed * 0.4, 1.0, p)) * (0.7 + 0.3 * aSeed), uBurn);
}`;

const dustFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uInk;
uniform float uLight;
uniform float uBurn;
varying float vA;
varying float vP;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  vec3 col = mix(uColor, uInk, uLight);
  // fire colours: white-hot, then orange embers, then grey smoke
  vec3 fire = mix(mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.45, 0.12), smoothstep(0.02, 0.3, vP)), vec3(0.45, 0.4, 0.38), smoothstep(0.45, 0.9, vP));
  col = mix(col, fire, uBurn);
  float alpha = a * vA;
  gl_FragColor = vec4(col * alpha, alpha * uLight);
}`;

const postFrag = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform float uVel;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  float v = clamp(uVel, -1.0, 1.0);
  uv.y += (uv.x - 0.5) * (uv.x - 0.5) * v * 0.14;
  vec2 off = vec2(0.0, v * 0.007);
  float r = texture2D(tScene, uv + off).r;
  float g = texture2D(tScene, uv).g;
  float b = texture2D(tScene, uv - off).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`;

/* -------------------------------------------------------------- tier setup */

export const BASE_N = 60000;
export const ULTRA_N = 240000;
const DUST_MAX = 9000;

type TierSettings = { live: boolean; pixelRatio: number; octaves: number; deep: boolean; maxMotes: number; formN: number; grain: number; post: boolean; bgScale: number };

function tierSettings(tier: Tier): TierSettings {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  switch (tier) {
    case 'ultra':
      return { live: true, pixelRatio: Math.min(dpr, 2), octaves: 5, deep: true, maxMotes: 6500, formN: ULTRA_N, grain: 0.035, post: true, bgScale: 0.5 };
    case 'full':
      return { live: true, pixelRatio: Math.min(dpr, 1.75), octaves: 5, deep: true, maxMotes: 6500, formN: BASE_N, grain: 0.035, post: true, bgScale: 0.5 };
    case 'lighter':
      return { live: true, pixelRatio: Math.min(dpr, 1.25) * 0.8, octaves: 3, deep: false, maxMotes: 1800, formN: 12000, grain: 0.03, post: false, bgScale: 0.42 };
    default:
      return { live: false, pixelRatio: 1, octaves: 3, deep: false, maxMotes: 0, formN: 0, grain: 0, post: false, bgScale: 0.5 };
  }
}

const MOTES = 6500;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const idx = (k: FormKey) => FORM_KEYS.indexOf(k);

type FormSet = {
  n: number;
  forms: Record<FormKey, Float32Array>;
  attrs: Record<FormKey, BufferAttribute>;
  snap: BufferAttribute;
  seeds: BufferAttribute;
  dirs: BufferAttribute;
};

export type SkyInput = { night: number; warm: number; special: 'amavasya' | 'purnima' | null; phase: number; on: boolean };

/* ------------------------------------------------------------------- world */

export class World {
  readonly available: boolean;
  private renderer?: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(60, 1, 0.1, 100);
  private ortho = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bgScene = new Scene();
  private bgMat?: ShaderMaterial;
  private bgRT?: WebGLRenderTarget;
  private copyMat?: ShaderMaterial;
  private moteMat?: ShaderMaterial;
  private moteGeo?: BufferGeometry;
  private settings: TierSettings = tierSettings('full');
  private tier: Tier = 'full';

  // living forms
  private formMat?: ShaderMaterial;
  private formGeo?: BufferGeometry;
  private formPts?: Points;
  private base?: FormSet;
  private ultra?: FormSet;
  private ultraBuilding = false;
  private set?: FormSet;
  private fromKey: FormKey = 'dust';
  private toKey: FormKey = 'dust';
  private fpos = 0;
  private fposJump = true;
  private fMix = 0;
  private tT = 1;
  private tE = 1;
  private hold = true;
  private formsOn = true;
  private seqForms: FormKey[] = ['dust'];
  private angFlame = 0;
  private angVortex = 0;
  private angHalo = 0;
  private malaAng = 0;
  private malaTarget = 0;
  private nameNative = { cx: 0, cy: 0.25, w: 7 };
  private nameAnchor: { cx: number; cy: number; w: number } | null = null;

  // touch
  private touch = new Vector2(0, -100);
  private touchTarget = new Vector2(0, -100);
  private touchAmt = 0;
  private touchWant = 0;

  // heading dust
  private dustGeo?: BufferGeometry;
  private dustMat?: ShaderMaterial;
  private dustPts?: Points;

  // sky
  private sky: SkyInput = { night: 0, warm: 0, special: null, phase: 0.25, on: false };
  private view: Numeric = toNumeric(PRESETS.loader);

  // bend and colour split
  private bendOn = true;
  private rt?: WebGLRenderTarget;
  private post?: { scene: Scene; mat: ShaderMaterial };
  private velSmooth = 0;

  private lost = false;
  private lostHandler: (() => void) | null = null;

  private sequence: Numeric[] = [toNumeric(PRESETS.loader)];
  private sequenceKeys: string[] = ['loader'];
  private position = 0;
  private target: Numeric = toNumeric(PRESETS.loader);
  readonly current: Numeric = toNumeric(PRESETS.loader);

  veil = 0;
  dawnProgress = 1;
  private audioLevel = 0;

  private pointer = new Vector2(0, 0.1);
  private pointerTarget = new Vector2(0, 0.1);
  private drift = 0;
  private travel = 0;
  private velocity = 0;
  private boost = 0;
  private flashAmt = 0;
  private time = 0;
  private lastCss = '';
  private size = new Vector2(1, 1);
  private fit = 1;
  private shiftScale = 1;
  private narrowDim = 1;

  constructor(private canvas: HTMLCanvasElement) {
    let ok = false;
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
      ok = true;
    } catch {
      ok = false;
    }
    this.available = ok;
    if (!ok || !this.renderer) return;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.lostHandler?.();
    }, false);

    // smoke, drawn small and scaled up
    this.bgMat = new ShaderMaterial({
      vertexShader: fullVert, fragmentShader: bgFrag, depthTest: false, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uRes: { value: new Vector2(1, 1) },
        uA: { value: new Vector3() }, uB: { value: new Vector3() }, uC: { value: new Vector3() }, uGlow: { value: new Vector3() },
        uScale: { value: 1.5 }, uWarp: { value: 2 }, uLight: { value: 0 }, uOct: { value: 5 }, uDeep: { value: 1 },
        uPointer: { value: new Vector2() }, uDrift: { value: 0 }, uFlash: { value: 0 },
        uVeil: { value: 0 }, uDawn: { value: 1 }, uDawnW: { value: 0 },
        uInk: { value: 0 }, uInkT: { value: 0 }, uInkL: { value: new Vector2(1, 0) },
        uDA: { value: new Vector3() }, uDB: { value: new Vector3() }, uDC: { value: new Vector3() },
        uNA: { value: new Vector3() }, uNB: { value: new Vector3() }, uNC: { value: new Vector3() },
      },
    });
    const bgQuad = new Mesh(new PlaneGeometry(2, 2), this.bgMat);
    bgQuad.frustumCulled = false;
    this.bgScene.add(bgQuad);
    this.bgRT = new WebGLRenderTarget(4, 4, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });

    this.copyMat = new ShaderMaterial({
      vertexShader: fullVert, fragmentShader: copyFrag, depthTest: false, depthWrite: false,
      uniforms: {
        tBg: { value: this.bgRT.texture }, uRes: { value: new Vector2(1, 1) }, uTime: { value: 0 }, uGrain: { value: 0.035 },
        uMoonPos: { value: new Vector2(0.6, 0.3) }, uMoonR: { value: 0.05 }, uMoonPhase: { value: 0.25 }, uMoonVis: { value: 0 },
        uMoonTint: { value: new Vector3(0.95, 0.92, 0.85) }, uMoonMode: { value: 0 },
      },
    });
    const copy = new Mesh(new PlaneGeometry(2, 2), this.copyMat);
    copy.frustumCulled = false;
    copy.renderOrder = -3;
    this.scene.add(copy);

    // ambient motes
    const pos = new Float32Array(MOTES * 3);
    const mseed = new Float32Array(MOTES);
    for (let i = 0; i < MOTES; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = Math.random() * 34 - 30;
      mseed[i] = Math.random();
    }
    this.moteGeo = new BufferGeometry();
    this.moteGeo.setAttribute('position', new BufferAttribute(pos, 3));
    this.moteGeo.setAttribute('aSeed', new BufferAttribute(mseed, 1));
    this.moteMat = new ShaderMaterial({
      vertexShader: moteVert, fragmentShader: moteFrag,
      transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uTravel: { value: 0 }, uSize: { value: 2.2 }, uPR: { value: 1 },
        uColor: { value: new Vector3(1, 0.8, 0.5) }, uOpacity: { value: 0.6 }, uVeil: { value: 0 },
      },
    });
    const motes = new Points(this.moteGeo, this.moteMat);
    motes.frustumCulled = false;
    motes.renderOrder = -2;
    this.scene.add(motes);

    this.buildFormSystem();
    this.buildDust();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  private makeSet(n: number, forms: Record<FormKey, Float32Array>, seeds: Float32Array): FormSet {
    return {
      n,
      forms,
      attrs: Object.fromEntries(FORM_KEYS.map((k) => [k, new BufferAttribute(forms[k], 3)])) as Record<FormKey, BufferAttribute>,
      snap: new BufferAttribute(forms.dust.slice(), 3),
      seeds: new BufferAttribute(seeds, 1),
      dirs: new BufferAttribute(makeDirs(n), 3),
    };
  }

  private useSet(set: FormSet) {
    if (!this.formGeo) return;
    const g = this.formGeo;
    this.set = set;
    g.setAttribute('position', set.attrs[this.fromKey]);
    g.setAttribute('aFrom', set.attrs[this.fromKey]);
    g.setAttribute('aTo', set.attrs[this.toKey]);
    g.setAttribute('aSnap', set.snap);
    g.setAttribute('aSeed', set.seeds);
    g.setAttribute('aDir', set.dirs);
  }

  private buildFormSystem() {
    const seeds = makeSeeds(BASE_N);
    this.base = this.makeSet(BASE_N, buildForms(BASE_N, seeds), seeds);
    this.formGeo = new BufferGeometry();
    this.formMat = new ShaderMaterial({
      vertexShader: formVert, fragmentShader: formFrag,
      transparent: true, depthWrite: false, depthTest: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      uniforms: {
        uTime: { value: 0 }, uMix: { value: 0 }, uT: { value: 0 }, uScatter: { value: 0.9 },
        uSize: { value: 1.9 }, uPR: { value: 1 }, uFit: { value: 1 }, uZoom: { value: 1 }, uShift: { value: new Vector2() },
        uW1: { value: [0, 0, 0, 0] }, uW2: { value: [0, 0, 0, 0] }, uW3: { value: [0, 0, 0, 0] }, uW4: { value: [0, 0, 0, 0] }, uW5: { value: [0, 0, 0, 0] }, uW6: { value: [0, 0, 0, 0] }, uW7: { value: [0, 0, 0, 0] }, uAngMala: { value: 0 },
        uAngFlame: { value: 0 }, uAngVortex: { value: 0 }, uAngHalo: { value: 0 }, uRise: { value: 1 }, uVeil: { value: 0 },
        uColor: { value: new Vector3(1, 0.8, 0.5) }, uColor2: { value: new Vector3(1, 0.5, 0.3) }, uInk: { value: new Vector3() },
        uOpacity: { value: 0.8 }, uLight: { value: 0 },
        uNameC0: { value: new Vector2(0, 0.25) }, uNameC: { value: new Vector2(0, 0.25) }, uNameS: { value: 1 },
        uTouch: { value: new Vector2(0, -100) }, uTouchAmt: { value: 0 },
      },
    });
    this.useSet(this.base);
    this.formPts = new Points(this.formGeo, this.formMat);
    this.formPts.frustumCulled = false;
    this.scene.add(this.formPts);

    const swapIn = (k: FormKey, arr: Float32Array) => {
      this.base!.forms[k].set(arr);
      this.base!.attrs[k].needsUpdate = true;
    };
    const nameP = nameForm(BASE_N, '"Instrument Serif", Georgia, serif').then((a) => {
      swapIn('name', a);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < a.length; i += 3) {
        minX = Math.min(minX, a[i]); maxX = Math.max(maxX, a[i]);
        minY = Math.min(minY, a[i + 1]); maxY = Math.max(maxY, a[i + 1]);
      }
      this.nameNative = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX };
    }).catch(() => {});
    const lettersP = lettersForm(BASE_N, '"Tiro Devanagari Sanskrit", "Noto Serif Devanagari", "Nirmala UI", "Devanagari Sangam MN", serif').then((a) => swapIn('letters', a)).catch(() => {});
    this.textReady = Promise.all([nameP, lettersP]).then(() => {});
  }

  private textReady: Promise<void> = Promise.resolve();

  /** build the 240,000-point forms in the background, then switch to them */
  private async ensureUltra() {
    if (this.ultra || this.ultraBuilding || !this.base) return;
    this.ultraBuilding = true;
    await this.textReady; // the name and the letters are traced from fonts first
    await new Promise((r) => setTimeout(r, 300));
    const seeds = makeSeeds(ULTRA_N);
    const forms = await buildFormsAsync(ULTRA_N, seeds, { name: this.base.forms.name, letters: this.base.forms.letters });
    this.ultra = this.makeSet(ULTRA_N, forms, seeds);
    this.ultraBuilding = false;
    if (this.tier === 'ultra') this.switchSet(this.ultra);
  }

  private switchSet(set: FormSet) {
    if (this.set === set) return;
    (set.snap.array as Float32Array).set(set.forms[this.toKey]);
    set.snap.needsUpdate = true;
    this.tT = 1;
    this.tE = 1;
    this.useSet(set);
  }

  private buildDust() {
    this.dustGeo = new BufferGeometry();
    this.dustGeo.setAttribute('position', new BufferAttribute(new Float32Array(DUST_MAX * 3), 3));
    this.dustGeo.setAttribute('aDir', new BufferAttribute(makeDirs(DUST_MAX), 3));
    this.dustGeo.setAttribute('aSeed', new BufferAttribute(makeSeeds(DUST_MAX), 1));
    this.dustGeo.setDrawRange(0, 0);
    this.dustMat = new ShaderMaterial({
      vertexShader: dustVert, fragmentShader: dustFrag,
      transparent: true, depthWrite: false, depthTest: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      uniforms: {
        uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: 2.0 }, uPR: { value: 1 }, uOff: { value: new Vector2() }, uBurn: { value: 0 },
        uColor: { value: new Vector3(1, 1, 1) }, uInk: { value: new Vector3() }, uLight: { value: 0 },
      },
    });
    this.dustPts = new Points(this.dustGeo, this.dustMat);
    this.dustPts.frustumCulled = false;
    this.dustPts.renderOrder = 5;
    this.scene.add(this.dustPts);
  }

  /* ------------------------------------------------------------ API */

  setSequence(keys: string[]) {
    const valid = keys.filter((k) => PRESETS[k]);
    if (!valid.length) return;
    const forms = valid.map((k) => PRESETS[k].form);
    const changed = forms.join() !== this.seqForms.join();
    // only re-form the cloud if the forms on screen right now are the ones that changed
    const i = Math.min(Math.floor(this.fpos), forms.length - 1);
    const j = Math.min(i + 1, forms.length - 1);
    const visibleChanged = changed && (forms.length !== this.seqForms.length || forms[i] !== this.seqForms[i] || forms[j] !== this.seqForms[j]);
    this.sequenceKeys = valid;
    this.sequence = valid.map((k) => toNumeric(PRESETS[k]));
    this.position = Math.min(this.position, valid.length - 1);
    if (changed) {
      this.seqForms = forms;
      if (visibleChanged) this.morphFromCurrent();
    }
  }

  /** the two atmospheres being blended right now, and how far between them */
  get blend(): [string, string, number] {
    const i = Math.floor(this.position);
    const j = Math.min(this.sequenceKeys.length - 1, i + 1);
    return [this.sequenceKeys[i] ?? '', this.sequenceKeys[j] ?? '', this.position - i];
  }

  /** the colours on screen right now (0..1 rgb) */
  get palette() {
    return { glow: this.view.glow, ink: this.current.ink, inkSoft: this.current.inkSoft, light: this.current.light };
  }

  get ultraBuildingNow() {
    return this.ultraBuilding;
  }

  setPosition(p: number) {
    this.position = Math.max(0, Math.min(this.sequence.length - 1, p));
  }

  get chapterKey() {
    return this.sequenceKeys[Math.round(this.position)] ?? '';
  }

  setTier(tier: Tier) {
    this.tier = tier;
    this.settings = tierSettings(tier);
    if (!this.renderer || !this.bgMat || !this.moteMat) return;
    this.renderer.setPixelRatio(this.settings.pixelRatio);
    this.bgMat.uniforms.uOct.value = this.settings.octaves;
    this.bgMat.uniforms.uDeep.value = this.settings.deep ? 1 : 0;
    this.copyMat!.uniforms.uGrain.value = this.settings.grain;
    this.moteMat.uniforms.uPR.value = this.settings.pixelRatio;
    if (this.formMat) this.formMat.uniforms.uPR.value = this.settings.pixelRatio;
    if (this.dustMat) this.dustMat.uniforms.uPR.value = this.settings.pixelRatio;
    if (tier === 'ultra') {
      if (this.ultra) this.switchSet(this.ultra); else this.ensureUltra();
    } else if (this.base) {
      this.switchSet(this.base);
    }
    this.resize();
  }

  get isLive() {
    return this.available && !this.lost && this.settings.live;
  }

  /** points currently drawn by the living forms */
  get pointCount() {
    if (!this.isLive || !this.formsOn || !this.set) return 0;
    return Math.min(this.set.n, this.settings.formN);
  }

  get ultraReady() {
    return !!this.ultra;
  }

  onLost(fn: () => void) {
    this.lostHandler = fn;
  }

  setForms(on: boolean) {
    this.formsOn = on;
    if (this.formPts) this.formPts.visible = on;
  }

  releaseForms() {
    this.hold = false;
  }

  setNameAnchor(a: { cx: number; cy: number; w: number } | null) {
    this.nameAnchor = a;
  }

  setBend(on: boolean) {
    this.bendOn = on;
  }

  setPointer(x: number, y: number) {
    const aspect = this.size.x / Math.max(1, this.size.y);
    const scale = aspect >= 1 ? [0.5 * aspect, 0.5] : [0.5, 0.5 / aspect];
    this.pointerTarget.set(x * scale[0], y * scale[1]);
  }

  /** a finger or cursor at screen px (x, y); strength 0..1 */
  setTouch(x: number, y: number, strength: number) {
    const halfH = Math.tan(Math.PI / 6) * 10;
    const halfW = halfH * (this.size.x / Math.max(1, this.size.y));
    this.touchTarget.set(((x / this.size.x) * 2 - 1) * halfW, (1 - (y / this.size.y) * 2) * halfH);
    if (this.touchAmt < 0.02) this.touch.copy(this.touchTarget);
    this.touchWant = Math.max(this.touchWant, strength);
  }

  setSky(s: SkyInput) {
    this.sky = s;
  }

  /** the mala turns one bead per count */
  setMalaCount(n: number) {
    this.malaTarget = n * ((Math.PI * 2) / MALA_BEADS);
  }

  /** 0 the moon, 1 a lunar eclipse (blood moon), 2 a solar eclipse (dark disc with corona) */
  setMoonMode(m: number) {
    this.moonMode = m;
  }
  private moonMode = 0;

  /** heading dust (0) or burning words (1) */
  setDustBurn(b: number) {
    if (this.dustMat) this.dustMat.uniforms.uBurn.value = b;
  }

  setAudioLevel(v: number) {
    this.audioLevel = v;
  }

  setVelocity(v: number) {
    this.velocity = v;
  }

  impulse(amount: number) {
    this.boost += amount;
  }

  flash(amount: number) {
    this.flashAmt = Math.max(this.flashAmt, amount);
  }

  /**
   * Turn a heading into dust. `pts` are screen positions (px pairs) sampled from
   * the heading's letters; they are placed in front of the forms.
   */
  setDust(pts: Float32Array | null, count: number) {
    if (!this.dustGeo) return;
    if (!pts || !count) { this.dustGeo.setDrawRange(0, 0); return; }
    const pos = this.dustGeo.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    const D = 6;
    const halfH = Math.tan(Math.PI / 6) * D;
    const halfW = halfH * (this.size.x / Math.max(1, this.size.y));
    const n = Math.min(count, DUST_MAX);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = ((pts[i * 2] / this.size.x) * 2 - 1) * halfW;
      arr[i * 3 + 1] = (1 - (pts[i * 2 + 1] / this.size.y) * 2) * halfH;
      arr[i * 3 + 2] = -D;
    }
    pos.needsUpdate = true;
    this.dustGeo.setDrawRange(0, n);
  }

  /** progress 0..1, and how far (px) the heading has moved since it was traced */
  setDustProgress(p: number, dyPx = 0) {
    if (!this.dustMat) return;
    this.dustMat.uniforms.uP.value = p;
    const halfH = Math.tan(Math.PI / 6) * 6;
    this.dustMat.uniforms.uOff.value.set(0, (-dyPx / this.size.y) * 2 * halfH);
  }

  forceCss() {
    this.lastCss = '';
    this.writeCss();
  }

  get speed() {
    return this.velSmooth;
  }

  /* ---------------------------------------------------------- internals */

  private morphFromCurrent() {
    const set = this.set;
    if (!set) return;
    const s = set.snap.array as Float32Array;
    const a = set.forms[this.fromKey], b = set.forms[this.toKey];
    const m = this.fMix, t = this.tE;
    for (let i = 0; i < s.length; i++) {
      const scrub = a[i] + (b[i] - a[i]) * m;
      s[i] = s[i] + (scrub - s[i]) * t;
    }
    set.snap.needsUpdate = true;
    this.tT = 0;
    this.tE = 0;
    this.fposJump = true;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.size.set(w, h);
    const aspect = w / Math.max(1, h);
    const halfW = Math.tan(Math.PI / 6) * 10 * aspect;
    this.fit = Math.min(1, (halfW * 0.92) / 5.6);
    this.shiftScale = aspect > 1.15 ? 1 : 0;
    this.narrowDim = aspect < 1 ? 0.62 : 1;
    if (!this.renderer || !this.bgMat || !this.copyMat || !this.bgRT) return;
    this.renderer.setSize(w, h, false);
    const buf = new Vector2();
    this.renderer.getDrawingBufferSize(buf);
    const bw = Math.max(2, Math.round(buf.x * this.settings.bgScale));
    const bh = Math.max(2, Math.round(buf.y * this.settings.bgScale));
    this.bgRT.setSize(bw, bh);
    this.bgMat.uniforms.uRes.value.set(bw, bh);
    this.copyMat.uniforms.uRes.value.copy(buf);
    // the moon sits near the top right in any shape of screen
    const mx = (aspect >= 1 ? 0.5 * aspect : 0.5) - 0.22;
    const my = (aspect >= 1 ? 0.5 : 0.5 / aspect) - 0.2;
    this.copyMat.uniforms.uMoonPos.value.set(mx, my);
    this.copyMat.uniforms.uMoonR.value = aspect >= 1 ? 0.052 : 0.07;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    if (this.rt) this.rt.setSize(buf.x, buf.y);
  }

  private ensurePost() {
    if (this.post || !this.renderer) return;
    const buf = new Vector2();
    this.renderer.getDrawingBufferSize(buf);
    this.rt = new WebGLRenderTarget(buf.x, buf.y, { depthBuffer: false });
    const mat = new ShaderMaterial({
      vertexShader: fullVert, fragmentShader: postFrag, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: this.rt.texture }, uVel: { value: 0 } },
    });
    const scene = new Scene();
    const quad = new Mesh(new PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);
    this.post = { scene, mat };
  }

  /** colours as shown: the chapter's palette shaded by the living sky */
  private applySky() {
    const v = this.view, c = this.current, s = this.sky;
    mixInto(v, c, c, 0);
    if (!s.on) return;
    const lightKeep = 1 - 0.6 * c.light;
    const dark = (s.night * 0.2 + (s.special === 'amavasya' ? 0.3 : 0)) * lightKeep;
    for (const k of ['a', 'b', 'c'] as const) for (let i = 0; i < 3; i++) v[k][i] *= 1 - dark;
    const tint = (key: 'c' | 'glow', rgb: number[], amt: number) => { for (let i = 0; i < 3; i++) v[key][i] += (rgb[i] - v[key][i]) * amt; };
    if (s.special === 'purnima') { tint('c', [0.78, 0.83, 0.96], 0.35); tint('glow', [0.92, 0.94, 1], 0.3); }
    if (s.special === 'amavasya') { tint('glow', [0.86, 0.2, 0.12], 0.35); tint('c', [0.55, 0.08, 0.06], 0.25); }
    if (s.warm > 0) tint('c', [1, 0.58, 0.34], 0.18 * s.warm * lightKeep);
  }

  update(dt: number) {
    this.time += dt;

    const i = Math.floor(this.position);
    const j = Math.min(this.sequence.length - 1, i + 1);
    const f = this.position - i;
    const s = f * f * (3 - 2 * f);
    mixInto(this.target, this.sequence[i], this.sequence[j], s);
    dampInto(this.current, this.target, 1 - Math.exp(-dt * 3.2));
    this.applySky();

    const speedBoost = Math.min(4, Math.abs(this.velocity) * 0.035) + this.boost;
    this.boost *= Math.exp(-dt * 1.6);
    this.flashAmt *= Math.exp(-dt * 2.2);
    this.drift += dt * this.current.speed * (1 + speedBoost * 0.6);
    this.travel += dt * (0.35 + speedBoost * 3.0);
    this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 2.5));
    const vel = Math.max(-1, Math.min(1, this.velocity / 45));
    this.velSmooth += (vel - this.velSmooth) * (1 - Math.exp(-dt * 6));

    // touch eases in and out
    this.touch.lerp(this.touchTarget, 1 - Math.exp(-dt * 10));
    this.touchAmt += (this.touchWant - this.touchAmt) * (1 - Math.exp(-dt * 6));
    this.touchWant *= Math.exp(-dt * 1.4);

    if (this.fposJump) { this.fpos = this.position; this.fposJump = false; }
    this.fpos += (this.position - this.fpos) * (1 - Math.exp(-dt * 5));
    const fi = Math.floor(this.fpos);
    const fj = Math.min(this.seqForms.length - 1, fi + 1);
    const ff = this.fpos - fi;
    this.fMix = ff * ff * (3 - 2 * ff);
    const kFrom = this.seqForms[Math.min(fi, this.seqForms.length - 1)];
    const kTo = this.seqForms[fj];
    if (this.formGeo && this.set) {
      if (kFrom !== this.fromKey) { this.fromKey = kFrom; this.formGeo.setAttribute('aFrom', this.set.attrs[kFrom]); this.formGeo.setAttribute('position', this.set.attrs[kFrom]); }
      if (kTo !== this.toKey) { this.toKey = kTo; this.formGeo.setAttribute('aTo', this.set.attrs[kTo]); }
    }
    if (!this.hold && this.tT < 1) {
      this.tT = Math.min(1, this.tT + dt / 1.8);
      this.tE = ease(this.tT);
    }
    this.angFlame = (this.angFlame + dt * 0.07) % ((Math.PI * 2) / FLAMES);
    this.angVortex = (this.angVortex + dt * 0.09) % ((Math.PI * 2) / VORTEX_ARMS);
    this.angHalo = (this.angHalo + dt * 0.05) % ((Math.PI * 2) / HALO_SECTORS);

    this.writeCss();
    if (!this.isLive || !this.renderer || !this.bgMat || !this.copyMat || !this.moteMat || !this.moteGeo || !this.bgRT) return;

    const c = this.view;
    const glowBoost = this.flashAmt + this.audioLevel * 0.35;
    const u = this.bgMat.uniforms;
    u.uTime.value = this.time;
    u.uA.value.set(c.a[0], c.a[1], c.a[2]);
    u.uB.value.set(c.b[0], c.b[1], c.b[2]);
    u.uC.value.set(c.c[0], c.c[1], c.c[2]);
    u.uGlow.value.set(c.glow[0], c.glow[1], c.glow[2]);
    u.uScale.value = c.scale;
    u.uWarp.value = c.warp;
    u.uLight.value = c.light;
    u.uPointer.value.copy(this.pointer);
    u.uDrift.value = this.drift;
    u.uFlash.value = glowBoost;
    u.uVeil.value = this.veil;
    u.uDawn.value = this.dawnProgress;
    u.uDawnW.value = c.dawn;
    // between a light page and a dark one, the dark spreads in like ink
    {
      const i0 = Math.floor(this.position), A = this.sequence[i0], B = this.sequence[Math.min(this.sequence.length - 1, i0 + 1)];
      let w = 0;
      if (A && B && Math.abs(A.light - B.light) > 0.5) {
        const day = A.light > B.light ? A : B, night = day === A ? B : A;
        const t = Math.max(0, Math.min(1, (day.light - this.current.light) / (day.light - night.light)));
        w = Math.max(0, Math.min(1, Math.min(t, 1 - t) / 0.08));
        u.uInkT.value = t;
        u.uInkL.value.set(day.light, night.light);
        u.uDA.value.set(day.a[0], day.a[1], day.a[2]); u.uDB.value.set(day.b[0], day.b[1], day.b[2]); u.uDC.value.set(day.c[0], day.c[1], day.c[2]);
        u.uNA.value.set(night.a[0], night.a[1], night.a[2]); u.uNB.value.set(night.b[0], night.b[1], night.b[2]); u.uNC.value.set(night.c[0], night.c[1], night.c[2]);
      }
      u.uInk.value = w;
    }

    const cu = this.copyMat.uniforms;
    cu.uTime.value = this.time;
    const sky = this.sky;
    cu.uMoonPhase.value = sky.phase;
    cu.uMoonVis.value = (this.moonMode > 0 ? (1 - c.light) * (1 - this.veil) : sky.on ? (0.35 + 0.65 * sky.night) * (1 - c.light) * (1 - this.veil) : 0) * (this.moonMode > 0 ? 1 : c.moon);
    cu.uMoonMode.value = this.moonMode;
    if (this.moonMode === 2) cu.uMoonPhase.value = 0.5;
    if (sky.special === 'purnima') cu.uMoonTint.value.set(0.92, 0.95, 1.0);
    else cu.uMoonTint.value.set(0.96, 0.9, 0.8);

    const mu = this.moteMat.uniforms;
    mu.uTime.value = this.time;
    mu.uTravel.value = this.travel;
    mu.uColor.value.set(c.glow[0], c.glow[1], c.glow[2]);
    mu.uOpacity.value = (0.55 * (1 - 0.7 * c.light) + Math.min(0.4, speedBoost * 0.1)) * (this.formsOn ? 0.7 : 1);
    mu.uVeil.value = this.veil;
    const moteCap = this.formsOn ? Math.min(this.settings.maxMotes, 1600) : this.settings.maxMotes;
    this.moteGeo.setDrawRange(0, Math.floor(moteCap * Math.max(0.05, c.motes)));

    if (this.formMat && this.formGeo && this.formsOn && this.set) {
      const fu = this.formMat.uniforms;
      const w = c.w;
      const drawn = Math.min(this.set.n, this.settings.formN);
      // more points: each a little smaller and fainter, so the overall glow stays the same
      const density = 24000 / Math.max(1, drawn);
      fu.uSize.value = 1.9 * Math.pow(density, 0.25);
      fu.uTime.value = this.time;
      fu.uMix.value = this.fMix;
      fu.uT.value = this.tE;
      fu.uFit.value = this.fit;
      fu.uZoom.value = c.zoom;
      fu.uShift.value.set(c.shift * this.shiftScale * this.fit, 0);
      fu.uW1.value = [w[idx('flames')], w[idx('water')], w[idx('silk')], w[idx('stars')]];
      fu.uW2.value = [w[idx('letters')], w[idx('eye')], w[idx('horizon')], w[idx('sigils')]];
      fu.uW3.value = [w[idx('vortex')], w[idx('halo')], w[idx('name')], w[idx('dust')]];
      fu.uW4.value = [w[idx('mala')], w[idx('lamps')], w[idx('agni')], w[idx('lotus')]];
      fu.uW5.value = [w[idx('yantra')], w[idx('temple')], w[idx('tree')], w[idx('crossroads')]];
      fu.uW6.value = [w[idx('rose')], w[idx('pentacle')], w[idx('astrolabe')], w[idx('moons')]];
      fu.uW7.value = [w[idx('chakras')], w[idx('bowl')], 0, 0];
      this.malaAng += (this.malaTarget - this.malaAng) * (1 - Math.exp(-dt * 7));
      fu.uAngMala.value = this.malaAng;
      fu.uAngFlame.value = this.angFlame;
      fu.uAngVortex.value = this.angVortex;
      fu.uAngHalo.value = this.angHalo;
      fu.uRise.value = this.dawnProgress;
      fu.uVeil.value = this.veil;
      fu.uColor.value.set(c.glow[0], c.glow[1], c.glow[2]);
      fu.uColor2.value.set(c.c[0], c.c[1], c.c[2]);
      fu.uInk.value.set(c.ink[0], c.ink[1], c.ink[2]);
      fu.uLight.value = c.light;
      fu.uTouch.value.copy(this.touch);
      fu.uTouchAmt.value = this.touchAmt;
      const n = this.nameNative;
      fu.uNameC0.value.set(n.cx, n.cy);
      if (this.nameAnchor && n.w > 0) {
        const halfH = Math.tan(Math.PI / 6) * 10, halfW = halfH * (this.size.x / Math.max(1, this.size.y));
        const tx = ((this.nameAnchor.cx / this.size.x) * 2 - 1) * halfW;
        const ty = (1 - (this.nameAnchor.cy / this.size.y) * 2) * halfH;
        const tw = (this.nameAnchor.w / this.size.x) * 2 * halfW;
        fu.uNameS.value = tw / (n.w * this.fit);
        fu.uNameC.value.set(tx / this.fit, ty / this.fit);
      } else {
        fu.uNameS.value = 1;
        fu.uNameC.value.set(n.cx, n.cy);
      }
      const dawnDim = 1 - c.dawn * (1 - (0.25 + 0.75 * this.dawnProgress));
      fu.uOpacity.value = Math.min(1.3, 0.85 * Math.sqrt(density)) * this.narrowDim * dawnDim * (c.light > 0.5 ? 1.25 : 1) * (1 + this.audioLevel * 0.5) * c.fade;
      this.formGeo.setDrawRange(0, drawn);
    }

    if (this.dustMat) {
      const du = this.dustMat.uniforms;
      du.uTime.value = this.time;
      du.uColor.value.set(c.ink[0], c.ink[1], c.ink[2]);
      du.uInk.value.set(c.ink[0], c.ink[1], c.ink[2]);
      du.uLight.value = c.light;
    }

    // the camera drifts a little with the pointer but always looks straight ahead,
    // so the forms keep their true shape and never appear tilted
    this.camera.position.x += (this.pointer.x * 0.35 - this.camera.position.x) * 0.04;
    this.camera.position.y += (this.pointer.y * 0.22 - this.camera.position.y) * 0.04;
    this.camera.lookAt(this.camera.position.x, this.camera.position.y, -10);

    // 1) smoke at reduced resolution
    this.renderer.setRenderTarget(this.bgRT);
    this.renderer.render(this.bgScene, this.ortho);
    // 2) the world at full resolution, optionally bent by scroll speed
    const bending = this.bendOn && this.settings.post && Math.abs(this.velSmooth) > 0.02;
    if (bending) {
      this.ensurePost();
      this.renderer.setRenderTarget(this.rt!);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.post!.mat.uniforms.uVel.value = this.velSmooth;
      this.renderer.render(this.post!.scene, this.ortho);
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
  }

  private writeCss() {
    const c = this.current;
    const t = (v: number[]) => v.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)).join(' ');
    const css = `${t(c.ink)}|${t(c.inkSoft)}|${t(this.view.glow)}|${t(this.view.a)}|${t(this.view.b)}|${t(this.view.c)}|${c.light > 0.5 ? 1 : 0}`;
    if (css === this.lastCss) return;
    this.lastCss = css;
    const [ink, inkSoft, glow, a, b, cc, light] = css.split('|');
    const s = document.documentElement.style;
    s.setProperty('--ink', ink);
    s.setProperty('--ink-soft', inkSoft);
    s.setProperty('--glow', glow);
    s.setProperty('--bg-a', a);
    s.setProperty('--bg-b', b);
    s.setProperty('--bg-c', cc);
    document.documentElement.dataset.light = light;
  }
}

export function snapshot(n: Numeric) {
  return cloneNumeric(n);
}
