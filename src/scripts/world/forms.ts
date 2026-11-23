/**
 * Living forms: one cloud of light points that reshapes per chapter.
 * Every form is a list of N positions (x, y, z) around the stage centre at
 * z = -10. Forms whose motion rotates (flames, spiral, halo) are built from
 * identical repeating sectors, so their slow rotation can loop invisibly.
 * Forms are shuffled (or evenly interleaved) so that the first k points are
 * always a fair sample: lighter devices simply draw fewer points.
 */
export const CZ = -10;

export const FORM_KEYS = ['dust', 'halo', 'name', 'vortex', 'flames', 'sigils', 'water', 'silk', 'stars', 'letters', 'eye', 'horizon', 'mala', 'lamps', 'agni', 'yantra', 'temple', 'tree', 'rose', 'pentacle', 'astrolabe', 'moons', 'crossroads', 'lotus', 'chakras', 'bowl', 'halves', 'prism', 'figure', 'cards', 'mirror', 'pendulum', 'book', 'path'] as const;
export type FormKey = (typeof FORM_KEYS)[number];

export const FLAMES = 108;
export const HALO_SECTORS = 72;
export const VORTEX_ARMS = 3;
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
function lamps(n: number) {
  const r = rng(47); const o = new Float32Array(n * 3);
  const L = 150;
  const pos: number[][] = [];
  for (let l = 0; l < L; l++) {
    const z = CZ + 3.5 - Math.pow(r(), 0.8) * 11;
    const spread = 4 + (CZ + 3.5 - z) * 0.9;
    pos.push([(r() * 2 - 1) * spread, -1.9 + gauss(r) * 0.05, z]);
  }
  for (let i = 0; i < n; i++) {
    const [lx, ly, lz] = pos[i % L];
    const k = r();
    if (k < 0.6) { // the flame
      const u = Math.pow(r(), 1.4), w = 0.05 * Math.pow(Math.sin(Math.PI * (u * 0.9 + 0.06)), 0.85) * (1 - u * 0.5);
      put(o, i, lx + (r() * 2 - 1) * w, ly + 0.08 + u * 0.26, lz + (r() * 2 - 1) * w * 0.6);
    } else if (k < 0.86) { // the clay bowl
      const a = r() * Math.PI;
      put(o, i, lx + Math.cos(a) * 0.15, ly - Math.sin(a) * 0.05, lz + (r() - 0.5) * 0.1);
    } else { // its reflection on the water
      put(o, i, lx + gauss(r) * 0.05, ly - 0.08 - Math.pow(r(), 1.6) * 0.5, lz);
    }
  }
  return o;
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

/** the Kali yantra in light: bindu, five downward triangles, circles, eight petals, the gated square */
function yantra(n: number) {
  const r = rng(59);
  const segs: Seg[] = [];
  [0.55, 0.85, 1.15, 1.45, 1.75].forEach((R) => {
    segs.push(...polySegs([90, 210, 330].map((d) => [Math.cos(((d + 180) * Math.PI) / 180) * R, Math.sin(((d + 180) * Math.PI) / 180) * R])));
  });
  segs.push(...circleSegs(1.95), ...circleSegs(2.75), ...circleSegs(2.85));
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, w = Math.PI / 8;
    const pts: number[][] = [];
    for (let j = 0; j <= 12; j++) {
      const t = -w + (2 * w * j) / 12, bulge = Math.cos((t / w) * (Math.PI / 2));
      const R = 1.95 + 0.72 * bulge;
      pts.push([Math.cos(a + t) * R, Math.sin(a + t) * R]);
    }
    segs.push(...polySegs(pts, false));
  }
  const s = 3.25, g = 0.45, d = 0.32;
  segs.push(...polySegs([[-s, -s], [-g, -s], [-g, -s - d], [g, -s - d], [g, -s], [s, -s], [s, -g], [s + d, -g], [s + d, g], [s, g], [s, s], [g, s], [g, s + d], [-g, s + d], [-g, s], [-s, s], [-s, g], [-s - d, g], [-s - d, -g], [-s, -g]]));
  const line = alongSegments(Math.floor(n * 0.94), segs, r, 0.018, 0.3);
  const o = new Float32Array(n * 3);
  o.set(line);
  for (let i = Math.floor(n * 0.94); i < n; i++) { // the bindu
    const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.4) * 0.16;
    put(o, i, Math.cos(a) * rad, 0.3 + Math.sin(a) * rad, CZ + gauss(r) * 0.05);
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
    mala: mala(n),
    lamps: shuffled(lamps(n), 127),
    agni: agni(n, seeds),
    yantra: shuffled(yantra(n), 131),
    temple: shuffled(temple(n), 137),
    tree: shuffled(tree(n), 139),
    rose: shuffled(rose(n), 149),
    pentacle: shuffled(pentacle(n), 151),
    astrolabe: shuffled(astrolabe(n), 157),
    moons: shuffled(moons(n), 163),
    crossroads: shuffled(crossroads(n), 167),
    lotus: shuffled(lotus(n), 173),
    chakras: shuffled(chakras(n), 179),
    bowl: shuffled(bowl(n), 181),
    halves: shuffled(halves(n), 233),
    prism: shuffled(prism(n), 239),
    figure: shuffled(figure(n), 241),
    cards: shuffled(cards(n), 251),
    mirror: shuffled(mirror(n), 257),
    pendulum: shuffled(pendulum(n), 263),
    book: shuffled(book(n), 269),
    path: shuffled(path(n), 271),
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
    ['mala', () => mala(n)], ['lamps', () => shuffleForm(lamps(n), 127)], ['agni', () => agni(n, seeds)],
    ['yantra', () => shuffleForm(yantra(n), 131)], ['temple', () => shuffleForm(temple(n), 137)], ['tree', () => shuffleForm(tree(n), 139)],
    ['rose', () => shuffleForm(rose(n), 149)], ['pentacle', () => shuffleForm(pentacle(n), 151)], ['astrolabe', () => shuffleForm(astrolabe(n), 157)], ['moons', () => shuffleForm(moons(n), 163)],
    ['crossroads', () => shuffleForm(crossroads(n), 167)],
    ['lotus', () => shuffleForm(lotus(n), 173)], ['chakras', () => shuffleForm(chakras(n), 179)], ['bowl', () => shuffleForm(bowl(n), 181)],
    ['halves', () => shuffleForm(halves(n), 233)], ['prism', () => shuffleForm(prism(n), 239)], ['figure', () => shuffleForm(figure(n), 241)], ['cards', () => shuffleForm(cards(n), 251)],
    ['mirror', () => shuffleForm(mirror(n), 257)], ['pendulum', () => shuffleForm(pendulum(n), 263)], ['book', () => shuffleForm(book(n), 269)], ['path', () => shuffleForm(path(n), 271)],
    ['name', () => (textFrom ? upsample(textFrom.name, n, 0.01, 61) : dust(n))],
    ['letters', () => (textFrom ? upsample(textFrom.letters, n, 0.008, 67) : dust(n))],
  ];
  for (const [k, make] of steps) {
    out[k] = make();
    await wait();
  }
  return out as Record<FormKey, Float32Array>;
}
