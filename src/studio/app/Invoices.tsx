/**
 * Invoices: all of them with how each stands (draft, sent, part paid, overdue, paid, cancelled) and what is owed;
 * and one invoice to write, send, follow up and close: lines (from the session's services), dates, discount, tax,
 * a note, the pillar's colours; a live preview with the UPI QR code; the client's own link; payments (UPI, cash,
 * bank) and the client's "I have paid" with their reference; reminders; print or save as PDF.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Invoice, InvoiceLine, PaymentMethod } from '../core/types';
import { rupees, standing, totals, type Standing } from '../core/money';
import { paperHtml, THEMES } from '../core/paper';
import { dayIn, longDay } from '../core/time';
import { allServices } from '../../data/site';
import { pageHref } from '../client';
import { mailNote } from './Bookings';
import {
  Ago, Badge, Btn, Busy, Confirm, Empty, Field, InvoiceBadge, Modal, Section, When, after, clientOf, copyText, standingOf, today, useStudio,
} from './ui';

const SERVICES = [...allServices].sort();

const FILTERS: { key: string; label: string; test: (st: Standing, i: Invoice) => boolean }[] = [
  { key: 'open', label: 'Open', test: (st) => ['unpaid', 'part-paid', 'overdue'].includes(st) },
  { key: 'claims', label: 'Paid, to check', test: (_st, i) => !!i.claim && i.status === 'sent' },
  { key: 'draft', label: 'Drafts', test: (st) => st === 'draft' },
  { key: 'paid', label: 'Paid', test: (st) => st === 'paid' },
  { key: 'void', label: 'Cancelled', test: (st) => st === 'void' },
  { key: 'all', label: 'All', test: () => true },
];

export function Invoices({ filter = 'open' }: { filter?: string }) {
  const { state, go } = useStudio();
  const [q, setQ] = useState('');
  const [choosing, setChoosing] = useState(false);
  const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
  const t = today(state);
  const rows = useMemo(() => state.invoices
    .map((i) => ({ i, st: standing(i, t), c: clientOf(state, i.clientId) }))
    .filter(({ i, st }) => f.test(st, i))
    .filter(({ i, c }) => !q.trim() || `${i.number} ${c?.name} ${c?.email}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.i.issueDate.localeCompare(a.i.issueDate) || b.i.number.localeCompare(a.i.number)), [state, f, q, t]);
  const open = state.invoices.filter((i) => ['unpaid', 'part-paid', 'overdue'].includes(standing(i, t)));
  const owed = open.reduce((a, i) => a + totals(i).due, 0);
  const month = t.slice(0, 7);
  const paidMonth = state.invoices.flatMap((i) => i.payments).filter((p) => p.date.startsWith(month)).reduce((a, p) => a + p.amount, 0);
  const overdue = open.filter((i) => standing(i, t) === 'overdue');
  return (
    <div className="st-page">
      <header className="st-page-head"><h1>Invoices</h1><div className="st-row"><input className="st-search" type="search" placeholder="Number or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invoices" /><Btn kind="solid" onClick={() => setChoosing(true)}>New invoice</Btn></div></header>
      <dl className="st-stats">
        <div><dt>Still to be paid</dt><dd className={owed ? 'is-owed' : ''}>{rupees(owed)}</dd></div>
        <div><dt>Overdue</dt><dd>{overdue.length ? `${overdue.length} · ${rupees(overdue.reduce((a, i) => a + totals(i).due, 0))}` : '—'}</dd></div>
        <div><dt>Received this month</dt><dd>{rupees(paidMonth)}</dd></div>
      </dl>
      <nav className="st-tabs" aria-label="Which invoices">
        {FILTERS.map((x) => { const n = state.invoices.filter((i) => x.test(standing(i, t), i)).length; return <button key={x.key} type="button" aria-current={x.key === f.key ? 'page' : undefined} onClick={() => go(`/invoices?filter=${x.key}`)}>{x.label}{n && x.key !== 'all' && x.key !== 'paid' && x.key !== 'void' ? <b>{n}</b> : null}</button>; })}
      </nav>
      {rows.length ? (
        <ul className="st-list st-invoices">
          {rows.map(({ i, st, c }) => (
            <li key={i.id}>
              <button type="button" className="st-list-row" onClick={() => go(`/invoices/${i.id}`)}>
                <span><b>{i.number}</b> · {c?.name ?? '—'}</span>
                <span className="st-list-sub">{longDay(i.issueDate)}{i.dueDate && st !== 'paid' && st !== 'void' ? ` · due ${longDay(i.dueDate)}` : ''}</span>
                <span className="st-amount">{rupees(totals(i).total)}</span>
                <span>{i.claim && i.status === 'sent' ? <Badge tone="blue">They say paid</Badge> : null}<InvoiceBadge st={st} /></span>
              </button>
            </li>
          ))}
        </ul>
      ) : <Empty>{f.key === 'open' ? 'No open invoices. Make one from a client’s page, or after a conversation.' : 'Nothing here.'}</Empty>}
      {choosing ? <ChooseClient onClose={() => setChoosing(false)} /> : null}
    </div>
  );
}

function ChooseClient({ onClose }: { onClose: () => void }) {
  const { state, go } = useStudio();
  const [id, setId] = useState(state.clients.find((c) => !c.archived)?.id ?? '');
  return (
    <Modal title="A new invoice" onClose={onClose}>
      <div className="st-modal-body">
        {state.clients.length ? <Field label="For"><select value={id} onChange={(e) => setId(e.target.value)}>{state.clients.filter((c) => !c.archived).sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}</select></Field> : <p>Add a client first (Clients → Add a client).</p>}
      </div>
      <footer className="st-modal-foot"><Btn onClick={onClose}>Cancel</Btn><Btn kind="solid" disabled={!id} onClick={() => { onClose(); go(`/invoices/new?client=${id}`); }}>Continue</Btn></footer>
    </Modal>
  );
}

/** /invoices/new?client=…&booking=…: make the draft, then open it */
export function NewInvoice({ clientId, bookingId }: { clientId: string; bookingId?: string }) {
  const { state, call, go } = useStudio();
  useEffect(() => {
    let live = true;
    (async () => {
      // from a client's page: start from their latest conversation not yet on an invoice
      const invoiced = new Set(state.invoices.filter((i) => i.status !== 'void').flatMap((i) => i.bookingIds));
      const latest = state.bookings.filter((b) => b.clientId === clientId && (b.status === 'completed' || b.status === 'confirmed') && !invoiced.has(b.id))
        .sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''))[0];
      const ids = bookingId ? [bookingId] : latest ? [latest.id] : [];
      const r = await call<{ result: Invoice }>('createInvoice', { clientId, bookingIds: ids }, (x) => `Draft ${x.result.number} made`);
      if (live) go(r ? `/invoices/${r.result.id}` : '/invoices');
    })();
    return () => { live = false; };
  }, [clientId, bookingId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="st-page"><Empty>Making the draft…</Empty></div>;
}

