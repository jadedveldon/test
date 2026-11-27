/**
 * The client's own invoice page (/invoice?t=…, the link in their invoice email): the invoice as paper, how it
 * stands (unpaid, part paid, overdue, paid, cancelled), paying by UPI (the QR code, or on a phone straight into
 * their UPI app with the amount filled in), and "I have paid" with their reference, so Sarvakali can match it.
 * Printing gives a clean A4 copy. Words: src/content/pages/booking.json.
 */
import words from '../content/pages/booking.json';
import { publicCall, pageHref } from '../studio/client';
import { rupees, upiLink } from '../studio/core/money';
import type { PublicInvoice } from '../studio/core/ops';
import { paperHtml } from '../studio/core/paper';
import { track } from './track';
import { say } from './words';

const W = words.invoice;
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function initInvoiceView() {
  const root = document.querySelector<HTMLElement>('[data-invoice-view]');
  if (!root) return;
  const paper = root.querySelector<HTMLElement>('[data-paper]')!;
  const side = root.querySelector<HTMLElement>('[data-pay]')!;
  const token = new URLSearchParams(location.search).get('t') || '';
  let inv: PublicInvoice | null = null;
  let note = '';

  const render = () => {
    if (!inv) return;
    const x = inv;
    paper.innerHTML = paperHtml({ ...x, standing: x.standing });
    const t = x.totals;
    const link = x.from.upiId ? upiLink(x.from.upiId, x.from.upiName || x.from.name, t.due, x.number) : '';
    const phone = matchMedia('(pointer: coarse)').matches;
    let html = '';
    if (x.status === 'void') html = `<p class="lede">${esc(W.void)}</p>`;
    else if (x.standing === 'paid') html = `<p class="bk-done">${esc(W.paid)}</p>`;
    else {
      html = `<h2 class="display-m">${esc(W.payTitle)}</h2><p class="bk-amount">${esc(rupees(t.due))}</p><p>${esc(W.payText)}</p>
        ${x.from.upiId ? `<div class="cta-row">${phone ? `<a class="btn btn-solid" href="${esc(link)}">${esc(W.payButton)}</a>` : ''}<button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(x.from.upiId)}">${esc(W.copy)}: ${esc(x.from.upiId)}</button></div>` : ''}
        ${x.claim ? `<p class="bk-done" role="status">${esc(W.claimed)}</p>` : `
        <form class="bk-claim" data-claim>
          <h3>${esc(W.claim)}</h3><p class="hint">${esc(W.claimText)}</p>
          <label class="field"><span>${esc(W.reference)} <span class="optional">(optional)</span></span><input name="reference" inputmode="numeric" autocomplete="off" maxlength="40" /></label>
          <button type="submit" class="btn btn-ghost">${esc(W.claimSend)}</button>
        </form>`}`;
    }
    side.innerHTML = (note ? `<p class="bk-done" role="status">${esc(note)}</p>` : '') + html + `<div class="cta-row"><button type="button" class="btn btn-ghost btn-sm" data-print>${esc(W.print)}</button></div>`;
    note = '';
  };

  side.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const c = t.closest<HTMLElement>('[data-copy]');
    if (c) { try { await navigator.clipboard.writeText(c.dataset.copy!); c.textContent = say('common.copied', {}, 'Copied'); } catch { /* the ID is on the invoice */ } }
    if (t.closest('[data-print]')) window.print();
  });
  side.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    const btn = f.querySelector('button')!;
    btn.disabled = true;
    try {
      track('invoice-paid-claim');
      inv = await publicCall<PublicInvoice>('invoice.claim', { token, reference: String(new FormData(f).get('reference') || '') });
      note = W.claimed;
      render();
    } catch (err) {
      btn.disabled = false;
      f.insertAdjacentHTML('afterbegin', `<p class="bk-error" role="alert">${esc(err instanceof Error ? err.message : String(err))}</p>`);
    }
  });

  const notFound = () => { paper.innerHTML = ''; side.innerHTML = `<p class="lede">${esc(W.notFound)}</p><div class="cta-row"><a class="btn btn-ghost" href="${pageHref('')}">Sarvakali</a></div>`; };
  if (!token) { notFound(); return; }
  publicCall<PublicInvoice>('invoice.get', { token }).then((x) => { inv = x; render(); }, notFound);
}
