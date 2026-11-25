/**
 * Hecate's sign, drawn once as engraved line art (in a 400 × 400 box) and used twice: as the light form
 * behind her chapters, and as the small marks on the page. Three are offered to compare, each sourced (see the
 * cover's fact-check table): she is "most often shown holding a pair of torches, a key, or snakes". So: her twin
 * torches (Phosphoros, the light-bringer), her key (Kleidouchos, keeper of the keys) and her serpent. The earlier
 * three-roads mark, a circle with three roads meeting, read as a peace sign.
 */
export type HecateSign = 'torches' | 'key' | 'serpent';
export const HECATE_SIGNS: HecateSign[] = ['torches', 'key', 'serpent'];
export const HECATE_SIGN_NAMES: Record<HecateSign, string> = { torches: 'Twin torches', key: 'The key', serpent: 'The serpent' };

/**
 * lines are drawn as strokes; glows are filled softly (the heart of a flame, the dark moon's crescent);
 * sparks are where sparks rise from; transform places the drawing ([x, y, degrees, scale]) when it is drawn
 * in its own coordinates
 */
export type Sign = { lines: string[]; glows: string[]; sparks: [number, number][]; transform?: [number, number, number, number] };

const f = (v: number) => v.toFixed(1);

/* ---------------------------------------------------------------- twin torches */
const torch = (dir: 1 | -1) => {
  const t = (x: number, y: number) => `${f(200 + dir * (x - 200))} ${f(y)}`;
  const shaft = `M${t(210, 374)} L${t(232, 172)} L${t(264, 168)} L${t(224, 376)} Z`;
  const bands = [0, 1, 2].map((k) => `M${t(231 + k * 1.1, 194 + k * 13)} L${t(260 - k * 2.6, 190 + k * 13)}`).join(' ');
  const cup = `M${t(220, 170)} C${t(222, 148)} ${t(278, 142)} ${t(278, 166)} Z`;
  // a living flame: three tongues of uneven height
  const flame = `M${t(250, 152)} C${t(212, 142)} ${t(210, 108)} ${t(232, 86)} C${t(232, 102)} ${t(240, 106)} ${t(244, 96)} C${t(246, 78)} ${t(256, 66)} ${t(252, 44)} C${t(272, 64)} ${t(288, 92)} ${t(280, 116)} C${t(286, 108)} ${t(290, 102)} ${t(292, 94)} C${t(302, 124)} ${t(288, 148)} ${t(250, 152)} Z`;
  const heart = `M${t(250, 146)} C${t(234, 136)} ${t(236, 116)} ${t(248, 100)} C${t(254, 114)} ${t(266, 122)} ${t(262, 134)} C${t(260, 142)} ${t(256, 146)} ${t(250, 146)} Z`;
  return { lines: [shaft, bands, cup, flame], glows: [heart], spark: [200 + dir * 52, 48] as [number, number] };
};
const TL = torch(-1), TR = torch(1);

/* ---------------------------------------------------------------- the key (drawn level, then set on a slant) */
const keyLines = [
  // the bow: a double ring holding the dark moon's crescent
  'M60 0 A60 60 0 1 0 -60 0 A60 60 0 1 0 60 0 Z', 'M45 0 A45 45 0 1 0 -45 0 A45 45 0 1 0 45 0 Z',
  'M8 -26 A26 26 0 1 0 8 26 A21 21 0 1 1 8 -26 Z',
  // collars where the bow meets the shank, and two more along it
  'M64 -13 L64 13 M72 -15 L72 15 M80 -13 L80 13',
  'M80 -7 L292 -7 M80 7 L292 7',
  'M150 -11 L150 11 M160 -11 L160 11',
  // the bit: a plate with its wards cut out, and the shank's tip
  'M248 7 L248 54 L262 54 L262 38 L272 38 L272 54 L284 54 L284 30 L292 30 L292 7',
  'M292 -7 L300 -7 L300 7 L292 7',
];

/* ---------------------------------------------------------------- the serpent (built from its centre line) */
type P = [number, number];
function serpent(): { lines: string[]; glows: string[] } {
  const pts: P[] = [];
  const widths: number[] = [];
  // the tail coils round, seen a little from above, then the neck rises in an S to the head
  const cx = 196, cy = 300, turns = 1.45, N = 150;
  for (let i = 0; i <= N; i++) {
    const u = i / N, a = Math.PI * 0.95 + u * turns * Math.PI * 2, rad = 104 - u * 50;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.5]);
    widths.push(2 + 14 * Math.min(1, u * 1.6));
  }
  const [ex, ey] = pts[pts.length - 1];
  const bez = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
    const m = 1 - t;
    return [m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]];
  };
  const neck: [P, P, P, P] = [[ex, ey], [ex + 78, ey - 40], [150, 176], [212, 118]];
  for (let i = 1; i <= 90; i++) { const t = i / 90; pts.push(bez(...neck, t)); widths.push(16 - t * 6); }
  // edges, offset each side of the centre line
  const left: P[] = [], right: P[] = [];
  pts.forEach((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dy = q[1] - o[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w = widths[i] / 2;
    left.push([p[0] + nx * w, p[1] + ny * w]); right.push([p[0] - nx * w, p[1] - ny * w]);
  });
  const poly = (a: P[]) => `M${a.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')}`;
  // belly scales: short strokes across the body
  const scales: string[] = [];
  for (let i = 12; i < pts.length - 4; i += 4) scales.push(`M${f(left[i][0])} ${f(left[i][1])} L${f(right[i][0])} ${f(right[i][1])}`);
  // the head: a long, low wedge looking right, with an eye and a forked tongue
  const [hx, hy] = pts[pts.length - 1];
  const head = `M${f(hx - 4)} ${f(hy + 9)} C${f(hx + 14)} ${f(hy + 12)} ${f(hx + 42)} ${f(hy + 8)} ${f(hx + 58)} ${f(hy - 2)} C${f(hx + 46)} ${f(hy - 14)} ${f(hx + 16)} ${f(hy - 18)} ${f(hx - 2)} ${f(hy - 9)}`;
  const eye = `M${f(hx + 30)} ${f(hy - 6)} a3 3 0 1 0 0.1 0 Z`;
  const tongue = `M${f(hx + 58)} ${f(hy - 2)} L${f(hx + 74)} ${f(hy - 4)} L${f(hx + 82)} ${f(hy - 10)} M${f(hx + 74)} ${f(hy - 4)} L${f(hx + 83)} ${f(hy + 1)}`;
  return { lines: [poly(left), poly(right), scales.join(' '), head, eye, tongue], glows: [] };
}
const SERPENT = serpent();

export const SIGNS: Record<HecateSign, Sign> = {
  torches: { lines: [...TL.lines, ...TR.lines, 'M146 386 C180 378 220 378 254 386'], glows: [...TL.glows, ...TR.glows], sparks: [TL.spark, TR.spark] },
  key: { lines: keyLines, glows: ['M8 -26 A26 26 0 1 0 8 26 A21 21 0 1 1 8 -26 Z'], sparks: [], transform: [96, 112, 42, 0.92] },
  serpent: { lines: SERPENT.lines, glows: SERPENT.glows, sparks: [] },
};
