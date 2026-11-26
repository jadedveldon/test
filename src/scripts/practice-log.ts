/**
 * The visitor's own practice record, kept only in this browser (localStorage "sk-practice-log"): which days they
 * practised and what (the rite, japa, the fire, the diya, minutes), how often they chanted each mantra, and their
 * journal. Nothing is sent anywhere. The daily practice page, the mantra pages, the mala, the fire and the diya all
 * add to it. Their kept mantras ("my mantras") are a separate list, "sk-my-mantras".
 */
import { dayKey } from './festivals';

export type DayRec = { rite?: number; japa?: number; fire?: number; diya?: number; minutes?: number };
export type Log = { days: Record<string, DayRec>; journal: { at: string; text: string; kind: 'intention' | 'reflection' }[]; mantras: Record<string, number> };
const KEY = 'sk-practice-log';
let memory: Log | null = null;

export function readLog(): Log {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object' && v.days) return { days: v.days, journal: Array.isArray(v.journal) ? v.journal : [], mantras: v.mantras && typeof v.mantras === 'object' ? v.mantras : {} };
  } catch { if (memory) return memory; }
  return memory ?? { days: {}, journal: [], mantras: {} };
}
export function writeLog(l: Log) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { memory = l; }
  document.dispatchEvent(new CustomEvent('sk:practice-log'));
}
/** add to today's record (any of the practices calls this) */
export function logPractice(add: DayRec) {
  const l = readLog();
  const k = dayKey(new Date());
  const d = (l.days[k] ??= {});
  for (const [key, v] of Object.entries(add) as [keyof DayRec, number][]) d[key] = (d[key] ?? 0) + v;
  writeLog(l);
}
export function addJournal(text: string, kind: 'intention' | 'reflection') {
  const t = text.trim().slice(0, 500);
  if (!t) return;
  const l = readLog();
  l.journal.unshift({ at: new Date().toISOString(), text: t, kind });
  l.journal = l.journal.slice(0, 365);
  writeLog(l);
}

/** days practised, the run up to today (or yesterday), the longest run */
export function stats(l = readLog()) {
  const keys = Object.keys(l.days).filter((k) => Object.values(l.days[k]).some((v) => (v ?? 0) > 0)).sort();
  const set = new Set(keys);
  const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
  let streak = 0;
  const start = set.has(day(0)) ? 0 : 1;
  for (let i = start; set.has(day(i)); i++) streak++;
  let longest = 0, run = 0, prev: Date | null = null;
  for (const k of keys) {
    const [y, m, dd] = k.split('-').map(Number);
    const d = new Date(y, m - 1, dd);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 864e5) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const japa = Object.values(l.days).reduce((a, d) => a + (d.japa ?? 0), 0);
  return { days: keys.length, streak, longest, japa, today: set.has(day(0)) };
}


/** a mantra chanted n times: counted for the day's japa and for that mantra */
export function logMantra(slug: string, n: number) {
  if (!n) return;
  logPractice({ japa: n });
  const l = readLog();
  l.mantras[slug] = (l.mantras[slug] ?? 0) + n;
  writeLog(l);
}

/* ---------------------------------------------------------------- my mantras */

const MINE = 'sk-my-mantras';
let mineMemory: string[] = [];
export function myMantras(): string[] {
  try { const v = JSON.parse(localStorage.getItem(MINE) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return mineMemory; }
}
export function toggleMine(slug: string): boolean {
  const list = myMantras();
  const has = list.includes(slug);
  const next = has ? list.filter((x) => x !== slug) : [slug, ...list].slice(0, 60);
  try { localStorage.setItem(MINE, JSON.stringify(next)); } catch { mineMemory = next; }
  document.dispatchEvent(new CustomEvent('sk:my-mantras'));
  return !has;
}
