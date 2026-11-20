import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { PRESETS, toNumeric, mixInto, dampInto, cloneNumeric, type Numeric } from './presets';
import type { Tier } from '../tiers';

/* ------------------------------------------------------------------ shaders */

const bgVert = /* glsl */ `
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

  // domain-warped smoke: noise feeding noise
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

  // soft light that follows the pointer
  float d = length(p - uPointer);
  col += uGlow * (0.15 + 0.12 * uFlash) * exp(-d * d * 2.6) * (1.0 - 0.6 * uLight);

  // vignette (weaker in light worlds)
  float vig = smoothstep(1.35, 0.15, length(p * vec2(0.9, 1.0)));
  col *= mix(1.0, mix(0.32, 1.0, vig), 1.0 - 0.75 * uLight);

  // bloom flash used by the intro
  col += uGlow * uFlash * 0.55;

  // film grain
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}`;

const ptVert = /* glsl */ `
uniform float uTime;
uniform float uTravel;
uniform float uSize;
uniform float uPR;
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
  vAlpha = smoothstep(34.0, 16.0, depth) * smoothstep(0.4, 2.4, depth) * (0.35 + 0.65 * fract(aSeed * 7.0));
}`;

const ptFrag = /* glsl */ `
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

/* -------------------------------------------------------------- tier setup */

type TierSettings = { live: boolean; pixelRatio: number; octaves: number; deep: boolean; maxMotes: number; grain: number };

function tierSettings(tier: Tier): TierSettings {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  switch (tier) {
    case 'full':
      return { live: true, pixelRatio: Math.min(dpr, 1.75), octaves: 5, deep: true, maxMotes: 6500, grain: 0.035 };
    case 'lighter':
      return { live: true, pixelRatio: Math.min(dpr, 1.25) * 0.6, octaves: 3, deep: false, maxMotes: 1800, grain: 0.03 };
    default:
      return { live: false, pixelRatio: 1, octaves: 3, deep: false, maxMotes: 0, grain: 0 };
  }
}

const MOTES = 6500;

/* ------------------------------------------------------------------- world */

/**
 * One living atmosphere behind every page. Pages give it a sequence of preset
 * names and a scroll position along that sequence; it blends between them and
 * eases towards the result, so even page changes morph instead of cutting.
 */
export class World {
  readonly available: boolean;
  private renderer?: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(60, 1, 0.1, 100);
  private bgMat?: ShaderMaterial;
  private ptMat?: ShaderMaterial;
  private ptGeo?: BufferGeometry;
  private settings: TierSettings = tierSettings('full');
  private tier: Tier = 'full';

  private sequence: Numeric[] = [toNumeric(PRESETS.loader)];
  private sequenceKeys: string[] = ['loader'];
  private position = 0;
  private target: Numeric = toNumeric(PRESETS.loader);
  readonly current: Numeric = toNumeric(PRESETS.loader);

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

  constructor(private canvas: HTMLCanvasElement) {
    let ok = false;
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
      this.renderer.autoClear = true;
      ok = true;
    } catch {
      ok = false;
    }
    this.available = ok;
    if (!ok || !this.renderer) return;

    // full-screen smoke
    this.bgMat = new ShaderMaterial({
      vertexShader: bgVert,
      fragmentShader: bgFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uRes: { value: new Vector2(1, 1) },
        uA: { value: new Vector3() }, uB: { value: new Vector3() }, uC: { value: new Vector3() }, uGlow: { value: new Vector3() },
        uScale: { value: 1.5 }, uWarp: { value: 2 }, uLight: { value: 0 }, uOct: { value: 5 }, uDeep: { value: 1 },
        uPointer: { value: new Vector2() }, uDrift: { value: 0 }, uGrain: { value: 0.035 }, uFlash: { value: 0 },
      },
    });
    const bg = new Mesh(new PlaneGeometry(2, 2), this.bgMat);
    bg.frustumCulled = false;
    bg.renderOrder = -1;
    this.scene.add(bg);

    // drifting motes of light
    const pos = new Float32Array(MOTES * 3);
    const seed = new Float32Array(MOTES);
    for (let i = 0; i < MOTES; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = Math.random() * 34 - 30;
      seed[i] = Math.random();
    }
    this.ptGeo = new BufferGeometry();
    this.ptGeo.setAttribute('position', new BufferAttribute(pos, 3));
    this.ptGeo.setAttribute('aSeed', new BufferAttribute(seed, 1));
    this.ptMat = new ShaderMaterial({
      vertexShader: ptVert,
      fragmentShader: ptFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uTravel: { value: 0 }, uSize: { value: 2.2 }, uPR: { value: 1 },
        uColor: { value: new Vector3(1, 0.8, 0.5) }, uOpacity: { value: 0.6 },
      },
    });
    const pts = new Points(this.ptGeo, this.ptMat);
    pts.frustumCulled = false;
    this.scene.add(pts);

    this.camera.position.set(0, 0, 0);
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  /** the preset names this page scrolls through, in order */
  setSequence(keys: string[]) {
    const valid = keys.filter((k) => PRESETS[k]);
    if (!valid.length) return;
    this.sequenceKeys = valid;
    this.sequence = valid.map((k) => toNumeric(PRESETS[k]));
    this.position = Math.min(this.position, valid.length - 1);
  }

  /** float position along the sequence: 2.5 = halfway between chapter 2 and 3 */
  setPosition(p: number) {
    this.position = Math.max(0, Math.min(this.sequence.length - 1, p));
  }

  get chapterKey() {
    return this.sequenceKeys[Math.round(this.position)] ?? '';
  }

  setTier(tier: Tier) {
    this.tier = tier;
    this.settings = tierSettings(tier);
    if (!this.renderer || !this.bgMat || !this.ptMat) return;
    this.renderer.setPixelRatio(this.settings.pixelRatio);
    this.bgMat.uniforms.uOct.value = this.settings.octaves;
    this.bgMat.uniforms.uDeep.value = this.settings.deep ? 1 : 0;
    this.bgMat.uniforms.uGrain.value = this.settings.grain;
    this.ptMat.uniforms.uPR.value = this.settings.pixelRatio;
    this.resize();
  }

  get isLive() {
    return this.available && this.settings.live;
  }

  /** pointer in -1..1 screen space */
  setPointer(x: number, y: number) {
    const aspect = this.size.x / Math.max(1, this.size.y);
    const scale = aspect >= 1 ? [0.5 * aspect, 0.5] : [0.5, 0.5 / aspect];
    this.pointerTarget.set(x * scale[0], y * scale[1]);
  }

  /** scroll speed in pixels per frame, makes the motes stream faster */
  setVelocity(v: number) {
    this.velocity = v;
  }

  /** a burst of forward travel, used when flying into the third eye */
  impulse(amount: number) {
    this.boost += amount;
  }

  flash(amount: number) {
    this.flashAmt = Math.max(this.flashAmt, amount);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.size.set(w, h);
    if (!this.renderer || !this.bgMat) return;
    this.renderer.setSize(w, h, false);
    const buf = new Vector2();
    this.renderer.getDrawingBufferSize(buf);
    this.bgMat.uniforms.uRes.value.copy(buf);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number) {
    this.time += dt;

    // blend the two neighbouring chapters, then ease towards that blend
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

    this.writeCss();
    if (!this.isLive || !this.renderer || !this.bgMat || !this.ptMat || !this.ptGeo) return;

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

    const pu = this.ptMat.uniforms;
    pu.uTime.value = this.time;
    pu.uTravel.value = this.travel;
    pu.uColor.value.set(c.glow[0], c.glow[1], c.glow[2]);
    pu.uOpacity.value = 0.55 * (1 - 0.7 * c.light) + Math.min(0.4, speedBoost * 0.1);
    this.ptGeo.setDrawRange(0, Math.floor(this.settings.maxMotes * Math.max(0.05, c.motes)));

    this.camera.position.x += (this.pointer.x * 0.6 - this.camera.position.x) * 0.05;
    this.camera.position.y += (this.pointer.y * 0.4 - this.camera.position.y) * 0.05;
    this.camera.lookAt(this.camera.position.x * 0.3, this.camera.position.y * 0.3, -10);

    this.renderer.render(this.scene, this.camera);
  }

  /** rewrite the colour variables even if nothing changed (after a page swap) */
  forceCss() {
    this.lastCss = '';
    this.writeCss();
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
}

export function snapshot(n: Numeric) {
  return cloneNumeric(n);
}
