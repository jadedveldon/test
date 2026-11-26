/**
 * Clients: everyone who has written or been added, and each one's profile: their details, what they have asked
 * about, every conversation (past, now and to come, with how many times you have met), notes, invoices, emails
 * and the whole history; with a new conversation or an invoice one tap away. Their data can be exported or erased.
 */
import { useEffect, useMemo, useState } from 'react';
import { ownerCall } from '../client';
import type { Client } from '../core/types';
import { rupees, totals } from '../core/money';
import { safeTz } from '../core/time';
import { NotesFor, ScheduleModal } from './Bookings';
import {
  Ago, Badge, BookingBadge, Btn, Busy, Confirm, Empty, Field, InvoiceBadge, Modal, Section, When, bookingsOf, clientOf, clientSummary, download,
  initials, invoicesOf, standingOf, useStudio,
} from './ui';

const ZONES = ['Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney'];

function ClientForm({ c, onClose }: { c?: Client; onClose: () => void }) {
  const { state, call, go } = useStudio();
  const [f, setF] = useState({ name: c?.name ?? '', email: c?.email ?? '', phone: c?.phone ?? '', tz: c?.tz ?? state.settings.ownerTz, pronouns: c?.pronouns ?? '', tags: (c?.tags ?? []).join(', ') });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const zones = [...new Set([f.tz, ...ZONES])];
  return (
    <Modal title={c ? `Edit ${c.name}` : 'Add a client'} onClose={onClose}>
      <form className="st-modal-body st-form" id="client-form" onSubmit={async (e) => {
        e.preventDefault();
        const payload = { ...f, tz: safeTz(f.tz), tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean) };
        const r = c ? await call('updateClient', { clientId: c.id, ...payload }, 'Saved') : await call<{ result: Client }>('addClient', payload, 'Client added');
        if (r) { onClose(); if (!c && 'result' in r) go(`/clients/${(r as { result: Client }).result.id}`); }
      }}>
        <Field label="Name"><input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input required type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone (optional)"><input type="tel" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Their time zone" hint="Times in emails are shown to them in this zone."><select value={f.tz} onChange={set('tz')}>{zones.map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}</select></Field>
        <Field label="Pronouns (optional; only if they told you)"><input value={f.pronouns} onChange={set('pronouns')} /></Field>
        <Field label="Tags (optional, separated by commas)" hint="For your own grouping: monthly, student, referred by…"><input value={f.tags} onChange={set('tags')} /></Field>
      </form>
      <footer className="st-modal-foot"><Btn onClick={onClose}>Cancel</Btn><button type="submit" form="client-form" className="st-btn st-btn-solid">{c ? 'Save' : 'Add the client'}</button></footer>
    </Modal>
  );
}

