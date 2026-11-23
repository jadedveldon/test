/**
 * Pillar 3, Healing & Inner Work: three art directions to compare live, all
 * built on the catalogue's four categories. Short descriptive lines are DRAFT
 * copy for Sarvakali to refine. Facts were checked in November 2026 (see the
 * fact-check table on the preview cover); nothing here claims a health effect.
 */
export type HealDir = 'a' | 'b' | 'c';

export const CHAPTERS: { key: string; category: string; title: string; line: string; care?: boolean }[] = [
  { key: 'energy', category: 'Energy Healing, Aura & Chakra', title: 'Energy, aura and chakras', line: 'Reiki, aura and chakra work, readings of your energy, and cutting the cords that drain you.' },
  { key: 'mind', category: 'Mind & Subconscious Work', title: 'Mind and the subconscious', line: 'Hypnotherapy and past-life regression, CBT-based and NLP sessions, EFT tapping, and the beliefs you hold about yourself.', care: true },
  { key: 'shadow', category: 'Shadow Work & Inner Healing', title: 'Shadow work and inner healing', line: 'Meeting the parts of you kept out of sight, letting grief and anger move, and finding boundaries, rest and calm.', care: true },
  { key: 'journal', category: 'Journaling & Guided Reflection', title: 'Journaling and reflection', line: 'Guided prompts and programmes for the inner child, the shadow, grief, dreams and devotion, written by your own hand.' },
];

/** shown on the Mind and Shadow chapters; Tele-MANAS is checked in the fact-check table */
export const CARE = 'This is reflective and spiritual work. It is not medical or psychological treatment and does not replace it. If you are struggling, please also reach out to a doctor or counsellor; in India, Tele-MANAS is free on 14416, day and night.';

/**
 * The seven chakras of the modern system (the one most people know today,
 * shaped by Woodroffe's The Serpent Power, 1919). Older Indian traditions
 * count and place them differently, and the rainbow colours were added in the
 * twentieth century; the page says both.
 */
export const CHAKRAS = [
  { name: 'Sahasrara', deva: 'सहस्रार', english: 'Crown', place: 'at or just above the crown of the head', color: '#8e5bd6', working: 'Crown Chakra Working' },
  { name: 'Ajna', deva: 'आज्ञा', english: 'Brow', place: 'between the brows', color: '#4b4fc4', working: 'Third Eye Chakra Working' },
  { name: 'Vishuddha', deva: 'विशुद्ध', english: 'Throat', place: 'at the throat', color: '#2e8fd1', working: 'Throat Chakra Working' },
  { name: 'Anahata', deva: 'अनाहत', english: 'Heart', place: 'at the centre of the chest', color: '#2f9e5b', working: 'Heart Chakra Working' },
  { name: 'Manipura', deva: 'मणिपूर', english: 'Solar plexus', place: 'at the navel, below the ribs', color: '#e2b52a', working: 'Solar Plexus Chakra Working' },
  { name: 'Svadhishthana', deva: 'स्वाधिष्ठान', english: 'Sacral', place: 'below the navel', color: '#e2772a', working: 'Sacral Chakra Working' },
  { name: 'Muladhara', deva: 'मूलाधार', english: 'Root', place: 'at the base of the spine', color: '#c8362e', working: 'Root Chakra Working' },
];

/** journaling prompts for the reflection chapter: DRAFTS for Sarvakali to replace with their own */
export const PROMPTS = [
  'What did I carry today that was never mine to carry?',
  'Where in my body do I feel this, and what does it want me to know?',
  'What would I say to myself at seven years old, if I could sit beside them today?',
  'Which part of me did I hide this week, and what was it protecting?',
  'What am I ready to set down?',
  'What does rest honestly look like for me?',
  'Who am I when no one is watching?',
  'What did I dream, and how did I feel when I woke?',
  'Where did I say yes when I meant no?',
  'What small thing am I grateful for that I almost overlooked?',
];

/** a line icon for every subcategory (keys in the shared ICONS set, src/data/magic.ts) */
export const SUB_ICON: Record<string, string> = {
  'Reiki & Karuna Ki': 'hands',
  'Energy Healing & Restoration': 'wave',
  'Aura Work': 'aura',
  'Chakra Work': 'lotus',
  'Energy Readings & Assessments': 'eye',
  'Cords, Attachments & Shielding': 'cut',
  Hypnotherapy: 'spiral',
  'Past-Life Regression': 'hourglass',
  'CBT-Based Work': 'thought',
  NLP: 'anchor',
  'EFT Tapping': 'tap',
  'Subconscious, Beliefs & Self-Concept': 'mirror',
  'Shadow & Inner-Child Work': 'shadowfig',
  'Emotional Release, Grief & Peace': 'drop',
  'Release & Closure Rituals': 'knot',
  'Self-Discovery & Reflection': 'compass',
  'Confidence, Empowerment & Boundaries': 'shield',
  'Healing & Wellbeing Intentions': 'heartplus',
  'Meditation, Breath & Grounding': 'breath',
  'Guided Sessions, Prompts & Programmes': 'book',
  'Shadow, Inner-Child & Emotional Journaling': 'quill',
  'Self-Discovery & Identity Journaling': 'compass',
  'Relationship & Intimacy Journaling': 'rings',
  'Spiritual, Devotional & Dream Journaling': 'crescent',
  'Journaling Combined with Other Tools': 'sparkle',
};

