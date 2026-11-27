/**
 * Living forms: one cloud of light points that reshapes per chapter.
 * Every form is a list of N positions (x, y, z) around the stage centre at
 * z = -10. Forms whose motion rotates (flames, halo) are built from
 * identical repeating sectors, so their slow rotation can loop invisibly.
 * Forms are shuffled (or evenly interleaved) so that the first k points are
 * always a fair sample: lighter devices simply draw fewer points.
 */
import { KALI_YANTRA, yantraLines } from '../../data/kali-yantra';
import { KEY } from '../../data/hecate-key';

export const CZ = -10;

export const FORM_KEYS = ['dust', 'halo', 'name', 'flames', 'sigils', 'water', 'silk', 'stars', 'letters', 'eye', 'horizon', 'mala', 'lamps', 'agni', 'yantra', 'temple', 'tree', 'rose', 'pentacle', 'astrolabe', 'moons', 'crossroads', 'lotus', 'chakras', 'bowl', 'halves', 'prism', 'figure', 'cards', 'mirror', 'pendulum', 'book', 'path', 'key', 'bloom'] as const;
export type FormKey = (typeof FORM_KEYS)[number];

export const FLAMES = 108;
export const HALO_SECTORS = 72;
export const MALA_BEADS = 108;

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
/**
 * A seal of sigils: eight clean glyphs set evenly round a ring, a larger one at
 * the centre. Each glyph is drawn the way sigils are made by hand: a stem, a
 * ring where the line begins, a bar where it ends, a few arcs and crossings.
 */
function sigils(n: number) {
  const r = rng(42);
  const arc = (cx: number, cy: number, rad: number, a0: number, a1: number, k = 18) => polySegs(Array.from({ length: k + 1 }, (_, j) => { const a = a0 + ((a1 - a0) * j) / k; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; }), false);
  const ring = (cx: number, cy: number, rad: number) => circleSegs(rad, 18, cx, cy);
  const P = Math.PI;
  // nine glyphs in a unit box (about -0.5..0.5), each a different sigil
  const GLYPHS: Seg[][] = [
    [[0, -0.5, 0, 0.42], [-0.3, 0, 0.3, 0], ...ring(0, 0.5, 0.08), [-0.12, -0.5, 0.12, -0.5]],
    [...polySegs([[0, 0.5], [0.38, -0.1], [-0.38, -0.1]]), [0, -0.1, 0, -0.5], [-0.14, -0.5, 0.14, -0.5]],
    [...arc(0.05, 0, 0.42, P * 0.55, P * 1.45), [0, -0.5, 0, 0.5], ...ring(0, 0.5, 0.06)],
    [[-0.38, -0.42, 0.38, 0.42], [0.38, -0.42, -0.38, 0.42], ...ring(-0.42, 0.46, 0.07), [0.3, -0.48, 0.46, -0.36]],
    [[0, -0.5, 0, 0.3], ...arc(-0.2, 0.3, 0.2, 0, P), ...arc(0.2, 0.3, 0.2, 0, P), ...ring(0, -0.5, 0.06)],
    [...polySegs([[0, 0.5], [0.3, 0], [0, -0.5], [-0.3, 0]]), [-0.5, 0, 0.5, 0]],
    [...ring(0, 0.1, 0.18), [0, 0.28, 0, 0.5], [0.16, -0.02, 0.4, -0.3], [-0.16, -0.02, -0.4, -0.3]],
    [...polySegs([[-0.3, 0.45], [0.25, 0.15], [-0.25, -0.15], [0.3, -0.45]], false), ...ring(-0.36, 0.5, 0.07), [0.22, -0.52, 0.38, -0.38]],
    // the centre: a circle, three roads meeting, a crescent above
    [...ring(0, 0, 0.44), [0, 0, 0, -0.44], [0, 0, 0.38, 0.22], [0, 0, -0.38, 0.22], ...arc(0, 0.62, 0.2, P * 1.1, P * 1.9), ...arc(0, 0.56, 0.16, P * 1.15, P * 1.85)],
  ];
  const place = (g: Seg[], cx: number, cy: number, sc: number): Seg[] => g.map(([x1, y1, x2, y2]) => [cx + x1 * sc, cy + y1 * sc, cx + x2 * sc, cy + y2 * sc]);
  const segs: Seg[] = [...circleSegs(3.25, 120), ...circleSegs(3.1, 120), ...circleSegs(1.55, 80)];
  for (let k = 0; k < 8; k++) {
    const a = P / 2 - (k * P) / 4;
    segs.push(...place(GLYPHS[k], Math.cos(a) * 2.32, Math.sin(a) * 2.32, 0.95));
  }
  segs.push(...place(GLYPHS[8], 0, 0, 2.0));
  return alongSegments(n, segs, r, 0.012, 0.3);
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

/** a mala of 108 identical beads on a thread: it turns by one bead for every count */
function mala(n: number) {
  const r = rng(43); const o = new Float32Array(n * 3);
  const per = Math.ceil(n / MALA_BEADS);
  const R = 3.0, step = (Math.PI * 2) / MALA_BEADS, cy = 0.3;
  const tpl: number[][] = []; // [radial, tangential, dz] around a bead at angle 0
  for (let k = 0; k < per; k++) {
    if (r() < 0.86) {
      const u = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), rad = 0.072 * Math.cbrt(r());
      tpl.push([s * Math.cos(t) * rad, u * rad, s * Math.sin(t) * rad]);
    } else {
      tpl.push([gauss(r) * 0.006, (r() - 0.5) * step * R, 0]);
    }
  }
  for (let i = 0; i < n; i++) {
    const b = i % MALA_BEADS, t = tpl[Math.floor(i / MALA_BEADS)];
    const a = -Math.PI / 2 + b * step, ca = Math.cos(a), sa = Math.sin(a);
    const rad = R + t[0];
    put(o, i, ca * rad - sa * t[1], cy + sa * rad + ca * t[1], CZ + t[2]);
  }
  return o;
}

