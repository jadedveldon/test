// Site audit: every page at desktop and phone. Errors, sideways overflow, content still hidden once reached,
// broken internal links, unlabelled controls, small tap targets on phones, images without alt. Screenshots for review.
const { chromium } = require('playwright');
const OUT = require('path').join(process.env.QA_OUT || 'qa-output', 'audit');
require('fs').mkdirSync(OUT, { recursive: true });
const PAGES = ['/', '/about', '/care', '/connect', '/path', '/practice', '/practice/with/kali', '/practice/with/grief', '/practice/tools', '/practice/library', '/practice/monday', '/practice/thursday', '/practice/mantras/modeh-ani', '/practice/mantras/karpura-gauram', '/practice/mantras/bhutanatha', '/articles', '/articles/who-is-kali', '/articles/the-thirty-moons', '/articles/what-happens-in-a-reading', '/invoice', '/booking', '/me', '/terms', '/studio', '/404',
  '/pillars/devotion', '/pillars/magic', '/pillars/healing', '/pillars/identity', '/pillars/divination', '/pillars/learning'];
const VIEWS = (process.env.VIEWS || 'desk,phone').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report = [];
  const links = new Set();
  for (const view of VIEWS) {
    const vp = view === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 855 };
    const ctx = await b.newContext({ viewport: vp, hasTouch: view === 'phone' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
    for (const path of PAGES) {
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
      p.on('console', (m) => { if (m.type() === 'error' && !/favicon|manifest/.test(m.text())) errs.push(m.text().slice(0, 140)); });
      p.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1')) errs.push(`${r.status()} ${r.url().replace((process.env.QA_BASE || 'http://127.0.0.1:4321'), '')}`); });
      await p.goto(`${process.env.QA_BASE || 'http://127.0.0.1:4321'}${path}?tier=full&cursor=off`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4500);
      const name = (path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')) + '-' + view;
      await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 60 });
      // scroll the whole page down and back up
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += vp.height * 0.7) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(110); }
      await p.waitForTimeout(600);
      for (let y = H; y > 0; y -= vp.height * 0.9) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(70); }
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(1200);
      const info = await p.evaluate((phone) => {
        const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const hidden = Array.from(document.querySelectorAll('[data-fade], [data-split], [data-hero]')).filter((e) => vis(e) && parseFloat(getComputedStyle(e).opacity) < 0.5 && !e.closest('[hidden], dialog:not([open])')).map((e) => (e.className || e.tagName).toString().slice(0, 40));
        const sideways = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        const wide = sideways ? Array.from(document.querySelectorAll('body *')).filter((e) => { const r = e.getBoundingClientRect(); return r.right > document.documentElement.clientWidth + 2 && vis(e) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map((e) => (e.className || e.tagName).toString().slice(0, 40)) : [];
        const unlabelled = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')).filter((e) => vis(e) && !e.closest('[aria-hidden="true"]')).filter((e) => {
          const t = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || '').trim();
          const lab = e.id && document.querySelector(`label[for="${e.id}"]`);
          return !t && !lab && !e.closest('label') && e.type !== 'hidden';
        }).map((e) => e.outerHTML.slice(0, 80));
        // a checkbox or radio inside its label is tapped anywhere on the label, so the label is its target (WCAG 2.5.8)
        const small = phone ? Array.from(document.querySelectorAll('button, a[href], [role="button"], input[type="checkbox"], input[type="radio"]')).filter((e) => vis(e) && !e.closest('[aria-hidden="true"], .sub-chips, .pd-index, .hl-index, .mg-index, p, li > a') && !(e.tagName === 'A' && [...(e.parentElement?.childNodes ?? [])].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2))).filter((e) => { const box = (e.tagName === 'INPUT' && e.closest('label')) || e; const r = box.getBoundingClientRect(); return r.height < 30 || r.width < 30; }).slice(0, 8).map((e) => `${(e.textContent || e.getAttribute('aria-label') || e.className).toString().trim().slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`) : [];
        const noAlt = Array.from(document.images).filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(-40));
        const hrefs = Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/') && !h.startsWith('//'));
        return { hidden, sideways, wide, unlabelled, small, noAlt, hrefs, title: document.title, h1: document.querySelectorAll('h1').length };
      }, view === 'phone');
      // parts far off screen are drawn only when near (content-visibility), so a quick pass can leave some of their
      // reveals unplayed; what must never happen is a part that stays hidden once a visitor reaches it: go to each
      // one still hidden and look again
      if (info.hidden.length) {
        const n = await p.evaluate(() => { const els = [...document.querySelectorAll('[data-fade], [data-split], [data-hero]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && parseFloat(getComputedStyle(e).opacity) < 0.5 && !e.closest('[hidden], dialog:not([open])'); }); els.forEach((e, i) => (e.dataset.qaHidden = String(i))); return els.length; });
        const stuck = [];
        for (let i = 0; i < n; i++) {
          await p.evaluate((i) => { const e = document.querySelector(`[data-qa-hidden="${i}"]`); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * 0.5); }, i);
          await p.waitForTimeout(1300);
          const r = await p.evaluate((i) => { const e = document.querySelector(`[data-qa-hidden="${i}"]`); return { o: parseFloat(getComputedStyle(e).opacity), c: String(e.className.baseVal ?? e.className ?? e.tagName).slice(0, 40) }; }, i);
          if (r.o < 0.5) stuck.push(r.c);
        }
        info.hidden = stuck;
      }
      info.hrefs.forEach((h) => links.add(h.split('#')[0].split('?')[0] || '/'));
      report.push({ path, view, errs: [...new Set(errs)], hidden: info.hidden, sideways: info.sideways, wide: info.wide, unlabelled: info.unlabelled, small: info.small, noAlt: info.noAlt, title: info.title, h1: info.h1 });
      await p.close();
    }
    await ctx.close();
  }
  // every internal link answers
  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  const broken = [];
  for (const l of links) { const r = await pg.request.get(`${process.env.QA_BASE || 'http://127.0.0.1:4321'}${l}`); if (r.status() >= 400) broken.push(`${r.status()} ${l}`); }
  for (const r of report) {
    const issues = [];
    if (r.errs.length) issues.push('ERRORS ' + r.errs.join(' | '));
    if (r.hidden.length) issues.push(`HIDDEN ${r.hidden.length}: ${r.hidden.slice(0, 4).join(', ')}`);
    if (r.sideways) issues.push('SIDEWAYS ' + r.wide.join(', '));
    if (r.unlabelled.length) issues.push(`UNLABELLED ${r.unlabelled.length}: ${r.unlabelled.slice(0, 3).join(' || ')}`);
    if (r.small.length) issues.push(`SMALL ${r.small.join('; ')}`);
    if (r.noAlt.length) issues.push(`NO ALT ${r.noAlt.join(', ')}`);
    if (r.h1 !== 1) issues.push(`H1 count ${r.h1}`);
    console.log(`${r.view.padEnd(5)} ${r.path.padEnd(38)} ${issues.length ? issues.join('\n      ') : 'ok'}`);
  }
  console.log('internal links checked:', links.size, '| broken:', broken.length ? broken : 'none');
  await b.close();
})();
