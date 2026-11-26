/**
 * The third eye's drawing, shared by the opening (src/components/Loader.astro) and the homepage's eye that follows
 * the cursor (src/pages/index.astro), so the two are always the same eye. Everything is drawn round a centre (cx, cy):
 * a flame-shaped eye, open, inside a gold frame, ringed with rays.
 */
export const thirdPath = (cx: number, cy: number) =>
  `M${cx} ${cy - 118} C${cx + 48} ${cy - 66} ${cx + 68} ${cy + 10} ${cx} ${cy + 118} C${cx - 68} ${cy + 10} ${cx - 48} ${cy - 66} ${cx} ${cy - 118}Z`;
export const framePath = (cx: number, cy: number) =>
  `M${cx} ${cy - 152} C${cx + 68} ${cy - 84} ${cx + 92} ${cy + 16} ${cx} ${cy + 152} C${cx - 92} ${cy + 16} ${cx - 68} ${cy - 84} ${cx} ${cy - 152}Z`;
/** the iris sits a little below the middle, where the eye is widest */
export const irisOf = (cx: number, cy: number) => ({ x: cx, y: cy + 14, r: 36 });

export const rays = (cx: number, cy: number, n = 36) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  const long = i % 2 === 0;
  const r1 = 168, r2 = long ? 236 : 208;
  return { x1: cx + Math.cos(a) * r1 * 0.74, y1: cy + Math.sin(a) * r1, x2: cx + Math.cos(a) * r2 * 0.74, y2: cy + Math.sin(a) * r2, long };
});
export const striae = (x: number, y: number, r: number, n = 20) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return { x1: x + Math.cos(a) * 14, y1: y + Math.sin(a) * 14, x2: x + Math.cos(a) * (r - 3), y2: y + Math.sin(a) * (r - 3) };
});
