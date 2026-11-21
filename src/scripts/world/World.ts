import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
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
  FLAMES, HALO_SECTORS, VORTEX_ARMS, FORM_KEYS, buildForms, lettersForm, makeDirs, makeSeeds, nameForm,
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

const bgFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
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
uniform float uGrain;
uniform float uFlash;
uniform float uVeil;
uniform float uDawn;
uniform float uDawnW;

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

  vec3 col = mix(uA, uB, smoothstep(0.18, 0.86, n));
  float hi = smoothstep(0.52, 1.05, n + 0.35 * length(q) - 0.18);
  col = mix(col, uC, hi * 0.85);

  float d = length(p - uPointer);
  col += uGlow * (0.15 + 0.12 * uFlash) * exp(-d * d * 2.6) * (1.0 - 0.6 * uLight);

  float vig = smoothstep(1.35, 0.15, length(p * vec2(0.9, 1.0)));
  col *= mix(1.0, mix(0.32, 1.0, vig), 1.0 - 0.75 * uLight);

  // dawn hero: night first, then light rising from below the horizon
  float sky = smoothstep(0.55, -0.75, p.y);
  float band = exp(-pow((p.y + 0.42) * 5.0, 2.0));
  col = mix(col, col * 0.3, uDawnW * (1.0 - uDawn));
  col += (uC * sky * 0.6 + uGlow * band * 0.4) * uDawn * uDawnW;

  col += uGlow * uFlash * 0.55;

  // smoke veil used by the "smoke" page change: rises from below and fills the screen
  if (uVeil > 0.001) {
    float sm = fbm(sp * 1.4 + vec2(0.0, uTime * 0.25));
    float s = 0.25 + (1.0 - vUv.y) + sm * 0.55;
    float cover = smoothstep(s - 0.2, s + 0.05, uVeil * 2.0);
    col = mix(col, mix(uA * 0.6, uB * 0.85, sm), cover);
  }

  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

/* ambient motes that stream through depth */
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