function PaymentModal({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const { state, call } = useStudio();
  const due = totals(inv).due;
  const [f, setF] = useState({ amount: String(due), date: dayIn(state.settings.ownerTz), method: 'upi' as PaymentMethod, reference: inv.claim?.reference ?? '', receipt: true });
  return (
    <Modal title="Record a payment" onClose={onClose}>
      <div className="st-modal-body st-form">
        {inv.claim ? <p className="st-callout">They said they paid <Ago iso={inv.claim.at} />{inv.claim.reference ? <>, reference <b>{inv.claim.reference}</b></> : null}. Check your UPI app before recording it.</p> : null}
        <Field label="Amount (₹)" hint={`Still to pay: ${rupees(due)}`}><input type="number" min="0" step="0.01" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Date received"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="How"><select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })}><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></Field>
        <Field label="Reference (UTR), optional"><input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
        <label className="st-check"><input type="checkbox" checked={f.receipt} onChange={(e) => setF({ ...f, receipt: e.target.checked })} /> When it is paid in full, email them a receipt</label>
      </div>
      <footer className="st-modal-foot"><Btn onClick={onClose}>Cancel</Btn><Busy kind="solid" onClick={async () => { if (await call('recordPayment', { invoiceId: inv.id, amount: Number(f.amount), date: f.date, method: f.method, reference: f.reference, receipt: f.receipt }, (r) => mailNote(r, 'Payment recorded'))) onClose(); }}>Record it</Busy></footer>
    </Modal>
  );
}

export function InvoicePage({ id }: { id: string }) {
  const { state, call, go } = useStudio();
  const inv = state.invoices.find((x) => x.id === id);
  const [draft, setDraft] = useState<Invoice | null>(inv ? structuredClone(inv) : null);
  const [dlg, setDlg] = useState<'' | 'pay' | 'void' | 'delete' | 'send'>('');
  // when the saved invoice changes (sent, paid), start from it again
  useEffect(() => { if (inv) setDraft(structuredClone(inv)); }, [inv?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!inv || !draft) return <div className="st-page"><Empty>This invoice is no longer in the Studio.</Empty></div>;
  const c = clientOf(state, inv.clientId);
  const st = standingOf(state, inv);
  const t = totals(draft);
  const s = state.settings;
  const editable = inv.status !== 'void' && inv.status !== 'paid';
  const changed = JSON.stringify(pick(draft)) !== JSON.stringify(pick(inv));
  const link = new URL(`${pageHref('invoice')}?t=${inv.token}`, location.href).href;
  const sessions = state.bookings.filter((b) => b.clientId === inv.clientId && (b.status === 'completed' || b.status === 'confirmed'));
  const setLine = (i: number, patch: Partial<InvoiceLine>) => setDraft({ ...draft, lines: draft.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const save = () => call('updateInvoice', { invoiceId: inv.id, ...pick(draft) }, 'Saved');
  const paper = paperHtml({
    number: draft.number, issueDate: draft.issueDate, dueDate: draft.dueDate, lines: draft.lines, theme: draft.theme, note: draft.note, taxLabel: draft.taxLabel, taxRate: draft.taxRate,
    totals: t, standing: changed ? standing(draft, today(state)) : st, paidAt: inv.paidAt,
    client: { name: c?.name ?? '', email: c?.email }, from: { name: s.practiceName, upiId: s.upiId, upiName: s.upiName, address: s.address, gstin: s.gstin, email: s.ownerEmail, phone: s.phone },
  });
  return (
    <div className="st-page">
      <header className="st-page-head">
        <div><button type="button" className="st-back" onClick={() => history.back()}>← Back</button><h1>{inv.number} <InvoiceBadge st={st} /></h1><p className="st-contact">For <button type="button" className="st-link" onClick={() => go(`/clients/${inv.clientId}`)}>{c?.name}</button> · {rupees(totals(inv).total)}{totals(inv).paid ? ` · ${rupees(totals(inv).due)} still to pay` : ''}</p></div>
        <div className="st-row st-row-wrap">
          {inv.status === 'draft' ? <Btn kind="solid" disabled={!s.upiId} title={s.upiId ? '' : 'Add your UPI ID in Settings first'} onClick={() => setDlg('send')}>Send to {c?.name.split(' ')[0]}</Btn> : null}
          {['unpaid', 'part-paid', 'overdue'].includes(st) ? <>
            <Btn kind="solid" onClick={() => setDlg('pay')}>Record a payment</Btn>
            <Busy onClick={() => call('remindInvoice', { invoiceId: inv.id }, (r) => mailNote(r, 'Reminder sent'))}>Send a reminder</Busy>
          </> : null}
          <Btn onClick={() => window.open(link, '_blank', 'noopener')} disabled={inv.status === 'draft'} title={inv.status === 'draft' ? 'The client’s page opens once it is sent' : ''}>Their page</Btn>
          <Btn onClick={() => printPaper(paper)}>Print or PDF</Btn>
        </div>
      </header>

      {inv.claim && inv.status === 'sent' ? (
        <div className="st-callout st-callout-blue">
          <p><b>{c?.name} says they have paid</b> (<Ago iso={inv.claim.at} />){inv.claim.reference ? <> · reference <code>{inv.claim.reference}</code></> : null}{inv.claim.note ? <> · “{inv.claim.note}”</> : null}. Check your UPI app, then:</p>
          <div className="st-row"><Busy kind="solid" small onClick={() => call('recordPayment', { invoiceId: inv.id, full: true, reference: inv.claim?.reference }, (r) => mailNote(r, 'Marked paid, and a receipt sent'))}>Yes, it arrived: mark paid</Busy><Btn small onClick={() => setDlg('pay')}>Record a different amount</Btn></div>
        </div>
      ) : null}

      <div className="st-invoice-layout">
        <div className="st-invoice-form">
          <Section title="Lines" aside={editable ? <Btn small onClick={() => setDraft({ ...draft, lines: [...draft.lines, { description: '', qty: 1, rate: 0 }] })}>Add a line</Btn> : null}>
            <datalist id="st-services">{SERVICES.map((x) => <option key={x} value={x} />)}</datalist>
            <div className="st-lines">
              <div className="st-line st-line-head" aria-hidden="true"><span>Service</span><span>Qty</span><span>Rate (₹)</span><span /></div>
              {draft.lines.map((l, i) => (
                <div className="st-line" key={i}>
                  <input aria-label={`Line ${i + 1}: service`} list="st-services" value={l.description} disabled={!editable} onChange={(e) => setLine(i, { description: e.target.value })} />
                  <input aria-label={`Line ${i + 1}: quantity`} type="number" min="0" step="1" value={l.qty} disabled={!editable} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
                  <input aria-label={`Line ${i + 1}: rate in rupees`} type="number" min="0" step="1" inputMode="decimal" value={l.rate} disabled={!editable} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} />
                  {editable && draft.lines.length > 1 ? <button type="button" className="st-x" aria-label={`Remove line ${i + 1}`} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })}>×</button> : <span />}
                </div>
              ))}
            </div>
            <div className="st-form st-form-2">
              <Field label="Discount (₹)"><input type="number" min="0" value={draft.discount} disabled={!editable} onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })} /></Field>
              <Field label="Tax (%)" hint="Leave 0 if you do not charge GST."><input type="number" min="0" max="50" step="0.5" value={draft.taxRate} disabled={!editable} onChange={(e) => setDraft({ ...draft, taxRate: Number(e.target.value) })} /></Field>
              {draft.taxRate ? <Field label="Tax name"><input value={draft.taxLabel ?? 'GST'} disabled={!editable} onChange={(e) => setDraft({ ...draft, taxLabel: e.target.value })} /></Field> : null}
            </div>
          </Section>
          <Section title="Details">
            <div className="st-form st-form-2">
              <Field label="Issued"><input type="date" value={draft.issueDate} disabled={inv.status === 'void'} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} /></Field>
              <Field label="Due (optional)"><input type="date" value={draft.dueDate ?? ''} disabled={inv.status === 'void'} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || undefined })} /></Field>
              <Field label="Colours"><select value={draft.theme} disabled={inv.status === 'void'} onChange={(e) => setDraft({ ...draft, theme: e.target.value })}>{Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></Field>
            </div>
            <Field label="A note on the invoice (optional)"><textarea rows={2} value={draft.note ?? ''} disabled={inv.status === 'void'} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Thank you for your trust." /></Field>
            {sessions.length ? (
              <fieldset className="st-fieldset"><legend>For the conversations</legend>
                {sessions.map((b) => (
                  <label key={b.id} className="st-check"><input type="checkbox" disabled={inv.status === 'void'} checked={draft.bookingIds.includes(b.id)} onChange={(e) => setDraft({ ...draft, bookingIds: e.target.checked ? [...draft.bookingIds, b.id] : draft.bookingIds.filter((x) => x !== b.id) })} /> <When iso={b.start!} tz={s.ownerTz} /></label>
                ))}
              </fieldset>
            ) : null}
            <div className="st-row">{changed ? <Busy kind="solid" onClick={save}>Save the changes</Busy> : <span className="st-hint">{inv.status === 'draft' ? 'A draft: the client sees nothing until you send it.' : 'Saved.'}</span>}{changed ? <Btn onClick={() => setDraft(structuredClone(inv))}>Undo the changes</Btn> : null}</div>
          </Section>
          {inv.payments.length ? (
            <Section title="Payments">
              <ul className="st-list">{inv.payments.map((p) => <li key={p.id} className="st-list-row st-list-static"><span>{rupees(p.amount)} · {p.method.toUpperCase()}</span><span className="st-list-sub">{longDay(p.date)}{p.reference ? ` · ${p.reference}` : ''}</span><button type="button" className="st-link st-link-danger" onClick={() => { if (confirm('Remove this payment?')) call('deletePayment', { invoiceId: inv.id, paymentId: p.id }, 'Payment removed'); }}>Remove</button></li>)}</ul>
            </Section>
          ) : null}
          <Section title="Their link" aside={<span className="st-hint">To pay by UPI and see how it stands</span>}>
            <div className="st-row"><code className="st-code">{inv.status === 'draft' ? 'Opens once the invoice is sent' : link}</code>{inv.status !== 'draft' ? <Btn small onClick={async () => { await copyText(link); }}>Copy</Btn> : null}</div>
          </Section>
          <Section title="Everything else">
            <div className="st-row st-row-wrap">
              {inv.status === 'sent' ? <Busy onClick={() => call('sendInvoice', { invoiceId: inv.id }, (r) => mailNote(r, 'Sent again'))}>Email it again</Busy> : null}
              {inv.status === 'sent' && !inv.payments.length ? null : null}
              <Busy onClick={async () => { const r = await call<{ result: Invoice }>('duplicateInvoice', { invoiceId: inv.id }, (x) => `Copied as ${x.result.number}`); if (r) go(`/invoices/${r.result.id}`); }}>Copy as a new draft</Busy>
              {inv.status === 'paid' || inv.status === 'void' ? <Busy onClick={() => call('reopenInvoice', { invoiceId: inv.id }, 'Reopened')}>Reopen</Busy> : null}
              {inv.status === 'draft' ? <Btn kind="danger" onClick={() => setDlg('delete')}>Delete the draft</Btn> : inv.status !== 'void' ? <Btn kind="danger" onClick={() => setDlg('void')}>Cancel the invoice</Btn> : null}
            </div>
          </Section>
          <Section title="What happened"><ol className="st-timeline">{[...inv.history].reverse().map((h, i) => <li key={i}><span className={`st-who st-who-${h.by}`}>{h.by === 'client' ? c?.name.split(' ')[0] : 'You'}</span> {after(h.what)} <Ago iso={h.at} /></li>)}</ol></Section>
        </div>
        <div className="st-invoice-preview" aria-label="How the invoice looks"><div dangerouslySetInnerHTML={{ __html: paper }} /></div>
      </div>

      {dlg === 'pay' ? <PaymentModal inv={inv} onClose={() => setDlg('')} /> : null}
      {dlg === 'send' ? <Confirm title={`Send ${inv.number}`} yes="Send it" onClose={() => setDlg('')} onYes={async () => { if (changed) await save(); await call('sendInvoice', { invoiceId: inv.id }, (r) => mailNote(r, `Sent to ${c?.name}`)); }} text={`${c?.name} gets an email with a link to the invoice (${rupees(t.total)}), where they can pay by UPI and tell you when they have.`} /> : null}
      {dlg === 'void' ? <Confirm title={`Cancel ${inv.number}`} danger yes="Cancel the invoice" onClose={() => setDlg('')} onYes={() => call('voidInvoice', { invoiceId: inv.id }, 'Cancelled')} text="Nothing will be owed on it, and its page will say so. Its number stays used, so your records stay in order." /> : null}
      {dlg === 'delete' ? <Confirm title={`Delete ${inv.number}`} danger yes="Delete" onClose={() => setDlg('')} onYes={async () => { if (await call('deleteDraft', { invoiceId: inv.id }, 'Draft deleted')) go('/invoices?filter=draft'); }} text="The draft goes. (Its number is not used again.)" /> : null}
    </div>
  );
}

const pick = (i: Invoice) => ({ lines: i.lines, discount: i.discount, taxRate: i.taxRate, taxLabel: i.taxLabel, note: i.note, theme: i.theme, issueDate: i.issueDate, dueDate: i.dueDate ?? '', bookingIds: i.bookingIds });

/** print just the invoice, on A4 */
function printPaper(html: string) {
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) return;
  const css = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice</title>${css}<style>body{margin:0;padding:24px;background:#fff}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}
