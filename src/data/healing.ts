/**
 * Pillar 3, Healing & Inner Work · Still water, with gold.
 * The chosen direction mixes A (Still water: night pool, sea glass, pearl) with
 * the gold of C (Golden repair). Signatures: breathing patterns in the opening,
 * the body of light in Energy, the golden repair puzzle in Shadow, and a
 * journaling prompt. (Directions A, B and C remain in the project history.)
 * Short descriptive lines are DRAFT copy for Sarvakali to refine. Facts were
 * checked in November 2026 (see the cover's fact check); nothing here claims a
 * health effect.
 */

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

/**
 * Breathing patterns for the guide. Each phase: what to do, how long, and how
 * full the circle is (0 empty, 1 full). Sources are on the cover's fact check;
 * the page describes each pattern without promising an effect.
 */
export type BreathPhase = { say: string; kind: 'in' | 'hold' | 'out'; secs: number; to: number; side?: 'left' | 'right' };
export const BREATHS: { key: string; name: string; short: string; about: string; rounds?: number; phases: BreathPhase[] }[] = [
  {
    key: 'soft', name: 'Long out-breath', short: 'In 4 · out 6',
    about: 'The simplest: a breath out that is a little longer than the breath in.',
    phases: [{ say: 'Breathe in', kind: 'in', secs: 4, to: 1 }, { say: 'And out, slowly', kind: 'out', secs: 6, to: 0 }],
  },
  {
    key: 'box', name: 'Box breathing', short: 'In 4 · hold 4 · out 4 · hold 4',
    about: 'Four equal sides: in, hold, out, hold.',
    phases: [{ say: 'Breathe in', kind: 'in', secs: 4, to: 1 }, { say: 'Hold', kind: 'hold', secs: 4, to: 1 }, { say: 'Breathe out', kind: 'out', secs: 4, to: 0 }, { say: 'Hold', kind: 'hold', secs: 4, to: 0 }],
  },
  {
    key: '478', name: '4-7-8, the relaxing breath', short: 'In 4 · hold 7 · out 8',
    about: 'Taught by Dr Andrew Weil: in through the nose for four, hold for seven, out through the mouth for eight. Four rounds is plenty to begin with.',
    rounds: 4,
    phases: [{ say: 'In through the nose', kind: 'in', secs: 4, to: 1 }, { say: 'Hold', kind: 'hold', secs: 7, to: 1 }, { say: 'Out through the mouth', kind: 'out', secs: 8, to: 0 }],
  },
  {
    key: 'sigh', name: 'Cyclic sighing', short: 'In · a little more · long out',
    about: 'A full breath in, a short second sip of air on top, then a long, slow breath out. In a 2023 Stanford study it lifted mood the most of the practices compared, at five minutes a day.',
    phases: [{ say: 'Breathe in', kind: 'in', secs: 2.5, to: 0.8 }, { say: 'A little more', kind: 'in', secs: 1, to: 1 }, { say: 'Long breath out', kind: 'out', secs: 6, to: 0 }],
  },
  {
    key: 'coherent', name: 'Coherent breathing', short: 'In 5 · out 5',
    about: 'Even and unhurried: about six breaths a minute.',
    phases: [{ say: 'Breathe in', kind: 'in', secs: 5, to: 1 }, { say: 'Breathe out', kind: 'out', secs: 5, to: 0 }],
  },
  {
    key: 'bhramari', name: 'Bhramari, the humming bee', short: 'In 4 · hum out 8',
    about: 'A pranayama: breathe in, then breathe out slowly with a soft, steady hum, the lips closed. Some cover the ears gently with the thumbs.',
    phases: [{ say: 'Breathe in', kind: 'in', secs: 4, to: 1 }, { say: 'Hum softly as you breathe out', kind: 'out', secs: 8, to: 0 }],
  },
  {
    key: 'nadi', name: 'Nadi shodhana, alternate nostril', short: 'Left in · right out · right in · left out',
    about: 'A pranayama: rest the thumb on the right nostril and the ring finger on the left, and let the breath change sides. Without holds, which is how most begin.',
    phases: [
      { say: 'In through the left', kind: 'in', secs: 4, to: 1, side: 'left' }, { say: 'Out through the right', kind: 'out', secs: 4, to: 0, side: 'right' },
      { say: 'In through the right', kind: 'in', secs: 4, to: 1, side: 'right' }, { say: 'Out through the left', kind: 'out', secs: 4, to: 0, side: 'left' },
    ],
  },
];

/** a grounding exercise with the five senses, offered next to the breathing */
export const GROUNDING = [
  { n: 5, sense: 'things you can see' }, { n: 4, sense: 'things you can touch' }, { n: 3, sense: 'things you can hear' },
  { n: 2, sense: 'things you can smell' }, { n: 1, sense: 'thing you can taste' },
];

export const BREATH_CARE = 'Breathe gently and never strain. If you feel dizzy or uneasy, return to your normal breath. Skip the holds if you are pregnant or have a heart, blood-pressure or breathing condition, and ask your doctor if unsure.';
