/**
 * Every chapter of the site is one "atmosphere": a set of numbers the living
 * world blends towards. These are PLACEHOLDER palettes that only exist to show
 * the blending. Each pillar's real look is designed in its own session.
 */
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
};

export const PRESETS: Record<string, Preset> = {
  loader: {
    a: '#030202', b: '#120506', c: '#3a0d0a', glow: '#c2412d',
    ink: '#f3e7dc', inkSoft: '#a8968a', scale: 1.2, warp: 1.2, speed: 0.05, light: 0, motes: 0.15,
  },
  hero: {
    a: '#060304', b: '#2a0a10', c: '#a8321f', glow: '#f0b34a',
    ink: '#f6ece2', inkSoft: '#c4ada0', scale: 1.5, warp: 2.4, speed: 0.07, light: 0, motes: 0.55,
  },
  connect: {
    a: '#0c0706', b: '#3a1a12', c: '#c9773a', glow: '#ffcf8a',
    ink: '#f8eee3', inkSoft: '#cdb6a4', scale: 1.3, warp: 2.0, speed: 0.06, light: 0, motes: 0.4,
  },
  devotion: {
    a: '#07050f', b: '#2b0f2e', c: '#b8892f', glow: '#f2c66b',
    ink: '#f5ead9', inkSoft: '#c2ad98', scale: 1.6, warp: 2.8, speed: 0.06, light: 0, motes: 0.75,
  },
  magic: {
    a: '#05040c', b: '#1f0f44', c: '#3fae86', glow: '#9cf5c8',
    ink: '#eef2ec', inkSoft: '#a9b8b0', scale: 2.0, warp: 3.4, speed: 0.09, light: 0, motes: 0.9,
  },
  healing: {
    a: '#03111a', b: '#0b3d48', c: '#7fd1c0', glow: '#d9fff4',
    ink: '#effaf8', inkSoft: '#a7c7c3', scale: 1.1, warp: 1.6, speed: 0.04, light: 0.15, motes: 0.45,
  },
  identity: {
    a: '#12060b', b: '#4d1632', c: '#e889a6', glow: '#ffd3df',
    ink: '#fbeef2', inkSoft: '#d4aebb', scale: 1.4, warp: 2.2, speed: 0.06, light: 0.1, motes: 0.6,
  },
  divination: {
    a: '#02040f', b: '#0e1d4d', c: '#8fa6ff', glow: '#e9edff',
    ink: '#eef1ff', inkSoft: '#a9b2d6', scale: 2.2, warp: 2.6, speed: 0.05, light: 0, motes: 1.0,
  },
  learning: {
    a: '#e8dcc6', b: '#cdb48a', c: '#8a5a33', glow: '#fff6e2',
    ink: '#24170f', inkSoft: '#5e4a3a', scale: 1.0, warp: 1.4, speed: 0.035, light: 1, motes: 0.2,
  },
  close: {
    a: '#050203', b: '#240809', c: '#8e2a1a', glow: '#f0b34a',
    ink: '#f6ece2', inkSoft: '#c4ada0', scale: 1.5, warp: 2.4, speed: 0.06, light: 0, motes: 0.5,
  },
};

export type Numeric = {
  a: number[]; b: number[]; c: number[]; glow: number[]; ink: number[]; inkSoft: number[];
  scale: number; warp: number; speed: number; light: number; motes: number;
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
  };
}

const COLOR_KEYS = ['a', 'b', 'c', 'glow', 'ink', 'inkSoft'] as const;
const NUM_KEYS = ['scale', 'warp', 'speed', 'light', 'motes'] as const;

/** out = lerp(x, y, t), written into out */
export function mixInto(out: Numeric, x: Numeric, y: Numeric, t: number) {
  for (const k of COLOR_KEYS) for (let i = 0; i < 3; i++) out[k][i] = x[k][i] + (y[k][i] - x[k][i]) * t;
  for (const k of NUM_KEYS) out[k] = x[k] + (y[k] - x[k]) * t;
}

/** move `cur` towards `target` by factor k (frame-rate independent damping) */
export function dampInto(cur: Numeric, target: Numeric, k: number) {
  mixInto(cur, cur, target, k);
}

export function cloneNumeric(n: Numeric): Numeric {
  return JSON.parse(JSON.stringify(n));
}
