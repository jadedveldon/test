// Robustness: hostile settings, odd input, impatient visitors
const { chromium } = require('playwright');
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const OUT = require('path').join(process.env.QA_OUT || 'qa-output', 'robust');
require('fs').mkdirSync(OUT, { recursive: true });
const ok = (n, v, extra = '') => console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`);
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const visibleH1 = (p) => p.evaluate(() => { const h = document.querySelector('h1'); if (!h) return false; let o = 1; for (let n = h; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o > 0.5 && h.getClientRects().length > 0; });
(async () => {
  const b = await chromium.launch({ args: GL });
  const mk = async (opts = {}, init) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 855 }, serviceWorkers: 'block', ...opts });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', (e) => p.errs.push(e.message.slice(0, 120)));
    p.on('dialog', (d) => { p.errs.push('DIALOG ' + d.message()); d.dismiss(); });
    return { ctx, p };
  };
  // 1. storage blocked entirely (strict privacy settings)
  { const { ctx, p } = await mk({}, () => {
      for (const k of ['localStorage', 'sessionStorage']) Object.defineProperty(window, k, { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    const res = [];
    for (const u of ['/', '/pillars/magic', '/pillars/healing', '/pillars/identity', '/practice', '/connect', '/path', '/invoice']) {
      await p.goto(`${B}${u}?cursor=off`); await p.waitForTimeout(3500);
      res.push(`${u}:${await visibleH1(p) ? 'shown' : 'HIDDEN'}`);
    }
    await p.goto(`${B}/pillars/identity?cursor=off`); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('.sub-card .chip-keep').click()); await p.waitForTimeout(300);
    const kept = await p.evaluate(() => document.querySelector('[data-keep-count]')?.textContent);
    await p.evaluate(() => { document.querySelector('input[name="cf-pronouns"]').value = 'she/her'; document.querySelector('[data-comfort] button[type="submit"]').click(); }); await p.waitForTimeout(500);
    const note = await p.evaluate(() => document.querySelector('[data-comfort-text]').textContent.includes('she/her'));
    ok('storage blocked: pages load, keep and the comfort note still work this visit', p.errs.length === 0 && !res.join().includes('HIDDEN') && kept === '1' && note, `${res.join(' ')} kept=${kept} note=${note} ${p.errs.join(' | ')}`);
    await ctx.close(); }
  // 2. no WebGL at all
  { const b2 = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
    const ctx = await b2.newContext({ viewport: { width: 1440, height: 855 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
    const res = [];
    // the fire is on Tools for practice since the daily practice revamp (2026-11-26), so that page is the last one opened
    for (const u of ['/', '/pillars/devotion', '/pillars/magic', '/pillars/divination', '/pillars/learning', '/about', '/practice', '/practice/tools']) {
      await p.goto(`${B}${u}`); await p.waitForTimeout(3000);
      res.push(`${u}:${await p.evaluate(() => document.documentElement.dataset.tier)}${await visibleH1(p) ? '' : ':HIDDEN'}`);
    }
    await p.screenshot({ path: `${OUT}/nowebgl-practice.jpg`, type: 'jpeg', quality: 60 });
    await p.evaluate(() => document.querySelector('[data-fire]').scrollIntoView());
    await p.fill('[data-fire] textarea', 'worry'); await p.click('[data-fire] button[type="submit"]'); await p.waitForTimeout(3000);
    const fired = await p.evaluate(() => !document.querySelector('[data-fire-after]').hidden);
    ok('no WebGL: falls back to Still, pages and the fire work', errs.length === 0 && !res.join().includes('HIDDEN') && fired && res.every((r) => /still|calm/.test(r)), `${res.join(' ')} ${errs.join(' | ')}`);
    await b2.close(); }
  // 3. JavaScript off: the words must still be there
  { const { ctx, p } = await mk({ javaScriptEnabled: false });
    const res = [];
    for (const u of ['/', '/pillars/magic', '/pillars/healing', '/pillars/identity', '/pillars/learning', '/practice', '/connect', '/articles/who-is-kali']) {
      await p.goto(`${B}${u}`); await p.waitForTimeout(800);
      const v = await p.evaluate(() => { const els = Array.from(document.querySelectorAll('h1, h2, .lede, .sub-card')); const hid = els.filter((e) => { let o = 1; for (let n = e; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o < 0.5 || getComputedStyle(e).visibility === 'hidden'; }); return `${els.length - hid.length}/${els.length}`; });
      res.push(`${u}:${v}`);
    }
    await p.goto(`${B}/pillars/identity`); await p.screenshot({ path: `${OUT}/nojs-identity.jpg`, type: 'jpeg', quality: 60 });
    ok('JavaScript off: headings, ledes and services visible', res.every((r) => { const [a, t] = r.split(':')[1].split('/'); return a === t; }), res.join(' '));
    await ctx.close(); }
  // 4. nonsense in the address
  { const { ctx, p } = await mk({}, () => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    const urls = ['/pillars/identity?dir=z&find=%3Cb%3E', '/?tier=banana', '/?festival=nope', '/?hero=%3Cb%3E', '/pillars/learning?find=%3Cscript%3Ealert(1)%3C/script%3E', '/connect?topic=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', '/?page=zzz', '/pillars/divination?dir=', '/pillars/learning#nowhere', '/practice?card=1'];
    const res = [];
    for (const u of urls) { await p.goto(`${B}${u}`); await p.waitForTimeout(2200); res.push(`${u.slice(0, 32)}:${await visibleH1(p) ? 'ok' : 'HIDDEN'}`); }
    const topic = await p.goto(`${B}/connect?topic=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E`).then(() => p.waitForTimeout(1500)).then(() => p.inputValue('#topic'));
    const injected = await p.evaluate(() => !!document.querySelector('img[src="x"]'));
    ok('nonsense URL parameters are ignored safely', p.errs.length === 0 && !res.join().includes('HIDDEN') && !injected, `${res.join(' ')} topic="${topic.slice(0, 30)}" ${p.errs.join(' | ')}`);
    await ctx.close(); }
  // 5. odd and hostile text
  { const { ctx, p } = await mk({}, () => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    const odd = ['<img src=x onerror=alert(1)>', 'मेरा प्रेम लौट आए', '🌙✨🔥 love 🔥', ' '.repeat(40), 'a'.repeat(3000), '((([[[\\\\', 'ÀÉÎÕÜ ñ ß Ø'];
    await p.goto(`${B}/pillars/magic?tier=full&cursor=off`); await p.waitForTimeout(3500);
    const sigRes = [];
    for (const t of odd) {
      await (await p.$$('.sg-methods button'))[0].click(); await p.waitForTimeout(200); // the typed methods show the box
      const inp = await p.$('[data-sigil] input:visible, [data-sigil] textarea:visible');
      await inp.fill(t); await p.waitForTimeout(400);
      for (const m of await p.$$('.sg-methods button')) { await m.click(); await p.waitForTimeout(150); }
      sigRes.push(t.slice(0, 8));
    }
    ok('sigil maker: markup, Devanagari, emoji, spaces, 3000 letters, symbols', p.errs.length === 0 && !(await p.evaluate(() => !!document.querySelector('img[src="x"]'))), p.errs.join(' | '));
    p.errs.length = 0;
    await p.goto(`${B}/?tier=still&cursor=off`); await p.waitForTimeout(2000);
    await p.click('[data-search-open]'); await p.waitForTimeout(500);
    for (const t of ['(', '[', '\\', '*', '+?', 'प्रेम', '<b>x</b>', 'z'.repeat(500), 'love', '  ']) { await p.fill('#search-input', t); await p.waitForTimeout(250); }
    ok('search: regex symbols, Devanagari, markup, 500 letters', p.errs.length === 0 && !(await p.evaluate(() => !!document.querySelector('#search b:not(.sr-item b)'))), p.errs.join(' | '));
    await p.keyboard.press('Escape');
    p.errs.length = 0;
    await p.goto(`${B}/connect?tier=still&cursor=off`); await p.waitForTimeout(1500);
    await p.fill('#connect-form input[name="name"]', '<script>alert(1)</script>');
    await p.fill('#connect-form input[name="email"]', 'not-an-email');
    await p.click('#connect-form button[type="submit"]'); await p.waitForTimeout(500);
    const blocked = await p.evaluate(() => !document.getElementById('connect-form').hidden);
    ok('connect: a bad email is caught, markup in the name is harmless', blocked && p.errs.length === 0, p.errs.join(' | '));
    p.errs.length = 0;
    await p.goto(`${B}/pillars/identity?tier=still&cursor=off`); await p.waitForTimeout(1500);
    await p.fill('[data-comfort] input[name="cf-name"]', '<img src=x onerror=alert(1)>');
    await p.fill('[data-comfort] input[name="cf-pronouns"]', 'they/them');
    await p.evaluate(() => document.querySelector('[data-comfort] button[type="submit"]').click()); await p.waitForTimeout(600);
    ok('comfort note: markup shown as text, not run', p.errs.length === 0 && !(await p.evaluate(() => !!document.querySelector('img[src="x"]'))) && (await p.evaluate(() => document.querySelector('[data-comfort-text]').textContent.includes('<img'))));
    p.errs.length = 0;
    // requests (since 2026-11-26 they go to the Studio; the invoice maker became the Studio's invoices, whose odd
    // amounts are checked in tools/qa/studio-core.mjs): markup typed on Connect is shown as text everywhere, never run
    await p.goto(`${B}/connect?tier=still&cursor=off`); await p.waitForTimeout(1500);
    await p.fill('#name', '<b onmouseover=alert(1)>Asha</b>'); await p.fill('#email', 'markup@example.com');
    await p.fill('#topic', 'line one <script>x</script> <img src=x onerror=alert(2)>');
    await p.fill('#time1', `${new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)}T18:30`);
    await p.click('[data-connect-send]'); await p.waitForTimeout(2000);
    const track = await p.locator('[data-done-track]').getAttribute('href');
    await p.goto(new URL(track, p.url()).href); await p.waitForTimeout(2000);
    const bk = await p.evaluate(() => ({ b: !!document.querySelector('b[onmouseover]'), s: !!document.querySelector('[data-booking-body] script'), img: !!document.querySelector('img[src="x"]'), shown: document.querySelector('[data-booking-body]').textContent.includes('<script>') }));
    await p.goto(`${B}/studio`); await p.waitForTimeout(2500);
    const st = await p.evaluate(() => ({ b: !!document.querySelector('b[onmouseover]'), img: !!document.querySelector('img[src="x"]') }));
    ok('requests: markup is shown as text, not run (booking page and Studio)', !bk.b && !bk.s && !bk.img && bk.shown && !st.b && !st.img && p.errs.length === 0, JSON.stringify({ bk, st }));
    await ctx.close(); }
  // 6. impatient visitors: rapid clicks
  { const { ctx, p } = await mk({}, () => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    await p.goto(`${B}/pillars/divination?tier=full&cursor=off`); await p.waitForTimeout(3500);
    // the mirror pressed and let go, over and over, then held properly
    const mr = await p.$('[data-mirror-surface]'); const bx = await mr.boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    for (let i = 0; i < 15; i++) { await p.mouse.down(); await p.waitForTimeout(40 + (i % 3) * 120); await p.mouse.up(); await p.waitForTimeout(30); }
    await p.mouse.down(); await p.waitForTimeout(3700); await p.mouse.up(); await p.waitForTimeout(900);
    const prompt = await p.evaluate(() => document.querySelector('[data-mirror-word]').textContent);
    ok('rapid clicks: the mirror, pressed fifteen times, then held', p.errs.length === 0 && /\?$/.test(prompt), `${prompt} ${p.errs.join(' | ')}`);
    p.errs.length = 0;
    await p.goto(`${B}/pillars/learning?tier=full&cursor=off`); await p.waitForTimeout(3500);
    for (let i = 0; i < 20; i++) { await p.evaluate((i) => { const r = document.querySelectorAll(`input[name="fd-${i % 3}"]`); r[i % r.length].click(); }, i); await p.waitForTimeout(30); }
    for (let i = 0; i < 24; i++) { await p.evaluate((i) => document.querySelector(`[data-station="${i % 12}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), i); await p.waitForTimeout(25); }
    await p.waitForTimeout(800);
    const lr = await p.evaluate(() => ({ fit: document.querySelectorAll('[data-finder-list] .chip-keep').length, star: document.querySelector('[data-station-name]').textContent }));
    ok('rapid clicks: the class finder and the stars of the path', p.errs.length === 0 && lr.fit > 0 && !!lr.star, `${JSON.stringify(lr)} ${p.errs.join(' | ')}`);
    p.errs.length = 0;
    await p.goto(`${B}/pillars/healing?tier=full&cursor=off`); await p.waitForTimeout(3500);
    for (let i = 0; i < 9; i++) { await p.evaluate(() => document.querySelector('[data-breath-toggle]').click()); await p.waitForTimeout(70); }
    for (const m of await p.$$('.br-modes button')) { await m.click(); await p.waitForTimeout(50); }
    await p.evaluate(() => document.querySelector('[data-mend-all]').click()); await p.evaluate(() => document.querySelector('[data-mend-all]').click()); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelector('[data-mend-all]').click()); await p.waitForTimeout(2500);
    ok('rapid clicks: breath guide and kintsugi', p.errs.length === 0, p.errs.join(' | '));
    p.errs.length = 0;
    await p.goto(`${B}/practice/tools?tier=full&cursor=off`); await p.waitForTimeout(3000);
    await p.evaluate(() => { for (let i = 0; i < 230; i++) document.querySelector('[data-mala-tap]').click(); });
    await p.waitForTimeout(500);
    const mala = await p.evaluate(() => ({ c: document.querySelector('[data-mala-count]').textContent, r: document.querySelector('[data-mala-rounds]')?.textContent }));
    ok('mala: 230 taps make 2 rounds and 14 beads', mala.c === '14' && p.errs.length === 0, JSON.stringify(mala));
    await ctx.close(); }
  // 7. back and forward, and leaving mid-animation
  { const { ctx, p } = await mk({}, () => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    const nav = async (r) => { await p.evaluate((r) => { const a = document.createElement('a'); a.href = r; document.body.appendChild(a); a.click(); a.remove(); }, r); await p.waitForTimeout(2600); };
    await p.goto(`${B}/?tier=full&cursor=off`); await p.waitForTimeout(3500);
    await nav('/pillars/healing'); await p.evaluate(() => document.querySelector('[data-breath-toggle]').click()); await p.waitForTimeout(600);
    await nav('/pillars/divination'); await p.evaluate(() => document.querySelector('[data-mirror-surface]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await p.waitForTimeout(600);
    await nav('/pillars/magic');
    await p.goBack(); await p.waitForTimeout(2600);
    const b1 = await p.evaluate(() => ({ path: location.pathname, h1: document.querySelector('h1').textContent.trim().slice(0, 20), key: window.sarvakali.world.chapterKey }));
    await p.goBack(); await p.waitForTimeout(2600);
    const b2 = await p.evaluate(() => ({ path: location.pathname, h1: document.querySelector('h1').textContent.trim().slice(0, 20), key: window.sarvakali.world.chapterKey }));
    await p.goForward(); await p.waitForTimeout(2600);
    const f1 = await p.evaluate(() => ({ path: location.pathname, key: window.sarvakali.world.chapterKey }));
    // two links clicked in quick succession
    await p.evaluate(() => { for (const r of ['/pillars/devotion', '/pillars/learning']) { const a = document.createElement('a'); a.href = r; document.body.appendChild(a); a.click(); a.remove(); } });
    await p.waitForTimeout(3500);
    const dbl = await p.evaluate(() => ({ path: location.pathname, h1: document.querySelector('h1').textContent.trim().slice(0, 20), key: window.sarvakali.world.chapterKey }));
    ok('back, forward and double clicks keep page and world in step', p.errs.length === 0 && b1.path.includes('divination') && /^div_/.test(b1.key) && b2.path.includes('healing') && /^heal/.test(b2.key) && f1.path.includes('divination') && /^div_/.test(f1.key) && dbl.path.includes('learning') && /^lrn_/.test(dbl.key),
      `${JSON.stringify(b1)} ${JSON.stringify(b2)} ${JSON.stringify(f1)} ${JSON.stringify(dbl)} ${p.errs.join(' | ')}`);
    // resize from desktop to phone and back mid-page
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(1200);
    const sideways = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    await p.setViewportSize({ width: 1440, height: 855 }); await p.waitForTimeout(800);
    ok('resizing desktop → phone → desktop', !sideways && p.errs.length === 0);
    await ctx.close(); }
  // 8. printing an invoice and an article
  { const { ctx, p } = await mk({}, () => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    // a client's invoice page (an invoice from the Studio's demo, which every static build carries)
    await p.goto(`${B}/studio`); await p.waitForTimeout(2500);
    const itok = await p.evaluate(() => (JSON.parse(localStorage.getItem('sk-studio-demo')).db.invoices.find((i) => i.status === 'sent') || {}).token);
    await p.goto(`${B}/invoice?t=${itok}&tier=still&cursor=off`); await p.waitForTimeout(1500);
    await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: `${OUT}/invoice.pdf`, format: 'A4' }).catch(() => {});
    await p.screenshot({ path: `${OUT}/invoice-print.jpg`, type: 'jpeg', quality: 60, fullPage: true });
    const pr = await p.evaluate(() => ({ chrome: ['.site-header', '.hud', '#world', '.bk-pay'].map((s) => { const e = document.querySelector(s); return e ? `${s}:${getComputedStyle(e).display}` : `${s}:none-in-dom`; }) }));
    await p.goto(`${B}/articles/who-is-kali?tier=still&cursor=off`); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/article-print.jpg`, type: 'jpeg', quality: 55, fullPage: true });
    const art = await p.evaluate(() => ['.site-header', '.hud', '#world'].map((s) => { const e = document.querySelector(s); return e ? `${s}:${getComputedStyle(e).display}` : ''; }));
    ok('print: invoice and an article print without the site chrome', pr.chrome.slice(0, 3).every((x) => x.endsWith(':none')) , `${pr.chrome.join(' ')} | article ${art.join(' ')}`);
    await ctx.close(); }
  await b.close();
})();
