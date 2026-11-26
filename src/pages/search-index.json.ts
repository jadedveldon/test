import { pillars } from '../data/site';
import { getCollection } from 'astro:content';
import { loadMantras, loadPractices } from '../data/mantras';

/** every service, every guided practice, every mantra in the library and every article, for the search box
 * (fetched only when someone opens search) */
const anchor = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function GET() {
  const seen = new Set<string>();
  const items: [string, number, string, string, string][] = [];
  pillars.forEach((p, pi) => p.categories.forEach((c) => c.subs.forEach((s) => s.items.forEach((t) => {
    const key = `${pi}|${t.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push([t, pi, c.name, s.name, anchor(c.name)]);
  }))));
  // mantras: [name, address, deity, day, what to match]
  const mantras = (await loadMantras()).map((m) => [m.name, m.slug, m.deity, m.days[0], `${m.name} ${m.deity} ${m.intention} ${m.themes.join(' ')}`.toLowerCase()]);
  // guided practices: [title, address, what kind, its line, what to match]
  const practices = (await loadPractices()).map((p) => [p.title, p.slug, p.kind, p.line, `${p.title} ${p.sanskrit ?? ''} ${p.key ?? ''} ${p.kind} ${p.line}`.toLowerCase()]);
  // articles: [title, address, pillar, summary, what to match]
  const pname = (slug: string) => pillars.find((p) => p.slug === slug)?.name ?? '';
  const articles = (await getCollection('writings')).map((a) => [a.data.title, a.id, pname(a.data.pillar), a.data.summary, `${a.data.title} ${a.data.summary} ${pname(a.data.pillar)}`.toLowerCase()]);
  const body = { pillars: pillars.map((p) => ({ name: p.name, slug: p.slug, preset: p.preset })), items, mantras, practices, articles };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}
