import gsap from 'gsap';
import { MAG_DIRECTIONS, PLANETS, SABBATS, type MagDir } from '../data/magic';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import { moonIcon, readSky } from './sky';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 2, Witchcraft & Magic: the three directions being compared, and each
 * one's signature moment.
 *   A · The grimoire:   make a sigil from your intention, sealed in wax
 *   B · Moon garden:    turn the wheel of the year
 *   C · Alchemical sky: cast a circle, lighting the four quarters
 * Plus, in every direction: today's planet is marked.
 */

const fonts = new Set<string>();
export function applyMagDirection(dir: MagDir) {
  document.documentElement.dataset.mag = dir;
  const d = MAG_DIRECTIONS.find((x) => x.key === dir);
  if (d && !fonts.has(d.type.fontHref)) {
    fonts.add(d.type.fontHref);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = d.type.fontHref;
    document.head.appendChild(l);
  }
  document.querySelectorAll<HTMLElement>('[data-mag-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.magSet === dir)));
}

const angleOf = (svg: SVGSVGElement, e: PointerEvent) => {
  const b = svg.getBoundingClientRect();
  return (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI;
};

/* ---------------------------------------------- A · make a sigil */

function initSigil(root: HTMLElement, world: World) {
  const form = root.querySelector<HTMLFormElement>('[data-sigil-form]')!;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const path = root.querySelector<SVGPathElement>('[data-sigil-path]')!;
  const start = root.querySelector<SVGCircleElement>('[data-sigil-start]')!;
  const end = root.querySelector<SVGLineElement>('[data-sigil-end]')!;
  const seal = root.querySelector<SVGGElement>('[data-sigil-seal]')!;
  const hint = root.querySelector<HTMLElement>('[data-sigil-hint]')!;
  const letterPos = (L: string) => {
    const i = L.charCodeAt(0) - 65, a = ((-90 + (i * 360) / 26) * Math.PI) / 180;
    return [Math.cos(a) * 84, Math.sin(a) * 84];
  };
  const make = (e: Event) => {
    e.preventDefault();
    const raw = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (!raw) { input.focus(); return; }
    // the classic method: drop the vowels and any letter already used
    const seen = new Set<string>();
    let kept = raw.split('').filter((c) => !'AEIOU'.includes(c) && !seen.has(c) && (seen.add(c), true));
    if (kept.length < 2) kept = [...new Set(raw.split(''))];
    root.querySelectorAll('.sg-letter').forEach((t) => t.classList.toggle('is-used', kept.includes((t as SVGElement).dataset.letter!)));
    const pts = kept.map(letterPos);
    path.setAttribute('d', `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')}`);
    const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
    start.setAttribute('cx', sx.toFixed(1)); start.setAttribute('cy', sy.toFixed(1));
    // a short bar across the line's last step closes the sigil
    const [px, py] = pts[pts.length - 2] ?? [0, 0];
    const dx = ex - px, dy = ey - py, len = Math.hypot(dx, dy) || 1, nx = (-dy / len) * 7, ny = (dx / len) * 7;
    end.setAttribute('x1', (ex + nx).toFixed(1)); end.setAttribute('y1', (ey + ny).toFixed(1));
    end.setAttribute('x2', (ex - nx).toFixed(1)); end.setAttribute('y2', (ey - ny).toFixed(1));
    const total = path.getTotalLength();
    gsap.killTweensOf([path, seal]);
    gsap.set(seal, { scale: 0, transformOrigin: '0 0', svgOrigin: '0 0' });
    gsap.timeline()
      .fromTo(path, { strokeDasharray: total, strokeDashoffset: total }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
      .fromTo([start, end], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.3)
      .to(seal, { scale: 1, duration: 0.7, ease: 'back.out(2.2)', svgOrigin: '0 0', onStart: () => { ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.7); } }, 1.9);
    hint.textContent = `${kept.join(' · ')}: your sigil, sealed. Nothing you typed was saved.`;
    input.value = '';
  };
  form.addEventListener('submit', make);
  return () => form.removeEventListener('submit', make);
}

/* ------------------------------------------ B · the wheel of the year */

const dayOfYear = (m: number, d: number) => Math.round((Date.UTC(2026, m - 1, d) - Date.UTC(2026, 0, 1)) / 864e5);

function initWheel(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('svg')!;
  const g = root.querySelector<SVGGElement>('[data-wheel-rot]')!;
  const now = root.querySelector<HTMLElement>('[data-wheel-now]')!;
  const today = new Date();
  const todayDeg = (dayOfYear(today.getMonth() + 1, today.getDate()) / 365) * 360;
  const sabDeg = SABBATS.map((s) => (dayOfYear(s.month, s.day) / 365) * 360);
  root.querySelectorAll<SVGGElement>('[data-sabbat]').forEach((el, i) => el.setAttribute('transform', `rotate(${sabDeg[i].toFixed(1)})`));
  root.querySelector('[data-wheel-today]')!.setAttribute('transform', `rotate(${todayDeg.toFixed(1)})`);
  root.querySelector('[data-wheel-moon]')!.innerHTML = moonIcon(readSky('now').phase).replace('<svg', '<svg x="-16" y="-16" width="32" height="32"');
  const st = { rot: -todayDeg, vel: 0 };
  let dragging = false, last = 0, lastT = 0, raf = 0, prev = performance.now(), shown = -1;
  const labels = Array.from(root.querySelectorAll<SVGTextElement>('.wh-label'));
  const fmt = (s: (typeof SABBATS)[number]) => new Date(2026, s.month - 1, s.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - prev) / 1000);
    prev = t;
    if (!dragging && Math.abs(st.vel) > 0.5) { st.rot += st.vel * dt; st.vel *= Math.exp(-dt * 2.4); }
    g.setAttribute('transform', `rotate(${st.rot.toFixed(2)})`);
    labels.forEach((l, i) => l.setAttribute('transform', `rotate(${(-(st.rot + sabDeg[i])).toFixed(2)} 0 -108)`));
    // which festival sits under the marker at the top?
    const at = ((-st.rot % 360) + 360) % 360;
    let best = 0, bd = 999;
    sabDeg.forEach((d, i) => { const diff = Math.abs(((d - at + 540) % 360) - 180); if (diff < bd) { bd = diff; best = i; } });
    const isToday = Math.abs(((todayDeg - at + 540) % 360) - 180) < 2;
    const key = isToday ? -2 : best;
    if (key !== shown) {
      shown = key;
      // at today's mark, name the next festival to come
      const ahead = sabDeg.map((d, i) => ({ i, gap: (d - todayDeg + 360) % 360 })).sort((x, y) => x.gap - y.gap)[0];
      const s = SABBATS[isToday ? ahead.i : best];
      const daysTo = Math.round((ahead.gap / 360) * 365);
      now.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = isToday ? `Today. Next: ${s.name}, ${daysTo === 0 ? 'today' : `in ${daysTo} days`}` : `${s.name} · ${fmt(s)}`;
      const sp = document.createElement('span');
      sp.textContent = ` ${s.line}.`;
      now.append(b, sp);
      root.querySelectorAll('[data-sabbat]').forEach((el, i) => el.classList.toggle('is-on', i === best));
    }
    svg.setAttribute('aria-valuenow', String(Math.round(at)));
  };
  const down = (e: PointerEvent) => { dragging = true; last = angleOf(svg, e); lastT = performance.now(); st.vel = 0; svg.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const a = angleOf(svg, e), t = performance.now();
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    st.rot += d;
    st.vel = (d / Math.max(1, t - lastT)) * 1000;
    last = a; lastT = t;
  };
  const up = () => { if (dragging) { dragging = false; ring('choice'); buzz([5]); world.flash(0.2); } };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { st.rot -= 15; e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { st.rot += 15; e.preventDefault(); }
  };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', key);
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('keydown', key); };
}

