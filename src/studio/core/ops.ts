/**
 * Everything that can happen in the Studio, as rules on the database: a request arrives; Sarvakali confirms one
 * of its times, offers others or declines; the client accepts, suggests others or cancels; a session is held and
 * wrapped up; invoices are made, sent, paid or cancelled. Each rule changes the database and returns what must
 * happen outside it (emails, a calendar event), which the runner (runner.ts) carries out once the change is
 * saved. The same rules run on the host and in the preview's demo.
 */
import { addDays, dayIn, safeTz } from './time';
import { invoiceNumber, rupees, standing, totals } from './money';
import type { Booking, BookingStatus, Client, DB, HistoryEntry, Invoice, InvoiceLine, Note, PaymentMethod, Settings, Who } from './types';
import { OPEN_STATUSES } from './types';

export class StudioError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (m: string) => new StudioError(400, m);
const missing = (m = 'Not found') => new StudioError(404, m);

export type MailTpl =
  | 'clientReceived' | 'clientProposed' | 'clientConfirmed' | 'clientDeclined' | 'clientCancelled' | 'clientReminder'
  | 'clientInvoice' | 'clientInvoiceReminder' | 'clientReceipt'
  | 'ownerNewRequest' | 'ownerClientAccepted' | 'ownerClientSuggested' | 'ownerClientCancelled' | 'ownerClientPaid';

export type Effect =
  | { type: 'calendar'; action: 'upsert' | 'delete'; bookingId: string; eventId?: string }
  | { type: 'mail'; tpl: MailTpl; clientId: string; bookingId?: string; invoiceId?: string };

export interface OpCtx { now: number; id: () => string; token: () => string }

/** a fresh context: time-ordered ids and unguessable link tokens */
export function makeCtx(now = Date.now()): OpCtx {
  const rnd = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
  const b64url = (a: Uint8Array) => btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  let seq = 0;
  return {
    now,
    id: () => `${now.toString(36)}${(seq++).toString(36)}${Array.from(rnd(5), (b) => b.toString(36).padStart(2, '0')).join('')}`.slice(0, 20),
    token: () => b64url(rnd(24)),
  };
}

const iso = (c: OpCtx) => new Date(c.now).toISOString();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s: unknown, max = 2000) => (typeof s === 'string' ? s.replace(/\u0000/g, '').trim().slice(0, max) : '');
const cleanList = (v: unknown, max = 40) => (Array.isArray(v) ? v.map((x) => clean(x, 200)).filter(Boolean).slice(0, max) : []);

function log(db: DB, c: OpCtx, kind: string, text: string, refs: { clientId?: string; bookingId?: string; invoiceId?: string } = {}) {
  db.activity.unshift({ id: c.id(), at: iso(c), kind, text, ...refs });
  if (db.activity.length > 1500) db.activity.length = 1500;
}
function hist(b: { history: HistoryEntry[]; updatedAt: string }, c: OpCtx, by: Who, what: string) {
  b.history.push({ at: iso(c), by, what });
  b.updatedAt = iso(c);
}

export const clientById = (db: DB, id: string) => db.clients.find((x) => x.id === id);
export const bookingById = (db: DB, id: string) => db.bookings.find((x) => x.id === id);
export const invoiceById = (db: DB, id: string) => db.invoices.find((x) => x.id === id);
const needClient = (db: DB, id: string) => clientById(db, id) ?? (() => { throw missing('That client is not in the Studio.'); })();
const needBooking = (db: DB, id: string) => bookingById(db, id) ?? (() => { throw missing('That booking is not in the Studio.'); })();
const needInvoice = (db: DB, id: string) => invoiceById(db, id) ?? (() => { throw missing('That invoice is not in the Studio.'); })();

/** times offered: real instants, in the future (with a little grace), no repeats, at most three */
function cleanTimes(v: unknown, c: OpCtx, { required = 1, max = 3 } = {}) {
  const list = (Array.isArray(v) ? v : []).map((t) => (typeof t === 'string' ? Date.parse(t) : NaN)).filter((t) => Number.isFinite(t));
  const future = [...new Set(list.filter((t) => t > c.now - 5 * 60000))].sort((a, b) => a - b).slice(0, max);
  if (future.length < required) throw bad(list.length > future.length ? 'Please choose times that are still to come.' : 'Please choose at least one time.');
  return future.map((t) => new Date(t).toISOString());
}

/* ================================================================ a request arrives (public) */

export interface RequestInput {
  name: string; email: string; phone?: string; services?: string[]; topic?: string; times: string[]; tz?: string;
  /** a field people never see; robots fill it in */
  website?: string;
}

