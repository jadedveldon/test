import { abs } from '../seo/pages';

/**
 * Who may read the site. Search engines and AI search (the crawlers that answer someone's question and link back)
 * are welcome everywhere public. Crawlers that only gather text to train AI models are turned away (the owner's
 * decision, 2026-11-27); Google-Extended is let in, because it also lets Gemini's own app use the site when it
 * answers someone. Private pages are kept out for everyone. These rules are honoured by the major companies; they
 * cannot force a crawler that ignores them.
 */
const PRIVATE = ['/studio', '/api/', '/booking', '/invoice', '/me'];
const TRAINING_ONLY = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Meta-ExternalAgent', 'Applebot-Extended', 'Bytespider', 'Amazonbot', 'cohere-training-data-crawler', 'Diffbot', 'omgili'];

export function GET() {
  const lines = [
    '# Sarvakali. Search engines and AI search are welcome; crawling only to train AI models is not.',
    '',
    ...TRAINING_ONLY.flatMap((ua) => [`User-agent: ${ua}`, 'Disallow: /', '']),
    'User-agent: *',
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    'Allow: /',
    '',
    `Sitemap: ${abs('/sitemap.xml')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
