// The settled Pillars 4 to 6, desktop and a touch phone: each chapter shows its own world, nothing is left
// hidden or sideways, no errors, and every signature moment works by mouse, by touch and by keyboard.
// Rule (CLAUDE.md): a new signature moment adds its checks here.
const { chromium } = require('playwright');
const B = process.env.QA_BASE || 'http://127.0.0.1:4321';
const ok = (n, v, extra = '') => console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`);
const PILLARS = {
  identity: { marker: '[data-identity]', chapters: ['id_hero', 'id_queer', 'id_intimacy', 'id_body', 'id_womb', 'id_lilith', 'id_close'], home: 'id_home' },
  divination: { marker: '[data-divination]', chapters: ['div_hero', 'div_readings', 'div_seeing', 'div_dreams', 'div_eye', 'div_astral', 'div_close'], home: 'div_home' },
  learning: { marker: '[data-learning]', chapters: ['lrn_hero', 'lrn_foundations', 'lrn_craft', 'lrn_tantra', 'lrn_deity', 'lrn_path', 'lrn_mentoring', 'lrn_close'], home: 'lrn_home' },
};
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const view of (process.env.VIEWS || 'desk,phone').split(',')) {
    const phone = view === 'phone';
    const ctx = await b.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 855 }, hasTouch: phone, isMobile: phone, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('sk-intro-seen', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
    p.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(B)) errs.push(`${r.status()} ${r.url().replace(B, '')}`); });
    const go = async (u) => { await p.goto(`${B}${u}${u.includes('?') ? '&' : '?'}tier=full&cursor=off`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000); };
    const tap = async (sel) => { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); if (phone) await l.tap(); else await l.click(); };
    // a press-and-hold, by mouse or by finger
    const hold = async (sel, ms) => {
      const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      if (!phone) { const bx = await l.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); return; }
      await l.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true })));
      await p.waitForTimeout(ms);
      await l.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', isPrimary: true })));
    };

    for (const [pl, spec] of Object.entries(PILLARS)) {
      await go(`/pillars/${pl}`);
      const base = await p.evaluate((m) => ({ marker: !!document.querySelector(m), oldSwitch: !!document.querySelector('[data-dir-set], [data-dir-only], .dv-switch, .dv-brief'), dir: document.documentElement.dataset.dir || '', chapters: Array.from(document.querySelectorAll('#main section.chapter')).map((s) => s.dataset.chapter) }), spec.marker);
      ok(`${view} ${pl}: settled page, no direction switch left`, base.marker && !base.oldSwitch && !base.dir, JSON.stringify({ oldSwitch: base.oldSwitch, dir: base.dir }));
      ok(`${view} ${pl}: chapters in order`, base.chapters.join() === spec.chapters.join(), base.chapters.join(' '));
      // each chapter's world arrives as you reach it
      const worlds = [];
      for (const k of spec.chapters) {
        await p.evaluate((k) => { const el = document.querySelector(`[data-chapter="${k}"]`); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + innerHeight * 0.05); }, k);
        await p.waitForTimeout(1500);
        worlds.push(await p.evaluate(() => window.sarvakali.world.chapterKey));
      }
      const wrong = spec.chapters.filter((k, i) => worlds[i] !== k);
      ok(`${view} ${pl}: every chapter shows its own world`, !wrong.length, wrong.length ? `expected ${wrong.join(',')}; got ${worlds.join(',')}` : '');
      for (let i = 0; i < 40; i++) { await p.evaluate(() => window.scrollBy(0, -innerHeight * 0.9)); await p.waitForTimeout(60); }
      await p.waitForTimeout(1200);
      const vis = await p.evaluate(() => ({ hidden: Array.from(document.querySelectorAll('.pd [data-fade], .pd [data-split], .pd [data-hero]')).filter((e) => e.getClientRects().length && Number(getComputedStyle(e).opacity) < 0.5).length, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
      ok(`${view} ${pl}: nothing left hidden, nothing sideways`, !vis.hidden && !vis.sideways, JSON.stringify(vis));

      if (pl === 'identity') {
        await tap('.cf-opts input[name="cf-pace"][value^="Slowly"] + span');
        await tap('.cf-opts input[name="cf-explore"] + span');
        await p.locator('input[name="cf-pronouns"]').fill('they/them');
        await tap('[data-comfort] button[type="submit"]'); await p.waitForTimeout(700);
        const note = await p.evaluate(() => ({ shown: !document.querySelector('[data-comfort-note]').hidden, text: document.querySelector('[data-comfort-text]').textContent }));
        ok(`${view} identity: comfort note by ${phone ? 'touch' : 'mouse'}`, note.shown && /they\/them/.test(note.text) && /Slowly/.test(note.text), note.text.split('\n').slice(2).join(' / ').slice(0, 90));
        await p.focus('input[name="cf-pace"]:checked'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
        ok(`${view} identity: pace chosen by keyboard`, await p.evaluate(() => document.querySelector('input[name="cf-pace"]:checked').value.startsWith('Steadily')));
      }
      if (pl === 'divination') {
        await hold('[data-mirror-surface]', 3700); await p.waitForTimeout(900);
        const first = await p.evaluate(() => ({ symbol: document.querySelector('[data-mirror-symbol]').textContent, prompt: document.querySelector('[data-mirror-word]').textContent }));
        ok(`${view} divination: a prompt to ponder by ${phone ? 'touch' : 'mouse'}`, !!first.symbol && /\?$/.test(first.prompt), `${first.symbol}: ${first.prompt}`);
        await hold('[data-mirror-surface]', 3700); await p.waitForTimeout(900);
        const second = await p.evaluate(() => document.querySelector('[data-mirror-word]').textContent);
        ok(`${view} divination: the next prompt is a different one`, second !== first.prompt && /\?$/.test(second), second);
        await hold('[data-mirror-surface]', 900); await p.waitForTimeout(300);
        ok(`${view} divination: letting go early asks for a little longer`, /longer|settle/i.test(await p.evaluate(() => document.querySelector('[data-mirror-word]').textContent)));
        await p.waitForTimeout(1000);
        await p.focus('[data-mirror-surface]'); await p.keyboard.down('Enter'); await p.waitForTimeout(3700); await p.keyboard.up('Enter'); await p.waitForTimeout(900);
        ok(`${view} divination: a prompt by keyboard (hold Enter)`, /\?$/.test(await p.evaluate(() => document.querySelector('[data-mirror-word]').textContent)));
      }
      if (pl === 'learning') {
        await tap('input[name="fd-0"][value="1"] + span'); await tap('input[name="fd-1"][value="0"] + span'); await tap('input[name="fd-2"][value="0"] + span'); await p.waitForTimeout(700);
        const fit = await p.evaluate(() => Array.from(document.querySelectorAll('[data-finder-list] .chip-keep')).map((b) => b.textContent));
        ok(`${view} learning: find your class by ${phone ? 'touch' : 'mouse'}`, fit.length >= 2, fit.join(' · '));
        const before = await p.evaluate(() => Number(document.querySelector('[data-keep-count]')?.textContent || 0));
        await tap('[data-finder-list] .chip-keep'); await p.waitForTimeout(400);
        ok(`${view} learning: a class from the finder can be kept`, await p.evaluate((n) => Number(document.querySelector('[data-keep-count]')?.textContent || 0) === n + 1, before));
        await tap('[data-station="5"]'); await p.waitForTimeout(500);
        ok(`${view} learning: a star on the path by ${phone ? 'touch' : 'mouse'}`, await p.evaluate(() => document.querySelector('[data-station="5"]').classList.contains('is-on') && /Mantra/.test(document.querySelector('[data-station-name]').textContent)));
        await p.focus('[data-station="9"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
        ok(`${view} learning: a star by keyboard`, await p.evaluate(() => /Aura/.test(document.querySelector('[data-station-name]').textContent)));
        await p.focus('input[name="fd-0"]:checked'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(500);
        ok(`${view} learning: the finder answers to the keyboard`, await p.evaluate(() => /Mantra|Yantra/.test(document.querySelector('[data-finder-list]').textContent)));
        ok(`${view} learning: no yantra drawing left`, await p.evaluate(() => !document.querySelector('[data-yantra-draw], [data-yd]')));
      }
    }
    // the homepage chapters of these pillars take their settled worlds
    await go('/');
    const home = {};
    for (const [pl, spec] of Object.entries(PILLARS)) {
      await p.evaluate((pl) => document.querySelector(`[data-chapter="${pl}"]`).scrollIntoView({ block: 'center' }), pl); await p.waitForTimeout(1600);
      home[pl] = await p.evaluate(() => window.sarvakali.world.chapterKey);
      ok(`${view} homepage: ${pl} chapter shows ${spec.home}`, home[pl] === spec.home, home[pl]);
    }
    console.log(`ERRORS (${view}):`, errs.length ? [...new Set(errs)] : 'none');
    await ctx.close();
  }
  await b.close();
})();
