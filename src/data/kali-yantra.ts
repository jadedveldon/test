/**
 * The Kali yantra, drawn once and used everywhere it appears (the yantra that draws itself on pillar pages, and the
 * world's yantra in light). Traditional geometry, drawn for Sarvakali in the owner's chosen style: the bindu in its
 * ring, five downward triangles, three circles, a lotus of eight pointed petals (each with an inner petal), the great
 * circle, and the square enclosure (bhupura) drawn as a double line, with a T-shaped gate on each side.
 * Coordinates in a space of about ±310, centred on the bindu; y points down, as in SVG.
 */
export type Pt = [number, number];
export type Line = { pts: Pt[]; closed: boolean };

const polar = (r: number, deg: number): Pt => {
  const a = ((deg - 90) * Math.PI) / 180; // 0° points up
  return [Math.cos(a) * r, Math.sin(a) * r];
};
const circle = (r: number, steps = 120): Line => ({ pts: Array.from({ length: steps }, (_, i) => polar(r, (i / steps) * 360)), closed: true });
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 16): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ] as Pt;
  });

/** a lotus petal at angle a: from its base on the circle r0, swelling, then drawn in to its tip at r1 */
const petal = (a: number, r0: number, r1: number, half: number): Line => {
  const span = r1 - r0;
  const left = cubic(polar(r0, a - half), polar(r0 + span * 0.62, a - half * 1.08), polar(r0 + span * 0.62, a - half * 0.14), polar(r1, a));
  const right = cubic(polar(r1, a), polar(r0 + span * 0.62, a + half * 0.14), polar(r0 + span * 0.62, a + half * 1.08), polar(r0, a + half));
  return { pts: [...left, ...right.slice(1)], closed: false };
};

/** the bhupura's outline: a square with a T-shaped gate on each side (B half the square, the gates out to O) */
const bhupura = (B: number, stem: number, bar: number, S: number, O: number): Pt[] => {
  const side: Pt[] = [[-B, -B], [-stem, -B], [-stem, -S], [-bar, -S], [-bar, -O], [bar, -O], [bar, -S], [stem, -S], [stem, -B]];
  const turn = (p: Pt, k: number): Pt => { let [x, y] = p; for (let i = 0; i < k; i++) [x, y] = [-y, x]; return [x, y]; };
  return [0, 1, 2, 3].flatMap((k) => side.map((p) => turn(p, k)));
};
/** the same outline moved inward by t (every corner is a right angle) */
const inset = (pts: Pt[], t: number): Pt[] => {
  const n = pts.length;
  const area = pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * p[1], 0);
  const sgn = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const d1 = [p[0] - a[0], p[1] - a[1]], d2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(d1[0], d1[1]), l2 = Math.hypot(d2[0], d2[1]);
    const n1 = [(-d1[1] / l1) * sgn, (d1[0] / l1) * sgn], n2 = [(-d2[1] / l2) * sgn, (d2[0] / l2) * sgn];
    return [p[0] + (n1[0] + n2[0]) * t, p[1] + (n1[1] + n2[1]) * t] as Pt;
  });
};

/** a lotus of eight petals, each with an inner petal, between the circles r0 and r1 */
export const lotus = (r0: number, r1: number): Line[] => [
  ...Array.from({ length: 8 }, (_, k) => petal(k * 45, r0, r1, 22.5)),
  ...Array.from({ length: 8 }, (_, k) => petal(k * 45, r0, r0 + (r1 - r0) * 0.6, 13)),
];

/** downward triangle with circumradius r */
const triangle = (r: number): Line => ({ pts: [polar(r, 180), polar(r, 300), polar(r, 60)], closed: true });

/** every line of the yantra, from the centre outward (the order it draws itself in) */
export const KALI_YANTRA = {
  bindu: { r: 3.2, ring: 8 },
  /** the five triangles, inner to outer */
  triangles: [56, 74, 93, 112, 130].map(triangle),
  circles: [136, 148, 158].map((r) => circle(r)),
  petals: lotus(158, 222),
  great: circle(224),
  bhupura: (() => {
    const outer = bhupura(234, 56, 156, 256, 310);
    return [{ pts: outer, closed: true }, { pts: inset(outer, 10), closed: true }];
  })(),
};

/** all the lines in drawing order */
export const yantraLines = (): Line[] => [
  ...KALI_YANTRA.triangles, ...KALI_YANTRA.circles, ...KALI_YANTRA.petals, KALI_YANTRA.great, ...KALI_YANTRA.bhupura,
];

/** a line as an SVG path */
export const lineD = (l: Line) => `M${l.pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}${l.closed ? 'Z' : ''}`;