/** festival night: clay lamps floating on dark water, far into the distance */
/**
 * Five diyas floating in a gentle arc: each a clay bowl, a flame, and its
 * reflection on the water. Few and clear, so each lamp can be read.
 */
function lamps(n: number) {
  const r = rng(47);
  const segs: Seg[] = [];
  const N = 5;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1), x = -3.3 + t * 6.6, y = -1.3 + Math.cos((t - 0.5) * Math.PI) * 0.6, sc = 1.35 + Math.cos((t - 0.5) * Math.PI) * 0.5;
    // the bowl: a shallow curve with a spout
    const bowl: number[][] = [];
    for (let j = 0; j <= 16; j++) { const u = j / 16, bx = -0.42 + u * 0.84; bowl.push([x + bx * sc, y - Math.sin(u * Math.PI) * 0.2 * sc]); }
    segs.push(...polySegs(bowl, false), [x - 0.42 * sc, y, x + 0.5 * sc, y + 0.04 * sc]);
    // the flame: a teardrop, round below and pointed above
    const H = 0.5 * sc, fw = 0.15 * sc, fy = y + 0.06 * sc;
    const q = (p0: number[], c: number[], p1: number[]) => Array.from({ length: 13 }, (_, j) => { const u = j / 12; return [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]]; });
    const top = [x, fy + H], bot = [x, fy];
    segs.push(...polySegs([...q(top, [x + fw * 2.2, fy + H * 0.12], bot), ...q(bot, [x - fw * 2.2, fy + H * 0.12], top).slice(1)], false));
  }
  segs.push([-4.4, -2.05, 4.4, -2.05]);
  return alongSegments(n, segs, r, 0.01, 0.3);
}

/** the sacred fire: a havan kund whose flames rise and thin (flames use seed >= 0.16) */
function agni(n: number, seeds: Float32Array) {
  const r = rng(53); const o = new Float32Array(n * 3);
  const base = -1.45;
  for (let i = 0; i < n; i++) {
    if (seeds[i] < 0.16) { // the rim of the fire pit, an ellipse seen from slightly above
      const a = r() * Math.PI * 2, rad = 1.55 + gauss(r) * 0.04;
      put(o, i, Math.cos(a) * rad, base - 0.12 + gauss(r) * 0.02, CZ + Math.sin(a) * rad * 0.45);
    } else { // where the flames are born
      const rad = Math.pow(r(), 0.7) * 1.15, a = r() * Math.PI * 2;
      put(o, i, Math.cos(a) * rad, base + r() * 0.3, CZ + Math.sin(a) * rad * 0.45);
    }
  }
  return o;
}

/* line art drawn in points: helpers */
type Seg = [number, number, number, number];
/**
 * Points spread evenly along the lines (stratified, not random), so every form
 * reads as a clean engraved line rather than a scatter; a whisper of jitter
 * keeps it alive.
 */
function alongSegments(n: number, segs: Seg[], r: () => number, jitter: number, cy = 0) {
  const lens = segs.map(([a, b, c, d]) => Math.hypot(c - a, d - b));
  const total = lens.reduce((x, y) => x + y, 0);
  const o = new Float32Array(n * 3);
  const step = total / Math.max(1, n);
  let k = 0, acc = 0;
  for (let i = 0; i < n; i++) {
    let t = (i + 0.25 + r() * 0.5) * step;
    while (k < segs.length - 1 && t > acc + lens[k]) { acc += lens[k]; k++; }
    t -= acc;
    const [a, b, c, d] = segs[k], f = lens[k] ? Math.min(1, t / lens[k]) : 0;
    const j = jitter * 0.7;
    put(o, i, a + (c - a) * f + gauss(r) * j, cy + b + (d - b) * f + gauss(r) * j, CZ + gauss(r) * j * 1.5);
  }
  return o;
}
const polySegs = (pts: number[][], closed = true): Seg[] => {
  const out: Seg[] = [];
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; out.push([p[0], p[1], q[0], q[1]]); }
  return out;
};
const circleSegs = (r: number, steps = 72, cx = 0, cy = 0): Seg[] =>
  polySegs(Array.from({ length: steps }, (_, i) => [cx + Math.cos((i / steps) * Math.PI * 2) * r, cy + Math.sin((i / steps) * Math.PI * 2) * r]));

