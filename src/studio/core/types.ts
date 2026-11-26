/**
 * The Studio's records: everything Sarvakali keeps about the people who get in touch, their sessions and their
 * invoices. One database document holds them all (a practice of one person stays small), stored on the host in
 * Netlify Blobs, on a developer's computer in a file, and in the preview's demo in the browser (src/studio/*).
 * Times are kept as UTC ISO strings; dates on invoices as YYYY-MM-DD in Sarvakali's own time zone.
 */
export type ISO = string;
export type Day = string;
export type Who = 'client' | 'owner' | 'system';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** the time zone their browser gave when they wrote (times are shown to them in it) */
  tz?: string;
  /** only what they chose to tell; never assumed */
  pronouns?: string;
  tags: string[];
  createdAt: ISO;
  updatedAt: ISO;
  archived?: boolean;
}

export interface Note {
  id: string;
  clientId: string;
  bookingId?: string;
  text: string;
  pinned?: boolean;
  createdAt: ISO;
  updatedAt?: ISO;
}

/**
 * A booking runs from the first request to the session itself:
 *   requested  the client offered times (on Connect, or by suggesting others); Sarvakali to reply
 *   proposed   Sarvakali offered times (a reply, a reschedule, or a session she set up); the client to reply
 *   confirmed  a time is fixed (with its meeting link)
 *   completed / no_show   after the time
 *   declined (by Sarvakali, before a time was fixed) / cancelled (by either, after)
 */
export type BookingStatus = 'requested' | 'proposed' | 'confirmed' | 'completed' | 'no_show' | 'declined' | 'cancelled';
export const OPEN_STATUSES: BookingStatus[] = ['requested', 'proposed', 'confirmed'];

export interface HistoryEntry { at: ISO; by: Who; what: string }

export interface Booking {
  id: string;
  clientId: string;
  source: 'connect' | 'studio';
  /** what they asked about: services kept on the way, and their own words */
  services: string[];
  topic: string;
  status: BookingStatus;
  /** the times on the table, offered by `optionsBy` */
  options: ISO[];
  optionsBy: 'client' | 'owner';
  /** the note that came with the latest options */
  message?: string;
  /** the fixed time, once confirmed (kept while a new time is being agreed, as `previousStart`) */
  start?: ISO;
  previousStart?: ISO;
  durationMin: number;
  meetUrl?: string;
  calendarEventId?: string;
  /** the client's own link to this booking (/booking?t=…) */
  token: string;
  clientTz: string;
  remindedAt?: ISO;
  cancelledBy?: 'client' | 'owner';
  reason?: string;
  history: HistoryEntry[];
  createdAt: ISO;
  updatedAt: ISO;
}

export interface InvoiceLine { description: string; qty: number; rate: number }
export type PaymentMethod = 'upi' | 'cash' | 'bank' | 'other';
export interface Payment { id: string; amount: number; date: Day; method: PaymentMethod; reference?: string; at: ISO }

/** draft → sent → paid; void cancels it. "Overdue" and "part paid" are worked out, not stored. */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  bookingIds: string[];
  issueDate: Day;
  dueDate?: Day;
  lines: InvoiceLine[];
  discount: number;
  /** percent; 0 when no tax is charged */
  taxRate: number;
  taxLabel?: string;
  note?: string;
  theme: string;
  status: InvoiceStatus;
  payments: Payment[];
  /** the client's own link to this invoice (/invoice?t=…) */
  token: string;
  /** the client said they have paid (with their UPI reference), for Sarvakali to check */
  claim?: { at: ISO; reference?: string; note?: string };
  sentAt?: ISO;
  paidAt?: ISO;
  voidedAt?: ISO;
  history: HistoryEntry[];
  createdAt: ISO;
  updatedAt: ISO;
}

export interface Settings {
  practiceName: string;
  ownerName: string;
  /** where Sarvakali's notifications go */
  ownerEmail: string;
  ownerTz: string;
  upiId: string;
  upiName: string;
  phone?: string;
  address?: string;
  gstin?: string;
  invoicePrefix: string;
  nextInvoiceSeq: number;
  paymentTermsDays: number;
  defaultDurationMin: number;
  /** a line added to every confirmation (what to have ready, how the call goes) */
  meetingNote: string;
  signature: string;
  notify: { newRequest: boolean; clientReplies: boolean; payments: boolean };
  reminders: { enabled: boolean; hoursBefore: number };
  /** let Google Calendar send its own invitation as well (when Google is connected) */
  googleInvites: boolean;
}

export interface Activity { id: string; at: ISO; text: string; kind: string; clientId?: string; bookingId?: string; invoiceId?: string }

export type MailKind =
  | 'owner.newRequest' | 'owner.clientAccepted' | 'owner.clientSuggested' | 'owner.clientCancelled' | 'owner.clientPaid'
  | 'client.received' | 'client.proposed' | 'client.confirmed' | 'client.declined' | 'client.cancelled' | 'client.reminder'
  | 'client.invoice' | 'client.invoiceReminder' | 'client.receipt';

export interface Mail {
  id: string;
  at: ISO;
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  html: string;
  /** a calendar file sent with it */
  ics?: { filename: string; content: string };
  status: 'sent' | 'saved' | 'failed';
  provider: string;
  error?: string;
  clientId?: string;
  bookingId?: string;
  invoiceId?: string;
}

export interface DB {
  v: 1;
  clients: Client[];
  bookings: Booking[];
  invoices: Invoice[];
  notes: Note[];
  activity: Activity[];
  outbox: Mail[];
  settings: Settings;
  /** whether Google Calendar is connected (its keys are kept apart, on the server only) */
  google: { connected: boolean; email?: string };
}

export const DEFAULT_SETTINGS: Settings = {
  practiceName: 'Sarvakali',
  ownerName: 'Sarvakali',
  ownerEmail: '',
  ownerTz: 'Asia/Kolkata',
  upiId: '',
  upiName: '',
  invoicePrefix: 'SK',
  nextInvoiceSeq: 1,
  paymentTermsDays: 7,
  defaultDurationMin: 60,
  meetingNote: 'Find a quiet place where you will not be disturbed. You join from your phone or computer; there is nothing to install.',
  signature: 'With care,\nSarvakali',
  notify: { newRequest: true, clientReplies: true, payments: true },
  reminders: { enabled: true, hoursBefore: 24 },
  googleInvites: true,
};

export const emptyDB = (): DB => ({
  v: 1, clients: [], bookings: [], invoices: [], notes: [], activity: [], outbox: [],
  settings: structuredClone(DEFAULT_SETTINGS), google: { connected: false },
});

/** a database read from storage, made whole (fields added in later versions get their defaults) */
export function normalise(raw: unknown): DB {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<DB>;
  const base = emptyDB();
  return {
    v: 1,
    clients: Array.isArray(d.clients) ? d.clients : [],
    bookings: Array.isArray(d.bookings) ? d.bookings : [],
    invoices: Array.isArray(d.invoices) ? d.invoices : [],
    notes: Array.isArray(d.notes) ? d.notes : [],
    activity: Array.isArray(d.activity) ? d.activity : [],
    outbox: Array.isArray(d.outbox) ? d.outbox : [],
    settings: { ...base.settings, ...(d.settings ?? {}), notify: { ...base.settings.notify, ...(d.settings?.notify ?? {}) }, reminders: { ...base.settings.reminders, ...(d.settings?.reminders ?? {}) } },
    google: { connected: false, ...(d.google ?? {}) },
  };
}
