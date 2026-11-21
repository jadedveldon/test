import gsap from 'gsap';
import { read, store } from './tiers';
import type { World } from './world/World';

/* -------------------------------------------------------------- state */

export type HeroVariant = 'eye' | 'name' | 'dawn';
export type PageStyle = 'eye' | 'smoke' | 'ink' | 'fade';
export type Exp = {
  forms: 'on' | 'off';
  hero: HeroVariant;
  page: PageStyle;
  bend: 'on' | 'off';
  cursor: 'on' | 'off';
};

const DEFAULTS: Exp = { forms: 'on', hero: 'eye', page: 'eye', bend: 'on', cursor: 'on' };
const ALLOWED: Record<keyof Exp, string[]> = {
  forms: ['on', 'off'], hero: ['eye', 'name', 'dawn'], page: ['eye', 'smoke', 'ink', 'fade'], bend: ['on', 'off'], cursor: ['on', 'off'],
};
export const exp: Exp = { ...DEFAULTS };

/** each hero option uses its own atmosphere */
export const HERO_PRESET: Record<HeroVariant, string> = { eye: 'hero', name: 'heroName', dawn: 'dawn' };

export function loadExp() {
  const q = new URLSearchParams(location.search);
  (Object.keys(DEFAULTS) as (keyof Exp)[]).forEach((k) => {
    const fromUrl = q.get(k);
    if (fromUrl && ALLOWED[k].includes(fromUrl)) store(`sk-x-${k}`, fromUrl);
    const v = read(`sk-x-${k}`);
    if (v && ALLOWED[k].includes(v)) (exp as Record<string, string>)[k] = v;
  });
}

export function setExp<K extends keyof Exp>(k: K, v: Exp[K]) {
  exp[k] = v;
  store(`sk-x-${k}`, v as string);
}

/* -------------------------------------------------------------- panel */

export function initExpPanel(onChange: (k: keyof Exp, v: string) => void, world: World) {
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.querySelectorAll<HTMLElement>('[data-x]').forEach((group) => {
    const key = group.dataset.x as keyof Exp;
    group.querySelectorAll<HTMLButtonElement>('button[data-v]').forEach((b) => {
      b.addEventListener('click', () => {
        const v = b.dataset.v!;
        setExp(key, v as never);
        onChange(key, v);
        renderExpPanel();
      });
    });
  });
  hud.querySelectorAll<HTMLButtonElement>('button[data-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      const key = b.dataset.toggle as 'bend' | 'cursor';
      const v = exp[key] === 'on' ? 'off' : 'on';
      setExp(key, v);
      onChange(key, v);
      renderExpPanel();
    });
  });

  // phone tilt: offered on touch devices that report motion
  const tiltBtn = hud.querySelector<HTMLButtonElement>('[data-tilt]');
  const note = hud.querySelector<HTMLElement>('[data-tilt-note]');
  if (tiltBtn && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
    tiltBtn.hidden = false;
    tiltBtn.addEventListener('click', async () => {
      const msg = await enableTilt(world);
      tiltBtn.setAttribute('aria-pressed', String(msg.startsWith('On')));
      if (note) { note.textContent = msg; note.hidden = false; }
    });
  }
  renderExpPanel();
}

export function renderExpPanel() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.querySelectorAll<HTMLElement>('[data-x]').forEach((group) => {
    const key = group.dataset.x as keyof Exp;
    group.querySelectorAll<HTMLButtonElement>('button[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(exp[key] === b.dataset.v)));
  });
  hud.querySelectorAll<HTMLButtonElement>('button[data-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(exp[b.dataset.toggle as 'bend' | 'cursor'] === 'on'));
  });
}

/* ------------------------------------------------- flame cursor + magnets */

const finePointer = () => matchMedia('(pointer: fine)').matches;
let cursorActive = false;
let cursorReady = false;
let magnets = new WeakMap<Element, { x: (v: number) => void; y: (v: number) => void }>();
let lastMove: PointerEvent | null = null;
let rafPending = false;

