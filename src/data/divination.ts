import type { DirChapter } from './directions';

/**
 * Pillar 5, Divination & Insight: candlelight and the black mirror. Directions A (the reading table) and B
 * (black mirror) were both chosen, so the page is one book with two kinds of page: table pages (wine, gold
 * leaf, card frames) and mirror pages (obsidian, silver, arched mirrors). C and the A/B originals are in the
 * project history. Readings
 * are offered for reflection and guidance, never as a substitute for medical,
 * legal or financial advice. Lines are DRAFT copy for Sarvakali. Facts and
 * sources are in the fact check on the preview cover.
 */
export const CARE = 'Readings are for reflection and guidance. They do not replace medical, legal or financial advice, and the choices stay yours.';

export const CHAPTERS: DirChapter[] = [
  {
    key: 'readings', title: 'Readings', room: 'table',
    line: 'Psychic and intuitive readings, tarot and oracle cards, and readings on love, work, your path, your ancestors and your gods.',
    subs: ['Psychic & Intuitive Readings', 'Tarot, Oracle & Card Readings', 'Themed Readings'],
    note: 'Tarot began as a card game in fifteenth-century Italy; it was first used for divination in eighteenth-century France.',
  },
  {
    key: 'seeing', room: 'mirror', title: 'Other ways of seeing',
    line: 'Mirror, water and fire scrying, the pendulum, the open book, and quiet guidance on your spiritual path.',
    subs: ['Scrying, Pendulum & Other Divination', 'Spiritual Guidance & Direction'],
    note: 'Scrying is gazing into a still or reflective surface (a mirror, water, fire) until images come. Bibliomancy is opening a book at random and reading where your eye falls.',
  },
  {
    key: 'dreams', room: 'mirror', title: 'Dreams',
    line: 'Understanding your dreams and their symbols, remembering them, protecting your sleep, and asking a dream to come.',
    subs: ['Dreamwork'],
  },
  {
    key: 'eye', room: 'table', title: 'The inner eye',
    line: 'Meditations and workings to grow your intuition, sharpen your discernment and trust what you sense.',
    subs: ['Psychic & Intuitive Development'],
  },
  {
    key: 'astral', room: 'mirror', title: 'Between worlds',
    line: 'Preparing for astral work, crossing with care, and the rituals of the seasons when the veil is said to be thin.',
    subs: ['Astral & Between-Worlds Work'],
  },
];

export const SUB_ICON: Record<string, string> = {
  'Psychic & Intuitive Readings': 'eye',
  'Tarot, Oracle & Card Readings': 'book',
  'Themed Readings': 'compass',
  'Scrying, Pendulum & Other Divination': 'drop',
  'Spiritual Guidance & Direction': 'compass',
  Dreamwork: 'crescent',
  'Psychic & Intuitive Development': 'eye',
  'Astral & Between-Worlds Work': 'spiral',
};

/**
 * The signature, prompts to ponder: hold the black mirror until the water stills, and a symbol rises with a
 * prompt to sit with. Prompts for reflection, never predictions. DRAFT wording for Sarvakali.
 */
export const PROMPTS = [
  ['a door', 'What are you ready to walk through?'], ['a key', 'What is already in your hand?'], ['a road', 'Where is the path asking you to go?'],
  ['a flame', 'What wants your warmth and attention?'], ['a bird', 'What would you do if you felt free?'], ['a river', 'What is moving on its own, if you let it?'],
  ['a moon', 'What is growing in the dark?'], ['a tree', 'Where are your roots?'], ['an eye', 'What have you already noticed, but not yet trusted?'],
  ['a bridge', 'What two things are you being asked to join?'], ['a seed', 'What is small now, and will grow?'], ['a wave', 'What would it mean to let this pass?'],
  ['a lantern', 'What would you see if you held a little more light to it?'], ['a thread', 'What connects the things you keep thinking about?'],
  ['a mountain', 'What is asking for your patience?'], ['a nest', 'What are you making a home for?'], ['a well', 'What lies deeper than your first answer?'],
  ['a lotus', 'What could grow from the place that felt like mud?'], ['a shell', 'What do you protect, and what does it protect you from?'],
  ['a feather', 'What would it be like to hold this lightly?'], ['a crossroads', 'Which way are you leaning, before you decide?'],
  ['a candle', 'What is quietly burning down, and what is it lighting?'], ['a spiral', 'What keeps returning, and what has changed each time?'],
  ['a star', 'What still guides you, even from far away?'],
] as const;
