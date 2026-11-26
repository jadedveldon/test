/**
 * The Studio's demo, for the preview: the same rules (src/studio/core) answering in the browser, the database
 * kept in this browser's storage. Nothing is sent anywhere: emails are kept in the outbox, and the meeting link is
 * a stand-in. It starts with a few made-up people (no real names, example.com addresses), made by running the
 * real rules with the clock set back, so everything in it is exactly what the live site would hold.
 */
import { owner, publicCall } from '../core/api';
import type { Calendar, Env, Mailer, Store } from '../core/runner';
import { emptyDB, type DB } from '../core/types';
import { zonedToUtc } from '../core/time';
import { pillars } from '../../data/site';

const KEY = 'sk-studio-demo';
let memory: string | null = null;

const store: Store = {
  async load() {
    let raw: string | null = null;
    try { raw = localStorage.getItem(KEY); } catch { raw = memory; }
    if (!raw) return { db: emptyDB(), tag: null };
    const { v, db } = JSON.parse(raw) as { v: number; db: DB };
    return { db, tag: String(v) };
  },
  async save(db, tag) {
    let raw: string | null = null;
    try { raw = localStorage.getItem(KEY); } catch { raw = memory; }
    const now = raw ? String((JSON.parse(raw) as { v: number }).v) : null;
    if (now !== tag) return false;
    const next = JSON.stringify({ v: (Number(tag) || 0) + 1, db });
    try { localStorage.setItem(KEY, next); } catch { memory = next; }
    window.dispatchEvent(new CustomEvent('sk-studio-demo'));
    return true;
  },
};

const mailer: Mailer = { name: 'demo (nothing is sent)', send: async () => ({ status: 'saved' }) };
/** in the demo the "Meet link" opens a new, empty Google Meet: on the live site Google makes a real one for each conversation */
const calendar: Calendar = {
  name: 'demo', available: async () => true,
  upsert: async (b) => ({ eventId: `demo-${b.id}`, meetUrl: 'https://meet.google.com/new' }),
  remove: async () => {},
};

