import type { DirChapter } from './directions';
import copy from '../content/pillars/divination.json';

/**
 * Pillar 5, Divination & Insight: candlelight and the black mirror. Directions A (the reading table) and B
 * (black mirror) were both chosen, so the page is one book with two kinds of page: table pages (wine, gold
 * leaf, card frames) and mirror pages (obsidian, silver, arched mirrors). C and the A/B originals are in the
 * project history. Readings are offered for reflection and guidance, never as a substitute for medical,
 * legal or financial advice. Lines are DRAFT copy for Sarvakali. Facts and sources are in the fact check on
 * the preview cover.
 *
 * The words live in src/content/pillars/divination.json (the content editor writes there); the chapter keys,
 * their order and which kind of page each is stay here.
 */
export const COPY = copy;
export const CARE = copy.care;

const ROOMS: [keyof typeof copy.chapters, 'table' | 'mirror'][] = [['readings', 'table'], ['seeing', 'mirror'], ['dreams', 'mirror'], ['eye', 'table'], ['astral', 'mirror']];
export const CHAPTER_KEYS = ROOMS.map(([k]) => k);
export const CHAPTERS: DirChapter[] = ROOMS.map(([key, room]) => ({ key, room, ...copy.chapters[key] }));

/**
 * The signature, prompts to ponder: hold the black mirror until the water stills, and a symbol rises with a
 * prompt to sit with. Prompts for reflection, never predictions. DRAFT wording for Sarvakali.
 */
export const PROMPTS: [string, string][] = copy.mirror.prompts
  .map((p) => [p.symbol.trim(), p.prompt.trim()] as [string, string])
  .filter(([s, t]) => s && t);