/* ------------------------------------------------ C · cast a circle */

function initCast(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('svg')!;
  const trace = root.querySelector<SVGPathElement>('[data-cast-trace]')!;
  const hint = root.querySelector<HTMLElement>('[data-cast-hint]')!;
  const quarters = Array.from(root.querySelectorAll<SVGGElement>('[data-quarter]'));
  const R = 110;
  const st = { start: 0, total: 0, done: false, lit: new Set<number>() };
  let dragging = false, last = 0;
  const draw = () => {
    const sweep = Math.max(0, Math.min(359.9, st.total));
    const a0 = (st.start * Math.PI) / 180, a1 = ((st.start + sweep) * Math.PI) / 180;
    const large = sweep > 180 ? 1 : 0;
    trace.setAttribute('d', sweep < 0.5 ? '' : `M${(Math.cos(a0) * R).toFixed(1)} ${(Math.sin(a0) * R).toFixed(1)} A${R} ${R} 0 ${large} 1 ${(Math.cos(a1) * R).toFixed(1)} ${(Math.sin(a1) * R).toFixed(1)}`);
    quarters.forEach((q) => {
      const qa = Number(q.dataset.quarter);
      const passed = ((qa - st.start + 360) % 360) <= sweep + 0.5;
      if (passed && !st.lit.has(qa)) { st.lit.add(qa); q.classList.add('is-lit'); ring('choice'); buzz([8]); world.flash(0.25); }
    });
    if (st.total >= 360 && !st.done) {
      st.done = true;
      trace.setAttribute('d', `M${R} 0 A${R} ${R} 0 1 1 -${R} 0 A${R} ${R} 0 1 1 ${R} 0`);
      root.classList.add('is-cast');
      hint.textContent = 'The circle is cast. Tap to release it.';
      ring('card');
      buzz(PATTERNS.diya);
      world.flash(0.9);
      world.impulse(1.5);
    }
  };
  const reset = () => {
    st.total = 0; st.done = false; st.lit.clear();
    quarters.forEach((q) => q.classList.remove('is-lit'));
    root.classList.remove('is-cast');
    trace.setAttribute('d', '');
    hint.textContent = 'Trace a circle around the star, going sunwise (clockwise)';
  };
  const down = (e: PointerEvent) => {
    if (st.done) { reset(); return; }
    dragging = true;
    last = angleOf(svg, e);
    if (st.total < 1) st.start = last;
    svg.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging || st.done) return;
    const a = angleOf(svg, e);
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    last = a;
    st.total = Math.max(0, st.total + d); // only sunwise counts
    draw();
  };
  const up = () => { dragging = false; };
  const autoBtn = root.querySelector<HTMLButtonElement>('[data-cast-auto]')!;
  const auto = () => {
    reset();
    st.start = -90;
    const o = { v: 0 };
    gsap.to(o, { v: 361, duration: 4.2, ease: 'sine.inOut', onUpdate: () => { st.total = o.v; draw(); } });
  };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  autoBtn.addEventListener('click', auto);
  return () => { svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); autoBtn.removeEventListener('click', auto); };
}

