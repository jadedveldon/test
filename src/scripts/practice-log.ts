/**
 * The visitor's own practice record, kept in this browser (localStorage "sk-events"): every chant, rite, fire,
 * lamp, finished practice, kept mantra and journal line is one event (src/me/core/events.ts), and what the pages
 * show (days, streaks, counts, kept mantras, the journal) is worked out from them. Nothing leaves the browser
 * unless the visitor makes an account (src/scripts/me.ts); then the same events are shared with their other
 * devices, with journal lines sealed by their own passphrase first. The rite, the guided practices, the mantra
 * pages, the mala, the fire and the diya all add to it through the functions here.
 *
 * Records kept before the log existed ("sk-practice-log", "sk-my-mantras", "sk-practice-done") become events
 * once, on first read, so nobody loses their history.
 */
import { dayKey } from './festivals';
import { track } from './track';
import { derive, fromLegacy, merge, newId, streaks, type DayRec, type Derived, type PracticeEvent } from '../me/core/events';

export type { DayRec };
export type JournalEntry = { id: string; at: string; text: string; kind: 'intention' | 'reflection'; locked?: boolean };
export type Log = { days: Record<string, DayRec>; journal: JournalEntry[]; mantras: Record<string, number> };
/** an event as kept on this device: `s` marks one the host already has */
export type LocalEvent = PracticeEvent & { s?: 1 };
type Store = { v: 1; device: string; events: LocalEvent[] };

const KEY = 'sk-events';
const OLD = { log: 'sk-practice-log', mine: 'sk-my-mantras', done: 'sk-practice-done' };
let memory: Store | null = null;
let cache: { raw: string; d: Derived } | null = null;

const parse = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

export function readStore(): Store {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage closed: memory only */ }
  if (raw) {
    try {
      const v = JSON.parse(raw);
      if (v && Array.isArray(v.events) && typeof v.device === 'string') return v as Store;
    } catch { /* unreadable: start again below, keeping nothing broken */ }
  }
  if (memory) return memory;
  // first visit with the log: a device id, and anything kept the old way becomes events
  const device = newId().split('-').pop()!.slice(0, 8);
  const events = fromLegacy(device, { log: parse(OLD.log), mine: parse(OLD.mine), done: parse(OLD.done) });
  const s: Store = { v: 1, device, events };
  if (writeStore(s, false)) { try { Object.values(OLD).forEach((k) => localStorage.removeItem(k)); } catch { /* fine */ } }
  return s;
}

/** saves the log; says whether it reached storage */
export function writeStore(s: Store, announce = true) {
  let ok = true;
  try { localStorage.setItem(KEY, JSON.stringify(s)); memory = null; } catch { memory = s; ok = false; }
  cache = null;
  if (announce) {
    document.dispatchEvent(new CustomEvent('sk:practice-log'));
    document.dispatchEvent(new CustomEvent('sk:my-mantras'));
  }
  return ok;
}

/** the record worked out from the log (worked out once per change) */
export function record(): Derived {
  const s = readStore();
  const raw = `${s.events.length}:${s.events[s.events.length - 1]?.id ?? ''}:${s.events.filter((e) => e.text !== undefined).length}`;
  if (cache?.raw === raw) return cache.d;
  const d = derive(s.events);
  cache = { raw, d };
  return d;
}

const GOALS: Partial<Record<PracticeEvent['t'], string>> = { session: 'practice-finish', japa: 'chant', rite: 'rite', fire: 'fire', diya: 'lamp', journal: 'journal', keep: 'keep-mantra', clear: 'record-cleared' };

function add(...es: Omit<PracticeEvent, 'id' | 'at'>[]) {
  const s = readStore();
  const at = new Date().toISOString();
  for (const e of es) s.events.push({ ...e, id: newId(s.device), at });
  writeStore(s);
  // counted too (what kind of step, and which practice or mantra; never a journal line)
  for (const e of es) { const g = GOALS[e.t]; if (g) track(g, e.slug); }
  // something new to share, if the visitor has an account (src/scripts/me-sync.ts)
  document.dispatchEvent(new CustomEvent('sk:events'));
}

/** events from elsewhere (another device, through the host) join the log */
export function absorb(incoming: PracticeEvent[], markSynced: string[] = []) {
  const s = readStore();
  const done = new Set(markSynced);
  const merged = merge(s.events, incoming.map((e) => ({ ...e, s: 1 as const }))) as LocalEvent[];
  for (const e of merged) if (done.has(e.id)) e.s = 1;
  const changed = merged.length !== s.events.length || markSynced.length > 0 || incoming.some((e) => e.text !== undefined);
  if (changed) writeStore({ ...s, events: merged }, merged.length !== s.events.length || incoming.some((e) => e.text !== undefined));
}

/** fills in journal lines once their seal is opened on this device */
export function fillJournal(opened: Record<string, string>) {
  const s = readStore();
  let n = 0;
  for (const e of s.events) if (e.t === 'journal' && e.text === undefined && opened[e.id] !== undefined) { e.text = opened[e.id]; n++; }
  if (n) writeStore(s);
}

/** a new account (or a fresh sign-in): every event here is offered to it, and the host keeps each once */
export function unmarkAll() {
  const s = readStore();
  writeStore({ ...s, events: s.events.map(({ s: _s, ...e }) => e) }, false);
}

/** the shared journal was let go: locked lines from elsewhere leave this device, and lines readable here wait for a new passphrase */
export function resetJournalSync() {
  const s = readStore();
  const events = s.events.filter((e) => !(e.t === 'journal' && e.text === undefined)).map((e) => {
    if (e.t !== 'journal') return e;
    const { s: _s, enc: _e, ...rest } = e;
    return rest;
  });
  writeStore({ ...s, events });
}

/* ---------------------------------------------------------------- what the pages use */

export function readLog(): Log {
  const d = record();
  return {
    days: d.days,
    mantras: d.mantras,
    journal: d.journal.map((j) => ({ id: j.id, at: j.at, kind: j.kind, text: j.text ?? '', locked: j.locked || undefined })),
  };
}

/** add to today's record (any of the practices calls this) */
export function logPractice(rec: DayRec) {
  const day = dayKey(new Date());
  const es = (Object.entries(rec) as [keyof DayRec, number][]).filter(([, n]) => n > 0).map(([t, n]) => ({ t, n, day }));
  if (es.length) add(...es);
}

/** a mantra chanted n times: counted for the day's japa and for that mantra */
export function logMantra(slug: string, n: number) {
  if (n > 0) add({ t: 'japa', n, slug, day: dayKey(new Date()) });
}

export function addJournal(text: string, kind: 'intention' | 'reflection') {
  const t = text.trim().slice(0, 500);
  if (t) add({ t: 'journal', text: t, kind });
}
export function deleteJournal(id: string) { add({ t: 'journal-del', ref: id }); }

/** "clear my record": days, counts, practices done and the journal (kept mantras stay) */
export function clearAll() { add({ t: 'clear' }); }

/** days practised, the run up to today (or yesterday), the longest run */
export function stats(l: Pick<Log, 'days'> = readLog()) { return streaks(l.days, dayKey(new Date())); }

export function myMantras(): string[] { return record().mine; }
export function toggleMine(slug: string): boolean {
  const has = myMantras().includes(slug);
  add({ t: has ? 'unkeep' : 'keep', slug });
  return !has;
}

export function sessionsDone(): Record<string, { n: number; last: string }> { return record().sessions; }
/** a guided practice completed: how often, and when last */
export function logSession(slug: string) { add({ t: 'session', slug }); }
