import gsap from 'gsap';
import { BREATHS, CHAKRAS, GROUNDING, PROMPTS } from '../data/healing';
import { buzz, PATTERNS } from './haptics';
import { ring, tick } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 3, Healing & Inner Work · Still water, with gold.
 *   The opening: breathing patterns (and a five-senses grounding)
 *   Energy:      the body of light, the seven chakras on a figure
 *   Shadow:      golden repair, a puzzle of straight-cut pieces set back with gold
 *   Journaling:  a prompt for today
 * Nothing here claims a health effect. All of it is made of page elements, so it
 * works in Calm too.
 */

const FONT = 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;1,300&display=swap';
let fontAdded = false;
export function loadHealingFont() {
  if (fontAdded || !document.querySelector('[data-healing], [data-chapter="healing"]')) return;
  fontAdded = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = FONT;
  document.head.appendChild(l);
}

const SVGNS = 'http://www.w3.org/2000/svg';
const MIN_R = 40, MAX_R = 104;

/* ------------------------------------------------- breathe, many ways */

function initBreath(root: HTMLElement, world: World) {
  const core = root.querySelector<SVGCircleElement>('[data-breath-core]')!;
  const hold = root.querySelector<SVGCircleElement>('[data-breath-hold]')!;
  const ripples = root.querySelector<SVGGElement>('[data-breath-ripples]')!;
  const sides = Array.from(root.querySelectorAll<SVGTextElement>('[data-side]'));
  const word = root.querySelector<HTMLElement>('[data-breath-word]')!;
  const count = root.querySelector<HTMLElement>('[data-breath-count]')!;
  const short = root.querySelector<HTMLElement>('[data-breath-short]')!;
  const about = root.querySelector<HTMLElement>('[data-breath-about]')!;
  const btn = root.querySelector<HTMLButtonElement>('[data-breath-toggle]')!;
  const ground = root.querySelector<HTMLElement>('[data-ground]')!;
  let mode = 'soft';
  let tl: gsap.core.Timeline | null = null;
  let timer = 0, rounds = 0, groundStep = 0;

  const ripple = () => {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('r', String(MIN_R + 10));
    c.setAttribute('class', 'br-ripple');
    ripples.appendChild(c);
    gsap.fromTo(c, { attr: { r: MIN_R + 10 }, opacity: 0.7 }, { attr: { r: 142 }, opacity: 0, duration: 3.2, ease: 'power1.out', onComplete: () => c.remove() });
    world.impulse(0.4);
  };
  const setSide = (side?: string) => sides.forEach((s) => s.classList.toggle('is-on', s.dataset.side === side));
  const countdown = (secs: number) => {
    clearInterval(timer);
    let left = Math.ceil(secs);
    count.textContent = String(left);
    timer = window.setInterval(() => { left -= 1; count.textContent = left > 0 ? String(left) : ''; if (left <= 0) clearInterval(timer); }, 1000);
  };
  const rest = (text: string) => {
    tl?.kill(); tl = null;
    clearInterval(timer);
    count.textContent = '';
    setSide();
    gsap.to(core, { attr: { r: MIN_R }, duration: 1.2, ease: 'sine.inOut' });
    gsap.to(hold, { opacity: 0, duration: 0.4 });
    btn.textContent = 'Begin';
    word.textContent = text;
  };
  const stop = () => {
    if (mode === 'ground') { ground.querySelectorAll('li').forEach((li) => li.classList.remove('is-on', 'is-done')); groundStep = 0; rest('Come back to the room whenever you like'); return; }
    const p = BREATHS.find((b) => b.key === mode)!;
    rest(rounds ? `${rounds} ${rounds === 1 ? 'round' : 'rounds'} of ${p.name.toLowerCase()}. Come back whenever you like.` : 'Choose a pattern, then begin');
  };
  const startBreath = () => {
    const p = BREATHS.find((b) => b.key === mode)!;
    rounds = 0;
    btn.textContent = 'Stop';
    tl = gsap.timeline({ repeat: p.rounds ? p.rounds - 1 : -1, onRepeat: () => { rounds++; }, onComplete: () => { rounds = p.rounds ?? rounds; stop(); } });
    let t = 0;
    p.phases.forEach((ph) => {
      tl!.call(() => {
        word.textContent = ph.say;
        countdown(ph.secs);
        setSide(ph.side);
        if (ph.kind === 'in') tick();
        if (ph.kind === 'out') ripple();
        gsap.to(hold, { opacity: ph.kind === 'hold' ? 1 : 0, duration: 0.5 });
      }, [], t);
      if (ph.kind !== 'hold') tl!.to(core, { attr: { r: MIN_R + (MAX_R - MIN_R) * ph.to }, duration: ph.secs, ease: 'sine.inOut' }, t);
      else tl!.to(core, { attr: { r: MIN_R + (MAX_R - MIN_R) * ph.to }, duration: ph.secs, ease: 'none' }, t);
      t += ph.secs;
    });
  };
  const startGround = () => {
    btn.textContent = 'Next';
    const items = Array.from(ground.querySelectorAll<HTMLElement>('li'));
    if (groundStep >= items.length) { stop(); return; }
    items.forEach((li, k) => { li.classList.toggle('is-on', k === groundStep); li.classList.toggle('is-done', k < groundStep); });
    const g = GROUNDING[groundStep];
    word.textContent = `Name ${g.n} ${g.sense}`;
    count.textContent = String(g.n);
    gsap.to(core, { attr: { r: MIN_R + ((MAX_R - MIN_R) * (5 - groundStep)) / 5 }, duration: 1.2, ease: 'sine.inOut' });
    ripple();
    groundStep++;
    if (groundStep >= items.length) btn.textContent = 'Finish';
  };
  const choose = (key: string) => {
    if (tl || groundStep) stop();
    mode = key;
    root.querySelectorAll<HTMLButtonElement>('[data-breath-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.breathMode === key)));
    const isGround = key === 'ground';
    ground.hidden = !isGround;
    root.classList.toggle('is-ground', isGround);
    root.classList.toggle('is-nadi', key === 'nadi');
    if (isGround) {
      short.textContent = 'Five senses, one at a time';
      about.textContent = 'A grounding exercise: name five things you can see, four you can touch, three you can hear, two you can smell and one you can taste. Take your time with each.';
      word.textContent = 'Begin when you are ready';
    } else {
      const p = BREATHS.find((b) => b.key === key)!;
      short.textContent = p.short;
      about.textContent = p.about;
      word.textContent = 'Begin when you are ready';
    }
    buzz(PATTERNS.choice);
  };
  const onClick = (e: Event) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-breath-mode]');
    if (b) choose(b.dataset.breathMode!);
  };
  const toggle = () => {
    if (mode === 'ground') { startGround(); buzz([6]); return; }
    if (tl) stop(); else startBreath();
    buzz(PATTERNS.choice);
  };
  root.addEventListener('click', onClick);
  btn.addEventListener('click', toggle);
  return () => { tl?.kill(); clearInterval(timer); root.removeEventListener('click', onClick); btn.removeEventListener('click', toggle); };
}

