// The Studio's rules, run in memory (no browser, no server): every loop a request, a booking and an invoice
// can take, with times across zones. Bundles src/studio/core with esbuild, then checks it.
// Run: node tools/qa/studio-core.mjs   (every line must read "ok")
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'studio-core-'));
const entry = join(dir, 'entry.ts');
const fs = await import('node:fs');
fs.writeFileSync(entry, `
export * as api from '${process.cwd()}/src/studio/core/api.ts';
export * as ops from '${process.cwd()}/src/studio/core/ops.ts';
export * as time from '${process.cwd()}/src/studio/core/time.ts';
export * as money from '${process.cwd()}/src/studio/core/money.ts';
export * as ics from '${process.cwd()}/src/studio/core/ics.ts';
export { emptyDB } from '${process.cwd()}/src/studio/core/types.ts';
export * as diya from '${process.cwd()}/src/diya/core.ts';
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'core.mjs'), logLevel: 'error', loader: { '.json': 'json' } });
const M = await import(pathToFileURL(join(dir, 'core.mjs')).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (n, v, extra = '') => { if (!v) fails++; console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`); };
const throws = async (f) => { try { await f(); return false; } catch { return true; } };

// a store in memory, with the same conflict rule as the real ones
let saved = M.emptyDB(); let version = 0;
const store = { async load() { return { db: structuredClone(saved), tag: String(version) }; }, async save(db, tag) { if (tag !== String(version)) return false; saved = structuredClone(db); version++; return true; } };
const sent = [];
const mailer = { name: 'test', async send(m) { sent.push(m); return { status: 'sent' }; } };
let calls = 0;
const calendar = { name: 'test', async available() { return true; }, async upsert(b) { calls++; return { eventId: `ev-${b.id}`, meetUrl: 'https://meet.google.com/abc-defg-hij' }; }, async remove() { calls++; } };
let NOW = Date.parse('2026-12-01T06:00:00Z');
const env = { store, mailer, calendar, siteUrl: 'https://example.org', now: () => NOW };
const O = (a, p) => M.api.owner(env, a, p);
const P = (a, p) => M.api.publicCall(env, a, p);

// time zones
ok('time: London 18:30 in winter is 18:30 UTC', M.time.zonedToUtc('2026-12-03T18:30', 'Europe/London') === '2026-12-03T18:30:00.000Z');
ok('time: Kolkata 18:30 is 13:00 UTC', M.time.zonedToUtc('2026-12-03T18:30', 'Asia/Kolkata') === '2026-12-03T13:00:00.000Z');
ok('time: New York in summer (DST)', M.time.zonedToUtc('2026-07-01T09:00', 'America/New_York') === '2026-07-01T13:00:00.000Z');
ok('time: back to a field in the zone', M.time.utcToLocalInput('2026-12-03T13:00:00.000Z', 'Asia/Kolkata') === '2026-12-03T18:30');
ok('time: shown with its zone', /6:30 pm IST/.test(M.time.whenZ('2026-12-03T13:00:00.000Z', 'Asia/Kolkata')), M.time.whenZ('2026-12-03T13:00:00.000Z', 'Asia/Kolkata'));

await O('updateSettings', { ownerEmail: 'owner@example.org', upiId: 'sarvakali@upi', upiName: 'Sarvakali' });

// 1. a request arrives with three times, from London
const t1 = M.time.zonedToUtc('2026-12-03T18:30', 'Europe/London'), t2 = M.time.zonedToUtc('2026-12-04T10:00', 'Europe/London'), t3 = M.time.zonedToUtc('2026-12-05T12:00', 'Europe/London');
const req = await P('request', { name: 'Asha Rao', email: 'Asha@Example.com', services: ['Reiki', 'Tarot Reading'], topic: 'A hard year', times: [t2, t1, t3], tz: 'Europe/London' });
let db = saved;
ok('request: stored, with the client', db.clients.length === 1 && db.clients[0].email === 'asha@example.com' && db.bookings[0].status === 'requested');
ok('request: times sorted, three', JSON.stringify(db.bookings[0].options) === JSON.stringify([t1, t2, t3]));
ok('request: client acknowledged and owner told', sent.map((m) => m.kind).join() === 'client.received,owner.newRequest', sent.map((m) => m.kind).join());
ok('request: the owner email shows both zones', /IST.*GMT/.test(sent[1].text), sent[1].text.split('\n').find((l) => /IST/.test(l)));
ok('request: a robot filling the hidden field is turned away', await throws(() => P('request', { name: 'x', email: 'x@y.zz', times: [t1], website: 'spam' })));
ok('request: a time in the past is refused', await throws(() => P('request', { name: 'x', email: 'x@y.zz', times: ['2020-01-01T00:00:00Z'] })));
ok('request: a bad email is refused', await throws(() => P('request', { name: 'x', email: 'nope', times: [t1] })));
const token = req.token;
ok('request: the client can see it by their link', (await P('booking.get', { token })).status === 'requested');
ok('request: a wrong link finds nothing', await throws(() => P('booking.get', { token: 'x'.repeat(32) })));

