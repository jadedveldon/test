/**
 * Pillar 2, Witchcraft & Magic · the gilded grimoire.
 * One book with two kinds of page: bright parchment "day pages" (the grimoire)
 * and black-and-emerald "night pages" in gold (the alchemical sky). Hecate,
 * one of Sarvakali's presiding deities, opens the pillar.
 * Short descriptive lines are DRAFT copy for Sarvakali to refine.
 */
export type Page = 'day' | 'night';

/**
 * The seven chapters follow the catalogue's own seven categories.
 * (An earlier draft paired them with the seven classical planets. That pairing
 * was not traditional and has been removed; see the fact-check notes.)
 */
export const CHAPTERS: { key: string; category: string; title: string; line: string; page: Page }[] = [
  { key: 'love', page: 'day', category: 'Love, Attraction & Glamour', title: 'Love, attraction and glamour', line: 'Calling love in, mending what can be mended, letting go of what cannot, and learning to love yourself.' },
  { key: 'abundance', page: 'day', category: 'Abundance, Career & Success', title: 'Abundance, career and success', line: 'Money, work, clients and luck: opening the road and keeping it open.' },
  { key: 'protection', page: 'night', category: 'Protection, Cleansing & Uncrossing', title: 'Protection, cleansing and uncrossing', line: 'Shielding you and your home, clearing what clings, and lifting what was laid on you.' },
  { key: 'baneful', page: 'night', category: 'Baneful & Dark Craft', title: 'Baneful and dark craft', line: 'Binding, justice and the older, darker arts, held with discernment.' },
  { key: 'spellcraft', page: 'day', category: 'Spellcraft & Magical Objects', title: 'Spellcraft and magical objects', line: 'Candles, jars, sigils, talismans, oils and the old folk ways: spells made by hand, for you.' },
  { key: 'rituals', page: 'night', category: 'Rituals, Ceremonies & Witchcraft Paths', title: 'Rituals, ceremonies and paths', line: 'Ceremony, fire and the four directions, rites of passage, and the many paths of the craft.' },
  { key: 'nature', page: 'day', category: 'Nature, Moon & Cosmic Magic', title: 'Nature, moon and cosmic magic', line: 'The moon and the planets, the turning year, herbs, stones and the wild places.' },
];

/** which world each part of the page uses (day pages are parchment, night pages gold on black) */
export const PAGES: Record<string, Page> = {
  hero: 'night', hecate: 'night', sigil: 'day', close: 'night',
  ...Object.fromEntries(CHAPTERS.map((c) => [c.key, c.page])),
};

/**
 * Hecate. Two kinds of text, kept apart on the page:
 *  - WORDS: Sarvakali's own devotion (a placeholder until Sarvakali writes it).
 *  - the dark-moon supper, which is sourced (Deipnon).
 * The sourced facts about her (torch, Medea, Diodorus, hekataia) were checked in
 * November 2026 and are kept in the fact-check table on the preview cover; the
 * page itself no longer lists them.
 */
export const HECATE = {
  words: [
    'Mother of witchcraft.',
    'Prime goddess of the craft.',
    'Fierce protector.',
  ],
  wordsLine: 'Hecate is one of the presiding deities of Sarvakali, and this pillar is under her keeping.',
  supper: {
    title: 'The dark moon is hers',
    text: 'In ancient Athens the last day of the lunar month, the dark moon, belonged to Hecate. Households set out a supper for her and the restless dead, at crossroads and on doorsteps: the Deipnon. The same dark moon is Amavasya, a night especially kept for Kali.',
    note: 'The Athenian month began with the first sliver of the new moon, so the old reckoning can differ from a modern calendar by a day. The two traditions are separate; here they simply share a night.',
    href: 'https://en.wikipedia.org/wiki/Deipnon',
  },
};

