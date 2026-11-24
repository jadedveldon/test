import gsap from 'gsap';
import { PROMPTS } from '../data/divination';
import { buzz, PATTERNS } from './haptics';
import { ring, tick } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 5, Divination & Insight (candlelight and the black mirror): the signature moment.
 *   Prompts to ponder: hold the black mirror until the water stills, and a symbol rises with a prompt to sit with.
 * For reflection; nothing is predicted, kept or sent.
 */

/* ------------------------------------------------- prompts to ponder */

const HOLD = 3.2;

function initMirror(root: HTMLElement, world: World) {
  const surface = root.querySelector<HTMLElement>('[data-mirror-surface]')!;
  const mist = root.querySelector<HTMLElement>('[data-mirror-mist]')!;
  const rings = Array.from(root.querySelectorAll<SVGEllipseElement>('.mr-ring'));
  const symbol = root.querySelector<HTMLElement>('[data-mirror-symbol]')!;
  const word = root.querySelector<HTMLElement>('[data-mirror-word]')!;
  let tl: gsap.core.Timeline | null = null, done = false, settleTimer = 0, lastPrompt = -1;
  const idleWord = word.textContent || '';
  const start = () => {
    if (tl) return;
    if (done) { done = false; gsap.to(symbol, { opacity: 0, duration: 0.4 }); }
    word.textContent = 'Be still…';
    tl = gsap.timeline({ onComplete: reveal })
      .to(mist, { opacity: 0, duration: HOLD, ease: 'sine.in' }, 0)
      .to(rings, { scale: 0.2, opacity: 0, duration: HOLD, ease: 'sine.inOut', stagger: 0.12, transformOrigin: '50% 50%' }, 0);
    surface.classList.add('is-held');
    tick();
  };
  const stop = () => {
    if (!tl) return;
    if (tl.progress() < 1) {
      tl.kill(); tl = null;
      gsap.to(mist, { opacity: 1, duration: 0.8 });
      gsap.to(rings, { scale: 1, opacity: 1, duration: 0.8, transformOrigin: '50% 50%' });
      word.textContent = 'Hold a little longer; the water needs time to settle';
    }
    surface.classList.remove('is-held');
  };
  const reveal = () => {
    tl = null;
    done = true;
    // a new prompt each time, never the one just shown
    let k = Math.floor(Math.random() * PROMPTS.length);
    if (k === lastPrompt) k = (k + 1) % PROMPTS.length;
    lastPrompt = k;
    const [what, q] = PROMPTS[k];
    symbol.textContent = what;
    gsap.fromTo(symbol, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out' });
    word.textContent = q;
    ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.4);
    settleTimer = window.setTimeout(() => { gsap.to(mist, { opacity: 0.55, duration: 3 }); gsap.to(rings, { scale: 1, opacity: 1, duration: 3, transformOrigin: '50% 50%' }); }, 2500);
  };
  const key = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); } };
  const keyUp = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') stop(); };
  surface.addEventListener('pointerdown', start);
  surface.addEventListener('pointerup', stop);
  surface.addEventListener('pointerleave', stop);
  surface.addEventListener('pointercancel', stop);
  surface.addEventListener('keydown', key);
  surface.addEventListener('keyup', keyUp);
  return () => {
    tl?.kill();
    clearTimeout(settleTimer);
    // leave the mirror as it was found, so it works when this direction comes back
    gsap.killTweensOf([mist, symbol, ...rings]);
    gsap.set(mist, { opacity: 1 });
    gsap.set(rings, { scale: 1, opacity: 1, transformOrigin: '50% 50%' });
    gsap.set(symbol, { opacity: 0 });
    symbol.textContent = '';
    word.textContent = idleWord;
    surface.classList.remove('is-held');
    surface.removeEventListener('pointerdown', start); surface.removeEventListener('pointerup', stop); surface.removeEventListener('pointerleave', stop);
    surface.removeEventListener('pointercancel', stop); surface.removeEventListener('keydown', key); surface.removeEventListener('keyup', keyUp);
  };
}

/* ---------------------------------------------------------- page */

let cleanups: (() => void)[] = [];

export function stopDivination() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startDivination(world: World) {
  stopDivination();
  const el = document.querySelector<HTMLElement>('[data-divination] [data-mirror]');
  if (el) cleanups.push(initMirror(el, world));
}