// 2. Sarvakali offers other times; the client suggests their own; then Sarvakali confirms one of theirs
const id = db.bookings[0].id;
sent.length = 0;
const o1 = '2026-12-06T09:00:00.000Z', o2 = '2026-12-07T09:00:00.000Z';
await O('propose', { bookingId: id, times: [o1, o2], message: 'Would either of these suit?' });
ok('propose: waiting for the client, email with a link', saved.bookings[0].status === 'proposed' && sent[0].kind === 'client.proposed' && sent[0].text.includes(`/booking?t=${token}`));
ok('accept: a time not offered is refused', await throws(() => P('booking.accept', { token, start: t1 })));
await P('booking.suggest', { token, times: ['2026-12-08T10:00:00.000Z'], note: 'Mornings are best' });
ok('suggest: back with Sarvakali, owner told', saved.bookings[0].status === 'requested' && saved.bookings[0].optionsBy === 'client' && sent.at(-1).kind === 'owner.clientSuggested');
sent.length = 0;
await O('confirm', { bookingId: id, start: '2026-12-08T10:00:00.000Z' });
db = saved;
ok('confirm: confirmed with a Meet link from the calendar', db.bookings[0].status === 'confirmed' && db.bookings[0].meetUrl === 'https://meet.google.com/abc-defg-hij' && db.bookings[0].calendarEventId);
ok('confirm: the client email carries the link and a calendar file', sent[0].kind === 'client.confirmed' && sent[0].text.includes('meet.google.com') && sent[0].ics?.content.includes('BEGIN:VEVENT'));
ok('confirm: recorded in the outbox', db.outbox[0].kind === 'client.confirmed' && db.outbox[0].status === 'sent');
const pb = await P('booking.get', { token });
ok('booking page: shows the time and the link, not private things', pb.status === 'confirmed' && pb.meetUrl && !('token' in pb) && !('history' in pb));

// 3. a reschedule: Sarvakali offers a new time; client accepts; calendar updated
sent.length = 0; calls = 0;
await O('propose', { bookingId: id, times: ['2026-12-09T10:00:00.000Z'] });
ok('reschedule: the old time is kept meanwhile', saved.bookings[0].previousStart === '2026-12-08T10:00:00.000Z');
await P('booking.accept', { token, start: '2026-12-09T10:00:00.000Z' });
ok('reschedule: accepted, calendar updated, both told', saved.bookings[0].start === '2026-12-09T10:00:00.000Z' && calls === 1 && sent.some((m) => m.kind === 'owner.clientAccepted'));

// 4. reminders: once, a day ahead
NOW = Date.parse('2026-12-08T12:00:00Z'); sent.length = 0;
await O('runReminders');
await O('runReminders');
ok('reminder: sent once', sent.filter((m) => m.kind === 'client.reminder').length === 1);

// 5. wrap up, notes, invoice, payment claimed, paid, receipt
NOW = Date.parse('2026-12-09T12:00:00Z');
await O('wrapUp', { bookingId: id, outcome: 'completed' });
const cid = saved.clients[0].id;
await O('addNote', { clientId: cid, text: 'Wants to work on sleep.', pinned: true });
const inv = (await O('createInvoice', { clientId: cid, bookingIds: [id] })).result;
ok('invoice: drafted from the session’s services, numbered', inv.lines.map((l) => l.description).join() === 'Reiki,Tarot Reading' && /^SK-2026-0001$/.test(inv.number), inv.number);
ok('invoice: cannot send with nothing to pay', await throws(() => O('sendInvoice', { invoiceId: inv.id })));
await O('updateInvoice', { invoiceId: inv.id, lines: [{ description: 'Reiki', qty: 1, rate: 1500 }, { description: 'Tarot Reading', qty: 1, rate: 999.5 }], discount: 99.5 });
ok('invoice: totals', M.money.totals(saved.invoices[0]).total === 2400);
ok('invoice: a draft is not visible to the client', await throws(() => P('invoice.get', { token: saved.invoices[0].token })));
sent.length = 0;
await O('sendInvoice', { invoiceId: inv.id });
const itok = saved.invoices[0].token;
ok('invoice: sent with its link', sent[0].kind === 'client.invoice' && sent[0].text.includes(`/invoice?t=${itok}`));
const pi = await P('invoice.get', { token: itok });
ok('invoice page: amounts and UPI details', pi.totals.total === 2400 && pi.from.upiId === 'sarvakali@upi' && pi.standing === 'unpaid');
await P('invoice.claim', { token: itok, reference: '123456789012' });
ok('claim: owner told, reference kept', saved.invoices[0].claim?.reference === '123456789012' && sent.at(-1).kind === 'owner.clientPaid');
await O('recordPayment', { invoiceId: inv.id, amount: 400 });
ok('payment: part paid', M.money.standing(saved.invoices[0], '2026-12-09') === 'part-paid');
await O('recordPayment', { invoiceId: inv.id, full: true });
ok('payment: paid in full, receipt sent', saved.invoices[0].status === 'paid' && sent.at(-1).kind === 'client.receipt');
ok('payment: the claimed reference went with it', saved.invoices[0].payments[0].reference === '123456789012');
ok('invoice: overdue is worked out', M.money.standing({ ...saved.invoices[0], status: 'sent', payments: [], dueDate: '2026-12-01' }, '2026-12-09') === 'overdue');
ok('invoice: a paid invoice’s amounts cannot change', await throws(() => O('updateInvoice', { invoiceId: inv.id, lines: [] })));
await O('reopenInvoice', { invoiceId: inv.id });
await O('voidInvoice', { invoiceId: inv.id, reason: 'mistake' });
ok('invoice: reopened, then cancelled', saved.invoices[0].status === 'void');
ok('invoice: next number moves on', (await O('createInvoice', { clientId: cid })).result.number === 'SK-2026-0002');