/** the Kali yantra in light: the same drawing as the page's yantra (src/data/kali-yantra.ts), as points */
function yantra(n: number) {
  const r = rng(59);
  const k = 3.57 / 310; // the drawing's ±310 to the world's size; y flipped (the drawing's y points down)
  const segs: Seg[] = yantraLines().flatMap((l) => polySegs(l.pts.map(([x, y]) => [x * k, -y * k]), l.closed));
  segs.push(...circleSegs(KALI_YANTRA.bindu.ring * k, 24));
  const line = alongSegments(Math.floor(n * 0.95), segs, r, 0.014, 0.3);
  const o = new Float32Array(n * 3);
  o.set(line);
  for (let i = Math.floor(n * 0.95); i < n; i++) { // the bindu
    const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.4) * 0.06;
    put(o, i, Math.cos(a) * rad, 0.3 + Math.sin(a) * rad, CZ + gauss(r) * 0.03);
  }
  return o;
}

/** a Greek temple front in light: three steps, six fluted columns, the frieze and the pediment */
function temple(n: number) {
  const r = rng(61);
  const segs: Seg[] = [];
  const W = 3.6, base = -1.9;
  [0, 1, 2].forEach((k) => { const w = W + 0.35 * (2 - k), y = base + k * 0.18; segs.push(...polySegs([[-w, y], [w, y], [w, y + 0.18], [-w, y + 0.18]])); });
  const top = 0.95, foot = base + 0.54;
  [-2.9, -1.74, -0.58, 0.58, 1.74, 2.9].forEach((x) => {
    const cw = 0.24;
    segs.push([x - cw, foot, x - cw * 0.85, top], [x + cw, foot, x + cw * 0.85, top]);
    segs.push([x - cw * 0.35, foot, x - cw * 0.3, top], [x + cw * 0.35, foot, x + cw * 0.3, top], [x, foot, x, top]);
    segs.push(...polySegs([[x - cw * 1.45, top], [x + cw * 1.45, top], [x + cw * 1.45, top + 0.1], [x - cw * 1.45, top + 0.1]]));
  });
  segs.push(...polySegs([[-W - 0.2, top + 0.1], [W + 0.2, top + 0.1], [W + 0.2, top + 0.42], [-W - 0.2, top + 0.42]]));
  segs.push(...polySegs([[-W - 0.2, top + 0.42], [W + 0.2, top + 0.42], [W + 0.2, top + 0.78], [-W - 0.2, top + 0.78]]));
  for (let x = -W; x <= W + 0.01; x += 0.6) segs.push([x, top + 0.46, x, top + 0.74], [x + 0.08, top + 0.46, x + 0.08, top + 0.74]);
  segs.push(...polySegs([[-W - 0.45, top + 0.78], [0, top + 1.75], [W + 0.45, top + 0.78]]));
  segs.push(...circleSegs(0.22, 24, 0, top + 1.18));
  return alongSegments(n, segs, r, 0.014, 0);
}

/** the world tree of the shamanic journey: roots below, branches above, three worlds */
function tree(n: number) {
  const r = rng(67);
  const segs: Seg[] = [];
  const grow = (x: number, y: number, ang: number, len: number, depth: number, dir: number) => {
    if (depth === 0) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    segs.push([x, y, x2, y2]);
    const spread = 0.42 + (r() - 0.5) * 0.2;
    grow(x2, y2, ang - spread * dir, len * 0.74, depth - 1, dir);
    grow(x2, y2, ang + spread * dir, len * 0.74, depth - 1, dir);
    if (depth > 3 && r() < 0.5) grow(x2, y2, ang + (r() - 0.5) * 0.3, len * 0.6, depth - 2, dir);
  };
  segs.push([-0.08, -1.1, -0.06, 0.6], [0.08, -1.1, 0.06, 0.6], [0, -1.1, 0, 0.6]);
  grow(0, 0.6, Math.PI / 2, 0.95, 7, 1);
  grow(0, -1.1, -Math.PI / 2, 0.7, 6, 1);
  // the three worlds: faint rings around the tree
  segs.push(...circleSegs(3.2, 90).map(([a, b, c, d]) => [a, b * 0.18 + 2.6, c, d * 0.18 + 2.6] as Seg));
  segs.push(...circleSegs(3.0, 90).map(([a, b, c, d]) => [a, b * 0.16 - 0.2, c, d * 0.16 - 0.2] as Seg));
  segs.push(...circleSegs(2.6, 90).map(([a, b, c, d]) => [a, b * 0.14 - 2.7, c, d * 0.14 - 2.7] as Seg));
  return alongSegments(n, segs, r, 0.016, 0.1);
}

/** Venus: two roses of eight petals, one inside the other */
function rose(n: number) {
  const r = rng(71);
  const segs: Seg[] = [];
  const curve = (R: number, k: number, off: number, steps = 360) => {
    const pts: number[][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2, rr = R * Math.cos(k * t);
      pts.push([Math.cos(t + off) * rr, Math.sin(t + off) * rr]);
    }
    return polySegs(pts, false);
  };
  segs.push(...curve(2.7, 4, 0), ...curve(1.55, 4, Math.PI / 8), ...circleSegs(2.95, 96), ...circleSegs(0.22, 24));
  return alongSegments(n, segs, r, 0.016, 0.3);
}

