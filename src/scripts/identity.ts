import gsap from 'gsap';
import { BODY_SCAN } from '../data/identity';
import { buzz, PATTERNS } from './haptics';
import { ring, tick } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 4, Identity, Intimacy & the Body: signature moments of the three directions.
 *   A · Every point on the line: a circle of two halves whose seam moves with you
 *   B · Your comfort, first: a private note for a first conversation
 *   C · Return to the body: a slow, gentle scan from head to feet
 * Nothing typed here is kept or sent.
 */

/* ------------------------------------------- A · every point on the line */

function initContinuum(root: HTMLElement, world: World) {
  const range = root.querySelector<HTMLInputElement>('[data-continuum-range]')!;
  const seam = root.querySelector<SVGLineElement>('[data-continuum-seam]')!;
  const word = root.querySelector<HTMLElement>('[data-continuum-word]')!;
  const stops = Array.from(root.querySelectorAll<SVGStopElement>('#id-split stop'));
  const R = 118;
  let last = -1;
  const show = () => {
    const v = Number(range.value) / 100;
    stops[1]?.setAttribute('offset', String(v));
    stops[2]?.setAttribute('offset', String(v));
    const x = -R + 2 * R * v, h = Math.sqrt(Math.max(0, R * R - x * x));
    seam.setAttribute('x1', x.toFixed(1)); seam.setAttribute('x2', x.toFixed(1));
    seam.setAttribute('y1', (-h).toFixed(1)); seam.setAttribute('y2', h.toFixed(1));
    const zone = v < 0.12 ? 0 : v > 0.88 ? 2 : v > 0.4 && v < 0.6 ? 1 : 3;
    if (zone !== last) {
      last = zone;
      word.textContent = ['Close to the moon. Whole.', 'In between, held by both. Whole.', 'Close to the sun. Whole.', 'Somewhere along the line. Whole.'][zone];
      tick(); buzz([4]);
    }
  };
  const onInput = () => { show(); world.flash(0.05); };
  range.addEventListener('input', onInput);
  show();
  return () => range.removeEventListener('input', onInput);
}

/* --------------------------------------------- B · your comfort, first */

function initComfort(form: HTMLFormElement) {
  const box = form.querySelector<HTMLElement>('[data-comfort-note]')!;
  const pre = form.querySelector<HTMLElement>('[data-comfort-text]')!;
  const copy = form.querySelector<HTMLButtonElement>('[data-comfort-copy]')!;
  const make = (e: Event) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('cf-name') || '').trim(), pro = String(fd.get('cf-pronouns') || '').trim();
    const avoid = String(fd.get('cf-avoid') || '').trim();
    const explore = fd.getAll('cf-explore').map(String), ways = fd.getAll('cf-way').map(String);
    const lines = ['A note for my first conversation with Sarvakali', ''];
    if (name) lines.push(`Please call me ${name}${pro ? `; my pronouns are ${pro}` : ''}.`);
    else if (pro) lines.push(`My pronouns are ${pro}.`);
    lines.push(`Pace: ${String(fd.get('cf-pace') || 'Steadily')}.`);
    if (explore.length) lines.push(`I would like to explore: ${explore.join('; ')}.`);
    if (ways.length) lines.push(`I like to work through: ${ways.join('; ')}.`);
    if (avoid) lines.push(`Please leave aside, for now: ${avoid}.`);
    pre.textContent = lines.join('\n');
    box.hidden = false;
    copy.textContent = 'Copy the note';
    gsap.fromTo(box, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
    ring('choice'); buzz(PATTERNS.choice);
  };
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(pre.textContent || ''); copy.textContent = 'Copied'; } catch { copy.textContent = 'Select the note to copy it'; }
  };
  form.addEventListener('submit', make);
  copy.addEventListener('click', doCopy);
  return () => { form.removeEventListener('submit', make); copy.removeEventListener('click', doCopy); };
}

/* --------------------------------------------- C · return to the body */

const STEP = 9;

function initScan(root: HTMLElement, world: World) {
  const glow = root.querySelector<SVGEllipseElement>('[data-scan-glow]')!;
  const word = root.querySelector<HTMLElement>('[data-scan-word]')!;
  const btn = root.querySelector<HTMLButtonElement>('[data-scan-toggle]')!;
  const skip = root.querySelector<HTMLButtonElement>('[data-scan-skip]')!;
  const ys = Array.from(root.querySelectorAll<HTMLElement>('.sc-steps li')).map((li) => Number(li.dataset.y));
  let i = -1, timer = 0;
  const idleWord = word.textContent || '', idleBtn = btn.textContent || 'Begin';
  const go = (k: number) => {
    clearTimeout(timer);
    if (k >= BODY_SCAN.length) { end('Take a breath. Welcome back to the whole of you.'); return; }
    i = k;
    gsap.to(glow, { attr: { cy: ys[k] }, opacity: 1, duration: 1.6, ease: 'sine.inOut' });
    gsap.fromTo(word, { opacity: 0 }, { opacity: 1, duration: 0.8 });
    word.textContent = BODY_SCAN[k].say;
    tick();
    world.flash(0.12);
    timer = window.setTimeout(() => go(k + 1), STEP * 1000);
  };
  const end = (text: string) => {
    clearTimeout(timer);
    i = -1;
    gsap.to(glow, { opacity: 0, duration: 1.2 });
    word.textContent = text;
    btn.textContent = 'Begin';
    skip.hidden = true;
    ring('choice');
  };
  const toggle = () => {
    if (i >= 0) { end('Stopped. You can come back whenever you like.'); return; }
    btn.textContent = 'Stop';
    skip.hidden = false;
    buzz(PATTERNS.choice);
    go(0);
  };
  const onSkip = () => { if (i >= 0) go(i + 1); };
  btn.addEventListener('click', toggle);
  skip.addEventListener('click', onSkip);
  gsap.set(glow, { opacity: 0 });
  return () => {
    clearTimeout(timer);
    // a scan cut short by a change of direction starts fresh next time
    gsap.killTweensOf([glow, word]);
    gsap.set(glow, { opacity: 0 });
    gsap.set(word, { opacity: 1 });
    word.textContent = idleWord;
    btn.textContent = idleBtn;
    skip.hidden = true;
    btn.removeEventListener('click', toggle);
    skip.removeEventListener('click', onSkip);
  };
}

export function startIdentity(world: World, dir: 'a' | 'b' | 'c') {
  const out: (() => void)[] = [];
  const page = document.querySelector('[data-dir-pillar="identity"]');
  if (!page) return out;
  if (dir === 'a') { const el = page.querySelector<HTMLElement>('[data-continuum]'); if (el) out.push(initContinuum(el, world)); }
  if (dir === 'b') { const el = page.querySelector<HTMLFormElement>('[data-comfort]'); if (el) out.push(initComfort(el)); }
  if (dir === 'c') { const el = page.querySelector<HTMLElement>('[data-scan]'); if (el) out.push(initScan(el, world)); }
  return out;
}