/* ------------------------------------------------------------- page */

function markToday() {
  const dow = new Date().getDay();
  const pl = PLANETS.find((x) => x.dow === dow);
  document.querySelectorAll<HTMLElement>('.mg-planets [data-dow]').forEach((li) => li.classList.toggle('is-today', Number(li.dataset.dow) === dow));
  const t = document.querySelector('[data-mag-today]');
  if (t && pl) t.textContent = `Today is ${pl.day}, the day of ${pl.planet === 'Sun' || pl.planet === 'Moon' ? `the ${pl.planet}` : pl.planet} ${pl.glyph}: a good day for ${pl.title.toLowerCase()}.`;
}

let cleanups: (() => void)[] = [];
export function stopMagic() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startMagic(world: World, dir: MagDir, calm: boolean) {
  stopMagic();
  const page = document.querySelector('[data-magic]');
  if (!page) return;
  markToday();
  if (calm) return;
  if (dir === 'a') { const el = page.querySelector<HTMLElement>('[data-sigil]'); if (el) cleanups.push(initSigil(el, world)); }
  if (dir === 'b') { const el = page.querySelector<HTMLElement>('[data-wheel]'); if (el) cleanups.push(initWheel(el, world)); }
  if (dir === 'c') { const el = page.querySelector<HTMLElement>('[data-cast]'); if (el) cleanups.push(initCast(el, world)); }
}
