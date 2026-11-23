import gsap from 'gsap';
import { RITUS, SABBATS, SATURN, SIGIL_METHODS, type SigilMethod } from '../data/magic';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import { moonIcon, readSky } from './sky';
import { daysUntil, download, icsFile, inDays, moonEvents, niceDate } from './festivals';
import type { WorldHandle as World } from './world/handle';

/**
 * Pillar 2, Witchcraft & Magic · the gilded grimoire.
 *   Hecate's dark moon: the next Amavasya, which is also the night of her supper
 *   Make a sigil, five ways: letter wheel, monogram, magic square, bindrune, or drawn by hand
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

/* ---------------------------------------- make a sigil, five ways */

const SVGNS = 'http://www.w3.org/2000/svg';
type Cmd = (string | number)[];
type Glyph = Cmd[][];

/**
 * Single-stroke capitals for the monogram, in a box from -1 to 1 (y down).
 * Stems share the same lines (x = ±0.6), so letters fold into each other.
 */
const O: Glyph = [[['M', 0, -1], ['A', 0.75, 1, 0, 1, 0, 1], ['A', 0.75, 1, 0, 1, 0, -1]]];
const P_BOWL: Cmd[] = [['M', -0.6, 1], ['L', -0.6, -1], ['C', 0.85, -1, 0.85, 0.1, -0.6, 0.1]];
const GLYPHS: Record<string, Glyph> = {
  A: [[['M', -0.6, 1], ['L', 0, -1], ['L', 0.6, 1]], [['M', -0.32, 0.25], ['L', 0.32, 0.25]]],
  B: [[['M', -0.6, 1], ['L', -0.6, -1], ['C', 0.7, -1, 0.7, 0, -0.6, 0], ['C', 0.85, 0, 0.85, 1, -0.6, 1]]],
  C: [[['M', 0.6, -0.7], ['A', 0.75, 1, 1, 0, 0.6, 0.7]]],
  D: [[['M', -0.6, -1], ['L', -0.6, 1], ['C', 0.95, 1, 0.95, -1, -0.6, -1]]],
  E: [[['M', 0.6, -1], ['L', -0.6, -1], ['L', -0.6, 1], ['L', 0.6, 1]], [['M', -0.6, 0], ['L', 0.35, 0]]],
  F: [[['M', 0.6, -1], ['L', -0.6, -1], ['L', -0.6, 1]], [['M', -0.6, 0], ['L', 0.35, 0]]],
  G: [[['M', 0.6, -0.7], ['A', 0.75, 1, 1, 0, 0.6, 0.7], ['L', 0.6, 0.1], ['L', 0.1, 0.1]]],
  H: [[['M', -0.6, -1], ['L', -0.6, 1]], [['M', 0.6, -1], ['L', 0.6, 1]], [['M', -0.6, 0], ['L', 0.6, 0]]],
  I: [[['M', 0, -1], ['L', 0, 1]]],
  J: [[['M', 0.6, -1], ['L', 0.6, 0.4], ['A', 0.6, 0.6, 0, 1, -0.6, 0.4]]],
  K: [[['M', -0.6, -1], ['L', -0.6, 1]], [['M', 0.6, -1], ['L', -0.6, 0], ['L', 0.6, 1]]],
  L: [[['M', -0.6, -1], ['L', -0.6, 1], ['L', 0.6, 1]]],
  M: [[['M', -0.6, 1], ['L', -0.6, -1], ['L', 0, 0.1], ['L', 0.6, -1], ['L', 0.6, 1]]],
  N: [[['M', -0.6, 1], ['L', -0.6, -1], ['L', 0.6, 1], ['L', 0.6, -1]]],
  O,
  P: [P_BOWL],
  Q: [...O, [['M', 0.15, 0.45], ['L', 0.8, 1.1]]],
  R: [[...P_BOWL, ['L', 0.6, 1]]],
  S: [[['M', 0.55, -0.75], ['C', 0.3, -1.1, -0.65, -1.05, -0.55, -0.45], ['C', -0.45, 0.05, 0.6, -0.05, 0.6, 0.5], ['C', 0.6, 1.05, -0.4, 1.1, -0.6, 0.75]]],
  T: [[['M', -0.6, -1], ['L', 0.6, -1]], [['M', 0, -1], ['L', 0, 1]]],
  U: [[['M', -0.6, -1], ['L', -0.6, 0.35], ['A', 0.6, 0.65, 0, 0, 0.6, 0.35], ['L', 0.6, -1]]],
  V: [[['M', -0.6, -1], ['L', 0, 1], ['L', 0.6, -1]]],
  W: [[['M', -0.8, -1], ['L', -0.4, 1], ['L', 0, -0.2], ['L', 0.4, 1], ['L', 0.8, -1]]],
  X: [[['M', -0.6, -1], ['L', 0.6, 1]], [['M', 0.6, -1], ['L', -0.6, 1]]],
  Y: [[['M', -0.6, -1], ['L', 0, 0]], [['M', 0.6, -1], ['L', 0, 0], ['L', 0, 1]]],
  Z: [[['M', -0.6, -1], ['L', 0.6, -1], ['L', -0.6, 1], ['L', 0.6, 1]]],
};

