/**
 * The day's shared count of lamps: one number per day, nothing about who lit them. The day is India's, so the count
 * turns over at midnight in India for everyone. Shared by the host's route and the checks.
 */
export type Tally = { n: number };

/** the day a lamp belongs to, as 2026-11-27, in India's time */
export function dayKey(d: Date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** one more lamp; a missing or damaged tally starts again from one */
export function bump(t: Tally | null): Tally {
  const n = t && Number.isFinite(t.n) && t.n >= 0 ? Math.floor(t.n) : 0;
  return { n: n + 1 };
}
