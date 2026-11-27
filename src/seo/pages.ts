/**
 * Every public page of the site, for search engines and AI tools (the sitemap, llms.txt): its address, what it is,
 * and when it changed. Private pages (a client's booking or invoice, My space, the Studio, the editor) are never
 * listed. Everything is read from the same content the pages are built from, so a new mantra, practice or article
 * is listed by itself.
 */
import { getCollection } from 'astro:content';
import { pillars } from '../data/site';
import { DAYS, loadMantras, loadPractices } from '../data/mantras';
import { site } from '../config';

export type Listed = { path: string; title: string; about: string; section: string; changed?: string; priority: number };

export async function publicPages(): Promise<Listed[]> {
  const out: Listed[] = [
    { path: '/', title: 'Sarvakali', about: 'Devotion, witchcraft and magic, healing and inner work, identity and intimacy, divination and learning, held in one place.', section: 'Sarvakali', priority: 1 },
    { path: '/about', title: 'About Sarvakali', about: 'Who Sarvakali is and how the work is held.', section: 'Sarvakali', priority: 0.7 },
    { path: '/connect', title: 'Request a conversation', about: 'Ask for a conversation with Sarvakali over Google Meet, at a time that suits you, in any time zone.', section: 'Sarvakali', priority: 0.9 },
    { path: '/path', title: 'Find your path', about: 'Three short questions to find where to begin.', section: 'Sarvakali', priority: 0.6 },
    { path: '/care', title: 'Boundaries and care', about: 'What this work is and is not, how details are kept private, and where to find help (Tele-MANAS 14416 in India).', section: 'Sarvakali', priority: 0.6 },
    { path: '/terms', title: 'Terms and refunds', about: 'Booking, paying by UPI, moving or cancelling, refunds and complaints.', section: 'Sarvakali', priority: 0.4 },
    { path: '/practice', title: 'Daily practice', about: 'Guided daily practices: for today, with a deity or figure of many traditions, for how you feel, or with no deity at all.', section: 'Daily practice', priority: 0.9 },
    { path: '/practice/library', title: 'The library: prayers of every tradition', about: 'Mantras, prayers, hymns and chants from many traditions, with their own words, pronunciation, meaning and source.', section: 'Daily practice', priority: 0.9 },
    { path: '/practice/tools', title: 'Tools for practice', about: 'A mala counter, the fire offering, the diya, the month’s lunar days and sacred days ahead.', section: 'Daily practice', priority: 0.5 },
    { path: '/articles', title: 'Articles', about: 'Writing on devotion, practice and the unseen.', section: 'Articles', priority: 0.7 },
  ];
  for (const p of pillars) out.push({ path: `/pillars/${p.slug}`, title: p.name, about: p.line, section: 'The six pillars', priority: 0.9 });
  for (const d of DAYS) out.push({ path: `/practice/${d.key}`, title: `${d.name}, the day of ${d.planet}`, about: d.question, section: 'The seven days', priority: 0.6 });
  for (const p of await loadPractices()) out.push({ path: `/practice/with/${p.slug}`, title: p.title, about: `${p.line} A guided practice of about ${p.minutes} minutes.`, section: 'Guided practices', priority: 0.6 });
  for (const m of await loadMantras()) {
    out.push({ path: `/practice/mantras/${m.slug}`, title: m.name, about: `${m.tradition}${m.kind && m.kind !== 'figure' ? ` ${m.kind}` : ''}. ${m.meaning}`.slice(0, 220), section: `Library · ${m.tradition}`, priority: m.status === 'open' ? 0.6 : 0.4 });
  }
  for (const a of await getCollection('writings')) out.push({ path: `/articles/${a.id}`, title: a.data.title, about: a.data.summary, section: 'Articles', changed: a.data.date.toISOString().slice(0, 10), priority: 0.7 });
  return out;
}

export const abs = (path: string) => new URL(path, site.url).href;
