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
  /* ---------------- Pillar 1, Devotion & the Unseen · direction C, Cosmic mother */
  devC_hero: {
    a: '#050617', b: '#1f1450', c: '#3a4fb8', glow: '#e7c46a',
    ink: '#f1efff', inkSoft: '#b9b4d8', scale: 1.8, warp: 2.6, speed: 0.05, light: 0, motes: 1.0, form: 'mala', shift: 4.4,
  },
  devC_home: {
    a: '#050617', b: '#1f1450', c: '#3a4fb8', glow: '#e7c46a',
    ink: '#f1efff', inkSoft: '#b9b4d8', scale: 1.8, warp: 2.6, speed: 0.05, light: 0, motes: 1.0, form: 'yantra', shift: 5.4,
  },
  // I · Kali and the Mahavidyas: the Kali yantra, with a breath of red
  devC_vidyas: {
    a: '#06040f', b: '#241040', c: '#b8325a', glow: '#e7c46a',
    ink: '#f3efff', inkSoft: '#bfb6da', scale: 1.8, warp: 2.4, speed: 0.045, light: 0, motes: 0.8, form: 'yantra', shift: 0, fade: 0.85,
  },
  // II · the Devi and the Hindu deities: the yantra continues, rose and gold
  devC_devi: {
    a: '#070414', b: '#2a1048', c: '#d98cb3', glow: '#f0cf7a',
    ink: '#f6f0ff', inkSoft: '#c6b8d8', scale: 1.7, warp: 2.4, speed: 0.045, light: 0, motes: 0.8, form: 'yantra', shift: 0, fade: 0.55,
  },
  // III · the Greek gods: a temple of light on a deep Aegean night
  devC_greek: {
    a: '#03081a', b: '#0f2250', c: '#7fa4e8', glow: '#f3ead8',
    ink: '#f3f1ff', inkSoft: '#b8c0dc', scale: 1.6, warp: 2.2, speed: 0.04, light: 0, motes: 0.7, form: 'temple', shift: 0, fade: 0.6,
  },
  // IV · many lands: constellations
  devC_lands: {
    a: '#04061a', b: '#1a1a52', c: '#5a8ad8', glow: '#e9edff',
    ink: '#f1efff', inkSoft: '#b9b4d8', scale: 2.1, warp: 2.6, speed: 0.05, light: 0, motes: 1.0, form: 'stars', shift: 0, fade: 0.8,
  },
  // V · altars and devotion: lamps
  devC_altar: {
    a: '#05040f', b: '#1d1440', c: '#c2902a', glow: '#ffd98a',
    ink: '#f6f0ff', inkSoft: '#c6bcd8', scale: 1.5, warp: 2.0, speed: 0.04, light: 0, motes: 0.5, form: 'lamps', shift: 0,
  },
  // VI · spirits and ancestors: a nebula
  devC_spirits: {
    a: '#04040f', b: '#2a1460', c: '#6a5ad8', glow: '#f1efff',
    ink: '#f1efff', inkSoft: '#b9b4d8', scale: 1.6, warp: 3.0, speed: 0.04, light: 0, motes: 0.9, form: 'dust', shift: 0,
  },
  // VII · shamanic work: the world tree
  devC_shaman: {
    a: '#030a10', b: '#0e2a32', c: '#3a9a8a', glow: '#e7d38a',
    ink: '#eef6f3', inkSoft: '#a9c4bf', scale: 1.6, warp: 2.4, speed: 0.05, light: 0, motes: 0.6, form: 'tree', shift: 3.6,
  },
  devC_close: {
    a: '#050617', b: '#1f1450', c: '#3a4fb8', glow: '#e7c46a',
    ink: '#f1efff', inkSoft: '#b9b4d8', scale: 1.8, warp: 2.6, speed: 0.05, light: 0, motes: 0.9, form: 'halo', shift: 0,
  },
  /* ---------------- Pillar 2, Witchcraft & Magic: three directions to compare */
  // A · The grimoire (parchment; the baneful chapter is a black page)
  magA_hero: {
    a: '#e8dcc0', b: '#cdb98f', c: '#9c2a1c', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'sigils', shift: 4.4, fade: 0.8,
  },
  magA_home: {
    a: '#e8dcc0', b: '#cdb98f', c: '#9c2a1c', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'sigils', shift: 5.4, fade: 0.8,
  },
  magA_love: {
    a: '#e8dcc0', b: '#cdb98f', c: '#9c2a1c', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'rose', shift: 4.2, fade: 0.55,
  },
  magA_abundance: {
    a: '#e8dcc0', b: '#cdb98f', c: '#8a6a1c', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'vortex', shift: 4.2, fade: 0.55,
  },
  magA_protection: {
    a: '#e8dcc0', b: '#cdb98f', c: '#3f8f78', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'pentacle', shift: 4.2, fade: 0.55,
  },
  magA_baneful: {
    a: '#0d0b08', b: '#1f1712', c: '#6b2a1c', glow: '#e8dcc0',
    ink: '#e8dcc0', inkSoft: '#a89a80', scale: 1.4, warp: 2.6, speed: 0.04, light: 0, motes: 0.3, form: 'eye', shift: 4.2, fade: 0.5,
  },
  magA_spellcraft: {
    a: '#e8dcc0', b: '#cdb98f', c: '#3f8f78', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'sigils', shift: 4.2, fade: 0.55,
  },
  magA_rituals: {
    a: '#e8dcc0', b: '#cdb98f', c: '#c06a1c', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'agni', shift: 2.8, fade: 0.55,
  },
  magA_nature: {
    a: '#e8dcc0', b: '#cdb98f', c: '#5e6a8a', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'moons', shift: 4.2, fade: 0.55,
  },
  magA_close: {
    a: '#e8dcc0', b: '#cdb98f', c: '#9c2a1c', glow: '#fff6e2',
    ink: '#2a1d14', inkSoft: '#5e4634', scale: 1.0, warp: 1.4, speed: 0.03, light: 1, motes: 0.2, form: 'rose', shift: 0, fade: 0.7,
  },
  // B · Moon garden
  magB_hero: {
    a: '#06120e', b: '#1f3a2a', c: '#8fb89a', glow: '#dfe6f0',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'moons', shift: 4.4, fade: 0.9,
  },
  magB_home: {
    a: '#06120e', b: '#1f3a2a', c: '#8fb89a', glow: '#dfe6f0',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'moons', shift: 5.4, fade: 0.9,
  },
  magB_love: {
    a: '#06120e', b: '#1f3a2a', c: '#d98ca0', glow: '#f6dfe6',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'rose', shift: 4.2, fade: 0.85,
  },
  magB_abundance: {
    a: '#06120e', b: '#1f3a2a', c: '#c9b86a', glow: '#f3ecc4',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'tree', shift: 3.8, fade: 0.85,
  },
  magB_protection: {
    a: '#06120e', b: '#1f3a2a', c: '#8fb89a', glow: '#dfe6f0',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'pentacle', shift: 4.2, fade: 0.85,
  },
  magB_baneful: {
    a: '#040806', b: '#121a16', c: '#4a5a66', glow: '#c6c6d8',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'silk', shift: 0, fade: 0.85,
  },
  magB_spellcraft: {
    a: '#06120e', b: '#1f3a2a', c: '#e8c37a', glow: '#ffe6a8',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'lamps', shift: 0, fade: 0.9,
  },
  magB_rituals: {
    a: '#06120e', b: '#1f3a2a', c: '#e8c37a', glow: '#fff1c8',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'halo', shift: 0, fade: 0.85,
  },
  magB_nature: {
    a: '#06120e', b: '#1f3a2a', c: '#b9a3d8', glow: '#eae4ff',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'moons', shift: 4.2, fade: 0.85,
  },
  magB_close: {
    a: '#06120e', b: '#1f3a2a', c: '#8fb89a', glow: '#dfe6f0',
    ink: '#eef4ee', inkSoft: '#a9c2b2', scale: 1.4, warp: 2.2, speed: 0.045, light: 0, motes: 0.6, form: 'tree', shift: 0, fade: 0.8,
  },
  // C · Alchemical sky
  magC_hero: {
    a: '#050505', b: '#0d3b2e', c: '#b8693a', glow: '#d9b25a',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'astrolabe', shift: 4.4, fade: 0.9,
  },
  magC_home: {
    a: '#050505', b: '#0d3b2e', c: '#b8693a', glow: '#d9b25a',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'astrolabe', shift: 5.4, fade: 0.9,
  },
  magC_love: {
    a: '#050505', b: '#0d3b2e', c: '#c8321e', glow: '#d9b25a',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'rose', shift: 4.2, fade: 0.65,
  },
  magC_abundance: {
    a: '#050505', b: '#0d3b2e', c: '#d9b25a', glow: '#f3d98a',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'halo', shift: 0, fade: 0.6,
  },
  magC_protection: {
    a: '#050505', b: '#0d3b2e', c: '#c8321e', glow: '#d9b25a',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'pentacle', shift: 4.2, fade: 0.65,
  },
  magC_baneful: {
    a: '#030303', b: '#141414', c: '#5a5a62', glow: '#c9d1dc',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'eye', shift: 4.2, fade: 0.5,
  },
  magC_spellcraft: {
    a: '#050505', b: '#0d3b2e', c: '#c9d1dc', glow: '#e6ebf2',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'sigils', shift: 4.2, fade: 0.65,
  },
  magC_rituals: {
    a: '#050505', b: '#0d3b2e', c: '#d9b25a', glow: '#ffe4a0',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'flames', shift: 4.2, fade: 0.7,
  },
  magC_nature: {
    a: '#050505', b: '#0d3b2e', c: '#c9d1dc', glow: '#eef2f8',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'moons', shift: 4.2, fade: 0.65,
  },
  magC_close: {
    a: '#050505', b: '#0d3b2e', c: '#b8693a', glow: '#d9b25a',
    ink: '#f3ecdd', inkSoft: '#bdb29a', scale: 1.7, warp: 2.6, speed: 0.05, light: 0, motes: 0.8, form: 'astrolabe', shift: 0, fade: 0.8,
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
