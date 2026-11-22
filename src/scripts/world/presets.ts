/**
 * Every chapter of the site is one "atmosphere": a set of numbers the living
 * world blends towards. These are PLACEHOLDER palettes that only exist to show
 * the blending. Each pillar's real look is designed in its own session.
 */
import { FORM_KEYS, type FormKey } from './forms';

export type Preset = {
  /** deep base, mid tone and highlight of the smoke */
  a: string;
  b: string;
  c: string;
  /** colour of light that follows the pointer and the particle tint */
  glow: string;
  /** text colours for this atmosphere */
  ink: string;
  inkSoft: string;
  /** smoke shape */
  scale: number;
  warp: number;
  speed: number;
  /** 0 = dark world, 1 = light world (changes vignette and grain) */
  light: number;
  /** particle amount 0..1 */
  motes: number;
  /** which living form the point cloud takes in this chapter */
  form: FormKey;
  /** sideways offset of the form on wide screens (keeps it beside the text) */
  shift?: number;
  /** 1 for the dawn hero: light rises from below */
  dawn?: number;
  /** how strongly the living form shows (1 = fully); quieter behind long reading */
  fade?: number;
};

export const PRESETS: Record<string, Preset> = {
  loader: {
    a: '#030202', b: '#120506', c: '#3a0d0a', glow: '#c2412d',
    ink: '#f3e7dc', inkSoft: '#a8968a', scale: 1.2, warp: 1.2, speed: 0.05, light: 0, motes: 0.15, form: 'dust', shift: 0,
  },
  hero: {
    a: '#060304', b: '#2a0a10', c: '#a8321f', glow: '#f0b34a',
    ink: '#f6ece2', inkSoft: '#c4ada0', scale: 1.5, warp: 2.4, speed: 0.07, light: 0, motes: 0.55, form: 'halo', shift: 0,
  },
  connect: {
    a: '#0c0706', b: '#3a1a12', c: '#c9773a', glow: '#ffcf8a',
    ink: '#f8eee3', inkSoft: '#cdb6a4', scale: 1.3, warp: 2.0, speed: 0.06, light: 0, motes: 0.4, form: 'vortex', shift: 3.6,
  },
  devotion: {
    a: '#07050f', b: '#2b0f2e', c: '#b8892f', glow: '#f2c66b',
    ink: '#f5ead9', inkSoft: '#c2ad98', scale: 1.6, warp: 2.8, speed: 0.06, light: 0, motes: 0.75, form: 'flames', shift: 2.9,
  },
  magic: {
    a: '#05040c', b: '#1f0f44', c: '#3fae86', glow: '#9cf5c8',
    ink: '#eef2ec', inkSoft: '#a9b8b0', scale: 2.0, warp: 3.4, speed: 0.09, light: 0, motes: 0.9, form: 'sigils', shift: 3.0,
  },
  healing: {
    a: '#03111a', b: '#0b3d48', c: '#7fd1c0', glow: '#d9fff4',
    ink: '#effaf8', inkSoft: '#a7c7c3', scale: 1.1, warp: 1.6, speed: 0.04, light: 0.15, motes: 0.45, form: 'water', shift: 0,
  },
  identity: {
    a: '#12060b', b: '#4d1632', c: '#e889a6', glow: '#ffd3df',
    ink: '#fbeef2', inkSoft: '#d4aebb', scale: 1.4, warp: 2.2, speed: 0.06, light: 0.1, motes: 0.6, form: 'silk', shift: 1.4,
  },
  divination: {
    a: '#02040f', b: '#0e1d4d', c: '#8fa6ff', glow: '#e9edff',
    ink: '#eef1ff', inkSoft: '#a9b2d6', scale: 2.2, warp: 2.6, speed: 0.05, light: 0, motes: 1.0, form: 'stars', shift: 0,
  },
  learning: {
    a: '#e8dcc6', b: '#cdb48a', c: '#8a5a33', glow: '#fff6e2',
    ink: '#24170f', inkSoft: '#5e4a3a', scale: 1.0, warp: 1.4, speed: 0.035, light: 1, motes: 0.2, form: 'letters', shift: 2.9,
  },
  heroName: {
    a: '#050304', b: '#220a12', c: '#8f2d22', glow: '#ffd08a',
    ink: '#f6ece2', inkSoft: '#c4ada0', scale: 1.4, warp: 2.2, speed: 0.06, light: 0, motes: 0.4, form: 'name', shift: 0,
  },
  dawn: {
    a: '#04030c', b: '#2c1838', c: '#ff9a5c', glow: '#ffd9a0',
    ink: '#fbf0e6', inkSoft: '#d8bfb0', scale: 1.2, warp: 1.8, speed: 0.045, light: 0, motes: 0.35, form: 'horizon', shift: 0, dawn: 1,
  },
  dawnRise: {
    a: '#04030c', b: '#2c1838', c: '#ff9a5c', glow: '#ffd9a0',
    ink: '#fbf0e6', inkSoft: '#d8bfb0', scale: 1.2, warp: 1.8, speed: 0.045, light: 0, motes: 0.35, form: 'horizon', shift: 0, dawn: 1,
  },
  dawnName: {
    a: '#04030c', b: '#2c1838', c: '#ff9a5c', glow: '#ffd9a0',
    ink: '#fbf0e6', inkSoft: '#d8bfb0', scale: 1.2, warp: 1.8, speed: 0.045, light: 0, motes: 0.35, form: 'name', shift: 0, dawn: 1,
  },
  /* quieter worlds behind long text */
  reading: {
    a: '#e8dcc6', b: '#cdb48a', c: '#8a5a33', glow: '#fff6e2',
    ink: '#24170f', inkSoft: '#5e4a3a', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.15, form: 'letters', shift: 6.4, fade: 0.4,
  },
  devotionQuiet: {
    a: '#07050f', b: '#2b0f2e', c: '#b8892f', glow: '#f2c66b',
    ink: '#f5ead9', inkSoft: '#c2ad98', scale: 1.6, warp: 2.8, speed: 0.05, light: 0, motes: 0.5, form: 'flames', shift: 4.6, fade: 0.45,
  },
  /* daily practice */
  mala: {
    a: '#06040a', b: '#1d1030', c: '#a8742f', glow: '#f6d38a',
    ink: '#f6ede2', inkSoft: '#c8b4a2', scale: 1.4, warp: 2.0, speed: 0.05, light: 0, motes: 0.4, form: 'mala', shift: 2.7, fade: 0.6,
  },
  agni: {
    a: '#080302', b: '#3a0c06', c: '#e0521f', glow: '#ffc06a',
    ink: '#fbeee2', inkSoft: '#d9b5a0', scale: 1.5, warp: 2.6, speed: 0.08, light: 0, motes: 0.6, form: 'agni', shift: 2.8,
  },
  lampsNight: {
    a: '#03030a', b: '#151030', c: '#c27a2a', glow: '#ffd27a',
    ink: '#f6eee4', inkSoft: '#c6b6a6', scale: 1.3, warp: 1.8, speed: 0.04, light: 0, motes: 0.3, form: 'lamps', shift: 0,
  },
  /* kind words on the homepage */
  kind: {
    a: '#0a0505', b: '#2c1410', c: '#c06a3a', glow: '#ffcf9a',
    ink: '#f8ede4', inkSoft: '#d0b7a6', scale: 1.4, warp: 2.1, speed: 0.05, light: 0, motes: 0.6, form: 'stars', shift: 0,
  },
  /* festival nights: the hero changes on these days */
  festKali: {
    a: '#020101', b: '#2a0306', c: '#b3121c', glow: '#ff7a4a',
    ink: '#fbeee6', inkSoft: '#d8b2a8', scale: 1.5, warp: 2.6, speed: 0.06, light: 0, motes: 0.5, form: 'lamps', shift: 0,
  },
  festDiwali: {
    a: '#050302', b: '#2a1806', c: '#e0a030', glow: '#ffe2a0',
    ink: '#fbf1e2', inkSoft: '#dcc6a6', scale: 1.4, warp: 2.2, speed: 0.05, light: 0, motes: 0.6, form: 'lamps', shift: 0,
  },
  festNavratri: {
    a: '#0a0410', b: '#4a0c3a', c: '#ff6a1a', glow: '#ffd27a',
    ink: '#fdf0ea', inkSoft: '#e0b8c4', scale: 1.6, warp: 2.8, speed: 0.07, light: 0, motes: 0.7, form: 'halo', shift: 0,
  },
  festEclipse: {
    a: '#010102', b: '#0a0a14', c: '#3a3a55', glow: '#fff2d0',
    ink: '#f2f0ee', inkSoft: '#b8b6c0', scale: 1.3, warp: 1.6, speed: 0.03, light: 0, motes: 0.3, form: 'halo', shift: 0,
  },
  close: {
    a: '#050203', b: '#240809', c: '#8e2a1a', glow: '#f0b34a',
    ink: '#f6ece2', inkSoft: '#c4ada0', scale: 1.5, warp: 2.4, speed: 0.06, light: 0, motes: 0.5, form: 'eye', shift: 0,
  },
};