/** protection: a pentacle, point upward, inside two circles */
function pentacle(n: number) {
  const r = rng(73);
  const R = 2.55;
  const pts = [0, 1, 2, 3, 4].map((k) => { const a = Math.PI / 2 + (k * 4 * Math.PI) / 5; return [Math.cos(a) * R, Math.sin(a) * R]; });
  return alongSegments(n, [...polySegs(pts), ...circleSegs(2.6, 96), ...circleSegs(2.85, 96)], r, 0.015, 0.3);
}

/** the astrolabe: rim and degree scale, the zodiac ring, the ecliptic and the rete */
function astrolabe(n: number) {
  const r = rng(79);
  const segs: Seg[] = [...circleSegs(3.0, 120), ...circleSegs(2.82, 120), ...circleSegs(2.25, 96), ...circleSegs(1.25, 72, 0, 0.55)];
  for (let k = 0; k < 72; k++) { const a = (k / 72) * Math.PI * 2, len = k % 6 === 0 ? 0.18 : 0.09; segs.push([Math.cos(a) * 3.0, Math.sin(a) * 3.0, Math.cos(a) * (3.0 - len), Math.sin(a) * (3.0 - len)]); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; segs.push([Math.cos(a) * 2.25, Math.sin(a) * 2.25, Math.cos(a) * 2.82, Math.sin(a) * 2.82]); }
  for (let k = 0; k < 9; k++) { // the rete's star pointers
    const a = (k / 9) * Math.PI * 2 + 0.3, R1 = 1.6 + (k % 3) * 0.2;
    segs.push([Math.cos(a) * 0.9, Math.sin(a) * 0.9, Math.cos(a) * R1, Math.sin(a) * R1]);
    segs.push([Math.cos(a) * R1, Math.sin(a) * R1, Math.cos(a + 0.06) * (R1 - 0.2), Math.sin(a + 0.06) * (R1 - 0.2)]);
  }
  segs.push([-2.9, -0.6, 2.9, 0.6]); // the alidade
  return alongSegments(n, segs, r, 0.013, 0.3);
}

/** the moon's eight faces in an arc, each lit as it is in the sky */
function moons(n: number) {
  const r = rng(83); const o = new Float32Array(n * 3);
  const M = 8, R = 0.46, arc = 3.0;
  for (let i = 0; i < n; i++) {
    const k = i % M, phase = k / M;
    const a = Math.PI * (1.05 - (k / (M - 1)) * 1.1), cx = Math.cos(a) * arc, cy = 0.2 + Math.sin(a) * arc * 0.55;
    if (r() < 0.3) { // outline
      const t = r() * Math.PI * 2;
      put(o, i, cx + Math.cos(t) * R, cy + Math.sin(t) * R, CZ + gauss(r) * 0.02);
      continue;
    }
    let x = 0, y = 0;
    for (let tries = 0; tries < 12; tries++) { // a point on the lit part of this moon
      x = (r() * 2 - 1); y = (r() * 2 - 1);
      if (x * x + y * y > 1) continue;
      const edge = Math.sqrt(Math.max(0, 1 - y * y)), c = Math.cos(phase * Math.PI * 2);
      const lit = phase < 0.5 ? x > edge * c : x < -edge * c;
      if (lit || k === 0) break;
    }
    if (k === 0) { const t = r() * Math.PI * 2; x = Math.cos(t); y = Math.sin(t); } // the new moon: only its rim
    put(o, i, cx + x * R, cy + y * R, CZ + gauss(r) * 0.03);
  }
  return o;
}

/** Hecate's crossroads: three roads meeting, a light where they meet, and a faint boundary ring */
function crossroads(n: number) {
  const r = rng(89);
  const segs: Seg[] = [];
  const C = 0.3;
  [-90, 30, 150].forEach((deg) => {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const at = (t: number, side: number) => { const R = 0.42 + t * 2.75, w = 0.1 + t * 0.34; return [ux * R + nx * w * side, uy * R + ny * w * side]; };
    // the two edges of the road, widening as it comes towards you
    for (const side of [-1, 1]) { const p0 = at(0, side), p1 = at(1, side); segs.push([p0[0], p0[1], p1[0], p1[1]]); }
    // a dashed line down the middle
    for (let k = 0; k < 7; k++) { const t0 = 0.08 + k * 0.13, p0 = at(t0, 0), p1 = at(t0 + 0.06, 0); segs.push([p0[0], p0[1], p1[0], p1[1]]); }
  });
  segs.push(...circleSegs(0.46, 48), ...circleSegs(3.3, 120));
  const line = alongSegments(Math.floor(n * 0.86), segs, r, 0.016, C);
  const o = new Float32Array(n * 3);
  o.set(line);
  for (let i = Math.floor(n * 0.86); i < n; i++) { // the light at the meeting point
    const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.6) * 0.34;
    put(o, i, Math.cos(a) * rad, C + Math.sin(a) * rad, CZ + gauss(r) * 0.06);
  }
  return o;
}

