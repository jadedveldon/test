/**
 * The catalogue: six pillars, each in its own editable file in src/content/catalogue (the content editor
 * writes there). What the design depends on stays here: each pillar's address, its world, and the order.
 */
import devotion from '../content/catalogue/devotion.json';
import magic from '../content/catalogue/magic.json';
import healing from '../content/catalogue/healing.json';
import identity from '../content/catalogue/identity.json';
import divination from '../content/catalogue/divination.json';
import learning from '../content/catalogue/learning.json';

/** `chapter` is the chapter of the pillar's page it sits in; `icon` the small drawing beside it (src/data/icons.ts) */
export type Subcategory = { name: string; items: string[]; chapter?: string; icon?: string };
export type Category = { name: string; subs: Subcategory[] };
export type PillarData = { name: string; line: string; categories: Category[] };

export type Pillar = {
  slug: string;
  name: string;
  /** key into the world presets */
  preset: string;
  /** one plain sentence on what the pillar holds */
  line: string;
  categories: Category[];
  count: number;
};

/** the order of the pillars, and the address and world of each (fixed: the design depends on them) */
const FILES: [string, PillarData][] = [
  ['devotion', devotion], ['magic', magic], ['healing', healing],
  ['identity', identity], ['divination', divination], ['learning', learning],
];

/** an editor may leave a blank line or a stray space; the site never shows an empty service */
const clean = (c: Category[]): Category[] =>
  c.map((cat) => ({ name: cat.name.trim(), subs: cat.subs.map((s) => ({ ...s, name: s.name.trim(), items: s.items.map((i) => i.trim()).filter(Boolean) })).filter((s) => s.name) })).filter((cat) => cat.name);

export const pillars: Pillar[] = FILES.map(([slug, p]) => {
  const categories = clean(p.categories);
  const count = categories.reduce((a, c) => a + c.subs.reduce((b, s) => b + s.items.length, 0), 0);
  return { slug, preset: slug, name: p.name.trim(), line: p.line.trim(), categories, count };
});

export const pillarBySlug = (slug: string) => pillars.find((p) => p.slug === slug)!;

/** each pillar's colour where pillars are shown side by side on a dark page (Find your path, Articles) */
export const ACCENT: Record<string, string> = { devotion: '#e5ae52', magic: '#55c79a', healing: '#7fd1c0', identity: '#ef93b0', divination: '#9db1ff', learning: '#dba56b' };

export const totalServices = pillars.reduce((a, p) => a + p.count, 0);

export const categoryCount = (c: Category) => c.subs.reduce((a, s) => a + s.items.length, 0);

/** every service name in the catalogue (signature moments that name a service check it is still there) */
export const allServices = new Set(pillars.flatMap((p) => p.categories.flatMap((c) => c.subs.flatMap((s) => s.items))));
