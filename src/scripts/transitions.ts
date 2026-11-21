import gsap from 'gsap';
import type { World } from './world/World';
import { exp, type PageStyle } from './experiments';

/**
 * Page changes. The router waits for our cover animation and the next page
 * together, swaps the page while the screen is covered, then we reveal.
 *   eye   — the screen closes into the third eye and opens through it
 *   smoke — smoke rises and fills the screen, then clears (needs live 3D)
 *   ink   — ink blooms from where you tapped, then parts from the centre
 *   fade  — the plain cross-fade from the first prototype
 */
let px = innerWidth / 2;
let py = innerHeight / 2;
let pending: PageStyle | null = null;

const veil = () => document.getElementById('veil');

function show(mode: PageStyle) {
  const v = veil();
  if (!v) return;
  v.dataset.mode = mode;
  v.classList.add('is-on');
}

function hide() {
  const v = veil();
  if (!v) return;
  v.classList.remove('is-on');
  delete v.dataset.mode;
}

function cover(style: PageStyle, world: World): Promise<void> {
  return new Promise((resolve) => {
    if (style === 'eye') {
      show('eye');
      const hole = document.getElementById('veil-hole');
      const rim = document.getElementById('veil-rim');
      gsap.set([hole, rim], { scale: 42, svgOrigin: '800 500' });
      gsap.timeline({ onComplete: () => resolve() })
        .fromTo(rim, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
        .to([hole, rim], { scale: 0, duration: 0.7, ease: 'power3.in' }, 0);
    } else if (style === 'ink') {
      show('ink');
      const svg = document.querySelector<SVGSVGElement>('.veil-ink');
      const blot = document.getElementById('ink-blot');
      const hole = document.getElementById('ink-hole');
      let x = 800, y = 500;
      const ctm = svg?.getScreenCTM();
      if (svg && ctm) {
        const pt = svg.createSVGPoint();
        pt.x = px; pt.y = py;
        const p = pt.matrixTransform(ctm.inverse());
        x = p.x; y = p.y;
      }
      gsap.set(blot, { attr: { cx: x, cy: y, r: 0 } });
      gsap.set(hole, { attr: { r: 0 } });
      gsap.to(blot, { attr: { r: 1700 }, duration: 0.85, ease: 'power2.in', onComplete: () => resolve() });
    } else if (style === 'smoke') {
      gsap.to(world, { veil: 1, duration: 0.75, ease: 'power2.in', onComplete: () => resolve() });
      gsap.to(['#main', '.site-header'], { opacity: 0, duration: 0.5, ease: 'power1.in' });
    } else {
      resolve();
    }
  });
}

function reveal(style: PageStyle, world: World) {
  if (style === 'eye') {
    const hole = document.getElementById('veil-hole');
    const rim = document.getElementById('veil-rim');
    gsap.timeline({ onComplete: hide })
      .fromTo([hole, rim], { scale: 0 }, { scale: 42, svgOrigin: '800 500', duration: 1.05, ease: 'power2.inOut' }, 0.05)
      .to(rim, { opacity: 0, duration: 0.35 }, 0.75);
  } else if (style === 'ink') {
    const hole = document.getElementById('ink-hole');
    const blot = document.getElementById('ink-blot');
    gsap.to(hole, {
      attr: { r: 1800 }, duration: 1.05, ease: 'power2.out', delay: 0.05,
      onComplete: () => { gsap.set([blot, hole], { attr: { r: 0 } }); hide(); },
    });
  } else if (style === 'smoke') {
    gsap.fromTo(['#main', '.site-header'], { opacity: 0 }, { opacity: 1, duration: 1.0, delay: 0.3, ease: 'power2.out', clearProps: 'opacity' });
    gsap.to(world, { veil: 0, duration: 1.3, ease: 'power2.out' });
  }
}

export function initTransitions(world: World, isCalm: () => boolean) {
  document.addEventListener('pointerdown', (e) => { px = e.clientX; py = e.clientY; }, true);

  document.addEventListener('astro:before-preparation', (ev) => {
    let style: PageStyle = exp.page;
    if (isCalm()) style = 'fade';
    if (style === 'smoke' && !world.isLive) style = 'fade';
    // morph and fade are drawn by the browser itself (view transitions), so no cover is needed
    pending = style === 'fade' || style === 'morph' ? null : style;
    if (!pending) return;
    const e = ev as Event & { loader: () => Promise<void> };
    const original = e.loader;
    const chosen = pending;
    e.loader = async () => {
      await Promise.all([cover(chosen, world), original()]);
    };
  });

  document.addEventListener('astro:after-swap', () => {
    if (!pending) return;
    const style = pending;
    pending = null;
    reveal(style, world);
  });
}
