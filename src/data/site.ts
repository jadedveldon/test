import categories from './categories.json';

export type Subcategory = { name: string; items: string[] };
export type Category = { name: string; subs: Subcategory[] };
export type PillarData = { name: string; categories: Category[] };

export type Pillar = {
  slug: string;
  name: string;
  /** key into the world presets */
  preset: string;
  /** one plain sentence on what the pillar holds (placeholder copy) */
  line: string;
  categories: Category[];
  count: number;
};

const LINES: Record<string, { slug: string; preset: string; line: string }> = {
  'Devotion & the Unseen': {
    slug: 'devotion',
    preset: 'devotion',
    line: 'Work with Kali and the Devi, deities across traditions, spirits, ancestors and shamanic journeys.',
  },
  'Witchcraft & Magic': {
    slug: 'magic',
    preset: 'magic',
    line: 'Spells, rituals and protection, from love and abundance to uncrossing and baneful craft.',
  },
  'Healing & Inner Work': {
    slug: 'healing',
    preset: 'healing',
    line: 'Reiki, aura and chakra work, hypnotherapy, CBT, NLP, EFT, shadow work and guided journaling.',
  },
  'Identity, Intimacy & the Body': {
    slug: 'identity',
    preset: 'identity',
    line: 'Queer-affirming sessions and gentle work around intimacy, sexuality, the body and Lilith.',
  },
  'Divination & Insight': {
    slug: 'divination',
    preset: 'divination',
    line: 'Psychic, tarot and oracle readings, dreamwork, psychic development and astral work.',
  },
  Learning: {
    slug: 'learning',
    preset: 'learning',
    line: 'Classes and mentoring in spirituality, witchcraft, tantra, mantra, yantra and the deities.',
  },
};

const data = categories as { pillars: PillarData[] };

export const pillars: Pillar[] = data.pillars.map((p) => {
  const meta = LINES[p.name];
  const count = p.categories.reduce((a, c) => a + c.subs.reduce((b, s) => b + s.items.length, 0), 0);
  return { ...meta, name: p.name, categories: p.categories, count };
});

export const totalServices = pillars.reduce((a, p) => a + p.count, 0);

export const categoryCount = (c: Category) => c.subs.reduce((a, s) => a + s.items.length, 0);
