import type { DirChapter } from './directions';
import copy from '../content/pillars/identity.json';

/**
 * Pillar 4, Identity, Intimacy & the Body, in the Soft prism design (direction B, chosen).
 * Written to be affirming and trauma-aware: nothing is assumed about who anyone
 * is or whom they love, people choose what to share and can stop at any time,
 * and nothing here is explicit. Lines are DRAFT copy for Sarvakali. Facts and
 * sources are in the fact check on the preview cover.
 *
 * The words live in src/content/pillars/identity.json (the content editor writes there); the chapter keys
 * and their order stay here.
 */
export const COPY = copy;

/** said once at the top of the page, and again where the work turns to the body */
export const WELCOME = copy.welcome;
export const SUPPORT = copy.support;
export const SUPPORT_HREF = copy.supportHref;

export const CHAPTER_KEYS = ['queer', 'intimacy', 'body', 'womb', 'lilith'] as const;
export const CHAPTERS: DirChapter[] = CHAPTER_KEYS.map((key) => ({ key, ...copy.chapters[key] }));

/* ---- signatures ---- */

/** your comfort, first: a note to bring to a first conversation; nothing is stored or sent */
const list = (a: string[]) => a.map((t) => t.trim()).filter(Boolean);
export const COMFORT = { pace: list(copy.comfort.pace), explore: list(copy.comfort.explore), ways: list(copy.comfort.ways) };
