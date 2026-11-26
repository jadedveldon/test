import { pillars } from '../data/site';
import { loadMantras } from '../data/mantras';

/** every service, and every mantra in the library, for the search box (fetched only when someone opens search) */
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
  const body = { pillars: pillars.map((p) => ({ name: p.name, slug: p.slug, preset: p.preset })), items, mantras };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}