/** a lotus opening on still water: three layers of petals over two ripples */
function lotus(n: number) {
  const r = rng(97);
  const segs: Seg[] = [];
  const petal = (ang: number, len: number, wid: number, by: number) => {
    const pts: number[][] = [];
    const ux = Math.sin(ang), uy = Math.cos(ang), nx = uy, ny = -ux;
    for (let k = 0; k <= 24; k++) { // up one side and down the other, a pointed leaf
      const t = k / 24, side = k <= 12 ? 1 : -1, tt = k <= 12 ? t * 2 : 2 - t * 2;
      const w = Math.sin(tt * Math.PI) * wid * (1 - tt * 0.35);
      pts.push([ux * len * tt + nx * w * side, by + uy * len * tt + ny * w * side]);
    }
    segs.push(...polySegs(pts, false));
  };
  [-1.1, -0.55, 0, 0.55, 1.1].forEach((a) => petal(a, 2.1, 0.42, -1.2));
  [-0.8, -0.27, 0.27, 0.8].forEach((a) => petal(a, 1.55, 0.36, -1.2));
  [-1.45, 1.45].forEach((a) => petal(a, 1.7, 0.36, -1.2));
  segs.push(...circleSegs(1, 72).map(([a, b, c, d]) => [a * 3.0, b * 0.32 - 1.45, c * 3.0, d * 0.32 - 1.45] as Seg));
  segs.push(...circleSegs(1, 72).map(([a, b, c, d]) => [a * 3.6, b * 0.42 - 1.6, c * 3.6, d * 0.42 - 1.6] as Seg));
  return alongSegments(n, segs, r, 0.015, 0.3);
}

/** the seven chakras of the modern system, one above another on a line of light */
function chakras(n: number) {
  const r = rng(101);
  const segs: Seg[] = [[0, -3.1, 0, 3.1]];
  for (let k = 0; k < 7; k++) {
    const y = -2.7 + k * 0.9, R = 0.3;
    segs.push(...circleSegs(R, 40, 0, y));
    for (let j = 0; j < 8; j++) { // a small lotus round each
      const a = (j / 8) * Math.PI * 2, a2 = a + Math.PI / 8;
      segs.push([Math.cos(a) * R, y + Math.sin(a) * R, Math.cos(a + Math.PI / 16) * R * 1.55, y + Math.sin(a + Math.PI / 16) * R * 1.55]);
      segs.push([Math.cos(a + Math.PI / 16) * R * 1.55, y + Math.sin(a + Math.PI / 16) * R * 1.55, Math.cos(a2) * R, y + Math.sin(a2) * R]);
    }
  }
  const line = alongSegments(Math.floor(n * 0.85), segs, r, 0.014, 0.3);
  const o = new Float32Array(n * 3);
  o.set(line);
  for (let i = Math.floor(n * 0.85); i < n; i++) { // a light at each centre
    const k = i % 7, a = r() * Math.PI * 2, rad = Math.pow(r(), 1.5) * 0.14;
    put(o, i, Math.cos(a) * rad, 0.3 - 2.7 + k * 0.9 + Math.sin(a) * rad, CZ + gauss(r) * 0.05);
  }
  return o;
}

/** a bowl mended with gold: its outline, the rim, and the seams where it broke */
function bowl(n: number) {
  const r = rng(103);
  const segs: Seg[] = [];
  const RX = 2.9, RY = 2.3, TOP = 0.9;
  const below = (x: number) => TOP - RY * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2));
  const curve: number[][] = [];
  for (let k = 0; k <= 60; k++) { const x = -RX + (2 * RX * k) / 60; curve.push([x, below(x)]); }
  segs.push(...polySegs(curve, false));
  segs.push(...circleSegs(1, 90).map(([a, b, c, d]) => [a * RX, b * 0.42 + TOP, c * RX, d * 0.42 + TOP] as Seg));
  segs.push([-0.9, below(-0.9) - 0.02, -0.9, below(-0.9) - 0.32], [0.9, below(0.9) - 0.02, 0.9, below(0.9) - 0.32], [-0.9, below(-0.9) - 0.32, 0.9, below(0.9) - 0.32]);
  const seams: number[][][] = [];
  [-1.7, -0.4, 0.9, 2.0].forEach((x0, k) => { // zigzag seams from the rim down
    const pts: number[][] = [];
    let x = x0;
    for (let j = 0; j <= 5; j++) { const y = TOP - 0.4 - j * 0.45; if (y < below(x) + 0.05) break; pts.push([x, y]); x += (j % 2 ? 0.28 : -0.22) * (k % 2 ? -1 : 1); }
    seams.push(pts);
  });
  const outline = alongSegments(Math.floor(n * 0.62), segs, r, 0.014, 0);
  const seam = alongSegments(n - Math.floor(n * 0.62), seams.flatMap((pp) => polySegs(pp, false)), r, 0.012, 0);
  const o = new Float32Array(n * 3);
  o.set(outline);
  o.set(seam, Math.floor(n * 0.62) * 3);
  return o;
}

