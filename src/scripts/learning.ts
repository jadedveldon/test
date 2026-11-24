import gsap from 'gsap';
import { FINDER, STATIONS } from '../data/learning';
import { buzz, PATTERNS } from './haptics';
import { ring, tick } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 6, Learning (the library, the leaf and the stars): the two signature moments.
 *   Find your class (in the library): three questions, and the classes that fit
 *   Your path (under the stars): a suggested road through the classes
 */

/* ------------------------------------------------- find your class */

function initFinder(form: HTMLFormElement, world: World) {
  const result = form.querySelector<HTMLElement>('[data-finder-result]')!;
  const list = form.querySelector<HTMLElement>('[data-finder-list]')!;
  const pillar = document.querySelector('[data-learning] [data-keep-p]')?.getAttribute('data-keep-p') || 'Learning';
  const onChange = () => {
    const picks = FINDER.map((_, qi) => (form.querySelector<HTMLInputElement>(`input[name="fd-${qi}"]:checked`)?.value ?? null));
    if (picks.some((v) => v === null)) return;
    const items = [...new Set(picks.flatMap((v, qi) => FINDER[qi].a[Number(v)].items))];
    list.innerHTML = '';
    items.forEach((it) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip-keep'; b.dataset.keep = it; b.dataset.keepP = pillar; b.setAttribute('aria-pressed', 'false'); b.textContent = it;
      li.appendChild(b);
      list.appendChild(li);
    });
    // the keep list may already hold some of these
    document.dispatchEvent(new CustomEvent('sk:keep-refresh'));
    const wasHidden = result.hidden;
    result.hidden = false;
    if (wasHidden) gsap.fromTo(result, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
    ring('choice'); buzz(PATTERNS.choice); world.flash(0.2);
  };
  form.addEventListener('change', onChange);
  return () => form.removeEventListener('change', onChange);
}

/* ------------------------------------------------------- your path */

function initPath(root: HTMLElement, world: World) {
  const stations = Array.from(root.querySelectorAll<SVGGElement>('[data-station]'));
  const ch = root.querySelector<HTMLElement>('[data-station-ch]')!;
  const name = root.querySelector<HTMLElement>('[data-station-name]')!;
  const line = root.querySelector<HTMLElement>('[data-station-line]')!;
  const keep = root.querySelector<HTMLButtonElement>('[data-station-keep]')!;
  const show = (i: number, quiet = false) => {
    const s = STATIONS[i];
    stations.forEach((g, k) => g.classList.toggle('is-on', k === i));
    ch.textContent = s.ch; name.textContent = s.name; line.textContent = s.line;
    keep.dataset.keep = s.name;
    keep.setAttribute('aria-pressed', String(document.querySelector(`.chip-keep[data-keep="${CSS.escape(s.name)}"][aria-pressed="true"]:not([data-station-keep])`) !== null));
    if (!quiet) { tick(); buzz([6]); world.flash(0.15); gsap.fromTo([ch, name, line], { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04 }); }
  };
  const onClick = (e: Event) => { const g = (e.target as Element | null)?.closest<SVGGElement>('[data-station]'); if (g) show(Number(g.dataset.station)); };
  const onKey = (e: KeyboardEvent) => { const g = (e.target as Element | null)?.closest<SVGGElement>('[data-station]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(Number(g.dataset.station)); } };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  show(0, true);
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
}

/* ---------------------------------------------------------- page */

let cleanups: (() => void)[] = [];

export function stopLearning() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startLearning(world: World) {
  stopLearning();
  const page = document.querySelector('[data-learning]');
  if (!page) return;
  const finder = page.querySelector<HTMLFormElement>('[data-finder]');
  if (finder) cleanups.push(initFinder(finder, world));
  const path = page.querySelector<HTMLElement>('[data-studypath]');
  if (path) cleanups.push(initPath(path, world));
}
