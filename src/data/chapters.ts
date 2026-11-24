import type { Category, Pillar } from './site';
import type { DirChapter } from './directions';

/** the address of a catalogue category, as search and Find your path link to it */
export const anchor = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Pages built from chapters still answer to the catalogue's category addresses: each category's address
 * points to the first chapter that gathers one of its subcategories. Returns chapter key → addresses.
 */
export function categoryAliases(p: Pillar, chapters: DirChapter[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  p.categories.forEach((c) => {
    const names = new Set(c.subs.map((s) => s.name));
    const ch = chapters.find((x) => x.subs.some((n) => names.has(n)));
    if (ch) (out[ch.key] ||= []).push(anchor(c.name));
  });
  return out;
}

/** a chapter's own "category": the catalogue subcategories it gathers, in order */
export function gather(p: Pillar, ch: DirChapter): Category {
  const all = p.categories.flatMap((c) => c.subs);
  const subs = ch.subs.map((n) => {
    const s = all.find((x) => x.name === n);
    if (!s) throw new Error(`No subcategory "${n}" in ${p.name}`);
    return s;
  });
  return { name: ch.title, subs };
}