/* ---- pillars 4 to 6 ---- */
const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, steps = 48) => Array.from({ length: steps + 1 }, (_, k) => { const a = a0 + ((a1 - a0) * k) / steps; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

/** two halves, one whole: a circle with a crescent moon on one side and a small sun on the other, joined by one seam */
function halves(n: number) {
  const r = rng(191);
  const segs: Seg[] = [...circleSegs(2.6, 120), [0, -2.6, 0, 2.6]];
  segs.push(...polySegs(arcPts(-1.15, 0, 1.05, Math.PI * 0.5, Math.PI * 1.5), false), ...polySegs(arcPts(-0.75, 0, 0.92, Math.PI * 0.62, Math.PI * 1.38), false));
  segs.push(...circleSegs(0.5, 40, 1.25, 0));
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; segs.push([1.25 + Math.cos(a) * 0.7, Math.sin(a) * 0.7, 1.25 + Math.cos(a) * 1.0, Math.sin(a) * 1.0]); }
  return alongSegments(n, segs, r, 0.013, 0.3);
}

/** a prism: one ray of light in, a fan of colours out */
function prism(n: number) {
  const r = rng(193);
  const h = 2.6, tri = [[0, h * 0.62], [-h * 0.62, -h * 0.45], [h * 0.62, -h * 0.45]];
  const segs: Seg[] = [...polySegs(tri)];
  const inAt = [-h * 0.31, h * 0.085], outAt = [h * 0.31, h * 0.085];
  segs.push([-4.3, -0.7, inAt[0], inAt[1]], [inAt[0], inAt[1], outAt[0], outAt[1] - 0.05]);
  for (let k = 0; k < 7; k++) { const y = -1.7 + k * 0.42; segs.push([outAt[0], outAt[1], 4.3, y]); }
  return alongSegments(n, segs, r, 0.012, 0.3);
}

/** a human figure in light, gently drawn, not gendered: head, shoulders, arms, the body standing */
function figure(n: number) {
  const r = rng(197);
  const half = [[0.18, 1.62], [0.62, 1.42], [0.92, 1.18], [1.02, 0.6], [1.08, -0.2], [1.12, -0.7], [0.98, -0.72], [0.86, -0.1], [0.74, 0.5], [0.62, 0.0], [0.6, -0.6], [0.66, -1.05], [0.56, -1.9], [0.46, -2.75], [0.16, -2.75], [0.1, -1.6], [0.0, -1.1]];
  const segs: Seg[] = [...polySegs(half, false), ...polySegs(half.map(([x, y]) => [-x, y]), false), ...circleSegs(0.48, 48, 0, 2.15)];
  return alongSegments(n, segs, r, 0.012, 0.1);
}

/** three cards, fanned: a crescent, a sun, a star */
function cards(n: number) {
  const r = rng(199);
  const segs: Seg[] = [];
  const W = 0.78, H = 1.32, pivot = [0, -2.0];
  [-15, 0, 15].forEach((deg, k) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const tr = (x: number, y: number) => { const dx = x, dy = y - pivot[1]; return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c]; };
    const cy = 0.05 + (k === 1 ? 0.25 : 0);
    const rect = (w: number, h: number) => polySegs([tr(-w, cy - h), tr(w, cy - h), tr(w, cy + h), tr(-w, cy + h)]);
    segs.push(...rect(W, H), ...rect(W - 0.1, H - 0.1));
    const sym: number[][] = k === 0 ? [...arcPts(0, cy, 0.36, Math.PI * 0.35, Math.PI * 1.65, 30), ...arcPts(0.14, cy, 0.3, Math.PI * 1.5, Math.PI * 0.5, 30).reverse()]
      : k === 1 ? arcPts(0, cy, 0.34, 0, Math.PI * 2, 40)
      : Array.from({ length: 11 }, (_, j) => { const aa = Math.PI / 2 + (j * Math.PI) / 5, rr = j % 2 ? 0.16 : 0.4; return [Math.cos(aa) * rr, cy + Math.sin(aa) * rr]; });
    segs.push(...polySegs(sym.map(([x, y]) => tr(x, y)), k !== 0));
  });
  return alongSegments(n, segs, r, 0.011, 0.3);
}

/** a scrying mirror on its stand, with rings on its dark surface */
function mirror(n: number) {
  const r = rng(211);
  const ell = (rx: number, ry: number, cy = 0.3, steps = 96) => polySegs(Array.from({ length: steps }, (_, k) => { const a = (k / steps) * Math.PI * 2; return [Math.cos(a) * rx, cy + Math.sin(a) * ry]; }));
  const segs: Seg[] = [...ell(1.7, 2.35), ...ell(1.52, 2.17), ...ell(0.42, 0.56, 0.1, 40), ...ell(0.86, 1.14, 0.1, 60), ...ell(1.22, 1.62, 0.1, 72)];
  segs.push([-0.5, -2.05, -0.9, -2.75], [0.5, -2.05, 0.9, -2.75], [-1.2, -2.75, 1.2, -2.75]);
  return alongSegments(n, segs, r, 0.011, 0);
}

