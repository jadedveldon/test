import type { DirChapter, Direction } from './directions';

/**
 * Pillar 6, Learning: classes and mentoring, in three directions to compare
 * live. Lines are DRAFT copy for Sarvakali. Facts and sources are in the fact
 * check on the preview cover.
 */
export const CHAPTERS: DirChapter[] = [
  { key: 'foundations', title: 'Foundations', line: 'Where to begin: what spirituality is and is not, understanding your experiences, energy work, the aura and the chakras, and shadow work.', subs: ['Spiritual Foundations'] },
  { key: 'craft', title: 'Witchcraft and spellcraft', line: 'An introduction to witchcraft, then the hands-on craft: spells, sigils, candles, jars and protection.', subs: ['Witchcraft & Spellcraft Classes'] },
  {
    key: 'tantra', title: 'Tantra, mantra and yantra', line: 'First steps into the three: what they are, how they are practised, and what the mantras mean.', subs: ['Tantra, Mantra & Yantra'],
    note: 'A mantra is a sacred utterance: a sound, a syllable, a word or a verse. A yantra is a geometric diagram. Tantra comes from a word for a loom, a weave.',
  },
  { key: 'deity', title: 'Deities and devotion', line: 'Studying the gods and goddesses (Hindu, Greek, the Devi and the Mahavidyas), and building a devotional practice and altar of your own.', subs: ['Deity & Devotional Studies'] },
  { key: 'mentoring', title: 'Mentoring and consultations', line: 'One-to-one guidance for your own practice: your grimoire, your spells and sigils, your altar, and programmes made for you.', subs: ['Mentoring & Consultations'] },
];

/** ways to learn, shown under the opening */
export const FORMATS = ['One-to-One Spirituality Classes', 'Group Spirituality Classes', 'Customised Spiritual Learning Programmes', 'Guided Spiritual Discussions'];

export const SUB_ICON: Record<string, string> = {
  'Spiritual Foundations': 'sparkle',
  'Witchcraft & Spellcraft Classes': 'wand',
  'Tantra, Mantra & Yantra': 'lotus',
  'Deity & Devotional Studies': 'candle',
  'Mentoring & Consultations': 'compass',
};

/** A · find your class: three questions, each answer pointing to classes in the catalogue */
export const FINDER = [
  {
    q: 'What draws you?',
    a: [
      { label: 'Understanding my spiritual experiences', items: ['Spirituality Fundamentals Classes', 'Understanding Spiritual Experiences'] },
      { label: 'The craft: spells, candles, sigils', items: ['Introduction to Witchcraft', 'Introductory Spellcraft'] },
      { label: 'Mantra, yantra and tantra', items: ['Introduction to Mantra', 'Introduction to Yantra'] },
      { label: 'The gods and devotion', items: ['Deity Studies', 'Devotional Practices and Personal Spirituality'] },
      { label: 'My own practice, with guidance', items: ['Magical Practice Guidance', 'Personal Grimoire Development'] },
    ],
  },
  {
    q: 'How do you like to learn?',
    a: [
      { label: 'One to one', items: ['One-to-One Spirituality Classes'] },
      { label: 'In a small group', items: ['Group Spirituality Classes'] },
      { label: 'A programme made for me', items: ['Customised Spiritual Learning Programmes'] },
      { label: 'Talking it through', items: ['Guided Spiritual Discussions'] },
    ],
  },
  {
    q: 'Where are you starting from?',
    a: [
      { label: 'New to all of this', items: ['Spirituality Fundamentals Classes'] },
      { label: 'Some practice already', items: ['Personalised Spiritual Mentoring'] },
      { label: 'Deep in my own practice', items: ['Personalised Witchcraft & Spiritual Development Package'] },
    ],
  },
];

/** B · a suggested path of study: stations along one road, with three side paths; begin anywhere */
export const STATIONS = [
  { name: 'Spirituality Fundamentals Classes', ch: 'Foundations', line: 'Where most people begin.' },
  { name: 'Understanding Spiritual Experiences', ch: 'Foundations', line: 'Making sense of what you have felt and seen.' },
  { name: 'Energy-Work Fundamentals', ch: 'Foundations', line: 'The basics of working with energy.' },
  { name: 'Introduction to Witchcraft', ch: 'Witchcraft and spellcraft', line: 'What the craft is, and how it is practised.' },
  { name: 'Introductory Spellcraft', ch: 'Witchcraft and spellcraft', line: 'Your first spells, made carefully.' },
  { name: 'Introduction to Mantra', ch: 'Tantra, mantra and yantra', line: 'Sacred sound, and how to use it.' },
  { name: 'Deity Studies', ch: 'Deities and devotion', line: 'Getting to know the gods and goddesses.' },
  { name: 'Altar Creation and Spiritual Practice', ch: 'Deities and devotion', line: 'A place, and a practice, of your own.' },
  { name: 'Personalised Spiritual Mentoring', ch: 'Mentoring and consultations', line: 'Guidance for the road ahead, one to one.' },
  { name: 'Aura and Chakra Education', ch: 'Foundations', line: 'A side path: the aura and the chakras.' },
  { name: 'Introduction to Yantra', ch: 'Tantra, mantra and yantra', line: 'A side path: sacred geometry.' },
  { name: 'Devi and Mahavidya Studies', ch: 'Deities and devotion', line: 'A side path: the Devi and the ten Mahavidyas.' },
];
/** where each station sits on the map (main road 0–8, then side paths 9–11 and the station each leaves from) */
export const STATION_XY: [number, number][] = [[-130, 92], [-98, 62], [-62, 66], [-34, 34], [2, 24], [28, -8], [62, -18], [92, -50], [128, -88], [-58, 108], [12, -46], [100, 4]];
export const SIDE_FROM = [2, 5, 6];

