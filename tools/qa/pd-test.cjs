// A pillar page in three directions: openings, signatures, switching, chapters, scrolling both ways. Usage: PILLAR=identity node pd-test.js
const { chromium } = require('playwright');
const PILLAR = process.env.PILLAR || 'identity';
const OUT = `${process.env.QA_OUT || 'qa-output'}/pd-${PILLAR}`;
require('fs').mkdirSync(OUT, { recursive: true });
const W = Number(process.env.W || 1440), H = Number(process.env.H || 855);
const SIG = {
  identity: {
    a: async (p) => { await p.evaluate(() => { const r = document.querySelector('[data-continuum-range]'); r.value = '18'; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(500); return p.evaluate(() => document.querySelector('[data-continuum-word]').textContent); },
    b: async (p) => { await p.click('.cf-opts label:has(input[value="Relationships and intimacy"])'); await p.fill('input[name="cf-pronouns"]', 'they/them'); await p.click('.comfort button[type="submit"]'); await p.waitForTimeout(600); return p.evaluate(() => document.querySelector('[data-comfort-text]').textContent.replace(/\n/g, ' | ')); },
    c: async (p) => { await p.click('[data-scan-toggle]'); await p.waitForTimeout(2200); await p.click('[data-scan-skip]'); await p.waitForTimeout(1800); return p.evaluate(() => document.querySelector('[data-scan-word]').textContent); },
  },
  divination: {
    a: async (p) => { await p.click('[data-draw-three]'); await p.waitForTimeout(3200); return p.evaluate(() => Array.from(document.querySelectorAll('[data-card-name]')).map((e) => e.textContent).join(' · ')); },
    b: async (p) => { const m = p.locator('[data-mirror-surface]'); const bb = await m.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(3600); await p.mouse.up(); await p.waitForTimeout(800); return p.evaluate(() => document.querySelector('[data-mirror-word]').textContent); },
    c: async (p) => { await p.click('[data-pendulum-ask]'); await p.waitForTimeout(6500); return p.evaluate(() => document.querySelector('[data-pendulum-word]').textContent); },
  },
  learning: {
    a: async (p) => { for (const q of [0, 1, 2]) { await p.click(`[data-finder-q="${q}"] label >> nth=1`); await p.waitForTimeout(250); } await p.waitForTimeout(800); return p.evaluate(() => Array.from(document.querySelectorAll('[data-finder-result] .chip-keep')).map((e) => e.textContent).join(' · ')); },
    b: async (p) => { await p.click('[data-station="4"]'); await p.waitForTimeout(700); return p.evaluate(() => document.querySelector('[data-station-name]').textContent); },
    c: async (p) => { for (let i = 0; i < 6; i++) { await p.click('[data-yantra-next]'); await p.waitForTimeout(900); } return p.evaluate(() => document.querySelector('[data-yantra-step]').textContent); },
  },
}[PILLAR];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  const tag = W < 600 ? 'phone-' : '';
  for (const dir of ['a', 'b', 'c']) {
    const ctx = await b.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); sessionStorage.setItem('sk-hud', 'closed'); } catch (e) {} });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(dir + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(dir + ': ' + m.text()); });
    await p.goto(`${process.env.QA_BASE || 'http://127.0.0.1:4321'}/pillars/${PILLAR}?tier=full&cursor=off&dir=${dir}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(6500);
    console.log(dir, 'world:', await p.evaluate(() => window.sarvakali.world.chapterKey), '| font:', await p.evaluate(() => getComputedStyle(document.querySelector('.pd-title')).fontFamily.split(',')[0]));
    await p.screenshot({ path: `${OUT}/${tag}${dir}-hero.jpg`, type: 'jpeg', quality: 72 });
    if (W < 600) { await p.evaluate(() => document.querySelector('.pd-sig').scrollIntoView({ block: 'start' })); await p.waitForTimeout(1000); }
    try { console.log(dir, 'signature:', await SIG[dir](p)); } catch (e) { errs.push(dir + ' signature: ' + e.message.split('\n')[0]); }
    await p.screenshot({ path: `${OUT}/${tag}${dir}-sig.jpg`, type: 'jpeg', quality: 72 });
    const keys = [];
    for (let i = 0; i < 46; i++) { await p.evaluate(() => window.scrollBy(0, innerHeight * 0.6)); await p.waitForTimeout(150); const k = await p.evaluate(() => window.sarvakali.world.chapterKey); if (keys[keys.length - 1] !== k) keys.push(k); }
    console.log(dir, 'worlds:', keys.join(' > '));
    const ids = await p.evaluate(() => Array.from(document.querySelectorAll('.pd-move')).map((s) => s.id));
    await p.evaluate((id) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.04); }, ids[1]);
    await p.waitForTimeout(4500);
    await p.screenshot({ path: `${OUT}/${tag}${dir}-ch2.jpg`, type: 'jpeg', quality: 72 });
    for (let i = 0; i < 46; i++) { await p.evaluate(() => window.scrollBy(0, -innerHeight * 0.9)); await p.waitForTimeout(90); }
    await p.waitForTimeout(1500);
    console.log(dir, 'hidden:', await p.evaluate(() => Array.from(document.querySelectorAll('.pd [data-fade], .pd [data-split]')).filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && parseFloat(getComputedStyle(e).opacity) < 0.5; }).length), '| sideways:', await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
    if (dir === 'a') {
      // switching on the page changes the world, the type and the signature
      await p.click('.dv-switch [data-dir-set="b"]');
      await p.waitForTimeout(1500);
      console.log('switched:', await p.evaluate(() => document.documentElement.dataset.dir + ' ' + window.sarvakali.world.chapterKey + ' ' + getComputedStyle(document.querySelector('.pd-title')).fontFamily.split(',')[0]));
    }
    await ctx.close();
  }
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
