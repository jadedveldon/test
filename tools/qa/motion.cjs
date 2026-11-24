// Reduced motion and Windows high-contrast (forced colours)
const { chromium } = require('playwright');
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const OUT = require('path').join(process.env.QA_OUT || 'qa-output', 'motion');
require('fs').mkdirSync(OUT, { recursive: true });
const ok = (n, v, extra = '') => console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // reduced motion
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 855 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    await p.goto(`${B}/`); await p.waitForTimeout(3500);
    const r = await p.evaluate(() => ({ tier: document.documentElement.dataset.tier, intro: !!document.getElementById('loader') && getComputedStyle(document.getElementById('loader')).display !== 'none', world: document.documentElement.dataset.world || 'none', lenis: document.documentElement.classList.contains('lenis') }));
    const anims = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => `${a.effect?.target?.className?.baseVal ?? a.effect?.target?.className ?? ''}`.slice(0, 30)));
    await p.evaluate(() => window.scrollTo(0, 2000)); await p.waitForTimeout(800);
    const hidden = await p.evaluate(() => Array.from(document.querySelectorAll('[data-fade], [data-split], [data-hero]')).filter((e) => e.getClientRects().length && Number(getComputedStyle(e).opacity) < 0.5).length);
    await p.evaluate(() => { const a = document.createElement('a'); a.href = '/pillars/magic'; document.body.appendChild(a); a.click(); }); await p.waitForTimeout(2500);
    const veil = await p.evaluate(() => document.getElementById('veil')?.dataset.mode || 'none');
    ok('reduced motion: Calm, no 3D, no smooth scroll, nothing left hidden, no veil animation', r.tier === 'calm' && r.world === 'none' && !r.lenis && hidden === 0 && veil === 'none' && errs.length === 0, `${JSON.stringify(r)} running CSS animations: ${anims.length} [${[...new Set(anims)].slice(0, 5).join(', ')}] hidden=${hidden} veil=${veil} ${errs.join(' | ')}`);
    await ctx.close(); }
  // forced colours (Windows high contrast)
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 855 }, forcedColors: 'active', colorScheme: 'dark', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    for (const u of ['/', '/pillars/healing', '/pillars/identity', '/pillars/divination', '/pillars/learning', '/connect']) {
      await p.goto(`${B}${u}${u.includes('?') ? '&' : '?'}tier=calm`); await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/forced-${u.replace(/[/?=]/g, '_')}.jpg`, type: 'jpeg', quality: 55 });
      // every control keeps a visible edge; a visually hidden radio or checkbox counts through the chip it labels
      const r = await p.evaluate(() => {
        const edge = (e) => { const cs = getComputedStyle(e); return cs.borderStyle !== 'none' && parseFloat(cs.borderWidth) > 0 || cs.outlineStyle !== 'none' || e.tagName === 'A' && cs.textDecorationLine.includes('underline') || e.tagName === 'BUTTON' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'; };
        const all = Array.from(document.querySelectorAll('button, a.btn, .chip-keep, input, textarea')).filter((e) => e.getClientRects().length && !e.closest('[hidden]'));
        const missing = all.filter((e) => {
          if (e.matches('input[type="radio"], input[type="checkbox"]') && Number(getComputedStyle(e).opacity) === 0) return !(e.nextElementSibling && edge(e.nextElementSibling));
          return !edge(e);
        });
        return { n: all.length, missing: missing.map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${(e.textContent || e.name || '').trim().slice(0, 20)}"`) };
      });
      ok(`forced colours ${u}: every control keeps a visible edge (${r.n - r.missing.length}/${r.n})`, !r.missing.length, r.missing.slice(0, 4).join(' | '));
    }
    await ctx.close(); }
  await b.close();
})();
