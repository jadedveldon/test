// The site's content rules, checked on the built site (dist/), the source (src/) and the content files the editor
// writes (src/content/). Takes seconds.
// Run after `npm run build`. Prints ok or FAIL for each rule.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const walk = (d, ext) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), ext) : ext.some((x) => e.name.endsWith(x)) ? [path.join(d, e.name)] : []));
const rel = (f) => path.relative(ROOT, f);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
const results = [];
const rule = (name, problems) => { results.push(!problems.length); console.log(`${problems.length ? 'FAIL' : 'ok  '} ${name}${problems.length ? ' — ' + problems.slice(0, 6).join(' | ') + (problems.length > 6 ? ` …+${problems.length - 6}` : '') : ''}`); };

if (!fs.existsSync(DIST)) { console.log('FAIL no dist/ — run npm run build first'); process.exit(1); }
const pages = walk(DIST, ['.html']);
const html = Object.fromEntries(pages.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const srcFiles = walk(SRC, ['.ts', '.astro', '.css', '.json', '.md', '.mdx']);
const src = Object.fromEntries(srcFiles.map((f) => [f, fs.readFileSync(f, 'utf8')]));

// 1. no prices (the invoice maker is Sarvakali's own tool, and may show amounts)
rule('no prices on the site', pages.filter((f) => !/invoice\.html$/.test(f)).flatMap((f) => {
  // amounts of money, or wording that implies a price list ("prices from", "starting at", "per session")
  const m = text(html[f]).match(/(?:₹|\bRs\.?|\bINR)\s?\d[\d,]*|\b\d[\d,]*\s?(?:rupees|\/-)|\bprice list\b|\bprices? (?:from|start)|\bstarting (?:at|from) (?:₹|rs|inr|\d)|\bper (?:session|hour|reading)\b/gi);
  return m ? [`${rel(f)}: ${[...new Set(m)].slice(0, 3).join(', ')}`] : [];
}));

// 2. no catalogue numbers (codes or outline numbering in service names)
rule('no catalogue numbers', pages.flatMap((f) => {
  const names = [...html[f].matchAll(/data-keep="([^"]*)"/g)].map((m) => m[1]);
  const bad = names.filter((n) => /^\s*(?:\d+[.)]|\d+\.\d+|[A-Z]{1,4}-?\d{2,})\b|#\d{2,}/.test(n));
  return bad.length ? [`${rel(f)}: ${bad.slice(0, 3).join(', ')}`] : [];
}));

// 3. English pages with the basics: language, title, description, a link-preview picture that exists
// (an old address that only forwards to its new page is not a page: Astro writes it as a bare redirect)
const isRedirect = (f) => /<meta http-equiv="refresh"/.test(html[f]);
rule('every page: lang="en", a title, a description, a preview picture that exists', pages.filter((f) => !isRedirect(f)).flatMap((f) => {
  const h = html[f], out = [];
  if (!/<html[^>]*\blang="en"/.test(h)) out.push(`${rel(f)}: lang`);
  if (!/<title>[^<]{3,}<\/title>/.test(h)) out.push(`${rel(f)}: title`);
  if (!/<meta name="description" content="[^"]{10,}"/.test(h)) out.push(`${rel(f)}: description`);
  const og = /property="og:image" content="[^"]*\/og\/([^"]+)"/.exec(h);
  if (!og || !fs.existsSync(path.join(DIST, 'og', og[1]))) out.push(`${rel(f)}: preview picture ${og ? og[1] : 'missing'}`);
  return out;
}));

// 4. links that open a new tab do not hand the site to the other page
rule('external links in a new tab carry rel="noopener"', pages.flatMap((f) => [...html[f].matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].filter((m) => !/rel="[^"]*noopener/.test(m[0])).map((m) => `${rel(f)}: ${m[0].slice(0, 80)}`)));

// 5. care first: the helpline number is always a tap-to-call link
rule('Tele-MANAS 14416 is always a tap-to-call link', pages.flatMap((f) => {
  const shown = (text(html[f]).match(/14416/g) || []).length;
  const linked = (html[f].match(/href="tel:14416"/g) || []).length;
  return shown > linked ? [`${rel(f)}: ${shown} shown, ${linked} linked`] : [];
}));

// 6. care notes stay where the work touches the mind, the body or identity
const careOn = { 'pillars/healing.html': 2, 'pillars/identity.html': 2 };
rule('care notes in place (Healing: mind and shadow; Identity: intimacy and body)', Object.entries(careOn).flatMap(([p, n]) => {
  const f = path.join(DIST, p); if (!fs.existsSync(f)) return [`${p}: missing page`];
  const c = (html[f].match(/class="(?:hl-care|pd-care)"/g) || []).length;
  return c < n ? [`${p}: ${c} care notes, expected at least ${n}`] : [];
}));

// 7. nothing unfinished shown to visitors
rule('no placeholder words (lorem, TODO, FIXME, undefined, NaN, [object Object])', pages.flatMap((f) => {
  const m = text(html[f]).match(/\blorem ipsum\b|\bTODO\b|\bFIXME\b|\bundefined\b|\bNaN\b|\[object Object\]/g);
  return m ? [`${rel(f)}: ${[...new Set(m)].join(', ')}`] : [];
}));

// 8. privacy: no personal email addresses or AI model identifiers committed
rule('no personal email addresses in the source or the site', [...Object.entries(src), ...Object.entries(html)].flatMap(([f, s]) => {
  const m = s.match(/[\w.+-]+@(?:gmail|yahoo|outlook|hotmail|icloud|proton(?:mail)?)\.[a-z.]+/gi);
  return m ? [`${rel(f)}: ${[...new Set(m)].join(', ')}`] : [];
}));
rule('no AI model names or identifiers in the source or the site', [...Object.entries(src), ...Object.entries(html)].flatMap(([f, s]) => {
  const m = s.match(/\bclaude[- ](?:opus|sonnet|haiku|fable|\d)[\w.-]*|\bgpt-\d[\w.-]*|\bgemini-\d[\w.-]*/gi);
  return m ? [`${rel(f)}: ${[...new Set(m)].join(', ')}`] : [];
}));

// 9. drafts are marked: data files with copy for Sarvakali say so
rule('copy for Sarvakali is marked as a draft in the data files', ['devotion', 'magic', 'healing', 'identity', 'divination', 'learning'].flatMap((n) => {
  const f = path.join(SRC, 'data', `${n}.ts`); if (!fs.existsSync(f)) return [];
  return /DRAFT/.test(src[f]) ? [] : [`src/data/${n}.ts`];
}));

// 10. the editor can rename or remove a service; anything that names one by hand must still find it
const CONTENT = path.join(SRC, 'content');
const json = (p) => JSON.parse(fs.readFileSync(path.join(CONTENT, p), 'utf8'));
const SLUGS = ['devotion', 'magic', 'healing', 'identity', 'divination', 'learning'];
const cat = Object.fromEntries(SLUGS.map((s) => [s, json(`catalogue/${s}.json`)]));
const services = (s) => new Set(cat[s].categories.flatMap((c) => c.subs.flatMap((x) => x.items.map((i) => i.trim()))));
const named = {
  devotion: (d) => [...d.mahavidyas.map((x) => x.service), d.allTen.service, ...d.hindu.map((x) => x.service), ...d.deviAlso.services, ...d.tantra.services, ...d.lands.flatMap((l) => l.names)],
  healing: (d) => Object.values(d.body.chakras).map((c) => c.working),
  learning: (d) => [...d.formats.services, ...d.finder.questions.flatMap((q) => q.answers.flatMap((a) => a.services)), ...d.path.stations.map((x) => x.service)],
};
rule('every service a signature moment names is in its pillar\'s catalogue', Object.entries(named).flatMap(([s, list]) => {
  const have = services(s);
  return [...new Set(list(json(`pillars/${s}.json`)).map((n) => n.trim()).filter(Boolean))].filter((n) => !have.has(n)).map((n) => `${s}: "${n}"`);
}));

// 11. what the editor writes reaches the page: every service in the catalogue can be kept on its pillar page,
//     and every category's address (used by search and Find your path) exists there
const attr = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const anchor = (t) => t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
rule('every catalogue service and category is on its pillar page', SLUGS.flatMap((s) => {
  const f = path.join(DIST, 'pillars', `${s}.html`); if (!fs.existsSync(f)) return [`${s}: missing page`];
  const h = html[f];
  const lost = [...services(s)].filter((n) => !h.includes(`data-keep="${attr(n)}"`)).map((n) => `${s}: service "${n}"`);
  const gone = cat[s].categories.map((c) => anchor(c.name)).filter((a) => !h.includes(`id="${a}"`)).map((a) => `${s}: address #${a}`);
  return [...lost, ...gone];
}));

// search engines and AI search (2026-11-27): a sitemap of every public page and none of the private ones; robots.txt
// lets search and AI search in and turns crawlers that only train AI models away; llms.txt; every public page names
// its one address (canonical), private pages ask not to be listed; and the facts written for machines are valid JSON
{
  const PRIVATE = /\/(studio|booking|invoice|me|404)(\.html)?$/;
  const out = [];
  const read = (f) => (fs.existsSync(path.join(DIST, f)) ? fs.readFileSync(path.join(DIST, f), 'utf8') : '');
  const sitemap = read('sitemap.xml'), robots = read('robots.txt'), llms = read('llms.txt');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  if (!locs.length) out.push('sitemap.xml: missing or empty');
  for (const want of ['/', '/practice/library', '/pillars/devotion', '/practice/mantras/gayatri', '/practice/with/kindness']) if (!locs.includes(want)) out.push(`sitemap.xml: lacks ${want}`);
  for (const l of locs) if (PRIVATE.test(l)) out.push(`sitemap.xml: lists the private ${l}`);
  const group = (ua) => robots.split(/\n\s*\n/).find((g) => g.split('\n').some((l) => l.trim() === `User-agent: ${ua}`)) ?? '';
  for (const ua of ['GPTBot', 'ClaudeBot', 'CCBot']) if (!/^Disallow: \/$/m.test(group(ua))) out.push(`robots.txt: ${ua} (training only) is not turned away`);
  for (const ua of ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Googlebot', 'Bingbot']) if (group(ua)) out.push(`robots.txt: ${ua} (search) has a group of its own`);
  if (!/^Allow: \/$/m.test(group('*')) || !/^Disallow: \/studio$/m.test(group('*'))) out.push('robots.txt: everyone else is not let in, or the Studio is not kept out');
  if (!/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m.test(robots)) out.push('robots.txt: no sitemap');
  if (!/^# Sarvakali$/m.test(llms) || !/\/practice\/library/.test(llms)) out.push('llms.txt: missing or incomplete');
  for (const f of pages) {
    const h = html[f], r = '/' + path.relative(DIST, f).replace(/\\/g, '/');
    const noindex = /<meta name="robots" content="noindex/.test(h);
    if (PRIVATE.test(r) && !noindex && !/studio/.test(r)) out.push(`${rel(f)}: private but not marked noindex`);
    if (!noindex && !/<link rel="canonical" href="https?:\/\/[^"]+"/.test(h)) out.push(`${rel(f)}: no canonical address`);
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { if (!JSON.parse(m[1])['@type']) out.push(`${rel(f)}: structured data without a type`); } catch { out.push(`${rel(f)}: structured data is not valid JSON`); } }
  }
  rule('search engines and AI search: sitemap, robots.txt, llms.txt, canonical addresses, structured data', out);
}

// what search results show (2026-11-27): every page that may be listed has a title of 10 to 70 letters and a line of 50
// to 170, neither shared with another page; one main heading; every picture with a text for those who cannot see it;
// and every link to a page of the site leads to one that exists
{
  const out = [];
  const routeOf = (f) => ('/' + path.relative(DIST, f).replace(/\\/g, '/').replace(/\.html$/, '').replace(/(^|\/)index$/, '')).replace(/\/$/, '') || '/';
  const live = pages.filter((f) => !isRedirect(f));
  const exists = new Set(pages.map(routeOf));
  const seenT = new Map(), seenD = new Map();
  const unesc = (x) => x.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  for (const f of live) {
    const h = html[f], r = routeOf(f);
    const listed = !/<meta name="robots" content="noindex/.test(h) && !/<meta name="robots" content="noindex/.test(h.slice(0, 4000));
    for (const img of h.match(/<img\b[^>]*>/g) ?? []) if (!/\balt=/.test(img)) out.push(`${r}: a picture without alt`);
    for (const m of h.matchAll(/<a\b[^>]*href="(\/[^"#?]*)/g)) {
      const to = m[1].replace(/\.html$/, '').replace(/\/$/, '') || '/';
      if (/^\/(api|og|icons|brand|_astro|studio|keystatic|media|favicon|sitemap|robots|llms|manifest|search-index|sw)/.test(to)) continue;
      if (!exists.has(to)) out.push(`${r}: a link to ${m[1]}, which is not a page`);
    }
    if (!listed) continue;
    const t = unesc((h.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? ''), d = unesc((h.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? '');
    if (t.length < 10 || t.length > 70) out.push(`${r}: title of ${t.length} letters`);
    if (d.length < 50 || d.length > 170) out.push(`${r}: description of ${d.length} letters`);
    if (seenT.has(t)) out.push(`${r}: the same title as ${seenT.get(t)}`); else seenT.set(t, r);
    if (seenD.has(d)) out.push(`${r}: the same description as ${seenD.get(d)}`); else seenD.set(d, r);
    if ((h.match(/<h1[\s>]/g) ?? []).length !== 1) out.push(`${r}: ${(h.match(/<h1[\s>]/g) ?? []).length} main headings`);
  }
  rule('what search results show: titles, descriptions, one main heading, pictures described, no broken links', out);
}

const failed = results.filter((x) => !x).length;
console.log(`ERRORS: ${failed ? `${failed} rule(s) broken` : 'none'}`);
process.exitCode = failed ? 1 : 0;
