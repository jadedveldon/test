/**
 * Every email the Studio sends: to the client (received, a time offered, confirmed, declined, cancelled, a
 * reminder, an invoice, a receipt) and to Sarvakali (a new request, a client's reply, a payment to check). The
 * client's words are in src/content/pages/booking.json ("Bookings and emails" in the content editor); Sarvakali's
 * own notifications are plain working notes. Each email is both HTML (simple tables, styles inline, as email apps
 * need) and plain text.
 */
import words from '../../content/pages/booking.json';
import { googleCalendarLink, sessionIcs } from './ics';
import { rupees, totals } from './money';
import { longDay, whenBoth, whenZ } from './time';
import type { Booking, Client, DB, Invoice, MailKind } from './types';

export const W = words;

export interface Rendered { kind: MailKind; to: string; subject: string; text: string; html: string; ics?: { filename: string; content: string } }

/** fills {name}, {number}… in a sentence */
export const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const para = (s: string) => escHtml(s).replace(/\n/g, '<br>');

type Block =
  | { p: string }
  | { list: string[]; title?: string }
  | { button: string; href: string }
  | { small: string; links?: [string, string][] }
  | { rows: [string, string][] };

/** the shape every email shares: the mark, a greeting, the blocks, the signature, a footer */
function layout(siteUrl: string, sign: string, blocks: Block[], footer: string) {
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4efe8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe8;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border-radius:14px;border:1px solid #e8dccb;">
<tr><td style="padding:28px 32px 8px 32px;"><img src="${siteUrl}/brand/email-mark.png" width="44" height="44" alt="Sarvakali" style="display:block;border:0;"></td></tr>
<tr><td style="padding:8px 32px 28px 32px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#2b1c16;">
${blocks.map((b) => {
    if ('p' in b) return `<p style="margin:0 0 16px 0;">${para(b.p)}</p>`;
    if ('list' in b) return `${b.title ? `<p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a6a4a;">${escHtml(b.title)}</p>` : ''}<ul style="margin:0 0 18px 0;padding-left:20px;">${b.list.map((i) => `<li style="margin:0 0 4px 0;">${para(i)}</li>`).join('')}</ul>`;
    if ('button' in b) return `<p style="margin:6px 0 22px 0;"><a href="${escHtml(b.href)}" style="display:inline-block;background:#8e1f18;color:#fff8ee;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 22px;border-radius:999px;">${escHtml(b.button)}</a></p>`;
    if ('rows' in b) return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;font-family:Arial,sans-serif;font-size:14px;color:#2b1c16;">${b.rows.map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#8a6a4a;vertical-align:top;">${escHtml(k)}</td><td style="padding:3px 0;">${para(v)}</td></tr>`).join('')}</table>`;
    // links read as words; a long address would run past the edge of the email
    const links = (b.links ?? []).map(([label, href]) => `<a href="${escHtml(href)}" style="color:#8e1f18;">${escHtml(label)}</a>`).join(' &nbsp;·&nbsp; ');
    return `<p style="margin:0 0 14px 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#7a6455;">${para(b.small)}${links ? `<br>${links}` : ''}</p>`;
  }).join('\n')}
<p style="margin:22px 0 0 0;">${para(sign)}</p>
</td></tr></table>
<p style="max-width:560px;margin:14px auto 0 auto;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#9a8574;">${para(footer)}</p>
</td></tr></table></body></html>`;
  const text = blocks.map((b) => {
    if ('p' in b) return b.p;
    if ('list' in b) return `${b.title ? `${b.title}\n` : ''}${b.list.map((i) => `• ${i}`).join('\n')}`;
    if ('button' in b) return `${b.button}: ${b.href}`;
    if ('rows' in b) return b.rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    return [b.small, ...(b.links ?? []).map(([label, href]) => `${label}: ${href}`)].join('\n');
  }).join('\n\n') + `\n\n${sign}\n\n—\n${footer}\n`;
  return { html, text };
}

/** `ext` is ".html" in the preview, where pages are plain files */
export interface Ctx { db: DB; siteUrl: string; ext?: string }

const firstName = (c: Client) => c.name.trim().split(/\s+/)[0] || c.name;
const page = (x: Ctx, name: string) => `${x.siteUrl}/${name}${x.ext ?? ''}`;
const bookingUrl = (x: Ctx, b: Booking) => `${page(x, 'booking')}?t=${b.token}`;
const invoiceUrl = (x: Ctx, i: Invoice) => `${page(x, 'invoice')}?t=${i.token}`;
const studioUrl = (x: Ctx, hash: string) => `${page(x, 'studio')}#${hash}`;
const clientTz = (c: Client, b?: Booking) => b?.clientTz || c.tz || 'Asia/Kolkata';
const asked = (b: Booking) => [...b.services, ...(b.topic ? [`“${b.topic}”`] : [])];

function toClient(x: Ctx, c: Client, kind: MailKind, subject: string, blocks: Block[], ics?: Rendered['ics']): Rendered {
  const s = x.db.settings;
  const { html, text } = layout(x.siteUrl, s.signature || s.ownerName, [{ p: fill(W.emails.greeting, { name: firstName(c) }) }, ...blocks], W.emails.footer);
  return { kind, to: c.email, subject, html, text, ics };
}

function toOwner(x: Ctx, kind: MailKind, subject: string, blocks: Block[]): Rendered | null {
  const s = x.db.settings;
  if (!s.ownerEmail) return null;
  const { html, text } = layout(x.siteUrl, 'Studio', blocks, 'A note from your Studio. Open the Studio to reply; nothing is sent to anyone until you do.');
  return { kind, to: s.ownerEmail, subject, html, text };
}

function icsFor(x: Ctx, c: Client, b: Booking, cancel = false) {
  const s = x.db.settings;
  return { filename: 'sarvakali.ics', content: sessionIcs(b, { title: `Conversation with ${s.practiceName}`, description: `${s.meetingNote}\n\nYour booking: ${bookingUrl(x, b)}`, organiser: s.practiceName, organiserEmail: s.ownerEmail || undefined, cancel }) };
}

/* ---------------------------------------------------------------- to the client */

export function clientReceived(x: Ctx, c: Client, b: Booking) {
  const tz = clientTz(c, b);
  return toClient(x, c, 'client.received', W.emails.receivedSubject, [
    { p: W.emails.receivedText },
    ...(b.options.length ? [{ title: W.connectDone.times, list: b.options.map((o) => whenZ(o, tz)) }] : []),
    ...(asked(b).length ? [{ title: W.connectDone.asked, list: asked(b) }] : []),
    { button: W.connectDone.track, href: bookingUrl(x, b) },
  ]);
}

export function clientProposed(x: Ctx, c: Client, b: Booking) {
  const tz = clientTz(c, b);
  return toClient(x, c, 'client.proposed', W.emails.proposedSubject, [
    { p: W.emails.proposedText },
    ...(b.message ? [{ p: b.message }] : []),
    { list: b.options.map((o) => whenZ(o, tz)) },
    { button: W.emails.proposedButton, href: bookingUrl(x, b) },
  ]);
}

export function clientConfirmed(x: Ctx, c: Client, b: Booking) {
  const tz = clientTz(c, b);
  const s = x.db.settings;
  return toClient(x, c, 'client.confirmed', W.emails.confirmedSubject, [
    { p: W.emails.confirmedText },
    { rows: [['When', b.start ? whenZ(b.start, tz, { year: true }) : ''], ['How long', `${b.durationMin} minutes`], ['Where', b.meetUrl ? `Google Meet: ${b.meetUrl}` : W.booking.linkSoon]] },
    ...(b.meetUrl ? [{ button: W.emails.confirmedButton, href: b.meetUrl }] : []),
    ...(s.meetingNote ? [{ p: s.meetingNote }] : []),
    ...(b.message ? [{ p: b.message }] : []),
    { small: W.emails.manage, links: [[W.emails.manageButton, bookingUrl(x, b)], [W.booking.googleCalendar, googleCalendarLink(b, `Conversation with ${s.practiceName}`, s.meetingNote)]] },
  ], icsFor(x, c, b));
}

export function clientDeclined(x: Ctx, c: Client, b: Booking) {
  return toClient(x, c, 'client.declined', W.emails.declinedSubject, [
    { p: W.emails.declinedText },
    ...(b.reason ? [{ p: b.reason }] : []),
  ]);
}

export function clientCancelled(x: Ctx, c: Client, b: Booking) {
  const tz = clientTz(c, b);
  return toClient(x, c, 'client.cancelled', W.emails.cancelledSubject, [
    { p: W.emails.cancelledText },
    ...(b.start ? [{ rows: [['Was', whenZ(b.start, tz)]] as [string, string][] }] : []),
    ...(b.reason ? [{ p: b.reason }] : []),
    { button: W.booking.newRequest, href: page(x, 'connect') },
  ], b.start ? icsFor(x, c, b, true) : undefined);
}

export function clientReminder(x: Ctx, c: Client, b: Booking) {
  const tz = clientTz(c, b);
  return toClient(x, c, 'client.reminder', W.emails.reminderSubject, [
    { p: W.emails.reminderText },
    { rows: [['When', b.start ? whenZ(b.start, tz) : ''], ['Where', b.meetUrl ? `Google Meet: ${b.meetUrl}` : W.booking.linkSoon]] },
    ...(b.meetUrl ? [{ button: W.emails.confirmedButton, href: b.meetUrl }] : []),
    { small: W.emails.manage, links: [[W.emails.manageButton, bookingUrl(x, b)]] },
  ]);
}

function invoiceRows(i: Invoice): [string, string][] {
  const t = totals(i);
  return [
    [W.invoice.number, i.number],
    [W.invoice.issued, longDay(i.issueDate)],
    ...(i.dueDate ? [[W.invoice.due, longDay(i.dueDate)] as [string, string]] : []),
    [W.invoice.total, rupees(t.total)],
    ...(t.paid > 0 ? [[W.invoice.paidSoFar, rupees(t.paid)] as [string, string], [W.invoice.due2, rupees(t.due)] as [string, string]] : []),
  ];
}

export function clientInvoice(x: Ctx, c: Client, i: Invoice, reminder = false) {
  const v = { number: i.number };
  return toClient(x, c, reminder ? 'client.invoiceReminder' : 'client.invoice', fill(reminder ? W.emails.invoiceReminderSubject : W.emails.invoiceSubject, v), [
    { p: reminder ? W.emails.invoiceReminderText : W.emails.invoiceText },
    { rows: invoiceRows(i) },
    { button: W.emails.invoiceButton, href: invoiceUrl(x, i) },
  ]);
}

export function clientReceipt(x: Ctx, c: Client, i: Invoice) {
  return toClient(x, c, 'client.receipt', fill(W.emails.receiptSubject, { number: i.number }), [
    { p: W.emails.receiptText },
    { rows: invoiceRows(i) },
    { button: W.invoice.print, href: invoiceUrl(x, i) },
  ]);
}

/* ---------------------------------------------------------------- to Sarvakali */

export function ownerNewRequest(x: Ctx, c: Client, b: Booking) {
  const tz = x.db.settings.ownerTz;
  const seen = x.db.bookings.filter((o) => o.clientId === c.id && o.id !== b.id).length;
  return toOwner(x, 'owner.newRequest', `New request: ${c.name}`, [
    { p: `${c.name} has asked for a conversation${seen ? ` (they have written ${seen} time${seen === 1 ? '' : 's'} before)` : ' (first time)'}.` },
    { rows: [['Email', c.email], ...(c.phone ? [['Phone', c.phone] as [string, string]] : [])] },
    ...(b.options.length ? [{ title: 'Times they offered', list: b.options.map((o) => whenBoth(o, tz, b.clientTz)) }] : []),
    ...(asked(b).length ? [{ title: 'They asked about', list: asked(b) }] : []),
    { button: 'Open the request', href: studioUrl(x, `/requests/${b.id}`) },
  ]);
}

export function ownerClientAccepted(x: Ctx, c: Client, b: Booking) {
  return toOwner(x, 'owner.clientAccepted', `Confirmed: ${c.name}, ${b.start ? whenZ(b.start, x.db.settings.ownerTz) : ''}`, [
    { p: `${c.name} chose a time, and the conversation is confirmed${b.meetUrl ? ' with its meeting link' : ''}.` },
    { rows: [['When', b.start ? whenBoth(b.start, x.db.settings.ownerTz, b.clientTz) : ''], ...(b.meetUrl ? [['Link', b.meetUrl] as [string, string]] : [])] },
    ...(b.message ? [{ p: `Their note: ${b.message}` }] : []),
    { button: 'Open in the Studio', href: studioUrl(x, `/requests/${b.id}`) },
  ]);
}

export function ownerClientSuggested(x: Ctx, c: Client, b: Booking) {
  return toOwner(x, 'owner.clientSuggested', `${c.name} suggested other times`, [
    { p: `None of your times suited ${c.name}; they suggested these instead.` },
    { list: b.options.map((o) => whenBoth(o, x.db.settings.ownerTz, b.clientTz)) },
    ...(b.message ? [{ p: `Their note: ${b.message}` }] : []),
    { button: 'Reply in the Studio', href: studioUrl(x, `/requests/${b.id}`) },
  ]);
}

export function ownerClientCancelled(x: Ctx, c: Client, b: Booking) {
  return toOwner(x, 'owner.clientCancelled', `${c.name} cancelled`, [
    { p: `${c.name} cancelled${b.start ? ` the conversation on ${whenZ(b.start, x.db.settings.ownerTz)}` : ' their request'}.` },
    ...(b.reason ? [{ p: `Their reason: ${b.reason}` }] : []),
    { button: 'Open in the Studio', href: studioUrl(x, `/clients/${c.id}`) },
  ]);
}

export function ownerClientPaid(x: Ctx, c: Client, i: Invoice) {
  return toOwner(x, 'owner.clientPaid', `${c.name} says invoice ${i.number} is paid`, [
    { p: `${c.name} says they have paid invoice ${i.number} (${rupees(totals(i).due)} outstanding). Check your UPI app, then mark it paid in the Studio.` },
    ...(i.claim?.reference ? [{ rows: [['UPI reference', i.claim.reference]] as [string, string][] }] : []),
    ...(i.claim?.note ? [{ p: `Their note: ${i.claim.note}` }] : []),
    { button: 'Open the invoice', href: studioUrl(x, `/invoices/${i.id}`) },
  ]);
}
