/**
 * Display fonts that belong to one pillar. They are requested only where that pillar appears (its own page, or its
 * chapter on the homepage); the font files themselves download only when text uses them.
 */
const MAGIC = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=IM+Fell+English:ital@0;1&display=swap';
const HEALING = 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;1,300&display=swap';
const added = new Set<string>();

export function addFont(href: string) {
  if (added.has(href)) return;
  added.add(href);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

/**
 * On the pillar's own page the font is wanted at once. On the homepage it is wanted only when its chapter comes near
 * (a screen and a half before it is reached), so the first screen does not wait for six pillars' lettering.
 */
let near: IntersectionObserver | null = null;
const waiting = new Map<Element, string>();
function whenNear(own: string, chapter: string, href: string) {
  if (added.has(href)) return;
  if (document.querySelector(own)) return addFont(href);
  const ch = document.querySelector(chapter);
  if (!ch) return;
  if (!('IntersectionObserver' in window)) return addFont(href);
  near ??= new IntersectionObserver((seen) => {
    seen.forEach((e) => {
      if (!e.isIntersecting) return;
      const h = waiting.get(e.target);
      waiting.delete(e.target);
      near?.unobserve(e.target);
      if (h) addFont(h);
    });
  }, { rootMargin: '150% 0px 150% 0px' });
  waiting.set(ch, href);
  near.observe(ch);
}

/** IM Fell English (the book) and Cinzel (the gilded capitals) */
export function loadMagicFonts() {
  whenNear('[data-magic]', '[data-chapter="magic"]', MAGIC);
}

/** Spectral, for Healing and Inner Work */
export function loadHealingFont() {
  whenNear('[data-healing]', '[data-chapter="healing"]', HEALING);
}

/** Pillars 4 to 6: Identity in DM Serif Display (Soft prism); Divination in Cormorant Unicase with Tenor Sans
 *  (candlelight and the black mirror); Learning in Libre Baskerville, Gotu and Josefin Slab (the library, the
 *  leaf and the stars) */
const SETTLED: [string, string][] = [
  ['[data-identity], [data-chapter="identity"]', 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap'],
  ['[data-divination], [data-chapter="divination"]', 'https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@400;500&family=Tenor+Sans&display=swap'],
  ['[data-learning], [data-chapter="learning"]', 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&family=Gotu&family=Josefin+Slab:ital,wght@0,400;0,600;1,300&display=swap'],
];
export function loadSettledFonts() {
  SETTLED.forEach(([where, href]) => { const [own, chapter] = where.split(', '); whenNear(own, chapter, href); });
}
