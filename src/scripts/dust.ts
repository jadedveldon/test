/**
 * Headings that dissolve into the world. As a chapter scrolls away, its
 * heading is traced into points of light (by drawing the same words onto a
 * hidden canvas and reading where the letters are), and those points drift
 * off into the scene while the real heading fades.
 */
export function sampleHeading(el: HTMLElement, max: number): { pts: Float32Array; n: number; top: number } | null {
  const box = el.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  const cs = getComputedStyle(el);
  const pad = 8;
  const c = document.createElement('canvas');
  c.width = Math.ceil(box.width + pad * 2);
  c.height = Math.ceil(box.height + pad * 2);
  const x = c.getContext('2d', { willReadFrequently: true });
  if (!x) return null;
  x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  x.fillStyle = '#fff';
  x.textBaseline = 'alphabetic';

  const words = Array.from(el.querySelectorAll<HTMLElement>('.sk-word'));
  const parts = words.length ? words : [el];
  for (const w of parts) {
    // words may still be lowered for their entrance; their mask never moves, so measure that
    const mask = w.parentElement?.classList.contains('sk-word-mask') ? w.parentElement : w;
    const r = mask.getBoundingClientRect();
    const height = w === el ? r.height : w.offsetHeight;
    const text = (w.textContent || '').trim();
    if (!text) continue;
    const m = x.measureText(text);
    const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    // where the browser puts the baseline inside the word's box
    const base = r.top + (height - (asc + desc)) / 2 + asc;
    x.fillText(text, r.left - box.left + pad, base - box.top + pad);
  }

  const img = x.getImageData(0, 0, c.width, c.height).data;
  const hits: number[] = [];
  const step = 2;
  for (let y = 0; y < c.height; y += step) {
    for (let xx = 0; xx < c.width; xx += step) {
      if (img[(y * c.width + xx) * 4 + 3] > 120) hits.push(xx, y);
    }
  }
  const total = hits.length / 2;
  if (!total) return null;
  const n = Math.min(max, total);
  const pts = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const k = n === total ? i : Math.floor(Math.random() * total);
    pts[i * 2] = hits[k * 2] + box.left - pad + (Math.random() - 0.5) * step;
    pts[i * 2 + 1] = hits[k * 2 + 1] + box.top - pad + (Math.random() - 0.5) * step;
  }
  return { pts, n, top: box.top };
}
