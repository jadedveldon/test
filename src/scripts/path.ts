import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import { isKept, keepList } from './keep';
import { sitePath } from '../studio/client';
import type { WorldHandle as World } from './world/handle';
import { track } from './track';

/**
 * Find your path: three questions point to one chapter of one pillar; the result gathers what the site already
 * has for it: kinds of work to keep (they go with a request), the pillar's own moment to try now, a piece to read,
 * and the request itself. The world turns to each pillar as its answer is hovered, focused or tapped; the roads of
 * the crossroads light as the questions are answered; the numbers 1 to 6 choose an answer from the keyboard. The
 * answers sit in the address (?p=…&c=…&b=…) so a path can be shared or come back to. Nothing is stored or sent.
 */
type Begin = 'talk' | 'session' | 'self' | 'learn';
interface PillarData { name: string; accent: string; care: boolean; moment: { href: string; title: string; text: string }; article: { title: string; href: string; summary: string } | null; practice?: { title: string; line: string; minutes: string; href: string } | null; cats: Record<string, { name: string; services: string[] }> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Words = Record<string, any>;

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function initPath(world: World, done: () => void) {
  const root = document.querySelector<HTMLElement>('[data-path]');
  if (!root) return;
  const { data, w } = JSON.parse(root.querySelector('[data-path-data]')!.textContent || '{}') as { data: Record<string, PillarData>; w: Words };
  const steps = Array.from(root.querySelectorAll<HTMLElement>('.path-q'));
  const result = root.querySelector<HTMLElement>('.path-result')!;
  const out = result.querySelector<HTMLElement>('[data-result]')!;
  const care = result.querySelector<HTMLElement>('[data-path-care]')!;
  const back = root.querySelector<HTMLButtonElement>('[data-path-back]')!;
  const restart = root.querySelector<HTMLButtonElement>('[data-path-restart]')!;
  const share = root.querySelector<HTMLButtonElement>('[data-path-share]')!;
  const label = root.querySelector<HTMLElement>('[data-step-label]')!;
  const roads = Array.from(root.querySelectorAll<SVGPathElement>('.pc-road'));
  const cross = root.querySelector<HTMLElement>('.path-cross')!;
  const choice: { pillar?: string; cat?: string; begin?: Begin } = {};
  let step = 1;
  let chosenPreset = 'findpath';

  const preview = (preset: string) => world.setSequence([preset]);
  const accent = (slug?: string) => { if (slug && data[slug]) root.style.setProperty('--path-acc', data[slug].accent); else root.style.removeProperty('--path-acc'); };

  function drawProgress(n: number) {
    roads.forEach((r, i) => { r.classList.toggle('is-done', i + 1 < n); r.classList.toggle('is-now', i + 1 === n); });
    cross.classList.toggle('is-arrived', n === 4);
    label.textContent = n === 4 ? `${w.resultKicker}` : `${n} / 3 · ${w.steps[n - 1]}`;
  }

  function show(n: number, animate = true) {
    const from = step === 4 ? result : steps[step - 1];
    const to = n === 4 ? result : steps[n - 1];
    step = n;
    drawProgress(n);
    back.hidden = n === 1;
    restart.hidden = n !== 4;
    share.hidden = n !== 4;
    const swap = () => {
      from.hidden = true;
      to.hidden = false;
      if (animate) {
        gsap.fromTo(to, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
        gsap.fromTo(to.querySelectorAll('.path-options:not([hidden]) .path-opt, .path-r-block'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', delay: 0.05 });
      }
      const first = n === 4 ? result : to.querySelector<HTMLElement>('.path-options:not([hidden]) .path-opt');
      first?.focus({ preventScroll: true });
      if (n === 4) result.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'start' });
      done();
    };
    if (!animate || from === to) { swap(); return; }
    gsap.to(from, { opacity: 0, y: -16, duration: 0.28, ease: 'power2.in', onComplete: swap });
  }

  function choose() { buzz(PATTERNS.choice); ring('choice'); world.flash(0.35); }

  function pickPillar(slug: string, animate = true) {
    choice.pillar = slug;
    chosenPreset = slug;
    preview(slug);
    accent(slug);
    steps[1].querySelectorAll<HTMLElement>('[data-for]').forEach((g) => (g.hidden = g.dataset.for !== slug));
    if (animate) { choose(); show(2); }
  }

  function renderResult(animate = true) {
    const p = data[choice.pillar!];
    const cat = p.cats[choice.cat!];
    const begin = choice.begin!;
    care.hidden = !p.care;
    const services = cat.services;
    const moment = `
      <article class="path-r-block path-moment${begin === 'self' ? ' is-first' : ''}">
        <p class="kicker">${esc(w.tryNow)}</p>
        <h3 class="display-s">${esc(p.moment.title)}</h3>
        <p>${esc(p.moment.text)}</p>
        <div class="cta-row"><a class="btn ${begin === 'self' ? 'btn-solid' : 'btn-ghost'} btn-sm" href="${esc(sitePath(p.moment.href))}">${esc(w.tryNow)}</a>
        ${begin === 'self' ? `<a class="btn btn-ghost btn-sm" href="${esc(sitePath('/practice'))}">${esc(w.practice)}</a>` : ''}
        ${begin === 'learn' && choice.pillar !== 'learning' ? `<a class="btn btn-ghost btn-sm" href="${esc(sitePath('/pillars/learning#class-finder'))}">${esc(data.learning?.moment.title ?? '')}</a>` : ''}</div>
      </article>`;
    const keep = services.length ? `
      <article class="path-r-block path-keep">
        <h3 class="display-s">${esc(w.suggest)}</h3>
        <p class="hint">${esc(w.keepHint)}</p>
        <ul class="path-chips">${services.map((s) => `<li><button type="button" class="chip-keep" data-keep="${esc(s)}" data-keep-p="${esc(p.name)}" aria-pressed="${isKept(s)}">${esc(s)}</button></li>`).join('')}</ul>
        ${services.length > 1 ? `<button type="button" class="path-back" data-keep-all>${esc(w.keepAll)}</button>` : ''}
      </article>` : '';
    const read = p.article ? `
      <article class="path-r-block path-read">
        <p class="kicker">${esc(w.read)}</p>
        <a class="path-read-link" href="${esc(sitePath(p.article.href))}"><span class="display-s">${esc(p.article.title)}</span><span class="hint">${esc(p.article.summary)}</span></a>
      </article>` : '';
    // one practice to begin with today, from the library's guided practices (src/content/pages/practice-links.json)
    const practice = p.practice ? `
      <article class="path-r-block path-practice">
        <p class="kicker">${esc(w.practiceLead)}</p>
        <a class="path-read-link" href="${esc(sitePath(p.practice.href))}" data-practice-from="path"><span class="display-s">${esc(p.practice.title)}</span><span class="hint">${esc(p.practice.line)} · ${esc(p.practice.minutes)}</span></a>
      </article>` : '';
    out.innerHTML = `
      <p class="kicker">${esc(w.resultKicker)}</p>
      <h2 class="display-l">${esc(cat.name)}</h2>
      <p class="path-part">${esc(String(w.partOf).replace('{pillar}', p.name))}</p>
      <p class="lede">${esc(w.resultText[begin])}</p>
      <div class="path-r-grid">${begin === 'self' ? moment + keep : keep + moment}${practice}${read}</div>
      <div class="cta-row path-r-cta">
        <a class="btn btn-solid" href="${esc(sitePath('/connect'))}" data-path-ask>${esc(w.ask)}</a>
        <a class="btn btn-ghost" data-result-explore href="${esc(sitePath(`/pillars/${choice.pillar}#${choice.cat}`))}">${esc(String(w.explore).replace('{pillar}', p.name))}</a>
      </div>`;
    document.dispatchEvent(new CustomEvent('sk:keep-refresh'));
    // the path's own address, to share or come back to
    const q = new URLSearchParams(location.search);
    q.set('p', choice.pillar!); q.set('c', choice.cat!); q.set('b', begin);
    history.replaceState(history.state, '', `${location.pathname}?${q}`);
    if (animate) { world.impulse(1.5); }
    track('path-result', choice.pillar);
    show(4, animate);
  }

  // the first question: each answer shows its pillar's world as it is hovered, focused or touched
  steps[0].querySelectorAll<HTMLElement>('[data-pillar]').forEach((b) => {
    const on = () => { preview(b.dataset.preset!); accent(b.dataset.pillar); };
    b.addEventListener('pointerenter', on);
    b.addEventListener('focus', on);
    b.addEventListener('pointerleave', () => { preview(chosenPreset); accent(choice.pillar); });
    b.addEventListener('click', () => pickPillar(b.dataset.pillar!));
  });
  steps[1].querySelectorAll<HTMLElement>('[data-category]').forEach((b) => {
    b.addEventListener('click', () => { choice.cat = b.dataset.category; choose(); show(3); });
  });
  steps[2].querySelectorAll<HTMLElement>('[data-begin]').forEach((b) => {
    b.addEventListener('click', () => { choice.begin = b.dataset.begin as Begin; choose(); renderResult(); });
  });
  back.addEventListener('click', () => {
    if (step === 2) { chosenPreset = 'findpath'; preview('findpath'); accent(); choice.pillar = undefined; }
    show(step - 1);
  });
  restart.addEventListener('click', () => {
    chosenPreset = 'findpath'; preview('findpath'); accent();
    Object.keys(choice).forEach((k) => delete choice[k as keyof typeof choice]);
    history.replaceState(history.state, '', location.pathname);
    show(1);
  });
  share.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); share.textContent = w.copied; } catch { /* the address bar has it */ }
    setTimeout(() => { share.textContent = w.share; }, 2000);
  });
  out.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-keep-all]')) {
      // keep each one not yet kept (the list's own click handler toggles; here only adding)
      out.querySelectorAll<HTMLButtonElement>('[data-keep]').forEach((b) => { if (!isKept(b.dataset.keep!)) b.click(); });
    }
    if (t.closest('[data-path-ask]')) {
      // the chapter goes with the request as a topic when nothing was kept
      if (!keepList().length) try { sessionStorage.setItem('sk-topic', `${data[choice.pillar!].cats[choice.cat!].name} (${w.begin[choice.begin!].title})`); } catch { /* fine */ }
    }
  });

  // the keyboard: 1 to 6 choose an answer
  const onKey = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key) || step === 4) return;
    if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')) return;
    const opts = Array.from(steps[step - 1].querySelectorAll<HTMLButtonElement>('.path-options:not([hidden]) .path-opt'));
    const b = opts[Number(e.key) - 1];
    if (b) { e.preventDefault(); b.focus(); b.click(); }
  };
  document.addEventListener('keydown', onKey);

  // a shared path: straight to its result
  const q = new URLSearchParams(location.search);
  const sp = q.get('p'), sc = q.get('c'), sb = q.get('b') as Begin | null;
  if (sp && data[sp] && sc && data[sp].cats[sc] && sb && w.begin[sb]) {
    pickPillar(sp, false);
    choice.cat = sc; choice.begin = sb;
    steps[0].hidden = true;
    step = 1;
    renderResult(false);
  } else drawProgress(1);
  return () => document.removeEventListener('keydown', onKey);
}
