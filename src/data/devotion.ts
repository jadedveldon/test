/**
 * Pillar 1, Devotion & the Unseen. Chosen direction: C · Cosmic mother.
 * Kali as time and space itself: night sky, gold geometry, every tradition
 * orbiting one bindu. Each tradition gets its own movement with its own
 * iconography in the world behind it.
 *
 * Short descriptive lines are DRAFT copy for Sarvakali to refine.
 */
export const DIRECTION = {
  name: 'Cosmic mother',
  palette: [
    { name: 'Deep night', hex: '#050617' },
    { name: 'Violet', hex: '#1f1450' },
    { name: 'Nebula', hex: '#3a4fb8' },
    { name: 'Gold', hex: '#e7c46a' },
    { name: 'Rose', hex: '#d98cb3' },
    { name: 'Starlight', hex: '#f1efff' },
  ],
  type: 'Cormorant Garamond (light italic, wide spacing) for titles; Inter for reading; Tiro Devanagari and Greek script for names',
  imagery: 'Fine gold line drawings: yantras, a temple, the world tree, constellations; deities in outline',
};

/** the ten Mahavidyas */
export const MAHAVIDYAS = [
  { name: 'Kali', deva: 'काली', line: 'Time, and freedom from it', service: 'Kali Working' },
  { name: 'Tara', deva: 'तारा', line: 'The star who carries you across', service: 'Tara Working' },
  { name: 'Tripura Sundari', deva: 'त्रिपुरसुन्दरी', line: 'Beauty of the three worlds', service: 'Lalita Tripura Sundari Working' },
  { name: 'Bhuvaneshvari', deva: 'भुवनेश्वरी', line: 'Queen of space and every world', service: 'Bhuvaneshwari Working' },
  { name: 'Bhairavi', deva: 'भैरवी', line: 'The fierce heat that transforms', service: 'Bhairavi Working' },
  { name: 'Chhinnamasta', deva: 'छिन्नमस्ता', line: 'The self offered, beyond the ego', service: 'Chinnamasta Working' },
  { name: 'Dhumavati', deva: 'धूमावती', line: 'Wisdom in smoke and in loss', service: 'Dhumavati Working' },
  { name: 'Bagalamukhi', deva: 'बगलामुखी', line: 'She who stills and silences', service: 'Baglamukhi Working' },
  { name: 'Matangi', deva: 'मातङ्गी', line: 'Speech, music and outsider wisdom', service: 'Matangi Working' },
  { name: 'Kamala', deva: 'कमला', line: 'The lotus: abundance and grace', service: 'Kamala Working' },
];

/** the Devi and the Hindu deities */
export const HINDU = [
  { name: 'Durga', deva: 'दुर्गा', line: 'The invincible mother', service: 'Durga Working' },
  { name: 'Pratyangira', deva: 'प्रत्यङ्गिरा', line: 'The lion-faced shield', service: 'Pratyangira Working' },
  { name: 'Kamakhya', deva: 'कामाख्या', line: 'Desire, power and the source', service: 'Kamakhya Devotional Working' },
  { name: 'Lakshmi', deva: 'लक्ष्मी', line: 'Abundance and grace', service: 'Lakshmi Working' },
  { name: 'Saraswati', deva: 'सरस्वती', line: 'Knowledge, music and speech', service: 'Saraswati Working' },
  { name: 'Shiva', deva: 'शिव', line: 'Stillness, the auspicious one', service: 'Shiva Working' },
  { name: 'Bhairava', deva: 'भैरव', line: 'The fierce guardian of time', service: 'Bhairava Working' },
  { name: 'Narasimha', deva: 'नरसिंह', line: 'The man-lion who protects', service: 'Narasimha Working' },
  { name: 'Krishna', deva: 'कृष्ण', line: 'Love, play and devotion', service: 'Krishna Working' },
  { name: 'Hanuman', deva: 'हनुमान्', line: 'Strength in service', service: 'Hanuman Working' },
  { name: 'Ganesha', deva: 'गणेश', line: 'The remover of obstacles', service: 'Ganesha Working' },
  { name: 'Kartikeya', deva: 'कार्तिकेय', line: 'Courage and the spear; Murugan', service: 'Kartikeya / Murugan Working' },
];
export const HINDU_ALSO = ['Devi Protection Working', 'Devi Invocation & Prayer', 'Goddess-Centred Spiritual Guidance'];
export const TANTRA = ['Mantra-Based Devotional Working', 'Yantra-Based Devotional Working', 'Tantric Symbolic Ritual Work', 'Personalised Devi Sadhana Guidance'];