/** a pendulum on its chain, a crystal at its end */
function pendulum(n: number) {
  const r = rng(223);
  const segs: Seg[] = [...circleSegs(0.12, 16, 0, 2.6), [0, 2.48, 0, -0.75]];
  for (let k = 0; k < 14; k++) { const y = 2.4 - k * 0.23; segs.push(...circleSegs(0.05, 8, 0, y)); }
  segs.push(...polySegs([[0, -0.75], [0.34, -1.25], [0, -2.15], [-0.34, -1.25]]), [-0.34, -1.25, 0.34, -1.25], [0, -0.75, 0, -2.15]);
  segs.push(...polySegs(arcPts(0, 2.6, 4.9, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42, 60), false));
  return alongSegments(n, segs, r, 0.01, 0.2);
}

/** an open book: two pages curving from the spine, a few lines of text on each */
function book(n: number) {
  const r = rng(227);
  const segs: Seg[] = [[0, -1.5, 0, 1.6]];
  [-1, 1].forEach((side) => {
    const top = Array.from({ length: 30 }, (_, k) => { const t = k / 29; return [side * 3.1 * t, 1.6 + Math.sin(t * Math.PI) * 0.35 - t * 0.1]; });
    const bot = Array.from({ length: 30 }, (_, k) => { const t = k / 29; return [side * 3.1 * t, -1.5 + Math.sin(t * Math.PI) * 0.3 - t * 0.1]; });
    segs.push(...polySegs(top, false), ...polySegs(bot, false), [side * 3.1, 1.5, side * 3.1, -1.6]);
    for (let k = 0; k < 6; k++) { const y = 1.05 - k * 0.4, x0 = side * 0.35, x1 = side * (k === 5 ? 1.6 : 2.7); segs.push([x0, y + 0.18, x1, y + 0.12]); }
  });
  return alongSegments(n, segs, r, 0.01, 0.2);
}

