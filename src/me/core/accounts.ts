/**
 * Visitor accounts, the working part shared by the host (src/me/server) and the preview's demo (src/me/demo.ts).
 * An account is an email address and the visitor's practice events; nothing else is asked for. Signing in is by a
 * link sent to that address: it works once, for 15 minutes, and only a hash of it is kept. The host keeps:
 *
 *   me-<id>                 the account: email, when made, a sign-out generation, the events, the journal's salt
 *                           and sealed check word (never the passphrase, never a journal line in the open)
 *   me-email-<hash>         which account an address belongs to
 *   me-link-<hash>          a sign-in link not yet used
 *
 * Events are only ever added (in the order they arrive), so a device asks for "everything after number N" and
 * the exchange stays small. See docs/accounts.md.
 */
import words from '../../content/pages/me.json';
import { layout, fill } from '../../studio/core/emails';
import { publicBooking, publicInvoice } from '../../studio/core/ops';
import type { DB } from '../../studio/core/types';
import { clean, type PracticeEvent } from './events';

export const LINK_MINUTES = 15;
export const MAX_EVENTS = 50_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Kv {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  /** read, change and write back, again if someone else wrote in between; null from `fn` leaves it as it was */
  swap<T>(key: string, fn: (v: T | null) => T | null): Promise<T | null>;
}
export interface MeEnv {
  kv: Kv;
  now(): number;
  /** a random token, url-safe */
  token(): string;
  sha256(s: string): Promise<string>;
  /** the sign-in email; 'shown' when the demo shows the link on screen instead */
  send(to: string, mail: { subject: string; html: string; text: string }): Promise<'sent' | 'saved' | 'failed' | 'shown'>;
  /** the address the link in the email opens */
  linkUrl(token: string): string;
  siteUrl: string;
  /** the page address for /booking and /invoice ("booking.html" in the preview) */
  page(name: string): string;
  /** the Studio's records, to show a client their own sessions and invoices (null where there is no Studio) */
  studio(): Promise<DB | null>;
}

export class MeError extends Error { constructor(public status: number, message: string) { super(message); } }
const E = words.errors;

export interface Account {
  id: string;
  email: string;
  createdAt: string;
  /** raised by "sign out everywhere": every cookie made before it stops working */
  gen: number;
  /** raised when events are taken away (a journal let go): devices then read the whole log again */
  epoch?: number;
  events: PracticeEvent[];
  journal?: { salt: string; check: { iv: string; ct: string } };
}
type Link = { email: string; exp: number };

const normEmail = (e: unknown) => String(e ?? '').trim().toLowerCase().slice(0, 200);

/* ---------------------------------------------------------------- signing in */

export function signInEmail(env: MeEnv, to: string, token: string) {
  const w = words.email;
  const url = env.linkUrl(token);
  const { html, text } = layout(env.siteUrl, w.sign, [
    { p: w.hello },
    { button: w.button, href: url },
    { p: fill(w.expires, { minutes: String(LINK_MINUTES) }) },
    { small: w.notYou },
  ], w.footer);
  return { subject: w.subject, html, text, to };
}

/** "send me a link": always answers the same way, whether or not the address has an account */
export async function startSignIn(env: MeEnv, emailIn: unknown, consent: unknown) {
  const email = normEmail(emailIn);
  if (!EMAIL.test(email)) throw new MeError(400, E.email);
  if (consent !== true) throw new MeError(400, E.consent);
  const token = env.token();
  await env.kv.set(`me-link-${await env.sha256(token)}`, { email, exp: env.now() + LINK_MINUTES * 60_000 } satisfies Link);
  const m = signInEmail(env, email, token);
  const status = await env.send(email, m);
  if (status === 'failed' || status === 'saved') throw new MeError(503, status === 'saved' ? E.noEmail : E.send);
  // only the preview's demo and a developer's own computer show the link on screen; the live site only emails it
  return { status, link: status === 'shown' ? env.linkUrl(token) : undefined };
}

/** the link, tapped: once only, within its time; finds or makes the account */
export async function redeem(env: MeEnv, token: unknown) {
  const t = String(token ?? '');
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(t)) throw new MeError(400, E.link);
  const key = `me-link-${await env.sha256(t)}`;
  const link = await env.kv.get<Link>(key);
  await env.kv.del(key);
  if (!link || link.exp < env.now()) throw new MeError(410, E.link);
  const idKey = `me-email-${await env.sha256(link.email)}`;
  let id = await env.kv.get<string>(idKey);
  let created = false;
  if (!id || !(await env.kv.get<Account>(`me-${id}`))) {
    id = (await env.sha256(env.token())).slice(0, 24);
    const acc: Account = { id, email: link.email, createdAt: new Date(env.now()).toISOString(), gen: 1, events: [] };
    await env.kv.set(`me-${id}`, acc);
    await env.kv.set(idKey, id);
    created = true;
  }
  const acc = (await env.kv.get<Account>(`me-${id}`))!;
  return { id, gen: acc.gen, created };
}

/** the account behind a signed-in device, if its sign-in is still good */
export async function account(env: MeEnv, id: string, gen: number) {
  const acc = await env.kv.get<Account>(`me-${id}`);
  if (!acc || acc.gen !== gen) throw new MeError(401, E.signedOut);
  return acc;
}

/* ---------------------------------------------------------------- what My space shows */