/* ------------------------------------------------ the body of light */

function initBody(root: HTMLElement, world: World) {
  const nodes = Array.from(root.querySelectorAll<SVGGElement>('[data-ck]'));
  const deva = root.querySelector<HTMLElement>('[data-bl-deva]')!;
  const name = root.querySelector<HTMLElement>('[data-bl-name]')!;
  const place = root.querySelector<HTMLElement>('[data-bl-place]')!;
  const work = root.querySelector<HTMLButtonElement>('[data-bl-work]')!;
  const show = (i: number, quiet = false) => {
    const c = CHAKRAS[i];
    nodes.forEach((n, k) => n.classList.toggle('is-on', k === i));
    root.style.setProperty('--ck', c.color);
    deva.textContent = c.deva;
    name.textContent = `${c.name} · ${c.english}`;
    place.textContent = `Placed ${c.place}.`;
    work.textContent = c.working;
    work.dataset.keep = c.working;
    work.setAttribute('aria-pressed', String(document.querySelector(`.chip-keep[data-keep="${CSS.escape(c.working)}"][aria-pressed="true"]:not([data-bl-work])`) !== null));
    if (!quiet) { ring('choice'); buzz([6]); world.flash(0.3); }
    gsap.fromTo([deva, name, place, work], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
  };
  const onClick = (e: Event) => { const n = (e.target as Element | null)?.closest<SVGGElement>('[data-ck]'); if (n) show(Number(n.dataset.ck)); };
  const onKey = (e: KeyboardEvent) => { const n = (e.target as Element | null)?.closest<SVGGElement>('[data-ck]'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(Number(n.dataset.ck)); } };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  show(3, true);
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
}

/* ------------------------------------- golden repair: a puzzle of pieces */

function initMend(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('[data-mend-svg]')!;
  const pieces = Array.from(root.querySelectorAll<SVGGElement>('[data-piece]'));
  const word = root.querySelector<HTMLElement>('[data-mend-word]')!;
  const note = root.querySelector<HTMLElement>('[data-mend-note]')!;
  const all = root.querySelector<HTMLButtonElement>('[data-mend-all]')!;
  const state = pieces.map((g) => {
    const m = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/.exec(g.getAttribute('transform') || '') || [];
    const x = Number(m[1] || 0), y = Number(m[2] || 0), r = Number(m[3] || 0);
    return { x, y, r, sx: x, sy: y, sr: r, home: false };
  });
  const place = (i: number) => pieces[i].setAttribute('transform', `translate(${state[i].x.toFixed(2)} ${state[i].y.toFixed(2)}) rotate(${state[i].r.toFixed(2)})`);
  const toSvg = (e: PointerEvent) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM()!.inverse()); };
  const left = () => state.filter((s) => !s.home).length;
  const settle = (i: number, quick = false) => {
    const s = state[i];
    if (s.home) return;
    s.home = true;
    pieces[i].classList.add('is-home');
    pieces[i].parentNode?.insertBefore(pieces[i], pieces[0]); // home pieces sit beneath the loose ones
    gsap.to(s, { x: 0, y: 0, r: 0, duration: quick ? 0.6 : 0.45, ease: 'power3.out', onUpdate: () => place(i) });
    tick();
    buzz([8]);
    const n = left();
    word.textContent = n ? `${n} ${n === 1 ? 'piece' : 'pieces'} to go` : 'Whole again, with gold where it broke';
    if (!n) {
      root.classList.add('is-whole');
      note.hidden = false;
      gsap.fromTo(note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.8 });
      all.textContent = 'Break it again';
      setTimeout(() => { ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.8); world.impulse(1.2); }, 700);
    }
  };
  let drag: { i: number; px: number; py: number; x: number; y: number; moved: number } | null = null;
  const down = (e: PointerEvent) => {
    const g = (e.target as Element | null)?.closest<SVGGElement>('[data-piece]');
    if (!g) return;
    const i = Number(g.dataset.piece);
    if (state[i].home) return;
    e.preventDefault();
    const p = toSvg(e);
    drag = { i, px: p.x, py: p.y, x: state[i].x, y: state[i].y, moved: 0 };
    g.parentNode?.appendChild(g); // the piece in hand comes to the top
    g.classList.add('is-held');
    svg.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const p = toSvg(e), s = state[drag.i];
    s.x = drag.x + (p.x - drag.px);
    s.y = drag.y + (p.y - drag.py);
    drag.moved = Math.max(drag.moved, Math.hypot(p.x - drag.px, p.y - drag.py));
    // as it nears home it turns upright, so the edges can meet
    const near = Math.hypot(s.x, s.y);
    s.r = s.sr * Math.min(1, near / 60);
    place(drag.i);
  };
  const up = () => {
    if (!drag) return;
    const { i, moved } = drag, s = state[i];
    pieces[i].classList.remove('is-held');
    drag = null;
    if (moved < 4 || Math.hypot(s.x, s.y) < 26) settle(i); // a tap, or dropped close enough: it clicks into place
  };
  const onKey = (e: KeyboardEvent) => {
    const g = (e.target as Element | null)?.closest<SVGGElement>('[data-piece]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); settle(Number(g.dataset.piece)); }
  };
  const reset = () => {
    root.classList.remove('is-whole');
    note.hidden = true;
    state.forEach((s, i) => {
      s.home = false;
      pieces[i].classList.remove('is-home');
      gsap.to(s, { x: s.sx, y: s.sy, r: s.sr, duration: 0.8, ease: 'power2.inOut', onUpdate: () => place(i) });
    });
    word.textContent = 'Drag each piece home, or tap it';
    all.textContent = 'Set them all back';
  };
  const onAll = () => {
    if (!left()) { reset(); return; }
    state.forEach((s, i) => { if (!s.home) setTimeout(() => settle(i, true), i * 140); });
  };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', onKey);
  all.addEventListener('click', onAll);
  return () => {
    svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up);
    svg.removeEventListener('pointercancel', up); svg.removeEventListener('keydown', onKey); all.removeEventListener('click', onAll);
  };
}

