import type { Category, Pillar } from './site';

/** the address of a catalogue category, as search and Find your path link to it */
export const anchor = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Each subcategory in the catalogue names the chapter of its pillar's page it sits in (the content editor
 * offers the chapters as a list). One that names no chapter, or one that no longer exists, joins the first.
 */
export const chapterOf = (sub: { chapter?: string }, keys: readonly string[]) => (sub.chapter && keys.includes(sub.chapter) ? sub.chapter : keys[0]);

/** a chapter's own "category": the catalogue subcategories that sit in it, in catalogue order */
export function gather(p: Pillar, key: string, title: string, keys: readonly string[]): Category {
  return { name: title, subs: p.categories.flatMap((c) => c.subs).filter((s) => chapterOf(s, keys) === key) };
}

/** the catalogue category the first subcategory of a chapter comes from (for a chapter's kicker) */
export function categoryOf(p: Pillar, key: string, keys: readonly string[]): Category | undefined {
  return p.categories.find((c) => c.subs.some((s) => chapterOf(s, keys) === key));
}

/**
 * Pages built from chapters still answer to the catalogue's category addresses, whatever the categories are
 * called: each category's address points to the first chapter that holds one of its subcategories, unless a
 * section already carries that address. `ids` is chapter key → the section's own address.
 * Returns chapter key → the extra addresses to place in it.
 */
export function categoryAliases(p: Pillar, keys: readonly string[], ids: Record<string, string> = {}): Record<string, string[]> {
  const taken = new Set(Object.values(ids));
  const out: Record<string, string[]> = {};
  p.categories.forEach((c) => {
    const a = anchor(c.name);
    if (taken.has(a)) return;
    const sub = c.subs[0];
    if (!sub) return;
    taken.add(a);
    (out[chapterOf(sub, keys)] ||= []).push(a);
  });
  return out;
}
