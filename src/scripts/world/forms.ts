/**
 * Living forms: one cloud of light points that reshapes per chapter.
 * Every form is a list of N positions (x, y, z) around the stage centre at
 * z = -10. Forms whose motion rotates (flames, spiral, halo) are built from
 * identical repeating sectors, so their slow rotation can loop invisibly.
 * Forms are shuffled (or evenly interleaved) so that the first k points are
 * always a fair sample: lighter devices simply draw fewer points.
 */
export const CZ = -10;

export const FORM_KEYS = ['dust', 'halo', 'name', 'vortex', 'flames', 'sigils', 'water', 'silk', 'stars', 'letters', 'eye', 'horizon'] as const;
export type FormKey = (typeof FORM_KEYS)[number];

export const FLAMES = 108;
export const HALO_SECTORS = 72;
export const VORTEX_ARMS = 3;

/** the 51 letters of Kali's garland (varnamala): 16 vowels, 33 consonants, kṣa and jña */
export const VARNAMALA = [
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ॠ', 'ऌ', 'ॡ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः',
  'क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण',
  'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह',
  'क्ष', 'ज्ञ',
];

export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) / 2;

type Out = Float32Array;
const put = (o: Out, i: number, x: number, y: number, z: number) => {
  o[i * 3] = x; o[i * 3 + 1] = y; o[i * 3 + 2] = z;
};

function shuffleInPlace(o: Out, r: () => number) {
  const n = o.length / 3;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    for (let k = 0; k < 3; k++) { const t = o[i * 3 + k]; o[i * 3 + k] = o[j * 3 + k]; o[j * 3 + k] = t; }
  }
}

export function makeSeeds(n: number) {
  const r = rng(11);
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = r();
  return a;
}

/** random direction for the "dissolve and reform" scatter mid-morph */
export function makeDirs(n: number) {
  const r = rng(23);
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), len = 0.35 + r() * 0.65;
    put(a, i, s * Math.cos(t) * len, u * len, s * Math.sin(t) * len * 0.6);
  }
  return a;
}

/* ------------------------------------------------------------------ forms */

function dust(n: number) {
  const r = rng(3); const o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), rad = 5.8 * Math.cbrt(r());
    put(o, i, s * Math.cos(t) * rad * 1.3, u * rad * 0.7, CZ + s * Math.sin(t) * rad * 0.6);
  }
  return o;
}

/** a ring of light around the hero eye, made of identical sectors */
function halo(n: number) {
  const r = rng(5); const o = new Float32Array(n * 3);
  const per = Math.ceil(n / HALO_SECTORS);
  const tpl: number[][] = [];
  for (let k = 0; k < per; k++) {
    const outer = r() < 0.3;
    const rad = outer ? 2.9 + Math.pow(r(), 0.6) * 3.4 : 2.35 + gauss(r) * 0.22;
    tpl.push([r() * (Math.PI * 2 / HALO_SECTORS), rad, gauss(r) * (outer ? 0.9 : 0.12)]);
  }
  for (let i = 0; i < n; i++) {
    const sector = i % HALO_SECTORS, [a0, rad, dz] = tpl[Math.floor(i / HALO_SECTORS)];
    const a = a0 + sector * (Math.PI * 2 / HALO_SECTORS);
    put(o, i, Math.cos(a) * rad, 1.7 + Math.sin(a) * rad, CZ + dz);
  }
  return o;
}

/** a slow three-armed spiral, made of identical arms */
function vortex(n: number) {
  const r = rng(7); const o = new Float32Array(n * 3);
  const per = Math.ceil(n / VORTEX_ARMS);
  const tpl: number[][] = [];
  for (let k = 0; k < per; k++) {
    const core = r() < 0.18;
    const rad = core ? Math.pow(r(), 1.5) * 0.9 : 0.3 + Math.pow(r(), 0.75) * 4.6;
    const a = core ? r() * Math.PI * 2 : rad * 1.05 + gauss(r) * 0.45 / (rad + 0.4);
    tpl.push([a, rad, gauss(r) * 0.12]);
  }
  for (let i = 0; i < n; i++) {
    const arm = i % VORTEX_ARMS, [a0, rad, dz] = tpl[Math.floor(i / VORTEX_ARMS)];
    const a = a0 + arm * (Math.PI * 2 / VORTEX_ARMS);
    const u = Math.cos(a) * rad, v = Math.sin(a) * rad;
    put(o, i, u, v * 0.42, CZ + v * 0.5 + dz);
  }
  return o;
}

