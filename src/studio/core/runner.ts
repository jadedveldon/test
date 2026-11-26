/**
 * Carries out a rule (ops.ts): reads the database, applies the change, saves it (trying again if something else
 * saved in between), and only then does what the change asked of the world outside: the calendar event with its
 * Meet link first, then the emails, each recorded in the outbox. Where the database lives, how mail goes and
 * whether Google is connected are passed in, so the same runner serves the host, a developer's computer and the
 * preview's demo.
 */
import * as E from './emails';
import type { Rendered } from './emails';
import { makeCtx, type Effect, type MailTpl, type OpCtx } from './ops';
import type { Booking, Client, DB, Invoice, Mail, Settings } from './types';
import { normalise } from './types';

export interface Store {
  load(): Promise<{ db: DB; tag: string | null }>;
  /** false when someone else saved since `tag` was read */
  save(db: DB, tag: string | null): Promise<boolean>;
}

export interface Mailer {
  /** "resend", "outbox only", "demo" */
  name: string;
  send(m: Rendered): Promise<{ status: 'sent' | 'saved' | 'failed'; error?: string }>;
}

export interface Calendar {
  name: string;
  available(): Promise<boolean>;
  upsert(b: Booking, c: Client, s: Settings, site: string): Promise<{ eventId?: string; meetUrl?: string }>;
  remove(eventId: string, s: Settings): Promise<void>;
}

export interface Env { store: Store; mailer: Mailer; calendar: Calendar; siteUrl: string; ext?: string; now?: () => number }

export async function read(env: Env): Promise<DB> {
  return normalise((await env.store.load()).db);
}

/** apply a change, saving it once nobody else has saved in between */
export async function transact<T>(env: Env, fn: (db: DB, c: OpCtx) => T): Promise<{ result: T; db: DB }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { db: raw, tag } = await env.store.load();
    const db = normalise(raw);
    const c = makeCtx(env.now ? env.now() : Date.now());
    const result = fn(db, c);
    if (await env.store.save(db, tag)) return { result, db };
    lastErr = new Error('busy');
    await new Promise((r) => setTimeout(r, 40 + attempt * 60 + Math.random() * 60));
  }
  throw lastErr;
}

const TEMPLATES: Record<MailTpl, (x: E.Ctx, c: Client, b?: Booking, i?: Invoice) => Rendered | null> = {
  clientReceived: (x, c, b) => E.clientReceived(x, c, b!),
  clientProposed: (x, c, b) => E.clientProposed(x, c, b!),
  clientConfirmed: (x, c, b) => E.clientConfirmed(x, c, b!),
  clientDeclined: (x, c, b) => E.clientDeclined(x, c, b!),
  clientCancelled: (x, c, b) => E.clientCancelled(x, c, b!),
  clientReminder: (x, c, b) => E.clientReminder(x, c, b!),
  clientInvoice: (x, c, _b, i) => E.clientInvoice(x, c, i!),
  clientInvoiceReminder: (x, c, _b, i) => E.clientInvoice(x, c, i!, true),
  clientReceipt: (x, c, _b, i) => E.clientReceipt(x, c, i!),
  ownerNewRequest: (x, c, b) => E.ownerNewRequest(x, c, b!),
  ownerClientAccepted: (x, c, b) => E.ownerClientAccepted(x, c, b!),
  ownerClientSuggested: (x, c, b) => E.ownerClientSuggested(x, c, b!),
  ownerClientCancelled: (x, c, b) => E.ownerClientCancelled(x, c, b!),
  ownerClientPaid: (x, c, _b, i) => E.ownerClientPaid(x, c, i!),
};

/** what happened outside the database, for the screen that asked */
export interface Outcome { mails: { kind: string; to: string; status: Mail['status']; error?: string }[]; calendar?: { ok: boolean; meetUrl?: string; error?: string } }

export async function runEffects(env: Env, effects: Effect[]): Promise<Outcome> {
  const out: Outcome = { mails: [] };
  for (const fx of effects) {
    if (fx.type === 'calendar') {
      try {
        if (!(await env.calendar.available())) continue;
        const db = await read(env);
        if (fx.action === 'delete') {
          if (fx.eventId) await env.calendar.remove(fx.eventId, db.settings);
          await transact(env, (d) => { const b = d.bookings.find((x) => x.id === fx.bookingId); if (b) b.calendarEventId = undefined; });
          continue;
        }
        const b = db.bookings.find((x) => x.id === fx.bookingId);
        const c = b && db.clients.find((x) => x.id === b.clientId);
        if (!b || !c || b.status !== 'confirmed') continue;
        const r = await env.calendar.upsert(b, c, db.settings, env.siteUrl);
        await transact(env, (d) => {
          const bb = d.bookings.find((x) => x.id === fx.bookingId);
          if (!bb) return;
          if (r.eventId) bb.calendarEventId = r.eventId;
          if (r.meetUrl && !bb.meetUrl) bb.meetUrl = r.meetUrl;
        });
        out.calendar = { ok: true, meetUrl: r.meetUrl };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        out.calendar = { ok: false, error: msg };
        await transact(env, (d, c) => { d.activity.unshift({ id: c.id(), at: new Date(c.now).toISOString(), kind: 'problem', text: `Google Calendar could not be reached: ${msg.slice(0, 160)}`, bookingId: fx.bookingId }); });
      }
      continue;
    }
    // an email, written from the database as it is now (so it carries the Meet link made a moment ago)
    const db = await read(env);
    const c = db.clients.find((x) => x.id === fx.clientId);
    if (!c) continue;
    const b = fx.bookingId ? db.bookings.find((x) => x.id === fx.bookingId) : undefined;
    const i = fx.invoiceId ? db.invoices.find((x) => x.id === fx.invoiceId) : undefined;
    const r = TEMPLATES[fx.tpl]({ db, siteUrl: env.siteUrl, ext: env.ext }, c, b, i);
    if (!r) continue;
    let res: Awaited<ReturnType<Mailer['send']>>;
    try { res = await env.mailer.send(r); } catch (e) { res = { status: 'failed', error: e instanceof Error ? e.message : String(e) }; }
    out.mails.push({ kind: r.kind, to: r.to, status: res.status, error: res.error });
    await transact(env, (d, ctx) => {
      d.outbox.unshift({ id: ctx.id(), at: new Date(ctx.now).toISOString(), kind: r.kind, to: r.to, subject: r.subject, text: r.text, html: r.html, ics: r.ics, status: res.status, provider: env.mailer.name, error: res.error, clientId: c.id, bookingId: b?.id, invoiceId: i?.id });
      if (d.outbox.length > 400) d.outbox.length = 400;
      if (res.status === 'failed') d.activity.unshift({ id: ctx.id(), at: new Date(ctx.now).toISOString(), kind: 'problem', text: `An email to ${r.to} could not be sent: ${(res.error || '').slice(0, 160)}`, clientId: c.id });
    });
  }
  return out;
}

/** a rule, saved, then carried out: what the Studio's screens and the public pages call */
export async function perform<T>(env: Env, fn: (db: DB, c: OpCtx) => { result?: T; effects?: Effect[] } | Effect[] | void): Promise<{ result: T | undefined; outcome: Outcome; db: DB }> {
  let effects: Effect[] = [];
  const { result } = await transact(env, (db, c) => {
    const r = fn(db, c);
    if (Array.isArray(r)) { effects = r; return undefined; }
    if (r && typeof r === 'object') { effects = r.effects ?? []; return r.result; }
    effects = [];
    return undefined;
  });
  const outcome = effects.length ? await runEffects(env, effects) : { mails: [] };
  return { result, outcome, db: await read(env) };
}