/** the Greek gods, gathered by the five elements (a draft grouping, for Sarvakali to confirm) */
export type Element = { key: string; name: string; greek: string; symbol: string };
export const ELEMENTS: Element[] = [
  { key: 'fire', name: 'Fire', greek: 'Πῦρ', symbol: 'M0 -18 L16 12 L-16 12 Z' },
  { key: 'air', name: 'Air', greek: 'Ἀήρ', symbol: 'M0 -18 L16 12 L-16 12 Z M-10 1 L10 1' },
  { key: 'water', name: 'Water', greek: 'Ὕδωρ', symbol: 'M0 18 L16 -12 L-16 -12 Z' },
  { key: 'earth', name: 'Earth', greek: 'Γῆ', symbol: 'M0 18 L16 -12 L-16 -12 Z M-10 -1 L10 -1' },
  { key: 'aether', name: 'Aether', greek: 'Αἰθήρ', symbol: 'M-15 0 A15 15 0 1 0 15 0 A15 15 0 1 0 -15 0 M-5 0 A5 5 0 1 0 5 0 A5 5 0 1 0 -5 0' },
];
export const GREEK = [
  { name: 'Hephaestus', greek: 'Ἥφαιστος', el: 'fire', line: 'The forge and every craft' },
  { name: 'Hestia', greek: 'Ἑστία', el: 'fire', line: 'The hearth and the home' },
  { name: 'Apollo', greek: 'Ἀπόλλων', el: 'fire', line: 'Light, music, prophecy' },
  { name: 'Ares', greek: 'Ἄρης', el: 'fire', line: 'Courage and the fight' },
  { name: 'Zeus', greek: 'Ζεύς', el: 'air', line: 'Sky, thunder and order' },
  { name: 'Hermes', greek: 'Ἑρμῆς', el: 'air', line: 'Messages, roads and luck' },
  { name: 'Athena', greek: 'Ἀθηνᾶ', el: 'air', line: 'Wisdom and strategy' },
  { name: 'Eros', greek: 'Ἔρως', el: 'air', line: "Desire's arrow" },
  { name: 'Nike', greek: 'Νίκη', el: 'air', line: 'Victory' },
  { name: 'Poseidon', greek: 'Ποσειδῶν', el: 'water', line: 'The sea and its depths' },
  { name: 'Aphrodite', greek: 'Ἀφροδίτη', el: 'water', line: 'Love and beauty, born of sea foam' },
  { name: 'Dionysus', greek: 'Διόνυσος', el: 'water', line: 'Ecstasy and release' },
  { name: 'Gaia', greek: 'Γαῖα', el: 'earth', line: 'The Earth herself' },
  { name: 'Demeter', greek: 'Δημήτηρ', el: 'earth', line: 'Harvest, and a mother’s grief' },
  { name: 'Persephone', greek: 'Περσεφόνη', el: 'earth', line: 'Spring and the underworld' },
  { name: 'Hades', greek: 'ᾍδης', el: 'earth', line: 'The underworld and the ancestors' },
  { name: 'Rhea', greek: 'Ῥέα', el: 'earth', line: 'Mother of the gods' },
  { name: 'Kronos', greek: 'Κρόνος', el: 'earth', line: 'Time and the harvest' },
  { name: 'Nyx', greek: 'Νύξ', el: 'aether', line: 'Primordial night' },
  { name: 'Selene', greek: 'Σελήνη', el: 'aether', line: 'The moon' },
  { name: 'Hecate', greek: 'Ἑκάτη', el: 'aether', line: 'Crossroads, keys and torches' },
  { name: 'Artemis', greek: 'Ἄρτεμις', el: 'aether', line: 'The wild and the free' },
  { name: 'Hera', greek: 'Ἥρα', el: 'aether', line: 'Queen of the heavens' },
  { name: 'Nemesis', greek: 'Νέμεσις', el: 'aether', line: 'Balance restored' },
  { name: 'Psyche', greek: 'Ψυχή', el: 'aether', line: 'The soul' },
];

/** goddesses and gods of many lands */
export const LANDS = [
  { land: 'Mesopotamian and Jewish lore', names: ['Lilith Devotional Working'] },
  { land: 'Egyptian', names: ['Isis Devotional Working'] },
  { land: 'Celtic', names: ['Brigid Devotional Working'] },
  { land: 'Norse', names: ['Odin Devotional Working', 'Loki Devotional Working', 'Freyja Devotional Working', 'Frigg Devotional Working', 'Sunna Devotional Working'] },
  { land: 'Canaanite', names: ['Asherah Devotional Working'] },
  { land: 'Roman', names: ['Flora Devotional Working'] },
  { land: 'Japanese', names: ['Benzaiten Devotional Working'] },
  { land: 'Chinese', names: ['Mazu Devotional Working', 'Nüwa Devotional Working'] },
  { land: 'Tibetan Buddhist', names: ['Kurukulla Devotional Study', 'Vajrayogini-Inspired Devotional Study', 'Vajravarahi-Inspired Devotional Study'] },
  { land: 'Across traditions', names: ['Lilith & Aphrodite Combined Working', 'Custom Cross-Pantheon Devotional Ritual'] },
];