/** C · draw a yantra, step by step: a simple teaching figure, not the yantra of a particular deity */
export const YANTRA_STEPS = [
  'The bindu: a single point at the centre, where it all begins.',
  'A triangle pointing down, around the point.',
  'A triangle pointing up, crossing it: together, a six-pointed star.',
  'A circle, holding the triangles.',
  'Eight petals around the circle, a lotus opening.',
  'A square with four gates, one facing each direction, holding everything inside.',
];

export const DIRECTIONS: Direction[] = [
  {
    key: 'a', name: 'The library',
    essence: 'A reading room at night: walnut shelves, a green-shaded lamp, brass and old paper. Calm, serious and welcoming.',
    feeling: ['studious', 'warm', 'trustworthy', 'calm'],
    palette: [
      { name: 'Walnut', hex: '#1d140d' }, { name: 'Shelf', hex: '#3a2a1c' }, { name: 'Lamp green', hex: '#3f6b4e' },
      { name: 'Brass', hex: '#c9a35a' }, { name: 'Paper', hex: '#f1e7d3' }, { name: 'Ink', hex: '#1c140e' },
    ],
    type: { display: 'Libre Baskerville', note: 'a bookish serif', family: '"Libre Baskerville", Georgia, serif', fontHref: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&display=swap' },
    worlds: 'An open book, lamps, sigils, the yantra, a temple, a path of study.',
    layout: 'Chapters like shelves; each subcategory a bound volume with a brass label.',
    signature: { name: 'Find your class', how: 'Three questions (what draws you, how you like to learn, where you are starting) and the classes that fit appear, ready to keep.' },
    sound: 'Pages turning; a clock in another room.',
    imagery: 'Books, notebooks and hands writing; a real study.',
    voice: 'Clear and encouraging, like a good teacher.',
  },
  {
    key: 'b', name: 'The path of study',
    essence: 'A map of the night sky where every class is a star on a road: navy, chalk and starlight. You can see where you are and where you could go.',
    feeling: ['clear', 'hopeful', 'structured', 'open'],
    palette: [
      { name: 'Midnight', hex: '#0b1424' }, { name: 'Slate', hex: '#2b3a52' }, { name: 'Chalk', hex: '#e8eef6' },
      { name: 'Star gold', hex: '#f0d48a' }, { name: 'Sky blue', hex: '#6ea0d6' }, { name: 'Dawn', hex: '#e7a27c' },
    ],
    type: { display: 'Josefin Slab', note: 'a geometric slab with a light hand', family: '"Josefin Slab", Georgia, serif', fontHref: 'https://fonts.googleapis.com/css2?family=Josefin+Slab:ital,wght@0,400;1,300&display=swap' },
    worlds: 'A path of stars, sigils, the yantra, a temple.',
    layout: 'Chapters as stops on a route; subcategories as station cards.',
    signature: { name: 'Your path', how: 'A suggested road through the classes, from the fundamentals to mentoring, with three side paths. Tap any star to see the class and keep it. Begin anywhere.' },
    sound: 'A soft chime at each star.',
    imagery: 'Star maps, routes, notebooks with drawn paths.',
    voice: 'Practical and kind: here is a way through.',
  },
  {
    key: 'c', name: 'Palm leaf',
    essence: 'A palm-leaf manuscript: ochre leaf, black ink, turmeric and kumkum. Rooted in Indian learning, with tantra, mantra and yantra at its heart.',
    feeling: ['rooted', 'traditional', 'warm', 'precise'],
    palette: [
      { name: 'Palm leaf', hex: '#ead6a6' }, { name: 'Leaf edge', hex: '#c9a86a' }, { name: 'Ink black', hex: '#1d1410' },
      { name: 'Turmeric', hex: '#d99a2b' }, { name: 'Kumkum', hex: '#a8321e' }, { name: 'Sandal', hex: '#c9a06b' },
    ],
    type: { display: 'Gotu', note: 'made for Latin and Devanagari together', family: '"Gotu", Georgia, serif', fontHref: 'https://fonts.googleapis.com/css2?family=Gotu&display=swap' },
    worlds: 'Ink-light on palm leaf: the yantra, lamps, sigils, a lotus, an open book.',
    layout: 'Long horizontal leaves for chapters, bound by a cord; subcategories as leaves.',
    signature: { name: 'Draw a yantra, step by step', how: 'From the bindu outward: triangles, a circle, eight petals and a square with four gates, one step at a time, each with a line on what it is.' },
    sound: 'A stylus on leaf; a small bell.',
    imagery: 'Real palm-leaf manuscripts, brass lamps, hands drawing.',
    voice: 'Patient and exact, like a teacher at your side.',
  },
];
