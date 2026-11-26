/**
 * The mantra library in the browser: keeping a mantra in "my mantras" (✦ on any card), choosing which scripts to
 * show (Devanagari, transliteration, pronunciation; remembered on this device), the library's search and filters,
 * and on a mantra's own page a larger text, copying it, and a counter to chant it, which adds to the visitor's own
 * practice record. Everything stays on this device. Returns a stop function that removes what it added.
 */
import { buzz } from './haptics';
import { tick } from './audio';
import { logMantra, myMantras, toggleMine } from './practice-log';
import type { WorldHandle as World } from './world/handle';

const SHOW = 'sk-mantra-show';
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function readShow(): Record<string, boolean> {
  try { return { deva: true, iast: true, read: true, ...JSON.parse(localStorage.getItem(SHOW) || '{}') }; } catch { return { deva: true, iast: true, read: true }; }
}
function applyShow(show: Record<string, boolean>) {
  document.querySelectorAll<HTMLElement>('[data-script]').forEach((el) => { el.hidden = !show[el.dataset.script!]; });
  document.querySelectorAll<HTMLInputElement>('[data-show-script]').forEach((c) => { c.checked = !!show[c.dataset.showScript!]; });
}

export function initMantras(world?: World) {
  const offs: (() => void)[] = [];
  const on = <K extends keyof DocumentEventMap>(t: Document | HTMLElement, type: K | string, fn: (e: Event) => void) => { t.addEventListener(type, fn); offs.push(() => t.removeEventListener(type, fn)); };

  /* -------- my mantras: the ✦ on every card, and the keep button on a mantra's page */
  const drawKept = () => {
    const mine = new Set(myMantras());
    document.querySelectorAll<HTMLButtonElement>('[data-keep-mantra]').forEach((b) => {
      const kept = mine.has(b.dataset.keepMantra!);
      b.setAttribute('aria-pressed', String(kept));
      if (b.dataset.keepLabel) b.textContent = kept ? b.dataset.keptLabel! : b.dataset.keepLabel;
    });
  };
  on(document, 'click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-keep-mantra]');
    if (!b) return;
    const kept = toggleMine(b.dataset.keepMantra!);
    buzz([kept ? 8 : 4]);
  });
  on(document, 'sk:my-mantras', drawKept);
  drawKept();

  /* -------- which scripts to show */
  let show = readShow();
  applyShow(show);
  on(document, 'change', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLInputElement>('[data-show-script]');
    if (!c) return;
    show = { ...show, [c.dataset.showScript!]: c.checked };
    try { localStorage.setItem(SHOW, JSON.stringify(show)); } catch { /* remembered for this page only */ }
    applyShow(show);
  });

  /* -------- a day page says when it is today */
  const dayPage = document.querySelector<HTMLElement>('[data-practice-day]');
  if (dayPage && dayPage.dataset.day === DAYS[new Date().getDay()]) dayPage.querySelector<HTMLElement>('[data-today-badge]')?.removeAttribute('hidden');

  /* -------- the library's search and filters */
  const filters = document.querySelector<HTMLFormElement>('[data-filters]');
  if (filters) {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.plib-grid [data-mc]'));
    const q = filters.querySelector<HTMLInputElement>('[data-f-q]')!;
    const deity = filters.querySelector<HTMLSelectElement>('[data-f-deity]')!;
    const theme = filters.querySelector<HTMLSelectElement>('[data-f-theme]')!;
    const guidance = filters.querySelector<HTMLInputElement>('[data-f-guidance]')!;
    const count = filters.querySelector<HTMLElement>('[data-f-count]')!;
    const none = document.querySelector<HTMLElement>('[data-f-none]');
    // a filter can arrive in the address: /practice/library?day=friday&deity=Lakshmi&theme=courage&q=…
    const params = new URLSearchParams(location.search);
    if (params.get('q')) q.value = params.get('q')!;
    if (params.get('deity')) deity.value = params.get('deity')!;
    if (params.get('theme')) theme.value = params.get('theme')!;
    const d0 = params.get('day');
    if (d0) filters.querySelectorAll<HTMLInputElement>('[data-f-day]').forEach((r) => { r.checked = r.value === d0; });
    const apply = () => {
      const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      const day = filters.querySelector<HTMLInputElement>('[data-f-day]:checked')?.value || '';
      let n = 0;
      for (const c of cards) {
        const ok = (!day || c.dataset.days!.split(' ').includes(day))
          && (!deity.value || c.dataset.deity === deity.value)
          && (!theme.value || c.dataset.themes!.split(' ').includes(theme.value))
          && (guidance.checked || c.dataset.status !== 'guidance')
          && words.every((w) => c.dataset.search!.includes(w));
        c.hidden = !ok;
        if (ok) n++;
      }
      count.textContent = (count.dataset.template || '{n} of {total}').replace('{n}', String(n)).replace('{total}', count.dataset.total || String(cards.length));
      if (none) none.hidden = n > 0;
      const p = new URLSearchParams();
      if (q.value) p.set('q', q.value);
      if (day) p.set('day', day);
      if (deity.value) p.set('deity', deity.value);
      if (theme.value) p.set('theme', theme.value);
      history.replaceState(history.state, '', `${location.pathname}${p.toString() ? `?${p}` : ''}${location.hash}`);
    };
    on(filters, 'input', apply);
    on(filters, 'change', apply);
    on(filters, 'submit', (e) => e.preventDefault());
    const clear = document.querySelector<HTMLButtonElement>('[data-f-clear]');
    if (clear) on(clear, 'click', () => { filters.reset(); q.value = ''; apply(); q.focus(); });
    apply();
  }

  /* -------- a mantra's own page */
  const page = document.querySelector<HTMLElement>('[data-mantra-page]');
  if (page) {
    const bigger = page.querySelector<HTMLButtonElement>('[data-pm-bigger]');
    if (bigger) on(bigger, 'click', () => {
      const big = bigger.getAttribute('aria-pressed') !== 'true';
      bigger.setAttribute('aria-pressed', String(big));
      page.classList.toggle('is-big', big);
    });
    const copy = page.querySelector<HTMLButtonElement>('[data-pm-copy]');
    if (copy) on(copy, 'click', async () => {
      const parts = ['.pm-deva', '.pm-iast', '.pm-read'].map((s) => page.querySelector<HTMLElement>(s)).filter((el) => el && !el.hidden).map((el) => Array.from(el!.querySelectorAll('span')).map((s) => s.textContent).join('\n'));
      const text = `${page.dataset.name}\n\n${parts.join('\n\n')}`;
      try { await navigator.clipboard.writeText(text); copy.textContent = copy.dataset.copied || 'Copied.'; } catch { /* the text can still be selected by hand */ }
    });

    const chant = page.querySelector<HTMLElement>('[data-chant]');
    if (chant) {
      const btn = chant.querySelector<HTMLButtonElement>('[data-chant-tap]')!;
      const fill = chant.querySelector<SVGCircleElement>('.rj-fill')!;
      const num = chant.querySelector<HTMLElement>('[data-chant-n]')!;
      const of = chant.querySelector<HTMLElement>('[data-chant-of]')!;
      const doneNote = chant.querySelector<HTMLElement>('[data-chant-done]')!;
      const again = chant.querySelector<HTMLButtonElement>('[data-chant-again]')!;
      const slug = page.dataset.slug!;
      let target = Number(chant.querySelector<HTMLElement>('[data-chant-count][aria-checked="true"]')?.dataset.chantCount || 1);
      let n = 0;
      const draw = () => { num.textContent = String(n); of.textContent = `/ ${target}`; fill.style.strokeDashoffset = String(1 - n / target); };
      chant.querySelectorAll<HTMLButtonElement>('[data-chant-count]').forEach((b) => on(b, 'click', () => {
        target = Number(b.dataset.chantCount);
        chant.querySelectorAll('[data-chant-count]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        if (n >= target) n = 0;
        doneNote.hidden = true; again.hidden = true; btn.disabled = false;
        draw();
      }));
      const tap = () => {
        if (n >= target) return;
        n++;
        draw();
        world?.setMalaCount(n % 109);
        tick(n === target); buzz([5]);
        if (n === target) {
          logMantra(slug, n);
          world?.flash(0.7);
          doneNote.hidden = false; again.hidden = false; btn.disabled = true;
        }
      };
      on(btn, 'click', tap);
      on(again, 'click', () => { n = 0; doneNote.hidden = true; again.hidden = true; btn.disabled = false; draw(); btn.focus(); });
      // the space bar counts while the counter is on screen
      const io = new IntersectionObserver(([e]) => { chant.dataset.inView = e.isIntersecting ? '1' : ''; });
      io.observe(chant);
      offs.push(() => io.disconnect());
      on(document, 'keydown', (e) => {
        const k = e as KeyboardEvent;
        if (k.key !== ' ' || !chant.dataset.inView || (k.target as HTMLElement)?.closest('input, textarea, select, button:not([data-chant-tap]), a')) return;
        k.preventDefault(); tap();
      });
      // a count left unfinished when the visitor leaves still counts
      offs.push(() => { if (n && n < target) logMantra(slug, n); });
      draw();
    }
  }

  return () => offs.forEach((f) => f());
}