/** a glyph as an SVG path, scaled, and turned back to front if asked */
function glyphPath(g: Glyph, sx: number, sy: number, mirror = false) {
  const f = (v: number) => String(+(+v).toFixed(3));
  const X = (x: number) => f((mirror ? -x : x) * sx), Y = (y: number) => f(y * sy);
  return g.map((sub) => sub.map((c) => {
    const [k, ...n] = c as [string, ...number[]];
    if (k === 'A') return `A${f(n[0] * sx)} ${f(n[1] * sy)} 0 ${n[2]} ${mirror ? 1 - n[3] : n[3]} ${X(n[4])} ${Y(n[5])}`;
    if (k === 'C') return `C${X(n[0])} ${Y(n[1])} ${X(n[2])} ${Y(n[3])} ${X(n[4])} ${Y(n[5])}`;
    return `${k}${X(n[0])} ${Y(n[1])}`;
  }).join(' ')).join(' ');
}

/**
 * Elder Futhark runes for the bindrune, drawn as strokes in a box (x -0.5..0.5,
 * y -1..1) around a shared stave at x = 0. Latin letters go to their nearest
 * rune; a modern transliteration, and some letters share a rune.
 */
const RUNES: Record<string, { name: string; strokes: number[][][] }> = {
  fehu: { name: 'fehu', strokes: [[[0, -0.45], [0.5, -0.95]], [[0, 0.05], [0.5, -0.45]]] },
  uruz: { name: 'uruz', strokes: [[[0, -1], [0.5, -0.55], [0.5, 1]]] },
  ansuz: { name: 'ansuz', strokes: [[[0, -1], [0.5, -0.55]], [[0, -0.5], [0.5, -0.05]]] },
  raido: { name: 'raido', strokes: [[[0, -1], [0.45, -0.6], [0, -0.15], [0.5, 1]]] },
  kaunan: { name: 'kaunan', strokes: [[[0.45, -1], [0, -0.6], [0.45, -0.2]]] },
  gebo: { name: 'gebo', strokes: [[[-0.5, -0.75], [0.5, 0.75]], [[0.5, -0.75], [-0.5, 0.75]]] },
  wunjo: { name: 'wunjo', strokes: [[[0, -1], [0.45, -0.65], [0, -0.3]]] },
  hagalaz: { name: 'hagalaz', strokes: [[[-0.45, -1], [-0.45, 1]], [[0.45, -1], [0.45, 1]], [[-0.45, -0.25], [0.45, 0.25]]] },
  naudiz: { name: 'naudiz', strokes: [[[-0.35, -0.3], [0.35, 0.2]]] },
  isa: { name: 'isa', strokes: [] },
  jera: { name: 'jera', strokes: [[[-0.05, -0.75], [-0.45, -0.4], [-0.05, -0.05]], [[0.05, 0.05], [0.45, 0.4], [0.05, 0.75]]] },
  perthro: { name: 'perthro', strokes: [[[0, -1], [0.45, -0.6], [0.45, -0.3]], [[0, 1], [0.45, 0.6], [0.45, 0.3]]] },
  algiz: { name: 'algiz', strokes: [[[-0.5, -0.9], [0, -0.35], [0.5, -0.9]]] },
  sowilo: { name: 'sowilo', strokes: [[[0.35, -0.9], [-0.35, -0.3], [0.35, 0.3], [-0.35, 0.9]]] },
  tiwaz: { name: 'tiwaz', strokes: [[[-0.45, -0.55], [0, -1], [0.45, -0.55]]] },
  berkano: { name: 'berkano', strokes: [[[0, -1], [0.45, -0.5], [0, 0], [0.45, 0.5], [0, 1]]] },
  ehwaz: { name: 'ehwaz', strokes: [[[-0.45, 1], [-0.45, -1], [0, -0.45], [0.45, -1], [0.45, 1]]] },
  mannaz: { name: 'mannaz', strokes: [[[-0.45, 1], [-0.45, -1]], [[0.45, 1], [0.45, -1]], [[-0.45, -1], [0.45, -0.25]], [[0.45, -1], [-0.45, -0.25]]] },
  laguz: { name: 'laguz', strokes: [[[0, -1], [0.45, -0.55]]] },
  dagaz: { name: 'dagaz', strokes: [[[-0.5, -0.8], [0.5, 0.8], [0.5, -0.8], [-0.5, 0.8], [-0.5, -0.8]]] },
  othala: { name: 'othala', strokes: [[[0, -1], [-0.5, -0.35], [0.45, 0.95]], [[0, -1], [0.5, -0.35], [-0.45, 0.95]]] },
};
const LETTER_RUNE: Record<string, string> = {
  A: 'ansuz', B: 'berkano', C: 'kaunan', D: 'dagaz', E: 'ehwaz', F: 'fehu', G: 'gebo', H: 'hagalaz', I: 'isa',
  J: 'jera', K: 'kaunan', L: 'laguz', M: 'mannaz', N: 'naudiz', O: 'othala', P: 'perthro', Q: 'kaunan', R: 'raido',
  S: 'sowilo', T: 'tiwaz', U: 'uruz', V: 'wunjo', W: 'wunjo', X: 'gebo', Y: 'jera', Z: 'algiz',
};

