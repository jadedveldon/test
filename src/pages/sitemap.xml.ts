import { publicPages, abs } from '../seo/pages';

/** the sitemap: every public page, for search engines (robots.txt points here) */
export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const urls = (await publicPages()).map((p) => `  <url><loc>${esc(abs(p.path))}</loc><lastmod>${p.changed ?? today}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