export function submitRequest(db: DB, input: RequestInput, c: OpCtx): { booking: Booking; client: Client; effects: Effect[] } {
  const name = clean(input.name, 120);
  const email = clean(input.email, 200).toLowerCase();
  if (!name) throw bad('Please give your name.');
  if (!EMAIL.test(email)) throw bad('Please give an email address that works.');
  const times = cleanTimes(input.times, c);
  const tz = safeTz(input.tz);
  const now = iso(c);
  let client = db.clients.find((x) => x.email.toLowerCase() === email);
  if (client) {
    client.name = name;
    if (input.phone) client.phone = clean(input.phone, 40);
    client.tz = tz;
    client.updatedAt = now;
    client.archived = false;
  } else {
    client = { id: c.id(), name, email, phone: clean(input.phone, 40) || undefined, tz, tags: [], createdAt: now, updatedAt: now };
    db.clients.push(client);
  }
  const booking: Booking = {
    id: c.id(), clientId: client.id, source: 'connect', services: cleanList(input.services), topic: clean(input.topic, 2000),
    status: 'requested', options: times, optionsBy: 'client', durationMin: db.settings.defaultDurationMin,
    token: c.token(), clientTz: tz, history: [{ at: now, by: 'client', what: 'Sent a request' }], createdAt: now, updatedAt: now,
  };
  db.bookings.push(booking);
  log(db, c, 'request', `${name} sent a request`, { clientId: client.id, bookingId: booking.id });
  const effects: Effect[] = [{ type: 'mail', tpl: 'clientReceived', clientId: client.id, bookingId: booking.id }];
  if (db.settings.notify.newRequest) effects.push({ type: 'mail', tpl: 'ownerNewRequest', clientId: client.id, bookingId: booking.id });
  return { booking, client, effects };
}

/* ================================================================ Sarvakali replies */

/** confirm a time: one the client offered, or one already agreed with them */
export function confirm(db: DB, a: { bookingId: string; start: string; message?: string; durationMin?: number }, c: OpCtx): Effect[] {
  const b = needBooking(db, a.bookingId);
  if (!OPEN_STATUSES.includes(b.status)) throw new StudioError(409, 'This booking is closed.');
  const [start] = cleanTimes([a.start], c);
  const moved = b.status === 'confirmed' && b.start && b.start !== start;
  b.previousStart = moved ? b.start : undefined;
  b.start = start;
  b.status = 'confirmed';
  b.options = [];
  if (a.durationMin) b.durationMin = Math.min(480, Math.max(15, Math.round(a.durationMin)));
  b.message = clean(a.message, 2000) || undefined;
  b.remindedAt = undefined;
  hist(b, c, 'owner', moved ? 'Moved the conversation to a new time' : 'Confirmed a time');
  const cl = needClient(db, b.clientId);
  log(db, c, 'confirmed', `Confirmed ${cl.name}`, { clientId: cl.id, bookingId: b.id });
  return [{ type: 'calendar', action: 'upsert', bookingId: b.id }, { type: 'mail', tpl: 'clientConfirmed', clientId: cl.id, bookingId: b.id }];
}

/** offer other times (a reply, or a new time for a confirmed conversation); the client chooses */
export function propose(db: DB, a: { bookingId: string; times: string[]; message?: string }, c: OpCtx): Effect[] {
  const b = needBooking(db, a.bookingId);
  if (!OPEN_STATUSES.includes(b.status)) throw new StudioError(409, 'This booking is closed.');
  const times = cleanTimes(a.times, c);
  if (b.status === 'confirmed') b.previousStart = b.start;
  b.status = 'proposed';
  b.options = times;
  b.optionsBy = 'owner';
  b.message = clean(a.message, 2000) || undefined;
  hist(b, c, 'owner', b.previousStart ? `Offered ${times.length} new time${times.length > 1 ? 's' : ''} (to move the conversation)` : `Offered ${times.length} time${times.length > 1 ? 's' : ''}`);
  const cl = needClient(db, b.clientId);
  log(db, c, 'proposed', `Offered times to ${cl.name}`, { clientId: cl.id, bookingId: b.id });
  return [{ type: 'mail', tpl: 'clientProposed', clientId: cl.id, bookingId: b.id }];
}

/** back to the agreed time, when a change was offered but is no longer needed */
export function keepTime(db: DB, a: { bookingId: string }, c: OpCtx): Effect[] {
  const b = needBooking(db, a.bookingId);
  if (b.status !== 'proposed' || !b.previousStart) throw new StudioError(409, 'There is no earlier time to keep.');
  b.status = 'confirmed';
  b.start = b.previousStart;
  b.previousStart = undefined;
  b.options = [];
  hist(b, c, 'owner', 'Kept the agreed time');
  return [{ type: 'mail', tpl: 'clientConfirmed', clientId: b.clientId, bookingId: b.id }];
}