/** a small line icon for every subcategory (24 × 24, drawn as strokes) */
export const ICONS: Record<string, string> = {
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  rings: 'M3 13a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M13 13a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
  friends: 'M5 8a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M13 8a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M3 20c0-3 2.5-5 5-5s5 2 5 5 M11 20c0-3 2.5-5 5-5s5 2 5 5',
  mirror: 'M7 9a5 6 0 1 0 10 0a5 6 0 1 0 -10 0 M12 15v6 M9 21h6',
  coin: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M12 7v10 M14.5 9.5h-3.5a1.8 1.8 0 0 0 0 3.5h2a1.8 1.8 0 0 1 0 3.5h-3.5',
  case: 'M4 8h16v11H4z M9 8V5h6v3 M4 13h16',
  key: 'M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M9 12h12 M17 12v3 M20 12v2',
  quill: 'M20 3c-7 1-11 7-13 15l-2 3 M7 18c3-1 7-4 9-8 M11 10l6 1',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  house: 'M4 11l8-7 8 7 M6 10v10h12V10 M10 20v-5h4v5',
  sparkle: 'M12 3v5 M12 16v5 M3 12h5 M16 12h5 M6 6l3 3 M15 15l3 3 M18 6l-3 3 M9 15l-3 3',
  banish: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M8 8l8 8 M16 8l-8 8',
  uncross: 'M4 8h13l-3-3 M20 16H7l3 3',
  candle: 'M10 10h4v10h-4z M12 10V8 M12 3c1.5 1.6 1.5 3 0 4c-1.5-1-1.5-2.4 0-4z M8 20h8',
  jar: 'M8 4h8v3H8z M7 7h10v13H7z M9 13h6',
  sigil: 'M5 19L12 4l7 15 M8 13h8 M12 4v16',
  amulet: 'M12 2v4 M6 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M12 9l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z',
  drop: 'M12 3c3 5 6 8 6 11a6 6 0 1 1-12 0c0-3 3-6 6-11z',
  knot: 'M4 12c0-3 3-4 5-2l6 4c2 2 5 1 5-2s-3-4-5-2l-6 4c-2 2-5 1-5-2z',
  box: 'M5 7h14v12H5z M5 7l7 5 7-5',
  chain: 'M3 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6H6a3 3 0 0 1-3-3z M12 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6h-3a3 3 0 0 1-3-3z',
  scales: 'M12 4v16 M7 20h10 M5 7h14 M5 7l-3 6h6z M19 7l-3 6h6z',
  grave: 'M7 20V10a5 5 0 0 1 10 0v10 M5 20h14 M12 10v6 M10 12h4',
  crescent: 'M15 4a8 8 0 1 0 5 13a7 7 0 0 1-5-13z',
  hourglass: 'M7 3h10 M7 21h10 M8 3c0 6 8 6 8 9s-8 3-8 9 M16 3c0 6-8 6-8 9s8 3 8 9',
  shield: 'M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z',
  wand: 'M4 20L13 11 M16 3l1.3 2.7 3 .5-2.2 2 .5 3-2.6-1.4-2.7 1.4.6-3-2.2-2 3-.5z',
  circle: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
  fire: 'M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-6 1-9z',
  spiral: 'M12 12c0-1 2-1 2 0s-1 3-3 3-4-2-4-4 2-6 6-6 7 3 7 7-3 9-8 9',
  cross: 'M12 3v18 M3 12h18 M16 8l3-3 M19 8V5h-3',
  sun: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
  wheel: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M12 4v16 M4 12h16 M6.3 6.3l11.4 11.4 M17.7 6.3L6.3 17.7',
  leaf: 'M5 19C5 10 11 5 19 5c0 8-5 14-14 14z M5 19l9-9',
  crystal: 'M8 3h8l3 6-7 12L5 9z M5 9h14 M12 21L9 9l3-6 3 6z',
  tree: 'M12 21v-7 M12 15l-4-3 M12 14l4-4 M6 10a6 6 0 1 1 12 0c0 3-3 4-6 4s-6-1-6-4z',
};

export const SUB_ICON: Record<string, string> = {
  'Love & Attraction': 'heart',
  'Relationships, Reconciliation & Moving On': 'rings',
  'Friendship & Social Connection': 'friends',
  'Glamour, Beauty & Self-Love': 'mirror',
  'Money & Abundance': 'coin',
  'Career, Business & Clients': 'case',
  'Luck, Success & Road Opening': 'key',
  'Focus, Memory & Communication': 'quill',
  'Personal, Psychic & Evil-Eye Protection': 'eye',
  'Home, Threshold & Warding': 'house',
  'Cleansing & Blessing': 'sparkle',
  Banishing: 'banish',
  'Uncrossing, Reversal & Curse Removal': 'uncross',
  'Protective Candles, Jars & Charms': 'shield',
  'Hexing & Curse Work': 'box',
  'Binding, Domination & Separation': 'chain',
  'Justice, Retribution & Return-to-Sender': 'scales',
  'Graveyard & Cemetery Work': 'grave',
  'Dark Devotion': 'crescent',
  'Dark Magic & Shadow Spellcraft': 'hourglass',
  'Spiritual Warfare & Defence': 'shield',
  'Made-to-Order Spellwork': 'wand',
  'Candle & Flame Magic': 'candle',
  'Spell Jars, Bottles & Sachets': 'jar',
  'Sigils, Seals & Symbols': 'sigil',
  'Talismans, Amulets & Charms': 'amulet',
  'Oils, Powders & Washes': 'drop',
  'Folk Techniques': 'knot',
  'Personal & Custom Rituals': 'circle',
  'Ceremonial, Fire & Elemental Rites': 'fire',
  'Transitions, Rebirth & Dedication': 'spiral',
  'Witchcraft Paths & Traditions': 'cross',
  'Moon Magic': 'crescent',
  'Sun, Planets & Astrology': 'sun',
  'Seasons & Sabbats': 'wheel',
  'Herbal & Botanical Magic': 'leaf',
  'Crystal & Stone Magic': 'crystal',
  'Elements & Wild Places': 'tree',
};

