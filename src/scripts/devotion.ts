import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import type { WorldHandle as World } from './world/handle';
import { say } from './words';

/**
 * Pillar 1, Devotion & the Unseen · direction C, Cosmic mother.
 *   Turn the yantra: drag it into alignment and the bindu lights.
 *   The Greek gods: show one family at a time.
 * (Directions A, Midnight temple, and B, Smoke and ash, were compared and set
 * aside; they remain in the project history.)
 */

/* ------------------------------------------------- C · turn the yantra */

function initYantra(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('svg')!;
  const g = root.querySelector<SVGGElement>('[data-yt-rot]')!;
  const hint = root.querySelector<HTMLElement>('[data-yt-hint]')!;
  const st = { rot: 47, vel: 0, turned: 0, aligned: false };
  let dragging = false, last = 0, lastT = 0, raf = 0, prevNow = performance.now();
  const angleOf = (e: PointerEvent) => {
    const b = svg.getBoundingClientRect();
    return (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI;
  };
  const off = () => { const m = ((st.rot % 120) + 120) % 120; return m > 60 ? m - 120 : m; };
  const check = () => {
    const o = off();
    if (!st.aligned && st.turned > 50 && Math.abs(o) < 4 && Math.abs(st.vel) < 160) {
      st.aligned = true;
      st.vel = 0;
      gsap.to(st, { rot: st.rot - o, duration: 0.5, ease: 'power3.out' });
      root.classList.add('is-aligned');
      hint.textContent = say('devotion.aligned');
      ring('card');
      buzz(PATTERNS.cardFlip);
      world.flash(0.8);
      world.impulse(1.2);
    } else if (st.aligned && Math.abs(o) > 10) {
      st.aligned = false;
      st.turned = 0;
      root.classList.remove('is-aligned');
      hint.textContent = say('devotion.turn', {}, 'Drag to turn the yantra into alignment');
    }
  };
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prevNow) / 1000);
    prevNow = now;
    if (!dragging && Math.abs(st.vel) > 0.5) { st.rot += st.vel * dt; st.turned += Math.abs(st.vel * dt); st.vel *= Math.exp(-dt * 2.6); }
    g.setAttribute('transform', `rotate(${st.rot.toFixed(2)})`);
    svg.setAttribute('aria-valuenow', String(Math.round(((st.rot % 360) + 360) % 360)));
    check();
  };
  const down = (e: PointerEvent) => { dragging = true; last = angleOf(e); lastT = performance.now(); st.vel = 0; svg.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const a = angleOf(e), now = performance.now();
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    st.rot += d;
    st.turned += Math.abs(d);
    st.vel = (d / Math.max(1, now - lastT)) * 1000;
    last = a; lastT = now;
  };
  const up = () => { dragging = false; };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { st.rot += 5; st.turned += 5; e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { st.rot -= 5; st.turned += 5; e.preventDefault(); }
  };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', key);
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('keydown', key); };
}

/* ------------------------------------------- the families of the Greek gods */

function initElements(root: HTMLElement, world: World) {
  const grid = document.querySelector<HTMLElement>('[data-greek-grid]');
  if (!grid) return () => {};
  const onClick = (e: Event) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-el]');
    if (!b) return;
    const el = b.dataset.el!;
    root.querySelectorAll('[data-el]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    grid.dataset.show = el;
    buzz(PATTERNS.choice);
    world.flash(0.25);
    const shown = grid.querySelectorAll<HTMLElement>(el === 'all' ? '.greek-card' : `.greek-card[data-el="${el}"]`);
    gsap.fromTo(shown, { y: 14, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: 'power3.out', clearProps: 'opacity,transform' });
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

/* ------------------------------------------------------------- page */

let cleanups: (() => void)[] = [];

export function stopDevotion() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startDevotion(world: World, calm: boolean) {
  stopDevotion();
  const page = document.querySelector('[data-devotion]');
  if (!page) return;
  const y = page.querySelector<HTMLElement>('[data-yantra]');
  if (y && !calm) cleanups.push(initYantra(y, world));
  const el = page.querySelector<HTMLElement>('[data-elements]');
  if (el) cleanups.push(initElements(el, world));
}
