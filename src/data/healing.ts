/**
 * Pillar 3, Healing & Inner Work · Still water, with gold.
 * The chosen direction mixes A (Still water: night pool, sea glass, pearl) with
 * the gold of C (Golden repair). Signatures: breathing patterns in the opening,
 * the body of light in Energy, the golden repair puzzle in Shadow, and a
 * journaling prompt. (Directions A, B and C remain in the project history.)
 *
 * The words live in src/content/pillars/healing.json, where the content editor writes. What the design
 * depends on stays here: the chapter keys and their order, the chakras' colours and order, and each breathing
 * pattern's timings. Short descriptive lines are DRAFT copy for Sarvakali to refine. Facts were checked in
 * November 2026 (see the cover's fact check); nothing here claims a health effect.
 */
import copy from '../content/pillars/healing.json';

export const COPY = copy;

/** the four chapters, in order (each catalogue subcategory names the chapter it sits in) */
export const CHAPTER_KEYS = ['energy', 'mind', 'shadow', 'journal'] as const;
export const CHAPTERS = CHAPTER_KEYS.map((key) => ({ key, ...copy.chapters[key] }));

/** shown on the chapters marked for care; Tele-MANAS is checked in the fact-check table */
export const CARE = copy.care;

/**
 * The seven chakras of the modern system (the one most people know today,
 * shaped by Woodroffe's The Serpent Power, 1919). Older Indian traditions
 * count and place them differently, and the rainbow colours were added in the
 * twentieth century; the page says both. Crown first; the colours stay here.
 */
const CHAKRA_COLOR: [keyof typeof copy.body.chakras, string][] = [
  ['sahasrara', '#8e5bd6'], ['ajna', '#4b4fc4'], ['vishuddha', '#2e8fd1'], ['anahata', '#2f9e5b'],
  ['manipura', '#e2b52a'], ['svadhishthana', '#e2772a'], ['muladhara', '#c8362e'],
];
export const CHAKRAS = CHAKRA_COLOR.map(([k, color]) => ({ ...copy.body.chakras[k], color }));

/** journaling prompts for the reflection chapter: DRAFTS for Sarvakali to replace with their own */
export const PROMPTS = copy.prompt.prompts.map((t) => t.trim()).filter(Boolean);

/**
 * Breathing patterns for the guide. Each phase: what to do, how long, and how
 * full the circle is (0 empty, 1 full). Sources are on the cover's fact check;
 * the page describes each pattern without promising an effect. The words are editable; the timings stay here.
 */
export type BreathPhase = { say: string; kind: 'in' | 'hold' | 'out'; secs: number; to: number; side?: 'left' | 'right' };
type Timing = Omit<BreathPhase, 'say'>;
const TIMINGS: [keyof typeof copy.breath.patterns, number | undefined, Timing[]][] = [
  ['soft', undefined, [{ kind: 'in', secs: 4, to: 1 }, { kind: 'out', secs: 6, to: 0 }]],
  ['box', undefined, [{ kind: 'in', secs: 4, to: 1 }, { kind: 'hold', secs: 4, to: 1 }, { kind: 'out', secs: 4, to: 0 }, { kind: 'hold', secs: 4, to: 0 }]],
  ['relax', 4, [{ kind: 'in', secs: 4, to: 1 }, { kind: 'hold', secs: 7, to: 1 }, { kind: 'out', secs: 8, to: 0 }]],
  ['sigh', undefined, [{ kind: 'in', secs: 2.5, to: 0.8 }, { kind: 'in', secs: 1, to: 1 }, { kind: 'out', secs: 6, to: 0 }]],
  ['coherent', undefined, [{ kind: 'in', secs: 5, to: 1 }, { kind: 'out', secs: 5, to: 0 }]],
  ['bhramari', undefined, [{ kind: 'in', secs: 4, to: 1 }, { kind: 'out', secs: 8, to: 0 }]],
  ['nadi', undefined, [{ kind: 'in', secs: 4, to: 1, side: 'left' }, { kind: 'out', secs: 4, to: 0, side: 'right' }, { kind: 'in', secs: 4, to: 1, side: 'right' }, { kind: 'out', secs: 4, to: 0, side: 'left' }]],
];
const SAY: Record<BreathPhase['kind'], string> = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' };
export const BREATHS: { key: string; name: string; short: string; about: string; rounds?: number; phases: BreathPhase[] }[] = TIMINGS.map(([key, rounds, t]) => {
  const c = copy.breath.patterns[key];
  return { key, name: c.name, short: c.short, about: c.about, rounds, phases: t.map((ph, i) => ({ ...ph, say: c.say[i]?.trim() || SAY[ph.kind] })) };
});

/** a grounding exercise with the five senses, offered next to the breathing */
export const GROUNDING = copy.breath.grounding.senses.slice(0, 5).map((sense, i) => ({ n: 5 - i, sense }));

export const BREATH_CARE = copy.breath.care;
