/**
 * Keeping a signed-in visitor's devices the same. Only runs once someone has signed in on this device (the
 * "sk-me" note in this browser). It sends the practice events the host does not have yet and takes back the
 * ones it lacks: when a page opens, a few seconds after something new is practised, when the tab comes back into
 * view and when the connection returns. Journal lines are sealed with the visitor's own key before they go; a
 * line waits on this device until a journal passphrase is set. Offline, everything simply waits.
 */
import { MeCallError, meCall, ACCOUNTS } from '../me/client';
import { importKey, open, seal } from '../me/core/crypto';
import type { PracticeEvent } from '../me/core/events';
import { absorb, fillJournal, readStore, resetJournalSync } from './practice-log';

export type Sealed = { iv: string; ct: string };
export type MeLocal = {
  email: string;
  /** how far into the host's log this device has read, and in which epoch */
  cursor: number;
  epoch: number;
  journal: { salt: string; check: Sealed } | null;
  /** the journal key on this device (so the passphrase is asked once per device) */
  key?: string;
  last?: string;
};
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

const KEY = 'sk-me';
let memory: MeLocal | null = null;

export function meLocal(): MeLocal | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v.email === 'string' ? v : null; } catch { return memory; }
}
export function setMeLocal(v: MeLocal | null) {
  try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { memory = v; }
  document.dispatchEvent(new CustomEvent('sk:me'));
}

export const status: { now: SyncStatus; waiting: number; error?: string } = { now: 'idle', waiting: 0 };
const tell = (now: SyncStatus, error?: string) => { status.now = now; status.error = error; document.dispatchEvent(new CustomEvent('sk:me-status')); };

/** signed out on the host (another device chose "sign out everywhere", or the account was deleted) */
function signedOutHere(message: string) {
  setMeLocal(null);
  tell('idle', message);
}

let busy = false;
let again = false;
let timer = 0;

/** journal lines sealed elsewhere, opened with this device's key */
async function openLocked(key: CryptoKey) {
  const opened: Record<string, string> = {};
  for (const e of readStore().events) {
    if (e.t === 'journal' && e.text === undefined && e.enc) {
      const t = await open(key, e.enc);
      if (t !== null) opened[e.id] = t;
    }
  }
  fillJournal(opened);
}

export async function syncNow(): Promise<void> {
  const me = meLocal();
  if (!me || !ACCOUNTS) return;
  if (busy) { again = true; return; }
  busy = true;
  tell('syncing');
  let more = false;
  try {
    const key = me.key && me.journal ? await importKey(me.key).catch(() => null) : null;
    const out: PracticeEvent[] = [];
    let waiting = 0;
    for (const e of readStore().events) {
      if (e.s) continue;
      const { s: _s, text, ...rest } = e;
      if (e.t === 'journal') {
        if (!key) { waiting++; continue; }
        out.push({ ...rest, enc: e.enc ?? (await seal(key, text ?? '')) });
      } else out.push(rest);
      if (out.length >= 1000) { more = true; break; }
    }
    status.waiting = waiting;
    const r = await meCall<{ accepted: string[]; events: PracticeEvent[]; cursor: number; epoch: number; journal: MeLocal['journal'] }>('sync', { events: out, since: me.cursor, epoch: me.epoch });
    absorb(r.events, r.accepted);
    const cur = meLocal();
    if (!cur) return;
    const next: MeLocal = { ...cur, cursor: r.cursor, epoch: r.epoch, journal: r.journal, last: new Date().toISOString() };
    // the journal was let go on another device: lines readable here wait for a new passphrase
    if (cur.journal && !r.journal) { resetJournalSync(); delete next.key; }
    // set on another device with another passphrase: this device's key is not the one
    if (cur.journal && r.journal && cur.journal.salt !== r.journal.salt) delete next.key;
    setMeLocal(next);
    if (key && next.key) await openLocked(key);
    if (r.events.length || r.accepted.length) document.dispatchEvent(new CustomEvent('sk:practice-log'));
    tell('synced');
  } catch (e) {
    if (e instanceof MeCallError && e.signedOut) signedOutHere(e.message);
    else tell('offline', e instanceof Error ? e.message : undefined);
  } finally {
    busy = false;
    if (again || more) { again = false; soon(400); }
  }
}

export function soon(ms = 2500) {
  clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), ms);
}

let started = false;
/** started from app.ts on every page; does nothing until someone signs in on this device */
export function startSync() {
  if (started || !ACCOUNTS) return;
  started = true;
  document.addEventListener('sk:events', () => { if (meLocal()) soon(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && meLocal()) soon(300); });
  addEventListener('online', () => { if (meLocal()) soon(300); });
  addEventListener('pagehide', () => { if (meLocal() && readStore().events.some((e) => !e.s && e.t !== 'journal')) void syncNow(); });
  if (meLocal()) soon(600);
}
