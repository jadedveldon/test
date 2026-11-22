import { pillars } from '../data/site';

/** every service, for the search box (fetched only when someone opens search) */
const anchor = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function GET() {
  const seen = new Set<string>();
  const items: [string, number, string, string, string][] = [];
  pillars.forEach((p, pi) => p.categories.forEach((c) => c.subs.forEach((s) => s.items.forEach((t) => {
    const key = `${pi}|${t.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push([t, pi, c.name, s.name, anchor(c.name)]);
  }))));
  const body = { pillars: pillars.map((p) => ({ name: p.name, slug: p.slug, preset: p.preset })), items };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}
