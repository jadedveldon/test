/**
 * Today's line on the homepage: the short texts of the library that anyone may say (open to all, with a text of
 * two lines at most), each with the days it is kept on (none: any day). The browser picks today's
 * (src/scripts/today-line.ts): one kept on today's weekday or on any day, a different one each day, the traditions
 * taking turns. Everything a visitor sees comes from the library's own files.
 */
import type { Mantra } from './mantras';

export type Line = { slug: string; name: string; tradition: string; days: string[]; text: string; iast: string; read: string; meaning: string; lang: string };

const SHORT = 110;
export function todayLines(all: Mantra[]): Line[] {
  const ok = all.filter((m) => m.status === 'open' && m.text && m.text.length <= SHORT && m.text.split('\n').length <= 2 && m.meaning);
  // the traditions take turns: one from each in turn, so a run of days is never all one tradition
  const byTrad = new Map<string, Mantra[]>();
  for (const m of ok) byTrad.set(m.tradition, [...(byTrad.get(m.tradition) ?? []), m]);
  const queues = [...byTrad.values()];
  const out: Mantra[] = [];
  while (queues.some((q) => q.length)) for (const q of queues) { const m = q.shift(); if (m) out.push(m); }
  return out.map((m) => ({
    slug: m.slug, name: m.name, tradition: m.tradition, days: m.days, text: m.text, iast: m.iastText, read: m.readText, lang: m.lang,
    // the first sentence of its meaning is enough here; the rest is a tap away
    meaning: (m.meaning.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? m.meaning).trim(),
  }));
}
