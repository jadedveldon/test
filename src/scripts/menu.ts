import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import type { WorldHandle as World } from './world/handle';

/** the full-screen menu: every page, in large type, over the living world */
let world: World | null = null;
let lastFocus: HTMLElement | null = null;

export function openMenu() {
  const m = document.getElementById('menu');
  if (!m || !m.hidden) return;
  lastFocus = document.activeElement as HTMLElement | null;
  m.hidden = false;
  document.documentElement.classList.add('menu-open');
  document.querySelectorAll('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  buzz(PATTERNS.choice);
  world?.flash(0.25);
  gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
  gsap.fromTo(m.querySelectorAll('.menu-main a'), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.045, delay: 0.05 });
  gsap.fromTo(m.querySelectorAll('.menu-side > *'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.03, delay: 0.2 });
  m.querySelector<HTMLElement>('.menu-main a')?.focus({ preventScroll: true });
}

export function closeMenu(instant = false) {
  const m = document.getElementById('menu');
  document.documentElement.classList.remove('menu-open');
  document.querySelectorAll('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  if (!m || m.hidden) return;
  if (instant) { m.hidden = true; return; }
  gsap.to(m, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => { m.hidden = true; lastFocus?.focus?.(); } });
}

let ready = false;
export function initMenu(w: World) {
  world = w;
  if (ready) return;
  ready = true;
  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (t?.closest('[data-menu-open]')) { e.preventDefault(); openMenu(); return; }
    if (t?.closest('[data-menu-close]')) { closeMenu(); return; }
    if (t?.closest('#menu a')) closeMenu(true);
  });
  document.addEventListener('keydown', (e) => {
    const m = document.getElementById('menu');
    if (!m || m.hidden) return;
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key === 'Tab') { // keep focus inside the menu
      const f = Array.from(m.querySelectorAll<HTMLElement>('a, button'));
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
}
