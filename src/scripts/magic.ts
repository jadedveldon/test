import gsap from 'gsap';
import { loadMagicFonts } from './fonts';
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

/** one letter of the monogram, where it sits and how it is turned */
type Placed = { L: string; x: number; y: number; rot: number; mir: number; sx: number; sy: number };
export type Arrangement = 'line' | 'ring' | 'stack';
/** letters whose stem is on the left, so they can hang from a shared central line */
const STEMMED = new Set('BDEFHKLMNPR'.split(''));

/**
 * Ways to join the monogram's letters, after the arrangements practitioners and
 * sigil tools use: hung on one central line, set around a ring, or stacked on
 * one centre. The visitor can then move, turn and flip any letter.
 */
function arrange(kept: string[], how: Arrangement): { letters: Placed[]; guide: string } {
  if (how === 'ring') {
    const n = kept.length, R = 58;
    const h = Math.min(46, ((Math.PI * 2 * R) / n) * 1.05), sy = h / 2, sx = sy * 0.85;
    return {
      letters: kept.map((L, i) => {
        const a = -90 + (i * 360) / n, r = ((a * Math.PI) / 180);
        return { L, x: Math.cos(r) * (R + sy), y: Math.sin(r) * (R + sy), rot: a + 90, mir: 1, sx, sy };
      }),
      guide: `M${R} 0 A${R} ${R} 0 1 1 ${-R} 0 A${R} ${R} 0 1 1 ${R} 0`,
    };
  }
  if (how === 'stack') {
    const SIZE = [1, 0.66, 0.82, 0.58], LIFT = [0, -0.36, 0.3, 0.42], TURN = [0, 0, 90, 0, 0, -90];
    return {
      letters: kept.map((L, i) => { const s = SIZE[i % 4]; return { L, x: 0, y: LIFT[i % 4] * 64, rot: TURN[i % 6], mir: i % 2 ? -1 : 1, sx: s * 60, sy: s * 64 }; }),
      guide: '',
    };
  }
  // on a central line: letters with a stem hang from it, right or (turned back to front) left; the rest sit across it
  const tiers: { right?: string; left?: string; centre?: string }[] = [];
  kept.forEach((L) => {
    const t = tiers[tiers.length - 1];
    if (STEMMED.has(L) && t && !t.centre && !t.right) t.right = L;
    else if (STEMMED.has(L) && t && !t.centre && !t.left) t.left = L;
    else if (STEMMED.has(L)) tiers.push({ right: L });
    else tiers.push({ centre: L });
  });
  const n = tiers.length, tierH = Math.min(48, 196 / n), sy = Math.min(30, tierH * 0.64), sx = sy * 1.12;
  const letters: Placed[] = [];
  tiers.forEach((t, i) => {
    const y = (i - (n - 1) / 2) * tierH;
    if (t.right) letters.push({ L: t.right, x: 0.6 * sx, y, rot: 0, mir: 1, sx, sy });
    if (t.left) letters.push({ L: t.left, x: -0.6 * sx, y, rot: 0, mir: -1, sx, sy });
    if (t.centre) letters.push({ L: t.centre, x: 0, y, rot: 0, mir: 1, sx, sy });
  });
  // keep the letters in the order they were written, so the hint reads the same way
  letters.sort((a, b) => kept.indexOf(a.L) - kept.indexOf(b.L));
  const top = -((n - 1) / 2) * tierH - sy, bottom = ((n - 1) / 2) * tierH + sy;
  return { letters, guide: `M0 ${top.toFixed(1)} L0 ${bottom.toFixed(1)}` };
}