/* -------------------------------------- the journaling prompt card */

function initPrompt(root: HTMLElement) {
  const text = root.querySelector<HTMLElement>('[data-prompt-text]')!;
  const btn = root.querySelector<HTMLButtonElement>('[data-prompt-next]')!;
  const now = new Date();
  let i = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 864e5) % PROMPTS.length;
  const show = () => { text.textContent = PROMPTS[i]; gsap.fromTo(text, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6 }); };
  const next = () => { i = (i + 1) % PROMPTS.length; show(); buzz([5]); };
  text.textContent = PROMPTS[i];
  btn.addEventListener('click', next);
  return () => btn.removeEventListener('click', next);
}

/* ------------------------------------------------------------- page */

let cleanups: (() => void)[] = [];
export function stopHealing() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startHealing(world: World) {
  stopHealing();
  loadHealingFont();
  const page = document.querySelector('[data-healing]');
  if (!page) return;
  const run = (sel: string, fn: (el: HTMLElement, w: World) => () => void) => { const el = page.querySelector<HTMLElement>(sel); if (el) cleanups.push(fn(el, world)); };
  run('[data-breath]', initBreath);
  run('[data-body]', initBody);
  run('[data-mend]', initMend);
  run('[data-prompt]', (el) => initPrompt(el));
}
