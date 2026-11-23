import gsap from 'gsap';
import { RITUS, SABBATS } from '../data/magic';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import { moonIcon, readSky } from './sky';
import { daysUntil, download, icsFile, inDays, moonEvents, niceDate } from './festivals';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 2, Witchcraft & Magic · the gilded grimoire.
 *   Hecate's dark moon: the next Amavasya, which is also the night of her supper
 *   Make a sigil: from your intention, drawn in vermilion and sealed in wax
 *   The wheel of the year: the modern pagan sabbats, or the six Indian seasons
 * (Directions A The grimoire, B Moon garden and C Alchemical sky were compared;
 * this one mixes A and C. They remain in the project history.)
 */

const FONTS = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=IM+Fell+English:ital@0;1&display=swap';
let fontsAdded = false;
/** IM Fell English (the book) and Cinzel (the gilded capitals); font files load only where used */
export function loadMagicFonts() {
  if (fontsAdded) return;
  fontsAdded = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = FONTS;
  document.head.appendChild(l);
}

const angleOf = (svg: SVGSVGElement, e: PointerEvent) => {
  const b = svg.getBoundingClientRect();
  return (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI;
};

/* --------------------------------------------------- make a sigil */

function initSigil(root: HTMLElement, world: World) {
  const form = root.querySelector<HTMLFormElement>('[data-sigil-form]')!;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const path = root.querySelector<SVGPathElement>('[data-sigil-path]')!;
  const start = root.querySelector<SVGCircleElement>('[data-sigil-start]')!;
  const end = root.querySelector<SVGLineElement>('[data-sigil-end]')!;
  const seal = root.querySelector<SVGGElement>('[data-sigil-seal]')!;
  const hint = root.querySelector<HTMLElement>('[data-sigil-hint]')!;
  const saveBtn = root.querySelector<HTMLButtonElement>('[data-sigil-save]');
  let lastKept: string[] = [];
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
    lastKept = kept;
    if (saveBtn) { saveBtn.hidden = false; saveBtn.textContent = 'Save it as a picture'; }
  };
  // a picture of the sigil to keep: parchment, a gold ring, the vermilion line and the seal (no letters, so the intention stays private)
  const save = () => {
    if (!lastKept.length) return;
    const d = path.getAttribute('d') ?? '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-130 -130 260 260" width="1080" height="1080">`
      + `<rect x="-130" y="-130" width="260" height="260" fill="#e8dcc0"/>`
      + `<circle r="112" fill="none" stroke="#b8893a" stroke-width="1.6"/><circle r="106" fill="none" stroke="#b8893a" stroke-width="0.6"/>`
      + `<path d="${d}" fill="none" stroke="#b1261a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<circle cx="${start.getAttribute('cx')}" cy="${start.getAttribute('cy')}" r="5" fill="none" stroke="#b1261a" stroke-width="2.4"/>`
      + `<line x1="${end.getAttribute('x1')}" y1="${end.getAttribute('y1')}" x2="${end.getAttribute('x2')}" y2="${end.getAttribute('y2')}" stroke="#b1261a" stroke-width="3" stroke-linecap="round"/>`
      + `<text x="0" y="122" text-anchor="middle" font-family="Georgia, serif" font-size="6" letter-spacing="2" fill="#7a5a2a">SARVAKALI</text></svg>`;
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 1080;
      c.getContext('2d')?.drawImage(img, 0, 0, 1080, 1080);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'my-sigil.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        if (saveBtn) saveBtn.textContent = 'Saved';
        buzz(PATTERNS.choice);
      }, 'image/png');
    };
    img.src = url;
  };
  form.addEventListener('submit', make);
  saveBtn?.addEventListener('click', save);
  return () => { form.removeEventListener('submit', make); saveBtn?.removeEventListener('click', save); };
}

/* ------------------------------------------- the wheel of the year */

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

/* -------------------------------------------- Hecate's dark moon */

function initSupper(root: HTMLElement) {
  const when = root.querySelector<HTMLElement>('[data-supper-when]');
  const btn = root.querySelector<HTMLButtonElement>('[data-supper-cal]');
  const next = moonEvents(new Date(), 3).filter((e) => e.type === 'amavasya');
  if (!next.length || !when) return () => {};
  const n = daysUntil(next[0].at);
  when.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = niceDate(next[0].at);
  const sp = document.createElement('span');
  sp.textContent = ` · ${inDays(n)}`;
  when.append(b, sp);
  const save = () => {
    download('sarvakali-dark-moon.ics', icsFile(next.slice(0, 3).map((e) => ({
      title: 'Dark moon: Amavasya, and Hecate’s supper',
      date: e.at,
      description: 'Amavasya, a night especially kept for Kali; in ancient Athens, the night of Hecate’s supper (the Deipnon). From Sarvakali.',
    }))));
    buzz(PATTERNS.choice);
    if (btn) btn.textContent = 'Saved to your calendar file';
  };
  btn?.addEventListener('click', save);
  return () => btn?.removeEventListener('click', save);
}

/* ------------------------------------------------------------- page */

let cleanups: (() => void)[] = [];
export function stopMagic() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startMagic(world: World, calm: boolean) {
  stopMagic();
  const page = document.querySelector('[data-magic]');
  if (!page) return;
  loadMagicFonts();
  const supper = page.querySelector<HTMLElement>('[data-supper]');
  if (supper) cleanups.push(initSupper(supper));
  if (calm) return;
  const sigil = page.querySelector<HTMLElement>('[data-sigil]');
  if (sigil) cleanups.push(initSigil(sigil, world));
  const wheel = page.querySelector<HTMLElement>('[data-wheel]');
  if (wheel) cleanups.push(initWheel(wheel, world));
}
