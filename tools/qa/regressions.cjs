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
  // 13 connect topic used once (since the Connect redesign the kept list shows as chips, not text in the topic box)
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/divination?tier=still&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('.pd-move [data-topic]').click()); await p.waitForTimeout(2500);
    const first = await p.inputValue('#topic');
    await p.goto(`${B}/pillars/learning?tier=still&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('.sub-card .chip-keep').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('.book-btn').click()); await p.waitForTimeout(2500);
    const second = await p.inputValue('#topic');
    const chips = await p.evaluate(() => [...document.querySelectorAll('[data-connect-kept-list] li > span')].map((x) => x.textContent));
    ok('connect: Book shows the kept list, not an old topic', !!first && second !== first && chips.length > 0, `"${first}" → "${second}" · list: ${chips.join('; ')}`);
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
  // 15 the offline helper once saved every page visited, the editor and its door address (with the secret word in it) included
  { const { ctx, p } = await fresh({ serviceWorkers: 'allow' });
    await p.goto(`${B}/`); await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(1500);
    for (const r of ['/keystatic', '/keystatic/singleton/home', '/door/a-secret-word']) { await p.goto(`${B}${r}`).catch(() => {}); await p.waitForTimeout(400); }
    await p.goto(`${B}/`); await p.waitForTimeout(800);
    const kept = await p.evaluate(async () => { const out = []; for (const n of await caches.keys()) for (const r of await (await caches.open(n)).keys()) out.push(new URL(r.url).pathname); return out; });
    const editor = kept.filter((u) => /^\/(keystatic|api\/keystatic|door)(\/|$)/.test(u));
    ok('offline helper: never saves the editor or its door', kept.length > 0 && editor.length === 0, editor.length ? editor.join(', ') : `${kept.length} pages saved`);
    await ctx.close(); }
  // 16 moving the words into the content files once dropped the shared words (back link, previous and next pillar) from Devotion
  { const { ctx, p } = await fresh();
    const words = require('../../src/content/settings.json').words;
    const missing = [];
    for (const pl of ['devotion', 'magic', 'healing', 'identity', 'divination', 'learning']) {
      const h = await (await p.request.get(`${B}/pillars/${pl}`)).text();
      const t = h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
      for (const k of ['allPillars', 'ask', 'previous', 'next']) if (!t.includes(words[k])) missing.push(`${pl}: ${k}`);
    }
    ok('pillar pages: the shared words from Site settings are on every page', !missing.length, missing.join(', '));
    await ctx.close(); }
  // 17 on phones the living form ran through form fields and long text on the pages around the pillars, and Daily
  //    practice opened in Divination's world (its mirror and lettering) after Divination was settled
  { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const loud = [];
    for (const pg of ['connect', 'path', 'writings', 'writings/who-is-kali', 'invoice', 'about', 'care']) {
      await p.goto(`${B}/${pg}?tier=full&cursor=off`); await p.waitForTimeout(4500);
      const o = await p.evaluate(() => window.sarvakali.world.formOpacity);
      if (o > 0.02) loud.push(`${pg} ${o.toFixed(2)}`);
    }
    ok('phone: no living form behind form fields and long text', !loud.length, loud.join(', '));
    await p.goto(`${B}/pillars/healing?tier=full&cursor=off`); await p.waitForTimeout(4500);
    ok('phone: the pillars keep their living forms', await p.evaluate(() => window.sarvakali.world.formOpacity) > 0.05);
    await p.goto(`${B}/practice?tier=full&cursor=off`); await p.waitForTimeout(4500);
    const pr = await p.evaluate(() => ({ key: window.sarvakali.world.chapterKey, font: getComputedStyle(document.querySelector('h1')).fontFamily }));
    ok('daily practice: opens in its own world and lettering, not Divination\'s', !/^div_/.test(pr.key) && !/Unicase/.test(pr.font), `${pr.key} · ${pr.font.split(',')[0]}`);
    await ctx.close(); }
  // 18 on light pages the list bullets took the world's glow (near white) and almost vanished; on the invoice maker
  //    "(optional)" fell onto a line of its own under each label
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/writings/who-is-kali?tier=still&cursor=off`); await p.waitForTimeout(3000);
    const c = await p.evaluate(() => {
      const lum = (s) => { const v = s.match(/[\d.]+/g).slice(0, 3).map((x) => { x = Number(x) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const m = getComputedStyle(document.querySelector('.prose li'), '::marker').color;
      const bg = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--bg-a').trim().split(/\s+/).join(',')})`;
      const [a, b] = [lum(m), lum(bg)].sort((x, y) => y - x);
      return { light: document.documentElement.dataset.light, ratio: (a + 0.05) / (b + 0.05), m, bg };
    });
    ok('light pages: list bullets stand out from the page (3:1 or more)', c.light === '1' && c.ratio >= 3, `${c.ratio.toFixed(2)}:1 · ${c.m} on ${c.bg}`);
    await p.goto(`${B}/invoice?tier=still&cursor=off`); await p.waitForTimeout(2000);
    const lines = await p.evaluate(() => [...document.querySelectorAll('.inv-form label')].filter((l) => l.querySelector('.optional')).map((l) => {
      const o = l.querySelector('.optional').getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(l.firstChild); const t = r.getBoundingClientRect();
      return Math.abs(o.top - t.top) < 4;
    }));
    ok('invoice: "(optional)" sits beside its label', lines.length > 0 && lines.every(Boolean), `${lines.filter(Boolean).length} of ${lines.length}`);
    await ctx.close(); }
  // 19 at 200% text on a phone the Mahavidya and deity cards on Devotion (Bhuvaneshvari, Chhinnamasta...) ran past
  //    the screen and the page scrolled sideways; found by layout.cjs, which had reported it as a known alarm
  { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.goto(`${B}/pillars/devotion?tier=still`); await p.addStyleTag({ content: 'html { font-size: 200% !important; }' }); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const de = document.documentElement; return { sw: de.scrollWidth, cw: de.clientWidth }; });
    ok('devotion: no sideways scrolling at 200% text on a phone', r.sw <= r.cw + 1, `${r.sw} wide in ${r.cw}`);
    await ctx.close(); }
  // 20 with the flame cursor on (it hides the arrow), the cursor vanished over the menu and search, which were
  //    drawn above it, and over today's card, which opens in the browser's top layer above everything
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/?tier=still&cursor=flame`); await p.waitForTimeout(2500);
    const seen = async (sel) => {
      const el = p.locator(sel).first(); const bx = await el.boundingBox();
      await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2, { steps: 4 }); await p.waitForTimeout(400);
      return el.evaluate((t) => {
        const c = document.getElementById('cursor');
        // the drawn cursor shows if it is visible and stacked above the layer t sits in; otherwise the arrow must show
        const layer = t.closest('.menu, .search, dialog');
        const drawn = c.classList.contains('is-visible') && getComputedStyle(c).opacity !== '0' && !layer?.matches('dialog') && Number(getComputedStyle(c).zIndex) > Number(getComputedStyle(layer).zIndex);
        const arrow = getComputedStyle(t).cursor !== 'none';
        return drawn || arrow;
      });
    };
    await p.click('[data-menu-open]'); await p.waitForTimeout(900);
    const menu = await seen('.menu-main a');
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    await p.click('[data-search-open]'); await p.waitForTimeout(900);
    const search = await seen('.search input, .search button');
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelector('[data-card-open]').click()); await p.waitForTimeout(1500);
    const card = await seen('#card-dialog button');
    ok('cursor: stays visible over the menu, search and today\'s card', menu && search && card, `menu ${menu} · search ${search} · card ${card}`);
    await ctx.close(); }
  // 21 Hecate's mark on Witchcraft & Magic, a circle with three roads meeting, read as a peace sign; it is replaced by
  //    her key (chosen from her torches, key and serpent), in the world and the badge
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/magic?tier=full&cursor=off`); await p.waitForTimeout(4000);
    const r = await p.evaluate(() => ({
      form: window.sarvakali.world.formKey,
      badge: [...document.querySelectorAll('.mg-presides .hk-sign [data-sign]')].filter((g) => getComputedStyle(g).display !== 'none').map((g) => g.dataset.sign),
      roads: document.querySelectorAll('.hk-moon-road, .mg-presides path[d^="M0 0 L"]').length,
    }));
    ok('magic: Hecate\'s key, not three roads, in the world and the badge', r.form === 'key' && r.badge.join() === 'key' && !r.roads, `${r.form} / ${r.badge.join('+')}${r.roads ? ' / roads ' + r.roads : ''}`);
    await ctx.close(); }
  // 22 arriving at a chapter's heading (from the menu, search or a link) left its light form still 5% dissolved out of
  //    the one before, which blurred fine line forms such as a kolam (the galaxy's fuzz had hidden it); the golden
  //    bloom now stands there
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/healing?tier=full&cursor=off#mind-and-subconscious-work`); await p.waitForTimeout(5000);
    const r = await p.evaluate(() => ({ form: window.sarvakali.world.formKey, settled: window.sarvakali.world.formSettled }));
    ok('world: a chapter\'s form is whole at its heading', r.form === 'bloom' && r.settled > 0.99, `${r.form} settled ${r.settled.toFixed(3)}`);
    await ctx.close(); }
  await b.close();
})();