/** a ring of 108 flames pointing outward, like a prabhavali of lamps */
function flames(n: number) {
  const r = rng(9); const o = new Float32Array(n * 3);
  const per = Math.ceil(n / FLAMES);
  const R = 3.1, step = (Math.PI * 2) / FLAMES;
  const tpl: number[][] = []; // [radial, tangential, dz] relative to the flame base at angle 0
  for (let k = 0; k < per; k++) {
    const kind = r();
    if (kind < 0.74) {
      const u = Math.pow(r(), 1.5); // denser at the base
      const h = 0.62;
      const w = 0.095 * Math.pow(Math.sin(Math.PI * (u * 0.9 + 0.06)), 0.85) * (1 - u * 0.55);
      tpl.push([R + u * h, (r() * 2 - 1) * w, (r() * 2 - 1) * w * 0.6]);
    } else if (kind < 0.9) {
      tpl.push([R - 0.08 + gauss(r) * 0.025, (r() - 0.5) * step * R, gauss(r) * 0.03]);
    } else {
      const rad = Math.pow(r(), 0.8) * 0.32; // bindu at the centre
      const a = r() * Math.PI * 2;
      tpl.push([Math.cos(a) * rad, Math.sin(a) * rad, gauss(r) * 0.06, 1]);
    }
  }
  for (let i = 0; i < n; i++) {
    const f = i % FLAMES, t = tpl[Math.floor(i / FLAMES)];
    const a = f * step;
    if (t[3] === 1) { put(o, i, t[0], 0.25 + t[1], CZ + t[2]); continue; }
    const ca = Math.cos(a), sa = Math.sin(a);
    put(o, i, ca * t[0] - sa * t[1], 0.25 + sa * t[0] + ca * t[1], CZ + t[2]);
  }
  return o;
}

