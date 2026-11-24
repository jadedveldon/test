// The site's content rules, checked on the built site (dist/) and the source (src/). Takes seconds.
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
rule('every page: lang="en", a title, a description, a preview picture that exists', pages.flatMap((f) => {
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
rule('copy for Sarvakali is marked as a draft in the data files', ['healing', 'identity', 'divination', 'learning'].flatMap((n) => {
  const f = path.join(SRC, 'data', `${n}.ts`); if (!fs.existsSync(f)) return [];
  return /DRAFT/.test(src[f]) ? [] : [`src/data/${n}.ts`];
}));

const failed = results.filter((x) => !x).length;
console.log(`ERRORS: ${failed ? `${failed} rule(s) broken` : 'none'}`);
process.exitCode = failed ? 1 : 0;