function setupCursor() {
  if (cursorReady) return;
  const el = document.getElementById('cursor');
  if (!el) return;
  cursorReady = true;
  const flame = el.querySelector('.cursor-flame')!;
  const dot = el.querySelector('.cursor-dot')!;
  gsap.set([flame, dot], { xPercent: -50, yPercent: -50 });
  const fx = gsap.quickTo(flame, 'x', { duration: 0.45, ease: 'power3' });
  const fy = gsap.quickTo(flame, 'y', { duration: 0.45, ease: 'power3' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.06, ease: 'power2' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.06, ease: 'power2' });

  window.addEventListener('pointermove', (e) => {
    if (!cursorActive || e.pointerType !== 'mouse') return;
    el.classList.add('is-visible');
    fx(e.clientX); fy(e.clientY - 8); dx(e.clientX); dy(e.clientY);
    lastMove = e;
    if (!rafPending) { rafPending = true; requestAnimationFrame(pullMagnets); }
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    if (!cursorActive) return;
    const t = (e.target as Element | null)?.closest('a, button, summary, input, textarea, select, label');
    const isField = !!t && t.matches('input, textarea, select');
    el.classList.toggle('is-link', !!t && !isField);
    el.classList.toggle('is-field', isField);
  });
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('is-visible'));
}

function pullMagnets() {
  rafPending = false;
  const e = lastMove;
  if (!e || !cursorActive) return;
  document.querySelectorAll<HTMLElement>('.btn').forEach((b) => {
    const r = b.getBoundingClientRect();
    if (!r.width) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const reach = Math.max(r.width, r.height) * 0.5 + 56;
    let m = magnets.get(b);
    if (!m) {
      m = { x: gsap.quickTo(b, 'x', { duration: 0.55, ease: 'power3' }), y: gsap.quickTo(b, 'y', { duration: 0.55, ease: 'power3' }) };
      magnets.set(b, m);
    }
    if (Math.hypot(dx, dy) < reach) { m.x(dx * 0.22); m.y(dy * 0.32); } else { m.x(0); m.y(0); }
  });
}

export function setCursor(on: boolean) {
  setupCursor();
  cursorActive = on && finePointer();
  document.documentElement.classList.toggle('x-cursor', cursorActive);
  if (!cursorActive) {
    document.getElementById('cursor')?.classList.remove('is-visible');
    document.querySelectorAll<HTMLElement>('.btn').forEach((b) => gsap.to(b, { x: 0, y: 0, duration: 0.4 }));
  }
}

export function cursorIsActive() {
  return cursorActive;
}

export function resetMagnets() {
  magnets = new WeakMap();
}

/* ----------------------------------------------------------- phone tilt */

let tiltOn = false;
export async function enableTilt(world: World): Promise<string> {
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!DOE) return 'Not available on this device';
  try {
    if (typeof DOE.requestPermission === 'function') {
      const res = await DOE.requestPermission();
      if (res !== 'granted') return 'Permission was not given';
    }
  } catch {
    return 'Blocked in this viewer. It works on the real site.';
  }
  if (tiltOn) return 'On: tilt your phone';
  let got = false;
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    got = true;
    const x = Math.max(-1, Math.min(1, e.gamma / 28));
    const y = Math.max(-1, Math.min(1, -(e.beta - 45) / 28));
    world.setPointer(x, y);
  }, { passive: true });
  await new Promise((r) => setTimeout(r, 1200));
  tiltOn = got;
  return got ? 'On: tilt your phone' : 'No motion data here. It works on the real site.';
}

/* ------------------------------------------------------ living-eye hero */

let eyeKill: (() => void) | null = null;

/** the third eye stays open in the hero: its iris follows you and it blinks */
export function startHeroEye() {
  stopHeroEye();
  const wrap = document.querySelector<HTMLElement>('.hero-eye');
  const open = document.getElementById('he-open');
  const iris = document.getElementById('he-iris');
  if (!wrap || !open || !iris) return;
  const ix = gsap.quickTo(iris, 'x', { duration: 0.8, ease: 'power3' });
  const iy = gsap.quickTo(iris, 'y', { duration: 0.8, ease: 'power3' });
  const onMove = (e: PointerEvent) => {
    const r = wrap.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2);
    ix(Math.max(-1, Math.min(1, dx)) * 9);
    iy(Math.max(-1, Math.min(1, dy)) * 52);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  let call: gsap.core.Tween | null = null;
  const blink = () => {
    gsap.timeline()
      .to(open, { scaleX: 0.05, svgOrigin: '0 0', duration: 0.11, ease: 'power2.in' })
      .to(open, { scaleX: 1, svgOrigin: '0 0', duration: 0.22, ease: 'power2.out' });
    call = gsap.delayedCall(3.5 + Math.random() * 4, blink);
  };
  call = gsap.delayedCall(2.5, blink);
  eyeKill = () => {
    window.removeEventListener('pointermove', onMove);
    call?.kill();
  };
}

export function stopHeroEye() {
  eyeKill?.();
  eyeKill = null;
}
