// The whole loop, in a browser, as a visitor and as Sarvakali: keep services, ask about them, send the request
// (the list empties), follow it on the booking page; in the Studio confirm a time, offer a new one, which the
// client accepts; make, send and track an invoice the client says they have paid, then mark it paid; every email
// in the outbox. Runs against the dev server (the real API, a file store; password "studio") or, with
// QA_STUDIO=demo, the preview bundle served on port 8099 (the demo in the browser).
// Run: node tools/qa/studio.cjs            (every line must read "ok", ERRORS must read "none")
const { chromium } = require('playwright');
const DEMO = process.env.QA_STUDIO === 'demo';
const B = process.env.QA_BASE || (DEMO ? 'http://127.0.0.1:8099/site' : 'http://127.0.0.1:4400');
const X = DEMO ? '.html' : '';
// only the dev server refuses an email's picture to the frame it is shown in (a 403); the live site and the preview serve it
const DEV403 = !DEMO;
const page = (p) => `${B}/${DEMO ? p.replace(/^\//, '').replace(/\//g, '-') || 'index' : p.replace(/^\//, '')}${X}`;
let fails = 0;
const RUN = `Testing the loop ${Date.now()}`;
const ok = (n, v, extra = '') => { if (!v) fails++; console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`); };

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', timezoneId: 'Europe/London' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = [];
  // known false alarms (tools/qa/README.md): the checks block service workers, which injects a script into every frame, and
  // the sandboxed frame an email is shown in may not touch them; the dev server refuses the email's picture to that frame
  const harmless = /serviceWorker' property from 'Navigator'.*sandboxed/;
  p.on('pageerror', (e) => { if (!harmless.test(e.message)) errs.push(e.message.slice(0, 160)); });
  p.on('response', (r) => { if (r.status() >= 400 && process.env.QA_DEBUG) console.log('  (response', r.status(), r.url().replace(B, ''), ')'); });
  // known false alarm (tools/qa/README.md): blocking service workers, as the checks do, injects a script into every
  // frame, and the sandboxed frame an email is shown in may not touch them
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource.*(404|401)/.test(m.text()) && !harmless.test(m.text()) && !(DEV403 && /status of 403/.test(m.text()))) errs.push(m.text().slice(0, 160)); });
  const state = () => p.evaluate(async (demo) => {
    if (demo) return JSON.parse(localStorage.getItem('sk-studio-demo')).db;
    const r = await fetch('/api/studio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'state' }) });
    return r.json();
  }, DEMO);
  const go = async (u) => { await p.goto(u, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1800); };
  const studio = async (hash) => {
    if (!p.url().includes('/studio')) { await go(page('/studio')); }
    if (await p.locator('#pw').count()) { await p.fill('#pw', 'studio'); await p.click('button[type=submit]'); await p.waitForTimeout(2500); }
    await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForTimeout(1200);
  };
  // do something in the Studio, then read the message it gives (a new one, not one still showing from before)
  const act = async (fn) => {
    const before = await p.$$eval('.st-toast', (els) => els.map((e) => e.textContent));
    await fn();
    return p.waitForFunction((b) => [...document.querySelectorAll('.st-toast')].map((e) => e.textContent).find((x) => !b.includes(x)) || null, before, { timeout: 10000 }).then((h) => h.jsonValue()).catch(() => '(no message)');
  };

  // 1. keep two services on a pillar page; the tray takes you to Connect
  await go(page('/pillars/healing') + '?tier=still&cursor=off');
  const keeps = p.locator('[data-keep]');
  await keeps.nth(0).click(); await keeps.nth(1).click();
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('sk-keep') || '[]').map((k) => k.t));
  ok('tray: two services kept', kept.length === 2, kept.join(', '));
  await p.click('[data-keep-open]'); await p.waitForTimeout(400);
  ok('tray: lists them', (await p.locator('[data-keep-items] li').count()) === 2);
  await p.click('[data-keep-ask]'); await p.waitForTimeout(2500);
  ok('tray: "Ask about these" opens Connect with them as chips', /connect/.test(p.url()) && (await p.locator('[data-connect-kept-list] li').count()) === 2, p.url());

  // 2. send the request
  const day = (n) => { const d = new Date(Date.now() + n * 86400000); return d.toISOString().slice(0, 10); };
  await p.fill('#name', 'Loop Tester'); await p.fill('#email', `loop.${Date.now()}@example.com`); await p.fill('#topic', RUN);
  await p.fill('#time1', `${day(3)}T18:30`); await p.fill('#time2', `${day(4)}T10:00`);
  ok('connect: the time zone is named', /London/.test(await p.locator('[data-tz-hint]').textContent()));
  await p.click('[data-connect-send]'); await p.waitForTimeout(2500);
  ok('connect: the confirmation shows', await p.locator('#connect-done').isVisible(), await p.locator('[data-connect-error]').isVisible() ? await p.locator('[data-connect-error]').textContent() : '');
  ok('connect: with the times offered and what was asked', (await p.locator('[data-done-times] li').count()) === 2 && (await p.locator('[data-done-asked] li').count()) === 3);
  ok('connect: the list went with it and is now empty', (await p.evaluate(() => JSON.parse(localStorage.getItem('sk-keep') || '[]').length)) === 0 && await p.locator('[data-done-cleared]').isVisible());
  const track = await p.locator('[data-done-track]').getAttribute('href');
  ok('connect: a link to follow it', /booking(\.html)?\?t=/.test(track), track);
  await go(new URL(track, p.url()).href);
  ok('booking page: waiting for Sarvakali', /Waiting for Sarvakali/.test(await p.locator('[data-booking-body]').textContent()));
  const bookingUrl = p.url();

  // 3. in the Studio: the request is there; confirm the first time
  await studio('#/');
  const s1 = await state();
  const req = s1.bookings.find((x) => x.topic === RUN);
  ok('studio: the request arrived, with both times and the services', req && req.options.length === 2 && req.services.length === 2 && req.status === 'requested');
  ok('studio: emails to the client and to you', s1.outbox.filter((m) => m.bookingId === req.id).map((m) => m.kind).sort().join() === 'client.received,owner.newRequest');
  await studio(`#/requests/${req.id}`);
  const t1 = await act(() => p.locator('.st-slots button', { hasText: 'Confirm this time' }).first().click());
  ok('studio: confirmed', /Confirmed/.test(t1), t1);
  await go(bookingUrl);
  ok('booking page: confirmed, with a calendar file', /See you then/.test(await p.locator('[data-booking-body]').textContent()) && await p.locator('[data-ics]').isVisible());

  // 4. Sarvakali needs to move it: offers a new time; the client accepts it
  await studio(`#/requests/${req.id}`);
  await p.locator('button', { hasText: 'Offer a new time' }).click(); await p.waitForTimeout(400);
  await p.locator('.st-modal input[type=datetime-local]').first().fill(`${day(5)}T17:00`);
  const t2 = await act(() => p.locator('.st-modal button', { hasText: 'Send the times' }).click());
  ok('studio: new time offered', /Times sent/.test(t2), t2);
  await go(bookingUrl);
  ok('booking page: asks the client to choose', /Choose a time/.test(await p.locator('[data-booking-body]').textContent()));
  await p.locator('[data-accept]').first().click(); await p.waitForTimeout(1500);
  ok('booking page: accepted, confirmed', /See you then/.test(await p.locator('[data-booking-body]').textContent()));
  const s2 = await state();
  const b2 = s2.bookings.find((x) => x.id === req.id);
  ok('studio: confirmed at the new time, you were told', b2.status === 'confirmed' && b2.start.startsWith(day(5)) && s2.outbox.some((m) => m.kind === 'owner.clientAccepted' && m.bookingId === req.id));

  // 5. an invoice: made from the client's page, an amount, sent
  await studio(`#/clients/${req.clientId}`);
  await p.locator('button', { hasText: 'New invoice' }).click(); await p.waitForTimeout(2500);
  ok('invoice: a draft opens, lines from the services', /\/invoices\//.test(p.url()) && (await p.locator('.st-line:not(.st-line-head)').count()) === 2);
  const rates = p.locator('.st-line:not(.st-line-head) input[aria-label$="rate in rupees"]');
  await rates.nth(0).fill('1500'); await rates.nth(1).fill('1000');
  await act(() => p.locator('button', { hasText: 'Save the changes' }).click());
  ok('invoice: the preview shows the total', /₹2,500/.test(await p.locator('.st-invoice-preview').textContent()));
  await p.locator('.st-page-head button', { hasText: /^Send to/ }).click(); await p.waitForTimeout(300);
  const t3 = await act(() => p.locator('.st-modal button', { hasText: 'Send it' }).click());
  ok('invoice: sent', /Sent to/.test(t3), t3);
  const s3 = await state();
  const inv = s3.invoices.find((i) => i.clientId === req.clientId);
  ok('invoice: emailed with its link', inv.status === 'sent' && s3.outbox.some((m) => m.kind === 'client.invoice' && m.invoiceId === inv.id));

  // 6. the client's invoice page: pay, and say so
  await go(`${page('/invoice')}?t=${inv.token}`);
  ok('invoice page: the invoice and the amount', /₹2,500/.test(await p.locator('[data-paper]').textContent()) && /₹2,500/.test(await p.locator('[data-pay]').textContent()));
  ok('invoice page: a UPI QR code', (await p.locator('[data-paper] .ip-qr svg').count()) === 1);
  await p.fill('[data-claim] input[name=reference]', '987654321098');
  await p.click('[data-claim] button'); await p.waitForTimeout(1500);
  ok('invoice page: thanked, Sarvakali told', /will check the payment/.test(await p.locator('[data-pay]').textContent()));

  // 7. Sarvakali checks and marks it paid; the client's page says so
  await studio(`#/invoices/${inv.id}`);
  ok('studio: the claim shows, with the reference', /987654321098/.test(await p.locator('.st-callout').textContent()));
  const t4 = await act(() => p.locator('button', { hasText: 'Yes, it arrived' }).click());
  ok('studio: marked paid', /paid/i.test(t4), t4);
  await go(`${page('/invoice')}?t=${inv.token}`);
  ok('invoice page: paid', /Paid in full/.test(await p.locator('[data-pay]').textContent()));

  // 8. every step left its email
  const s4 = await state();
  const kinds = s4.outbox.filter((m) => m.clientId === req.clientId).map((m) => m.kind);
  ok('outbox: every email of the loop', ['client.received', 'owner.newRequest', 'client.confirmed', 'client.proposed', 'owner.clientAccepted', 'client.invoice', 'owner.clientPaid', 'client.receipt'].every((k) => kinds.includes(k)), [...new Set(kinds)].join(', '));
  await studio(`#/outbox/${s4.outbox.find((m) => m.kind === 'client.confirmed' && m.clientId === req.clientId).id}`);
  await p.waitForTimeout(800);
  ok('outbox: an email opens to read', (await p.locator('iframe.st-mail').count()) === 1);

  // 9. the Studio on a phone: every page opens without sideways scrolling
  // (it carries over the sign-in from above: the Studio allows only a few sign-ins from one address in fifteen minutes)
  const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const q = await ph.newPage();
  q.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await q.goto(page('/studio')); await q.waitForTimeout(1500);
  const wide = [];
  for (const h of ['#/', '#/requests', `#/requests/${req.id}`, '#/sessions', `#/clients/${req.clientId}`, '#/clients', '#/invoices?filter=all', `#/invoices/${inv.id}`, '#/articles', '#/outbox', '#/settings']) {
    await q.evaluate((x) => { location.hash = x; }, h); await q.waitForTimeout(700);
    const sw = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (sw > 1) wide.push(`${h} +${sw}px`);
  }
  ok('studio on a phone: no page scrolls sideways', !wide.length, wide.join(' · '));
  await ph.close();

  console.log('ERRORS:', errs.length ? [...new Set(errs)] : 'none');
  await b.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