export function Clients() {
  const { state, go } = useStudio();
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'active' | 'archived'>('active');
  const [adding, setAdding] = useState(false);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.clients
      .filter((c) => (show === 'archived' ? c.archived : !c.archived))
      .filter((c) => !term || [c.name, c.email, c.phone, ...c.tags].join(' ').toLowerCase().includes(term))
      .map((c) => ({ c, s: clientSummary(state, c) }))
      .sort((a, b) => b.s.last.localeCompare(a.s.last));
  }, [state, q, show]);
  return (
    <div className="st-page">
      <header className="st-page-head"><h1>Clients</h1><div className="st-row"><input className="st-search" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" /><Btn kind="solid" onClick={() => setAdding(true)}>Add a client</Btn></div></header>
      <nav className="st-tabs" aria-label="Which clients">
        <button type="button" aria-current={show === 'active' ? 'page' : undefined} onClick={() => setShow('active')}>Current <b>{state.clients.filter((c) => !c.archived).length}</b></button>
        <button type="button" aria-current={show === 'archived' ? 'page' : undefined} onClick={() => setShow('archived')}>Archived</button>
      </nav>
      {rows.length ? (
        <ul className="st-clients">
          {rows.map(({ c, s }) => (
            <li key={c.id}>
              <button type="button" className="st-client-row" onClick={() => go(`/clients/${c.id}`)}>
                <span className="st-avatar" aria-hidden="true">{initials(c.name)}</span>
                <span className="st-client-main"><b>{c.name}</b><small>{c.email}</small></span>
                <span className="st-client-stat"><b>{s.held}</b><small>met</small></span>
                <span className="st-client-next">{s.next ? <><small>Next</small><When iso={s.next.start!} tz={state.settings.ownerTz} /></> : <small>Last <Ago iso={s.last} /></small>}</span>
                <span className="st-client-owed">{s.owed > 0 ? <Badge tone="gold">{rupees(s.owed)} to pay</Badge> : null}{c.tags.slice(0, 2).map((t) => <Badge key={t} tone="grey">{t}</Badge>)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <Empty>{q ? 'No one matches.' : 'Clients appear here when they send a request, or when you add one.'}</Empty>}
      {adding ? <ClientForm onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

export function ClientPage({ id }: { id: string }) {
  const { state, call, go } = useStudio();
  const c = clientOf(state, id);
  const [dlg, setDlg] = useState<'' | 'edit' | 'schedule' | 'erase' | 'archive'>('');
  const [tab, setTab] = useState<'sessions' | 'invoices' | 'emails' | 'history'>('sessions');
  if (!c) return <div className="st-page"><Empty>This client is no longer in the Studio.</Empty></div>;
  const s = clientSummary(state, c);
  const tz = state.settings.ownerTz;
  const bookings = bookingsOf(state, c.id).sort((a, b) => (b.start || b.createdAt).localeCompare(a.start || a.createdAt));
  const invoices = invoicesOf(state, c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const notes = state.notes.filter((n) => n.clientId === c.id);
  const mails = state.outbox.filter((m) => m.clientId === c.id);
  const activity = state.activity.filter((a) => a.clientId === c.id);
  const asked = [...new Set(bookings.flatMap((b) => b.services))];
  const words = bookings.filter((b) => b.topic).map((b) => ({ id: b.id, at: b.createdAt, text: b.topic }));
  return (
    <div className="st-page">
      <header className="st-page-head st-profile-head">
        <div className="st-row">
          <span className="st-avatar st-avatar-lg" aria-hidden="true">{initials(c.name)}</span>
          <div>
            <button type="button" className="st-back" onClick={() => history.back()}>← Back</button>
            <h1>{c.name}{c.archived ? <Badge tone="grey">Archived</Badge> : null}</h1>
            <p className="st-contact"><a href={`mailto:${c.email}`}>{c.email}</a>{c.phone ? <> · <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></> : null}{c.tz ? <> · {c.tz.replace('_', ' ')}</> : null}{c.pronouns ? <> · {c.pronouns}</> : null}</p>
            {c.tags.length ? <p>{c.tags.map((t) => <Badge key={t} tone="grey">{t}</Badge>)}</p> : null}
            <AccountLine email={c.email} />
          </div>
        </div>
        <div className="st-row st-row-wrap">
          <Btn kind="solid" onClick={() => setDlg('schedule')}>New conversation</Btn>
          <Btn onClick={() => go(`/invoices/new?client=${c.id}`)}>New invoice</Btn>
          <Btn onClick={() => setDlg('edit')}>Edit</Btn>
        </div>
      </header>

      <dl className="st-stats">
        <div><dt>Met</dt><dd>{s.held}</dd></div>
        <div><dt>Requests</dt><dd>{s.requests}</dd></div>
        <div><dt>Next</dt><dd>{s.next ? <When iso={s.next.start!} tz={tz} /> : '—'}</dd></div>
        <div><dt>Paid</dt><dd>{rupees(s.paid)}</dd></div>
        <div><dt>To pay</dt><dd className={s.owed ? 'is-owed' : ''}>{rupees(s.owed)}</dd></div>
        {s.missed ? <div><dt>Missed</dt><dd>{s.missed}</dd></div> : null}
      </dl>

      <div className="st-grid-2">
        <div>
          <Section title="Conversations" aside={<nav className="st-tabs st-tabs-sm" aria-label="Show">
            {(['sessions', 'invoices', 'emails', 'history'] as const).map((t) => <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{{ sessions: 'Sessions', invoices: 'Invoices', emails: 'Emails', history: 'History' }[t]}</button>)}
          </nav>}>
            {tab === 'sessions' ? (bookings.length ? (
              <ul className="st-list">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <button type="button" className="st-list-row" onClick={() => go(`/requests/${b.id}`)}>
                      <span>{b.start ? <When iso={b.start} tz={tz} /> : b.options[0] ? <>Offered: <When iso={b.options[0]} tz={tz} />{b.options.length > 1 ? ` +${b.options.length - 1}` : ''}</> : 'No time'}</span>
                      <span className="st-list-sub">{[...b.services, b.topic].filter(Boolean).join(' · ').slice(0, 90) || '—'}</span>
                      <BookingBadge b={b} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <Empty>No conversations yet.</Empty>) : null}
            {tab === 'invoices' ? (invoices.length ? (
              <ul className="st-list">
                {invoices.map((i) => (
                  <li key={i.id}><button type="button" className="st-list-row" onClick={() => go(`/invoices/${i.id}`)}><span>{i.number}</span><span className="st-list-sub">{rupees(totals(i).total)}</span><InvoiceBadge st={standingOf(state, i)} /></button></li>
                ))}
              </ul>
            ) : <Empty>No invoices yet.</Empty>) : null}
            {tab === 'emails' ? (mails.length ? (
              <ul className="st-list">{mails.map((m) => <li key={m.id}><button type="button" className="st-list-row" onClick={() => go(`/outbox/${m.id}`)}><span>{m.subject}</span><span className="st-list-sub"><Ago iso={m.at} /></span><Badge tone={m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'grey'}>{m.status}</Badge></button></li>)}</ul>
            ) : <Empty>No emails yet.</Empty>) : null}
            {tab === 'history' ? (activity.length ? <ol className="st-timeline">{activity.map((a) => <li key={a.id}>{a.text} <Ago iso={a.at} /></li>)}</ol> : <Empty>Nothing yet.</Empty>) : null}
          </Section>
          <NotesFor clientId={c.id} notes={notes} />
        </div>
        <aside>
          <Section title="What they have asked about">
            {asked.length ? <p className="st-chips">{asked.map((x) => <Badge key={x}>{x}</Badge>)}</p> : <p className="st-hint">No services named.</p>}
            {words.length ? <ul className="st-words">{words.map((w) => <li key={w.id}><p className="st-quote">“{w.text}”</p><Ago iso={w.at} /></li>)}</ul> : null}
          </Section>
          <Section title="Their data">
            <p className="st-hint">Clients may ask for a copy of what you keep, or for it to be erased.</p>
            <div className="st-row st-row-wrap">
              <Busy small onClick={async () => { const r = await call('exportClient', { clientId: c.id }); if (r) download(`${c.name.replace(/\W+/g, '-').toLowerCase()}-data.json`, JSON.stringify(r, null, 2)); }}>Download a copy</Busy>
              <Btn small onClick={() => setDlg('archive')}>{c.archived ? 'Unarchive' : 'Archive'}</Btn>
              <Btn small kind="danger" onClick={() => setDlg('erase')}>Erase</Btn>
            </div>
          </Section>
        </aside>
      </div>

      {dlg === 'edit' ? <ClientForm c={c} onClose={() => setDlg('')} /> : null}
      {dlg === 'schedule' ? <ScheduleModal clientId={c.id} onClose={() => setDlg('')} /> : null}
      {dlg === 'archive' ? <Confirm title={c.archived ? 'Unarchive' : 'Archive this client'} text={c.archived ? 'They come back to the current list.' : 'They leave the current list; nothing is deleted, and if they write again they come back by themselves.'} yes={c.archived ? 'Unarchive' : 'Archive'} onYes={() => call('updateClient', { clientId: c.id, archived: !c.archived }, c.archived ? 'Unarchived' : 'Archived')} onClose={() => setDlg('')} /> : null}
      {dlg === 'erase' ? (
        <Confirm title={`Erase ${c.name}`} danger yes="Erase for good" onYes={async () => { if (await call('eraseClient', { clientId: c.id }, 'Erased')) go('/clients'); }} onClose={() => setDlg('')}
          text={<><p>Their conversations, notes and emails are deleted, and cannot be brought back.</p><p>Sent invoices stay, with the name shortened and the contact details removed, because tax records must be kept.</p><p>Download a copy first if they asked for one.</p></>} />
      ) : null}
    </div>
  );
}

/** whether the client has a visitor account (My space); their practice itself is never shown to the Studio */
function AccountLine({ email }: { email: string }) {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    setHas(null);
    ownerCall<{ has: boolean }>('accounts.has', { email }).then((r) => { if (live) setHas(!!r?.has); }, () => { if (live) setHas(null); });
    return () => { live = false; };
  }, [email]);
  if (has === null) return null;
  return <p className="st-hint" data-account={has ? 'yes' : 'no'}>{has ? 'Has an account: sees their conversations and invoices in My space.' : 'No account on the site.'}</p>;
}
