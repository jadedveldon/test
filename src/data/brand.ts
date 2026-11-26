/**
 * Sarvakali's mark, drawn once (64 × 64) and used everywhere: the header, the favicon and app icons, the Studio,
 * the emails (as a picture), the invoices, the not-found page. A crescent moon that is also a lamp's bowl holds a
 * flame that is also the third eye, with the bindu at its heart: the moon of the sacred nights, the lamp of daily
 * practice, the eye that sees. Three other directions were drawn and compared (see the preview's cover).
 */
export const MARK = {
  viewBox: '0 0 64 64',
  /** the crescent: a circle (r 23 at 32,34) less one a little higher (r 21 at 32,28) */
  moon: 'M11.45 23.67 A23 23 0 1 0 52.55 23.67 A21 21 0 1 1 11.45 23.67 Z',
  /** the flame, which is also the eye */
  flame: 'M34.2 2.6 C34.4 9.8 42.4 17.4 42 29.2 C41.7 36.4 37.4 41 32 41 C26.6 41 22.2 36.6 22.2 30 C22.2 21.6 30.6 16.4 34.2 2.6 Z',
  /** the bindu */
  bindu: { cx: 32.1, cy: 30.4, r: 3.6 },
  /** the eye's inner line, drawn when the mark is large */
  lid: 'M25.6 30.4 Q32.1 21.9 38.6 30.4 Q32.1 38.9 25.6 30.4 Z',
};

/** the colours of the mark */
export const BRAND = { gold: '#e0ab4f', ember: '#c8462a', deep: '#120707', red: '#8e1f18', cream: '#f6ecdf' };

/** the mark as a standalone SVG (for icons and the email picture) */
export function markSvg(o: { size?: number; bg?: string; fg?: string; flame?: string; pad?: number; rounded?: number; lid?: boolean } = {}) {
  const size = o.size ?? 64, pad = o.pad ?? 0, fg = o.fg ?? BRAND.gold, flame = o.flame ?? fg;
  const s = (64 - pad * 2) / 64;
  const bg = o.bg ? `<rect width="64" height="64" rx="${o.rounded ?? 0}" fill="${o.bg}"/>` : '';
  const cut = `<mask id="m"><rect width="64" height="64" fill="#fff"/><circle cx="${MARK.bindu.cx}" cy="${MARK.bindu.cy}" r="${MARK.bindu.r}" fill="#000"/>${o.lid ? `<path d="${MARK.lid}" fill="none" stroke="#000" stroke-width="1.6"/>` : ''}</mask>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${bg}<defs>${cut}</defs><g transform="translate(${pad} ${pad}) scale(${s})"><path d="${MARK.moon}" fill="${fg}"/><path d="${MARK.flame}" fill="${flame}" mask="url(#m)"/></g></svg>`;
}
