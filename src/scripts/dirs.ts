/**
 * Live design directions for the pillars still being compared (4, 5 and 6).
 * A pillar page marks itself with data-dir-pillar; its chapters carry
 * data-dir-chapter. The chosen direction (a, b or c) is kept per pillar for the
 * visit (URL ?dir= wins), and it decides the worlds, the type and which
 * signature moments show (data-dir-only). The homepage chapter for each of
 * these pillars follows the same choice.
 */
export type DirPillar = 'identity' | 'divination' | 'learning';
export type Dir = 'a' | 'b' | 'c';
export const DIR_PILLARS: DirPillar[] = ['identity', 'divination', 'learning'];
export const DIR_PREFIX: Record<DirPillar, string> = { identity: 'id', divination: 'div', learning: 'lrn' };

const key = (p: DirPillar) => `sk-dir-${p}`;
const valid = (v: string | null): v is Dir => v === 'a' || v === 'b' || v === 'c';

export function pagePillar(): DirPillar | null {
  const el = document.querySelector<HTMLElement>('[data-dir-pillar]');
  const p = el?.dataset.dirPillar as DirPillar | undefined;
  return p && DIR_PILLARS.includes(p) ? p : null;
}

export function getDir(p: DirPillar): Dir {
  try {
    if (pagePillar() === p) {
      const q = new URLSearchParams(location.search).get('dir');
      if (valid(q)) return q;
    }
    const s = sessionStorage.getItem(key(p));
    if (valid(s)) return s;
  } catch { /* storage may be blocked */ }
  return 'a';
}

export function setDir(p: DirPillar, d: Dir) {
  try { sessionStorage.setItem(key(p), d); } catch { /* fine */ }
  // a direction picked on the page replaces one given in the address
  try {
    const u = new URL(location.href);
    if (u.searchParams.has('dir')) { u.searchParams.set('dir', d); history.replaceState(history.state, '', u); }
  } catch { /* fine */ }
}

/** the world for a chapter of one of these pillars, e.g. idB_queer */
export const dirKey = (p: DirPillar, part: string) => `${DIR_PREFIX[p]}${getDir(p).toUpperCase()}_${part}`;

const fonts = new Set<string>();
/** mark the page with the direction, load its type, and press the right buttons */
export function applyDir() {
  const p = pagePillar();
  const html = document.documentElement;
  if (!p) { delete html.dataset.dir; return; }
  const d = getDir(p);
  html.dataset.dir = d;
  document.querySelectorAll<HTMLElement>('[data-dir-set]').forEach((b) => {
    const on = b.dataset.dirSet === d;
    b.setAttribute('aria-pressed', String(on));
    const href = b.dataset.font;
    if (on && href && !fonts.has(href)) {
      fonts.add(href);
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    }
  });
}

/** fonts for the homepage chapters of these pillars, in their chosen directions */
export function loadHomeDirFonts(fontsFor: (p: DirPillar, d: Dir) => string | undefined) {
  if (!document.querySelector('[data-chapter="identity"], [data-chapter="divination"], [data-chapter="learning"]')) return;
  DIR_PILLARS.forEach((p) => {
    const href = fontsFor(p, getDir(p));
    if (href && !fonts.has(href)) {
      fonts.add(href);
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    }
    const ch = document.querySelector<HTMLElement>(`[data-chapter="${p}"]`);
    if (ch) ch.dataset.dir = getDir(p);
  });
}
