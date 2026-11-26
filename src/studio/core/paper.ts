/**
 * The invoice as paper: one layout for the Studio's preview, the client's invoice page and the printed PDF (A4).
 * The colours follow the pillar the work belongs to; the UPI QR code carries the exact amount still owed.
 */
import qrcode from 'qrcode-generator';
import { MARK } from '../../data/brand';
import { rupees, upiLink, type Standing } from './money';
import { longDay } from './time';
import type { InvoiceLine } from './types';

export const THEMES: Record<string, { accent: string; soft: string; name: string }> = {
  kali: { accent: '#8e1f18', soft: '#f6e4e0', name: 'Sarvakali' },
  devotion: { accent: '#8a5a12', soft: '#f6ead2', name: 'Devotion & the Unseen' },
  magic: { accent: '#1f6b52', soft: '#e3f3ec', name: 'Witchcraft & Magic' },
  healing: { accent: '#1e6e78', soft: '#e1f2f3', name: 'Healing & Inner Work' },
  identity: { accent: '#9c3a5a', soft: '#f8e6ec', name: 'Identity, Intimacy & the Body' },
  divination: { accent: '#3b4ea8', soft: '#e7eafb', name: 'Divination & Insight' },
  learning: { accent: '#7a4a24', soft: '#f3ebdf', name: 'Learning' },
};

export interface PaperData {
  number: string; issueDate: string; dueDate?: string; lines: InvoiceLine[]; theme: string; note?: string; taxLabel?: string; taxRate: number;
  totals: { subtotal: number; discount: number; tax: number; total: number; paid: number; due: number };
  standing: Standing; paidAt?: string;
  client: { name: string; email?: string };
  from: { name: string; upiId?: string; upiName?: string; address?: string; gstin?: string; email?: string; phone?: string };
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function upiQrSvg(link: string, cell = 4) {
  const q = qrcode(0, 'M');
  q.addData(link);
  q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

const STAMP: Partial<Record<Standing, string>> = { paid: 'Paid', void: 'Cancelled', overdue: 'Overdue', draft: 'Draft' };

export function paperHtml(d: PaperData) {
  const th = THEMES[d.theme] ?? THEMES.kali;
  const t = d.totals;
  const link = d.from.upiId ? upiLink(d.from.upiId, d.from.upiName || d.from.name, t.due, d.number) : '';
  const qr = d.from.upiId && t.due > 0 && d.standing !== 'void' && d.standing !== 'draft'
    ? `<div class="ip-qr" aria-label="UPI QR code for ${esc(rupees(t.due))}">${upiQrSvg(link)}</div>`
    : d.standing === 'draft' && d.from.upiId ? `<div class="ip-qr ip-qr-later">The QR code appears once the invoice is sent</div>` : '';
  const mark = `<svg viewBox="0 0 64 64" class="ip-mark" aria-hidden="true"><path d="${MARK.moon}"/><path d="${MARK.flame}"/></svg>`;
  return `<article class="ip" style="--ip-accent:${th.accent};--ip-soft:${th.soft}">
  <header class="ip-head">
    <div class="ip-brand">${mark}<div><p class="ip-name">${esc(d.from.name)}</p>${th.name !== 'Sarvakali' ? `<p class="ip-sub">${esc(th.name)}</p>` : ''}</div></div>
    <div class="ip-meta"><p class="ip-title">Invoice</p><p class="ip-num">${esc(d.number)}</p><p>Issued ${esc(longDay(d.issueDate))}</p>${d.dueDate ? `<p>Due ${esc(longDay(d.dueDate))}</p>` : ''}</div>
  </header>
  <section class="ip-parties">
    <div><p class="ip-label">Billed to</p><p class="ip-strong">${esc(d.client.name)}</p>${d.client.email ? `<p>${esc(d.client.email)}</p>` : ''}</div>
    <div><p class="ip-label">From</p><p class="ip-strong">${esc(d.from.name)}</p>${d.from.address ? `<p>${esc(d.from.address)}</p>` : ''}${d.from.email ? `<p>${esc(d.from.email)}</p>` : ''}${d.from.phone ? `<p>${esc(d.from.phone)}</p>` : ''}${d.from.gstin ? `<p>GSTIN ${esc(d.from.gstin)}</p>` : ''}</div>
  </section>
  <table class="ip-table">
    <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>${d.lines.length ? d.lines.map((l) => `<tr><td>${esc(l.description) || '—'}</td><td>${l.qty}</td><td>${rupees(l.rate)}</td><td>${rupees(l.qty * l.rate)}</td></tr>`).join('') : '<tr><td colspan="4" class="ip-empty">No lines yet</td></tr>'}</tbody>
  </table>
  <div class="ip-end">
  ${STAMP[d.standing] ? `<p class="ip-stamp ip-stamp-${d.standing}">${STAMP[d.standing]}</p>` : ''}
  <div class="ip-sums">
    ${t.discount || t.tax ? `<p><span>Subtotal</span><span>${rupees(t.subtotal)}</span></p>` : ''}
    ${t.discount ? `<p><span>Discount</span><span>− ${rupees(t.discount)}</span></p>` : ''}
    ${t.tax ? `<p><span>${esc(d.taxLabel || 'Tax')} (${d.taxRate}%)</span><span>${rupees(t.tax)}</span></p>` : ''}
    <p class="ip-total"><span>Total</span><span>${rupees(t.total)}</span></p>
    ${t.paid ? `<p><span>Paid</span><span>− ${rupees(t.paid)}</span></p><p class="ip-total"><span>Still to pay</span><span>${rupees(t.due)}</span></p>` : ''}
  </div>
  </div>
  ${d.from.upiId || d.note ? `<section class="ip-pay">${qr}<div>${d.from.upiId && t.due > 0 && d.standing !== 'void' ? `<p class="ip-label">Pay by UPI</p><p class="ip-upi">${esc(d.from.upiId)}</p>${d.from.upiName ? `<p>${esc(d.from.upiName)}</p>` : ''}<p class="ip-ref">Reference: ${esc(d.number)}</p>` : ''}${d.standing === 'paid' ? `<p class="ip-label">Paid in full${d.paidAt ? ` · ${esc(longDay(d.paidAt.slice(0, 10)))}` : ''}</p><p>Thank you.</p>` : ''}${d.note ? `<p class="ip-note">${esc(d.note).replace(/\n/g, '<br>')}</p>` : ''}</div></section>` : ''}
  <footer class="ip-foot">Thank you · ${esc(d.from.name)}</footer>
</article>`;
}
