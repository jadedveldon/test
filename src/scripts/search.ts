import gsap from 'gsap';
import { isKept } from './keep';

/**
 * Search across every service. Opens from the header, or with "/" or Ctrl+K.
 * As results appear, the world behind turns into the world of the pillar the
 * best match belongs to.
 */
type Index = { pillars: { name: string; slug: string; preset: string }[]; items: [string, number, string, string, string][] };
type Hooks = { preview: (preset: string) => void; restore: () => void };

let index: Index | null = null;
let loading: Promise<Index | null> | null = null;
let hooks: Hooks;
let lastFocus: HTMLElement | null = null;
let previewed = '';

function load() {
  if (index) return Promise.resolve(index);
  if (loading) return loading;
  const src = document.getElementById('search-src') as HTMLLinkElement | null;
  if (!src) return Promise.resolve(null);
  loading = fetch(src.href).then((r) => r.json()).then((j: Index) => (index = j)).catch(() => null);
  return loading;
}

const words = (q: string) => q.toLowerCase().replace(/[^a-z0-9&'\s-]/g, ' ').split(/\s+/).filter(Boolean);
const startsWord = (text: string, w: string) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text);

function find(q: string) {
  if (!index) return [];
  const ws = words(q);
  if (!ws.length) return [];
  const out: { i: number; score: number }[] = [];
  index.items.forEach((it, i) => {
    const t = it[0].toLowerCase(), ctx = `${it[2]} ${it[3]}`.toLowerCase();
    let score = 0;
    for (const w of ws) {
      if (startsWord(t, w)) score += 3;
      else if (startsWord(ctx, w)) score += 1;
      else return;
    }
    out.push({ i, score: score - t.length / 200 });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, 60);
}

function pillarHref(slug: string) {
  const a = document.querySelector<HTMLAnchorElement>(`#search [data-pillar-href="${slug}"]`);
  return (a?.getAttribute('href') || `/pillars/${slug}`).split('#')[0];
}

function render(q: string) {
  const root = document.getElementById('search');
  if (!root || !index) return;
  const list = root.querySelector('[data-search-results]')!;
  const status = root.querySelector('[data-search-status]')!;
  const hits = find(q);
  list.innerHTML = '';
  if (!q.trim()) {
    status.textContent = `Search all ${index.items.length.toLocaleString('en-IN')} services by a word: protection, love, tarot, reiki, ancestors…`;
    restorePreview();
    return;
  }
  status.textContent = hits.length ? `${hits.length === 60 ? '60+' : hits.length} found` : 'Nothing found. Try a shorter word, or ask Sarvakali directly.';
  let lastPillar = -1;
  for (const { i } of hits) {
    const [t, pi, cat, sub] = index.items[i];
    const p = index.pillars[pi];
    if (pi !== lastPillar) {
      const h = document.createElement('li');
      h.className = 'sr-head';
      h.textContent = p.name;
      list.appendChild(h);
      lastPillar = pi;
    }
    const li = document.createElement('li');
    li.className = 'sr-row';
    const a = document.createElement('a');
    a.className = 'sr-item';
    a.href = `${pillarHref(p.slug)}?find=${encodeURIComponent(t)}`;
    a.innerHTML = '<b></b><small></small>';
    a.querySelector('b')!.textContent = t;
    a.querySelector('small')!.textContent = `${cat} · ${sub}`;
    const keep = document.createElement('button');
    keep.type = 'button';
    keep.className = 'sr-keep';
    keep.dataset.keep = t;
    keep.dataset.keepP = p.name;
    keep.setAttribute('aria-pressed', String(isKept(t)));
    keep.setAttribute('aria-label', `Keep ${t} in your list`);
    keep.innerHTML = '<span aria-hidden="true">+</span>';
    li.append(a, keep);
    list.appendChild(li);
  }
  // the world becomes the best match's pillar
  if (hits.length) {
    const preset = index.pillars[index.items[hits[0].i][1]].preset;
    if (preset !== previewed) { previewed = preset; hooks.preview(preset); }
  }
}

function restorePreview() {
  if (previewed) { previewed = ''; hooks.restore(); }
}

export function openSearch() {
  const root = document.getElementById('search');
  if (!root || !root.hidden) return;
  lastFocus = document.activeElement as HTMLElement | null;
  root.hidden = false;
  document.documentElement.classList.add('search-open');
  const input = root.querySelector<HTMLInputElement>('input')!;
  gsap.fromTo(root.querySelector('.search-panel'), { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' });
  input.focus();
  load().then(() => render(input.value));
}

export function closeSearch() {
  const root = document.getElementById('search');
  if (!root || root.hidden) return;
  root.hidden = true;
  document.documentElement.classList.remove('search-open');
  restorePreview();
  lastFocus?.focus?.();
}

let ready = false;
export function initSearch(h: Hooks) {
  hooks = h;
  if (ready) return;
  ready = true;
  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (t?.closest('[data-search-open]')) { e.preventDefault(); openSearch(); return; }
    const root = document.getElementById('search');
    if (!root || root.hidden) return;
    if (t?.closest('[data-search-close]') || t === root) closeSearch();
    if (t?.closest('.sr-item')) { previewed = ''; closeSearch(); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t?.id === 'search-input') load().then(() => render(t.value));
  });
  document.addEventListener('keydown', (e) => {
    const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]');
    if (!typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) { e.preventDefault(); openSearch(); return; }
    const root = document.getElementById('search');
    if (!root || root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(root.querySelectorAll<HTMLElement>('#search-input, .sr-item'));
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) { e.preventDefault(); next.focus(); }
    }
  });
}

/** on a pillar page opened from search: open the right list and point to the service */
export function revealFound(scrollTo: (el: HTMLElement) => void) {
  const q = new URLSearchParams(location.search).get('find');
  if (!q) return;
  const target = Array.from(document.querySelectorAll<HTMLElement>('.pp-sub li')).find((li) => li.textContent?.trim() === q);
  if (!target) return;
  const det = target.closest('details');
  if (det) det.open = true;
  setTimeout(() => {
    scrollTo(target);
    target.classList.add('is-found');
    setTimeout(() => target.classList.remove('is-found'), 4200);
  }, 500);
}
