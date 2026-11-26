/**
 * A guided practice, one step at a time (src/pages/practice/with/[slug].astro). The steps are on the page already;
 * this shows one at a time and brings each to life: the breath (a circle to follow), the lamp, the counter for a
 * mantra, a line to reflect on (kept in the journal if the visitor ticks it), the offering to the fire. At the end
 * the practice is marked in the visitor's own record. Everything stays on this device. Returns a stop function.
 */
import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { crackle, ring, tick } from './audio';
import { addJournal, logMantra, logPractice, logSession, stats } from './practice-log';
import type { WorldHandle as World } from './world/handle';

export function startSession(world: World) {
  const root = document.querySelector<HTMLElement>('[data-session]');
  if (!root) return () => {};
  const W = JSON.parse(root.querySelector('[data-session-words]')?.textContent || '{}') as Record<string, string>;
  const intro = root.querySelector<HTMLElement>('[data-session-intro]')!;
  const run = root.querySelector<HTMLElement>('[data-session-run]')!;
  const done = root.querySelector<HTMLElement>('[data-session-done]')!;
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-session-dots] li'));
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));
  const begin = root.querySelector<HTMLButtonElement>('[data-session-begin]')!;
  const slug = root.dataset.slug!;
  let at = -1;
  let began = 0;
  let tl: gsap.core.Timeline | gsap.core.Tween | null = null;
  let timers: number[] = [];
  const offs: (() => void)[] = [];
  const on = (el: EventTarget, type: string, fn: (e: Event) => void) => { el.addEventListener(type, fn); offs.push(() => el.removeEventListener(type, fn)); };
  /** repetitions counted in the step on screen, still to be recorded */
  let pending: { slug: string; n: number } | null = null;
  const settle = () => { if (pending?.n) logMantra(pending.slug, pending.n); pending = null; };
  const clear = () => { tl?.kill(); tl = null; timers.forEach(clearTimeout); timers = []; settle(); };

  // with scripts: the intro first, then one step at a time
  run.hidden = true;
  begin.hidden = false;
  root.querySelectorAll<HTMLElement>('[data-step-nav]').forEach((n) => { n.hidden = false; });
  root.querySelector<HTMLElement>('[data-session-dots]')!.hidden = false;
  steps.forEach((s) => { s.hidden = true; });

  const show = (i: number) => {
    clear();
    at = i;
    steps.forEach((s, j) => { s.hidden = j !== i; });
    dots.forEach((d, j) => { d.classList.toggle('is-done', j < i); d.toggleAttribute('aria-current', j === i); });
    const s = steps[i];
    const type = s.dataset.type;
    if (type === 'breathe') breathe(s);
    if (type === 'chant') counter(s);
    gsap.fromTo(s, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    s.querySelector<HTMLElement>('h2')?.focus?.();
    run.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function breathe(s: HTMLElement) {
    const circle = s.querySelector<HTMLElement>('.rb-circle');
    const word = s.querySelector<HTMLElement>('[data-rb-word]');
    const count = s.querySelector<HTMLElement>('[data-rb-count]');
    if (!circle || !word || !count) return;
    const total = Number(s.dataset.count) || 4;
    const long = s.dataset.pattern === 'long';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let n = 0;
    const one = () => {
      if (n >= total) { count.textContent = ''; word.textContent = '·'; return; }
      n++;
      count.textContent = `${n} / ${total}`;
      word.textContent = W.breatheIn;
      tl = gsap.timeline({ onComplete: one })
        .to(circle, { scale: reduce ? 1 : 1.55, opacity: 1, duration: 4, ease: 'sine.inOut' })
        .call(() => { word.textContent = W.breatheOut; })
        .to(circle, { scale: 1, opacity: 0.55, duration: long ? 6 : 4, ease: 'sine.inOut' });
    };
    one();
  }

  function counter(s: HTMLElement) {
    const btn = s.querySelector<HTMLButtonElement>('[data-japa]');
    if (!btn) return;
    const fill = s.querySelector<SVGCircleElement>('.rj-fill')!;
    const num = s.querySelector<HTMLElement>('[data-japa-n]')!;
    const of = s.querySelector<HTMLElement>('[data-japa-of]')!;
    let target = Number(s.querySelector<HTMLElement>('[data-count][aria-checked="true"]')?.dataset.count || s.dataset.count || 11);
    let n = 0;
    pending = { slug: s.dataset.mantra!, n: 0 };
    const draw = () => { num.textContent = String(n); of.textContent = `/ ${target}`; fill.style.strokeDashoffset = String(1 - Math.min(1, n / target)); };
    draw();
    s.querySelectorAll<HTMLButtonElement>('[data-count]').forEach((b) => {
      b.onclick = () => {
        target = Number(b.dataset.count);
        s.querySelectorAll('[data-count]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        draw();
      };
    });
    btn.onclick = () => {
      if (n >= target) return;
      n++;
      if (pending) pending.n = n;
      draw();
      world.setMalaCount(n % 109);
      tick(n === target); buzz([5]);
      if (n === target) { world.flash(0.6); settle(); timers.push(window.setTimeout(() => { if (at === steps.indexOf(s)) s.querySelector<HTMLButtonElement>('[data-next]')?.focus(); }, 300)); }
    };
  }

  // the space bar counts while a chant step is on screen
  on(document, 'keydown', (e) => {
    const k = e as KeyboardEvent;
    if (k.key !== ' ' || at < 0 || steps[at]?.dataset.type !== 'chant') return;
    if ((k.target as HTMLElement)?.closest('input, textarea, select, a, button:not([data-japa])')) return;
    k.preventDefault();
    steps[at].querySelector<HTMLButtonElement>('[data-japa]')?.click();
  });

  // the lamp, the offering, the reflection
  steps.forEach((s, i) => {
    const lamp = s.querySelector<HTMLButtonElement>('[data-lamp]');
    if (lamp) on(lamp, 'click', () => {
      if (lamp.getAttribute('aria-pressed') === 'true') return;
      lamp.setAttribute('aria-pressed', 'true');
      lamp.querySelector('[data-lamp-label]')!.textContent = W.lit;
      buzz(PATTERNS.diya); world.flash(0.6); ring('card');
      logPractice({ diya: 1 });
    });
    const form = s.querySelector<HTMLFormElement>('[data-offer]');
    if (form) on(form, 'submit', (e) => {
      e.preventDefault();
      const ta = form.querySelector('textarea')!;
      const text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      ta.value = '';
      form.hidden = true;
      const words = s.querySelector<HTMLElement>('[data-offer-words]')!;
      words.textContent = text; words.hidden = false;
      crackle(); buzz(PATTERNS.diya); world.flash(0.5);
      logPractice({ fire: 1 });
      tl = gsap.to(words, { opacity: 0, y: -50, filter: 'blur(8px)', duration: 2.4, ease: 'power1.in', onComplete: () => { words.hidden = true; } });
    });
    const next = s.querySelector<HTMLButtonElement>('[data-next]');
    if (next) on(next, 'click', () => {
      const ta = s.querySelector<HTMLTextAreaElement>('[data-reflect]');
      if (ta && s.querySelector<HTMLInputElement>('[data-reflect-keep]')?.checked) addJournal(ta.value, 'reflection');
      if (i < steps.length - 1) show(i + 1); else finish();
    });
    const back = s.querySelector<HTMLButtonElement>('[data-back]');
    if (back) on(back, 'click', () => show(i - 1));
  });

  const finish = () => {
    clear();
    const minutes = Math.max(1, Math.round((Date.now() - began) / 60000));
    logPractice({ rite: 1, minutes });
    logSession(slug);
    run.hidden = true;
    done.hidden = false;
    const st = stats();
    const streak = done.querySelector('[data-done-streak]');
    if (streak) streak.textContent = st.streak > 1 ? (W.streak || '{n} days in a row').replace('{n}', String(st.streak)) : W.first || '';
    world.impulse(1.4); ring('card');
    done.focus({ preventScroll: true });
    done.scrollIntoView({ behavior: 'smooth', block: 'start' });
    gsap.fromTo(done, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' });
  };

  on(begin, 'click', () => {
    began = Date.now();
    intro.hidden = true;
    done.hidden = true;
    run.hidden = false;
    show(0);
  });
  const again = root.querySelector<HTMLButtonElement>('[data-session-again]');
  if (again) on(again, 'click', () => { done.hidden = true; intro.hidden = false; intro.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  return () => { clear(); offs.forEach((f) => f()); };
}
