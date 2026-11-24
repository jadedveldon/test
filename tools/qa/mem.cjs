// Memory and leaks over many client-side page changes: heap, DOM nodes, listeners, rAF rate, live timers
const { chromium } = require('playwright');
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const ROUTE = ['/pillars/devotion', '/pillars/magic', '/pillars/healing', '/pillars/identity', '/pillars/divination', '/pillars/learning', '/practice', '/'];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 855 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {}
    const live = new Set();
    const si = window.setInterval, ci = window.clearInterval;
    window.setInterval = function (...a) { const id = si.apply(this, a); live.add(id); return id; };
    window.clearInterval = function (id) { live.delete(id); return ci.call(this, id); };
    let rafCalls = 0; const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) { rafCalls++; return raf.call(this, cb); };
    window.__probe = () => ({ intervals: live.size, raf: rafCalls });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  const metrics = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    await p.waitForTimeout(300);
    await cdp.send('HeapProfiler.collectGarbage');
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    const a = await p.evaluate(() => window.__probe());
    await p.waitForTimeout(1000);
    const b2 = await p.evaluate(() => window.__probe());
    return { heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners, docs: m.Documents, intervals: b2.intervals, rafPerSec: b2.raf - a.raf };
  };
  await p.goto(`${B}/?tier=full&cursor=off`); await p.waitForTimeout(6000);
  console.log('start      ', JSON.stringify(await metrics()));
  for (let cycle = 1; cycle <= 4; cycle++) {
    for (const r of ROUTE) {
      await p.evaluate((r) => { const a = document.createElement('a'); a.href = r; document.body.appendChild(a); a.click(); a.remove(); }, r);
      await p.waitForTimeout(2200);
      await p.evaluate(() => window.scrollBy(0, innerHeight * 2)); await p.waitForTimeout(500);
    }
    console.log(`cycle ${cycle}    `, JSON.stringify(await metrics()), 'at', await p.evaluate(() => location.pathname));
  }
  console.log('errors:', errs.length ? [...new Set(errs)] : 'none');
  await b.close();
})();
