import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Writings live as plain Markdown files in src/content/writings, so they can
 * be edited by hand now and from the content editor (Keystatic) later.
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
  }),
});

export const collections = { writings };
