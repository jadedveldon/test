// Takes the sample records out of the live Studio (clients tagged "sample", added 2026-11-28 so the Studio could be
// tried before real requests arrive), with everything that belongs to them: their bookings, invoices, notes, history
// lines and emails. Real records and the Studio's settings are left exactly as they are.
// Run (with a Netlify personal access token for the site, never committed):
//   NETLIFY_AUTH_TOKEN=… node tools/studio/remove-samples.mjs            (shows what would go)
//   NETLIFY_AUTH_TOKEN=… node tools/studio/remove-samples.mjs --apply    (takes them out)
import { getStore } from '@netlify/blobs';

const SITE = '94db8003-2dc5-4703-a93f-412e1be513e8';
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!token) { console.error('Set NETLIFY_AUTH_TOKEN first.'); process.exit(1); }
const store = getStore({ name: 'studio', siteID: SITE, token, consistency: 'strong' });
const { data: db, etag } = await store.getWithMetadata('db', { type: 'json' });
const clients = new Set(db.clients.filter((c) => (c.tags ?? []).includes('sample')).map((c) => c.id));
const bookings = new Set(db.bookings.filter((b) => clients.has(b.clientId)).map((b) => b.id));
const invoices = new Set(db.invoices.filter((i) => clients.has(i.clientId)).map((i) => i.id));
const mine = (x) => clients.has(x.clientId) || bookings.has(x.bookingId) || invoices.has(x.invoiceId);
const next = {
  ...db,
  clients: db.clients.filter((c) => !clients.has(c.id)),
  bookings: db.bookings.filter((b) => !bookings.has(b.id)),
  invoices: db.invoices.filter((i) => !invoices.has(i.id)),
  notes: db.notes.filter((n) => !mine(n)),
  activity: db.activity.filter((a) => !mine(a)),
  outbox: db.outbox.filter((m) => !mine(m) && !/@example\.com$/i.test(String(m.to ?? ''))),
};
const count = (k) => `${db[k].length - next[k].length} of ${db[k].length}`;
console.log(`samples: clients ${count('clients')}, bookings ${count('bookings')}, invoices ${count('invoices')}, notes ${count('notes')}, history ${count('activity')}, emails ${count('outbox')}`);
if (!process.argv.includes('--apply')) { console.log('Nothing changed. Add --apply to take them out.'); process.exit(0); }
const r = await store.setJSON('db', next, { onlyIfMatch: etag });
console.log(r.modified === false ? 'The Studio changed meanwhile; run it again.' : 'Samples taken out.');
