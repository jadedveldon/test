/**
 * Pillar 2, Witchcraft & Magic · the gilded grimoire.
 * One book with two kinds of page: bright parchment "day pages" (the grimoire)
 * and black-and-emerald "night pages" in gold (the alchemical sky). Hecate,
 * one of Sarvakali's presiding deities, opens the pillar.
 *
 * The words live in src/content/pillars/magic.json, where the content editor writes. What the design depends
 * on stays here: the chapter keys, their order and their pages, the dates on the wheel, the sigil methods and
 * the magic square. Short descriptive lines are DRAFT copy for Sarvakali to refine.
 */
import copy from '../content/pillars/magic.json';

export { ICONS } from './icons';
export const COPY = copy;
export type Page = 'day' | 'night';

/**
 * The seven chapters follow the catalogue's own seven categories. `id` is each chapter's fixed address (the
 * category's address when the site was made), so links into the page keep working whatever the names become.
 * (An earlier draft paired them with the seven classical planets. That pairing was not traditional and has
 * been removed; see the fact-check notes.)
 */
const KEYS: [keyof typeof copy.chapters, Page, string][] = [
  ['love', 'day', 'love-attraction-and-glamour'],
  ['abundance', 'day', 'abundance-career-and-success'],
  ['protection', 'night', 'protection-cleansing-and-uncrossing'],
  ['baneful', 'night', 'baneful-and-dark-craft'],
  ['spellcraft', 'day', 'spellcraft-and-magical-objects'],
  ['rituals', 'night', 'rituals-ceremonies-and-witchcraft-paths'],
  ['nature', 'day', 'nature-moon-and-cosmic-magic'],
];
export const CHAPTER_KEYS = KEYS.map(([k]) => k);
export const CHAPTERS = KEYS.map(([key, page, id]) => ({ key, page, id, ...copy.chapters[key] }));

/** which world each part of the page uses (day pages are parchment, night pages gold on black) */
export const PAGES: Record<string, Page> = {
  hero: 'night', hecate: 'night', sigil: 'day', close: 'night',
  ...Object.fromEntries(CHAPTERS.map((c) => [c.key, c.page])),
};

/**
 * Hecate. Two kinds of text, kept apart on the page:
 *  - words: Sarvakali's own devotion (a placeholder until Sarvakali writes it).
 *  - the dark-moon supper, which is sourced (Deipnon).
 * The sourced facts about her (torch, Medea, Diodorus, hekataia) were checked in
 * November 2026 and are kept in the fact-check table on the preview cover; the
 * page itself no longer lists them.
 */
export const HECATE = { ...copy.hecate, words: copy.hecate.words.map((w) => w.trim()).filter(Boolean) };

/**
 * The Wheel of the Year as kept in modern pagan witchcraft (northern hemisphere).
 * The solstices and equinoxes move by a day or so from year to year, so their
 * dates are given as "around". The lines are the common modern meanings. Dates stay here.
 */
const SABBAT_DATES: [keyof typeof copy.wheel.sabbats, number, number, boolean][] = [
  ['samhain', 10, 31, false], ['yule', 12, 21, true], ['imbolc', 2, 1, false], ['ostara', 3, 20, true],
  ['beltane', 5, 1, false], ['litha', 6, 21, true], ['lughnasadh', 8, 1, false], ['mabon', 9, 22, true],
];
export const SABBATS = SABBAT_DATES.map(([k, month, day, approx]) => ({ ...copy.wheel.sabbats[k], month, day, approx }));

/**
 * The six Indian seasons (ritus). Each is traditionally two lunar months; by
 * the sun's position (as Drik Panchang reckons them) the dates below apply,
 * a few weeks earlier than the lunar months. Calendars differ.
 */
const RITU_FROM: [keyof typeof copy.wheel.ritus, [number, number]][] = [
  ['vasanta', [2, 18]], ['grishma', [4, 20]], ['varsha', [6, 21]], ['sharad', [8, 23]], ['hemanta', [10, 23]], ['shishira', [12, 21]],
];
export const RITUS = RITU_FROM.map(([k, from]) => ({ ...copy.wheel.ritus[k], from }));

/**
 * Ways of making a sigil, to compare in the sigil maker. Each note says where
 * the method comes from, as far as the sources go (checked November 2026; see
 * the fact-check table on the preview cover). Sarvakali may make sigils
 * differently; their own method can replace or join these.
 */
export type SigilMethod = 'monogram' | 'wheel' | 'square' | 'bindrune' | 'draw';
const METHOD_KEYS: SigilMethod[] = ['wheel', 'monogram', 'square', 'bindrune', 'draw'];
export const SIGIL_METHODS: { key: SigilMethod; name: string; how: string; origin: string }[] = METHOD_KEYS.map((key) => ({ key, ...copy.sigil.methods[key] }));

/** the 3 × 3 magic square as Agrippa gives it (rows read across); every row, column and diagonal makes 15 */
export const SATURN = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