/** abstract sigil-like glyphs drawn in strokes of light */
function sigils(n: number) {
  const r = rng(42); const o = new Float32Array(n * 3);
  type Seg = [number, number, number, number]; // x1 y1 x2 y2 in glyph space
  const glyphs: { cx: number; cy: number; cz: number; s: number; segs: Seg[] }[] = [];
  const spots = [[-4.6, 1.9], [-1.6, 2.5], [1.8, 2.2], [4.7, 1.6], [-3.3, -0.6], [0.2, 0.1], [3.4, -0.5], [-1.8, -2.5], [2.0, -2.6]];
  for (const [x, y] of spots) {
    const segs: Seg[] = [];
    const strokes = 4 + Math.floor(r() * 3);
    for (let s = 0; s < strokes; s++) {
      const type = r();
      if (type < 0.3) { // circle or arc
        const ox = (r() - 0.5) * 0.6, oy = (r() - 0.5) * 0.6, rad = 0.22 + r() * 0.5;
        const a0 = r() * Math.PI * 2, sweep = r() < 0.4 ? Math.PI * 2 : 1.4 + r() * 3;
        const k = 28;
        for (let j = 0; j < k; j++) {
          const p = a0 + (sweep * j) / k, q = a0 + (sweep * (j + 1)) / k;
          segs.push([ox + Math.cos(p) * rad, oy + Math.sin(p) * rad, ox + Math.cos(q) * rad, oy + Math.sin(q) * rad]);
        }
      } else if (type < 0.85) { // straight stroke
        const a = r() * Math.PI * 2, b = a + Math.PI * (0.6 + r() * 0.8);
        const l1 = 0.3 + r() * 0.7, l2 = 0.3 + r() * 0.7;
        segs.push([Math.cos(a) * l1, Math.sin(a) * l1, Math.cos(b) * l2, Math.sin(b) * l2]);
      } else { // small node
        const ox = (r() - 0.5) * 1.4, oy = (r() - 0.5) * 1.4, rad = 0.07;
        for (let j = 0; j < 10; j++) {
          const p = (Math.PI * 2 * j) / 10, q = (Math.PI * 2 * (j + 1)) / 10;
          segs.push([ox + Math.cos(p) * rad, oy + Math.sin(p) * rad, ox + Math.cos(q) * rad, oy + Math.sin(q) * rad]);
        }
      }
    }
    glyphs.push({ cx: x + (r() - 0.5) * 0.6, cy: y + (r() - 0.5) * 0.4, cz: CZ + 1.5 - r() * 3.5, s: 0.75 + r() * 0.5, segs });
  }
  const all: { g: number; seg: Seg; len: number }[] = [];
  glyphs.forEach((g, gi) => g.segs.forEach((seg) => all.push({ g: gi, seg, len: Math.hypot(seg[2] - seg[0], seg[3] - seg[1]) * g.s })));
  const total = all.reduce((a, b) => a + b.len, 0);
  const cum: number[] = []; let acc = 0;
  for (const a of all) { acc += a.len; cum.push(acc); }
  for (let i = 0; i < n; i++) {
    const halo = r() < 0.12;
    const pick = r() * total;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < pick) lo = mid + 1; else hi = mid; }
    const { g, seg } = all[lo]; const gl = glyphs[g];
    const t = r();
    const jitter = halo ? 0.12 : 0.016;
    const x = seg[0] + (seg[2] - seg[0]) * t + gauss(r) * jitter;
    const y = seg[1] + (seg[3] - seg[1]) * t + gauss(r) * jitter;
    put(o, i, gl.cx + x * gl.s, gl.cy + y * gl.s, gl.cz + gauss(r) * 0.05);
  }
  return o;
}

/** a calm sea of light receding to the horizon, with a moon path */
function water(n: number) {
  const r = rng(13); const o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (r() < 0.12) { // moon path
      put(o, i, gauss(r) * 0.35, -2.05, CZ - 1 - r() * 9 + 3);
    } else {
      const rad = 8 * Math.sqrt(r()), a = r() * Math.PI * 2;
      put(o, i, Math.cos(a) * rad * 1.2, -2.1, CZ - 1 + Math.sin(a) * rad);
    }
  }
  return o;
}

/** a sheet of silk made of horizontal threads */
function silk(n: number) {
  const r = rng(17); const o = new Float32Array(n * 3);
  const rows = 70;
  for (let i = 0; i < n; i++) {
    const v = (Math.floor(r() * rows) + 0.5) / rows + gauss(r) * 0.0015;
    const u = r();
    put(o, i, (u - 0.5) * 13, (v - 0.5) * 6.6, CZ + Math.sin(u * 3.1 + v * 1.6) * 1.3 + Math.cos(v * 2.4 + u) * 0.5);
  }
  return o;
}

/** constellations: bright stars, faint joining lines, and a far star field */
function stars(n: number) {
  const r = rng(19); const o = new Float32Array(n * 3);
  const cons: { pts: number[][]; edges: [number, number][] }[] = [];
  for (let c = 0; c < 11; c++) {
    const cx = (r() - 0.5) * 11, cy = (r() - 0.5) * 5.6, cz = CZ - 1 - r() * 2.5;
    const count = 5 + Math.floor(r() * 4);
    const pts: number[][] = [[cx, cy, cz, 0.6 + r() * 0.4]];
    const edges: [number, number][] = [];
    for (let k = 1; k < count; k++) {
      const from = r() < 0.75 ? k - 1 : Math.floor(r() * k);
      const a = r() * Math.PI * 2, d = 0.45 + r() * 0.75;
      const p = pts[from];
      pts.push([p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d * 0.8, p[2] + (r() - 0.5) * 0.3, 0.3 + r() * 0.7]);
      edges.push([from, k]);
    }
    cons.push({ pts, edges });
  }
  const starList = cons.flatMap((c) => c.pts);
  const weightSum = starList.reduce((a, s) => a + s[3], 0);
  const edgeList = cons.flatMap((c) => c.edges.map(([a, b]) => [c.pts[a], c.pts[b]]));
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.34) {
      let pick = r() * weightSum, s = starList[0];
      for (const st of starList) { pick -= st[3]; if (pick <= 0) { s = st; break; } }
      const spread = 0.025 + s[3] * 0.03;
      put(o, i, s[0] + gauss(r) * spread, s[1] + gauss(r) * spread, s[2] + gauss(r) * spread);
    } else if (k < 0.52) {
      const [a, b] = edgeList[Math.floor(r() * edgeList.length)];
      const t = r();
      put(o, i, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    } else {
      put(o, i, (r() - 0.5) * 24, (r() - 0.5) * 13, CZ - 4 - r() * 6);
    }
  }
  return o;
}

