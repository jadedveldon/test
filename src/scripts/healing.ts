import gsap from 'gsap';
import { CHAKRAS, HEAL_DIRECTIONS, PROMPTS, type HealDir } from '../data/healing';
import { buzz, PATTERNS } from './haptics';
import { ring, tick } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 3, Healing & Inner Work: the three directions being compared, and
 * each one's signature moment. Nothing here claims a health effect.
 *   A · Still water:       breathe with the water
 *   B · The body of light: tap the seven chakras on a figure
 *   C · Golden repair:     mend a broken bowl with gold (kintsugi)
 * All three share the journaling prompt card.
 */

const fonts = new Set<string>();
export function applyHealDirection(dir: HealDir) {
  document.documentElement.dataset.heal = dir;
  const d = HEAL_DIRECTIONS.find((x) => x.key === dir);
  if (d && !fonts.has(d.type.fontHref) && document.querySelector('[data-healing], [data-chapter="healing"]')) {
    fonts.add(d.type.fontHref);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = d.type.fontHref;
    document.head.appendChild(l);
  }
  document.querySelectorAll<HTMLElement>('[data-heal-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.healSet === dir)));
}

/* --------------------------------------- A · breathe with the water */

const IN = 4, OUT = 6;

function initBreath(root: HTMLElement, world: World) {
  const core = root.querySelector<SVGCircleElement>('[data-breath-core]')!;
  const ripples = root.querySelector<SVGGElement>('[data-breath-ripples]')!;
  const word = root.querySelector<HTMLElement>('[data-breath-word]')!;
  const btn = root.querySelector<HTMLButtonElement>('[data-breath-toggle]')!;
  let tl: gsap.core.Timeline | null = null;
  let breaths = 0;
  const ripple = () => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', '60');
    c.setAttribute('class', 'br-ripple');
    ripples.appendChild(c);
    gsap.fromTo(c, { attr: { r: 60 }, opacity: 0.7 }, { attr: { r: 140 }, opacity: 0, duration: 3.2, ease: 'power1.out', onComplete: () => c.remove() });
    world.impulse(0.5);
  };
  const say = (t: string) => { word.textContent = t; };
  const stop = () => {
    tl?.kill();
    tl = null;
    gsap.to(core, { attr: { r: 46 }, duration: 1.2, ease: 'sine.inOut' });
    btn.textContent = 'Begin';
    say(breaths ? `${breaths} slow ${breaths === 1 ? 'breath' : 'breaths'}. Come back whenever you like.` : 'Ready when you are');
  };
  const start = () => {
    breaths = 0;
    btn.textContent = 'Stop';
    tl = gsap.timeline({ repeat: -1 });
    tl.call(() => { say('Breathe in'); tick(); }, [], 0)
      .to(core, { attr: { r: 104 }, duration: IN, ease: 'sine.inOut' }, 0)
      .call(() => { say('And out'); ripple(); }, [], IN)
      .to(core, { attr: { r: 46 }, duration: OUT, ease: 'sine.inOut' }, IN)
      .call(() => { breaths++; }, [], IN + OUT - 0.01);
  };
  const toggle = () => { if (tl) stop(); else start(); buzz(PATTERNS.choice); };
  btn.addEventListener('click', toggle);
  return () => { tl?.kill(); btn.removeEventListener('click', toggle); };
}

/* ------------------------------------- B · the body of light */

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
    // keep the chip's kept state in step with the visitor's list
    work.setAttribute('aria-pressed', String(document.querySelector(`.chip-keep[data-keep="${CSS.escape(c.working)}"][aria-pressed="true"]:not([data-bl-work])`) !== null));
    if (!quiet) { ring('choice'); buzz([6]); world.flash(0.3); }
    gsap.fromTo([deva, name, place, work], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
  };
  const onClick = (e: Event) => {
    const n = (e.target as Element | null)?.closest<SVGGElement>('[data-ck]');
    if (n) show(Number(n.dataset.ck));
  };
  const onKey = (e: KeyboardEvent) => {
    const n = (e.target as Element | null)?.closest<SVGGElement>('[data-ck]');
    if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(Number(n.dataset.ck)); }
  };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  show(3, true);
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
}

/* ------------------------------------------- C · mend the bowl */

