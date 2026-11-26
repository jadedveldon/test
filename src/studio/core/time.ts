/**
 * Times across time zones. A client picks times in their own zone (their browser says which); Sarvakali works in
 * hers (Settings.ownerTz, India by default). Everything is stored in UTC and shown in whichever zone is reading.
 */
import type { Day, ISO } from './types';

/** a zone the browser and the server both understand, or India's */
export function safeTz(tz?: string | null): string {
  if (!tz) return 'Asia/Kolkata';
  try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return tz; } catch { return 'Asia/Kolkata'; }
}

/** what the clock on the wall says at this moment in this zone, as numbers */
function wall(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: n('year'), m: n('month'), d: n('day'), h: n('hour') % 24, mi: n('minute'), s: n('second') };
}

/** minutes the zone is ahead of UTC at this moment */
export function offsetMinutes(ms: number, tz: string) {
  const w = wall(ms, tz);
  return Math.round((Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - Math.floor(ms / 1000) * 1000) / 60000);
}

/** "2026-12-03T18:30" on the wall in `tz` → the UTC moment (a time that does not exist, in a spring-forward gap, moves on) */
export function zonedToUtc(local: string, tz: string): ISO | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(local.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ms = guess - offsetMinutes(guess, tz) * 60000;
  ms = guess - offsetMinutes(ms, tz) * 60000; // once more, for a change of offset in between
  return new Date(ms).toISOString();
}

/** the UTC moment → "2026-12-03T18:30" on the wall in `tz` (for a datetime-local field) */
export function utcToLocalInput(iso: ISO, tz: string) {
  const w = wall(Date.parse(iso), tz);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${w.y}-${p(w.m)}-${p(w.d)}T${p(w.h)}:${p(w.mi)}`;
}

/** today's date in a zone, as YYYY-MM-DD */
export function dayIn(tz: string, ms = Date.now()): Day {
  const w = wall(ms, tz);
  return `${w.y}-${String(w.m).padStart(2, '0')}-${String(w.d).padStart(2, '0')}`;
}

export function addDays(day: Day, n: number): Day {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** "Thu 3 Dec, 6:30 pm" in the zone */
export function when(iso: ISO, tz: string, opts: { year?: boolean; weekday?: boolean } = {}) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { timeZone: tz, weekday: opts.weekday === false ? undefined : 'short', day: 'numeric', month: 'short', year: opts.year ? 'numeric' : undefined });
  const time = d.toLocaleTimeString('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])\.?m\.?/i, ' $1m').toLowerCase();
  return `${date}, ${time}`;
}

/** the zone's short name at that moment, e.g. "IST" or "GMT+1" */
export function zoneName(iso: ISO, tz: string) {
  // each region names its own zones best: IST in India, BST in Britain, EST in America, AEDT in Australia
  const loc = /^Asia\/(Kolkata|Calcutta)$/.test(tz) ? 'en-IN' : tz.startsWith('America/') ? 'en-US' : tz.startsWith('Australia/') ? 'en-AU' : 'en-GB';
  const part = new Intl.DateTimeFormat(loc, { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(iso)).find((p) => p.type === 'timeZoneName');
  return part?.value ?? tz;
}

/** a zone as people know it: "IST · Kolkata" (browsers still call it Calcutta) */
export const zoneLabel = (tz: string, iso = new Date().toISOString()) => `${zoneName(iso, tz)} · ${(tz.split('/').pop() || tz).replace(/_/g, ' ').replace('Calcutta', 'Kolkata')}`;

/** "Thu 3 Dec, 6:30 pm IST" */
export const whenZ = (iso: ISO, tz: string, opts: { year?: boolean } = {}) => `${when(iso, tz, opts)} ${zoneName(iso, tz)}`;

/** a time shown in the reader's zone, and in a second zone when it differs ("… IST (1:00 pm GMT)") */
export function whenBoth(iso: ISO, mine: string, theirs?: string) {
  const a = whenZ(iso, mine);
  if (!theirs || theirs === mine || offsetMinutes(Date.parse(iso), theirs) === offsetMinutes(Date.parse(iso), mine)) return a;
  return `${a} (${whenZ(iso, theirs)})`;
}

/** "a date" for an invoice: "3 December 2026" */
export function longDay(day: Day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "in 3 days", "tomorrow", "2 hours ago" */
export function relative(iso: ISO, now = Date.now()) {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  const fmt = (n: number, unit: string) => {
    const v = Math.round(n);
    const s = `${v} ${unit}${v === 1 ? '' : 's'}`;
    return diff >= 0 ? `in ${s}` : `${s} ago`;
  };
  if (abs < 60_000) return diff >= 0 ? 'in a moment' : 'just now';
  if (abs < 3_600_000) return fmt(abs / 60_000, 'minute');
  if (abs < 86_400_000) return fmt(abs / 3_600_000, 'hour');
  if (abs < 86_400_000 * 2 && diff > 0) return 'tomorrow';
  if (abs < 86_400_000 * 2 && diff < 0) return 'yesterday';
  if (abs < 86_400_000 * 30) return fmt(abs / 86_400_000, 'day');
  return fmt(abs / (86_400_000 * 30.4), 'month');
}
