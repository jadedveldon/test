/**
 * Money on invoices: totals, what is still owed, how an invoice stands, and the UPI payment link. Amounts are
 * rupees (two decimals at most); prices appear only here, in Sarvakali's own tool and the client's invoice.
 */
import type { Day, Invoice, Settings } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function totals(inv: Pick<Invoice, 'lines' | 'discount' | 'taxRate' | 'payments'>) {
  const subtotal = round2(inv.lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0));
  const discount = round2(Math.min(Math.max(0, Number(inv.discount) || 0), subtotal));
  const taxable = round2(subtotal - discount);
  const tax = round2((taxable * (Number(inv.taxRate) || 0)) / 100);
  const total = round2(taxable + tax);
  const paid = round2(inv.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0));
  const due = round2(Math.max(0, total - paid));
  return { subtotal, discount, taxable, tax, total, paid, due };
}

export type Standing = 'draft' | 'unpaid' | 'part-paid' | 'overdue' | 'paid' | 'void';

/** how an invoice stands today: the stored status, with overdue and part-paid worked out */
export function standing(inv: Invoice, today: Day): Standing {
  if (inv.status === 'void') return 'void';
  if (inv.status === 'draft') return 'draft';
  const t = totals(inv);
  if (inv.status === 'paid' || (t.total > 0 && t.due <= 0)) return 'paid';
  if (inv.dueDate && inv.dueDate < today) return 'overdue';
  return t.paid > 0 ? 'part-paid' : 'unpaid';
}

export const STANDING_LABEL: Record<Standing, string> = {
  draft: 'Draft', unpaid: 'Sent, unpaid', 'part-paid': 'Part paid', overdue: 'Overdue', paid: 'Paid', void: 'Cancelled',
};

/** ₹1,500 or ₹1,499.50 */
export const rupees = (n: number) => `₹${round2(n).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** the next invoice number: SK-2026-0007 (the year is the year it is issued) */
export function invoiceNumber(s: Settings, issueDay: Day) {
  return `${(s.invoicePrefix || 'SK').trim()}-${issueDay.slice(0, 4)}-${String(s.nextInvoiceSeq).padStart(4, '0')}`;
}

/** a UPI payment link: opens any UPI app with the amount and note filled in */
export function upiLink(pa: string, pn: string, amount: number, note: string) {
  const q = new URLSearchParams({ pa, pn, cu: 'INR' });
  if (amount > 0) q.set('am', amount.toFixed(2));
  if (note) q.set('tn', note.slice(0, 80));
  // UPI apps expect the @ in the UPI ID as it is, not encoded
  return `upi://pay?${q.toString().replace(/\+/g, '%20').replace(/%40/g, '@')}`;
}

/** a UPI ID looks like name@bank */
export const validUpi = (s: string) => /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(s.trim());
