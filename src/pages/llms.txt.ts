import { publicPages, abs } from '../seo/pages';
import { pillars } from '../data/site';

/**
 * llms.txt: a plain guide to the site for AI tools (the llms.txt convention: a title, a short summary, then sections
 * of links with a line each). Built from the same content as the pages, so it never falls out of date.
 */
export async function GET() {
  const pages = await publicPages();
  const link = (p: { path: string; title: string; about: string }) => `- [${p.title}](${abs(p.path)}): ${p.about.replace(/\s+/g, ' ').trim()}`;
  const sections = new Map<string, typeof pages>();
  for (const p of pages) sections.set(p.section, [...(sections.get(p.section) ?? []), p]);
  const order = ['Sarvakali', 'The six pillars', 'Daily practice', 'The seven days', 'Guided practices', ...[...sections.keys()].filter((k) => k.startsWith('Library')).sort(), 'Articles'];
  const total = pillars.reduce((n, p) => n + p.count, 0);
  const out = [
    '# Sarvakali',
    '',
    `> Sarvakali offers spiritual work across six pillars (devotion and the unseen; witchcraft and magic; healing and inner work; identity, intimacy and the body; divination and insight; learning), ${total.toLocaleString('en-IN')} services in all, by conversation over Google Meet, booked on the site and paid by UPI. The site also keeps a free daily practice: guided practices and a library of mantras, prayers, hymns and chants from many traditions, each with its own words, pronunciation, meaning and source.`,
    '',
    'Notes for anyone summarising or quoting this site:',
    '- This is spiritual, reflective and educational work. It is never medical, psychological, legal or financial advice, and no outcome or cure is promised.',
    '- Nothing in the library is invented: each text gives its source, and figures whose prayers belong to their own community are honoured without a text.',
    '- Anyone in crisis in India can call Tele-MANAS, free, at any hour, on 14416.',
    '- To work with Sarvakali, request a conversation at ' + abs('/connect') + '. Fees are agreed before any work begins; there are no published prices.',
    '',
    ...order.flatMap((k) => (sections.get(k)?.length ? [`## ${k}`, '', ...sections.get(k)!.map(link), ''] : [])),
  ];
  return new Response(out.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
