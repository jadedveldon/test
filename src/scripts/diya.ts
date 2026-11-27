import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import type { WorldHandle as World } from './world/handle';
import { say } from './words';

import { MODE } from '../studio/client';
import { dayKey } from '../diya/core';

/**
 * Light a diya. On the live site every visitor's lamp joins one shared count for the day (India's day), kept on the
 * host with nothing about who lit it (src/diya). This device keeps its own count for the day too, which is all there
 * is in the preview and whenever the host cannot be reached.
 */

const KEY = 'sk-diya-day';
const shared = MODE === 'server';

/** this device's lamps today */
function mine(add = 0) {
  const day = dayKey();
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) || 'null') as { day: string; n: number } | null;
    const n = (kept?.day === day ? kept.n : 0) + add;
    if (add) localStorage.setItem(KEY, JSON.stringify({ day, n }));
    return n;
  } catch {
    return add;
  }
}

function localLine(n: number) {
  if (!n) return say('diya.none');
  return n === 1 ? say('diya.one') : say('diya.many', { n });
}

function sharedLine(total: number, own: number) {
  const all = !total ? say('diya.sharedNone') : total === 1 ? say('diya.sharedOne') : say('diya.sharedMany', { n: total.toLocaleString('en-IN') });
  if (!total || !own) return all;
  return `${all} ${own === 1 ? say('diya.mineOne') : say('diya.mine', { mine: own })}`;
}

async function tally(method: 'GET' | 'POST'): Promise<number | null> {
  try {
    const r = await fetch('/api/diya', { method, credentials: 'same-origin', headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined, body: method === 'POST' ? '{}' : undefined });
    if (!r.ok) return null;
    const j = (await r.json()) as { n?: number };
    return typeof j.n === 'number' ? j.n : null;
  } catch {
    return null;
  }
}

export function initDiya(world: World) {
  document.querySelectorAll<HTMLElement>('[data-diya]').forEach((root) => {
    const btn = root.querySelector<HTMLButtonElement>('[data-diya-light]');
    const note = root.querySelector<HTMLElement>('[data-diya-count]');
    const flame = root.querySelector<SVGGElement>('.diya-flame');
    if (!btn || !note || !flame) return;
    // the last shared count heard from the host; a new lamp shows on it at once, and the host's answer follows
    let last: number | null = null;
    const show = (total: number | null) => { if (total !== null) last = total; note.textContent = last === null ? localLine(mine()) : sharedLine(Math.max(last, mine()), mine()); };
    show(null);
    if (shared) void tally('GET').then((t) => { if (note.isConnected && t !== null) show(t); });
    btn.addEventListener('click', () => {
      mine(1);
      const first = !root.classList.contains('is-lit');
      root.classList.add('is-lit');
      btn.textContent = say('diya.another', {}, 'Offer another');
      if (last !== null) last += 1;
      show(null);
      if (shared) void tally('POST').then((t) => { if (note.isConnected && t !== null) show(t); });
      buzz(PATTERNS.diya);
      ring('diya');
      world.flash(first ? 0.9 : 0.6);
      world.impulse(1.2);
      gsap.fromTo(flame, { scale: first ? 0.1 : 0.7, transformOrigin: '50% 100%' }, { scale: 1, duration: first ? 1.4 : 0.8, ease: 'elastic.out(1, 0.45)' });
    });
  });
}