export function decline(db: DB, a: { bookingId: string; message?: string }, c: OpCtx): Effect[] {
  const b = needBooking(db, a.bookingId);
  if (!['requested', 'proposed'].includes(b.status) || b.previousStart) throw new StudioError(409, 'Only a request still being arranged can be declined; cancel a confirmed conversation instead.');
  b.status = 'declined';
  b.options = [];
  b.reason = clean(a.message, 2000) || undefined;
  hist(b, c, 'owner', 'Declined the request');
  const cl = needClient(db, b.clientId);
  log(db, c, 'declined', `Declined ${cl.name}'s request`, { clientId: cl.id, bookingId: b.id });
  return [{ type: 'mail', tpl: 'clientDeclined', clientId: cl.id, bookingId: b.id }];
}

/** cancel (by Sarvakali); a request that only needs ignoring can be closed silently */
export function cancel(db: DB, a: { bookingId: string; message?: string; silent?: boolean }, c: OpCtx): Effect[] {
  const b = needBooking(db, a.bookingId);
  if (!OPEN_STATUSES.includes(b.status)) throw new StudioError(409, 'This booking is already closed.');
  const hadEvent = b.calendarEventId;
  if (b.previousStart && !b.start) b.start = b.previousStart;
  b.status = 'cancelled';
  b.cancelledBy = 'owner';
  b.options = [];
  b.reason = clean(a.message, 2000) || undefined;
  hist(b, c, 'owner', a.silent ? 'Closed without a message' : 'Cancelled');
  const cl = needClient(db, b.clientId);
  log(db, c, 'cancelled', `Cancelled ${cl.name}'s conversation`, { clientId: cl.id, bookingId: b.id });
  const fx: Effect[] = [];
  if (hadEvent) fx.push({ type: 'calendar', action: 'delete', bookingId: b.id, eventId: hadEvent });
  if (!a.silent) fx.push({ type: 'mail', tpl: 'clientCancelled', clientId: cl.id, bookingId: b.id });
  return fx;
}

/** after the time: it took place, or they did not come */
export function wrapUp(db: DB, a: { bookingId: string; outcome: 'completed' | 'no_show' }, c: OpCtx): Effect[] {
  const b = needBooking(db, a.bookingId);
  if (b.status !== 'confirmed' && !(b.status === 'completed' || b.status === 'no_show')) throw new StudioError(409, 'Only a confirmed conversation can be wrapped up.');
  b.status = a.outcome;
  hist(b, c, 'owner', a.outcome === 'completed' ? 'Marked as held' : 'Marked as missed');
  const cl = needClient(db, b.clientId);
  log(db, c, a.outcome, `${a.outcome === 'completed' ? 'Held' : 'Missed'}: conversation with ${cl.name}`, { clientId: cl.id, bookingId: b.id });
  return [];
}

/** the meeting link, set by hand (when Google is not connected, or to use another service) */
export function setMeetLink(db: DB, a: { bookingId: string; url: string; notify?: boolean }, c: OpCtx): Effect[] {
  const b = needBooking(db, a.bookingId);
  const url = clean(a.url, 500);
  if (url && !/^https:\/\/\S+$/.test(url)) throw bad('The link should start with https://');
  b.meetUrl = url || undefined;
  hist(b, c, 'owner', url ? 'Set the meeting link' : 'Removed the meeting link');
  return a.notify && b.status === 'confirmed' ? [{ type: 'mail', tpl: 'clientConfirmed', clientId: b.clientId, bookingId: b.id }] : [];
}

/** a new conversation, started from the Studio: offer times, or confirm one already agreed */
export function newBooking(db: DB, a: { clientId: string; times: string[]; services?: string[]; topic?: string; message?: string; confirmNow?: boolean; durationMin?: number }, c: OpCtx): { booking: Booking; effects: Effect[] } {
  const cl = needClient(db, a.clientId);
  const times = cleanTimes(a.times, c);
  const now = iso(c);
  const b: Booking = {
    id: c.id(), clientId: cl.id, source: 'studio', services: cleanList(a.services), topic: clean(a.topic, 2000),
    status: 'proposed', options: times, optionsBy: 'owner', message: clean(a.message, 2000) || undefined,
    durationMin: a.durationMin ? Math.min(480, Math.max(15, Math.round(a.durationMin))) : db.settings.defaultDurationMin,
    token: c.token(), clientTz: cl.tz || db.settings.ownerTz, history: [{ at: now, by: 'owner', what: 'Started from the Studio' }], createdAt: now, updatedAt: now,
  };
  db.bookings.push(b);
  if (a.confirmNow) return { booking: b, effects: confirm(db, { bookingId: b.id, start: times[0], message: a.message }, c) };
  hist(b, c, 'owner', `Offered ${times.length} time${times.length > 1 ? 's' : ''}`);
  log(db, c, 'proposed', `Offered times to ${cl.name}`, { clientId: cl.id, bookingId: b.id });
  return { booking: b, effects: [{ type: 'mail', tpl: 'clientProposed', clientId: cl.id, bookingId: b.id }] };
}

/* ================================================================ the client replies (public, by their link) */

export const bookingByToken = (db: DB, token: string) => (token && token.length >= 16 ? db.bookings.find((b) => b.token === token) : undefined);

