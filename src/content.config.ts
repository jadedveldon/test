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

export const collections = { writings };
