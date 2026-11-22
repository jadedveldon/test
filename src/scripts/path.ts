import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Find your path: three questions that point to a pillar, a category and a
 * way to begin. The world behind the page turns into each pillar's world as
 * you hover and choose. Nothing is stored or sent.
 */
export function initPath(world: World, done: () => void) {
  const root = document.querySelector<HTMLElement>('[data-path]');
  if (!root) return;
  const steps = Array.from(root.querySelectorAll<HTMLElement>('.path-q'));
  const result = root.querySelector<HTMLElement>('.path-result')!;
  const back = root.querySelector<HTMLButtonElement>('[data-path-back]')!;
  const restart = root.querySelector<HTMLButtonElement>('[data-path-restart]')!;
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));
  const choice: { pillar?: HTMLElement; category?: HTMLElement; begin?: string } = {};
  let step = 1;
  let chosenPreset = 'connect';

  const preview = (preset: string) => world.setSequence([preset]);

  function show(n: number) {
    const from = step === 4 ? result : steps[step - 1];
    const to = n === 4 ? result : steps[n - 1];
    step = n;
    dots.forEach((d, i) => {
      d.toggleAttribute('data-done', i + 1 < n);
      if (i + 1 === Math.min(n, 3)) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    back.hidden = n === 1 || n === 4;
    restart.hidden = n !== 4;
    gsap.to(from, {
      opacity: 0, y: -16, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        from.hidden = true;
        to.hidden = false;
        gsap.fromTo(to, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
        gsap.fromTo(to.querySelectorAll('.path-options:not([hidden]) .path-opt'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', delay: 0.05 });
        const first = to.querySelector<HTMLElement>('.path-options:not([hidden]) .path-opt, a.btn');
        first?.focus({ preventScroll: true });
        done();
      },
    });
  }

  function choose() {
    buzz(PATTERNS.choice);
    ring('choice');
    world.flash(0.35);
  }

  // hovering an answer in the first question previews that pillar's world
  steps[0].querySelectorAll<HTMLElement>('[data-pillar]').forEach((b) => {
    const on = () => preview(b.dataset.preset!);
    b.addEventListener('pointerenter', on);
    b.addEventListener('focus', on);
    b.addEventListener('pointerleave', () => preview(chosenPreset));
    b.addEventListener('click', () => {
      choice.pillar = b;
      chosenPreset = b.dataset.preset!;
      preview(chosenPreset);
      steps[1].querySelectorAll<HTMLElement>('[data-for]').forEach((g) => (g.hidden = g.dataset.for !== b.dataset.pillar));
      choose();
      show(2);
    });
  });
  steps[1].querySelectorAll<HTMLElement>('[data-category]').forEach((b) => {
    b.addEventListener('click', () => { choice.category = b; choose(); show(3); });
  });
  steps[2].querySelectorAll<HTMLElement>('[data-begin]').forEach((b) => {
    b.addEventListener('click', () => {
      choice.begin = b.dataset.begin;
      choose();
      const pillar = choice.pillar!.dataset.name!;
      const cat = choice.category!.dataset.category!;
      const how = choice.begin === 'learn' ? 'a class or mentoring' : choice.begin === 'session' ? 'a session or reading' : 'a first conversation';
      result.querySelector('[data-result-pillar]')!.textContent = cat;
      result.querySelector('[data-result-text]')!.textContent =
        `Part of ${pillar}. You would like to begin with ${how}. Send a request and Sarvakali will reply with a time, or suggest another way in.`;
      const connect = result.querySelector<HTMLAnchorElement>('[data-result-connect]')!;
      connect.dataset.topic = `${cat} (${how})`;
      const explore = result.querySelector<HTMLAnchorElement>('[data-result-explore]')!;
      // the pillar's address comes from a link in the page, so it works wherever the site is hosted
      const base = steps[1].querySelector<HTMLAnchorElement>(`[data-for="${choice.pillar!.dataset.pillar}"] [data-explore]`)!.getAttribute('href')!;
      explore.setAttribute('href', `${base.split('#')[0]}#${choice.category!.dataset.anchor}`);
      explore.textContent = `See everything in ${pillar}`;
      world.impulse(1.5);
      show(4);
    });
  });
  back.addEventListener('click', () => {
    if (step === 2) { chosenPreset = 'connect'; preview('connect'); }
    show(step - 1);
  });
  restart.addEventListener('click', () => { chosenPreset = 'connect'; preview('connect'); show(1); });
}