/* the living forms */
const formVert = /* glsl */ `
uniform float uTime;
uniform float uMix;
uniform float uT;
uniform float uScatter;
uniform float uSize;
uniform float uPR;
uniform float uFit;
uniform vec2 uShift;
uniform vec4 uW1; // flames, water, silk, stars
uniform vec4 uW2; // letters, eye, horizon, sigils
uniform vec4 uW3; // vortex, halo, name, dust
uniform float uAngFlame;
uniform float uAngVortex;
uniform float uAngHalo;
uniform float uRise;
uniform float uVeil;
uniform vec2 uNameC0;
uniform vec2 uNameC;
uniform float uNameS;
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
  // dissolve between forms, then reform
  p += aDir * uScatter * (sin(3.14159 * uMix) + sin(3.14159 * uT));
  // name of light: sit exactly where the page heading is
  p.xy = mix(p.xy, (p.xy - uNameC0) * uNameS + uNameC, uW3.z);

  // flames: the fire-ring turns slowly and flickers outward
  vec2 fc = vec2(0.0, 0.25);
  p.xy = mix(p.xy, fc + rot(p.xy - fc, uAngFlame), uW1.x);
  vec2 rd = normalize(p.xy - fc + 1e-4);
  p.xy += rd * sin(uTime * 9.0 + aSeed * 40.0) * 0.02 * uW1.x;
  // water: slow ripples spreading out
  float d = length(vec2(p.x / 1.2, p.z - (CZ - 1.0)));
  p.y += sin(d * 2.3 - uTime * 1.3) * 0.16 * uW1.y;
  // silk: a slow wave through the cloth
  p.z += sin(p.x * 0.7 + p.y * 0.9 + uTime * 0.8) * 0.45 * uW1.z;
  p.y += sin(p.x * 0.5 + uTime * 0.6) * 0.18 * uW1.z;
  // letters: the garland sways
  p.xy = mix(p.xy, rot(p.xy, sin(uTime * 0.25) * 0.1), uW2.x);
  // eye: breathes
  vec2 ec = vec2(0.0, 0.45);
  p.xy = mix(p.xy, ec + (p.xy - ec) * (1.0 + 0.035 * sin(uTime * 1.2)), uW2.y);
  // sigils: drift in depth
  p.z += sin(uTime * 0.4 + aSeed * 10.0) * 0.25 * uW2.w;
  p.y += sin(uTime * 0.3 + aSeed * 7.0) * 0.06 * uW2.w;
  // spiral: turns within its tilted disc
  vec2 uv = rot(vec2(p.x, (p.z - CZ) / 0.5), uAngVortex);
  p = mix(p, vec3(uv.x, uv.y * 0.42, CZ + uv.y * 0.5), uW3.x);
  // halo: turns around the hero eye
  vec2 hc = vec2(0.0, 1.7);
  p.xy = mix(p.xy, hc + rot(p.xy - hc, uAngHalo), uW3.y);
  // dawn: embers rise
  float wr = uW2.z * step(0.55, aSeed);
  float climb = fract(uTime * 0.045 + aSeed * 3.7);
  p.y += climb * 4.5 * wr * uRise;
  p.x += sin(uTime * 0.5 + aSeed * 20.0) * 0.15 * wr;

  p.xy = p.xy * uFit + uShift;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float twinkle = 1.0 + sin(uTime * 2.6 + aSeed * 60.0) * 0.5 * uW1.w;
  gl_PointSize = uSize * uPR * (0.55 + aSeed * 0.9) * twinkle * (10.0 / max(depth, 0.5));
  vA = (0.55 + 0.45 * fract(aSeed * 13.0)) * smoothstep(40.0, 12.0, depth) * smoothstep(0.5, 3.0, depth) * (1.0 - uVeil);
  vA *= 1.0 - wr * uRise * smoothstep(0.55, 1.0, climb);
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
  col = mix(col, uInk, uLight); // ink dust on light worlds
  float alpha = a * vA * uOpacity;
  // alpha 0 = additive light on dark worlds, alpha 1 = normal ink on light worlds
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
  uv.y += (uv.x - 0.5) * (uv.x - 0.5) * v * 0.14; // the world bends with speed
  vec2 off = vec2(0.0, v * 0.007);             // and splits into colour
  float r = texture2D(tScene, uv + off).r;
  float g = texture2D(tScene, uv).g;
  float b = texture2D(tScene, uv - off).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`;

/* -------------------------------------------------------------- tier setup */

type TierSettings = { live: boolean; pixelRatio: number; octaves: number; deep: boolean; maxMotes: number; maxForm: number; grain: number; post: boolean };

function tierSettings(tier: Tier): TierSettings {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  switch (tier) {
    case 'full':
      return { live: true, pixelRatio: Math.min(dpr, 1.75), octaves: 5, deep: true, maxMotes: 6500, maxForm: FORM_N, grain: 0.035, post: true };
    case 'lighter':
      return { live: true, pixelRatio: Math.min(dpr, 1.25) * 0.6, octaves: 3, deep: false, maxMotes: 1800, maxForm: 9000, grain: 0.03, post: false };
    default:
      return { live: false, pixelRatio: 1, octaves: 3, deep: false, maxMotes: 0, maxForm: 0, grain: 0, post: false };
  }
}

const MOTES = 6500;
const FORM_N = 24000;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const idx = (k: FormKey) => FORM_KEYS.indexOf(k);

/* ------------------------------------------------------------------- world */

/**
 * One living atmosphere behind every page. Pages give it a sequence of preset
 * names and a scroll position along that sequence; it blends colours, smoke
 * and the living forms between them, and eases towards the result, so even
 * page changes morph instead of cutting.
 */
export class World {
  readonly available: boolean;
  private renderer?: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(60, 1, 0.1, 100);
  private bgMat?: ShaderMaterial;
  private moteMat?: ShaderMaterial;
  private moteGeo?: BufferGeometry;
  private settings: TierSettings = tierSettings('full');

  // living forms
  private formMat?: ShaderMaterial;
  private formGeo?: BufferGeometry;
  private formPts?: Points;
  private forms?: Record<FormKey, Float32Array>;
  private formAttrs?: Record<FormKey, BufferAttribute>;
  private snap?: BufferAttribute;
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