export function clientAccept(db: DB, a: { token: string; start: string; note?: string }, c: OpCtx): Effect[] {
  const b = bookingByToken(db, a.token);
  if (!b) throw missing();
  if (b.status !== 'proposed') throw new StudioError(409, 'This booking is no longer waiting for a choice.');
  const start = b.options.find((o) => Date.parse(o) === Date.parse(a.start));
  if (!start) throw bad('Please choose one of the times offered.');
  if (Date.parse(start) < c.now) throw bad('That time has passed; please suggest another.');
  b.status = 'confirmed';
  b.start = start;
  b.previousStart = undefined;
  b.options = [];
  b.message = clean(a.note, 2000) || undefined;
  b.remindedAt = undefined;
  hist(b, c, 'client', 'Chose a time');
  const cl = needClient(db, b.clientId);
  log(db, c, 'accepted', `${cl.name} chose a time`, { clientId: cl.id, bookingId: b.id });
  const fx: Effect[] = [{ type: 'calendar', action: 'upsert', bookingId: b.id }, { type: 'mail', tpl: 'clientConfirmed', clientId: cl.id, bookingId: b.id }];
  if (db.settings.notify.clientReplies) fx.push({ type: 'mail', tpl: 'ownerClientAccepted', clientId: cl.id, bookingId: b.id });
  return fx;
}

/** none of the times suit (or a confirmed time needs to move): the client offers their own */
export function clientSuggest(db: DB, a: { token: string; times: string[]; note?: string; tz?: string }, c: OpCtx): Effect[] {
  const b = bookingByToken(db, a.token);
  if (!b) throw missing();
  if (!['proposed', 'confirmed', 'requested'].includes(b.status)) throw new StudioError(409, 'This booking is closed.');
  const times = cleanTimes(a.times, c);
  if (b.status === 'confirmed') b.previousStart = b.start;
  b.status = 'requested';
  b.options = times;
  b.optionsBy = 'client';
  b.message = clean(a.note, 2000) || undefined;
  if (a.tz) b.clientTz = safeTz(a.tz);
  hist(b, c, 'client', b.previousStart ? 'Asked to move the conversation' : 'Suggested other times');
  const cl = needClient(db, b.clientId);
  log(db, c, 'suggested', `${cl.name} suggested other times`, { clientId: cl.id, bookingId: b.id });
  return db.settings.notify.clientReplies ? [{ type: 'mail', tpl: 'ownerClientSuggested', clientId: cl.id, bookingId: b.id }] : [];
}

export function clientCancel(db: DB, a: { token: string; reason?: string }, c: OpCtx): Effect[] {
  const b = bookingByToken(db, a.token);
  if (!b) throw missing();
  if (!OPEN_STATUSES.includes(b.status)) throw new StudioError(409, 'This booking is already closed.');
  const hadEvent = b.calendarEventId;
  if (b.previousStart && !b.start) b.start = b.previousStart;
  b.status = 'cancelled';
  b.cancelledBy = 'client';
  b.options = [];
  b.reason = clean(a.reason, 2000) || undefined;
  hist(b, c, 'client', 'Cancelled');
  const cl = needClient(db, b.clientId);
  log(db, c, 'cancelled', `${cl.name} cancelled`, { clientId: cl.id, bookingId: b.id });
  const fx: Effect[] = [];
  if (hadEvent) fx.push({ type: 'calendar', action: 'delete', bookingId: b.id, eventId: hadEvent });
  fx.push({ type: 'mail', tpl: 'clientCancelled', clientId: cl.id, bookingId: b.id });
  fx.push({ type: 'mail', tpl: 'ownerClientCancelled', clientId: cl.id, bookingId: b.id });
  return fx;
}

/** what the client's booking page may show: nothing of other clients, nothing of Sarvakali's notes */
export function publicBooking(db: DB, token: string) {
  const b = bookingByToken(db, token);
  if (!b) return null;
  const cl = clientById(db, b.clientId);
  return {
    status: b.status, options: b.options, optionsBy: b.optionsBy, message: b.optionsBy === 'owner' ? b.message : undefined,
    start: b.start, previousStart: b.previousStart, durationMin: b.durationMin, meetUrl: b.status === 'confirmed' ? b.meetUrl : undefined,
    services: b.services, topic: b.topic, clientTz: b.clientTz, name: cl?.name.split(/\s+/)[0] ?? '',
    practiceName: db.settings.practiceName, meetingNote: db.settings.meetingNote, id: b.id,
    reason: b.status === 'declined' || (b.status === 'cancelled' && b.cancelledBy === 'owner') ? b.reason : undefined,
  };
}
export type PublicBooking = NonNullable<ReturnType<typeof publicBooking>>;

/* ================================================================ clients and notes */

