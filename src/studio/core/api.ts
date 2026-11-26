/**
 * The Studio's requests, by name: what the dashboard may ask (behind the sign-in) and what the public pages may
 * ask (a new request from Connect; a client's own booking and invoice, by their link). The host answers them over
 * HTTP (src/studio/server); the preview's demo answers them in the browser. Both use this one list, so the two
 * cannot drift apart.
 */
import * as O from './ops';
import { perform, read, runEffects, transact, type Env } from './runner';
import type { DB } from './types';

/** the database as the dashboard sees it: email bodies are fetched one at a time */
export function slim(db: DB) {
  return { ...db, outbox: db.outbox.map(({ html: _h, ics: _i, ...m }) => m) };
}
export type StudioState = ReturnType<typeof slim>;

type Payload = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const OWNER: Record<string, (env: Env, p: Payload) => Promise<unknown>> = {
  state: async (env) => slim(await read(env)),
  mail: async (env, p) => (await read(env)).outbox.find((m) => m.id === p.id) ?? null,

  confirm: (env, p) => perform(env, (db, c) => O.confirm(db, p as never, c)),
  propose: (env, p) => perform(env, (db, c) => O.propose(db, p as never, c)),
  keepTime: (env, p) => perform(env, (db, c) => O.keepTime(db, p as never, c)),
  decline: (env, p) => perform(env, (db, c) => O.decline(db, p as never, c)),
  cancel: (env, p) => perform(env, (db, c) => O.cancel(db, p as never, c)),
  wrapUp: (env, p) => perform(env, (db, c) => O.wrapUp(db, p as never, c)),
  setMeetLink: (env, p) => perform(env, (db, c) => O.setMeetLink(db, p as never, c)),
  newBooking: (env, p) => perform(env, (db, c) => { const r = O.newBooking(db, p as never, c); return { result: r.booking, effects: r.effects }; }),
  /** make the Meet link again (after Google was connected, or if it failed the first time) */
  makeMeet: async (env, p) => ({ outcome: await runEffects(env, [{ type: 'calendar', action: 'upsert', bookingId: p.bookingId }]), db: await read(env) }),

  addClient: (env, p) => perform(env, (db, c) => ({ result: O.addClient(db, p as never, c) })),
  updateClient: (env, p) => perform(env, (db, c) => ({ result: O.updateClient(db, p as never, c) })),
  eraseClient: (env, p) => perform(env, (db, c) => { O.eraseClient(db, p as never, c); }),
  exportClient: async (env, p) => {
    const db = await read(env);
    const id = p.clientId;
    return {
      client: db.clients.find((x) => x.id === id), bookings: db.bookings.filter((b) => b.clientId === id), notes: db.notes.filter((n) => n.clientId === id),
      invoices: db.invoices.filter((i) => i.clientId === id), emails: db.outbox.filter((m) => m.clientId === id).map(({ html: _h, ...m }) => m),
    };
  },

  addNote: (env, p) => perform(env, (db, c) => ({ result: O.addNote(db, p as never, c) })),
  updateNote: (env, p) => perform(env, (db, c) => ({ result: O.updateNote(db, p as never, c) })),
  deleteNote: (env, p) => perform(env, (db) => { O.deleteNote(db, p as never); }),

  createInvoice: (env, p) => perform(env, (db, c) => ({ result: O.createInvoice(db, p as never, c) })),
  updateInvoice: (env, p) => perform(env, (db, c) => ({ result: O.updateInvoice(db, p as never, c) })),
  sendInvoice: (env, p) => perform(env, (db, c) => O.sendInvoice(db, p as never, c)),
  remindInvoice: (env, p) => perform(env, (db, c) => O.remindInvoice(db, p as never, c)),
  recordPayment: (env, p) => perform(env, (db, c) => O.recordPayment(db, p as never, c)),
  deletePayment: (env, p) => perform(env, (db, c) => { O.deletePayment(db, p as never, c); }),
  voidInvoice: (env, p) => perform(env, (db, c) => { O.voidInvoice(db, p as never, c); }),
  reopenInvoice: (env, p) => perform(env, (db, c) => { O.reopenInvoice(db, p as never, c); }),
  deleteDraft: (env, p) => perform(env, (db) => { O.deleteDraft(db, p as never); }),
  duplicateInvoice: (env, p) => perform(env, (db, c) => ({ result: O.duplicateInvoice(db, p as never, c) })),

  updateSettings: (env, p) => perform(env, (db, c) => ({ result: O.updateSettings(db, p as never, c) })),
  runReminders: (env) => perform(env, (db, c) => O.dueReminders(db, c)),
  /** send a stored email again (one that failed, or was only saved before email was set up) */
  resendMail: async (env, p) => {
    const db = await read(env);
    const m = db.outbox.find((x) => x.id === p.id);
    if (!m) throw new O.StudioError(404, 'That email is not in the outbox.');
    const res = await env.mailer.send({ kind: m.kind, to: m.to, subject: m.subject, text: m.text, html: m.html, ics: m.ics });
    await transact(env, (d) => { const x = d.outbox.find((y) => y.id === m.id); if (x) { x.status = res.status; x.error = res.error; x.provider = env.mailer.name; } });
    return { outcome: { mails: [{ kind: m.kind, to: m.to, status: res.status, error: res.error }] }, db: await read(env) };
  },
};

const PUBLIC: Record<string, (env: Env, p: Payload) => Promise<unknown>> = {
  request: async (env, p) => {
    const r = await perform(env, (db, c) => {
      if (typeof p.website === 'string' && p.website.trim()) throw new O.StudioError(400, 'Please try again.');
      const { booking, effects } = O.submitRequest(db, p as never, c);
      return { result: booking.token, effects };
    });
    return { token: r.result };
  },
  'booking.get': async (env, p) => O.publicBooking(await read(env), String(p.token || '')) ?? notFound(),
  'booking.accept': async (env, p) => { await perform(env, (db, c) => O.clientAccept(db, p as never, c)); return O.publicBooking(await read(env), String(p.token)); },
  'booking.suggest': async (env, p) => { await perform(env, (db, c) => O.clientSuggest(db, p as never, c)); return O.publicBooking(await read(env), String(p.token)); },
  'booking.cancel': async (env, p) => { await perform(env, (db, c) => O.clientCancel(db, p as never, c)); return O.publicBooking(await read(env), String(p.token)); },
  'invoice.get': async (env, p) => O.publicInvoice(await read(env), String(p.token || '')) ?? notFound(),
  'invoice.claim': async (env, p) => { await perform(env, (db, c) => O.clientClaimPaid(db, p as never, c)); return O.publicInvoice(await read(env), String(p.token)); },
};

const notFound = () => { throw new O.StudioError(404, 'Not found'); };

export const OWNER_ACTIONS = Object.keys(OWNER);
export const PUBLIC_ACTIONS = Object.keys(PUBLIC);

export async function owner(env: Env, action: string, payload: Payload = {}) {
  const f = OWNER[action];
  if (!f) throw new O.StudioError(404, 'Unknown action');
  const r = await f(env, payload);
  // every change returns the new state, slimmed, so the screen can redraw at once
  if (r && typeof r === 'object' && 'db' in (r as object)) {
    const { db, ...rest } = r as { db: DB };
    return { ...rest, state: slim(db) };
  }
  return r;
}

export async function publicCall(env: Env, action: string, payload: Payload = {}) {
  const f = PUBLIC[action];
  if (!f) throw new O.StudioError(404, 'Unknown action');
  return f(env, payload);
}
