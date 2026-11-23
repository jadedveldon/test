import gsap from 'gsap';
import { MAJOR, PENDULUM, SYMBOLS } from '../data/divination';
import { buzz, PATTERNS } from './haptics';
import { ring, tick } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 5, Divination & Insight: signature moments of the three directions.
 *   A · Draw three cards from the Major Arcana
 *   B · Still the water: hold the black mirror until a symbol rises
 *   C · Ask the pendulum, seen from above
 * All for reflection; nothing is predicted, kept or sent.
 */

const pick = <T,>(arr: readonly T[], n: number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};

/* ------------------------------------------------ A · draw three cards */

function initSpread(root: HTMLElement, world: World) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
  const btn = root.querySelector<HTMLButtonElement>('[data-draw-three]')!;
  let busy = false;
  const draw = () => {
    if (busy) return;
    busy = true;
    const open = cards.some((c) => c.classList.contains('is-open'));
    cards.forEach((c) => c.classList.remove('is-open'));
    setTimeout(() => {
      pick(MAJOR, 3).forEach(([num, name, words], i) => {
        const c = cards[i];
        c.querySelector('[data-card-num]')!.textContent = num;
        c.querySelector('[data-card-name]')!.textContent = name;
        c.querySelector('[data-card-words]')!.textContent = words;
        setTimeout(() => { c.classList.add('is-open'); tick(); buzz([6]); world.flash(0.2); if (i === 2) { ring('card'); busy = false; } }, 380 + i * 520);
      });
      btn.textContent = 'Draw again';
    }, open ? 450 : 0);
  };
  btn.addEventListener('click', draw);
  return () => btn.removeEventListener('click', draw);
}

/* --------------------------------------------- B · still the water */

const HOLD = 3.2;

function initMirror(root: HTMLElement, world: World) {
  const surface = root.querySelector<HTMLElement>('[data-mirror-surface]')!;
  const mist = root.querySelector<HTMLElement>('[data-mirror-mist]')!;
  const rings = Array.from(root.querySelectorAll<SVGEllipseElement>('.mr-ring'));
  const symbol = root.querySelector<HTMLElement>('[data-mirror-symbol]')!;
  const word = root.querySelector<HTMLElement>('[data-mirror-word]')!;
  let tl: gsap.core.Timeline | null = null, done = false;
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
    const [what, q] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    symbol.textContent = what;
    gsap.fromTo(symbol, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out' });
    word.textContent = q;
    ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.4);
    setTimeout(() => { gsap.to(mist, { opacity: 0.55, duration: 3 }); gsap.to(rings, { scale: 1, opacity: 1, duration: 3, transformOrigin: '50% 50%' }); }, 2500);
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
    surface.removeEventListener('pointerdown', start); surface.removeEventListener('pointerup', stop); surface.removeEventListener('pointerleave', stop);
    surface.removeEventListener('pointercancel', stop); surface.removeEventListener('keydown', key); surface.removeEventListener('keyup', keyUp);
  };
}

/* ------------------------------------------- C · ask the pendulum */

function initPendulum(root: HTMLElement, world: World) {
  const bob = root.querySelector<SVGGElement>('[data-pendulum-bob]')!;
  const chain = root.querySelector<SVGLineElement>('[data-pendulum-chain]')!;
  const trail = root.querySelector<SVGPathElement>('[data-pendulum-trail]')!;
  const word = root.querySelector<HTMLElement>('[data-pendulum-word]')!;
  const btn = root.querySelector<HTMLButtonElement>('[data-pendulum-ask]')!;
  let raf = 0, t0 = 0;
  const pts: number[][] = [];
  const place = (x: number, y: number) => {
    bob.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    chain.setAttribute('x2', x.toFixed(1)); chain.setAttribute('y2', y.toFixed(1));
    pts.push([x, y]); if (pts.length > 70) pts.shift();
    trail.setAttribute('d', pts.length > 1 ? `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')}` : '');
  };
  const swing = () => {
    cancelAnimationFrame(raf);
    const answer = PENDULUM[Math.floor(Math.random() * PENDULUM.length)];
    const w = 2.4, seedA = Math.random() * 6, seedB = Math.random() * 6;
    t0 = performance.now();
    word.textContent = 'Let it find its way…';
    btn.disabled = true;
    pts.length = 0;
    let told = false;
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      // first it wanders, then it settles into its answer, then it slows to stillness
      const wander = Math.max(0, 1 - t / 2.6), settle = Math.min(1, Math.max(0, (t - 1.2) / 2.2)), fade = t > 7 ? Math.max(0, 1 - (t - 7) / 3) : 1;
      const A = 96 * fade;
      let x = (Math.sin(t * 1.7 + seedA) * 46 + Math.sin(t * 2.9 + seedB) * 22) * wander;
      let y = (Math.cos(t * 1.3 + seedB) * 40 + Math.sin(t * 2.3 + seedA) * 20) * wander;
      const ph = Math.sin(t * w);
      if (answer.swing === 'line') y += ph * A * settle;
      if (answer.swing === 'side') x += ph * A * settle;
      if (answer.swing === 'circle') { x += Math.cos(t * w) * A * 0.7 * settle; y += Math.sin(t * w) * A * 0.7 * settle; }
      place(x, y);
      if (!told && t > 4.6) { told = true; word.textContent = answer.say; ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.3); }
      if (t < 10) raf = requestAnimationFrame(frame);
      else { btn.disabled = false; btn.textContent = 'Ask again'; }
    };
    tick();
    raf = requestAnimationFrame(frame);
  };
  btn.addEventListener('click', swing);
  place(0, 0);
  return () => { cancelAnimationFrame(raf); btn.removeEventListener('click', swing); };
}

export function startDivination(world: World, dir: 'a' | 'b' | 'c') {
  const out: (() => void)[] = [];
  const page = document.querySelector('[data-dir-pillar="divination"]');
  if (!page) return out;
  if (dir === 'a') { const el = page.querySelector<HTMLElement>('[data-spread]'); if (el) out.push(initSpread(el, world)); }
  if (dir === 'b') { const el = page.querySelector<HTMLElement>('[data-mirror]'); if (el) out.push(initMirror(el, world)); }
  if (dir === 'c') { const el = page.querySelector<HTMLElement>('[data-pendulum]'); if (el) out.push(initPendulum(el, world)); }
  return out;
}
