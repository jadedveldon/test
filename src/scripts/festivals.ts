import * as SunCalcNs from 'suncalc';

const SunCalc = ((SunCalcNs as unknown as { default?: typeof SunCalcNs }).default ?? SunCalcNs) as unknown as {
  getMoonIllumination(d: Date): { phase: number };
};

/**
 * Sacred days. The festival dates below come from public panchang listings and
 * MUST be confirmed with Sarvakali's own panchang (regional calendars can differ
 * by a day). New and full moons are worked out from the moon itself.
 */
export type FestKind = 'kalipuja' | 'diwali' | 'navratri' | 'eclipse';
export type FestMode = 'auto' | FestKind | 'none';
export type Festival = { id: string; name: string; kind: FestKind; start: string; end: string; note: string };

export const FESTIVALS: Festival[] = [
  { id: 'kalipuja-2026', name: 'Kali Puja', kind: 'kalipuja', start: '2026-11-08', end: '2026-11-08', note: 'Kartik Amavasya, the great night of Kali.' },
  { id: 'diwali-2026', name: 'Diwali', kind: 'diwali', start: '2026-11-08', end: '2026-11-08', note: 'The festival of lamps.' },
  { id: 'navratri-chaitra-2027', name: 'Chaitra Navratri', kind: 'navratri', start: '2027-04-07', end: '2027-04-15', note: 'Nine nights of the Devi in spring.' },
  { id: 'phalaharini-2027', name: 'Phalaharini Kali Puja', kind: 'kalipuja', start: '2027-06-04', end: '2027-06-04', note: 'Jyeshtha Amavasya, when Kali is offered fruit.' },
  { id: 'eclipse-2027', name: 'Solar eclipse', kind: 'eclipse', start: '2027-08-02', end: '2027-08-02', note: 'A partial eclipse, seen from parts of India.' },
  { id: 'navratri-sharad-2027', name: 'Sharad Navratri', kind: 'navratri', start: '2027-09-30', end: '2027-10-08', note: 'Nine nights of the Devi in autumn.' },
  { id: 'kalipuja-2027', name: 'Kali Puja', kind: 'kalipuja', start: '2027-10-28', end: '2027-10-28', note: 'Kartik Amavasya. Some calendars give 29 October.' },
  { id: 'diwali-2027', name: 'Diwali', kind: 'diwali', start: '2027-10-29', end: '2027-10-29', note: 'The festival of lamps.' },
];

/** how each festival changes the site */
export const FEST_LOOK: Record<FestKind, { preset: string; moon: number; kicker: (f: Festival, day: number) => string }> = {
  kalipuja: { preset: 'festKali', moon: 0, kicker: (f) => `Tonight is ${f.name}` },
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
  // previews show the main festival of that kind (Kali Puja itself, not Phalaharini)
  const f = FESTIVALS.find((x) => x.kind === mode && x.id.startsWith(mode) && x.end >= today) ?? FESTIVALS.find((x) => x.kind === mode)!;
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
    title: e.type === 'amavasya' ? 'Amavasya (new moon)' : 'Purnima (full moon)',
    date: e.at,
    description: e.type === 'amavasya'
      ? 'The new moon: the night most sacred to Kali. From Sarvakali.'
      : 'The full moon. From Sarvakali.',
  })));
}

export function download(name: string, text: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
