// The diya's shared count of the day, against a site with its host (npm run dev, or the live site):
// two visitors light lamps and both see one count for the day, each with their own share of it; the count
// survives a reload; a page from another site cannot add to it.
// Run: QA_BASE=http://127.0.0.1:4321 node tools/qa/diya.cjs   (with `npm run dev -- --port 4321`)
const { chromium } = require('playwright');
const B = process.env.QA_BASE || 'http://127.0.0.1:4321';
let fails = 0;
const ok = (n, v, extra = '') => { if (!v) fails++; console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`); };
(async () => {
  const start = await (await fetch(`${B}/api/diya`)).json();
  ok('diya: the day\'s count can be read', typeof start.n === 'number' && /^\d{4}-\d\d-\d\d$/.test(start.day), JSON.stringify(start));
  const b = await chromium.launch();
  const visitor = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
    await p.goto(`${B}/?tier=calm&cursor=off`); await p.waitForTimeout(3000);
    await p.evaluate(() => document.querySelector('[data-diya]').scrollIntoView()); await p.waitForTimeout(800);
    return { ctx, p };
  };
  const line = (p) => p.evaluate(() => document.querySelector('[data-diya-count]').textContent.trim());
  const a = await visitor();
  await a.p.click('[data-diya-light]'); await a.p.waitForTimeout(1500);
  await a.p.click('[data-diya-light]'); await a.p.waitForTimeout(1500);
  const la = await line(a.p);
  ok('diya: a visitor sees the shared count, and their own share', /lit today/.test(la) && /of them yours/.test(la), la);
  const c = await visitor();
  await c.p.click('[data-diya-light]'); await c.p.waitForTimeout(1500);
  const lc = await line(c.p);
  const after = await (await fetch(`${B}/api/diya`)).json();
  ok('diya: a second visitor\'s lamp joins the same count', after.n >= start.n + 3, `${start.n} → ${after.n}`);
  ok('diya: the second visitor sees their own one', /One of them yours/.test(lc), lc);
  await a.p.reload(); await a.p.waitForTimeout(3000);
  const again = await line(a.p);
  ok('diya: the count and your share are still there after a reload', new RegExp(`${after.n.toLocaleString('en-IN')} lamps`).test(again) && /2 of them yours/.test(again), again);
  const cross = await fetch(`${B}/api/diya`, { method: 'POST', headers: { origin: 'https://another.example', 'content-type': 'application/json' }, body: '{}' });
  ok('diya: a page on another site cannot add lamps', cross.status === 403, String(cross.status));
  ok('diya: no errors', !a.p.errs.length && !c.p.errs.length, [...a.p.errs, ...c.p.errs].join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall ok');
  process.exit(fails ? 1 : 0);
})();
