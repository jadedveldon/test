import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import type { World } from './world/World';

type Options = {
  calm: boolean;
  world: World | null;
  /** called as the eye-shaped opening starts revealing the hero */
  onReveal: () => void;
  /** called once the intro has fully gone */
  onDone: () => void;
};

const ORIGIN = '800 430'; // the third eye, in the SVG's 1600 × 1000 space

export function runLoader(el: HTMLElement, o: Options) {
  const q = <T extends Element = SVGElement>(s: string) => el.querySelector(s) as T;
  const qa = (s: string) => Array.from(el.querySelectorAll(s));

  const face = q('#loader-face');
  const ember = q('#loader-ember');
  const eyes = q('#loader-eyes');
  const lids = qa('.l-lid');
  const thirdWrap = q('#loader-third');
  const third = q('#loader-third-open');
  const thirdLine = q('#loader-third-line');
  const thirdGlow = q('#loader-third-glow');
  const core = q('#loader-third-core');
  const motes = qa('#loader-motes circle');
  const hole = q('#loader-hole');
  const note = q<HTMLElement>('.loader-note');
  const skip = q<HTMLButtonElement>('#loader-skip');

  // tall phone screens: frame the face instead of cropping the outer eyes
  const svg = el.querySelector('svg');
  if (svg && innerWidth / innerHeight < 0.8) {
    svg.setAttribute('viewBox', '380 80 840 1040');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.remove();
    o.onDone();
  };

  // calm mode: a still image that fades away
  if (o.calm) {
    gsap.set([ember, eyes], { opacity: 1 });
    gsap.set(lids, { y: -150 });
    gsap.set(third, { opacity: 1, scaleX: 1, svgOrigin: ORIGIN });
    gsap.set(thirdGlow, { opacity: 0.6 });
    o.onReveal();
    gsap.to(el, { opacity: 0, duration: 0.6, delay: 1.0, ease: 'sine.inOut', onComplete: finish });
    skip.addEventListener('click', finish, { once: true });
    return null;
  }

  gsap.set(lids, { y: 0 });
  gsap.set(third, { opacity: 0, scaleX: 0.04, svgOrigin: ORIGIN });
  gsap.set(face, { scale: 1, svgOrigin: ORIGIN });
  gsap.set(hole, { scale: 0, svgOrigin: ORIGIN });

  const tl = gsap.timeline({ onComplete: finish });
  tl.to(ember, { opacity: 1, duration: 1.1, ease: 'sine.out' }, 0)
    .to(eyes, { opacity: 1, duration: 0.7, ease: 'sine.out' }, 0.35)
    .to(lids, { y: -150, duration: 0.6, ease: 'power2.out' }, 0.65)
    // two slow blinks
    .to(lids, { y: 0, duration: 0.11, ease: 'power2.in' }, 1.35)
    .to(lids, { y: -150, duration: 0.22, ease: 'power2.out' }, 1.46)
    .to(lids, { y: 0, duration: 0.11, ease: 'power2.in' }, 1.8)
    .to(lids, { y: -150, duration: 0.26, ease: 'power2.out' }, 1.91)
    // light gathers and the third eye opens
    .to(thirdLine, { opacity: 1, duration: 0.3 }, 2.0)
    .to(motes, { opacity: 1, duration: 0.25, stagger: { each: 0.005, from: 'random' } }, 2.0)
    .to(motes, { attr: { cx: 800, cy: 430 }, opacity: 0, duration: 0.8, ease: 'power3.in', stagger: { each: 0.004, from: 'random' } }, 2.1)
    .to(thirdGlow, { opacity: 1, duration: 0.6 }, 2.35)
    .to(third, { opacity: 1, scaleX: 1, duration: 0.55, ease: 'back.out(1.7)' }, 2.62)
    .call(() => buzz(PATTERNS.eyeOpens), [], 2.62)
    .to(thirdLine, { opacity: 0, duration: 0.2 }, 2.7)
    // fly into the third eye
    .addLabel('zoom', 3.2)
    .call(() => {
      o.world?.impulse(3.5);
      o.world?.flash(0.7);
    }, [], 'zoom')
    .to([note, skip], { opacity: 0, duration: 0.3 }, 'zoom')
    .to(face, { scale: 9, duration: 1.0, ease: 'power3.in' }, 'zoom')
    .to(core, { opacity: 1, duration: 0.55, ease: 'power2.in' }, 'zoom+=0.3')
    // the eye-shaped opening grows and the hero is already inside it
    .call(() => o.onReveal(), [], 'zoom+=0.7')
    .fromTo(hole, { scale: 1.1 }, { scale: 40, duration: 1.05, ease: 'power2.inOut', immediateRender: false }, 'zoom+=0.6');

  // depth: layers drift at different rates with the pointer
  const ex = gsap.quickTo(eyes, 'x', { duration: 0.9, ease: 'power3' });
  const ey = gsap.quickTo(eyes, 'y', { duration: 0.9, ease: 'power3' });
  const tx = gsap.quickTo(thirdWrap, 'x', { duration: 0.9, ease: 'power3' });
  const ty = gsap.quickTo(thirdWrap, 'y', { duration: 0.9, ease: 'power3' });
  const gx = gsap.quickTo(ember, 'x', { duration: 1.2, ease: 'power3' });
  const onMove = (e: PointerEvent) => {
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    ex(x * 18); ey(y * 12); tx(x * 30); ty(y * 20); gx(x * -24);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  tl.eventCallback('onComplete', () => {
    window.removeEventListener('pointermove', onMove);
    finish();
  });

  skip.addEventListener('click', () => {
    tl.timeScale(4.5);
    if (tl.time() < tl.labels.zoom) tl.seek('zoom');
  }, { once: true });

  return tl;
}