export type Numeric = {
  a: number[]; b: number[]; c: number[]; glow: number[]; ink: number[]; inkSoft: number[];
  scale: number; warp: number; speed: number; light: number; motes: number;
  shift: number; dawn: number; fade: number;
  /** one weight per form, blended: drives each form's own motion */
  w: number[];
  form: FormKey;
};

export function hexToRgb(hex: string): number[] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

export function toNumeric(p: Preset): Numeric {
  return {
    a: hexToRgb(p.a), b: hexToRgb(p.b), c: hexToRgb(p.c), glow: hexToRgb(p.glow),
    ink: hexToRgb(p.ink), inkSoft: hexToRgb(p.inkSoft),
    scale: p.scale, warp: p.warp, speed: p.speed, light: p.light, motes: p.motes,
    shift: p.shift ?? 0, dawn: p.dawn ?? 0, fade: p.fade ?? 1,
    w: FORM_KEYS.map((k) => (k === p.form ? 1 : 0)),
    form: p.form,
  };
}

const COLOR_KEYS = ['a', 'b', 'c', 'glow', 'ink', 'inkSoft'] as const;
const NUM_KEYS = ['scale', 'warp', 'speed', 'light', 'motes', 'shift', 'dawn', 'fade'] as const;

/** out = lerp(x, y, t), written into out */
export function mixInto(out: Numeric, x: Numeric, y: Numeric, t: number) {
  for (const k of COLOR_KEYS) for (let i = 0; i < 3; i++) out[k][i] = x[k][i] + (y[k][i] - x[k][i]) * t;
  for (const k of NUM_KEYS) out[k] = x[k] + (y[k] - x[k]) * t;
  for (let i = 0; i < out.w.length; i++) out.w[i] = x.w[i] + (y.w[i] - x.w[i]) * t;
}

/** move `cur` towards `target` by factor k (frame-rate independent damping) */
export function dampInto(cur: Numeric, target: Numeric, k: number) {
  mixInto(cur, cur, target, k);
}

export function cloneNumeric(n: Numeric): Numeric {
  return JSON.parse(JSON.stringify(n));
}