/**
 * The Wheel of the Year as kept in modern pagan witchcraft (northern hemisphere).
 * The solstices and equinoxes move by a day or so from year to year, so their
 * dates are given as "around". The lines are the common modern meanings.
 */
export const SABBATS = [
  { name: 'Samhain', month: 10, day: 31, approx: false, line: 'The dark half of the year begins; a time to honour the dead' },
  { name: 'Yule', month: 12, day: 21, approx: true, line: 'The winter solstice: the longest night, and the light’s return' },
  { name: 'Imbolc', month: 2, day: 1, approx: false, line: 'The first stirrings of spring; associated with Brigid' },
  { name: 'Ostara', month: 3, day: 20, approx: true, line: 'The spring equinox: day and night in balance' },
  { name: 'Beltane', month: 5, day: 1, approx: false, line: 'The start of summer: fire, fertility and bloom' },
  { name: 'Litha', month: 6, day: 21, approx: true, line: 'The summer solstice: the longest day' },
  { name: 'Lughnasadh', month: 8, day: 1, approx: false, line: 'The first harvest, named for the god Lugh' },
  { name: 'Mabon', month: 9, day: 22, approx: true, line: 'The autumn equinox: balance again, and the second harvest' },
];

/**
 * The six Indian seasons (ritus). Each is traditionally two lunar months; by
 * the sun's position (as Drik Panchang reckons them) the dates below apply,
 * a few weeks earlier than the lunar months. Calendars differ.
 */
export const RITUS = [
  { name: 'Vasanta', deva: 'वसन्त', english: 'spring', months: 'Chaitra and Vaishakha', from: [2, 18], line: 'Spring' },
  { name: 'Grishma', deva: 'ग्रीष्म', english: 'summer', months: 'Jyeshtha and Ashadha', from: [4, 20], line: 'Summer heat' },
  { name: 'Varsha', deva: 'वर्षा', english: 'monsoon', months: 'Shravana and Bhadrapada', from: [6, 21], line: 'The rains' },
  { name: 'Sharad', deva: 'शरद्', english: 'autumn', months: 'Ashvin and Kartika', from: [8, 23], line: 'Autumn after the rains' },
  { name: 'Hemanta', deva: 'हेमन्त', english: 'pre-winter', months: 'Margashirsha and Pausha', from: [10, 23], line: 'The cool season' },
  { name: 'Shishira', deva: 'शिशिर', english: 'winter', months: 'Magha and Phalguna', from: [12, 21], line: 'Winter' },
];

/**
 * Ways of making a sigil, to compare in the sigil maker. Each note says where
 * the method comes from, as far as the sources go (checked November 2026; see
 * the fact-check table on the preview cover). Sarvakali may make sigils
 * differently; their own method can replace or join these.
 */
export type SigilMethod = 'monogram' | 'wheel' | 'square' | 'bindrune' | 'draw';
export const SIGIL_METHODS: { key: SigilMethod; name: string; how: string; origin: string }[] = [
  {
    key: 'wheel', name: 'Letter wheel',
    how: 'The alphabet is set round a circle. The line starts with a small ring on the first letter, runs from letter to letter, and ends with a short bar.',
    origin: 'A modern way of tracing a name on letters set in a ring. The Golden Dawn’s Rose Cross, whose 22 petals carry the Hebrew letters, was called the key of sigils.',
  },
  {
    key: 'monogram', name: 'Monogram',
    how: 'The letters that repeat are struck out, and many modern versions drop the vowels too. What is left is folded into one figure, some letters turned back to front, until it no longer reads as words.',
    origin: 'The way made known by the artist Austin Osman Spare in The Book of Pleasure (1913), and taken up by chaos magic.',
  },
  {
    key: 'square', name: 'Magic square',
    how: 'Each letter becomes a number (A to I count 1 to 9, then J starts again at 1). The numbers are found on the square and joined in order.',
    origin: 'Old seals of spirits were drawn this way, on number squares. This is the 3 × 3 square, which Agrippa gave to Saturn; counting Latin letters 1 to 9 is a modern adaptation.',
  },
  {
    key: 'bindrune', name: 'Bindrune',
    how: 'The first letter of each word becomes its nearest Elder Futhark rune, and the runes are bound onto one shared stave.',
    origin: 'Runes joined into one figure appear in old inscriptions, some along a single stave. Making one from your own words is a modern use of that old form.',
  },
  {
    key: 'draw', name: 'Draw your own',
    how: 'No letters and no rule: draw whatever shape comes to you, then seal it.',
    origin: 'No tradition is claimed here: a free drawing, sealed like the others.',
  },
];

/** the 3 × 3 magic square as Agrippa gives it (rows read across); every row, column and diagonal makes 15 */
export const SATURN = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
