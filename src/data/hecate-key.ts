/**
 * Hecate's key, drawn once as engraved line art (in a 400 × 400 box) and used twice: as the light form behind her
 * chapters on Witchcraft & Magic, and as the small mark beside her name. She is "most often shown holding a pair of
 * torches, a key, or snakes" (see the cover's fact-check table); the key is hers as Kleidouchos, keeper of the keys.
 * The bow has three lobes for her three forms (she was often shown triple-bodied, as in the hekataia) and holds the
 * dark moon's crescent; an aureole of rays stands behind it. The design is ornament, not a historical object.
 */
export type Sign = {
  /** the main strokes, drawn everywhere */
  lines: string[];
  /** finer strokes (the aureole, the twist, the tracery), drawn in light but left out of the small mark */
  detail: string[];
  /** filled softly: the crescent and the three small lights */
  glows: string[];
  /** where sparks drift from (box coordinates) */
  sparks: [number, number][];
  /** where the drawing sits in the box: [x, y, degrees, scale] */
  transform: [number, number, number, number];
};

const f = (v: number) => v.toFixed(1);
const rad = (d: number) => (d * Math.PI) / 180;
const circle = (cx: number, cy: number, r: number) => `M${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} Z`;

/* the key is drawn level, bow at the origin, the shank running along +x and the bit hanging below it (+y) */

// the bow: three overlapping lobes; only their outer edge is drawn, and drawn again a little inside it (inset), as
// an engraved double line
const LOBES = [180, 60, 300];
function lobesOutline(d: number, r: number, inset = 0) {
  const cs = LOBES.map((a) => [Math.cos(rad(a)) * d, Math.sin(rad(a)) * d]);
  return cs.map(([cx, cy], k) => {
    let path = '', pen = false;
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (cs.some(([ox, oy], j) => j !== k && Math.hypot(x - ox, y - oy) < r - 0.01)) { pen = false; continue; }
      const ri = r - inset;
      path += `${pen ? 'L' : 'M'}${f(cx + Math.cos(a) * ri)} ${f(cy + Math.sin(a) * ri)} `; pen = true;
    }
    return path.trim();
  }).join(' ');
}
// the dark moon's crescent: a circle (r 13) less one offset beside it (r 11, 5 along), meeting at (7.3, ±10.8)
const crescent = 'M7.3 -10.8 A13 13 0 1 0 7.3 10.8 A11 11 0 1 1 7.3 -10.8 Z';
const eyes = LOBES.map((a) => [Math.cos(rad(a)) * 40, Math.sin(rad(a)) * 40]);

// the aureole: a ring and rays, long and short, all round except where the shank leaves
const aureole = [`M${f(Math.cos(rad(40)) * 70)} ${f(Math.sin(rad(40)) * 70)} A70 70 0 1 1 ${f(Math.cos(rad(-40)) * 70)} ${f(Math.sin(rad(-40)) * 70)}`];
for (let a = 45; a <= 315; a += 15) {
  const long = (a / 15) % 2 === 1, r0 = 76, r1 = long ? 108 : 90;
  aureole.push(`M${f(Math.cos(rad(a)) * r0)} ${f(Math.sin(rad(a)) * r0)} L${f(Math.cos(rad(a)) * r1)} ${f(Math.sin(rad(a)) * r1)}`);
  if (long) aureole.push(circle(Math.cos(rad(a)) * (r1 + 5), Math.sin(rad(a)) * (r1 + 5), 2));
}

// the twist: two strands winding round the shank between the bow and the middle collar
const strand = (ph: number) => {
  let s = '';
  for (let x = 72; x <= 172; x += 2) s += `${x === 72 ? 'M' : 'L'}${x} ${f(Math.sin(((x - 72) / 14) * Math.PI * 2 + ph) * 5.5)} `;
  return s.trim();
};

const lines = [
  lobesOutline(30, 34),
  circle(0, 0, 17),
  // the throat: flanges and a ball where the bow meets the shank
  'M40 -15 L40 15', circle(52, 0, 9), 'M63 -12 L63 12 M69 -9 L69 9',
  // the shank, a beaded collar at its middle, and a pointed tip
  'M69 -6 L330 -6 M69 6 L330 6',
  'M176 -11 L176 11 M196 -11 L196 11', circle(186, 0, 8),
  'M330 -6 L346 0 L330 6',
  // a ward on top, and the bit below: stepped, with its wards cut deep
  'M236 -6 L236 -18 L250 -18 L250 -6',
  'M266 6 L266 86 L282 86 L282 70 L294 70 L294 86 L310 86 L310 58 L320 58 L320 44 L330 44 L330 6',
];
const detail = [
  lobesOutline(30, 34, 7),
  ...eyes.map(([x, y]) => circle(x, y, 9)),
  ...aureole,
  strand(0), strand(Math.PI),
  'M274 18 L274 60 M302 18 L302 48',
];
const glows = [crescent, ...eyes.map(([x, y]) => circle(x, y, 4.5))];

// set on a steep slant, bow up and to the left, filling the box (the aureole clear of its edges)
const T: [number, number, number, number] = [116, 116, 45, 0.9];
const place = ([x, y]: [number, number]): [number, number] => {
  const c = Math.cos(rad(T[2])), s = Math.sin(rad(T[2]));
  return [T[0] + (x * c - y * s) * T[3], T[1] + (x * s + y * c) * T[3]];
};

export const KEY: Sign = {
  lines, detail, glows,
  sparks: ([[274, 90], [302, 90], [325, 48]] as [number, number][]).map(place),
  transform: T,
};

/**
 * The key's axis in the world (the light form maps the 400 box to 7.2 world units, centred, 0.3 up), for the turn:
 * the bow's centre, the shank's direction, the side the bit is not on, and the radius where the aureole begins.
 */
const toWorld = ([x, y]: [number, number]): [number, number] => [(x / 400 - 0.5) * 7.2, -(y / 400 - 0.5) * 7.2 + 0.3];
const c0 = toWorld(place([0, 0])), c1 = toWorld(place([100, 0])), c2 = toWorld(place([0, -100]));
const unit = (a: [number, number], b: [number, number]) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
export const KEY_AXIS = { c: c0, d: unit(c0, c1), n: unit(c0, c2), ray: (67 * T[3] * 7.2) / 400 };