  // bend and colour split
  private bendOn = true;
  private rt?: WebGLRenderTarget;
  private post?: { scene: Scene; cam: OrthographicCamera; mat: ShaderMaterial };
  private velSmooth = 0;

  private sequence: Numeric[] = [toNumeric(PRESETS.loader)];
  private sequenceKeys: string[] = ['loader'];
  private position = 0;
  private target: Numeric = toNumeric(PRESETS.loader);
  readonly current: Numeric = toNumeric(PRESETS.loader);

  private lost = false;
  private lostHandler: (() => void) | null = null;
  private nameNative = { cx: 0, cy: 0.25, w: 7 };
  private nameAnchor: { cx: number; cy: number; w: number } | null = null;

  /** 0..1, raised by the "smoke" page change */
  veil = 0;
  /** 0..1, how far the dawn hero has risen */
  dawnProgress = 1;

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

    // if the browser drops the 3D context (memory pressure, driver reset), stop drawing and let the page fall back
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.lostHandler?.();
    }, false);

    // full-screen smoke
    this.bgMat = new ShaderMaterial({
      vertexShader: fullVert,
      fragmentShader: bgFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uRes: { value: new Vector2(1, 1) },
        uA: { value: new Vector3() }, uB: { value: new Vector3() }, uC: { value: new Vector3() }, uGlow: { value: new Vector3() },
        uScale: { value: 1.5 }, uWarp: { value: 2 }, uLight: { value: 0 }, uOct: { value: 5 }, uDeep: { value: 1 },
        uPointer: { value: new Vector2() }, uDrift: { value: 0 }, uGrain: { value: 0.035 }, uFlash: { value: 0 },
        uVeil: { value: 0 }, uDawn: { value: 1 }, uDawnW: { value: 0 },
      },
    });
    const bg = new Mesh(new PlaneGeometry(2, 2), this.bgMat);
    bg.frustumCulled = false;
    bg.renderOrder = -2;
    this.scene.add(bg);

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
      vertexShader: moteVert,
      fragmentShader: moteFrag,
      transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uTravel: { value: 0 }, uSize: { value: 2.2 }, uPR: { value: 1 },
        uColor: { value: new Vector3(1, 0.8, 0.5) }, uOpacity: { value: 0.6 }, uVeil: { value: 0 },
      },
    });
    const motes = new Points(this.moteGeo, this.moteMat);
    motes.frustumCulled = false;
    motes.renderOrder = -1;
    this.scene.add(motes);

    this.buildFormSystem();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  private buildFormSystem() {
    const seeds = makeSeeds(FORM_N);
    this.forms = buildForms(FORM_N, seeds);
    this.formAttrs = Object.fromEntries(FORM_KEYS.map((k) => [k, new BufferAttribute(this.forms![k], 3)])) as Record<FormKey, BufferAttribute>;
    this.snap = new BufferAttribute(this.forms.dust.slice(), 3);
    this.formGeo = new BufferGeometry();
    // three needs a position attribute for the draw count; aFrom stands in
    this.formGeo.setAttribute('position', this.formAttrs.dust);
    this.formGeo.setAttribute('aFrom', this.formAttrs.dust);
    this.formGeo.setAttribute('aTo', this.formAttrs.dust);
    this.formGeo.setAttribute('aSnap', this.snap);
    this.formGeo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    this.formGeo.setAttribute('aDir', new BufferAttribute(makeDirs(FORM_N), 3));
    this.formMat = new ShaderMaterial({
      vertexShader: formVert,
      fragmentShader: formFrag,
      transparent: true, depthWrite: false, depthTest: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      uniforms: {
        uTime: { value: 0 }, uMix: { value: 0 }, uT: { value: 0 }, uScatter: { value: 0.9 },
        uSize: { value: 1.9 }, uPR: { value: 1 }, uFit: { value: 1 }, uShift: { value: new Vector2() },
        uW1: { value: [0, 0, 0, 0] }, uW2: { value: [0, 0, 0, 0] }, uW3: { value: [0, 0, 0, 0] },
        uAngFlame: { value: 0 }, uAngVortex: { value: 0 }, uAngHalo: { value: 0 }, uRise: { value: 1 }, uVeil: { value: 0 },
        uColor: { value: new Vector3(1, 0.8, 0.5) }, uColor2: { value: new Vector3(1, 0.5, 0.3) }, uInk: { value: new Vector3() },
        uOpacity: { value: 0.8 }, uLight: { value: 0 },
        uNameC0: { value: new Vector2(0, 0.25) }, uNameC: { value: new Vector2(0, 0.25) }, uNameS: { value: 1 },
      },
    });
    this.formPts = new Points(this.formGeo, this.formMat);
    this.formPts.frustumCulled = false;
    this.scene.add(this.formPts);

    // forms drawn from type, swapped in when their fonts are ready
    const swapIn = (k: FormKey, arr: Float32Array) => {
      this.forms![k].set(arr);
      this.formAttrs![k].needsUpdate = true;
    };
    nameForm(FORM_N, '"Instrument Serif", Georgia, serif').then((a) => {
      swapIn('name', a);
      // measure the drawn name so it can be fitted over the real heading
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < a.length; i += 3) {
        minX = Math.min(minX, a[i]); maxX = Math.max(maxX, a[i]);
        minY = Math.min(minY, a[i + 1]); maxY = Math.max(maxY, a[i + 1]);
      }
      this.nameNative = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX };
    }).catch(() => {});
    lettersForm(FORM_N, '"Tiro Devanagari Sanskrit", "Noto Serif Devanagari", "Nirmala UI", "Devanagari Sangam MN", serif').then((a) => swapIn('letters', a)).catch(() => {});
  }

  /* ------------------------------------------------------------ API */

  /** the preset names this page scrolls through, in order */
  setSequence(keys: string[]) {
    const valid = keys.filter((k) => PRESETS[k]);
    if (!valid.length) return;
    const forms = valid.map((k) => PRESETS[k].form);
    const changed = forms.join() !== this.seqForms.join();
    this.sequenceKeys = valid;
    this.sequence = valid.map((k) => toNumeric(PRESETS[k]));
    this.position = Math.min(this.position, valid.length - 1);
    if (changed) {
      this.seqForms = forms;
      this.morphFromCurrent();
    }
  }

  /** float position along the sequence: 2.5 = halfway between chapter 2 and 3 */
  setPosition(p: number) {
    this.position = Math.max(0, Math.min(this.sequence.length - 1, p));
  }

  get chapterKey() {
    return this.sequenceKeys[Math.round(this.position)] ?? '';
  }

  setTier(tier: Tier) {
    this.settings = tierSettings(tier);
    if (!this.renderer || !this.bgMat || !this.moteMat) return;
    this.renderer.setPixelRatio(this.settings.pixelRatio);
    this.bgMat.uniforms.uOct.value = this.settings.octaves;
    this.bgMat.uniforms.uDeep.value = this.settings.deep ? 1 : 0;
    this.bgMat.uniforms.uGrain.value = this.settings.grain;
    this.moteMat.uniforms.uPR.value = this.settings.pixelRatio;
    if (this.formMat) this.formMat.uniforms.uPR.value = this.settings.pixelRatio;
    this.resize();
  }

  get isLive() {
    return this.available && !this.lost && this.settings.live;
  }

  /** called once if the 3D context is lost */
  onLost(fn: () => void) {
    this.lostHandler = fn;
  }

  setForms(on: boolean) {
    this.formsOn = on;
    if (this.formPts) this.formPts.visible = on;
  }

  /** let the forms gather (they wait as loose dust behind the intro) */
  releaseForms() {
    this.hold = false;
  }

  /** screen position (px, as at the top of the page) and width of the heading the name should cover */
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

  setVelocity(v: number) {
    this.velocity = v;
  }

  impulse(amount: number) {
    this.boost += amount;
  }

  flash(amount: number) {
    this.flashAmt = Math.max(this.flashAmt, amount);
  }

  forceCss() {
    this.lastCss = '';
    this.writeCss();
  }

  /* ---------------------------------------------------------- internals */

  /** freeze what is on screen into the snapshot and morph from there */
  private morphFromCurrent() {
    if (!this.forms || !this.snap) return;
    const s = this.snap.array as Float32Array;
    const a = this.forms[this.fromKey], b = this.forms[this.toKey];
    const m = this.fMix, t = this.tE;
    for (let i = 0; i < s.length; i++) {
      const scrub = a[i] + (b[i] - a[i]) * m;
      s[i] = s[i] + (scrub - s[i]) * t;
    }
    this.snap.needsUpdate = true;
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
    if (!this.renderer || !this.bgMat) return;
    this.renderer.setSize(w, h, false);
    const buf = new Vector2();
    this.renderer.getDrawingBufferSize(buf);
    this.bgMat.uniforms.uRes.value.copy(buf);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    if (this.rt) this.rt.setSize(buf.x, buf.y);
  }

  private ensurePost() {
    if (this.post || !this.renderer) return;
    const buf = new Vector2();
    this.renderer.getDrawingBufferSize(buf);
    this.rt = new WebGLRenderTarget(buf.x, buf.y);
    const mat = new ShaderMaterial({
      vertexShader: fullVert, fragmentShader: postFrag, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: this.rt.texture }, uVel: { value: 0 } },
    });
    const scene = new Scene();
    const quad = new Mesh(new PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);
    this.post = { scene, cam: new OrthographicCamera(-1, 1, 1, -1, 0, 1), mat };
  }

  update(dt: number) {
    this.time += dt;

    // colours and smoke: blend neighbouring chapters, then ease towards it
    const i = Math.floor(this.position);
    const j = Math.min(this.sequence.length - 1, i + 1);
    const f = this.position - i;
    const s = f * f * (3 - 2 * f);
    mixInto(this.target, this.sequence[i], this.sequence[j], s);
    dampInto(this.current, this.target, 1 - Math.exp(-dt * 3.2));

    const speedBoost = Math.min(4, Math.abs(this.velocity) * 0.035) + this.boost;
    this.boost *= Math.exp(-dt * 1.6);
    this.flashAmt *= Math.exp(-dt * 2.2);
    this.drift += dt * this.current.speed * (1 + speedBoost * 0.6);
    this.travel += dt * (0.35 + speedBoost * 3.0);
    this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 2.5));
    const v = Math.max(-1, Math.min(1, this.velocity / 45));
    this.velSmooth += (v - this.velSmooth) * (1 - Math.exp(-dt * 6));

    // forms: follow the scroll, swapping which two forms are being mixed
    if (this.fposJump) { this.fpos = this.position; this.fposJump = false; }
    this.fpos += (this.position - this.fpos) * (1 - Math.exp(-dt * 5));
    const fi = Math.floor(this.fpos);
    const fj = Math.min(this.seqForms.length - 1, fi + 1);
    const ff = this.fpos - fi;
    this.fMix = ff * ff * (3 - 2 * ff);
    const kFrom = this.seqForms[Math.min(fi, this.seqForms.length - 1)];
    const kTo = this.seqForms[fj];
    if (this.formGeo && this.formAttrs) {
      if (kFrom !== this.fromKey) { this.fromKey = kFrom; this.formGeo.setAttribute('aFrom', this.formAttrs[kFrom]); this.formGeo.setAttribute('position', this.formAttrs[kFrom]); }
      if (kTo !== this.toKey) { this.toKey = kTo; this.formGeo.setAttribute('aTo', this.formAttrs[kTo]); }
    }
    if (!this.hold && this.tT < 1) {
      this.tT = Math.min(1, this.tT + dt / 1.8);
      this.tE = ease(this.tT);
    }
    // rotations loop by one repeating sector, so the loop is invisible
    this.angFlame = (this.angFlame + dt * 0.07) % ((Math.PI * 2) / FLAMES);
    this.angVortex = (this.angVortex + dt * 0.09) % ((Math.PI * 2) / VORTEX_ARMS);
    this.angHalo = (this.angHalo + dt * 0.05) % ((Math.PI * 2) / HALO_SECTORS);

    this.writeCss();
    if (!this.isLive || !this.renderer || !this.bgMat || !this.moteMat || !this.moteGeo) return;

    const c = this.current;
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
    u.uFlash.value = this.flashAmt;
    u.uVeil.value = this.veil;
    u.uDawn.value = this.dawnProgress;
    u.uDawnW.value = c.dawn;

    const mu = this.moteMat.uniforms;
    mu.uTime.value = this.time;
    mu.uTravel.value = this.travel;
    mu.uColor.value.set(c.glow[0], c.glow[1], c.glow[2]);
    mu.uOpacity.value = (0.55 * (1 - 0.7 * c.light) + Math.min(0.4, speedBoost * 0.1)) * (this.formsOn ? 0.7 : 1);
    mu.uVeil.value = this.veil;
    const moteCap = this.formsOn ? Math.min(this.settings.maxMotes, 1600) : this.settings.maxMotes;
    this.moteGeo.setDrawRange(0, Math.floor(moteCap * Math.max(0.05, c.motes)));

    if (this.formMat && this.formGeo && this.formsOn) {
      const fu = this.formMat.uniforms;
      const w = c.w;
      fu.uTime.value = this.time;
      fu.uMix.value = this.fMix;
      fu.uT.value = this.tE;
      fu.uFit.value = this.fit;
      fu.uShift.value.set(c.shift * this.shiftScale * this.fit, 0);
      fu.uW1.value = [w[idx('flames')], w[idx('water')], w[idx('silk')], w[idx('stars')]];
      fu.uW2.value = [w[idx('letters')], w[idx('eye')], w[idx('horizon')], w[idx('sigils')]];
      fu.uW3.value = [w[idx('vortex')], w[idx('halo')], w[idx('name')], w[idx('dust')]];
      fu.uAngFlame.value = this.angFlame;
      fu.uAngVortex.value = this.angVortex;
      fu.uAngHalo.value = this.angHalo;
      fu.uRise.value = this.dawnProgress;
      fu.uVeil.value = this.veil;
      fu.uColor.value.set(c.glow[0], c.glow[1], c.glow[2]);
      fu.uColor2.value.set(c.c[0], c.c[1], c.c[2]);
      fu.uInk.value.set(c.ink[0], c.ink[1], c.ink[2]);
      fu.uLight.value = c.light;
      const dawnDim = 1 - c.dawn * (1 - (0.25 + 0.75 * this.dawnProgress));
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
      fu.uOpacity.value = 0.85 * this.narrowDim * dawnDim * (c.light > 0.5 ? 1.25 : 1);
      this.formGeo.setDrawRange(0, this.settings.maxForm);
    }

    this.camera.position.x += (this.pointer.x * 0.6 - this.camera.position.x) * 0.05;
    this.camera.position.y += (this.pointer.y * 0.4 - this.camera.position.y) * 0.05;
    this.camera.lookAt(this.camera.position.x * 0.3, this.camera.position.y * 0.3, -10);

    const bending = this.bendOn && this.settings.post && Math.abs(this.velSmooth) > 0.02;
    if (bending) {
      this.ensurePost();
      this.renderer.setRenderTarget(this.rt!);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.post!.mat.uniforms.uVel.value = this.velSmooth;
      this.renderer.render(this.post!.scene, this.post!.cam);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** the page's text and fallback gradient follow the world's colours */
  private writeCss() {
    const c = this.current;
    const t = (v: number[]) => v.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)).join(' ');
    const css = `${t(c.ink)}|${t(c.inkSoft)}|${t(c.glow)}|${t(c.a)}|${t(c.b)}|${t(c.c)}|${c.light > 0.5 ? 1 : 0}`;
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

  /** how fast the page is scrolling, smoothed, -1..1 (used for the text skew) */
  get speed() {
    return this.velSmooth;
  }
}

export function snapshot(n: Numeric) {
  return cloneNumeric(n);
}
