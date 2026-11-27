// Layout at many screen sizes, with text enlarged to 200%, and with WCAG text-spacing overrides:
// sideways scroll, clipped text, overlaps with the fixed header; screenshots for a visual pass.
const { chromium } = require('playwright');
const OUT = require('path').join(process.env.QA_OUT || 'qa-output', 'layout');
require('fs').mkdirSync(OUT, { recursive: true });
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const SIZES = (process.env.SIZES || '320x568,360x740,768x1024,1024x768,844x390,1920x1080,2560x1440').split(',').map((s) => s.split('x').map(Number));
const PAGES = (process.env.PAGES || '/,/pillars/devotion,/pillars/magic,/pillars/healing,/pillars/identity,/pillars/divination,/pillars/learning,/practice,/practice/with/kali,/practice/with/grief,/practice/tools,/practice/library,/practice/monday,/practice/mantras/karpura-gauram,/practice/mantras/modeh-ani,/connect,/invoice,/booking,/me,/terms,/studio,/404,/articles,/path,/articles/who-is-kali').split(',');
const MODES = (process.env.MODES || 'plain,text200,spacing').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const mode of MODES) {
    for (const [w, h] of (mode === 'plain' ? SIZES : [[390, 844], [1280, 800]])) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 && w !== 844, serviceWorkers: 'block' });
      await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
      for (const path of PAGES) {
        const p = await ctx.newPage();
        const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
        await p.goto(`${B}${path}${path.includes('?') ? '&' : '?'}tier=calm&cursor=off`, { waitUntil: 'domcontentloaded' });
        if (mode === 'text200') await p.addStyleTag({ content: 'html { font-size: 200% !important; }' });
        if (mode === 'spacing') await p.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
        await p.waitForTimeout(1600);
        const r = await p.evaluate(() => {
          const de = document.documentElement;
          const sideways = de.scrollWidth > de.clientWidth + 1;
          const wide = sideways ? Array.from(document.querySelectorAll('#main *')).filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > de.clientWidth + 2 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}(${Math.round(e.getBoundingClientRect().right)})`) : [];
          const clipped = Array.from(document.querySelectorAll('#main h1, #main h2, #main h3, #main p, #main li, #main a, #main button, #main label, #main span')).filter((e) => {
            if (!e.getClientRects().length || e.closest('[hidden],[aria-hidden="true"],.sr-only,.anchor-alias')) return false;
            const cs = getComputedStyle(e);
            const clipX = (cs.overflowX === 'hidden' || cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2;
            const clipY = (cs.overflowY === 'hidden' || cs.overflow === 'hidden') && e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0;
            return clipX || clipY;
          }).slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${e.textContent.trim().slice(0, 18)}"`);
          const hdr = document.querySelector('.site-header'); const hb = hdr ? hdr.getBoundingClientRect().bottom : 0;
          const h1 = document.querySelector('h1'); const h1b = h1 ? h1.getBoundingClientRect() : null;
          const under = h1b && h1b.top < hb - 4 && h1b.bottom > 0 ? `h1 under header (${Math.round(h1b.top)}<${Math.round(hb)})` : '';
          return { sideways, wide, clipped, under };
        });
        const issues = [];
        if (r.sideways) issues.push('SIDEWAYS ' + r.wide.join(', '));
        if (r.clipped.length) issues.push('CLIPPED ' + r.clipped.join('; '));
        if (r.under) issues.push(r.under.toUpperCase());
        if (errs.length) issues.push('ERR ' + errs.join(' | '));
        if (issues.length) console.log(`${mode.padEnd(8)} ${w}x${h} ${path.padEnd(28)} ${issues.join(' / ')}`);
        if (mode === 'plain' || path === '/' || path.includes('identity') || path.includes('learning')) await p.screenshot({ path: `${OUT}/${mode}-${w}x${h}-${path.replace(/[/?=]/g, '_')}.jpg`, type: 'jpeg', quality: 50 });
        await p.close();
      }
      await ctx.close();
      console.log(`done ${mode} ${w}x${h}`);
    }
  }
  await b.close();
})();
