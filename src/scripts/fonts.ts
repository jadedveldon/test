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

/** IM Fell English (the book) and Cinzel (the gilded capitals) */
export function loadMagicFonts() {
  if (document.querySelector('[data-magic], [data-chapter="magic"]')) addFont(MAGIC);
}

/** Spectral, for Healing and Inner Work */
export function loadHealingFont() {
  if (document.querySelector('[data-healing], [data-chapter="healing"]')) addFont(HEALING);
}
