/**
 * The visitor's practice as a log of events. Every action is one event with its own id, never changed once made:
 * a chant, a finished practice, the lamp, the fire, keeping or unkeeping a mantra, a journal line or its deletion.
 * What the visitor sees (days practised, streaks, counts, kept mantras, the journal) is always worked out from the
 * log (`derive`). Two copies of the log, on two devices or on a device and the host, become one by taking every
 * event from both (`merge`, a union by id): nothing is counted twice, nothing is lost, and it does not matter which
 * syncs first. Used by the browser (src/scripts/practice-log.ts) and the host (src/me/server) alike.
 */

export type EventType =
  | 'rite' | 'japa' | 'fire' | 'diya' | 'minutes' // counts for a day (japa may name its mantra)
  | 'mcount' // a mantra's count with no day (from records kept before the log existed)
  | 'session' // a guided practice finished
  | 'keep' | 'unkeep' // a mantra kept in "my mantras", or let go
  | 'journal' | 'journal-del' // a journal line, or its removal
  | 'clear'; // "clear my record": everything before it (but kept mantras) no longer counts

export interface PracticeEvent {
  id: string;
  /** when it happened (ISO) */
  at: string;
  /** the visitor's own day it belongs to (YYYY-MM-DD, on their calendar) */
  day?: string;
  t: EventType;
  n?: number;
  /** a mantra or practice */
  slug?: string;
  /** a journal line, on this device only; what travels is `enc` */
  text?: string;
  kind?: 'intention' | 'reflection';
  /** a journal line sealed with the visitor's own key (base64 iv and ciphertext) */
  enc?: { iv: string; ct: string };
  /** for journal-del: the line removed */
  ref?: string;
}

export type DayRec = { rite?: number; japa?: number; fire?: number; diya?: number; minutes?: number };
export type JournalLine = { id: string; at: string; text?: string; locked?: boolean; kind: 'intention' | 'reflection' };
export interface Derived {
  days: Record<string, DayRec>;
  /** times each mantra was chanted */
  mantras: Record<string, number>;
  /** guided practices finished: how often, and when last */
  sessions: Record<string, { n: number; last: string }>;
  /** kept mantras, the most recently kept first */
  mine: string[];
  /** newest first */
  journal: JournalLine[];
}

const DAY_COUNTS = new Set(['rite', 'japa', 'fire', 'diya', 'minutes']);
const TYPES = new Set<EventType>(['rite', 'japa', 'fire', 'diya', 'minutes', 'mcount', 'session', 'keep', 'unkeep', 'journal', 'journal-del', 'clear']);

/** an id that will not collide across devices */
export function newId(device = '') {
  const r = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(36).padStart(2, '0')).join('') : Math.random().toString(36).slice(2, 14);
  return `${Date.now().toString(36)}-${device ? `${device}-` : ''}${r}`;
}

/** only well-formed events are kept (whatever arrives from a device or the host) */
export function clean(e: unknown): PracticeEvent | null {
  if (!e || typeof e !== 'object') return null;
  const x = e as Record<string, unknown>;
  if (typeof x.id !== 'string' || x.id.length > 80 || typeof x.at !== 'string' || !TYPES.has(x.t as EventType)) return null;
  const out: PracticeEvent = { id: x.id, at: x.at.slice(0, 40), t: x.t as EventType };
  if (typeof x.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.day)) out.day = x.day;
  if (typeof x.n === 'number' && Number.isFinite(x.n)) out.n = Math.max(0, Math.min(100000, Math.round(x.n)));
  if (typeof x.slug === 'string') out.slug = x.slug.slice(0, 120);
  if (typeof x.text === 'string') out.text = x.text.slice(0, 2000);
  if (x.kind === 'intention' || x.kind === 'reflection') out.kind = x.kind;
  if (x.enc && typeof x.enc === 'object' && typeof (x.enc as Record<string, unknown>).iv === 'string' && typeof (x.enc as Record<string, unknown>).ct === 'string') {
    out.enc = { iv: String((x.enc as Record<string, string>).iv).slice(0, 64), ct: String((x.enc as Record<string, string>).ct).slice(0, 8000) };
  }
  if (typeof x.ref === 'string') out.ref = x.ref.slice(0, 80);
  return out;
}

const order = (a: PracticeEvent, b: PracticeEvent) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** every event from both, each once, in time order; where both have the same event, the one with more (text, a seal) is kept */
export function merge(a: PracticeEvent[], b: PracticeEvent[]): PracticeEvent[] {
  const byId = new Map<string, PracticeEvent>();
  for (const e of [...a, ...b]) {
    const had = byId.get(e.id);
    byId.set(e.id, had ? { ...e, ...had, text: had.text ?? e.text, enc: had.enc ?? e.enc } : e);
  }
  return [...byId.values()].sort(order);
}

