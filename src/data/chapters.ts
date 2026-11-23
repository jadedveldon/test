import type { Category, Pillar } from './site';
import type { DirChapter } from './directions';

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