/** a path of study: stations joined like a constellation, from the first step to the last */
function path(n: number) {
  const r = rng(229);
  const pts = [[-3.4, -2.2], [-2.5, -1.5], [-1.5, -1.6], [-0.7, -0.8], [0.1, -0.5], [0.7, 0.4], [1.5, 0.7], [2.3, 1.5], [3.3, 2.2]];
  const branch = [[[-1.5, -1.6], [-1.1, -2.5]], [[0.7, 0.4], [0.2, 1.4]], [[1.5, 0.7], [2.5, 0.1]]];
  const segs: Seg[] = [...polySegs(pts, false), ...branch.map(([a, b]) => [a[0], a[1], b[0], b[1]] as Seg)];
  [...pts, ...branch.map(([, b]) => b)].forEach(([x, y], k) => segs.push(...circleSegs(k === pts.length - 1 ? 0.3 : 0.16, 20, x, y)));
  return alongSegments(n, segs, r, 0.01, 0.2);
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

/* ---------------------------------------------- the golden bloom, where the galaxy was */

/**
 * The golden bloom: seeds set by the golden angle, as in a sunflower's head, each a little brighter dot, growing
 * outward, ringed by 21 petals (a Fibonacci number). The shader breathes it in a slow wave from the centre.
 */
function bloom(n: number) {
  const r = rng(301); const o = new Float32Array(n * 3);
  const SEEDS = 700, GOLD = Math.PI * (3 - Math.sqrt(5)), R = 2.8, P = 21, cy = 0.3;
  for (let i = 0; i < n; i++) {
    if (r() < 0.8) {
      const k = Math.floor(r() * SEEDS), rad = R * Math.sqrt((k + 0.5) / SEEDS), a = k * GOLD;
      const sr = 0.03 + 0.07 * (rad / R), da = r() * Math.PI * 2, dr = Math.pow(r(), 0.7) * sr;
      put(o, i, Math.cos(a) * rad + Math.cos(da) * dr, cy + Math.sin(a) * rad + Math.sin(da) * dr, CZ + gauss(r) * 0.03 + (rad / R) * 0.25);
    } else { // a petal's outline: two curved edges meeting at the tip
      const p = Math.floor(r() * P), t = r(), side = r() < 0.5 ? -1 : 1;
      const along = R * 1.04 + t * R * 0.5, half = (Math.PI / P) * 0.92 * Math.sin(Math.PI * Math.pow(t, 0.8)) * (1 - t * 0.15);
      const a = (p * Math.PI * 2) / P + side * half;
      put(o, i, Math.cos(a) * along + gauss(r) * 0.01, cy + Math.sin(a) * along + gauss(r) * 0.01, CZ + gauss(r) * 0.03 + 0.25);
    }
  }
  return o;
}

/** the pixels a drawing covers, every other pixel, as a flat list of x, y */
function inked(draw: (ctx: CanvasRenderingContext2D) => void, S: number) {
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  draw(ctx);
  const d = ctx.getImageData(0, 0, S, S).data;
  const px: number[] = [];
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (d[(y * S + x) * 4 + 3] > 140) px.push(x, y);
  return px;
}

/**
 * Hecate's key in light (the drawing is in src/data/hecate-key.ts, shared with the mark on the page): engraved lines
 * and finer detail, a soft glow on the crescent and the three small lights, and a few sparks at the bit's wards that
 * the shader lets drift up. Points are placed by their seed (not shuffled), so the sparks stay sparks.
 */
function keyForm(n: number, seeds: Float32Array) {
  const S = 1000, k = S / 400, t = KEY.transform;
  const place = (ctx: CanvasRenderingContext2D) => { ctx.scale(k, k); ctx.translate(t[0], t[1]); ctx.rotate((t[2] * Math.PI) / 180); ctx.scale(t[3], t[3]); };
  const lines = inked((ctx) => {
    place(ctx); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2 / t[3]; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    KEY.lines.forEach((d) => ctx.stroke(new Path2D(d)));
  }, S);
  const detail = inked((ctx) => {
    place(ctx); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8 / t[3]; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    KEY.detail.forEach((d) => ctx.stroke(new Path2D(d)));
  }, S);
  const glows = inked((ctx) => { place(ctx); ctx.fillStyle = '#fff'; KEY.glows.forEach((d) => ctx.fill(new Path2D(d))); }, S);
  if (lines.length < 20) return dust(n);
  const r = rng(283);
  const o = new Float32Array(n * 3);
  const map = (x: number, y: number) => [((x - S / 2) / S) * 7.2, -((y - S / 2) / S) * 7.2 + 0.3];
  const pick = (px: number[]) => { const j = Math.floor(r() * (px.length / 2)) * 2; return map(px[j] + r() * 2, px[j + 1] + r() * 2); };
  for (let i = 0; i < n; i++) {
    if (seeds[i] < 0.05) { // a spark, born at one of the bit's wards
      const [sx, sy] = KEY.sparks[i % KEY.sparks.length];
      const [x, y] = map(sx * k + gauss(r) * 8, sy * k + gauss(r) * 8);
      put(o, i, x, y, CZ + gauss(r) * 0.05);
      continue;
    }
    const u = r();
    const [x, y] = u < 0.13 && glows.length ? pick(glows) : u < 0.42 && detail.length ? pick(detail) : pick(lines);
    put(o, i, x, y, CZ + gauss(r) * 0.05);
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

type Made = Exclude<FormKey, 'name' | 'letters'>;
/** how to make each form that needs no fonts, one at a time (so the page can make only those it shows first) */
export function formMakers(n: number, seeds: Float32Array): Record<Made, () => Float32Array> {
  const sh = (o: Out, seed: number) => { shuffleInPlace(o, rng(seed)); return o; };
  return {
    dust: () => dust(n),
    halo: () => halo(n),
    flames: () => flames(n),
    sigils: () => sh(sigils(n), 101),
    water: () => sh(water(n), 103),
    silk: () => sh(silk(n), 107),
    stars: () => sh(stars(n), 109),
    eye: () => sh(eye(n), 113),
    horizon: () => horizon(n, seeds),
    mala: () => mala(n),
    lamps: () => sh(lamps(n), 127),
    agni: () => agni(n, seeds),
    yantra: () => sh(yantra(n), 131),
    temple: () => sh(temple(n), 137),
    tree: () => sh(tree(n), 139),
    rose: () => sh(rose(n), 149),
    pentacle: () => sh(pentacle(n), 151),
    astrolabe: () => sh(astrolabe(n), 157),
    moons: () => sh(moons(n), 163),
    crossroads: () => sh(crossroads(n), 167),
    lotus: () => sh(lotus(n), 173),
    chakras: () => sh(chakras(n), 179),
    bowl: () => sh(bowl(n), 181),
    halves: () => sh(halves(n), 233),
    prism: () => sh(prism(n), 239),
    figure: () => sh(figure(n), 241),
    cards: () => sh(cards(n), 251),
    mirror: () => sh(mirror(n), 257),
    pendulum: () => sh(pendulum(n), 263),
    book: () => sh(book(n), 269),
    path: () => sh(path(n), 271),
    key: () => keyForm(n, seeds),
    bloom: () => sh(bloom(n), 317),
  };
}

/** all forms that need no fonts, at once; text forms start as dust and are swapped in when ready */
export function buildForms(n: number, seeds: Float32Array): Record<FormKey, Float32Array> {
  const made = Object.fromEntries(Object.entries(formMakers(n, seeds)).map(([k, make]) => [k, make()])) as Record<Made, Float32Array>;
  return { ...made, name: made.dust.slice(), letters: made.dust.slice() };
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
    ...(Object.entries(formMakers(n, seeds)) as [FormKey, () => Float32Array][]),
    ['name', () => (textFrom ? upsample(textFrom.name, n, 0.01, 61) : dust(n))],
    ['letters', () => (textFrom ? upsample(textFrom.letters, n, 0.008, 67) : dust(n))],
  ];
  for (const [k, make] of steps) {
    out[k] = make();
    await wait();
  }
  return out as Record<FormKey, Float32Array>;
}
