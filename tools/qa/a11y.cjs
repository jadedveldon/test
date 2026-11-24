// Accessibility, deeper: axe (WCAG 2.0/2.1/2.2 A+AA and best practice) on every page, desktop and phone, each direction
// of Pillars 4-6, and with each overlay open; plus heading order, landmarks, titles and WCAG 2.2 target size.
const { chromium } = require('playwright');
const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const PAGES = ['/', '/about', '/care', '/connect', '/path', '/practice', '/writings', '/writings/who-is-kali', '/writings/the-thirty-moons', '/writings/what-happens-in-a-reading', '/invoice', '/depth',
  '/pillars/devotion', '/pillars/magic', '/pillars/healing', '/pillars/identity', '/pillars/divination', '/pillars/learning'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const OVERLAYS = [
  ['menu', async (p) => { await p.click('[data-menu-open]'); }],
  ['search', async (p) => { await p.click('[data-search-open]'); await p.waitForTimeout(400); await p.keyboard.type('love'); }],
  ['card', async (p) => { await p.evaluate(() => document.querySelector('[data-card-open]')?.click()); }],
  ['keep', async (p) => { await p.evaluate(() => Array.from(document.querySelectorAll('.chip-keep')).find((c) => c.getClientRects().length)?.click()); await p.waitForTimeout(300); await p.click('[data-keep-open]'); }],
  ['sky', async (p) => { await p.click('[data-sky-btn]'); }],
  ['hud', async (p) => { await p.click('[data-hud-toggle]'); }],
];
const summary = {};
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const runAxe = async (p, ctxName) => {
    await p.addScriptTag({ content: AXE });
    const r = await p.evaluate(async (tags) => {
      const res = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
      return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, eg: v.nodes.slice(0, 2).map((n) => n.target.join(' ').slice(0, 70) + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join(' ').slice(0, 110)) }));
    }, TAGS);
    r.forEach((v) => { const k = `${v.id} (${v.impact})`; (summary[k] ||= new Set()).add(ctxName); });
    return r;
  };
  for (const view of ['desk', 'phone']) {
    const vp = view === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 855 };
    const ctx = await b.newContext({ viewport: vp, hasTouch: view === 'phone', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    for (const path of PAGES) {
      const p = await ctx.newPage();
      await p.goto(`${B}${path}${path.includes('?') ? '&' : '?'}tier=calm&cursor=off`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1800);
      const r = await runAxe(p, `${view} ${path}`);
      const info = await p.evaluate((phone) => {
        const hs = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter((h) => h.getClientRects().length && !h.closest('[hidden],dialog:not([open]),[aria-hidden="true"]'));
        const skips = []; let last = 0;
        hs.forEach((h) => { const l = Number(h.tagName[1]); if (last && l > last + 1) skips.push(`h${last}→h${l} "${h.textContent.trim().slice(0, 30)}"`); last = l; });
        const lm = { main: document.querySelectorAll('main, [role=main]').length, header: document.querySelectorAll('body > header, [role=banner]').length, nav: document.querySelectorAll('nav').length, footer: document.querySelectorAll('footer').length };
        const tiny = phone ? Array.from(document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex="0"]')).filter((e) => {
          if (!e.getClientRects().length || e.closest('[hidden],[aria-hidden="true"],dialog:not([open])')) return false;
          const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
          if (e.closest('p, li > a:only-child') && e.tagName === 'A' && cs.display === 'inline') return false; // links in running text are exempt
          const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24;
        }).map((e) => `${(e.getAttribute('aria-label') || e.textContent || e.className || e.tagName).toString().trim().slice(0, 24)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`) : [];
        return { title: document.title, lang: document.documentElement.lang, skips, lm, tiny: tiny.slice(0, 6), tinyN: tiny.length };
      }, view === 'phone');
      const issues = [];
      if (r.length) issues.push('AXE ' + r.map((v) => `${v.id}[${v.impact},${v.n}] ${v.eg[0]}`).join('\n        '));
      if (info.skips.length) issues.push('HEADING SKIPS ' + info.skips.slice(0, 3).join('; '));
      if (info.lm.main !== 1) issues.push(`MAIN x${info.lm.main}`);
      if (!info.lang) issues.push('NO LANG');
      if (info.tinyN) issues.push(`UNDER 24px (${info.tinyN}): ${info.tiny.join('; ')}`);
      console.log(`${view.padEnd(5)} ${path.padEnd(30)} ${issues.length ? '\n      ' + issues.join('\n      ') : 'ok'}`);
      await p.close();
    }
    // overlays, on the homepage and a pillar page
    for (const path of ['/', '/pillars/learning']) {
      for (const [name, open] of OVERLAYS) {
        const p = await ctx.newPage();
        await p.goto(`${B}${path}${path.includes('?') ? '&' : '?'}tier=calm&cursor=off`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(1500);
        try { await open(p); } catch (e) { console.log(`${view} overlay ${name}: could not open (${e.message.split('\n')[0].slice(0, 80)})`); await p.close(); continue; }
        await p.waitForTimeout(900);
        const r = await runAxe(p, `${view} ${path} +${name}`);
        console.log(`${view.padEnd(5)} ${(path + ' + ' + name).padEnd(30)} ${r.length ? '\n      AXE ' + r.map((v) => `${v.id}[${v.impact},${v.n}] ${v.eg[0]}`).join('\n        ') : 'ok'}`);
        await p.close();
      }
    }
    await ctx.close();
  }
  console.log('\n== summary: rule (impact) → where');
  Object.entries(summary).forEach(([k, v]) => console.log(`${k}: ${v.size} places, e.g. ${[...v].slice(0, 4).join(' | ')}`));
  await b.close();
})();