export function addClient(db: DB, a: { name: string; email: string; phone?: string; tz?: string; tags?: string[]; pronouns?: string }, c: OpCtx): Client {
  const name = clean(a.name, 120);
  const email = clean(a.email, 200).toLowerCase();
  if (!name) throw bad('A name, please.');
  if (!EMAIL.test(email)) throw bad('An email address, please.');
  if (db.clients.some((x) => x.email.toLowerCase() === email)) throw new StudioError(409, 'A client with that email is already in the Studio.');
  const now = iso(c);
  const cl: Client = { id: c.id(), name, email, phone: clean(a.phone, 40) || undefined, tz: a.tz ? safeTz(a.tz) : db.settings.ownerTz, tags: cleanList(a.tags, 12), pronouns: clean(a.pronouns, 40) || undefined, createdAt: now, updatedAt: now };
  db.clients.push(cl);
  log(db, c, 'client', `Added ${name}`, { clientId: cl.id });
  return cl;
}

export function updateClient(db: DB, a: { clientId: string; name?: string; email?: string; phone?: string; tz?: string; tags?: string[]; pronouns?: string; archived?: boolean }, c: OpCtx) {
  const cl = needClient(db, a.clientId);
  if (a.name !== undefined) { const n = clean(a.name, 120); if (!n) throw bad('A name, please.'); cl.name = n; }
  if (a.email !== undefined) {
    const e = clean(a.email, 200).toLowerCase();
    if (!EMAIL.test(e)) throw bad('An email address, please.');
    if (db.clients.some((x) => x.id !== cl.id && x.email.toLowerCase() === e)) throw new StudioError(409, 'Another client has that email.');
    cl.email = e;
  }
  if (a.phone !== undefined) cl.phone = clean(a.phone, 40) || undefined;
  if (a.tz !== undefined) cl.tz = safeTz(a.tz);
  if (a.tags !== undefined) cl.tags = cleanList(a.tags, 12);
  if (a.pronouns !== undefined) cl.pronouns = clean(a.pronouns, 40) || undefined;
  if (a.archived !== undefined) cl.archived = !!a.archived;
  cl.updatedAt = iso(c);
  return cl;
}

/** forget a client entirely (their right to erasure): their bookings and notes go; invoices keep only what tax records need */
export function eraseClient(db: DB, a: { clientId: string }, c: OpCtx) {
  const cl = needClient(db, a.clientId);
  db.bookings = db.bookings.filter((b) => b.clientId !== cl.id);
  db.notes = db.notes.filter((n) => n.clientId !== cl.id);
  db.outbox = db.outbox.filter((m) => m.clientId !== cl.id);
  db.activity = db.activity.filter((x) => x.clientId !== cl.id);
  const keep = db.invoices.some((i) => i.clientId === cl.id && i.status !== 'draft');
  db.invoices = db.invoices.filter((i) => !(i.clientId === cl.id && i.status === 'draft'));
  if (keep) {
    Object.assign(cl, { name: `${cl.name.split(/\s+/)[0]} (erased)`, email: `erased-${cl.id}@invalid`, phone: undefined, tz: undefined, pronouns: undefined, tags: ['erased'], archived: true, updatedAt: iso(c) });
  } else {
    db.clients = db.clients.filter((x) => x.id !== cl.id);
  }
  log(db, c, 'erased', 'Erased a client’s details');
}

export function addNote(db: DB, a: { clientId: string; text: string; bookingId?: string; pinned?: boolean }, c: OpCtx): Note {
  needClient(db, a.clientId);
  const text = clean(a.text, 10000);
  if (!text) throw bad('The note is empty.');
  const n: Note = { id: c.id(), clientId: a.clientId, bookingId: a.bookingId, text, pinned: !!a.pinned, createdAt: iso(c) };
  db.notes.unshift(n);
  return n;
}
export function updateNote(db: DB, a: { noteId: string; text?: string; pinned?: boolean }, c: OpCtx) {
  const n = db.notes.find((x) => x.id === a.noteId);
  if (!n) throw missing();
  if (a.text !== undefined) { const t = clean(a.text, 10000); if (!t) throw bad('The note is empty.'); n.text = t; }
  if (a.pinned !== undefined) n.pinned = !!a.pinned;
  n.updatedAt = iso(c);
  return n;
}
export function deleteNote(db: DB, a: { noteId: string }) {
  const i = db.notes.findIndex((x) => x.id === a.noteId);
  if (i < 0) throw missing();
  db.notes.splice(i, 1);
}

/* ================================================================ invoices */

