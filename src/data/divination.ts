import type { DirChapter, Direction } from './directions';
import { DIR_FONTS } from './dirfonts';

/**
 * Pillar 5, Divination & Insight: three directions to compare live. Readings
 * are offered for reflection and guidance, never as a substitute for medical,
 * legal or financial advice. Lines are DRAFT copy for Sarvakali. Facts and
 * sources are in the fact check on the preview cover.
 */
export const CARE = 'Readings are for reflection and guidance. They do not replace medical, legal or financial advice, and the choices stay yours.';

export const CHAPTERS: DirChapter[] = [
  {
    key: 'readings', title: 'Readings',
    line: 'Psychic and intuitive readings, tarot and oracle cards, and readings on love, work, your path, your ancestors and your gods.',
    subs: ['Psychic & Intuitive Readings', 'Tarot, Oracle & Card Readings', 'Themed Readings'],
  },
  {
    key: 'seeing', title: 'Other ways of seeing',
    line: 'Mirror, water and fire scrying, the pendulum, the open book, and quiet guidance on your spiritual path.',
    subs: ['Scrying, Pendulum & Other Divination', 'Spiritual Guidance & Direction'],
    note: 'Scrying is gazing into a still or reflective surface (a mirror, water, fire) until images come. Bibliomancy is opening a book at random and reading where your eye falls.',
  },
  {
    key: 'dreams', title: 'Dreams',
    line: 'Understanding your dreams and their symbols, remembering them, protecting your sleep, and asking a dream to come.',
    subs: ['Dreamwork'],
  },
  {
    key: 'eye', title: 'The inner eye',
    line: 'Meditations and workings to grow your intuition, sharpen your discernment and trust what you sense.',
    subs: ['Psychic & Intuitive Development'],
  },
  {
    key: 'astral', title: 'Between worlds',
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
 * A · the 22 cards of the Major Arcana with a few common keywords each.
 * Readers differ; these are widely shared upright meanings, offered for reflection.
 */
export const MAJOR = [
  ['0', 'The Fool', 'beginnings, a leap of faith'], ['I', 'The Magician', 'will, skill, making it real'], ['II', 'The High Priestess', 'intuition, what is hidden'],
  ['III', 'The Empress', 'abundance, nurture, the senses'], ['IV', 'The Emperor', 'structure, steadiness, authority'], ['V', 'The Hierophant', 'tradition, teaching, belonging'],
  ['VI', 'The Lovers', 'union, a choice of the heart'], ['VII', 'The Chariot', 'drive, direction, will'], ['VIII', 'Strength', 'courage with gentleness'],
  ['IX', 'The Hermit', 'solitude, the inner light'], ['X', 'Wheel of Fortune', 'cycles, change, turning points'], ['XI', 'Justice', 'truth, balance, consequence'],
  ['XII', 'The Hanged Man', 'pause, surrender, a new view'], ['XIII', 'Death', 'an ending that makes room'], ['XIV', 'Temperance', 'patience, blending, the middle way'],
  ['XV', 'The Devil', 'attachment, what binds you'], ['XVI', 'The Tower', 'sudden change, a truth revealed'], ['XVII', 'The Star', 'hope, healing, renewal'],
  ['XVIII', 'The Moon', 'dreams, uncertainty, the unseen'], ['XIX', 'The Sun', 'joy, clarity, warmth'], ['XX', 'Judgement', 'awakening, a calling'], ['XXI', 'The World', 'completion, wholeness'],
] as const;
export const TAROT_NOTE = 'Tarot began as a card game in fifteenth-century Italy; it was first used for divination in eighteenth-century France. These are common upright meanings; readers differ.';

/** B · symbols that may come in the mirror, each with a question to sit with */
export const SYMBOLS = [
  ['a door', 'What are you ready to walk through?'], ['a key', 'What is already in your hand?'], ['a road', 'Where is the path asking you to go?'],
  ['a flame', 'What wants your warmth and attention?'], ['a bird', 'What would you do if you felt free?'], ['a river', 'What is moving on its own, if you let it?'],
  ['a moon', 'What is growing in the dark?'], ['a tree', 'Where are your roots?'], ['an eye', 'What have you already noticed, but not yet trusted?'],
  ['a bridge', 'What two things are you being asked to join?'], ['a seed', 'What is small now, and will grow?'], ['a wave', 'What would it mean to let this pass?'],
] as const;

/** C · the pendulum's answers; a toy for reflection, never a prediction */
export const PENDULUM = [
  { swing: 'line', say: 'It swings to and fro: a yes, if you are asking.' },
  { swing: 'side', say: 'It swings side to side: a no, for now.' },
  { swing: 'circle', say: 'It circles: not yet clear. Ask again another day.' },
] as const;

export const DIRECTIONS: Direction[] = [
  {
    key: 'a', name: 'The reading table',
    essence: 'A table laid by candlelight: wine-dark cloth, gold leaf and old card backs. Warm, close and a little theatrical.',
    feeling: ['warm', 'intimate', 'ceremonial', 'old'],
    palette: [
      { name: 'Wine dark', hex: '#170a0e' }, { name: 'Velvet', hex: '#3d1420' }, { name: 'Gold leaf', hex: '#d8b062' },
      { name: 'Candle', hex: '#f3d39a' }, { name: 'Card cream', hex: '#efe3cc' }, { name: 'Oxblood', hex: '#7c2230' },
    ],
    type: { display: 'Cormorant Unicase', note: 'small capitals with old-style curves', family: '"Cormorant Unicase", Georgia, serif', fontHref: DIR_FONTS.divination.a },
    worlds: 'Three cards fanned, a mirror, the moon’s faces, the inner eye, the stars.',
    layout: 'Each chapter is laid like a spread; subcategories are cards with gilded edges.',
    signature: { name: 'Draw three cards', how: 'Three cards from the Major Arcana turn over: past, present and what is coming, each with common meanings. For reflection; a full reading goes much deeper.' },
    sound: 'A card turned on cloth; a low bell.',
    imagery: 'A real reading table, photographed by candlelight; hands, cards, cloth.',
    voice: 'Warm and knowing, like a reader across the table.',
  },
  {
    key: 'b', name: 'Black mirror',
    essence: 'Obsidian and silver: a still, dark surface that waits. Spare, cool and quiet, with mist that clears when you are still.',
    feeling: ['still', 'cool', 'mysterious', 'spare'],
    palette: [
      { name: 'Obsidian', hex: '#060708' }, { name: 'Smoke', hex: '#1b1f24' }, { name: 'Silver', hex: '#c9ced6' },
      { name: 'Cold blue', hex: '#6d8fb4' }, { name: 'Mist', hex: '#e6e9ee' }, { name: 'Moonstone', hex: '#9fb5c9' },
    ],
    type: { display: 'Tenor Sans', note: 'clean, open letters', family: '"Tenor Sans", Helvetica, sans-serif', fontHref: DIR_FONTS.divination.b },
    worlds: 'A scrying mirror with rings on its surface, three cards, the moon’s faces, the inner eye, the stars.',
    layout: 'Wide black space; thin silver rules; subcategories as polished stones.',
    signature: { name: 'Still the water', how: 'Press and hold the dark mirror. The ripples settle, the mist clears, and a symbol rises with a question to sit with. There is no right answer; scrying is about what comes to you.' },
    sound: 'Water settling; a soft, high tone.',
    imagery: 'Obsidian mirrors, still water at night, silver bowls.',
    voice: 'Few words, slowly: look, and see what comes.',
  },
  {
    key: 'c', name: 'Moon and pendulum',
    essence: 'A night sky of dreams: indigo, lavender and starlight, with a crystal pendulum swinging slow.',
    feeling: ['dreamy', 'soft', 'cosmic', 'playful'],
    palette: [
      { name: 'Night indigo', hex: '#0b0d2a' }, { name: 'Deep violet', hex: '#241a52' }, { name: 'Lavender', hex: '#b9a7e8' },
      { name: 'Starlight', hex: '#f1eefc' }, { name: 'Moon gold', hex: '#e9cf8a' }, { name: 'Dusk rose', hex: '#d79bb6' },
    ],
    type: { display: 'Gilda Display', note: 'a graceful, high-waisted serif', family: '"Gilda Display", Georgia, serif', fontHref: DIR_FONTS.divination.c },
    worlds: 'A pendulum swinging, three cards, the moon’s faces, the inner eye, the stars.',
    layout: 'Floating, airy chapters; subcategories as moonlit tiles.',
    signature: { name: 'Ask the pendulum', how: 'Hold a yes-or-no question in mind and let the pendulum go. It swings, slows and settles: to and fro, side to side, or in a circle. A gentle game for reflection, never a prediction.' },
    sound: 'A slow tick and a shimmer.',
    imagery: 'Crystal pendulums, night skies, sleeping rooms in moonlight.',
    voice: 'Playful and gentle, like a friend at midnight.',
  },
];
