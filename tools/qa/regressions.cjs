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

  // 1-2 the depth view (once its own demo page; since 2026-11-26 About's portrait)
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/about?tier=full&cursor=off`); await p.waitForTimeout(4000);
    ok('depth: live on a direct load (About)', await p.evaluate(() => document.querySelector('.depth-stage').classList.contains('is-live')));
    await ctx.close(); }
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/about?tier=calm&cursor=off`); await p.waitForTimeout(2500);
    ok('depth: flat mode on a calm device (About)', p.errs.length === 0, p.errs.join(' | '));
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
  // 4 invoice local date: invoices are made in the Studio since 2026-11-26, and dated in Sarvakali's zone; checked
  //    in tools/qa/studio-core.mjs ("invoice: dated in India at 01:15 IST")
  // 5 path links into Pillars 4-6
  { const { ctx, p } = await fresh();
    for (const [pl, cat] of [['identity', 'Queer-Affirming Work'], ['divination', 'Dreams, Psychic Development & Astral Work'], ['learning', 'Classes & Mentoring']]) {
      await p.goto(`${B}/path?tier=still&cursor=off`); await p.waitForTimeout(1500);
      await p.click(`.path-opt[data-pillar="${pl}"]`); await p.waitForTimeout(900);
      // the options carry their category as an address (since the path revamp): "Classes & Mentoring" → classes-and-mentoring
      const key = cat.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await p.click(`.path-opt[data-category="${key}"]`); await p.waitForTimeout(900);
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
  // 7 + 14 fire twice on Calm, and leaving mid-burn on Full (the fire is on the tools page since 2026-11-26)
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/practice/tools?tier=calm&cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('[data-fire]').scrollIntoView());
    await p.fill('[data-fire] textarea', 'fear'); await p.click('[data-fire] button[type="submit"]'); await p.waitForTimeout(3200);
    await p.click('[data-fire-again]');
    await p.fill('[data-fire] textarea', 'doubt'); await p.click('[data-fire] button[type="submit"]'); await p.waitForTimeout(60);
    const st = await p.evaluate(() => { const w = document.querySelector('[data-fire-words]'); const cs = getComputedStyle(w); return { f: cs.filter, t: cs.transform }; });
    const blur = Number((/blur\(([\d.]+)px\)/.exec(st.f) || [0, 0])[1]); const ty = Math.abs(Number((/, ([-\d.e]+)\)$/.exec(st.t) || [0, 0])[1]));
    ok('fire: second offering starts clear and in place', blur < 0.5 && ty < 2, JSON.stringify(st));
    await ctx.close(); }
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/practice/tools?tier=full&cursor=off`); await p.waitForTimeout(4000);
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
    const settings = require('../../src/content/settings.json');
    // the back link became the trail at the top in 2026-11 ("The six pillars", from the breadcrumb words)
    const words = { ...settings.words, allPillars: settings.crumbs.pillars };
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
  //    "(optional)" fell onto a line of its own under each label (the maker became the Studio's invoices in 2026-11;
  //    the same "(optional)" labels are checked on Connect)
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/articles/who-is-kali?tier=still&cursor=off`); await p.waitForTimeout(3000);
    const c = await p.evaluate(() => {
      const lum = (s) => { const v = s.match(/[\d.]+/g).slice(0, 3).map((x) => { x = Number(x) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const m = getComputedStyle(document.querySelector('.prose li'), '::marker').color;
      const bg = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--bg-a').trim().split(/\s+/).join(',')})`;
      const [a, b] = [lum(m), lum(bg)].sort((x, y) => y - x);
      return { light: document.documentElement.dataset.light, ratio: (a + 0.05) / (b + 0.05), m, bg };
    });
    ok('light pages: list bullets stand out from the page (3:1 or more)', c.light === '1' && c.ratio >= 3, `${c.ratio.toFixed(2)}:1 · ${c.m} on ${c.bg}`);
    await p.goto(`${B}/connect?tier=still&cursor=off`); await p.waitForTimeout(2000);
    const lines = await p.evaluate(() => [...document.querySelectorAll('#connect-form label')].filter((l) => l.querySelector('.optional') && l.firstChild?.nodeType === 3).map((l) => {
      const o = l.querySelector('.optional').getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(l.firstChild); const t = r.getBoundingClientRect();
      return Math.abs(o.top - t.top) < 4;
    }));
    ok('forms: "(optional)" sits beside its label (Connect)', lines.length > 0 && lines.every(Boolean), `${lines.filter(Boolean).length} of ${lines.length}`);
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
  // 23 found by looking at the request loop (2026-11-26): after sending, Connect's confirmation was scrolled to its
  //    middle, so its heading sat under the header, and the visitor's own words showed as one more chip; in the Studio
  //    the DRAFT stamp lay over the invoice's letterhead, a history read "You Confirmed a time", and the Discount box
  //    stretched beside the Tax box and its hint. Every static build carries the Studio's demo, so this runs anywhere.
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/healing?tier=still&cursor=off`); await p.waitForTimeout(2500);
    await p.locator('[data-keep]').first().click();
    await p.goto(`${B}/connect?tier=still&cursor=off`); await p.waitForTimeout(2000);
    await p.fill('#name', 'Regression Check'); await p.fill('#email', 'regression@example.com'); await p.fill('#topic', 'A few words of my own.');
    await p.fill('#time1', `${new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)}T18:30`);
    await p.click('[data-connect-send]'); await p.waitForTimeout(3000);
    const d = await p.evaluate(() => {
      const h = document.querySelector('#connect-done h2, #connect-done h1, #connect-done .display-m, #connect-done .display-l').getBoundingClientRect();
      const head = document.querySelector('.site-header').getBoundingClientRect();
      return { below: h.top >= head.bottom - 1 && h.bottom <= innerHeight, chips: [...document.querySelectorAll('[data-done-asked] li')].map((l) => l.textContent), quote: document.querySelector('[data-done-topic]')?.textContent || '' };
    });
    ok('connect: after sending, the confirmation\'s heading is in view, below the header', d.below, JSON.stringify(d));
    ok('connect: the visitor\'s words are a quote, not a chip', d.chips.length === 1 && !d.chips.some((c) => /words of my own/.test(c)) && /words of my own/.test(d.quote), JSON.stringify(d));
    // the Studio: a draft invoice for that request
    await p.goto(`${B}/studio`); await p.waitForTimeout(3000);
    const db = await p.evaluate(() => JSON.parse(localStorage.getItem('sk-studio-demo')).db);
    const req = db.bookings.find((x) => x.topic === 'A few words of my own.');
    await p.evaluate((id) => { location.hash = `#/requests/${id}`; }, req.id); await p.waitForTimeout(1500);
    const hist = await p.evaluate(() => [...document.querySelectorAll('.st-timeline li')].map((l) => l.textContent));
    await p.locator('.st-slots button', { hasText: 'Confirm this time' }).first().click(); await p.waitForTimeout(1500);
    await p.evaluate((id) => { location.hash = `#/clients/${id}`; }, req.clientId); await p.waitForTimeout(1200);
    await p.locator('button', { hasText: 'New invoice' }).click(); await p.waitForTimeout(2500);
    const inv = await p.evaluate(() => {
      const o = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      const stamp = document.querySelector('.ip-stamp').getBoundingClientRect();
      const head = document.querySelector('.ip-head').getBoundingClientRect();
      const box = (label) => [...document.querySelectorAll('.st-field')].find((f) => f.querySelector('.st-label')?.textContent.startsWith(label))?.querySelector('input').getBoundingClientRect();
      const dis = box('Discount'), tax = box('Tax');
      return { stampClear: !o(stamp, head), boxes: dis && tax ? Math.abs(dis.top - tax.top) < 2 && Math.abs(dis.height - tax.height) < 2 : false };
    });
    ok('studio: a history line follows its actor in lower case ("Meera sent a request")', hist.length > 0 && hist.every((t) => !/^(You|\S+) [A-Z]/.test(t.trim())), hist.join(' | '));
    ok('studio: the DRAFT stamp leaves the invoice\'s letterhead clear', inv.stampClear, JSON.stringify(inv));
    ok('studio: the Discount and Tax boxes line up', inv.boxes, JSON.stringify(inv));
    ok('studio: no errors on the way', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  // 24 found while adding the terms page (2026-11-26): with smooth scrolling on, a link to a place on the same page
  //    (the terms' contents, the footer's "Back to the top") changed the address but left the page where it was
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/terms?tier=full&cursor=off`); await p.waitForTimeout(3000);
    await p.click('.terms-toc a[href="#refunds"]'); await p.waitForTimeout(2200);
    const top = await p.evaluate(() => Math.round(document.getElementById('refunds').getBoundingClientRect().top));
    ok('anchors: a contents link brings its part into view, below the header', top >= 70 + 12 && top < 260, `top ${top}`);
    await p.keyboard.press('End'); await p.waitForTimeout(2000);
    const yEnd = await p.evaluate(() => Math.round(scrollY));
    await p.evaluate(() => document.querySelector('[data-to-top]').click()); await p.waitForTimeout(2500);
    const y = await p.evaluate(() => Math.round(scrollY));
    ok('anchors: "Back to the top" goes back to the top from the foot of the page', y < 40 && yEnd > 1500, `from ${yEnd} to ${y}`);
    ok('anchors: no errors on the way', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  // 25 found in the design gap audit (2026-11-26): on the practice pages the line above the title still began with
  //    links to the pages above ("Daily practice · The library · …"), left from before the trail at the top existed;
  //    on phones it sat straight under the trail's "‹ Daily practice", saying it twice
  { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 } });
    for (const path of ['/practice/library', '/practice/mantras/hymn-to-selene', '/practice/tools', '/practice/monday', '/practice/with/kali', '/practice/mantras/gayatri']) {
      await p.goto(`${B}${path}?tier=calm&cursor=off`); await p.waitForTimeout(900);
      const d = await p.evaluate(() => {
        const up = [...document.querySelectorAll('[data-crumbs] a')].map((a) => ({ href: a.getAttribute('href'), label: a.textContent.trim().toLowerCase() }));
        const k = document.querySelector('.kicker[data-hero]');
        const links = [...(k?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));
        const text = (k?.textContent ?? '').trim().toLowerCase();
        return { kicker: text, repeats: up.filter((c) => links.includes(c.href) || text.startsWith(c.label)).map((c) => c.label) };
      });
      ok(`trail: the line above the title does not repeat the trail (${path})`, d.repeats.length === 0, JSON.stringify(d));
    }
    ok('trail: no errors on the way', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  // 26 found by keyboard.cjs (2026-11-27): the site-wide footer, added after the menu and search, was left out of what
  //    those full-screen layers make inert, so Tab walked out of search into the footer's links
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(1500);
    const inertWhen = async (open) => { await p.evaluate(open); await p.waitForTimeout(700); const r = await p.evaluate(() => { const f = document.querySelector('.site-foot'); return !f || f.inert || !!f.closest('[inert]'); }); await p.keyboard.press('Escape'); await p.waitForTimeout(600); return r; };
    ok('footer: inert while search is open', await inertWhen(() => document.querySelector('[data-search-open]').click()));
    ok('footer: inert while the menu is open', await inertWhen(() => document.querySelector('[data-menu-open]').click()));
    ok('footer: back to normal when they close', await p.evaluate(() => { const f = document.querySelector('.site-foot'); return !!f && !f.inert; }));
    await ctx.close(); }
  // 27 found while making the site smoother (2026-11-27): starting the 3D world made all of its ~36 light forms at
  //    once (60,000 points each), which stopped the homepage for about three quarters of a second on a laptop (three
  //    seconds on a slow phone) just as it appeared; forms are now made as they are needed and the rest when idle
  { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.addInitScript(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); });
    await p.goto(`${B}/?tier=full&cursor=off`); await p.waitForTimeout(6000);
    const lt = await p.evaluate(() => window.__lt);
    const worst = Math.max(0, ...lt);
    ok('smooth: the homepage never stops for long while the world starts', worst < 450, `longest ${worst} ms (it was ~740)`);
    await ctx.close(); }
  // 28 the forms made on demand: the one on screen is real at once, and every form is made soon after
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/pillars/magic?tier=full&cursor=off`); await p.waitForTimeout(2500);
    const now = await p.evaluate(() => { const w = window.sarvakali.world.impl; const k = w.formKey; const a = w.base.forms[k], d = w.base.forms.dust; let same = 0; for (let i = 0; i < 300; i++) if (a[i] === d[i]) same++; return { k, real: k === 'dust' || same < 30 }; });
    await p.waitForTimeout(9000);
    const left = await p.evaluate(() => window.sarvakali.world.impl.unmade.size);
    ok('world: the form on screen is made at once', now.real, now.k);
    ok('world: every other form is made soon after, when the page is idle', left === 0, `${left} still to make`);
    ok('world: no errors while making forms', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  // 29 the library's ~150 cards, and every chapter after the first, were styled and drawn even far off screen; each
  //    change of the world's colours restyled all of them (15 ms on a laptop for the library); far ones now wait
  { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.goto(`${B}/practice/library?tier=calm&cursor=off`); await p.waitForTimeout(1500);
    const lib = await p.evaluate(() => { const cards = [...document.querySelectorAll('.mc')]; const drawn = cards.filter((c) => c.checkVisibility({ contentVisibilityAuto: true })).length; return { all: cards.length, drawn }; });
    ok('smooth: library cards far off screen wait to be drawn', lib.all > 50 && lib.drawn < lib.all / 3, `${lib.drawn} of ${lib.all} drawn`);
    await p.evaluate(() => document.querySelectorAll('.mc')[60].scrollIntoView()); await p.waitForTimeout(600);
    const shown = await p.evaluate(() => { const c = document.querySelectorAll('.mc')[60]; return c.checkVisibility({ contentVisibilityAuto: true }) && c.getBoundingClientRect().height > 100; });
    ok('smooth: a card is drawn in full once it comes near', shown);
    await ctx.close(); }
  // 30 the homepage asked for every pillar's own lettering at once (about 170 KB of fonts); each is now asked for
  //    only when its chapter comes near
  { const { ctx, p } = await fresh();
    const asked = []; p.on('request', (r) => { if (/fonts\.googleapis\.com/.test(r.url())) asked.push(r.url()); });
    await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(2000);
    const pillarFont = () => asked.filter((u) => /Cinzel|Spectral|DM\+Serif|Cormorant\+Unicase|Libre\+Baskerville/.test(u)).length;
    const first = pillarFont();
    await p.evaluate(() => document.querySelector('[data-chapter="learning"]').scrollIntoView()); await p.waitForTimeout(1500);
    ok('smooth: pillar lettering is not fetched for the homepage\'s first screen', first === 0, `${first} fetched`);
    ok('smooth: pillar lettering arrives as its chapter comes near', pillarFont() >= 3, `${pillarFont()} fetched after scrolling`);
    await ctx.close(); }
  // 31 reported by the owner (2026-11-27): the library's filters floated over the page the whole way down, taking a
  //    large part of the screen, and its cards had too little padding to read as cards
  for (const view of [{ viewport: { width: 1440, height: 900 } }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
    const { ctx, p } = await fresh(view);
    await p.goto(`${B}/practice/library?tier=calm&cursor=off`); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelector('.plib-filters').scrollIntoView()); await p.waitForTimeout(300);
    await p.evaluate(() => window.scrollBy(0, innerHeight * 3)); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const f = document.querySelector('.plib-filters'); const fb = f.getBoundingClientRect(); const c = document.querySelector('.mc'); const cs = getComputedStyle(c);
      return { pos: getComputedStyle(f).position, onScreen: fb.bottom > 0 && fb.top < innerHeight, pad: parseFloat(cs.paddingLeft), panelPad: parseFloat(getComputedStyle(c.querySelector('.mc-text') || c).paddingLeft) }; });
    const w = view.viewport.width;
    ok(`library: the filters stay at the head of the list, not over the cards (${w})`, r.pos !== 'sticky' && r.pos !== 'fixed' && !r.onScreen, `${r.pos}, on screen: ${r.onScreen}`);
    ok(`library: cards have room inside them (${w})`, r.pad >= 18 && r.panelPad >= 12, `card ${r.pad}px, words ${r.panelPad}px`);
    await ctx.close(); }
  // 32 reported by the owner (2026-11-27): an article's text sat to one side of a wide screen, with its contents,
  //    invitation and "read next" each at a different width; it now reads down one centred column
  { const { ctx, p } = await fresh({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${B}/articles/who-is-kali?tier=calm&cursor=off`); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const box = (s) => document.querySelector(s)?.getBoundingClientRect(); const body = box('.ar-body'), h1 = box('.ar-article h1'), end = box('.article-end'), toc = box('.ar-toc');
      return { off: Math.round(body.left + body.width / 2 - innerWidth / 2), h1: Math.round(h1.left - body.left), end: Math.round(end.left - body.left), endW: Math.round(end.width - body.width), toc: toc ? toc.right <= body.left : true }; });
    ok('articles: the text is centred on a wide screen', Math.abs(r.off) < 40, `${r.off}px off centre`);
    ok('articles: title, text and ending share one column', Math.abs(r.h1) < 4 && Math.abs(r.end) < 4 && Math.abs(r.endW) < 4 && r.toc, JSON.stringify(r));
    await ctx.close(); }
  // 33 every article's theme is one the site knows (an unknown one reads as the reading page)
  { const { ctx, p } = await fresh();
    await p.goto(`${B}/articles?tier=calm&cursor=off`); await p.waitForTimeout(800);
    const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/articles/"]')].map((a) => a.getAttribute('href')))]);
    const bad = [];
    for (const l of links) { await p.goto(`${B}${l}?tier=calm&cursor=off`); await p.waitForTimeout(500);
      const t = await p.evaluate(() => ({ theme: document.querySelector('[data-ar-theme]')?.dataset.arTheme, seq: document.getElementById('main')?.dataset.sequence }));
      if (!t.theme || !t.seq) bad.push(`${l} ${JSON.stringify(t)}`); }
    ok('articles: each has a theme and its world', links.length > 0 && bad.length === 0, bad.join(' | ') || `${links.length} articles`);
    await ctx.close(); }
  // 34 found by layout.cjs (2026-11-27): on touch screens a rule that made the Greek gods' filter buttons taller
  //    picked every element with data-el, the gods' cards too, which turned each card into one squeezed row
  { const { ctx, p } = await fresh({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
    await p.goto(`${B}/pillars/devotion?tier=calm&cursor=off`); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const cards = [...document.querySelectorAll('li.greek-card')]; return { all: cards.length, flat: cards.filter((c) => getComputedStyle(c).display !== 'grid').length, cut: cards.filter((c) => c.scrollWidth > c.clientWidth + 2).length }; });
    ok('devotion: the Greek gods\' cards keep their shape on a touch phone', r.all > 0 && r.flat === 0 && r.cut === 0, JSON.stringify(r));
    await ctx.close(); }
  // 35 the diya said "on the finished site, every lamp joins one shared count" long after the shared count was the
  //    plan; it now joins one (tools/qa/diya.cjs, with a host). Without a host (this preview) it counts this device's
  //    lamps for the day and promises nothing
  { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(2000);
    await p.evaluate(() => document.querySelector('[data-diya]').scrollIntoView()); await p.waitForTimeout(600);
    await p.click('[data-diya-light]'); await p.waitForTimeout(600);
    const t = await p.evaluate(() => document.querySelector('[data-diya-count]').textContent.trim());
    ok('diya: without a host, this device\'s lamps for the day, and no promise', /one diya here today/.test(t) && !/finished site/.test(t), t);
    await ctx.close(); }
  // 36 practice from every page (2026-11-28): each pillar's end, each article's end, Find your path's result and the
  //    moon card offer guided practices, every one leading to a real practice; Today's line comes straight after the
  //    homepage's opening
  { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const hrefs = new Set(); const missing = [];
    for (const path of ['/pillars/devotion', '/pillars/magic', '/pillars/healing', '/pillars/identity', '/pillars/divination', '/pillars/learning', '/articles/who-is-kali', '/articles/the-thirty-moons', '/articles/what-happens-in-a-reading']) {
      await p.goto(`${B}${path}?tier=calm&cursor=off`); await p.waitForTimeout(700);
      const h = await p.evaluate(() => [...document.querySelectorAll('.prl a.prl-card')].map((a) => a.getAttribute('href')));
      if (h.length < 1) missing.push(path); h.forEach((x) => hrefs.add(x));
    }
    const broken = [];
    for (const h of hrefs) { const r = await p.request.get(`${B}${h}`); if (r.status() !== 200) broken.push(`${h} ${r.status()}`); }
    ok('practice: every pillar and article offers practices', !missing.length, missing.join(', ') || `${hrefs.size} different practices offered`);
    ok('practice: every practice offered leads to a real practice', !broken.length, broken.join(', '));
    await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(1200);
    const order = await p.evaluate(() => [...document.querySelectorAll('#main > [data-chapter]')].slice(0, 3).map((c) => c.dataset.chapter).join(','));
    ok('practice: Today\'s line comes straight after the homepage\'s opening', order.startsWith('hero,mala'), order);
    await p.click('[data-sky-btn]'); await p.waitForTimeout(500);
    const key = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    const go = await p.evaluate(() => { const a = document.querySelector('[data-sky-today-go]'); return a && !a.closest('[hidden]') ? a.getAttribute('href') : null; });
    ok('practice: the moon card leads to today\'s practice', !!go && go.endsWith(`/practice/with/${key}`), String(go));
    ok('practice: no errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close(); }
  // 37 instant pages (2026-11-28): a page starts loading when the mouse rests on its link, or a finger touches it on
  //    a phone; never on a data-saving connection, and never the private addresses
  { const loaded = (p) => p.evaluate(() => [...document.querySelectorAll('link[rel="prefetch"]')].map((l) => new URL(l.href).pathname));
    { const { ctx, p } = await fresh();
      await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(1500);
      const a = p.locator('a[href="/connect"]:visible').first(); await a.hover(); await p.waitForTimeout(400);
      const studio = await p.evaluate(() => { const l = document.querySelector('a[href="/studio"]'); if (!l) return 'none on page'; l.dispatchEvent(new MouseEvent('mouseenter')); l.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return 'tried'; });
      await p.waitForTimeout(400);
      const got = await loaded(p);
      ok('instant: resting the mouse on a link starts loading its page', got.some((x) => /^\/connect(\.html)?$/.test(x)), got.join(' ') || 'nothing');
      ok('instant: the Studio is never loaded ahead', !got.some((x) => x.startsWith('/studio')), studio);
      await ctx.close(); }
    { const { ctx, p } = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(1500);
      await p.evaluate(() => { const a = [...document.querySelectorAll('a[href="/connect"]')].find((x) => x.getClientRects().length); a.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [] })); });
      await p.waitForTimeout(400);
      const got = await loaded(p);
      ok('instant: on a phone, a finger on a link starts loading its page', got.some((x) => /^\/connect(\.html)?$/.test(x)), got.join(' ') || 'nothing');
      ok('instant: no errors', p.errs.length === 0, p.errs.join(' | '));
      await ctx.close(); }
    { const { ctx, p } = await fresh();
      await ctx.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }));
      await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(1500);
      await p.locator('a[href="/connect"]:visible').first().hover(); await p.waitForTimeout(400);
      const got = await loaded(p);
      ok('instant: nothing is loaded ahead on a data-saving connection', !got.length, got.join(' '));
      await ctx.close(); } }
  await b.close();
})();