export interface InvoiceInput {
  clientId?: string; bookingIds?: string[]; issueDate?: string; dueDate?: string | null; lines?: InvoiceLine[];
  discount?: number; taxRate?: number; taxLabel?: string; note?: string; theme?: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
function cleanLines(v: unknown): InvoiceLine[] {
  const list = Array.isArray(v) ? v : [];
  return list.slice(0, 60).map((l) => ({
    description: clean(l?.description, 300),
    qty: Math.max(0, Math.min(9999, Number(l?.qty) || 0)),
    rate: Math.max(0, Math.min(10_000_000, Math.round((Number(l?.rate) || 0) * 100) / 100)),
  })).filter((l) => l.description || l.rate);
}

function applyInvoice(inv: Invoice, a: InvoiceInput, s: Settings) {
  if (a.issueDate !== undefined) { if (!DAY.test(a.issueDate)) throw bad('The issue date is not a date.'); inv.issueDate = a.issueDate; }
  if (a.dueDate !== undefined) { if (a.dueDate && !DAY.test(a.dueDate)) throw bad('The due date is not a date.'); inv.dueDate = a.dueDate || undefined; }
  if (a.lines !== undefined) inv.lines = cleanLines(a.lines);
  if (a.discount !== undefined) inv.discount = Math.max(0, Number(a.discount) || 0);
  if (a.taxRate !== undefined) inv.taxRate = Math.max(0, Math.min(50, Number(a.taxRate) || 0));
  if (a.taxLabel !== undefined) inv.taxLabel = clean(a.taxLabel, 40) || undefined;
  if (a.note !== undefined) inv.note = clean(a.note, 2000) || undefined;
  if (a.theme !== undefined) inv.theme = clean(a.theme, 20) || 'kali';
  if (a.bookingIds !== undefined) inv.bookingIds = cleanList(a.bookingIds, 20);
  void s;
}

/** a new draft, for a client (lines can start from the services of their sessions) */
export function createInvoice(db: DB, a: InvoiceInput & { clientId: string }, c: OpCtx): Invoice {
  const cl = needClient(db, a.clientId);
  const s = db.settings;
  const today = dayIn(s.ownerTz, c.now);
  const now = iso(c);
  const inv: Invoice = {
    id: c.id(), number: '', clientId: cl.id, bookingIds: [], issueDate: today, dueDate: addDays(today, s.paymentTermsDays),
    lines: [], discount: 0, taxRate: 0, theme: 'kali', status: 'draft', payments: [], token: c.token(),
    history: [{ at: now, by: 'owner', what: 'Created' }], createdAt: now, updatedAt: now,
  };
  applyInvoice(inv, a, s);
  if (!inv.lines.length) {
    const fromBookings = inv.bookingIds.map((id) => bookingById(db, id)).filter(Boolean) as Booking[];
    const names = [...new Set(fromBookings.flatMap((b) => b.services))];
    inv.lines = names.length ? names.map((n) => ({ description: n, qty: 1, rate: 0 })) : [{ description: 'Session with Sarvakali', qty: 1, rate: 0 }];
  }
  inv.number = invoiceNumber(s, inv.issueDate);
  s.nextInvoiceSeq += 1;
  db.invoices.push(inv);
  log(db, c, 'invoice', `Drafted invoice ${inv.number} for ${cl.name}`, { clientId: cl.id, invoiceId: inv.id });
  return inv;
}

export function updateInvoice(db: DB, a: InvoiceInput & { invoiceId: string }, c: OpCtx): Invoice {
  const inv = needInvoice(db, a.invoiceId);
  if (inv.status === 'void') throw new StudioError(409, 'A cancelled invoice cannot be changed; make a new one.');
  if (inv.status === 'paid' && (a.lines || a.discount !== undefined || a.taxRate !== undefined)) throw new StudioError(409, 'A paid invoice’s amounts cannot change; reopen it first.');
  applyInvoice(inv, a, db.settings);
  hist(inv, c, 'owner', inv.status === 'draft' ? 'Edited' : 'Edited after sending');
  return inv;
}

/** send (or send again): the client gets an email with their invoice link */
export function sendInvoice(db: DB, a: { invoiceId: string }, c: OpCtx): Effect[] {
  const inv = needInvoice(db, a.invoiceId);
  if (inv.status === 'void') throw new StudioError(409, 'This invoice is cancelled.');
  const t = totals(inv);
  if (t.total <= 0) throw bad('The invoice has nothing to pay yet: add an amount.');
  if (!db.settings.upiId) throw bad('Add your UPI ID in Settings first, so the client can pay.');
  const again = inv.status !== 'draft';
  if (inv.status === 'draft') inv.status = 'sent';
  inv.sentAt = iso(c);
  hist(inv, c, 'owner', again ? 'Sent again' : 'Sent');
  log(db, c, 'invoice', `${again ? 'Resent' : 'Sent'} invoice ${inv.number}`, { clientId: inv.clientId, invoiceId: inv.id });
  return [{ type: 'mail', tpl: 'clientInvoice', clientId: inv.clientId, invoiceId: inv.id }];
}

export function remindInvoice(db: DB, a: { invoiceId: string }, c: OpCtx): Effect[] {
  const inv = needInvoice(db, a.invoiceId);
  const st = standing(inv, dayIn(db.settings.ownerTz, c.now));
  if (!['unpaid', 'part-paid', 'overdue'].includes(st)) throw new StudioError(409, 'Only an unpaid invoice needs a reminder.');
  hist(inv, c, 'owner', 'Sent a reminder');
  return [{ type: 'mail', tpl: 'clientInvoiceReminder', clientId: inv.clientId, invoiceId: inv.id }];
}

export function recordPayment(db: DB, a: { invoiceId: string; amount?: number; date?: string; method?: PaymentMethod; reference?: string; full?: boolean; receipt?: boolean }, c: OpCtx): Effect[] {
  const inv = needInvoice(db, a.invoiceId);
  if (inv.status === 'void' || inv.status === 'draft') throw new StudioError(409, inv.status === 'draft' ? 'Send the invoice before recording a payment, or mark it paid from its page.' : 'This invoice is cancelled.');
  const t = totals(inv);
  const amount = a.full ? t.due : Math.round((Number(a.amount) || 0) * 100) / 100;
  if (amount <= 0) throw bad('The amount should be more than nothing.');
  const date = a.date && DAY.test(a.date) ? a.date : dayIn(db.settings.ownerTz, c.now);
  const method: PaymentMethod = (['upi', 'cash', 'bank', 'other'] as const).includes(a.method as PaymentMethod) ? (a.method as PaymentMethod) : 'upi';
  inv.payments.push({ id: c.id(), amount, date, method, reference: clean(a.reference, 80) || inv.claim?.reference || undefined, at: iso(c) });
  const after = totals(inv);
  const nowPaid = after.due <= 0;
  if (nowPaid) { inv.status = 'paid'; inv.paidAt = iso(c); inv.claim = undefined; }
  hist(inv, c, 'owner', nowPaid ? `Received ${rupees(amount)}; paid in full` : `Received ${rupees(amount)}`);
  const cl = needClient(db, inv.clientId);
  log(db, c, 'payment', `Payment for ${inv.number} from ${cl.name}`, { clientId: cl.id, invoiceId: inv.id });
  return nowPaid && a.receipt !== false ? [{ type: 'mail', tpl: 'clientReceipt', clientId: cl.id, invoiceId: inv.id }] : [];
}

export function deletePayment(db: DB, a: { invoiceId: string; paymentId: string }, c: OpCtx) {
  const inv = needInvoice(db, a.invoiceId);
  const i = inv.payments.findIndex((p) => p.id === a.paymentId);
  if (i < 0) throw missing();
  inv.payments.splice(i, 1);
  if (inv.status === 'paid' && totals(inv).due > 0) { inv.status = 'sent'; inv.paidAt = undefined; }
  hist(inv, c, 'owner', 'Removed a payment');
}

export function voidInvoice(db: DB, a: { invoiceId: string; reason?: string }, c: OpCtx) {
  const inv = needInvoice(db, a.invoiceId);
  if (inv.status === 'void') return;
  inv.status = 'void';
  inv.voidedAt = iso(c);
  hist(inv, c, 'owner', `Cancelled${a.reason ? `: ${clean(a.reason, 300)}` : ''}`);
  log(db, c, 'invoice', `Cancelled invoice ${inv.number}`, { clientId: inv.clientId, invoiceId: inv.id });
}

/** undo a mistake: a cancelled or paid invoice goes back to being open */
export function reopenInvoice(db: DB, a: { invoiceId: string }, c: OpCtx) {
  const inv = needInvoice(db, a.invoiceId);
  if (inv.status !== 'void' && inv.status !== 'paid') throw new StudioError(409, 'This invoice is already open.');
  inv.status = inv.sentAt ? 'sent' : 'draft';
  inv.voidedAt = undefined;
  inv.paidAt = undefined;
  hist(inv, c, 'owner', 'Reopened');
}

export function deleteDraft(db: DB, a: { invoiceId: string }) {
  const inv = needInvoice(db, a.invoiceId);
  if (inv.status !== 'draft') throw new StudioError(409, 'Only a draft can be deleted; cancel a sent invoice instead, so its number stays accounted for.');
  db.invoices = db.invoices.filter((x) => x.id !== inv.id);
}

export function duplicateInvoice(db: DB, a: { invoiceId: string }, c: OpCtx) {
  const src = needInvoice(db, a.invoiceId);
  return createInvoice(db, { clientId: src.clientId, lines: src.lines, discount: src.discount, taxRate: src.taxRate, taxLabel: src.taxLabel, note: src.note, theme: src.theme }, c);
}

export const invoiceByToken = (db: DB, token: string) => (token && token.length >= 16 ? db.invoices.find((i) => i.token === token && i.status !== 'draft') : undefined);

export function clientClaimPaid(db: DB, a: { token: string; reference?: string; note?: string }, c: OpCtx): Effect[] {
  const inv = invoiceByToken(db, a.token);
  if (!inv) throw missing();
  if (inv.status !== 'sent') throw new StudioError(409, inv.status === 'paid' ? 'This invoice is already paid.' : 'This invoice is closed.');
  inv.claim = { at: iso(c), reference: clean(a.reference, 80) || undefined, note: clean(a.note, 500) || undefined };
  hist(inv, c, 'client', 'Said they have paid');
  const cl = needClient(db, inv.clientId);
  log(db, c, 'claim', `${cl.name} says ${inv.number} is paid`, { clientId: cl.id, invoiceId: inv.id });
  return db.settings.notify.payments ? [{ type: 'mail', tpl: 'ownerClientPaid', clientId: cl.id, invoiceId: inv.id }] : [];
}

/** what the client's invoice page shows */
export function publicInvoice(db: DB, token: string) {
  const inv = invoiceByToken(db, token);
  if (!inv) return null;
  const cl = clientById(db, inv.clientId);
  const s = db.settings;
  return {
    number: inv.number, issueDate: inv.issueDate, dueDate: inv.dueDate, lines: inv.lines, discount: inv.discount, taxRate: inv.taxRate, taxLabel: inv.taxLabel,
    note: inv.note, theme: inv.theme, status: inv.status, standing: standing(inv, dayIn(s.ownerTz, Date.now())), totals: totals(inv), paidAt: inv.paidAt,
    claim: inv.claim ? { at: inv.claim.at } : undefined,
    client: { name: cl?.name ?? '', email: cl?.email ?? '' },
    from: { name: s.practiceName, upiId: s.upiId, upiName: s.upiName, address: s.address, gstin: s.gstin, email: s.ownerEmail, phone: s.phone },
  };
}
export type PublicInvoice = NonNullable<ReturnType<typeof publicInvoice>>;

/* ================================================================ settings and reminders */

export function updateSettings(db: DB, a: Partial<Settings>, c: OpCtx) {
  const s = db.settings;
  const str = (k: keyof Settings, max = 200) => { if (a[k] !== undefined) (s as unknown as Record<string, unknown>)[k] = clean(a[k], max); };
  (['practiceName', 'ownerName', 'upiName', 'phone', 'gstin', 'invoicePrefix'] as const).forEach((k) => str(k, 120));
  str('address', 400); str('meetingNote', 1200); str('signature', 400);
  if (a.ownerEmail !== undefined) { const e = clean(a.ownerEmail, 200); if (e && !EMAIL.test(e)) throw bad('That email address does not look right.'); s.ownerEmail = e; }
  if (a.upiId !== undefined) { const u = clean(a.upiId, 120); s.upiId = u; }
  if (a.ownerTz !== undefined) s.ownerTz = safeTz(a.ownerTz);
  if (a.nextInvoiceSeq !== undefined) s.nextInvoiceSeq = Math.max(1, Math.round(Number(a.nextInvoiceSeq) || 1));
  if (a.paymentTermsDays !== undefined) s.paymentTermsDays = Math.max(0, Math.min(120, Math.round(Number(a.paymentTermsDays) || 0)));
  if (a.defaultDurationMin !== undefined) s.defaultDurationMin = Math.max(15, Math.min(480, Math.round(Number(a.defaultDurationMin) || 60)));
  if (a.notify) s.notify = { ...s.notify, ...a.notify };
  if (a.reminders) s.reminders = { enabled: !!a.reminders.enabled, hoursBefore: Math.max(1, Math.min(72, Math.round(Number(a.reminders.hoursBefore) || 24))) };
  if (a.googleInvites !== undefined) s.googleInvites = !!a.googleInvites;
  log(db, c, 'settings', 'Changed settings');
  return s;
}

/** sessions starting soon that have not had their reminder */
export function dueReminders(db: DB, c: OpCtx): Effect[] {
  const s = db.settings;
  if (!s.reminders.enabled) return [];
  const horizon = c.now + s.reminders.hoursBefore * 3600_000;
  const fx: Effect[] = [];
  for (const b of db.bookings) {
    if (b.status !== 'confirmed' || !b.start || b.remindedAt) continue;
    const t = Date.parse(b.start);
    // only ahead of time, and only if it was confirmed more than two hours before (a same-day booking needs no reminder)
    if (t <= c.now || t > horizon) continue;
    const confirmedAt = [...b.history].reverse().find((h) => /Confirmed|Chose a time|Kept|Moved/.test(h.what))?.at;
    if (confirmedAt && t - Date.parse(confirmedAt) < 2 * 3600_000) { b.remindedAt = iso(c); continue; }
    b.remindedAt = iso(c);
    fx.push({ type: 'mail', tpl: 'clientReminder', clientId: b.clientId, bookingId: b.id });
  }
  return fx;
}

/* ================================================================ the label for each state, for every screen */

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Waiting for your reply', proposed: 'Waiting for the client', confirmed: 'Confirmed', completed: 'Held',
  no_show: 'Missed', declined: 'Declined', cancelled: 'Cancelled',
};
