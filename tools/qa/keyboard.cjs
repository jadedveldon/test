// Keyboard-only use: tab order, visible focus, nothing invisible takes focus, overlays trap and return focus,
// and every signature moment works without a mouse.
const { chromium } = require('playwright');
const B = (process.env.QA_BASE || 'http://127.0.0.1:4321');
const ok = (n, v, extra = '') => console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 855 }, serviceWorkers: 'block', reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  const go = async (u) => { await p.goto(`${B}${u}${u.includes('?') ? '&' : '?'}tier=full&cursor=off`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500); };
  const focusInfo = () => p.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return null;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    let hiddenBy = '';
    for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n); if (Number(c.opacity) === 0) { hiddenBy = 'opacity0 ' + (n.className || n.tagName); break; } if (c.visibility === 'hidden') { hiddenBy = 'visibility'; break; } if (n.getAttribute('aria-hidden') === 'true') { hiddenBy = 'aria-hidden ' + (n.className || n.tagName); break; } if (n.inert) { hiddenBy = 'inert'; break; } }
    const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none';
    const label = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.name || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 34);
    return { dbg: `${cs.outlineStyle} ${cs.outlineWidth} fv=${e.matches(':focus-visible')} f=${e.matches(':focus')}`, label, tag: e.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, hiddenBy, ring, inMenu: !!e.closest('#menu'), inSearch: !!e.closest('#search'), inDialog: !!e.closest('dialog[open]') };
  });

  // 1. tab through whole pages
  for (const u of (process.env.KPAGES || '/,/pillars/magic,/pillars/healing,/pillars/identity,/pillars/divination,/pillars/learning,/practice,/connect,/path,/invoice').split(',')) {
    await go(u);
    const bad = []; const seen = []; let n = 0;
    for (let i = 0; i < 160; i++) {
      await p.keyboard.press('Tab'); await p.waitForTimeout(40);
      const f = await focusInfo(); if (!f) continue; n++;
      if (i === 0) seen.push(`first: ${f.label}`);
      if ((f.hiddenBy || f.w === 0 || f.h === 0) && !(f.tag === 'input' && /opacity0 INPUT/.test(f.hiddenBy))) bad.push(`invisible[${f.hiddenBy || '0px'}] ${f.label}`);
      else if (!f.inView && !/Skip/.test(f.label)) bad.push(`off-screen ${f.label}`);
      else if (!f.ring) bad.push(`no focus ring ${f.tag} "${f.label}" [${f.dbg}]`);
    }
    const uniq = [...new Set(bad)];
    ok(`tab through ${u} (${n} stops)`, uniq.length === 0, `${seen[0]}${uniq.length ? ' | ' + uniq.slice(0, 6).join(' | ') + (uniq.length > 6 ? ` …+${uniq.length - 6}` : '') : ''}`);
  }
  if (process.env.KPAGES) { console.log('ERRORS:', errs.length ? [...new Set(errs)] : 'none'); await b.close(); return; }
  // 2. skip link
  await go('/');
  await p.keyboard.press('Tab');
  const first = await focusInfo();
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  await p.keyboard.press('Tab');
  const after = await p.evaluate(() => !!document.activeElement?.closest('#main'));
  ok('skip link is first and jumps into the content', /Skip/.test(first?.label || '') && after, first?.label);
  // 3. menu: open, focus inside, trapped, Escape returns focus
  await go('/');
  await p.focus('[data-menu-open]'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  let f = await focusInfo();
  const inside = [];
  for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(25); const g = await focusInfo(); inside.push(!!g?.inMenu); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  const back = await p.evaluate(() => document.activeElement?.matches('[data-menu-open]'));
  ok('menu: focus moves in, stays in, returns on Escape', f?.inMenu && inside.every(Boolean) && back, `start ${f?.label}; trapped ${inside.filter(Boolean).length}/40; back ${back}`);
  // 4. search with "/" and arrows
  await p.keyboard.press('/'); await p.waitForTimeout(600);
  f = await focusInfo();
  await p.keyboard.type('tarot'); await p.waitForTimeout(800);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
  const onResult = await p.evaluate(() => document.activeElement?.classList.contains('sr-item'));
  const trapped = []; for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(25); const g = await focusInfo(); trapped.push(g === null || !!g.inSearch); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const closed = await p.evaluate(() => document.getElementById('search').hidden);
  ok('search: "/" opens with focus in the box, arrows reach results, focus stays inside, Escape closes', f?.inSearch && onResult && trapped.every(Boolean) && closed, `trapped ${trapped.filter(Boolean).length}/25`);
  // 5. today's card dialog
  await go('/practice');
  await p.focus('[data-practice] [data-card-open]'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  f = await focusInfo();
  const inDlg = []; for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(25); const g = await focusInfo(); inDlg.push(g === null || !!g.inDialog); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  const cardBack = await p.evaluate(() => !!document.activeElement?.closest('[data-card-open]') || document.activeElement?.matches('[data-card-open]'));
  ok('card: focus in the dialog, stays there, returns on Escape', f?.inDialog && inDlg.every(Boolean) && cardBack, `${f?.label}; back ${cardBack}`);
  // 6. signature moments by keyboard
  await go('/pillars/healing');
  await p.focus('[data-breath-toggle]'); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  ok('breath guide starts from the keyboard', await p.evaluate(() => /in|hold|out/i.test(document.querySelector('[data-breath-word], .br-word')?.textContent || '')));
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.focus('[data-ck="0"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok('chakra chosen from the keyboard', await p.evaluate(() => document.querySelector('[data-ck="0"]').classList.contains('is-on')));
  await p.focus('[data-piece="3"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
  ok('kintsugi piece set from the keyboard', await p.evaluate(() => document.querySelector('[data-piece="3"]').classList.contains('is-home')));
  await go('/pillars/identity');
  await p.focus('input[name="cf-pace"]:checked'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Tab'); await p.keyboard.press('Space');
  await p.focus('[data-comfort] button[type="submit"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok('identity: the comfort note made by keyboard', await p.evaluate(() => !document.querySelector('[data-comfort-note]').hidden));
  await go('/pillars/divination');
  await p.focus('[data-mirror-surface]'); await p.keyboard.down('Enter'); await p.waitForTimeout(3800); await p.keyboard.up('Enter'); await p.waitForTimeout(800);
  ok('mirror: hold Enter to still it', await p.evaluate(() => (document.querySelector('[data-mirror-symbol]')?.textContent || '').length > 0));
  await go('/pillars/learning');
  await p.focus('[data-station="5"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok('path of study: a star chosen from the keyboard', await p.evaluate(() => document.querySelector('[data-station="5"]').classList.contains('is-on')));
  await p.focus('input[name="fd-0"]'); await p.keyboard.press('Space'); await p.keyboard.press('ArrowDown');
  await p.focus('input[name="fd-1"]'); await p.keyboard.press('Space');
  await p.focus('input[name="fd-2"]'); await p.keyboard.press('Space'); await p.waitForTimeout(700);
  ok('find your class by keyboard', await p.evaluate(() => !document.querySelector('[data-finder-result]').hidden));
  await go('/pillars/magic');
  const sig = await p.evaluate(() => { const i = document.querySelector('[data-sigil] input, [data-sigil] textarea'); return i ? true : false; });
  if (sig) { await p.focus('[data-sigil] input, [data-sigil] textarea'); await p.keyboard.type('love comes to me'); await p.waitForTimeout(900); }
  ok('sigil made from typed words', await p.evaluate(() => document.querySelectorAll('[data-sigil] svg path, [data-sigil] svg polyline, [data-sigil] svg line').length > 2));
  console.log('ERRORS:', errs.length ? [...new Set(errs)] : 'none');
  await b.close();
})();
