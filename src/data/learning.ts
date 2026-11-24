import type { DirChapter } from './directions';

/**
 * Pillar 6, Learning: the library, the leaf and the stars. All three directions were loved, so the page walks
 * through all three rooms: the library by lamplight (A), the palm-leaf manuscripts (C) and the night road of
 * study (B). The signatures kept are Find your class (A) and Your path (B); the yantra drawing (C) is in the
 * project history. Lines are DRAFT copy for Sarvakali. Facts and sources are in the fact
 * check on the preview cover.
 */
export const CHAPTERS: DirChapter[] = [
  { key: 'foundations', room: 'library', title: 'Foundations', line: 'Where to begin: what spirituality is and is not, understanding your experiences, energy work, the aura and the chakras, and shadow work.', subs: ['Spiritual Foundations'] },
  { key: 'craft', room: 'library', title: 'Witchcraft and spellcraft', line: 'An introduction to witchcraft, then the hands-on craft: spells, sigils, candles, jars and protection.', subs: ['Witchcraft & Spellcraft Classes'] },
  {
    key: 'tantra', room: 'leaf', title: 'Tantra, mantra and yantra', line: 'First steps into the three: what they are, how they are practised, and what the mantras mean.', subs: ['Tantra, Mantra & Yantra'],
    note: 'A mantra is a sacred utterance: a sound, a syllable, a word or a verse. A yantra is a geometric diagram. Tantra comes from a word for a loom, a weave.',
  },
  { key: 'deity', room: 'leaf', title: 'Deities and devotion', line: 'Studying the gods and goddesses (Hindu, Greek, the Devi and the Mahavidyas), and building a devotional practice and altar of your own.', subs: ['Deity & Devotional Studies'] },
  { key: 'mentoring', room: 'sky', title: 'Mentoring and consultations', line: 'One-to-one guidance for your own practice: your grimoire, your spells and sigils, your altar, and programmes made for you.', subs: ['Mentoring & Consultations'] },
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

/** Find your class (from the library): three questions, each answer pointing to classes in the catalogue */
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

/** Your path (under the stars): a suggested path of study: stations along one road, with three side paths; begin anywhere */
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
