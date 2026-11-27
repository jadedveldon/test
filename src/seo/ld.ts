/**
 * Structured data (schema.org JSON-LD): facts about a page written so search engines and AI tools read them
 * exactly. One small builder per kind of page; Base.astro writes whatever a page passes as `ld`. No prices and no
 * personal details of anyone, ever.
 */
import { site } from '../config';
import type { Mantra, Practice } from '../data/mantras';

const abs = (p: string) => new URL(p, site.url).href;
export const ORG_ID = abs('/#sarvakali');

export const organisation = () => ({
  '@context': 'https://schema.org', '@type': 'Organization', '@id': ORG_ID,
  name: 'Sarvakali', url: abs('/'), logo: abs('/icons/icon-512.png'),
  description: 'Spiritual work across six pillars, devotion, witchcraft and magic, healing and inner work, identity and intimacy, divination and learning, by conversation over Google Meet, with a free daily practice open to every tradition.',
});

export const website = () => ({
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': abs('/#site'), name: 'Sarvakali', url: abs('/'), inLanguage: 'en', publisher: { '@id': ORG_ID },
});

export const pillarService = (p: { slug: string; name: string; line: string; categories: { name: string; subs: { name: string }[] }[] }) => ({
  '@context': 'https://schema.org', '@type': 'Service', name: p.name, description: p.line, url: abs(`/pillars/${p.slug}`),
  provider: { '@id': ORG_ID }, serviceType: p.name,
  availableChannel: { '@type': 'ServiceChannel', name: 'Google Meet', serviceUrl: abs('/connect') },
  hasOfferCatalog: { '@type': 'OfferCatalog', name: p.name, itemListElement: p.categories.map((c) => ({ '@type': 'OfferCatalog', name: c.name, itemListElement: c.subs.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.name } })) })) },
});

export const article = (a: { slug: string; title: string; summary: string; date: Date; image: string }) => ({
  '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.summary, url: abs(`/articles/${a.slug}`),
  datePublished: a.date.toISOString().slice(0, 10), inLanguage: 'en', image: a.image, author: { '@id': ORG_ID }, publisher: { '@id': ORG_ID },
});

/** a text of the library: its words in their own language, the transliteration, its meaning and its source */
export const libraryText = (m: Mantra) => ({
  '@context': 'https://schema.org', '@type': 'CreativeWork', name: m.name, url: abs(`/practice/mantras/${m.slug}`),
  genre: m.kind === 'figure' ? 'Sacred figure' : m.kind, inLanguage: m.lang, isAccessibleForFree: true,
  ...(m.text ? { text: m.text } : {}), ...(m.iastText ? { alternateName: m.iastText.replace(/\n/g, ' ') } : {}),
  description: m.meaning, ...(m.source ? { citation: m.source } : {}),
  about: [m.tradition, m.deity].filter(Boolean).map((name) => ({ '@type': 'Thing', name })),
  keywords: [m.tradition, m.deity, m.kind, ...m.themes].filter(Boolean).join(', '),
  isPartOf: { '@type': 'Collection', name: 'The library: prayers of every tradition', url: abs('/practice/library') }, publisher: { '@id': ORG_ID },
});

/** a guided practice as a set of steps */
export const practiceSteps = (p: Practice, slug: string) => ({
  '@context': 'https://schema.org', '@type': 'HowTo', name: p.title, description: `${p.line} ${p.intro}`.trim(), url: abs(`/practice/with/${slug}`),
  totalTime: `PT${p.minutes}M`, isAccessibleForFree: true, publisher: { '@id': ORG_ID },
  step: p.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title || s.type, text: s.text || s.prompt || s.title || s.type })),
});
