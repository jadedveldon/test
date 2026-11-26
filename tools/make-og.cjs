// Makes the link-preview pictures (Open Graph, 1200 × 630): the picture a chat or social app shows when a page of
// the site is shared. Each is a designed card: the page's own world (its colours and form of light, taken from the
// real page with its words hidden), and over it, large enough to read in a chat, the mark and name, the line above
// the title, the title, and the page's description. A mantra's card also carries its first line in Devanagari.
// Every page gets its own card, so the pictures follow the site as it changes: run this again after a change of
// words or design. Base.astro picks a page's card, or its section's, or the homepage's.
// Run with the site served locally (npm run build && npx astro preview):
//   node tools/make-og.cjs [http://127.0.0.1:4321] [one page's path, to make only its card]
// Needs Playwright with Chromium installed.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://127.0.0.1:4321';
const only = process.argv[3] || '';
const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'og');
const W = 1200, H = 630;

// every page of the build, but not the private ones (a client's booking or invoice, My space, the Studio) or old
// addresses that only lead elsewhere
const SKIP = /^\/(studio|booking|invoice|me|404|writings|depth)(\/|$)/;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const dist = path.join(root, 'dist');
const pages = walk(dist).filter((f) => f.endsWith('.html') && !f.includes(`${path.sep}_`)).map((f) => {
  const rel = path.relative(dist, f).replace(/\\/g, '/').replace(/\.html$/, '').replace(/(^|\/)index$/, '');
  return `/${rel}`.replace(/\/$/, '') || '/';
}).filter((p) => !SKIP.test(p) && (only ? p === only : true)).sort();
const nameOf = (p) => (p === '/' ? 'home' : p.slice(1).replace(/\//g, '-'));

const mark = fs.readFileSync(path.join(root, 'public', 'brand', 'mark.svg'), 'utf8');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Tiro+Devanagari+Sanskrit&display=swap';

const card = (bg, d) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; background: rgb(${d.a}) url(${bg}) center / cover; font-family: Inter, sans-serif; color: rgb(${d.ink}); }
  .veil { position: absolute; inset: 0; background: linear-gradient(90deg, rgb(${d.a} / 0.94) 0%, rgb(${d.a} / 0.82) 38%, rgb(${d.a} / 0.25) 70%, rgb(${d.a} / 0) 100%); }
  .in { position: absolute; left: 72px; top: 58px; bottom: 58px; width: 700px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 14px; font-family: 'Instrument Serif', serif; font-size: 36px; letter-spacing: 0.01em; }
  .brand svg { width: 44px; height: 44px; }
  .body { margin-top: auto; margin-bottom: auto; padding-top: 24px; }
  .kicker { font-size: 19px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgb(${d.light ? d.soft : d.glow}); margin-bottom: 18px; }
  .sa { font-family: 'Tiro Devanagari Sanskrit', serif; font-size: 38px; line-height: 1.35; color: rgb(${d.light ? d.soft : d.glow}); margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  h1 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: ${d.size}px; line-height: 1.02; letter-spacing: -0.01em; }
  p { margin-top: 22px; font-size: 25px; line-height: 1.42; color: rgb(${d.soft}); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .rule { position: absolute; left: 72px; right: 72px; bottom: 34px; height: 2px; background: linear-gradient(90deg, rgb(${d.light ? d.soft : d.glow}) 0, rgb(${d.light ? d.soft : d.glow} / 0) 60%); }
  body.home .veil { background: linear-gradient(0deg, rgb(${d.a} / 0.85) 0%, rgb(${d.a} / 0) 34%); }
  body.home .in { width: auto; right: 72px; }
  body.home .body { margin: auto 0 0; text-align: center; }
  body.home p { margin: 0 auto; max-width: 960px; color: rgb(${d.ink}); font-size: 26px; -webkit-line-clamp: 1; }
  body.home .in { bottom: 50px; }
</style></head><body class="${d.home ? 'home' : ''}"><div class="veil"></div><div class="in">
  <div class="brand">${mark.replace(/width="64" height="64"/, '')}Sarvakali</div>
  <div class="body">
    ${d.kicker && !d.home ? `<div class="kicker">${esc(d.kicker)}</div>` : ''}
    ${d.sa ? `<div class="sa">${esc(d.sa)}</div>` : ''}
    ${d.home ? '' : `<h1>${esc(d.title)}</h1>`}
    ${d.line ? `<p>${esc(d.line)}</p>` : ''}
  </div>
</div><div class="rule"></div></body></html>`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, serviceWorkers: 'block', timezoneId: 'Asia/Kolkata' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
  const p = await ctx.newPage();
  const c = await ctx.newPage();
  let n = 0;
  for (const route of pages) {
    await p.goto(`${base}${route === '/' ? '/' : route}?og=1&tier=full&cursor=off&festival=none&sky=night`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(route === '/' ? 6500 : 4200);
    // what the card says, read from the page itself
    const d = await p.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const v = (k, f) => (css.getPropertyValue(k).trim() || f);
      const h1 = document.querySelector('h1');
      const hero = h1?.closest('section, header, article, div');
      const kickEl = document.querySelector('.kicker[data-hero]') ?? hero?.querySelector('.kicker');
      // what changes by the day (today's weekday and planet) would be wrong tomorrow: left out
      const kick = kickEl?.cloneNode(true);
      kick?.querySelectorAll('[data-today-hide], [data-today-badge], [data-today-day], [data-today-planet]').forEach((e) => e.remove());
      const sa = /^\/practice\/mantras\//.test(location.pathname) ? document.querySelector('[lang="sa"]')?.textContent.split(/\n|।/)[0].trim() : '';
      // the homepage's line is the one under its name; elsewhere the page's description
      const desc = (location.pathname === '/' ? document.querySelector('.lede[data-hero]')?.textContent : '') || document.querySelector('meta[name="description"]')?.content || '';
      const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
      return {
        title: clean(h1?.textContent), kicker: clean(kick?.textContent).replace(/^today · /i, ''), sa: clean(sa), line: clean(desc),
        light: document.documentElement.dataset.light === '1',
        ink: v('--ink', '241 239 255'), soft: v('--ink-soft', '200 196 220'), glow: v('--glow', '231 196 106'), a: v('--bg-a', '6 4 15'),
      };
    });
    if (!d.title) { console.log('skip (no title)', route); continue; }
    // the homepage draws its own name in light: the card lets that be the title, and adds only the line below it
    d.home = route === '/';
    const len = d.title.length;
    d.size = len > 46 ? 58 : len > 30 ? 68 : len > 18 ? 80 : 96;
    if (d.line.length > 150) d.line = `${d.line.slice(0, 147).replace(/\s\S*$/, '')}…`;
    // the world alone: every word and control hidden, the world and its light left as they are
    await p.addStyleTag({ content: `
      body > *:not(#world):not(#incense):not(#main) { visibility: hidden !important; }
      #main :is(h1, h2, h3, h4, p, a, button, ul, ol, dl, form, label, input, select, textarea, table, blockquote, figcaption, .kicker, [data-crumbs], .crumbs) { visibility: hidden !important; }
      #main [data-chapter]:not(:first-of-type) { visibility: hidden !important; }` });
    // anything else on the page that holds words but no drawing (a care note, a box, a question) goes too
    await p.evaluate(() => {
      const art = 'svg, canvas, img, picture, video';
      const walk = (el) => {
        for (const c of el.children) {
          if (getComputedStyle(c).visibility === 'hidden') continue;
          if (c.matches(art)) continue;
          if (c.querySelector(art)) walk(c);
          else if (c.textContent.trim() || getComputedStyle(c).borderTopWidth !== '0px') c.style.setProperty('visibility', 'hidden', 'important');
        }
      };
      const main = document.getElementById('main');
      if (main) walk(main);
    });
    await p.waitForTimeout(250);
    // the homepage's eye blinks: take the picture while it is open
    await p.evaluate(async () => {
      const e = document.getElementById('he-open');
      if (!e) return;
      const w = () => e.getBoundingClientRect().width;
      let max = 0;
      for (let i = 0; i < 25; i++) { max = Math.max(max, w()); await new Promise((r) => setTimeout(r, 40)); }
      for (let i = 0; i < 100 && w() < max * 0.97; i++) await new Promise((r) => setTimeout(r, 20));
    });
    const bg = `data:image/jpeg;base64,${(await p.screenshot({ type: 'jpeg', quality: 90 })).toString('base64')}`;
    await c.setContent(card(bg, d), { waitUntil: 'networkidle' });
    await c.evaluate(() => document.fonts.ready);
    await c.screenshot({ path: path.join(out, `${nameOf(route)}.jpg`), type: 'jpeg', quality: 80 });
    n++;
    console.log('card', nameOf(route));
  }
  console.log(`${n} cards`);
  await b.close();
})();