/** where each number sits on the 3 × 3 square */
const SQUARE_AT: Record<number, [number, number]> = {};
SATURN.forEach((row, r) => row.forEach((n, c) => { SQUARE_AT[n] = [(c - 1) * 52, (r - 1) * 52]; }));
const letterNumber = (L: string) => ((L.charCodeAt(0) - 65) % 9) + 1;

/** the letters most methods keep: vowels and repeats struck out (all letters if too few are left) */
function keptLetters(text: string) {
  const raw = text.toUpperCase().replace(/[^A-Z]/g, '');
  const seen = new Set<string>();
  let kept = raw.split('').filter((c) => !'AEIOU'.includes(c) && !seen.has(c) && (seen.add(c), true));
  if (kept.length < 2) kept = [...new Set(raw.split(''))];
  return kept;
}

function initSigil(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('[data-sigil-svg]')!;
  const mark = root.querySelector<SVGGElement>('[data-sigil-mark]')!;
  const seal = root.querySelector<SVGGElement>('[data-sigil-seal]')!;
  const form = root.querySelector<HTMLFormElement>('[data-sigil-form]')!;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const hint = root.querySelector<HTMLElement>('[data-sigil-hint]')!;
  const saveBtn = root.querySelector<HTMLButtonElement>('[data-sigil-save]')!;
  const page = root.closest('section')!;
  const how = page.querySelector<HTMLElement>('[data-sigil-how]');
  const origin = page.querySelector<HTMLElement>('[data-sigil-origin]');
  let method = (root.dataset.method as SigilMethod) || 'wheel';
  // the intention lives only in this variable, so each way can redraw it; it is never stored
  let text = '';
  let sealed = false;

  const el = (tag: string, attrs: Record<string, string | number>) => {
    const e = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    mark.appendChild(e);
    return e as SVGGeometryElement;
  };
  const clear = () => {
    gsap.killTweensOf([seal, ...Array.from(mark.children)]);
    mark.innerHTML = '';
    gsap.set(seal, { scale: 0, svgOrigin: '0 0' });
    sealed = false;
    saveBtn.hidden = true;
    root.querySelectorAll('.is-used').forEach((x) => x.classList.remove('is-used'));
  };
  const stamp = (delay: number) => {
    gsap.to(seal, { scale: 1, duration: 0.7, ease: 'back.out(2.2)', svgOrigin: '0 0', delay, onStart: () => { ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.7); } });
    sealed = true;
    saveBtn.hidden = false;
    saveBtn.textContent = 'Save it as a picture';
  };
  /** draw every stroke in turn, like a pen, then press the seal */
  const ink = (parts: SVGGeometryElement[], total = 1.6) => {
    const lens = parts.map((p) => { try { return p.getTotalLength(); } catch { return 0; } });
    const sum = lens.reduce((a, b) => a + b, 0) || 1;
    const tl = gsap.timeline();
    let t = 0;
    parts.forEach((p, i) => {
      const d = Math.max(0.08, (lens[i] / sum) * total);
      if (lens[i] > 0) tl.fromTo(p, { strokeDasharray: lens[i], strokeDashoffset: lens[i] }, { strokeDashoffset: 0, duration: d, ease: 'power1.inOut' }, t);
      else tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
      t += d * 0.85;
    });
    stamp(t + 0.25);
  };
  /** a small ring where the line starts and a short bar across where it ends */
  const ends = (pts: number[][]) => {
    const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
    const [px, py] = pts.length > 1 ? pts[pts.length - 2] : [ex - 1, ey];
    const dx = ex - px, dy = ey - py, len = Math.hypot(dx, dy) || 1, nx = (-dy / len) * 7, ny = (dx / len) * 7;
    return [
      el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: 5, class: 'sg-start' }),
      el('line', { x1: (ex + nx).toFixed(1), y1: (ey + ny).toFixed(1), x2: (ex - nx).toFixed(1), y2: (ey - ny).toFixed(1), class: 'sg-end' }),
    ];
  };
  const path = (pts: number[][]) => `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')}`;
  const done = (what: string) => { hint.textContent = `${what} Nothing you typed was saved.`; };

  const methods: Record<Exclude<SigilMethod, 'draw'>, () => void> = {
    wheel: () => {
      const kept = keptLetters(text);
      root.querySelectorAll<SVGElement>('.sg-letter').forEach((t) => t.classList.toggle('is-used', kept.includes(t.dataset.letter!)));
      const pts = kept.map((L) => { const a = ((-90 + ((L.charCodeAt(0) - 65) * 360) / 26) * Math.PI) / 180; return [Math.cos(a) * 84, Math.sin(a) * 84]; });
      const line = el('path', { d: path(pts), class: 'sg-line' });
      const [a, b] = ends(pts);
      ink([a, line, b]);
      done(`${kept.join(' · ')}: traced on the wheel and sealed.`);
    },
    monogram: () => {
      const kept = keptLetters(text);
      // letters folded together on one axis: sizes, heights, mirrors and quarter turns vary so
      // shared strokes fall on each other and the words stop reading as words
      const SIZE = [1, 0.66, 0.82, 0.58], LIFT = [0, -0.36, 0.3, 0.42], TURN = [0, 0, 90, 0, 0, -90];
      const parts = kept.map((L, i) => {
        const sz = SIZE[i % SIZE.length], mir = i % 2 === 1 ? -1 : 1;
        return el('path', {
          d: glyphPath(GLYPHS[L], 1, 1),
          transform: `translate(0 ${(LIFT[i % LIFT.length] * 64).toFixed(1)}) rotate(${TURN[i % TURN.length]}) scale(${(mir * sz * 60).toFixed(1)} ${(sz * 64).toFixed(1)})`,
          // the stroke is scaled with the letter, so it is set thinner to look the same
          'stroke-width': (2.6 / (sz * 62)).toFixed(4),
          class: 'sg-line sg-scaled',
        });
      });
      ink(parts, 2);
      done(`${kept.join(' · ')}: folded into one figure, some letters turned or reversed, and sealed.${kept.length > 8 ? ' Fewer words give a cleaner figure.' : ''}`);
    },
    square: () => {
      const kept = keptLetters(text);
      const nums = kept.map(letterNumber);
      nums.forEach((n) => root.querySelector(`.sg-num[data-num="${n}"]`)?.classList.add('is-used'));
      const pts = nums.map((n) => SQUARE_AT[n]);
      // where two letters fall on the same number, the line makes a small loop
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) d += nums[i] === nums[i - 1] ? ` m0 -0.1 a8 8 0 1 1 0.1 0 m-0.1 0.1` : ` L${pts[i][0]} ${pts[i][1]}`;
      const line = el('path', { d, class: 'sg-line' });
      const [a, b] = ends(pts.filter((q, i) => i === 0 || nums[i] !== nums[i - 1]));
      ink([a, line, b]);
      done(`${kept.map((L, i) => `${L} ${nums[i]}`).join(' · ')}: joined on the square and sealed.`);
    },
    bindrune: () => {
      const words = text.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
      const letters = words.length >= 2 ? words.map((w) => w[0]) : [...new Set((words[0] ?? '').split(''))].slice(0, 5);
      const picked: { L: string; rune: string }[] = [];
      letters.forEach((L) => { const r = LETTER_RUNE[L]; if (r && !picked.some((p) => p.rune === r) && picked.length < 6) picked.push({ L, rune: r }); });
      const parts = [el('path', { d: 'M0 -96 L0 96', class: 'sg-line sg-stave' })];
      picked.forEach(({ rune }) => RUNES[rune].strokes.forEach((s) => parts.push(el('path', { d: path(s.map(([x, y]) => [x * 76, y * 96])), class: 'sg-line' }))));
      ink(parts, 1.8);
      done(`${picked.map((p) => `${p.L} ${RUNES[p.rune].name}`).join(' · ')}: bound on one stave and sealed.`);
    },
  };

  const render = () => {
    clear();
    if (method === 'draw' || !text) return;
    methods[method]();
  };

  /* draw your own: a pen on the plate */
  let drawing: SVGPathElement | null = null, lastPt: DOMPoint | null = null, drew = false;
  // the pen stays inside the ring
  const toSvg = (e: PointerEvent) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const r = Math.hypot(q.x, q.y), max = 108;
    if (r > max) { q.x *= max / r; q.y *= max / r; }
    return q;
  };
  const down = (e: PointerEvent) => {
    if (method !== 'draw' || sealed) return;
    e.preventDefault(); // no text selection while drawing
    const p = toSvg(e);
    drawing = el('path', { d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`, class: 'sg-line' }) as SVGPathElement;
    lastPt = p;
    svg.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drawing || !lastPt) return;
    const p = toSvg(e);
    if (Math.hypot(p.x - lastPt.x, p.y - lastPt.y) < 2) return;
    drawing.setAttribute('d', `${drawing.getAttribute('d')} L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    lastPt = p;
    if (!drew) { drew = true; hint.textContent = 'When it feels finished, seal it.'; }
  };
  const up = () => { drawing = null; lastPt = null; };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  const drawClear = root.querySelector<HTMLButtonElement>('[data-draw-clear]')!;
  const drawSeal = root.querySelector<HTMLButtonElement>('[data-draw-seal]')!;
  const onClear = () => { clear(); drew = false; hint.textContent = 'Draw with your finger or mouse inside the ring.'; };
  const onSeal = () => { if (!mark.children.length) { hint.textContent = 'Draw something first.'; return; } if (!sealed) { stamp(0); hint.textContent = 'Your sigil, sealed. Nothing you drew was saved.'; } };
  drawClear.addEventListener('click', onClear);
  drawSeal.addEventListener('click', onSeal);

  /* choosing a way */
  const choose = (m: SigilMethod) => {
    method = m;
    root.dataset.method = m;
    page.querySelectorAll<HTMLButtonElement>('[data-sigil-method]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sigilMethod === m)));
    const info = SIGIL_METHODS.find((x) => x.key === m)!;
    if (how) how.textContent = info.how;
    if (origin) origin.textContent = info.origin;
    drew = false;
    if (m === 'draw') { clear(); hint.textContent = 'Draw with your finger or mouse inside the ring.'; return; }
    if (text) render();
    else { clear(); hint.textContent = 'Your sigil will be drawn here.'; }
  };
  const onMethod = (e: Event) => {
    const b = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-sigil-method]');
    if (!b) return;
    choose(b.dataset.sigilMethod as SigilMethod);
    buzz(PATTERNS.choice);
  };
  page.addEventListener('click', onMethod);

  const make = (e: Event) => {
    e.preventDefault();
    const t = input.value.trim();
    if (!/[a-z]/i.test(t)) { input.focus(); return; }
    text = t;
    input.value = '';
    render();
  };
  form.addEventListener('submit', make);

  // a picture of the sigil to keep: parchment, a gold ring, the vermilion line and the seal (no letters or numbers, so the intention stays private)
  const save = () => {
    if (!mark.children.length) return;
    const clone = mark.cloneNode(true) as SVGGElement;
    clone.querySelectorAll('*').forEach((n) => { n.removeAttribute('style'); n.removeAttribute('class'); });
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-130 -130 260 260" width="1080" height="1080">`
      + `<rect x="-130" y="-130" width="260" height="260" fill="#e8dcc0"/>`
      + `<circle r="120" fill="none" stroke="#9a7428" stroke-width="1.8"/><circle r="113" fill="none" stroke="#9a7428" stroke-width="0.6"/>`
      + `<g fill="none" stroke="#b1261a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${clone.innerHTML}</g>`
      + `<g transform="translate(94 94)"><circle r="27" fill="#b8281a"/><circle r="20" fill="none" stroke="#e0b85c" stroke-width="1.3"/>`
      + [-90, 30, 150].map((d) => { const a = (d * Math.PI) / 180; return `<path d="M0 0 L${(Math.cos(a) * 13.5).toFixed(1)} ${(Math.sin(a) * 13.5).toFixed(1)}" stroke="#f0cf7a" stroke-width="2.2" stroke-linecap="round"/>`; }).join('')
      + `<circle r="3.2" fill="#f0cf7a"/></g></svg>`;
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
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
        saveBtn.textContent = 'Saved';
        buzz(PATTERNS.choice);
      }, 'image/png');
    };
    img.src = url;
  };
  saveBtn.addEventListener('click', save);

  return () => {
    form.removeEventListener('submit', make);
    saveBtn.removeEventListener('click', save);
    page.removeEventListener('click', onMethod);
    svg.removeEventListener('pointerdown', down);
    svg.removeEventListener('pointermove', move);
    svg.removeEventListener('pointerup', up);
    svg.removeEventListener('pointercancel', up);
    drawClear.removeEventListener('click', onClear);
    drawSeal.removeEventListener('click', onSeal);
  };
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