function siteUrl() {
  return location.href.split(/[?#]/)[0].replace(/\/[^/]*$/, '');
}
const ext = () => (/\.html$/.test(location.pathname) ? '.html' : '');

let clock: number | null = null;
const env = (): Env => ({ store, mailer, calendar, siteUrl: siteUrl(), ext: ext(), now: () => clock ?? Date.now() });

/* ---------------------------------------------------------------- the starting set */

/** service names come from the catalogue itself, so the demo never names one that is not there */
/** n services from a pillar's catalogue, those whose names fit the made-up person's words first (any, if a rename in
 *  the editor leaves none that fit) */
function services(slug: string, n: number, like?: RegExp) {
  const p = pillars.find((x) => x.slug === slug);
  const all = p?.categories.flatMap((c) => c.subs.flatMap((s) => s.items)) ?? [];
  const fit = like ? all.filter((x) => like.test(x)) : [];
  return [...fit, ...all.filter((x) => !fit.includes(x))].slice(0, n);
}

async function seed() {
  const day = 86400_000, hour = 3600_000;
  const at = (ms: number) => { clock = ms; };
  const now = Date.now();
  // a time on the wall in a zone, some days from a moment
  const slot = (base: number, days: number, hm: string, tz = 'Asia/Kolkata') => {
    const d = new Date(base + days * day);
    const local = `${d.toISOString().slice(0, 10)}T${hm}`;
    return zonedToUtc(local, tz)!;
  };
  const E = env();
  const O = (a: string, p?: Record<string, unknown>) => owner(E, a, p);
  const P = (a: string, p?: Record<string, unknown>) => publicCall(E, a, p);
  const find = async (email: string) => {
    const db = (await store.load()).db;
    const c = db.clients.find((x) => x.email === email)!;
    return { c, b: db.bookings.filter((x) => x.clientId === c.id).at(-1)! };
  };

  at(now - 40 * day);
  await O('updateSettings', { ownerEmail: 'you@example.com', upiId: 'sarvakali@upi', upiName: 'Sarvakali', address: 'Kolkata, India', paymentTermsDays: 7 });

  // Dev: a returning client from London; a session held a month ago, paid
  at(now - 34 * day);
  await P('request', { name: 'Dev Malhotra', email: 'dev.malhotra@example.com', phone: '+44 7700 900123', services: services('healing', 2, /^(Anxiety-Related Tapping|Rest & Recovery Intention Spell)$/), topic: 'Sleep has been hard since the move.', times: [slot(now - 34 * day, 3, '19:00', 'Europe/London'), slot(now - 34 * day, 4, '10:00', 'Europe/London')], tz: 'Europe/London' });
  let { c: dev, b: devB } = await find('dev.malhotra@example.com');
  at(now - 33 * day); await O('confirm', { bookingId: devB.id, start: devB.options[0] });
  at(now - 30 * day); await O('wrapUp', { bookingId: devB.id, outcome: 'completed' });
  await O('addNote', { clientId: dev.id, text: 'Calm, thoughtful. Works nights; prefers evenings UK time. Wants to come back monthly.', pinned: true });
  let inv = (await O('createInvoice', { clientId: dev.id, bookingIds: [devB.id] })) as { result: { id: string; lines: { description: string }[] } };
  await O('updateInvoice', { invoiceId: inv.result.id, lines: inv.result.lines.map((l, i) => ({ description: l.description, qty: 1, rate: i ? 1200 : 1800 })) });
  await O('sendInvoice', { invoiceId: inv.result.id });
  at(now - 28 * day); await O('recordPayment', { invoiceId: inv.result.id, full: true, reference: '402917735561' });

  // Asha: a session ten days ago; invoice sent, and she says she has paid
  at(now - 16 * day);
  await P('request', { name: 'Asha Rao', email: 'asha.rao@example.com', services: services('divination', 1, /^Career & Financial Reading$/), topic: 'A big decision about work this year.', times: [slot(now - 16 * day, 5, '18:30'), slot(now - 16 * day, 6, '11:00'), slot(now - 16 * day, 7, '17:00')], tz: 'Asia/Kolkata' });
  let { c: asha, b: ashaB } = await find('asha.rao@example.com');
  at(now - 15 * day); await O('confirm', { bookingId: ashaB.id, start: ashaB.options[1] });
  at(now - 9 * day); await O('wrapUp', { bookingId: ashaB.id, outcome: 'completed' });
  await O('addNote', { clientId: asha.id, text: 'Reading: the Tower, then the Star. Talked about leaving the job gently rather than all at once. Follow up in a month.' });
  inv = (await O('createInvoice', { clientId: asha.id, bookingIds: [ashaB.id] })) as typeof inv;
  await O('updateInvoice', { invoiceId: inv.result.id, lines: [{ description: inv.result.lines[0].description, qty: 1, rate: 1500 }] });
  await O('sendInvoice', { invoiceId: inv.result.id });
  const db1 = (await store.load()).db;
  at(now - 2 * day); await P('invoice.claim', { token: db1.invoices.find((x) => x.id === inv.result.id)!.token, reference: '512288190437' });

  // Riya: Sarvakali offered two times; waiting for her
  at(now - 2 * day);
  await P('request', { name: 'Riya Sen', email: 'riya.sen@example.com', services: services('identity', 2), topic: '', times: [slot(now - 2 * day, 3, '20:00')], tz: 'Asia/Kolkata' });
  ({ b: devB } = await find('riya.sen@example.com'));
  at(now - 1 * day); await O('propose', { bookingId: devB.id, times: [slot(now, 3, '18:00'), slot(now, 4, '11:30')], message: 'Your time is taken, I am sorry. Would either of these suit you?' });

  // Asha again: a conversation tomorrow evening, confirmed
  at(now - 3 * day);
  await P('request', { name: 'Asha Rao', email: 'asha.rao@example.com', services: [], topic: 'A follow-up, as we said.', times: [slot(now, 1, '18:30'), slot(now, 2, '18:30')], tz: 'Asia/Kolkata' });
  ({ b: ashaB } = await find('asha.rao@example.com'));
  at(now - 2 * day); await O('confirm', { bookingId: ashaB.id, start: ashaB.options[0] });

  // Kabir: yesterday's conversation, still to wrap up
  at(now - 6 * day);
  await P('request', { name: 'Kabir Anand', email: 'kabir.anand@example.com', services: services('devotion', 1, /^Kali Working$/), topic: 'I would like to begin a practice for Kali at home.', times: [slot(now, -1, '10:00')], tz: 'Asia/Kolkata' });
  const { b: kab } = await find('kabir.anand@example.com');
  at(now - 5 * day); await O('confirm', { bookingId: kab.id, start: kab.options[0] });

  // and two new requests, waiting for a reply
  at(now - 26 * hour);
  await P('request', { name: 'Nila Thomas', email: 'nila.thomas@example.com', phone: '+91 98450 00000', services: services('magic', 2, /^(Protection Spell|Protective Boundary Ritual)$/), topic: 'Protection for a new home.', times: [slot(now, 2, '17:00'), slot(now, 3, '17:00'), slot(now, 5, '10:30')], tz: 'Asia/Kolkata' });
  at(now - 3 * hour);
  await P('request', { name: 'Meera Kapoor', email: 'meera.kapoor@example.com', services: [...services('divination', 1, /^Love & Relationship Reading$/), ...services('healing', 1, /^Emotional Release$/)], topic: 'Feeling stuck in love and in work. I am not sure where to begin.', times: [slot(now, 2, '19:30'), slot(now, 3, '12:00'), slot(now, 4, '19:30')], tz: 'Asia/Kolkata' });

  clock = null;
  void dev; void asha;
}

let ready: Promise<void> | null = null;
function ensure() {
  ready ??= (async () => {
    const { tag } = await store.load();
    if (tag === null) await seed();
  })();
  return ready;
}

export async function demoOwner(action: string, payload?: Record<string, unknown>) {
  await ensure();
  if (action === 'readiness') return { password: true, secret: true, door: true, email: false, mailFrom: '', google: true, dev: false, demo: true, googleAccount: { email: 'you@example.com', at: new Date().toISOString() } };
  if (action === 'google.disconnect') return { state: await owner(env(), 'state') };
  if (action === 'accounts.has') return { has: await (await import('../../me/demo')).demoHasAccount(payload?.email) };
  if (action === 'demo.reset') {
    try { localStorage.removeItem(KEY); } catch { memory = null; }
    ready = null;
    await ensure();
    return { state: await owner(env(), 'state') };
  }
  return owner(env(), action, payload);
}

export async function demoPublic(action: string, payload?: Record<string, unknown>) {
  await ensure();
  return publicCall(env(), action, payload);
}

/** the demo's records, for the accounts demo's "My space" (a made-up client's sessions and invoices) */
export async function demoDb(): Promise<DB> {
  await ensure();
  return (await store.load()).db;
}
