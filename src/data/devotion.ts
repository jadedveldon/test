/**
 * Pillar 1, Devotion & the Unseen: three art directions to compare live.
 * Each is a complete answer to "what does this pillar feel like": colour,
 * type, the world behind each category, how the services are laid out, a
 * signature moment, and its sound. Pick one, or mix parts of them.
 */
export type DirKey = 'a' | 'b' | 'c';

export type Direction = {
  key: DirKey;
  name: string;
  essence: string;
  feeling: string[];
  palette: { name: string; hex: string }[];
  type: { display: string; note: string; fontHref?: string };
  worlds: { hero: string; deity: string; spirits: string; shaman: string };
  layout: string;
  signature: { name: string; how: string };
  sound: string;
  imagery: string;
  voice: string;
};

export const DIRECTIONS: Direction[] = [
  {
    key: 'a',
    name: 'Midnight temple',
    essence: 'Kalighat after dark: oil lamps, vermilion, marigolds and brass. Warm, intimate and devotional.',
    feeling: ['warm', 'devotional', 'close', 'Bengal'],
    palette: [
      { name: 'Lamp-black', hex: '#0a0405' },
      { name: 'Temple maroon', hex: '#3a0a0c' },
      { name: 'Sindoor', hex: '#c8321e' },
      { name: 'Marigold', hex: '#f2a52b' },
      { name: 'Brass', hex: '#c9a24a' },
      { name: 'Ivory', hex: '#f7ecd9' },
    ],
    type: { display: 'Instrument Serif', note: 'with Devanagari names in Tiro Devanagari, and gilded arches' },
    worlds: { hero: 'a ring of 108 lamp flames', deity: 'the ring of flames', spirits: 'lamps floating on the river, for the ancestors', shaman: 'the sacred fire' },
    layout: 'The ten Mahavidyas stand in arched temple niches; the rest as offerings on brass plates.',
    signature: { name: 'Offer aarti', how: 'Circle the lamp around the eye three times: the bell rings and marigold petals fall.' },
    sound: 'Temple bells and a low hum under the tanpura.',
    imagery: 'Commissioned Kalighat-style paintings: one for each Mahavidya.',
    voice: 'Tender, like speaking to Ma.',
  },
  {
    key: 'b',
    name: 'Smoke and ash',
    essence: 'The cremation ground at moonrise, where Kali dances: ash, bone, smoke and one drop of red. Fierce, stark and honest.',
    feeling: ['fierce', 'stark', 'tantric', 'unafraid'],
    palette: [
      { name: 'Ash-black', hex: '#0b0b0c' },
      { name: 'Charcoal', hex: '#1d1c1e' },
      { name: 'Ash', hex: '#8f8a86' },
      { name: 'Bone', hex: '#e9e4da' },
      { name: 'Blood', hex: '#a1121a' },
      { name: 'Ember', hex: '#ff6a2a' },
    ],
    type: {
      display: 'Bodoni Moda',
      note: 'high contrast, very large, set like an inscription; few words, lots of space',
      fontHref: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&display=swap',
    },
    worlds: { hero: "Kali's eye in the smoke", deity: 'the eye', spirits: 'veils of silk between the worlds', shaman: 'drum rings spreading on dark water' },
    layout: 'The Mahavidyas as a numbered litany, one name per line; services as a manuscript index.',
    signature: { name: 'Part the smoke', how: 'The page begins veiled in smoke. Move through it and it parts, then slowly drifts back.' },
    sound: 'Wind over ash and a deep, slow gong.',
    imagery: 'Black-and-white photography of smoke, ash and flame; no faces.',
    voice: 'Direct, few words, no softening.',
  },
  {
    key: 'c',
    name: 'Cosmic mother',
    essence: 'Kali as time and space itself: night sky, gold geometry, every tradition orbiting one bindu. Vast, inclusive and luminous.',
    feeling: ['vast', 'luminous', 'inclusive', 'mystic'],
    palette: [
      { name: 'Deep night', hex: '#050617' },
      { name: 'Violet', hex: '#1f1450' },
      { name: 'Nebula', hex: '#3a4fb8' },
      { name: 'Gold', hex: '#e7c46a' },
      { name: 'Rose', hex: '#d98cb3' },
      { name: 'Starlight', hex: '#f1efff' },
    ],
    type: {
      display: 'Cormorant Garamond',
      note: 'light italic with wide spacing; fine gold lines',
      fontHref: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap',
    },
    worlds: { hero: 'a ring of light around the bindu', deity: 'deities as constellations', spirits: 'a nebula of ancestors', shaman: 'the spiral journey' },
    layout: 'The ten Mahavidyas orbit a central bindu; other traditions are constellations around them.',
    signature: { name: 'Turn the yantra', how: 'Drag the great yantra to turn it. When it comes into alignment, the bindu lights and a chime sounds.' },
    sound: 'Crystal chimes and a shimmering, slow chord.',
    imagery: 'Fine gold line drawings: yantras, constellations, the deities in outline.',
    voice: 'Spacious and wondering.',
  },
];

/** the ten Mahavidyas: names, Devanagari, a short line (draft copy for Sarvakali to refine) */
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