export type HealDirection = {
  key: HealDir; name: string; essence: string; feeling: string[];
  palette: { name: string; hex: string }[];
  type: { display: string; note: string; fontHref: string };
  worlds: string; layout: string; signature: { name: string; how: string }; sound: string; imagery: string; voice: string;
};

export const HEAL_DIRECTIONS: HealDirection[] = [
  {
    key: 'a', name: 'Still water',
    essence: 'A pool at night under the moon: deep teal, sea glass and pearl. Slow, quiet and kind, with a lotus opening on the water.',
    feeling: ['calm', 'soft', 'slow', 'safe'],
    palette: [
      { name: 'Night pool', hex: '#04161a' }, { name: 'Deep teal', hex: '#0d3a3f' }, { name: 'Sea glass', hex: '#7fc4b8' },
      { name: 'Pearl', hex: '#e9f1ec' }, { name: 'Lotus pink', hex: '#e7a9b8' }, { name: 'Sand', hex: '#d9c8a6' },
    ],
    type: { display: 'Spectral', note: 'a light, airy serif, often in italic', fontHref: 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;1,300&display=swap' },
    worlds: 'Light on water: a lotus, ripples, a halo, a slow spiral, threads of silk.',
    layout: 'Wide, quiet spaces; subcategories float like stones in water.',
    signature: { name: 'Breathe with the water', how: 'A circle of light grows as you breathe in and settles as you breathe out, slowly; the water ripples with each breath. Stop whenever you like.' },
    sound: 'Water drops and a low hum.',
    imagery: 'Photography of still water, lotus leaves, moonlight on a pond.',
    voice: 'Gentle and unhurried, like someone sitting beside you.',
  },
  {
    key: 'b', name: 'The body of light',
    essence: 'Dawn: warm ivory paper with saffron, rose and indigo. The seven chakras rise along a figure of light.',
    feeling: ['warm', 'hopeful', 'embodied', 'bright'],
    palette: [
      { name: 'Dawn paper', hex: '#f6efe4' }, { name: 'Saffron', hex: '#e08a2e' }, { name: 'Rose', hex: '#c7607a' },
      { name: 'Indigo', hex: '#3b3a7a' }, { name: 'Ink', hex: '#2b2230' }, { name: 'Leaf', hex: '#4f8a63' },
    ],
    type: { display: 'Marcellus', note: 'classical, open letters', fontHref: 'https://fonts.googleapis.com/css2?family=Marcellus&display=swap' },
    worlds: 'Ink-light on dawn paper: the seven chakras on one line, a halo, a lotus, the tree.',
    layout: 'A bright page; each chapter opens with a coloured band; subcategories as soft cards.',
    signature: { name: 'The body of light', how: 'Tap any of the seven chakras on the figure to see its Sanskrit name, where it is placed and the working for it. The page says which parts are modern.' },
    sound: 'A soft wooden knock and a bell.',
    imagery: 'Warm photography of hands, light through cloth, morning rooms.',
    voice: 'Clear and encouraging, like a good teacher.',
  },
  {
    key: 'c', name: 'Golden repair',
    essence: 'Kintsugi: charcoal, clay and ash, mended with gold. What broke is not hidden; it becomes part of the story.',
    feeling: ['honest', 'grounded', 'tender', 'strong'],
    palette: [
      { name: 'Charcoal', hex: '#121110' }, { name: 'Clay', hex: '#8a5a44' }, { name: 'Ash', hex: '#cfc6bb' },
      { name: 'Gold', hex: '#d4a63c' }, { name: 'Lacquer red', hex: '#8c2a22' }, { name: 'Stone', hex: '#5d5a55' },
    ],
    type: { display: 'Shippori Mincho', note: 'a calm Japanese-style serif', fontHref: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500&display=swap' },
    worlds: 'A bowl mended with gold, a halo, a slow spiral, falling dust.',
    layout: 'Dark, still pages; gold seams divide the chapters; subcategories as ceramic tiles.',
    signature: { name: 'Mend the bowl', how: 'A bowl lies in pieces. Touch each piece to set it back, and the seam fills with gold. When it is whole, a line on kintsugi.' },
    sound: 'A single low bell, and clay set down on wood.',
    imagery: 'Close photography of mended ceramics, hands, raw clay.',
    voice: 'Honest and steady: nothing to hide, nothing to fix in a hurry.',
  },
];
