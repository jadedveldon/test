import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { store } from './tiers';

/**
 * Keep a list. Visitors tap services that call to them; the list follows them
 * around the site and fills in the Connect form. Stored only on this device.
 */
export type Kept = { t: string; p: string };
const KEY = 'sk-keep';
const listeners = new Set<() => void>();

/** used when the browser blocks storage: the list then lasts for this visit */
let memory: Kept[] | null = null;

export function keepList(): Kept[] {
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); } catch { return memory ? [...memory] : []; }
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.t === 'string') : [];
  } catch {
    return [];
  }
}

function save(list: Kept[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { memory = [...list]; }
  listeners.forEach((f) => f());
}

export const isKept = (t: string) => keepList().some((k) => k.t === t);

export function toggleKeep(t: string, p: string) {
  const list = keepList();
  const i = list.findIndex((k) => k.t === t);
  if (i >= 0) list.splice(i, 1); else list.push({ t, p });
  save(list);
  buzz(PATTERNS.choice);
  return i < 0;
}

/** call fn whenever the list changes; returns a function that stops it */
export function onKeepChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** the kept list as one line, as it goes with a request from the Connect form */
export const keepLine = () => keepList().map((k) => k.t).join('; ');

export function renderKeep() {
  const list = keepList();
  document.querySelectorAll<HTMLElement>('[data-keep]').forEach((b) => b.setAttribute('aria-pressed', String(list.some((k) => k.t === b.dataset.keep))));
  const root = document.querySelector<HTMLElement>('[data-keep-root]');
  if (!root) return;
  root.hidden = list.length === 0;
  root.querySelectorAll('[data-keep-count]').forEach((el) => (el.textContent = String(list.length)));
  const ul = root.querySelector('[data-keep-items]');
  if (ul) {
    ul.innerHTML = '';
    list.forEach((k) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.innerHTML = `<b></b><small></small>`;
      span.querySelector('b')!.textContent = k.t;
      span.querySelector('small')!.textContent = k.p;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'keep-remove';
      rm.dataset.keepRemove = k.t;
      rm.setAttribute('aria-label', `Remove ${k.t}`);
      rm.textContent = '×';
      li.append(span, rm);
      ul.appendChild(li);
    });
  }
}

let ready = false;
export function initKeep() {
  if (ready) return;
  ready = true;
  onKeepChange(renderKeep);
  window.addEventListener('storage', (e) => { if (e.key === KEY) renderKeep(); });
  // chips drawn after the page loads (answers, results) ask to be marked
  document.addEventListener('sk:keep-refresh', () => renderKeep());
  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    const btn = t?.closest<HTMLElement>('[data-keep]');
    if (btn) {
      const added = toggleKeep(btn.dataset.keep!, btn.dataset.keepP || '');
      if (added) gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      const pill = document.querySelector<HTMLElement>('.keep-pill');
      if (added && pill) gsap.fromTo(pill, { y: -6 }, { y: 0, duration: 0.6, ease: 'bounce.out' });
      return;
    }
    const rm = t?.closest<HTMLElement>('[data-keep-remove]');
    if (rm) { const k = keepList().find((x) => x.t === rm.dataset.keepRemove); if (k) toggleKeep(k.t, k.p); return; }
    const drawer = document.querySelector<HTMLElement>('[data-keep-drawer]');
    if (t?.closest('[data-keep-open]') && drawer) {
      drawer.hidden = !drawer.hidden;
      document.querySelector('[data-keep-open]')?.setAttribute('aria-expanded', String(!drawer.hidden));
      if (!drawer.hidden) gsap.fromTo(drawer, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
      return;
    }
    if (t?.closest('[data-keep-close]') && drawer) { drawer.hidden = true; return; }
    if (t?.closest('[data-keep-clear]')) { save([]); if (drawer) drawer.hidden = true; return; }
    // the list itself shows on Connect as chips; an older topic must not come back with it
    if (t?.closest('[data-keep-ask]')) store('sk-topic', null);
  });
}
