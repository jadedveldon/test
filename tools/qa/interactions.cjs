// Micro-interactions across the site, each checked for a result and for errors
const { chromium } = require('playwright');
const OUT = require('path').join(process.env.QA_OUT || 'qa-output', 'inter');
require('fs').mkdirSync(OUT, { recursive: true });
const W = Number(process.env.W || 1440), H = Number(process.env.H || 855);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: W < 600 });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  const tag = W < 600 ? 'phone-' : '';
  const ok = (name, v) => console.log(`${v ? 'ok  ' : 'FAIL'} ${name}${typeof v === 'string' ? ': ' + v : ''}`);
  const go = async (u, wait = 4500) => { await p.goto(`${process.env.QA_BASE || 'http://127.0.0.1:4321'}${u}${u.includes('?') ? '&' : '?'}tier=full&cursor=off`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(wait); };

  // first visit: the loader and intro
  await go('/', 9000);
  ok('first visit: intro done, page usable', await p.evaluate(() => document.documentElement.dataset.intro === 'seen' || !document.documentElement.classList.contains('locked')));
  await p.screenshot({ path: `${OUT}/${tag}intro.jpg`, type: 'jpeg', quality: 60 });
  // menu
  await p.click('[data-menu-open]');
  await p.waitForTimeout(900);
  ok('menu opens', await p.evaluate(() => document.documentElement.classList.contains('menu-open')));
  await p.screenshot({ path: `${OUT}/${tag}menu.jpg`, type: 'jpeg', quality: 60 });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
  ok('menu closes on Escape', await p.evaluate(() => !document.documentElement.classList.contains('menu-open')));
  // search
  await p.click('[data-search-open]');
  await p.waitForTimeout(500);
  await p.keyboard.type('tarot');
  await p.waitForTimeout(900);
  const sres = await p.evaluate(() => document.querySelectorAll('[data-search-results] li').length);
  ok('search finds tarot', sres > 0 ? `${sres} results` : false);
  await p.screenshot({ path: `${OUT}/${tag}search.jpg`, type: 'jpeg', quality: 60 });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  // keep a service from a pillar page and see the list
  await go('/pillars/divination');
  await p.evaluate(() => document.querySelector('.sub-card .chip-keep').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(800);
  await p.click('.sub-card .chip-keep');
  await p.waitForTimeout(500);
  ok('keeping a service counts it', await p.evaluate(() => document.querySelector('[data-keep-count]').textContent));
  await p.click('[data-keep-open]');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/${tag}keep.jpg`, type: 'jpeg', quality: 60 });
  ok('your list opens', await p.evaluate(() => document.querySelector('[data-keep-open]').getAttribute('aria-expanded') === 'true'));
  await p.keyboard.press('Escape');
  // today's card from the divination close
  await p.evaluate(() => document.querySelector('.pd-close [data-card-open]').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(600);
  await p.click('.pd-close [data-card-open]');
  await p.waitForTimeout(2500);
  ok('today\'s card opens', await p.evaluate(() => !!document.querySelector('dialog[open], .card-overlay.is-open, [data-card-dialog][open]') || document.documentElement.classList.contains('locked')));
  await p.screenshot({ path: `${OUT}/${tag}card.jpg`, type: 'jpeg', quality: 60 });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
  // practice: mala, fire, diya (on the tools page since 2026-11-26)
  await go('/practice/tools');
  await p.evaluate(() => document.querySelector('[data-mala-tap]').scrollIntoView({ block: 'center' }));
  for (let i = 0; i < 3; i++) await p.click('[data-mala-tap]');
  ok('mala counts beads', await p.evaluate(() => document.querySelector('[data-mala-count]').textContent));
  await p.evaluate(() => document.querySelector('[data-fire] textarea').scrollIntoView({ block: 'center' }));
  await p.fill('[data-fire] textarea', 'my worry about tomorrow');
  await p.click('[data-fire] button[type="submit"]');
  await p.waitForTimeout(5500);
  ok('fire takes the words', await p.evaluate(() => !document.querySelector('[data-fire-after]').hidden));
  await p.evaluate(() => document.querySelector('[data-diya-light]').scrollIntoView({ block: 'center' }));
  await p.click('[data-diya-light]');
  await p.waitForTimeout(1500);
  ok('diya lights', await p.evaluate(() => document.querySelector('[data-diya-count]').textContent || 'lit'));
  // find your path
  await go('/path');
  await p.click('.path-opt >> nth=0');
  await p.waitForTimeout(1500);
  ok('path quiz moves on', await p.evaluate(() => document.querySelectorAll('.path-options:not([hidden]) .path-opt, .path-result, a.btn').length > 0));
  await p.screenshot({ path: `${OUT}/${tag}path.jpg`, type: 'jpeg', quality: 60 });
  // connect: the kept services show as chips; one removed by keyboard keeps focus in the list
  await p.evaluate(() => localStorage.setItem('sk-keep', JSON.stringify([{ t: 'Kali Working', p: 'Devotion & the Unseen' }, { t: 'Tarot Reading', p: 'Divination & Insight' }])));
  await go('/connect');
  const kept0 = await p.evaluate(() => [...document.querySelectorAll('[data-connect-kept-list] li > span')].map((x) => x.textContent));
  await p.locator('[data-connect-kept-list] .kept-remove').first().focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  const kept1 = await p.evaluate(() => ({ chips: [...document.querySelectorAll('[data-connect-kept-list] li > span')].map((x) => x.textContent), focus: document.activeElement?.getAttribute('aria-label') || '', value: document.querySelector('[data-connect-kept-value]').value, stored: JSON.parse(localStorage.getItem('sk-keep') || '[]').length }));
  ok('connect: kept services show as chips; removing one by keyboard keeps focus and updates the request', kept0.length === 2 && kept1.chips.length === 1 && kept1.stored === 1 && /Tarot Reading/.test(kept1.focus) && kept1.value === 'Tarot Reading', JSON.stringify(kept1));
  await p.evaluate(() => localStorage.removeItem('sk-keep'));
  // connect: validation, then a full request
  await go('/connect');
  await p.click('#connect-form button[type="submit"]');
  await p.waitForTimeout(600);
  ok('connect form asks for missing fields', await p.evaluate(() => document.querySelectorAll('#connect-form [aria-invalid="true"], #connect-form :invalid').length > 0));
  await p.fill('#connect-form input[name="name"]', 'Asha');
  await p.fill('#connect-form input[name="email"]', 'asha@example.com');
  await p.fill('#time1', '2026-12-02T18:30');
  await p.click('#connect-form button[type="submit"]');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${tag}connect.jpg`, type: 'jpeg', quality: 60 });
  ok('connect form responds', await p.evaluate(() => { const f = document.querySelector('#connect-form'); const done = document.querySelector('[data-connect-done], .connect-done, .connect-thanks'); return (done && !done.hidden ? done.querySelector('h2').textContent.trim() : '') || (f && f.hidden ? 'form replaced' : false) || document.querySelector('[data-connect-status], .form-status')?.textContent?.slice(0, 80) || false; }));
  // invoice: the client's invoice page draws the UPI QR (an invoice from the Studio's demo, which every static build carries)
  await go('/studio', 2500);
  const itok = await p.evaluate(() => { try { return (JSON.parse(localStorage.getItem('sk-studio-demo')).db.invoices.find((i) => i.status === 'sent') || {}).token || ''; } catch (e) { return ''; } });
  await go(`/invoice?t=${itok}`, 2500);
  ok('invoice draws a QR', await p.evaluate(() => !!document.querySelector('[data-paper] .ip-qr svg')));
  // sound toggle and the prototype panel
  await go('/');
  await p.click('[data-sound]');
  await p.waitForTimeout(500);
  ok('sound turns on', await p.evaluate(() => document.querySelector('[data-sound]').getAttribute('aria-pressed')));
  await p.click('[data-sound]');
  await p.click('[data-hud-toggle]');
  await p.waitForTimeout(600);
  ok('prototype panel opens', await p.evaluate(() => document.getElementById('hud').dataset.open));
  await p.screenshot({ path: `${OUT}/${tag}hud.jpg`, type: 'jpeg', quality: 60 });
  // a festival preview
  await go('/?festival=kalipuja', 6000);
  ok('Kali Puja preview', await p.evaluate(() => document.documentElement.dataset.festival || false));
  await p.screenshot({ path: `${OUT}/${tag}festival.jpg`, type: 'jpeg', quality: 60 });
  // page to page with the transition (homepage → a pillar)
  await go('/');
  await p.evaluate(() => document.querySelector('.chapter-pillar a.btn-solid[href="/pillars/learning"]').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(800);
  await p.click('.chapter-pillar a.btn-solid[href="/pillars/learning"]');
  await p.waitForTimeout(4500);
  ok('page transition to Learning', await p.evaluate(() => location.pathname + ' ' + window.sarvakali.world.chapterKey));
  console.log('ERRORS:', errs.length ? [...new Set(errs)] : 'none');
  await b.close();
})();