// 6. a session started from the Studio, the client cancels, the calendar event goes
const nb = (await O('newBooking', { clientId: cid, times: ['2026-12-20T10:00:00.000Z'], confirmNow: true })).result;
calls = 0; sent.length = 0;
await P('booking.cancel', { token: nb.token, reason: 'Travelling' });
ok('cancel: by the client, event removed, both told', saved.bookings.find((b) => b.id === nb.id).status === 'cancelled' && calls === 1 && sent.map((m) => m.kind).join() === 'client.cancelled,owner.clientCancelled', sent.map((m) => m.kind).join());
ok('cancel: a closed booking cannot be accepted again', await throws(() => P('booking.accept', { token: nb.token, start: '2026-12-20T10:00:00.000Z' })));

// 7. the same person writes again: one client, two requests
await P('request', { name: 'Asha R.', email: 'asha@example.com', times: ['2026-12-22T10:00:00.000Z'], tz: 'Europe/London' });
ok('a returning client: one record', saved.clients.length === 1 && saved.bookings.filter((b) => b.clientId === cid).length === 3);

// 8. two changes at once do not lose either
await Promise.all([O('addNote', { clientId: cid, text: 'one' }), O('addNote', { clientId: cid, text: 'two' })]);
ok('two saves at once: both kept', saved.notes.filter((n) => n.text === 'one' || n.text === 'two').length === 2);

// 9. erase: details go; sent invoices keep only what tax needs
await O('eraseClient', { clientId: cid });
ok('erase: bookings and notes gone, invoice kept without details', saved.bookings.length === 0 && saved.notes.length === 0 && saved.invoices.length === 1 && saved.clients[0].email.startsWith('erased-'));

// 10. invoices dated in Sarvakali's zone (once checked on the old invoice maker): at 01:15 on 25 Nov in India,
//     still 24 Nov in UTC; odd amounts are kept within reason
NOW = Date.parse('2026-11-24T19:45:00Z');
const c2 = (await O('addClient', { name: 'Date Test', email: 'date@example.com' })).result;
const d2 = (await O('createInvoice', { clientId: c2.id, lines: [{ description: '<i>Reading</i>', qty: -5, rate: 99999999999 }] })).result;
ok('invoice: dated in India at 01:15 IST', d2.issueDate === '2026-11-25' && d2.number.startsWith('SK-2026-'), d2.issueDate);
ok('invoice: a negative quantity becomes 0, a huge rate is capped', d2.lines[0].qty === 0 && d2.lines[0].rate === 10_000_000, JSON.stringify(d2.lines[0]));

// 11. calendar file and UPI link
const icsText = M.ics.sessionIcs({ id: 'b1', start: '2026-12-08T10:00:00.000Z', durationMin: 60, history: [], meetUrl: 'https://meet.google.com/x' }, { title: 'Conversation, with Sarvakali', description: 'Line one\nLine two', organiser: 'Sarvakali' });
ok('ics: valid times, escaped text', icsText.includes('DTSTART:20261208T100000Z') && icsText.includes('DTEND:20261208T110000Z') && icsText.includes('Conversation\\, with') && icsText.includes('Line one\\nLine two'));
ok('upi: link with amount and the @ kept', M.money.upiLink('sarvakali@upi', 'Sarvakali', 2400, 'SK-2026-0001') === 'upi://pay?pa=sarvakali@upi&pn=Sarvakali&cu=INR&am=2400.00&tn=SK-2026-0001');

// 12. the diya's shared count of the day: India's day, one more each time, a damaged tally starts again
ok('diya: the day turns at midnight in India', M.diya.dayKey(new Date('2026-11-27T18:29:00Z')) === '2026-11-27' && M.diya.dayKey(new Date('2026-11-27T18:31:00Z')) === '2026-11-28');
ok('diya: one more lamp', M.diya.bump(null).n === 1 && M.diya.bump({ n: 41 }).n === 42);
ok('diya: a damaged tally starts again', M.diya.bump({ n: -5 }).n === 1 && M.diya.bump({ n: NaN }).n === 1 && M.diya.bump({ n: 2.7 }).n === 3);

console.log(fails ? `\n${fails} FAILED` : '\nall ok');
process.exit(fails ? 1 : 0);
