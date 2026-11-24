/**
 * Pillar 1, Devotion & the Unseen. Chosen direction: C · Cosmic mother.
 * Kali as time and space itself: night sky, gold geometry, every tradition
 * orbiting one bindu. Each tradition gets its own movement with its own
 * iconography in the world behind it.
 *
 * The words and lists live in src/content/pillars/devotion.json, where the content editor writes. What the
 * design depends on stays here: the seven movements, their addresses and order, and the four elements.
 * Short descriptive lines are DRAFT copy for Sarvakali to refine.
 */
import copy from '../content/pillars/devotion.json';

export const COPY = copy;

/** the seven movements: key, fixed address (links into the page use these) */
export const MOVES: [keyof typeof copy.chapters, string][] = [
  ['vidyas', 'kali-and-the-mahavidyas'],
  ['devi', 'the-devi-and-the-hindu-deities'],
  ['greek', 'the-greek-gods'],
  ['lands', 'many-traditions'],
  ['altar', 'altars-and-devotion'],
  ['spirits', 'spirits-mediumship-and-ancestors'],
  ['shaman', 'shamanic-work'],
];
export const CHAPTER_KEYS = MOVES.map(([k]) => k);

const list = (a: string[]) => a.map((t) => t.trim()).filter(Boolean);

/** the ten Mahavidyas (the yantra holds ten) */
export const MAHAVIDYAS = copy.mahavidyas.slice(0, 10);

/** the Devi and the Hindu deities */
export const HINDU = copy.hindu.filter((d) => d.name.trim());
export const HINDU_ALSO = list(copy.deviAlso.services);
export const TANTRA = list(copy.tantra.services);

/**
 * The Greek gods, gathered by family as the old sources describe them
 * (Hesiod's Theogony and the usual list of the twelve Olympians).
 */
const FAMILY_KEYS = ['olympians', 'chthonic', 'first', 'others'] as const;
export const FAMILIES = FAMILY_KEYS.map((key) => ({ key, name: copy.greek.families[key] }));

/**
 * Behind the section: the four "roots" of Empedocles (fire, air, water,
 * earth), the classical Greek elements. Shown as iconography only.
 */
export type Element = { key: string; name: string; greek: string; symbol: string };
export const ELEMENTS: Element[] = [
  { key: 'fire', name: 'Fire', greek: 'Πῦρ', symbol: 'M0 -18 L16 12 L-16 12 Z' },
  { key: 'air', name: 'Air', greek: 'Ἀήρ', symbol: 'M0 -18 L16 12 L-16 12 Z M-10 1 L10 1' },
  { key: 'water', name: 'Water', greek: 'Ὕδωρ', symbol: 'M0 18 L16 -12 L-16 -12 Z' },
  { key: 'earth', name: 'Earth', greek: 'Γῆ', symbol: 'M0 18 L16 -12 L-16 -12 Z M-10 -1 L10 -1' },
];

export const GREEK = copy.greek.gods.filter((g) => g.name.trim()).map((g) => ({ name: g.name.trim(), greek: g.greek, fam: g.family, line: g.line, presiding: g.presiding }));

/** goddesses and gods of many lands */
export const LANDS = copy.lands.map((l) => ({ land: l.land, names: list(l.names) })).filter((l) => l.land.trim() && l.names.length);
