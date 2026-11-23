import gsap from 'gsap';
import { MAG_DIRECTIONS, RITUS, SABBATS, type MagDir } from '../data/magic';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import { moonIcon, readSky } from './sky';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 2, Witchcraft & Magic: the three directions being compared, and each
 * one's signature moment.
 *   A · The grimoire:   make a sigil from your intention, sealed in wax
 *   B · Moon garden:    turn the wheel of the year, or the six Indian seasons
 *   C · Alchemical sky: cast a circle, lighting the four quarters
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
const degOf = (m: number, d: number) => (dayOfYear(m, d) / 365) * 360;
const fmtDate = (m: number, d: number) => new Date(2026, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

type WheelItem = { name: string; deg: number; title: string; line: string };

/** two wheels on one dial: the modern pagan sabbats, or the six Indian seasons */
function wheelItems(mode: string): { items: WheelItem[]; segments: boolean; note: string } {
  if (mode === 'ritus') {
    const items = RITUS.map((r, i) => {
      const start = degOf(r.from[0], r.from[1]);
      const nx = RITUS[(i + 1) % RITUS.length].from;
      const end = degOf(nx[0], nx[1]) + (i === RITUS.length - 1 ? 360 : 0);
      return {
        name: r.name, deg: start,
        title: `${r.name} (${r.deva}) · ${r.english}`,
        line: `Lunar months ${r.months}; by the sun, about ${fmtDate(r.from[0], r.from[1])} to ${fmtDate(nx[0], nx[1])}.`,
        end,
      } as WheelItem & { end: number };
    });
    return { items, segments: true, note: 'Drag to turn. The marker at the top is today. Dates by the sun, as Drik Panchang reckons the ritus; by the lunar months each season comes a few weeks later. Calendars differ.' };
  }
  return {
    items: SABBATS.map((s) => ({ name: s.name, deg: degOf(s.month, s.day), title: `${s.name} · ${s.approx ? 'around ' : ''}${fmtDate(s.month, s.day)}`, line: `${s.line}.` })),
    segments: false,
    note: 'Drag to turn. The marker at the top is today. The Wheel of the Year as kept in modern pagan witchcraft, northern hemisphere.',
  };
}

function initWheel(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('svg')!;
  const g = root.querySelector<SVGGElement>('[data-wheel-rot]')!;
  const now = root.querySelector<HTMLElement>('[data-wheel-now]')!;
  const note = root.querySelector<HTMLElement>('[data-wheel-note]')!;
  const today = new Date();
  const todayDeg = degOf(today.getMonth() + 1, today.getDate());
  root.querySelector('[data-wheel-today]')!.setAttribute('transform', `rotate(${todayDeg.toFixed(1)})`);
  root.querySelector('[data-wheel-moon]')!.innerHTML = moonIcon(readSky('now').phase).replace('<svg', '<svg x="-16" y="-16" width="32" height="32"');
  let mode = root.dataset.mode || 'sabbats';
  let data = wheelItems(mode);
  let labels: SVGTextElement[] = [];
  let labelDeg: number[] = [];
  const layout = () => {
    data = wheelItems(mode);
    root.dataset.mode = mode;
    note.textContent = data.note;
    root.querySelectorAll<HTMLButtonElement>('[data-wheel-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wheelMode === mode)));
    const set = root.querySelector<SVGGElement>(`[data-set="${mode}"]`)!;
    const groups = Array.from(set.querySelectorAll<SVGGElement>('[data-item]'));
    labels = groups.map((el) => el.querySelector('text')!);
    labelDeg = data.items.map((it) => (data.segments ? (it.deg + ((it as WheelItem & { end: number }).end - it.deg) / 2) : it.deg));
    groups.forEach((el, i) => {
      el.setAttribute('transform', `rotate(${data.items[i].deg.toFixed(1)})`);
      // a season's name sits in the middle of its arc
      if (data.segments) labels[i].setAttribute('transform', `rotate(${(labelDeg[i] - data.items[i].deg).toFixed(1)})`);
    });
    shown = -9;
  };
  const st = { rot: -todayDeg, vel: 0 };
  let dragging = false, last = 0, lastT = 0, raf = 0, prev = performance.now(), shown = -9;
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - prev) / 1000);
    prev = t;
    if (!dragging && Math.abs(st.vel) > 0.5) { st.rot += st.vel * dt; st.vel *= Math.exp(-dt * 2.4); }
    g.setAttribute('transform', `rotate(${st.rot.toFixed(2)})`);
    labels.forEach((l, i) => {
      const base = data.segments ? `rotate(${(labelDeg[i] - data.items[i].deg).toFixed(1)}) ` : '';
      l.setAttribute('transform', `${base}rotate(${(-(st.rot + labelDeg[i])).toFixed(2)} 0 -108)`);
    });
    const at = ((-st.rot % 360) + 360) % 360;
    // the item under the marker: for seasons, the one whose arc contains it; for sabbats, the nearest
    let idx = 0;
    if (data.segments) {
      data.items.forEach((it, i) => { const end = (it as WheelItem & { end: number }).end; const a = at < it.deg ? at + 360 : at; if (a >= it.deg && a < end) idx = i; });
    } else {
      let bd = 999;
      data.items.forEach((it, i) => { const diff = Math.abs(((it.deg - at + 540) % 360) - 180); if (diff < bd) { bd = diff; idx = i; } });
    }
    const atToday = Math.abs(((todayDeg - at + 540) % 360) - 180) < 2;
    const key = (atToday ? 100 : 0) + idx;
    if (key !== shown) {
      shown = key;
      now.innerHTML = '';
      const b = document.createElement('b');
      const sp = document.createElement('span');
      if (atToday && !data.segments) {
        const ahead = data.items.map((it, i) => ({ i, gap: (it.deg - todayDeg + 360) % 360 })).sort((x, y) => x.gap - y.gap)[0];
        const days = Math.round((ahead.gap / 360) * 365);
        b.textContent = `Today. Next: ${data.items[ahead.i].name}, ${days === 0 ? 'today' : `in about ${days} days`}`;
        sp.textContent = ` ${data.items[ahead.i].line}`;
      } else {
        b.textContent = atToday ? `Today: ${data.items[idx].title}` : data.items[idx].title;
        sp.textContent = ` ${data.items[idx].line}`;
      }
      now.append(b, sp);
      root.querySelectorAll(`[data-set="${mode}"] [data-item]`).forEach((el, i) => el.classList.toggle('is-on', i === idx));
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
  const onMode = (e: Event) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-wheel-mode]');
    if (!b) return;
    mode = b.dataset.wheelMode!;
    layout();
    st.rot = -todayDeg;
    st.vel = 0;
    buzz(PATTERNS.choice);
  };
  root.addEventListener('click', onMode);
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', key);
  layout();
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); root.removeEventListener('click', onMode); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('keydown', key); };
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

let cleanups: (() => void)[] = [];
export function stopMagic() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startMagic(world: World, dir: MagDir, calm: boolean) {
  stopMagic();
  const page = document.querySelector('[data-magic]');
  if (!page) return;
  if (calm) return;
  if (dir === 'a') { const el = page.querySelector<HTMLElement>('[data-sigil]'); if (el) cleanups.push(initSigil(el, world)); }
  if (dir === 'b') { const el = page.querySelector<HTMLElement>('[data-wheel]'); if (el) cleanups.push(initWheel(el, world)); }
  if (dir === 'c') { const el = page.querySelector<HTMLElement>('[data-cast]'); if (el) cleanups.push(initCast(el, world)); }
}
