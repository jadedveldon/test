// Load metrics under phone-like conditions: 4x slower CPU, slow 4G. FCP, LCP, CLS, long tasks, bytes, main-thread script time
const { chromium } = require('playwright');
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const PAGES = (process.env.PAGES || '/,/pillars/devotion,/pillars/magic,/pillars/healing,/pillars/identity,/pillars/divination,/pillars/learning,/practice,/connect').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  console.log('page'.padEnd(22), 'FCP', '  LCP', '  CLS ', ' longTasks(ms)', ' script(ms)', ' KB');
  for (const path of PAGES) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {}
      window.__v = { lcp: 0, cls: 0, long: 0, fcp: 0 };
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__v.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__v.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__v.long += Math.max(0, e.duration - 50); })).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === 'first-contentful-paint') window.__v.fcp = e.startTime; })).observe({ type: 'paint', buffered: true });
    });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Performance.enable');
    let bytes = 0;
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
    await p.goto(`${B}${path}?cursor=off${process.env.TIER ? "&tier=" + process.env.TIER : ""}`, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(6000);
    const v = await p.evaluate(() => window.__v);
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    console.log(path.padEnd(22), String(Math.round(v.fcp)).padStart(4), String(Math.round(v.lcp)).padStart(5), v.cls.toFixed(3).padStart(6), String(Math.round(v.long)).padStart(10), String(Math.round(m.ScriptDuration * 1000)).padStart(10), String(Math.round(bytes / 1024)).padStart(6), await p.evaluate(() => document.documentElement.dataset.tier));
    await ctx.close();
  }
  await b.close();
})();
