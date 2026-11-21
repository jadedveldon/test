import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import type { World } from './world/World';

/**
 * Light a diya. In this prototype the count lives only on this device. On the
 * finished site every visitor's lamp would join one shared count for the day
 * (a tiny database, no personal details).
 */

function count(add = 0) {
  try {
    const n = Number(localStorage.getItem('sk-diya') || '0') + add;
    if (add) localStorage.setItem('sk-diya', String(n));
    return n;
  } catch {
    return add ? 1 : 0;
  }
}

function label(n: number) {
  if (!n) return 'Light a lamp and hold a wish, a name or a quiet thank-you in mind.';
  return `You have lit ${n === 1 ? 'one diya' : `${n} diyas`} here. On the finished site, every lamp joins one shared count for the day.`;
}

export function initDiya(world: World) {
  const root = document.querySelector<HTMLElement>('[data-diya]');
  if (!root) return;
  const btn = root.querySelector<HTMLButtonElement>('[data-diya-light]');
  const note = root.querySelector<HTMLElement>('[data-diya-count]');
  const flame = root.querySelector<SVGGElement>('.diya-flame');
  if (!btn || !note || !flame) return;
  note.textContent = label(count());
  btn.addEventListener('click', () => {
    const n = count(1);
    const first = !root.classList.contains('is-lit');
    root.classList.add('is-lit');
    btn.textContent = 'Offer another';
    note.textContent = label(n);
    buzz(PATTERNS.diya);
    ring('diya');
    world.flash(first ? 0.9 : 0.6);
    world.impulse(1.2);
    gsap.fromTo(flame, { scale: first ? 0.1 : 0.7, transformOrigin: '50% 100%' }, { scale: 1, duration: first ? 1.4 : 0.8, ease: 'elastic.out(1, 0.45)' });
  });
}