/** the record, worked out from the log */
export function derive(events: PracticeEvent[]): Derived {
  const days: Record<string, DayRec> = {};
  const mantras: Record<string, number> = {};
  const sessions: Record<string, { n: number; last: string }> = {};
  const kept = new Map<string, string>();
  const lines = new Map<string, JournalLine>();
  const removed = new Set<string>();
  const cleared = events.reduce((m, e) => (e.t === 'clear' && e.at > m ? e.at : m), '');
  for (const e of [...events].sort(order)) {
    if (cleared && e.at <= cleared && e.t !== 'keep' && e.t !== 'unkeep') continue;
    if (DAY_COUNTS.has(e.t) && e.day) {
      const d = (days[e.day] ??= {});
      const k = e.t as keyof DayRec;
      d[k] = (d[k] ?? 0) + (e.n ?? 1);
    }
    if ((e.t === 'japa' || e.t === 'mcount') && e.slug) mantras[e.slug] = (mantras[e.slug] ?? 0) + (e.n ?? 0);
    if (e.t === 'session' && e.slug) {
      const s = (sessions[e.slug] ??= { n: 0, last: e.at });
      s.n += e.n ?? 1;
      if (e.at > s.last) s.last = e.at;
    }
    if (e.t === 'keep' && e.slug) kept.set(e.slug, e.at);
    if (e.t === 'unkeep' && e.slug) kept.delete(e.slug);
    if (e.t === 'journal') lines.set(e.id, { id: e.id, at: e.at, kind: e.kind ?? 'reflection', text: e.text, locked: e.text === undefined });
    if (e.t === 'journal-del' && e.ref) removed.add(e.ref);
  }
  const mine = [...kept.entries()].sort((x, y) => (x[1] < y[1] ? 1 : -1)).map(([s]) => s);
  const journal = [...lines.values()].filter((l) => !removed.has(l.id)).sort((x, y) => (x.at < y.at ? 1 : -1));
  return { days, mantras, sessions, mine, journal };
}

/** days practised, the run up to today (or yesterday), the longest run, mantras counted */
export function streaks(days: Record<string, DayRec>, today: string) {
  const keys = Object.keys(days).filter((k) => Object.values(days[k]).some((v) => (v ?? 0) > 0)).sort();
  const set = new Set(keys);
  const back = (k: string, n: number) => { const [y, m, d] = k.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d - n)); return x.toISOString().slice(0, 10); };
  let streak = 0;
  const start = set.has(today) ? 0 : 1;
  for (let i = start; set.has(back(today, i)); i++) streak++;
  let longest = 0, run = 0, prev = '';
  for (const k of keys) { run = prev && back(k, 1) === prev ? run + 1 : 1; longest = Math.max(longest, run); prev = k; }
  const japa = Object.values(days).reduce((a, d) => a + (d.japa ?? 0), 0);
  return { days: keys.length, streak, longest, japa, today: set.has(today) };
}

/** the records kept before the log existed, as events (ids carry the device, so two devices' histories both stay) */
export function fromLegacy(device: string, old: {
  log?: { days?: Record<string, DayRec>; journal?: { at: string; text: string; kind?: string }[]; mantras?: Record<string, number> } | null;
  mine?: string[] | null;
  done?: Record<string, { n: number; last: string }> | null;
}): PracticeEvent[] {
  const out: PracticeEvent[] = [];
  const at0 = (day: string) => `${day}T12:00:00.000Z`;
  for (const [day, rec] of Object.entries(old.log?.days ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    for (const [k, n] of Object.entries(rec ?? {})) if (DAY_COUNTS.has(k) && typeof n === 'number' && n > 0) out.push({ id: `L-${device}-${day}-${k}`, at: at0(day), day, t: k as EventType, n });
  }
  for (const [slug, n] of Object.entries(old.log?.mantras ?? {})) if (typeof n === 'number' && n > 0) out.push({ id: `L-${device}-m-${slug}`, at: '2000-01-01T00:00:00.000Z', t: 'mcount', slug, n });
  (old.log?.journal ?? []).forEach((j, i) => { if (j?.text) out.push({ id: `L-${device}-j-${i}`, at: j.at, t: 'journal', text: j.text, kind: j.kind === 'intention' ? 'intention' : 'reflection' }); });
  (old.mine ?? []).slice().reverse().forEach((slug, i) => out.push({ id: `L-${device}-k-${slug}`, at: new Date(Date.UTC(2000, 0, 1, 0, 0, i)).toISOString(), t: 'keep', slug }));
  for (const [slug, r] of Object.entries(old.done ?? {})) if (r?.n) out.push({ id: `L-${device}-s-${slug}`, at: r.last, t: 'session', slug, n: r.n });
  return out.sort(order);
}
