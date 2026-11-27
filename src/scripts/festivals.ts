import * as SunCalcNs from 'suncalc';
import days from '../content/festivals.json';
import { say } from './words';

const SunCalc = ((SunCalcNs as unknown as { default?: typeof SunCalcNs }).default ?? SunCalcNs) as unknown as {
  getMoonIllumination(d: Date): { phase: number };
};

/**
 * Sacred days. The festival dates come from public panchang listings and MUST be
 * confirmed with Sarvakali's own panchang (regional calendars can differ by a
 * day); they are kept in src/content/festivals.json, where the content editor
 * writes. New and full moons are worked out from the moon itself.
 */
export type FestKind = 'kalipuja' | 'diwali' | 'navratri' | 'eclipse';
export type FestMode = 'auto' | FestKind | 'none';
export type Festival = { id: string; name: string; kind: FestKind; start: string; end: string; note: string };

const KINDS: FestKind[] = ['kalipuja', 'diwali', 'navratri', 'eclipse'];
const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
/** in date order; an entry with a missing name or an unreadable date is left out rather than breaking the page */
export const FESTIVALS: Festival[] = days.festivals
  .map((f) => ({ ...f, name: f.name.trim(), end: isDay(f.end) && f.end >= f.start ? f.end : f.start }))
  .filter((f) => f.name && isDay(f.start) && KINDS.includes(f.kind as FestKind))
  .sort((x, y) => x.start.localeCompare(y.start))
  .map((f) => ({ ...f, kind: f.kind as FestKind, id: `${f.kind}-${f.start}` }));

/** how each festival changes the site */
export const FEST_LOOK: Record<FestKind, { preset: string; moon: number; kicker: (f: Festival, day: number) => string }> = {
  kalipuja: { preset: 'festKali', moon: 0, kicker: (f) => say('festivals.tonight', { name: f.name }, `Tonight is ${f.name}`) },
  diwali: { preset: 'festDiwali', moon: 0, kicker: () => 'A blessed Diwali' },
  navratri: { preset: 'festNavratri', moon: 0, kicker: (f, d) => `${f.name} · night ${d} of 9` },
  eclipse: { preset: 'festEclipse', moon: 2, kicker: () => 'A solar eclipse today' },
};

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

/** the festival shown today: by date, or one chosen in the prototype panel */
export function activeFestival(mode: FestMode, now = new Date()): { f: Festival; day: number; preview: boolean } | null {
  if (mode === 'none') return null;
  const today = dayKey(now);
  if (mode === 'auto') {
    const f = FESTIVALS.find((x) => x.start <= today && today <= x.end);
    return f ? { f, day: Math.round((parse(today).getTime() - parse(f.start).getTime()) / 864e5) + 1, preview: false } : null;
  }
  // previews show the main festival of that kind: the shortest name among those to come (Kali Puja itself, not Phalaharini)
  const ahead = FESTIVALS.filter((x) => x.kind === mode && x.end >= today);
  const pool = ahead.length ? ahead : FESTIVALS.filter((x) => x.kind === mode);
  const f = pool.reduce<Festival | undefined>((a, x) => (!a || x.name.length < a.name.length ? x : a), undefined);
  if (!f) return null;
  return { f, day: 3, preview: true };
}

export function upcomingFestivals(now = new Date(), limit = 6) {
  const today = dayKey(now);
  return FESTIVALS.filter((f) => f.end >= today).slice(0, limit);
}

/* ------------------------------------------------------------ the moon */

export type MoonEvent = { type: 'amavasya' | 'purnima'; at: Date };

/** the next new and full moons, found from the moon's own phase */
export function moonEvents(from = new Date(), count = 12): MoonEvent[] {
  const out: MoonEvent[] = [];
  const step = 3 * 3600e3;
  let t = from.getTime();
  let prev = SunCalc.getMoonIllumination(new Date(t)).phase;
  const until = t + 400 * 864e5;
  while (t < until && out.length < count * 2) {
    const t2 = t + step;
    const ph = SunCalc.getMoonIllumination(new Date(t2)).phase;
    const isNew = prev > 0.85 && ph < 0.15;
    const isFull = prev < 0.5 && ph >= 0.5;
    if (isNew || isFull) {
      // narrow it down to within a few minutes
      let a = t, b = t2;
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2, pm = SunCalc.getMoonIllumination(new Date(m)).phase;
        const crossed = isNew ? pm < 0.5 : pm >= 0.5;
        if (crossed) b = m; else a = m;
      }
      out.push({ type: isNew ? 'amavasya' : 'purnima', at: new Date(b) });
    }
    prev = ph;
    t = t2;
  }
  return out;
}

export function nextMoon(type: 'amavasya' | 'purnima', from = new Date()) {
  return moonEvents(from, 2).find((e) => e.type === type) ?? null;
}

export const niceDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const daysUntil = (d: Date, now = new Date()) => Math.max(0, Math.round((parse(dayKey(d)).getTime() - parse(dayKey(now)).getTime()) / 864e5));
export const inDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

/* ------------------------------------------------------- calendar files */

type CalEvent = { title: string; date: Date; description: string };
const ymd = (d: Date) => dayKey(d).replace(/-/g, '');
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** an .ics file any calendar app can import, with a reminder the evening before */
export function icsFile(events: CalEvent[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sarvakali//Sacred days//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Sarvakali · sacred days'];
  events.forEach((e, i) => {
    const next = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() + 1);
    lines.push(
      'BEGIN:VEVENT', `UID:${ymd(e.date)}-${i}-${Math.random().toString(36).slice(2, 8)}@sarvakali`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(next)}`, `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.description)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)} tomorrow`, 'TRIGGER:-PT6H', 'END:VALARM', 'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function moonCalendar(count = 12) {
  return icsFile(moonEvents(new Date(), count).map((e) => ({
    title: e.type === 'amavasya' ? say('sky.amavasyaTitle', {}, 'Amavasya') : say('sky.purnimaTitle', {}, 'Purnima'),
    date: e.at,
    description: e.type === 'amavasya'
      ? say('festivals.amavasya')
      : say('festivals.purnima'),
  })));
}

export function download(name: string, text: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
