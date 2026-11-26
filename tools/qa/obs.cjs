// Observability, in a browser: visits, campaign tags and goals are counted; an error is caught with the trail of
// steps before it; private links (tokens), emails and phone numbers never reach what is kept; robots are left out;
// every host answer carries a reference that leads back to its log lines; the trail at the top of inner pages is
// right (and given to search engines); and every tab of the Studio's Insights opens without an error.
// Runs against the dev server (the real /api/t and logs, a file store; Studio password "studio") or, with
// QA_OBS=demo, the preview bundle served on port 8099 (counting kept in the browser).
// Pages are left by the site's own links, as visitors move: a test browser sent to a new address by the harness
// drops the beacon a closing page sends (real browsers deliver it). See tools/qa/README.md.
// Run: node tools/qa/obs.cjs            (every line must read "ok", ERRORS must read "none")
const { chromium } = require('playwright');
const DEMO = process.env.QA_OBS === 'demo';
const B = process.env.QA_BASE || (DEMO ? 'http://127.0.0.1:8099/site' : 'http://127.0.0.1:4400');
const page = (p) => (DEMO ? `${B}/${p.replace(/^\//, '').replace(/\//g, '-') || 'index'}.html` : `${B}${p}`);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
let fails = 0;
const ok = (n, v, extra = '') => { if (!v) fails++; console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`); };
const RUN = `qa${Date.now().toString(36)}`;

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', userAgent: UA, timezoneId: 'Asia/Kolkata' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { if (!/QA error/.test(e.message)) errs.push(e.message.slice(0, 160)); });
  p.on('console', (m) => { if (m.type() === 'error' && !/serviceWorker|QA error|status of (400|401|404)/.test(m.text())) errs.push(`console ${m.text().slice(0, 160)}`); });

  // a visit: in from a search engine with campaign tags and a private token in the address, a practice begun, an
  // error with an email in it, then on by the site's own links
  await p.goto(`${page('/practice/with/kali')}?utm_source=${RUN}&utm_campaign=check&t=SECRETtokenSECRETtoken1234&tier=calm&cursor=off`, { referer: 'https://www.google.com/search?q=kali' });
  await p.waitForTimeout(2500);
  await p.click('[data-session-begin]'); await p.waitForTimeout(300);
  await p.evaluate(() => setTimeout(() => { throw new Error('QA error for someone@example.com, +91 98450 01234'); }, 5));
  await p.waitForTimeout(800);
  await p.locator('[data-crumbs] a').nth(1).click(); // Home › Daily practice
  await p.waitForTimeout(2500);
  await p.locator('a[href$="connect"], a[href$="connect.html"]').first().click();
  await p.waitForTimeout(2000);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(2500);

  // the trail at the top of an inner page
  await p.goto(`${page('/practice/mantras/gayatri')}?tier=calm&cursor=off`); await p.waitForTimeout(1500);
  const crumbs = await p.evaluate(() => ({ items: [...document.querySelectorAll('[data-crumbs] li')].map((li) => li.textContent.trim()), current: document.querySelector('[data-crumbs] [aria-current="page"]')?.textContent, ld: JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent || '{}') }));
  ok('inner pages show where they sit, the page itself marked current', crumbs.items.length === 4 && crumbs.items[0] === 'Home' && crumbs.current === crumbs.items[3], crumbs.items.join(' › '));
  ok('… and give the same trail to search engines', crumbs.ld['@type'] === 'BreadcrumbList' && crumbs.ld.itemListElement?.length === 4);
  ok('the homepage has no trail', await (async () => { await p.goto(`${page('/')}?tier=calm`); await p.waitForTimeout(800); return (await p.locator('[data-crumbs]').count()) === 0; })());

  // what was kept: this visit's events, found by the day's visitor hash of the page that carried the campaign tag
  let batches = [];
  if (DEMO) {
    const m = JSON.parse((await p.evaluate(() => localStorage.getItem('sk-obs-demo-2'))) || '{}');
    batches = Object.entries(m).filter(([k]) => k.startsWith('ev/')).map(([, v]) => v);
  } else {
    const fs = require('fs'), path = require('path');
    const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
    batches = walk(path.join(process.cwd(), '.studio-data', 'obs', 'ev')).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  }
  const all = batches.flat();
  const vh = all.find((e) => e.u?.s === RUN)?.vh;
  const mine = all.filter((e) => e.vh === vh);
  const raw = JSON.stringify(mine);
  ok('the visit was counted, with its campaign and the practice begun', !!vh && mine.some((e) => e.k === 'view' && e.p === (DEMO ? '/practice-with-kali' : '/practice/with/kali')) && mine.some((e) => e.k === 'goal' && e.n === 'practice-start' && e.d === 'kali'));
  ok('the pages that followed were counted, each with time in view and how far it was read', mine.some((e) => e.k === 'view' && e.p === '/practice') && mine.some((e) => e.k === 'view' && e.p === '/connect') && mine.some((e) => e.k === 'leave' && e.p === '/practice' && e.ms > 0));
  ok('the error was caught with the steps before it', mine.some((e) => e.k === 'error' && /QA error/.test(e.m) && e.crumbs?.some((c) => c.c === 'click') && e.crumbs?.some((c) => c.c === 'goal')));
  ok('no private link, email or phone number was kept', !/SECRETtoken|someone@example|98450/.test(raw) && raw.includes('[email]'));

  if (!DEMO) {
    // robots are not visitors
    const bot = await p.request.post(`${B}/api/t`, { headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)', origin: B, 'content-type': 'text/plain' }, data: JSON.stringify({ pv: 'botbotbot', e: [{ k: 'view', p: `/${RUN}-bot` }] }) });
    ok('the counter answers robots without keeping anything', bot.status() === 204);
    // every answer carries a reference, which leads to its log lines
    const res = await p.request.post(`${B}/api/public`, { headers: { origin: B, 'content-type': 'application/json' }, data: { action: 'no-such-action' } });
    const ref = res.headers()['x-request-id'];
    ok('every host answer carries a reference and its timing', /^[a-z0-9]+-[0-9a-f]{4}$/.test(ref ?? '') && /app;dur=/.test(res.headers()['server-timing'] ?? ''));
    await p.goto(`${B}/studio`); await p.waitForTimeout(500);
    const studio = await p.evaluate(async (args) => {
      await fetch('/api/studio/sign-in', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'studio' }) });
      const call = async (action, payload) => (await fetch('/api/studio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, payload }) })).json();
      return { log: await call('insights.log', { ref: args.ref }), ins: await call('insights', { days: 1, force: true }), health: await call('insights.health', {}) };
    }, { ref });
    ok('a reference leads to that request’s log lines', studio.log?.lines?.some((l) => l.route === '/api/public' && l.status === 404));
    if (process.env.QA_DEBUG) console.log(JSON.stringify({ c: studio.ins.total?.campaigns, e: studio.ins.errors?.map((e) => [e.m, e.samples?.[0]?.crumbs?.length]), err: studio.ins.error }));
    ok('Insights reads the visit and the error', JSON.stringify(studio.ins.total?.campaigns ?? {}).includes(RUN) && studio.ins.errors?.some((e) => /QA error/.test(e.m) && e.samples?.[0]?.crumbs?.length));
    ok('robots were left out of the counts', !JSON.stringify(studio.ins).includes(`${RUN}-bot`));
    ok('health answers, with details for Sarvakali', studio.health?.status === 'ok' && studio.health?.checks?.obsStore?.ok === true);
    const pub = await p.request.get(`${B}/api/health`, { headers: { cookie: '' } });
    ok('… and only "ok" and the version for anyone else', pub.status() === 200 && !(await pub.json()).checks);
  }

  // every tab of Insights opens (a full load first: the Studio decides at load whether it is signed in)
  await p.goto(`${DEMO ? `${B}/studio.html` : `${B}/studio`}?fresh=1#/insights`); await p.waitForTimeout(3000);
  const tabs = ['', 'journeys', 'practice', 'speed', 'errors', 'logs', 'health'];
  const opened = [];
  for (const t of tabs) {
    await p.evaluate((h) => { location.hash = h; }, `#/insights${t ? `/${t}` : ''}`); await p.waitForTimeout(1500);
    const hasContent = await p.evaluate(() => !!document.querySelector('.in-page') && !document.querySelector('.st-error') && !/could not be shown/.test(document.body.innerText));
    if (hasContent) opened.push(t || 'overview');
  }
  ok('every tab of Insights opens', opened.length === tabs.length, opened.join(', '));
  await p.evaluate(() => { location.hash = '#/insights/errors'; }); await p.waitForTimeout(2000);
  await p.locator('.in-problem-head', { hasText: 'QA error' }).first().click().catch(() => {});
  await p.waitForTimeout(400);
  ok('a problem opens into its trail', (await p.locator('.in-trail li').count()) >= 2);

  console.log('ERRORS:', errs.length ? [...new Set(errs)] : 'none');
  console.log(fails ? `\n${fails} failed` : '\nall ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
