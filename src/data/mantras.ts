/**
 * The mantra library as the pages use it: the mantras (src/content/mantras, one file each), the seven days
 * (src/content/pages/week.json) and their order, how a day's mantras are grouped, and the addresses of the pages.
 * Everything a page shows survives an edit: a mantra with no Devanagari, a new deity or group, an empty field.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import week from '../content/pages/week.json';
import { iast, pronunciation } from './translit';

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type Day = (typeof week.days)[number];

/** the seven days, always in order and always all seven, whatever the file holds */
export const DAYS: Day[] = DAY_KEYS.map((k, i) => week.days.find((d) => d.key === k) ?? ({ ...week.days[i], key: k } as Day));
export const dayOf = (k: string) => DAYS.find((d) => d.key === k) ?? DAYS[0];

/** the world (colours and form of light) of each day's chapters: src/scripts/world/presets.ts */
export const DAY_WORLD: Record<DayKey, string> = {
  monday: 'dayMonday', tuesday: 'dayTuesday', wednesday: 'dayWednesday', thursday: 'dayThursday', friday: 'dayFriday', saturday: 'daySaturday', sunday: 'daySunday',
};
/** each day's colour for its marks and buttons */
export const DAY_HEX: Record<DayKey, string> = {
  monday: '#c9d4f2', tuesday: '#ef6a4a', wednesday: '#5fcf9a', thursday: '#f2c14e', friday: '#f29ac0', saturday: '#8f8fe0', sunday: '#ffad3b',
};
/** the planets' signs, drawn as text */
export const DAY_GLYPH: Record<DayKey, string> = { monday: '☽', tuesday: '♂', wednesday: '☿', thursday: '♃', friday: '♀', saturday: '♄', sunday: '☉' };

export type Mantra = CollectionEntry<'mantras'>['data'] & { slug: string; iastText: string; readText: string };
const DEVA = /[\u0900-\u097F]/;
const hidden = (s: string) => s === 'verify' || s === 'honoured';
/** languages written right to left */
export const isRtl = (lang: string) => /^(he|ar|fa|ur|yi)\b/.test(lang);

export async function loadMantras(): Promise<Mantra[]> {
  const all = await getCollection('mantras');
  return all
    .map((e) => ({
      ...e.data,
      slug: e.id,
      // a mantra held for checking, or a figure honoured without a text, shows no text, whatever its file holds;
      // the transliteration and pronunciation are worked out only from Devanagari (every other script gives its own)
      text: hidden(e.data.status) ? '' : e.data.text,
      iastText: hidden(e.data.status) ? '' : e.data.iast?.trim() || (DEVA.test(e.data.text) ? iast(e.data.text) : ''),
      readText: hidden(e.data.status) ? '' : e.data.pronunciation?.trim() || (DEVA.test(e.data.text) ? pronunciation(e.data.text) : ''),
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** a day's mantras in its groups: those placed first on this day in their groups (in the order they first
 *  appear), then those kept on this day as well as another, under "Also kept on {day}" */
export function groupsFor(all: Mantra[], day: DayKey) {
  const own = all.filter((m) => m.days[0] === day);
  const also = all.filter((m) => m.days[0] !== day && m.days.includes(day));
  const groups: { name: string; mantras: Mantra[] }[] = [];
  for (const m of own) {
    const name = m.group || 'Mantras';
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, mantras: [] }));
    g.mantras.push(m);
  }
  // closing prayers go last
  groups.sort((a, b) => Number(/^closing$/i.test(a.name)) - Number(/^closing$/i.test(b.name)));
  if (also.length) groups.push({ name: `Also kept on ${dayOf(day).name}`, mantras: also });
  return groups;
}

export const mantraPath = (slug: string) => `/practice/mantras/${slug}`;
export const dayPath = (k: string) => `/practice/${k}`;

/** what the daily practice page's script needs of each mantra (the rite, today's list, my mantras) */
export function summary(all: Mantra[]) {
  return all.map((m) => ({
    slug: m.slug, name: m.name, days: m.days, deity: m.deity, status: m.status, text: m.text, iast: m.iastText, read: m.readText, lang: m.lang, tradition: m.tradition,
    meaning: m.meaning, intention: m.intention,
  }));
}
export type MantraSummary = ReturnType<typeof summary>[number];

/** deities in the order they first appear in the week */
export const deitiesOf = (all: Mantra[]) => [...new Set(all.map((m) => m.deity).filter(Boolean))];
/** traditions, the largest first */
export const traditionsOf = (all: Mantra[]) => {
  const n = new Map<string, number>();
  for (const m of all) n.set(m.tradition, (n.get(m.tradition) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, c]) => ({ name: t, count: c }));
};
/** a tradition as part of an address: "Ancient Greek" → ancient-greek */
export const tradKey = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------------------------------------------------------------- guided practices (src/content/practices) */

export type Practice = CollectionEntry<'practices'>['data'] & { slug: string };
export async function loadPractices(): Promise<Practice[]> {
  return (await getCollection('practices')).map((e) => ({ ...e.data, slug: e.id })).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
export const practicePath = (slug: string) => `/practice/with/${slug}`;
/** each kind of step, as the practice's outline names it */
export const STEP_ICON: Record<string, string> = { breathe: '◌', light: '✧', read: '❦', chant: '◉', reflect: '✎', offer: '❂', close: '✦' };
