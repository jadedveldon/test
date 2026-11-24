// Every bug found so far, re-created as a live check so it can never quietly return.
// Rule (CLAUDE.md): a new bug gets its check here first, failing before the fix and passing after it.
const { chromium } = require('playwright');
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const ok = (n, v, extra = '') => console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`);
const ARGS = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
(async () => {
  const b = await chromium.launch(ARGS);
  const fresh = async (opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 855 }, serviceWorkers: 'block', ...opts });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
    const p = await ctx.newPage();
    p.errs = [];
    p.on('pageerror', (e) => p.errs.push(e.message.slice(0, 120)));
    return { ctx, p };
  };
  const nav = (p, r) => p.evaluate((r) => { const a = document.createElement('a'); a.href = r; document.body.appendChild(a); a.click(); a.remove(); }, r);

  // 1-2 depth demo
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/depth?tier=full&cursor=off`); await p.waitForTimeout(4000);
    ok('depth: live on a direct load', await p.evaluate(() => document.querySelector('.depth-stage').classList.contains('is-live')));
    await ctx.close(); }
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/depth?tier=calm&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelectorAll('[data-work]')[1].click()); await p.waitForTimeout(500);
    ok('depth: flat mode, switching paintings', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  // 3 signature moments put themselves back when you leave (they once stayed half-done when the page changed)
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/divination?tier=full&cursor=off`); await p.waitForTimeout(3500);
    const s = await p.$('[data-mirror-surface]'); const bx = await s.boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(1200);
    await nav(p, '/pillars/learning'); await p.mouse.up(); await p.waitForTimeout(3000);
    await nav(p, '/pillars/divination'); await p.waitForTimeout(3500);
    ok('mirror: still water after leaving mid-hold and coming back', await p.evaluate(() => !document.querySelector('[data-mirror-surface]').classList.contains('is-held') && getComputedStyle(document.querySelector('[data-mirror-mist]')).opacity === '1' && !document.querySelector('[data-mirror-symbol]').textContent));
    // a prompt shown, then leave before the water settles back: nothing fires on the next page
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(3700); await p.mouse.up(); await p.waitForTimeout(400);
    await nav(p, '/pillars/learning'); await p.waitForTimeout(3500);
    ok('mirror: leaving after a prompt, no errors on the next page', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  // 8 kintsugi order
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/healing?tier=full&cursor=off`); await p.waitForTimeout(3500);
    await p.evaluate(() => document.querySelector('[data-mend-svg]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(1500);
    const g0 = await p.$('[data-piece="0"] path'); const bb = await g0.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
    await p.mouse.move(bb.x + bb.width / 2 + 40, bb.y + bb.height / 2 + 30, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('[data-piece="5"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    await p.waitForTimeout(200);
    const order = await p.evaluate(() => { const gs = Array.from(document.querySelectorAll('[data-piece]')); const home = gs.filter((g) => g.classList.contains('is-home')).map((g) => gs.indexOf(g)); const loose = gs.filter((g) => !g.classList.contains('is-home')).map((g) => gs.indexOf(g)); return { home, loose, fine: home.length > 0 && Math.max(...home) < Math.min(...loose) }; });
    ok('kintsugi: settled pieces sit under loose ones', order.fine, JSON.stringify(order));
    await ctx.close(); }
  // 4 invoice local date
  { const { ctx, p } = await fresh({ timezoneId: 'Asia/Kolkata' });
    await p.clock.install({ time: new Date('2026-11-24T19:45:00Z') }); // 01:15 on 25 Nov in India
    await p.goto(`${B}/invoice?tier=still&cursor=off`); await p.waitForTimeout(2500);
    const v = await p.evaluate(() => ({ d: document.querySelector('input[name="date"]')?.value, n: document.querySelector('input[name="number"]')?.value }));
    ok('invoice: date is local (25 Nov at 01:15 IST)', v.d === '2026-11-25' && (v.n || '').includes('261125'), JSON.stringify(v));
    await ctx.close(); }
  // 5 path links into Pillars 4-6
  { const { ctx, p } = await fresh();
    for (const [pl, cat] of [['identity', 'Queer-Affirming Work'], ['divination', 'Dreams, Psychic Development & Astral Work'], ['learning', 'Classes & Mentoring']]) {
      await p.goto(`${B}/path?tier=still&cursor=off`); await p.waitForTimeout(1500);
      await p.click(`.path-opt[data-pillar="${pl}"]`); await p.waitForTimeout(900);
      await p.click(`.path-opt[data-category="${cat}"]`); await p.waitForTimeout(900);
      await p.click('[data-begin] >> nth=0'); await p.waitForTimeout(900);
      const href = await p.getAttribute('[data-result-explore]', 'href');
      await p.click('[data-result-explore]'); await p.waitForTimeout(3000);
      const r = await p.evaluate(() => { const id = location.hash.slice(1); const el = document.getElementById(id); return { id, exists: !!el, top: el ? Math.round(el.getBoundingClientRect().top) : null, y: Math.round(scrollY) }; });
      ok(`path → ${pl}: lands on the chapter`, r.exists && r.y > 200, `${href} ${JSON.stringify(r)}`);
    }
    await ctx.close(); }
  // 9 tier param
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => { document.getElementById('hud').dataset.open = 'true'; });
    await Promise.all([p.waitForNavigation(), p.evaluate(() => document.querySelector('[data-tier-btn="auto"]').click())]);
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ url: location.search, tier: document.documentElement.dataset.tier, manual: sessionStorage.getItem('sk-tier-manual') || localStorage.getItem('sk-tier-manual') }));
    ok('panel: Auto works after opening with ?tier=calm', !r.url.includes('tier=') && r.tier !== 'calm', JSON.stringify(r));
    await ctx.close(); }
  // 10 world chunk fails
  { const { ctx, p } = await fresh();
    await p.route(/\/_astro\/World\.[^/]+\.js$/, (r) => r.abort());
    await p.goto(`${B}/?tier=full&cursor=off`); await p.waitForTimeout(5000);
    ok('3D download fails: falls back to Still', await p.evaluate(() => document.documentElement.dataset.tier === 'still'));
    await ctx.close(); }
  // 12 search reveal on Learning A
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/learning?tier=still&cursor=off&find=${encodeURIComponent('Spirituality Fundamentals Classes')}`); await p.waitForTimeout(3000);
    ok('search: reveals the service in its chapter list', await p.evaluate(() => { const f = document.querySelector('.is-found'); return !!f && f.getClientRects().length > 0 && !!f.closest('.sub-card') && !f.closest('.pd-sig, .pathmap'); }));
    await ctx.close(); }
  // 13 connect topic used once
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/divination?tier=still&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('.pd-move [data-topic]').click()); await p.waitForTimeout(2500);
    const first = await p.inputValue('#topic');
    await p.goto(`${B}/pillars/learning?tier=still&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('.sub-card .chip-keep').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('.book-btn').click()); await p.waitForTimeout(2500);
    const second = await p.inputValue('#topic');
    ok('connect: Book shows the kept list, not an old topic', second !== first && /Interested|kept|:/.test(second), `${first} → ${second}`);
    await ctx.close(); }
  // 7 + 14 fire twice on Calm, and leaving mid-burn on Full
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/practice?tier=calm&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('[data-fire]').scrollIntoView());
    await p.fill('[data-fire] textarea', 'fear'); await p.click('[data-fire] button[type="submit"]'); await p.waitForTimeout(3200);
    await p.click('[data-fire-again]');
    await p.fill('[data-fire] textarea', 'doubt'); await p.click('[data-fire] button[type="submit"]'); await p.waitForTimeout(60);
    const st = await p.evaluate(() => { const w = document.querySelector('[data-fire-words]'); const cs = getComputedStyle(w); return { f: cs.filter, t: cs.transform }; });
    const blur = Number((/blur\(([\d.]+)px\)/.exec(st.f) || [0, 0])[1]); const ty = Math.abs(Number((/, ([-\d.e]+)\)$/.exec(st.t) || [0, 0])[1]));
    ok('fire: second offering starts clear and in place', blur < 0.5 && ty < 2, JSON.stringify(st));
    await ctx.close(); }
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/practice?tier=full&cursor=off`); await p.waitForTimeout(4000);
    await p.evaluate(() => document.querySelector('[data-fire]').scrollIntoView());
    await p.fill('[data-fire] textarea', 'my worry'); await p.click('[data-fire] button[type="submit"]'); await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelector('a.wordmark').click()); await p.waitForTimeout(5000);
    ok('fire: leaving mid-burn, no errors on the next page', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  await b.close();
})();