/** the third eye, closing the homepage where the intro began */
function eye(n: number) {
  const r = rng(29); const o = new Float32Array(n * 3);
  const H = 4.2, W = 1.9, cy = 0.45;
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.46) {
      const s = r(), side = r() < 0.5 ? -1 : 1;
      const x = 2 * (1 - s) * s * W * side, y = (H / 2) * (1 - 2 * s);
      put(o, i, x + gauss(r) * 0.03, cy + y + gauss(r) * 0.03, CZ + gauss(r) * 0.05);
    } else if (k < 0.62) {
      const a = r() * Math.PI * 2, rad = 0.45 + gauss(r) * 0.02;
      put(o, i, Math.cos(a) * rad, cy + Math.sin(a) * rad, CZ);
    } else if (k < 0.72) {
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.17;
      put(o, i, Math.cos(a) * rad, cy + Math.sin(a) * rad, CZ + 0.05);
    } else {
      const a = r() * Math.PI * 2, rad = 1.4 + Math.pow(r(), 0.7) * 3.6;
      put(o, i, Math.cos(a) * rad * 0.8, cy + Math.sin(a) * rad, CZ + gauss(r) * 0.8);
    }
  }
  return o;
}

/** dawn: a sun below the horizon line and embers that rise (embers use seed > 0.55) */
function horizon(n: number, seeds: Float32Array) {
  const r = rng(31); const o = new Float32Array(n * 3);
  const hy = -2.25;
  for (let i = 0; i < n; i++) {
    if (seeds[i] > 0.55) {
      put(o, i, (r() - 0.5) * 12, hy + r() * 0.6, CZ + 1 - r() * 5);
    } else if (r() < 0.6) {
      const a = r() * Math.PI, rad = Math.pow(r(), 0.6) * 1.8;
      put(o, i, Math.cos(a) * rad, hy + Math.sin(a) * rad, CZ - 1);
    } else {
      put(o, i, (r() - 0.5) * 20, hy + gauss(r) * 0.03, CZ - 1 - r() * 6);
    }
  }
  return o;
}

/* ------------------------------------------------- forms drawn from type */

function sampleCanvas(n: number, draw: (ctx: CanvasRenderingContext2D) => void, w: number, h: number, map: (x: number, y: number) => [number, number], seed: number, extra?: (o: Out, i: number, r: () => number) => boolean) {
  const r = rng(seed); const o = new Float32Array(n * 3);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dust(n);
  draw(ctx);
  const data = ctx.getImageData(0, 0, w, h).data;
  const px: number[] = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (data[(y * w + x) * 4 + 3] > 140) px.push(x, y);
  if (px.length < 20) return dust(n);
  for (let i = 0; i < n; i++) {
    if (extra && extra(o, i, r)) continue;
    const k = Math.floor(r() * (px.length / 2)) * 2;
    const [x, y] = map(px[k] + r() * 2, px[k + 1] + r() * 2);
    put(o, i, x, y, CZ + gauss(r) * 0.08);
  }
  return o;
}

