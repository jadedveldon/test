// The shareable preview bundle, as served statically (npm run preview:artifact, then serve preview-artifact/
// on port 8099, e.g. `python3 -m http.server 8099 --bind 127.0.0.1 -d preview-artifact`): the cover renders with
// every picture and link, and each pillar page loads its own code and responds, from relative paths.
const { chromium } = require('playwright');
const B = process.env.QA_PREVIEW || 'http://127.0.0.1:8099';
const ok = (n, v, extra = '') => console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const allErrs = [];
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => allErrs.push(`cover: ${e.message.slice(0, 100)}`));
    await p.goto(`${B}/index.html`, { waitUntil: 'load' });
    const info = await p.evaluate(async () => {
      const imgs = Array.from(document.images);
      imgs.forEach((i) => { i.loading = 'eager'; });
      await new Promise((r) => setTimeout(r, 2500));
      return { broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')), sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, links: Array.from(document.querySelectorAll('a[href^="site/"]')).map((a) => a.getAttribute('href')) };
    });
    ok(`cover at ${vp.width}px: every picture loads, nothing sideways`, !info.broken.length && !info.sideways, info.broken.join(', '));
    if (vp.width > 600) {
      const bad = [];
      for (const l of new Set(info.links)) { const r = await p.request.get(`${B}/${l.split('?')[0].split('#')[0]}`); if (r.status() >= 400) bad.push(`${r.status()} ${l}`); }
      ok(`cover: all ${new Set(info.links).size} links into the site answer`, !bad.length, bad.join(', '));
    }
    await ctx.close();
  }
  const PROBES = {
    healing: async (p) => { p.locator('[data-breath-toggle]').first().click(); await p.waitForTimeout(1500); return /in|hold|out/i.test(await p.evaluate(() => document.querySelector('.br-word, [data-breath-word]')?.textContent || '')); },
    identity: async (p) => { await p.evaluate(() => document.querySelector('[data-comfort] button[type="submit"]').click()); await p.waitForTimeout(500); return p.evaluate(() => !document.querySelector('[data-comfort-note]').hidden); },
    divination: async (p) => { const bx = await p.locator('[data-mirror-surface]').boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(3700); await p.mouse.up(); await p.waitForTimeout(800); return /\?$/.test(await p.evaluate(() => document.querySelector('[data-mirror-word]').textContent)); },
    learning: async (p) => { await p.evaluate(() => { ['fd-0', 'fd-1', 'fd-2'].forEach((n) => document.querySelector(`input[name="${n}"]`).click()); document.querySelector('[data-station="4"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p.waitForTimeout(700); return p.evaluate(() => document.querySelectorAll('[data-finder-list] .chip-keep').length > 0 && /Spellcraft/.test(document.querySelector('[data-station-name]').textContent)); },
    magic: async (p) => { const i = p.locator('[data-sigil] input:visible').first(); await i.fill('love comes to me'); await p.waitForTimeout(800); return p.evaluate(() => document.querySelectorAll('[data-sigil] svg path, [data-sigil] svg polyline, [data-sigil] svg line').length > 2); },
    devotion: async (p) => p.evaluate(() => !!document.querySelector('[data-yantra], [data-elements]')),
  };
  for (const [pl, probe] of Object.entries(PROBES)) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 855 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    p.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().replace(B, '')}`); });
    await p.goto(`${B}/site/pillars-${pl}.html`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(5000);
    const key = await p.evaluate(() => window.sarvakali?.world?.chapterKey);
    let works = false;
    try { works = await probe(p); } catch (e) { errs.push(`probe: ${e.message.split('\n')[0].slice(0, 90)}`); }
    ok(`preview ${pl}: loads its own code and responds`, works && !errs.length, `world ${key}${errs.length ? ' | ' + [...new Set(errs)].join(' | ') : ''}`);
    allErrs.push(...errs.map((e) => `${pl}: ${e}`));
    await ctx.close();
  }
  console.log('ERRORS:', allErrs.length ? [...new Set(allErrs)] : 'none');
  await b.close();
})();