function initSigil(root: HTMLElement, world: World) {
  const svg = root.querySelector<SVGSVGElement>('[data-sigil-svg]')!;
  const mark = root.querySelector<SVGGElement>('[data-sigil-mark]')!;
  const form = root.querySelector<HTMLFormElement>('[data-sigil-form]')!;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const hint = root.querySelector<HTMLElement>('[data-sigil-hint]')!;
  const saveBtn = root.querySelector<HTMLButtonElement>('[data-sigil-save]')!;
  const penBtn = root.querySelector<HTMLButtonElement>('[data-sigil-pen]')!;
  const turnBtn = root.querySelector<HTMLButtonElement>('[data-mono-turn]')!;
  const flipBtn = root.querySelector<HTMLButtonElement>('[data-mono-flip]')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-draw-clear]')!;
  const page = root.closest('section')!;
  const how = page.querySelector<HTMLElement>('[data-sigil-how]');
  const origin = page.querySelector<HTMLElement>('[data-sigil-origin]');
  let method = (root.dataset.method as SigilMethod) || 'wheel';
  let arrangement: Arrangement = (root.dataset.arr as Arrangement) || 'line';
  // the intention lives only in this variable, so each way can redraw it; it is never stored
  let text = '';
  let pen = false;
  let placed: Placed[] = [];
  let picked = -1;

  const make = (tag: string, attrs: Record<string, string | number>, parent: Element = mark) => {
    const e = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    parent.appendChild(e);
    return e as SVGGeometryElement;
  };
  const el = (tag: string, attrs: Record<string, string | number>) => make(tag, attrs);
  const setPen = (on: boolean) => {
    pen = on;
    root.classList.toggle('pen-on', on || method === 'draw');
    penBtn.setAttribute('aria-pressed', String(on));
  };
  const showTools = () => {
    const has = mark.querySelector('.sg-line') !== null;
    saveBtn.hidden = !has;
    penBtn.hidden = !has || method === 'draw';
    saveBtn.textContent = 'Save it as a picture';
    root.classList.toggle('has-sigil', has);
  };
  const clear = () => {
    gsap.killTweensOf(Array.from(mark.querySelectorAll('*')));
    mark.innerHTML = '';
    placed = [];
    pick(-1);
    setPen(false);
    root.querySelectorAll('.is-used').forEach((x) => x.classList.remove('is-used'));
    showTools();
  };
  const finished = () => { ring('card'); buzz(PATTERNS.cardFlip); world.flash(0.6); showTools(); };
  /** draw every stroke in turn, like a pen */
  const ink = (parts: SVGGeometryElement[], total = 1.6) => {
    const lens = parts.map((p) => { try { return p.getTotalLength(); } catch { return 0; } });
    const sum = lens.reduce((a, b) => a + b, 0) || 1;
    const tl = gsap.timeline({ onComplete: finished });
    let t = 0;
    parts.forEach((p, i) => {
      const d = Math.max(0.08, (lens[i] / sum) * total);
      if (lens[i] > 0) tl.fromTo(p, { strokeDasharray: lens[i], strokeDashoffset: lens[i] }, { strokeDashoffset: 0, duration: d, ease: 'power1.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }, t);
      t += d * 0.85;
    });
  };
  /** a small ring where the line starts and a short bar across where it ends */
  const ends = (pts: number[][]) => {
    const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
    const [px, py] = pts.length > 1 ? pts[pts.length - 2] : [ex - 1, ey];
    const dx = ex - px, dy = ey - py, len = Math.hypot(dx, dy) || 1, nx = (-dy / len) * 7, ny = (dx / len) * 7;
    return [
      el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: 5, class: 'sg-line sg-start' }),
      el('line', { x1: (ex + nx).toFixed(1), y1: (ey + ny).toFixed(1), x2: (ex - nx).toFixed(1), y2: (ey - ny).toFixed(1), class: 'sg-line sg-end' }),
    ];
  };
  const path = (pts: number[][]) => `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')}`;
  const done = (what: string) => { hint.textContent = `${what} Nothing you typed was saved.`; };

  /* ---- the monogram: letters you can move, turn and flip */
  const letterTransform = (p: Placed) => `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot}) scale(${(p.mir * p.sx).toFixed(2)} ${p.sy.toFixed(2)})`;
  const placeLetter = (i: number) => {
    const g = mark.querySelector<SVGGElement>(`[data-li="${i}"]`);
    if (!g) return;
    const p = placed[i];
    g.querySelectorAll('path').forEach((x) => x.setAttribute('transform', letterTransform(p)));
  };
  function pick(i: number) {
    picked = i;
    mark.querySelectorAll('[data-li]').forEach((g) => g.classList.toggle('is-picked', Number((g as SVGElement).dataset.li) === i));
    turnBtn.disabled = flipBtn.disabled = i < 0;
  }
  const drawMonogram = (animate: boolean) => {
    const kept = keptLetters(text);
    const { letters, guide } = arrange(kept, arrangement);
    placed = letters;
    const parts: SVGGeometryElement[] = [];
    if (guide) parts.push(el('path', { d: guide, class: 'sg-line sg-guide' }));
    placed.forEach((p, i) => {
      const g = make('g', { 'data-li': i, class: 'sg-letter-g' });
      const d = glyphPath(GLYPHS[p.L], 1, 1), k = (p.sx + p.sy) / 2;
      // a wide invisible stroke under each letter makes it easy to pick up, even on a phone
      make('path', { d, transform: letterTransform(p), 'stroke-width': (18 / k).toFixed(3), class: 'sg-hit', 'pointer-events': 'stroke' }, g);
      parts.push(make('path', { d, transform: letterTransform(p), 'stroke-width': (2.6 / k).toFixed(4), class: 'sg-line sg-scaled' }, g));
    });
    if (animate) ink(parts, 2); else finished();
    const where = arrangement === 'ring' ? 'set around a ring' : arrangement === 'stack' ? 'stacked on one centre' : 'hung on one central line';
    done(`${kept.join(' · ')}: ${where}. Drag any letter to move it; pick one to turn or flip it.${kept.length > 9 ? ' Fewer words give a cleaner figure.' : ''}`);
  };

  const methods: Record<Exclude<SigilMethod, 'draw'>, () => void> = {
    wheel: () => {
      const kept = keptLetters(text);
      root.querySelectorAll<SVGElement>('.sg-letter').forEach((t) => t.classList.toggle('is-used', kept.includes(t.dataset.letter!)));
      const pts = kept.map((L) => { const a = ((-90 + ((L.charCodeAt(0) - 65) * 360) / 26) * Math.PI) / 180; return [Math.cos(a) * 84, Math.sin(a) * 84]; });
      const line = el('path', { d: path(pts), class: 'sg-line' });
      const [a, b] = ends(pts);
      ink([a, line, b]);
      done(`${kept.join(' · ')}: traced on the wheel.`);
    },
    monogram: () => drawMonogram(true),
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
      done(`${kept.map((L, i) => `${L} ${nums[i]}`).join(' · ')}: joined on the square.`);
    },
    bindrune: () => {
      const words = text.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
      const letters = words.length >= 2 ? words.map((w) => w[0]) : [...new Set((words[0] ?? '').split(''))].slice(0, 5);
      const chosen: { L: string; rune: string }[] = [];
      letters.forEach((L) => { const r = LETTER_RUNE[L]; if (r && !chosen.some((p) => p.rune === r) && chosen.length < 6) chosen.push({ L, rune: r }); });
      const parts = [el('path', { d: 'M0 -96 L0 96', class: 'sg-line sg-stave' })];
      chosen.forEach(({ rune }) => RUNES[rune].strokes.forEach((s) => parts.push(el('path', { d: path(s.map(([x, y]) => [x * 76, y * 96])), class: 'sg-line' }))));
      ink(parts, 1.8);
      done(`${chosen.map((p) => `${p.L} ${RUNES[p.rune].name}`).join(' · ')}: bound on one stave.`);
    },
  };

  const render = () => {
    clear();
    if (method === 'draw' || !text) return;
    methods[method]();
  };

  /* ---- the pen: draw your own, or add strokes by hand to any sigil; and dragging letters */
  const toSvg = (e: PointerEvent, keepIn = true) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const r = Math.hypot(q.x, q.y), max = 108;
    if (keepIn && r > max) { q.x *= max / r; q.y *= max / r; }
    return q;
  };
  let stroke: SVGPathElement | null = null, lastPt: DOMPoint | null = null;
  let drag: { i: number; px: number; py: number; x: number; y: number } | null = null;
  const down = (e: PointerEvent) => {
    const penning = method === 'draw' || pen;
    const g = (e.target as Element | null)?.closest<SVGGElement>('[data-li]');
    if (!penning && method === 'monogram' && g) {
      e.preventDefault();
      const i = Number(g.dataset.li);
      pick(i);
      const p = toSvg(e, false);
      drag = { i, px: p.x, py: p.y, x: placed[i].x, y: placed[i].y };
      svg.setPointerCapture(e.pointerId);
      buzz([5]);
      return;
    }
    if (!penning) { if (method === 'monogram') pick(-1); return; }
    e.preventDefault(); // no text selection while drawing
    const p = toSvg(e);
    stroke = el('path', { d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`, class: 'sg-line sg-hand' }) as SVGPathElement;
    lastPt = p;
    svg.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (drag) {
      const p = toSvg(e, false);
      const pl = placed[drag.i];
      pl.x = drag.x + (p.x - drag.px);
      pl.y = drag.y + (p.y - drag.py);
      const r = Math.hypot(pl.x, pl.y);
      if (r > 96) { pl.x *= 96 / r; pl.y *= 96 / r; }
      placeLetter(drag.i);
      return;
    }
    if (!stroke || !lastPt) return;
    const p = toSvg(e);
    if (Math.hypot(p.x - lastPt.x, p.y - lastPt.y) < 2) return;
    stroke.setAttribute('d', `${stroke.getAttribute('d')} L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    lastPt = p;
  };
  const up = () => {
    if (stroke) { stroke = null; lastPt = null; showTools(); if (method === 'draw') hint.textContent = 'Keep drawing, or save it when it feels finished. Nothing you drew is saved unless you save the picture.'; }
    drag = null;
  };
  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  const onPen = () => {
    setPen(!pen);
    pick(-1);
    hint.textContent = pen ? 'The pen is on: draw over the sigil inside the ring. Tap the pen again to stop.' : hint.textContent;
    buzz(PATTERNS.choice);
  };
  const onTurn = () => { if (picked < 0) return; placed[picked].rot = (placed[picked].rot + 45) % 360; placeLetter(picked); buzz([5]); };
  const onFlip = () => { if (picked < 0) return; placed[picked].mir *= -1; placeLetter(picked); buzz([5]); };
  const onClear = () => { clear(); if (method === 'draw') hint.textContent = 'Draw with your finger or mouse inside the ring.'; };
  penBtn.addEventListener('click', onPen);
  turnBtn.addEventListener('click', onTurn);
  flipBtn.addEventListener('click', onFlip);
  clearBtn.addEventListener('click', onClear);

  /* ---- choosing a way, and an arrangement for the monogram */
  const choose = (m: SigilMethod) => {
    method = m;
    root.dataset.method = m;
    page.querySelectorAll<HTMLButtonElement>('[data-sigil-method]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sigilMethod === m)));
    const info = SIGIL_METHODS.find((x) => x.key === m)!;
    if (how) how.textContent = info.how;
    if (origin) origin.textContent = info.origin;
    if (m === 'draw') { clear(); setPen(false); hint.textContent = 'Draw with your finger or mouse inside the ring.'; return; }
    if (text) render();
    else { clear(); hint.textContent = 'Your sigil will be drawn here.'; }
  };
  const onClick = (e: Event) => {
    const t = e.target as Element | null;
    const b = t?.closest<HTMLButtonElement>('[data-sigil-method]');
    if (b) { choose(b.dataset.sigilMethod as SigilMethod); buzz(PATTERNS.choice); return; }
    const a = t?.closest<HTMLButtonElement>('[data-mono-arr]');
    if (a) {
      arrangement = a.dataset.monoArr as Arrangement;
      root.dataset.arr = arrangement;
      root.querySelectorAll<HTMLButtonElement>('[data-mono-arr]').forEach((x) => x.setAttribute('aria-pressed', String(x === a)));
      if (text && method === 'monogram') { clear(); drawMonogram(true); }
      buzz(PATTERNS.choice);
    }
  };
  page.addEventListener('click', onClick);

  const submit = (e: Event) => {
    e.preventDefault();
    const t = input.value.trim();
    if (!/[a-z]/i.test(t)) { input.focus(); return; }
    text = t;
    input.value = '';
    render();
  };
  form.addEventListener('submit', submit);

  // a picture of the sigil to keep: parchment, a gold ring and the vermilion lines (no letters or numbers on the board, so the intention stays private)
  const save = () => {
    if (!mark.querySelector('.sg-line')) return;
    const clone = mark.cloneNode(true) as SVGGElement;
    clone.querySelectorAll('.sg-hit').forEach((n) => n.remove());
    clone.querySelectorAll('*').forEach((n) => { n.removeAttribute('style'); n.removeAttribute('class'); n.removeAttribute('pointer-events'); });
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-130 -130 260 260" width="1080" height="1080">`
      + `<rect x="-130" y="-130" width="260" height="260" fill="#e8dcc0"/>`
      + `<circle r="120" fill="none" stroke="#9a7428" stroke-width="1.8"/><circle r="113" fill="none" stroke="#9a7428" stroke-width="0.6"/>`
      + `<g fill="none" stroke="#b1261a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${clone.innerHTML}</g></svg>`;
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
  showTools();

  return () => {
    form.removeEventListener('submit', submit);
    saveBtn.removeEventListener('click', save);
    page.removeEventListener('click', onClick);
    svg.removeEventListener('pointerdown', down);
    svg.removeEventListener('pointermove', move);
    svg.removeEventListener('pointerup', up);
    svg.removeEventListener('pointercancel', up);
    penBtn.removeEventListener('click', onPen);
    turnBtn.removeEventListener('click', onTurn);
    flipBtn.removeEventListener('click', onFlip);
    clearBtn.removeEventListener('click', onClear);
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
