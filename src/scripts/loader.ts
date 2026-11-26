import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import type { WorldHandle as World } from './world/handle';

type Options = {
  calm: boolean;
  world: World | null;
  /** called as the eye-shaped opening starts revealing the hero */
  onReveal: () => void;
  /** called once the intro has fully gone */
  onDone: () => void;
};

const ORIGIN = '800 300'; // the third eye, in the SVG's 1600 × 1000 space
const OPEN = -180; // how far the lids lift

export function runLoader(el: HTMLElement, o: Options) {
  const q = <T extends Element = SVGElement>(s: string) => el.querySelector(s) as T;
  const qa = (s: string) => Array.from(el.querySelectorAll(s));

  const face = q('#loader-face');
  const ember = q('#loader-ember');
  const eyes = q('#loader-eyes');
  const marks = q('#loader-marks');
  const lower = q('#loader-lower');
  const lids = qa('.l-lid');
  const thirdWrap = q('#loader-third');
  const third = q('#loader-third-open');
  const thirdLine = q('#loader-third-line');
  const thirdGlow = q('#loader-third-glow');
  const rays = q('#loader-rays');
  const core = q('#loader-third-core');
  const motes = qa('#loader-motes circle');
  const hole = q('#loader-hole');
  const skip = q<HTMLButtonElement>('#loader-skip');

  // tall phone screens: frame the whole face (brows to nose ring) instead of cropping the wings of the eyes
  const svg = el.querySelector('svg');
  if (svg && innerWidth / innerHeight < 0.8) {
    svg.setAttribute('viewBox', '330 110 940 850');
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
    gsap.set([ember, eyes, marks, lower], { opacity: 1 });
    gsap.set(lids, { y: OPEN });
    gsap.set(third, { opacity: 1, scaleX: 1, svgOrigin: ORIGIN });
    gsap.set(thirdGlow, { opacity: 0.6 });
    gsap.set(rays, { opacity: 0.8 });
    gsap.set(hole, { scale: 0, svgOrigin: ORIGIN }); // the opening stays shut: the face is shown whole
    o.onReveal();
    // the face goes first, then the darkness behind it, so the face never lies over the page's own words
    gsap.timeline({ delay: 1.2, onComplete: finish })
      .to(face, { opacity: 0, duration: 0.45, ease: 'sine.in' })
      .to(el, { opacity: 0, duration: 0.45, ease: 'sine.inOut' });
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
    .to(lids, { y: OPEN, duration: 0.6, ease: 'power2.out' }, 0.65)
    .to(lower, { opacity: 1, duration: 0.8, ease: 'sine.out' }, 0.9)
    // two slow blinks
    .to(lids, { y: 0, duration: 0.11, ease: 'power2.in' }, 1.35)
    .to(lids, { y: OPEN, duration: 0.22, ease: 'power2.out' }, 1.46)
    .to(lids, { y: 0, duration: 0.11, ease: 'power2.in' }, 1.8)
    .to(lids, { y: OPEN, duration: 0.26, ease: 'power2.out' }, 1.91)
    // the crescent and the bindi glow as the light begins to gather
    .to(marks, { opacity: 1, duration: 0.5, ease: 'sine.out' }, 1.75)
    // light gathers and the third eye opens
    .to(thirdLine, { opacity: 1, duration: 0.3 }, 2.0)
    .to(motes, { opacity: 1, duration: 0.25, stagger: { each: 0.005, from: 'random' } }, 2.0)
    .to(motes, { attr: { cx: 800, cy: 300 }, opacity: 0, duration: 0.8, ease: 'power3.in', stagger: { each: 0.004, from: 'random' } }, 2.1)
    .to(thirdGlow, { opacity: 1, duration: 0.6 }, 2.35)
    // a ring of rays gathers round the third eye and turns as it opens
    .fromTo(rays, { opacity: 0, scale: 0.82, rotation: -12, svgOrigin: ORIGIN }, { opacity: 1, scale: 1, rotation: 0, svgOrigin: ORIGIN, duration: 0.9, ease: 'power2.out' }, 2.3)
    .to(third, { opacity: 1, scaleX: 1, duration: 0.55, ease: 'back.out(1.7)' }, 2.62)
    .call(() => buzz(PATTERNS.eyeOpens), [], 2.62)
    .to(thirdLine, { opacity: 0, duration: 0.2 }, 2.7)
    // fly into the third eye
    .addLabel('zoom', 3.2)
    .call(() => {
      o.world?.impulse(3.5);
      o.world?.flash(0.7);
    }, [], 'zoom')
    .to(skip, { opacity: 0, duration: 0.3 }, 'zoom')
    .to(face, { scale: 9, duration: 1.0, ease: 'power3.in' }, 'zoom')
    .to(core, { opacity: 1, duration: 0.55, ease: 'power2.in' }, 'zoom+=0.3')
    // the eye-shaped opening grows and the hero is already inside it
    .call(() => o.onReveal(), [], 'zoom+=0.7')
    .fromTo(hole, { scale: 1.1 }, { scale: 40, duration: 1.05, ease: 'power2.inOut', immediateRender: false }, 'zoom+=0.6');

  // depth: layers drift at different rates with the pointer
  const ex = gsap.quickTo([eyes, marks, lower], 'x', { duration: 0.9, ease: 'power3' });
  const ey = gsap.quickTo([eyes, marks, lower], 'y', { duration: 0.9, ease: 'power3' });
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
