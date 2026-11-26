/**
 * A calendar file (.ics) for a session, so it lands in any calendar: Google, Apple, Outlook. Sent with the
 * confirmation and offered on the client's booking page.
 */
import type { Booking } from './types';

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** lines longer than 75 octets are folded, as the format asks */
const fold = (line: string) => {
  const out: string[] = [];
  let s = line;
  while (s.length > 74) { out.push(s.slice(0, 74)); s = ` ${s.slice(74)}`; }
  out.push(s);
  return out.join('\r\n');
};

export function sessionIcs(b: Booking, o: { title: string; description: string; organiser: string; organiserEmail?: string; cancel?: boolean; sequence?: number }) {
  if (!b.start) return '';
  const end = new Date(Date.parse(b.start) + b.durationMin * 60000).toISOString();
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sarvakali//Studio//EN', 'CALSCALE:GREGORIAN', `METHOD:${o.cancel ? 'CANCEL' : 'PUBLISH'}`,
    'BEGIN:VEVENT',
    `UID:${b.id}@sarvakali`,
    `SEQUENCE:${o.sequence ?? b.history.length}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(o.title)}`,
    `DESCRIPTION:${esc(o.description)}`,
    ...(b.meetUrl ? [`LOCATION:${esc(b.meetUrl)}`, `URL:${esc(b.meetUrl)}`] : []),
    ...(o.organiserEmail ? [`ORGANIZER;CN=${esc(o.organiser)}:mailto:${o.organiserEmail}`] : []),
    `STATUS:${o.cancel ? 'CANCELLED' : 'CONFIRMED'}`,
    ...(o.cancel ? [] : ['BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(o.title)}`, 'END:VALARM']),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** a link that opens Google Calendar with the session filled in */
export function googleCalendarLink(b: Booking, title: string, details: string) {
  if (!b.start) return '';
  const end = new Date(Date.parse(b.start) + b.durationMin * 60000).toISOString();
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(b.start)}/${stamp(end)}`, details: details + (b.meetUrl ? `\n\n${b.meetUrl}` : '') });
  if (b.meetUrl) q.set('location', b.meetUrl);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
