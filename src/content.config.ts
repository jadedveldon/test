import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Articles live as plain Markdown files in src/content/writings ("Articles" in the content editor), shown at
 * /articles. A picture is optional; without one, each article's card is drawn in its pillar's colours.
 */
const writings = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writings' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    pillar: z.enum(['devotion', 'magic', 'healing', 'identity', 'divination', 'learning']),
    minutes: z.number(),
    draft: z.boolean().default(true),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

/**
 * The mantra library: one JSON file per mantra in src/content/mantras ("Mantras" in the content editor). The
 * transliteration and pronunciation are worked out from the Devanagari (src/data/translit.ts) unless a file gives
 * its own. `status`: open (anyone may recite), guidance (learn with a teacher), variant (wording not yet traced),
 * verify (wording held back until checked; only its meaning is shown).
 */
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const mantras = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/mantras' }),
  schema: z.object({
    name: z.string(),
    days: z.array(z.enum(DAYS)).min(1),
    group: z.string().default(''),
    deity: z.string().default(''),
    themes: z.array(z.string()).default([]),
    intention: z.string().default(''),
    text: z.string().default(''),
    iast: z.string().optional(),
    pronunciation: z.string().optional(),
    meaning: z.string().default(''),
    parts: z.array(z.tuple([z.string(), z.string()]).or(z.object({ line: z.string(), meaning: z.string() }).transform((o) => [o.line, o.meaning] as [string, string]))).default([]),
    purpose: z.string().default(''),
    supports: z.string().default(''),
    when: z.string().default(''),
    note: z.string().default(''),
    source: z.string().default(''),
    status: z.enum(['open', 'guidance', 'variant', 'verify']).default('open'),
    drafted: z.boolean().default(false),
    supplied: z.string().default(''),
    audio: z.string().optional(),
    order: z.number().default(999),
  }),
});

/**
 * Guided practices: one short, curated session each, for a deity, a feeling or a day of the week, built in steps
 * from the mantra library (src/content/practices, "Guided practices" in the content editor). The words are drafts
 * for Sarvakali. A step is one of: breathe, light (the lamp), read (a mantra, with its meaning), chant (a mantra,
 * counted), reflect (a question, with an optional journal line), offer (to the fire), close (a closing prayer).
 */
const practices = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/practices' }),
  schema: z.object({
    kind: z.enum(['deity', 'feeling', 'day']),
    key: z.string(),
    title: z.string(),
    sanskrit: z.string().default(''),
    line: z.string().default(''),
    intro: z.string().default(''),
    minutes: z.number().default(10),
    world: z.string().default('practice'),
    care: z.boolean().default(false),
    offering: z.string().default(''),
    steps: z.array(z.object({
      type: z.enum(['breathe', 'light', 'read', 'chant', 'reflect', 'offer', 'close']),
      title: z.string().default(''),
      text: z.string().default(''),
      mantra: z.string().nullish(),
      count: z.number().nullish(),
      prompt: z.string().nullish(),
      pattern: z.string().nullish(),
    })).min(1),
    after: z.string().default(''),
    next: z.array(z.string()).default([]),
    ask: z.string().default(''),
    drafted: z.boolean().default(true),
    order: z.number().default(999),
  }),
});

export const collections = { writings, mantras, practices };