/** a client's own sessions and invoices, when the account's address is a client's in the Studio */
export function clientView(db: DB | null, email: string, page: MeEnv['page']) {
  if (!db) return null;
  const cl = db.clients.find((c) => c.email.toLowerCase() === email && !c.archived);
  if (!cl) return null;
  const bookings = db.bookings
    .filter((b) => b.clientId === cl.id)
    .map((b) => ({ ...publicBooking(db, b.token)!, link: `${page('booking')}?t=${b.token}`, createdAt: b.createdAt }))
    .sort((a, b) => (b.start ?? b.options[0] ?? b.createdAt).localeCompare(a.start ?? a.options[0] ?? a.createdAt));
  const invoices = db.invoices
    .filter((i) => i.clientId === cl.id && i.status !== 'draft')
    .map((i) => {
      const p = publicInvoice(db, i.token)!;
      return { number: p.number, issueDate: p.issueDate, dueDate: p.dueDate, status: p.status, standing: p.standing, total: p.totals.total, due: p.totals.due, claimed: !!p.claim, link: `${page('invoice')}?t=${i.token}` };
    })
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  return { name: cl.name.split(/\s+/)[0] ?? '', bookings, invoices };
}

export async function state(env: MeEnv, acc: Account) {
  return {
    email: acc.email,
    createdAt: acc.createdAt,
    events: acc.events.length,
    journal: acc.journal ?? null,
    client: clientView(await env.studio(), acc.email, env.page),
  };
}

/* ---------------------------------------------------------------- keeping devices the same */

/**
 * A device's new events join the account; the device gets back every event after `since` it did not send.
 * Journal lines arrive sealed: any open text is dropped, and a line with no seal is refused (the device keeps it
 * until the visitor has set a journal passphrase).
 */
export async function sync(env: MeEnv, acc: Account, sent: unknown, since: unknown, epoch?: unknown) {
  const incoming = (Array.isArray(sent) ? sent : []).slice(0, 2000).map(clean).filter(Boolean) as PracticeEvent[];
  const ok = incoming
    .map(({ text: _t, ...e }) => e as PracticeEvent)
    .filter((e) => e.t !== 'journal' || (e.enc && acc.journal));
  const sentIds = new Set(ok.map((e) => e.id));
  let after: Account | null = acc;
  if (ok.length) {
    after = await env.kv.swap<Account>(`me-${acc.id}`, (cur) => {
      if (!cur || cur.gen !== acc.gen) return null;
      const have = new Set(cur.events.map((e) => e.id));
      const add = ok.filter((e) => !have.has(e.id));
      if (!add.length) return null;
      if (cur.events.length + add.length > MAX_EVENTS) throw new MeError(413, E.full);
      return { ...cur, events: [...cur.events, ...add] };
    }) ?? (await env.kv.get<Account>(`me-${acc.id}`));
    if (!after) throw new MeError(401, E.signedOut);
  }
  let from = Math.max(0, Math.floor(Number(since) || 0));
  if (from > after.events.length || Number(epoch ?? 0) !== (after.epoch ?? 0)) from = 0;
  const back = after.events.slice(from).filter((e) => !sentIds.has(e.id));
  return { accepted: ok.map((e) => e.id), events: back, cursor: after.events.length, epoch: after.epoch ?? 0, journal: after.journal ?? null };
}

/** the journal's salt and sealed check word, chosen on the first device that syncs a journal */
export async function setJournal(env: MeEnv, acc: Account, j: unknown) {
  const x = j as Account['journal'];
  if (!x || typeof x.salt !== 'string' || !x.check || typeof x.check.iv !== 'string' || typeof x.check.ct !== 'string' || x.salt.length > 64 || x.check.ct.length > 200) throw new MeError(400, E.generic);
  const after = await env.kv.swap<Account>(`me-${acc.id}`, (cur) => (cur && !cur.journal ? { ...cur, journal: { salt: x.salt, check: { iv: x.check.iv, ct: x.check.ct } } } : null));
  const now = after ?? (await env.kv.get<Account>(`me-${acc.id}`));
  // a passphrase already set on another device wins: this device must use that one
  return { journal: now?.journal ?? null };
}

/** "I have forgotten my journal passphrase": the sealed lines on the host are let go, and a new passphrase can be set */
export async function forgetJournal(env: MeEnv, acc: Account) {
  await env.kv.swap<Account>(`me-${acc.id}`, (cur) => (cur ? { ...cur, journal: undefined, epoch: (cur.epoch ?? 0) + 1, events: cur.events.filter((e) => e.t !== 'journal') } : null));
  return { ok: true };
}

/** everything kept for the account, to download */
export function exportData(acc: Account) {
  return { email: acc.email, createdAt: acc.createdAt, events: acc.events, journalSealed: !!acc.journal, note: words.account.exportNote };
}

export async function signOutEverywhere(env: MeEnv, acc: Account) {
  const after = await env.kv.swap<Account>(`me-${acc.id}`, (cur) => (cur ? { ...cur, gen: cur.gen + 1 } : null));
  return { gen: after?.gen ?? acc.gen + 1 };
}

/** the account and everything in it, gone; a client's record in the Studio is Sarvakali's and stays */
export async function deleteAccount(env: MeEnv, acc: Account) {
  await env.kv.del(`me-${acc.id}`);
  await env.kv.del(`me-email-${await env.sha256(acc.email)}`);
  return { ok: true };
}

/** the actions a signed-in device can ask for */
export async function act(env: MeEnv, acc: Account, action: string, p: Record<string, unknown>) {
  switch (action) {
    case 'state': return state(env, acc);
    case 'sync': return sync(env, acc, p.events, p.since, p.epoch);
    case 'journal.set': return setJournal(env, acc, p.journal);
    case 'journal.forget': return forgetJournal(env, acc);
    case 'export': return exportData(acc);
    case 'signoutAll': return signOutEverywhere(env, acc);
    case 'delete': return deleteAccount(env, acc);
    default: throw new MeError(404, 'Unknown action');
  }
}