function initMend(root: HTMLElement, world: World) {
  const shards = Array.from(root.querySelectorAll<SVGGElement>('[data-shard]'));
  const seams = Array.from(root.querySelectorAll<SVGPathElement>('[data-seam]'));
  const word = root.querySelector<HTMLElement>('[data-mend-word]')!;
  const note = root.querySelector<HTMLElement>('[data-mend-note]')!;
  const all = root.querySelector<HTMLButtonElement>('[data-mend-all]')!;
  const home = new Set<number>();
  // where each piece lies scattered, read from the drawing itself
  const start = shards.map((s) => {
    const m = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/.exec(s.getAttribute('transform') || '') || [];
    return { x: Number(m[1] || 0), y: Number(m[2] || 0), r: Number(m[3] || 0) };
  });
  seams.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L}`; p.style.strokeDashoffset = `${L}`; });
  const goldSeam = (k: number) => {
    const p = seams[k];
    gsap.to(p, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', delay: 0.35 });
  };
  const mend = (i: number, quick = false) => {
    if (home.has(i)) return;
    home.add(i);
    const s = shards[i], st = { ...start[i] };
    s.classList.add('is-home');
    gsap.to(st, {
      x: 0, y: 0, r: 0, duration: quick ? 0.7 : 0.9, ease: 'power3.out',
      onUpdate: () => s.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) rotate(${st.r.toFixed(2)})`),
    });
    tick();
    buzz([8]);
    // a seam turns gold once the pieces on both sides of it are back
    if (i > 0 && home.has(i - 1)) goldSeam(i - 1);
    if (i < shards.length - 1 && home.has(i + 1)) goldSeam(i);
    const left = shards.length - home.size;
    word.textContent = left ? `${left} ${left === 1 ? 'piece' : 'pieces'} to go` : 'Whole again, with gold where it broke';
    if (!left) {
      root.classList.add('is-whole');
      note.hidden = false;
      gsap.fromTo(note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, delay: 1.2 });
      all.textContent = 'Break it again';
      setTimeout(() => { ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.8); world.impulse(1.2); }, 900);
    }
  };
  const reset = () => {
    home.clear();
    root.classList.remove('is-whole');
    note.hidden = true;
    shards.forEach((s, i) => { s.classList.remove('is-home'); const st = { x: 0, y: 0, r: 0 }; gsap.to(st, { ...start[i], duration: 0.8, ease: 'power2.inOut', onUpdate: () => s.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) rotate(${st.r.toFixed(2)})`) }); });
    seams.forEach((p) => gsap.to(p, { strokeDashoffset: p.getTotalLength(), duration: 0.4 }));
    word.textContent = 'Touch each piece to set it back';
    all.textContent = 'Mend it all';
  };
  const onClick = (e: Event) => {
    const s = (e.target as Element | null)?.closest<SVGGElement>('[data-shard]');
    if (s) mend(Number(s.dataset.shard));
  };
  const onKey = (e: KeyboardEvent) => {
    const s = (e.target as Element | null)?.closest<SVGGElement>('[data-shard]');
    if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mend(Number(s.dataset.shard)); }
  };
  const onAll = () => {
    if (home.size === shards.length) { reset(); return; }
    shards.forEach((_, i) => { if (!home.has(i)) setTimeout(() => mend(i, true), i * 260); });
  };
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  all.addEventListener('click', onAll);
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); all.removeEventListener('click', onAll); };
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

export function startHealing(world: World, dir: HealDir, calm: boolean) {
  stopHealing();
  const page = document.querySelector('[data-healing]');
  if (!page) return;
  const prompt = page.querySelector<HTMLElement>('[data-prompt]');
  if (prompt) cleanups.push(initPrompt(prompt));
  // the signatures are made of page elements, so they work in Calm too
  void calm;
  if (dir === 'a') { const el = page.querySelector<HTMLElement>('[data-breath]'); if (el) cleanups.push(initBreath(el, world)); }
  if (dir === 'b') { const el = page.querySelector<HTMLElement>('[data-body]'); if (el) cleanups.push(initBody(el, world)); }
  if (dir === 'c') { const el = page.querySelector<HTMLElement>('[data-mend]'); if (el) cleanups.push(initMend(el, world)); }
}