export async function nameForm(n: number, font: string) {
  try { await (document as any).fonts?.load(`300px ${font}`, 'Sarvakali'); } catch { /* fall back to whatever font is there */ }
  const W = 1800, H = 440;
  return sampleCanvas(n, (ctx) => {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 300px ${font}`;
    ctx.fillText('Sarvakali', W / 2, H / 2);
  }, W, H, (x, y) => [((x - W / 2) / W) * 11, (-(y - H / 2) / W) * 11 + 0.25], 37);
}

export async function lettersForm(n: number, font: string) {
  try { await (document as any).fonts?.load(`110px ${font}`, VARNAMALA.join('')); } catch { /* system Devanagari font is fine */ }
  const S = 1500, R = 590, scale = 3.55 / R;
  return sampleCanvas(n, (ctx) => {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 104px ${font}`;
    VARNAMALA.forEach((ch, k) => {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / VARNAMALA.length;
      ctx.fillText(ch, S / 2 + Math.cos(a) * R, S / 2 + Math.sin(a) * R);
    });
  }, S, S, (x, y) => [(x - S / 2) * scale, -(y - S / 2) * scale], 41, (o, i, r) => {
    if (r() > 0.08) return false; // the thread of the garland
    const a = r() * Math.PI * 2, rad = 3.55 * 0.84 + gauss(r) * 0.01;
    put(o, i, Math.cos(a) * rad, Math.sin(a) * rad, CZ);
    return true;
  });
}

/** all forms that need no fonts; text forms start as dust and are swapped in when ready */
export function buildForms(n: number, seeds: Float32Array): Record<FormKey, Float32Array> {
  const shuffled = (o: Out, seed: number) => { shuffleInPlace(o, rng(seed)); return o; };
  const d = dust(n);
  return {
    dust: d,
    halo: halo(n),
    name: d.slice(),
    vortex: vortex(n),
    flames: flames(n),
    sigils: shuffled(sigils(n), 101),
    water: shuffled(water(n), 103),
    silk: shuffled(silk(n), 107),
    stars: shuffled(stars(n), 109),
    letters: d.slice(),
    eye: shuffled(eye(n), 113),
    horizon: horizon(n, seeds),
  };
}

export const shuffleForm = (o: Float32Array, seed: number) => { shuffleInPlace(o, rng(seed)); return o; };

/** grow an existing form to n points by repeating it with a little jitter (used for Ultra text forms) */
export function upsample(src: Float32Array, n: number, jitter = 0.012, seed = 7) {
  const r = rng(seed);
  const m = src.length / 3;
  const o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = i % m;
    o[i * 3] = src[k * 3] + gauss(r) * jitter;
    o[i * 3 + 1] = src[k * 3 + 1] + gauss(r) * jitter;
    o[i * 3 + 2] = src[k * 3 + 2] + gauss(r) * jitter;
  }
  return o;
}

/** like buildForms, but yields to the browser between forms so a big build never freezes the page */
export async function buildFormsAsync(n: number, seeds: Float32Array, textFrom?: { name: Float32Array; letters: Float32Array }) {
  const wait = () => new Promise<void>((res) => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(() => res(), { timeout: 120 }); else setTimeout(res, 16);
  });
  const out: Partial<Record<FormKey, Float32Array>> = {};
  const steps: [FormKey, () => Float32Array][] = [
    ['dust', () => dust(n)], ['halo', () => halo(n)], ['vortex', () => vortex(n)], ['flames', () => flames(n)],
    ['sigils', () => shuffleForm(sigils(n), 101)], ['water', () => shuffleForm(water(n), 103)], ['silk', () => shuffleForm(silk(n), 107)],
    ['stars', () => shuffleForm(stars(n), 109)], ['eye', () => shuffleForm(eye(n), 113)], ['horizon', () => horizon(n, seeds)],
    ['name', () => (textFrom ? upsample(textFrom.name, n, 0.01, 61) : dust(n))],
    ['letters', () => (textFrom ? upsample(textFrom.letters, n, 0.008, 67) : dust(n))],
  ];
  for (const [k, make] of steps) {
    out[k] = make();
    await wait();
  }
  return out as Record<FormKey, Float32Array>;
}
