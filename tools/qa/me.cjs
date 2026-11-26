// Visitor accounts, in a browser: practise without an account (old records become events), sign in by the link,
// a second device gets the same record, the journal stays locked until the right passphrase opens it, practice on
// both devices converges, a client sees their own sessions in My space, then download, sign out everywhere and
// delete. Runs against the dev server (the real /api/me, a file store; with no email set up the link is shown on
// screen) or, with QA_ME=demo, the preview bundle served on port 8099 (the demo in the browser).
// Run: node tools/qa/me.cjs            (every line must read "ok", ERRORS must read "none")
const { chromium } = require('playwright');
const DEMO = process.env.QA_ME === 'demo';
const B = process.env.QA_BASE || (DEMO ? 'http://127.0.0.1:8099/site' : 'http://127.0.0.1:4400');
const page = (p) => (DEMO ? `${B}/${p.replace(/^\//, '').replace(/\//g, '-') || 'index'}.html` : `${B}${p}`);
let fails = 0;
const ok = (n, v, extra = '') => { if (!v) fails++; console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`); };
// the demo's made-up client; on the dev server a fresh address each run, made a client below
const EMAIL = DEMO ? 'asha.rao@example.com' : `qa-me-${Date.now()}@example.com`;
const PASS = 'river under the moon';

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  const device = async () => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Kolkata', acceptDownloads: true });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { if (!/serviceWorker' property/.test(e.message)) errs.push(`${p.url()}: ${e.message.slice(0, 200)}`); });
    // the browser logs the refusals this check asks for on purpose: 400 (no consent) and 410 (a made-up link)
    p.on('console', (m) => { if (m.type() === 'error' && !/serviceWorker' property|favicon|status of (400|401|410)/.test(m.text())) errs.push(`console ${m.text().slice(0, 200)}`); });
    p.on('dialog', (d) => d.accept());
    return { ctx, p };
  };
  const go = async (p, path, wait = 2500) => { await p.goto(`${page(path.split('?')[0])}${path.includes('?') ? `?${path.split('?')[1]}&` : '?'}tier=calm&cursor=off`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(wait); };
  const rec = (p) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('sk-events') || 'null'); return s ? { n: s.events.length, unsynced: s.events.filter((e) => !e.s).length, journal: s.events.filter((e) => e.t === 'journal').map((e) => e.text ?? null), days: s.events.filter((e) => e.day).length } : null; });
  const signIn = async (p) => {
    await go(p, '/me');
    if (await p.locator('[data-me-again]').isVisible().catch(() => false)) await p.click('[data-me-again]');
    await p.fill('#me-email', EMAIL);
    await p.check('[data-me-form] input[name=consent]');
    await p.click('[data-me-form] button[type=submit]');
    await p.waitForSelector('[data-me-demo-link]', { timeout: 8000 });
    await p.click('[data-me-demo-link]');
    await p.waitForSelector('[data-me-in]:not([hidden])', { timeout: 8000 });
    await p.waitForTimeout(1800);
  };

  // a first device, with records kept the old way
  const A = await device();
  await A.p.goto(page('/'), { waitUntil: 'domcontentloaded' });
  await A.p.evaluate(() => {
    localStorage.clear();
    const k = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    localStorage.setItem('sk-practice-log', JSON.stringify({ days: { [k(1)]: { rite: 1, japa: 108 }, [k(2)]: { fire: 1 } }, journal: [{ at: new Date().toISOString(), text: 'A line kept before accounts.', kind: 'intention' }], mantras: { aghora: 108 } }));
    localStorage.setItem('sk-my-mantras', JSON.stringify(['aghora']));
  });
  if (!DEMO) await A.p.evaluate(async (email) => {
    const t = new Date(Date.now() + 5 * 864e5).toISOString();
    await fetch('/api/public', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'request', payload: { name: 'Q A Visitor', email, services: [], topic: 'A test of My space', times: [t], tz: 'Asia/Kolkata' } }) });
  }, EMAIL);
  await go(A.p, '/practice', 3000);
  const r0 = await rec(A.p);
  ok('records kept the old way become events, losing nothing', r0 && r0.days === 3 && r0.journal[0] === 'A line kept before accounts.', JSON.stringify(r0));
  ok('the old keys are gone once converted', await A.p.evaluate(() => !localStorage.getItem('sk-practice-log') && !localStorage.getItem('sk-my-mantras')));

  // sign in
  await go(A.p, '/me');
  ok('signed out, My space offers the sign-in', await A.p.locator('[data-me-out]').isVisible());
  await A.p.fill('#me-email', EMAIL);
  await A.p.click('[data-me-form] button[type=submit]'); await A.p.waitForTimeout(500);
  ok('no account without a clear yes', /tick the box/i.test(await A.p.textContent('[data-me-error]')));
  await signIn(A.p);
  const r1 = await rec(A.p);
  ok('signed in: everything but the journal is shared', r1.unsynced === 1, JSON.stringify(r1));
  ok('the header knows', (await A.p.getAttribute('[data-me-link]', 'class')).includes('is-in'));
  ok('a client sees their own conversation', /A test of My space|follow-up|big decision/.test(await A.p.textContent('[data-me-client]')));
  await A.p.fill('#me-pass', PASS); await A.p.fill('#me-pass2', PASS); await A.p.click('[data-me-jset] button'); await A.p.waitForTimeout(2500);
  ok('with a passphrase, the journal is shared too', (await rec(A.p)).unsynced === 0);

  // a second device
  const Bd = DEMO ? A : await device();
  if (DEMO) await A.p.evaluate(() => { localStorage.removeItem('sk-events'); localStorage.removeItem('sk-me'); });
  await signIn(Bd.p);
  const r2 = await rec(Bd.p);
  ok('a second device gets the same record', r2.days === 3 && r2.journal.length === 1, JSON.stringify(r2));
  ok('… with the journal still locked', r2.journal[0] === null);
  await Bd.p.fill('#me-pass', 'not the passphrase'); await Bd.p.click('[data-me-junlock] button'); await Bd.p.waitForTimeout(1500);
  ok('a wrong passphrase opens nothing', /not the passphrase/i.test(await Bd.p.textContent('[data-me-error]')) && (await rec(Bd.p)).journal[0] === null);
  await Bd.p.fill('#me-pass', PASS); await Bd.p.click('[data-me-junlock] button'); await Bd.p.waitForTimeout(2500);
  ok('the right one opens it on this device', (await rec(Bd.p)).journal[0] === 'A line kept before accounts.');

  // practice on both converges (on the dev server: two real devices)
  if (!DEMO) {
    await A.p.evaluate(async () => { const s = JSON.parse(localStorage.getItem('sk-events')); s.events.push({ id: `qa-a-${Date.now()}`, at: new Date().toISOString(), day: '2026-01-05', t: 'diya', n: 1 }); localStorage.setItem('sk-events', JSON.stringify(s)); });
    await Bd.p.evaluate(async () => { const s = JSON.parse(localStorage.getItem('sk-events')); s.events.push({ id: `qa-b-${Date.now()}`, at: new Date().toISOString(), day: '2026-01-06', t: 'fire', n: 1 }); localStorage.setItem('sk-events', JSON.stringify(s)); });
    await go(A.p, '/me', 3000); await go(Bd.p, '/me', 3000); await go(A.p, '/me', 3000);
    const [a, bb] = [await rec(A.p), await rec(Bd.p)];
    ok('practice on both devices ends up the same on both', a.days === 5 && bb.days === 5, `${a.days} / ${bb.days}`);
  }

  // the account
  const dl = Bd.p.waitForEvent('download'); await Bd.p.click('[data-me-export]');
  const file = await dl;
  const data = JSON.parse(require('fs').readFileSync(await file.path(), 'utf8'));
  ok('the download holds the record, with the journal still sealed', data.events.length >= 6 && !JSON.stringify(data).includes('A line kept before accounts'));
  await Bd.p.click('[data-me-signout-all]'); await Bd.p.waitForTimeout(1500);
  ok('signing out everywhere signs this device out, keeping its practice', await Bd.p.locator('[data-me-out]').isVisible() && (await rec(Bd.p)).days >= 3);
  if (!DEMO) {
    await go(A.p, '/me', 3000);
    ok('… and the other device too', await A.p.locator('[data-me-out]').isVisible());
  }
  await signIn(Bd.p);
  await Bd.p.click('[data-me-delete]'); await Bd.p.waitForTimeout(1500);
  ok('deleting the account signs out, keeping the practice here', await Bd.p.locator('[data-me-out]').isVisible() && (await rec(Bd.p)).days >= 3);
  await go(Bd.p, '/me?t=AAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  ok('a used or made-up link says so, and leaves the address bar', /used or has run out/.test(await Bd.p.textContent('[data-me-error]')) && !Bd.p.url().includes('t=AAAA'));

  console.log('ERRORS:', errs.length ? [...new Set(errs)] : 'none');
  console.log(fails ? `\n${fails} failed` : '\nall ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
