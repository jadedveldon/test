/**
 * Requests and conversations: the card for a request (confirm one of the client's times in one tap, offer others,
 * or decline), the page for a booking at every stage, and the dialogs that go with them.
 */
import { useMemo, useState } from 'react';
import type { Booking } from '../core/types';
import { googleCalendarLink } from '../core/ics';
import { relative, whenZ } from '../core/time';
import {
  Ago, Badge, BookingBadge, Btn, Busy, Confirm, Empty, Field, Modal, Section, TimesPicker, When, after, clientOf, clientSummary, copyText,
  needsReply, toWrapUp, useStudio, waitingClient,
} from './ui';

const DURATIONS = [30, 45, 60, 75, 90, 120];

/* ================================================================ the dialogs */

export function ProposeModal({ b, onClose, title = 'Offer other times' }: { b: Booking; onClose: () => void; title?: string }) {
  const { state, call } = useStudio();
  const [times, setTimes] = useState<string[]>([]);
  const [message, setMessage] = useState(b.previousStart ? 'I need to move our conversation, I am sorry. Would one of these suit you?' : 'Thank you for writing. Would one of these times suit you?');
  const c = clientOf(state, b.clientId);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="st-modal-body">
        <p>{c?.name} gets an email with these times and chooses one; it is confirmed straight away, with its meeting link.</p>
        <TimesPicker tz={state.settings.ownerTz} value={times} onChange={setTimes} clientTz={b.clientTz} />
        <Field label="A note with the times (optional)"><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      </div>
      <footer className="st-modal-foot">
        <Btn onClick={onClose}>Not now</Btn>
        <Busy kind="solid" disabled={!times.filter(Boolean).length} onClick={async () => { if (await call('propose', { bookingId: b.id, times: times.filter(Boolean), message }, (r) => mailNote(r, `Times sent to ${c?.name}`))) onClose(); }}>Send the times</Busy>
      </footer>
    </Modal>
  );
}

export function DeclineModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  const { state, call } = useStudio();
  const c = clientOf(state, b.clientId);
  const [message, setMessage] = useState('I am not able to take this on at the moment, and I would not want you to wait. I hope you find the right support.');
  return (
    <Modal title="Decline this request" onClose={onClose}>
      <div className="st-modal-body">
        <p>{c?.name} gets a short, kind email with your words below.</p>
        <Field label="Your words"><textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      </div>
      <footer className="st-modal-foot">
        <Btn onClick={onClose}>Not now</Btn>
        <Busy kind="danger" onClick={async () => { if (await call('decline', { bookingId: b.id, message }, 'Declined, and they have been told')) onClose(); }}>Decline and tell them</Busy>
      </footer>
    </Modal>
  );
}

export function CancelModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  const { state, call } = useStudio();
  const c = clientOf(state, b.clientId);
  const [message, setMessage] = useState('');
  const [silent, setSilent] = useState(false);
  return (
    <Modal title={b.status === 'confirmed' ? 'Cancel this conversation' : 'Close this request'} onClose={onClose}>
      <div className="st-modal-body">
        <p>{b.status === 'confirmed' ? `${c?.name} is told, and the calendar event is removed.` : `The request is closed.`}</p>
        <Field label="A message for them (optional)"><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I am so sorry; something has come up…" /></Field>
        {b.status !== 'confirmed' ? <label className="st-check"><input type="checkbox" checked={silent} onChange={(e) => setSilent(e.target.checked)} /> Close without telling them (for spam)</label> : null}
      </div>
      <footer className="st-modal-foot">
        <Btn onClick={onClose}>Keep it</Btn>
        <Busy kind="danger" onClick={async () => { if (await call('cancel', { bookingId: b.id, message, silent }, silent ? 'Closed' : 'Cancelled, and they have been told')) onClose(); }}>{b.status === 'confirmed' ? 'Cancel the conversation' : 'Close it'}</Busy>
      </footer>
    </Modal>
  );
}

export function LinkModal({ b, onClose }: { b: Booking; onClose: () => void }) {
  const { call } = useStudio();
  const [url, setUrl] = useState(b.meetUrl ?? '');
  const [notify, setNotify] = useState(true);
  return (
    <Modal title="The meeting link" onClose={onClose}>
      <div className="st-modal-body">
        <p>Paste a Google Meet (or any) link. With Google connected in Settings, a Meet link is made for each confirmed conversation by itself.</p>
        <Field label="Link"><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" /></Field>
        {b.status === 'confirmed' ? <label className="st-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Send them the confirmation again, with this link</label> : null}
      </div>
      <footer className="st-modal-foot">
        <Btn onClick={onClose}>Not now</Btn>
        <Busy kind="solid" onClick={async () => { if (await call('setMeetLink', { bookingId: b.id, url, notify }, 'Link saved')) onClose(); }}>Save the link</Busy>
      </footer>
    </Modal>
  );
}

/** a new conversation for a client: offer times, or confirm one already agreed */
export function ScheduleModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { state, call, go } = useStudio();
  const c = clientOf(state, clientId)!;
  const [times, setTimes] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [confirmNow, setConfirmNow] = useState(false);
  const [duration, setDuration] = useState(state.settings.defaultDurationMin);
  return (
    <Modal title={`A new conversation with ${c.name}`} onClose={onClose}>
      <div className="st-modal-body">
        <div className="st-seg" role="radiogroup" aria-label="How">
          <button type="button" role="radio" aria-checked={!confirmNow} onClick={() => setConfirmNow(false)}>Offer times; they choose</button>
          <button type="button" role="radio" aria-checked={confirmNow} onClick={() => setConfirmNow(true)}>Already agreed: confirm it</button>
        </div>
        <TimesPicker tz={state.settings.ownerTz} value={times} onChange={setTimes} max={confirmNow ? 1 : 3} clientTz={c.tz} />
        <Field label="Length"><select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}</select></Field>
        <Field label="What it is about (for you and them)"><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="A follow-up reading" /></Field>
        <Field label="A note in the email (optional)"><textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      </div>
      <footer className="st-modal-foot">
        <Btn onClick={onClose}>Not now</Btn>
        <Busy kind="solid" disabled={!times.filter(Boolean).length} onClick={async () => {
          const r = await call<{ result: Booking }>('newBooking', { clientId, times: times.filter(Boolean), topic, message, confirmNow, durationMin: duration }, (x) => mailNote(x, confirmNow ? 'Confirmed, and they have been told' : 'Times sent'));
          if (r) { onClose(); go(`/requests/${r.result.id}`); }
        }}>{confirmNow ? 'Confirm and tell them' : 'Send the times'}</Busy>
      </footer>
    </Modal>
  );
}

/** what to say after an action, from what actually happened (emails sent or only saved, the Meet link) */
export function mailNote(r: { outcome?: { mails: { status: string; kind: string }[]; calendar?: { ok: boolean; meetUrl?: string; error?: string } } }, base: string) {
  const o = r?.outcome;
  if (!o) return base;
  const toClient = o.mails.filter((m) => m.kind.startsWith('client.'));
  const failed = toClient.some((m) => m.status === 'failed');
  const saved = toClient.length && toClient.every((m) => m.status === 'saved');
  let s = base;
  if (o.calendar && !o.calendar.ok) s += '. Google Calendar could not be reached; add a meeting link by hand.';
  else if (o.calendar?.meetUrl) s += ', with a Meet link';
  if (failed) s += '. The email could not be sent: see the Outbox.';
  else if (saved) s += '. (Email is not set up, so the email is in the Outbox to send by hand.)';
  return s;
}

/* ================================================================ the request card */

export function RequestCard({ b, compact }: { b: Booking; compact?: boolean }) {
  const { state, call, go } = useStudio();
  const c = clientOf(state, b.clientId);
  const [dlg, setDlg] = useState<'' | 'propose' | 'decline' | 'cancel'>('');
  const [duration, setDuration] = useState(b.durationMin);
  if (!c) return null;
  const sum = clientSummary(state, c);
  const tz = state.settings.ownerTz;
  const past = (t: string) => Date.parse(t) < Date.now();
  return (
    <article className={`st-card st-req${compact ? ' st-req-compact' : ''}`}>
      <header className="st-req-head">
        <button type="button" className="st-link st-req-name" onClick={() => go(`/clients/${c.id}`)}>{c.name}</button>
        <BookingBadge b={b} />
        <span className="st-req-meta">{sum.held ? `Met ${sum.held} time${sum.held > 1 ? 's' : ''}` : 'New'} · <Ago iso={b.updatedAt} /></span>
      </header>
      {b.services.length || b.topic ? (
        <div className="st-req-asked">
          {b.services.length ? <p className="st-chips">{b.services.map((s) => <Badge key={s}>{s}</Badge>)}</p> : null}
          {b.topic ? <p className="st-quote">“{b.topic}”</p> : null}
        </div>
      ) : null}
      {b.message && b.optionsBy === 'client' ? <p className="st-quote st-quote-note">Their note: “{b.message}”</p> : null}
      {needsReply(b) ? (
        <>
          <p className="st-req-label">{b.previousStart ? `Asked to move from ${whenZ(b.previousStart, tz)}. Times they offered:` : 'Times they offered:'}</p>
          <ul className="st-slots">
            {b.options.map((o) => (
              <li key={o} className={past(o) ? 'is-past' : ''}>
                <When iso={o} tz={tz} also={b.clientTz} />
                {past(o) ? <Badge tone="grey">Passed</Badge> : (
                  <Busy kind="solid" small onClick={() => call('confirm', { bookingId: b.id, start: o, durationMin: duration }, (r) => mailNote(r, `Confirmed with ${c.name}`))}>Confirm this time</Busy>
                )}
              </li>
            ))}
          </ul>
          <div className="st-row">
            <label className="st-inline">Length <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}</select></label>
            <Btn small onClick={() => setDlg('propose')}>Offer other times</Btn>
            <Btn small kind="quiet" onClick={() => setDlg(b.previousStart ? 'cancel' : 'decline')}>{b.previousStart ? 'Cancel' : 'Decline'}</Btn>
            {!compact ? null : <Btn small kind="quiet" onClick={() => go(`/requests/${b.id}`)}>Open</Btn>}
          </div>
        </>
      ) : waitingClient(b) ? (
        <>
          <p className="st-req-label">You offered:</p>
          <ul className="st-slots st-slots-plain">{b.options.map((o) => <li key={o}><When iso={o} tz={tz} also={b.clientTz} /></li>)}</ul>
          <div className="st-row"><Btn small onClick={() => go(`/requests/${b.id}`)}>Open</Btn></div>
        </>
      ) : b.status === 'confirmed' && b.start ? (
        <div className="st-req-confirmed">
          <p><When iso={b.start} tz={tz} also={b.clientTz} /> · {b.durationMin} min · <span className="st-ago">{relative(b.start)}</span></p>
          <div className="st-row">
            {b.meetUrl ? <a className="st-btn st-btn-solid st-btn-sm" href={b.meetUrl} target="_blank" rel="noopener">Join</a> : <Badge tone="amber">No meeting link yet</Badge>}
            {toWrapUp(b) ? <>
              <Busy small kind="solid" onClick={() => call('wrapUp', { bookingId: b.id, outcome: 'completed' }, 'Marked as held')}>It took place</Busy>
              <Busy small onClick={() => call('wrapUp', { bookingId: b.id, outcome: 'no_show' }, 'Marked as missed')}>They did not come</Busy>
            </> : null}
            <Btn small kind="quiet" onClick={() => go(`/requests/${b.id}`)}>Open</Btn>
          </div>
        </div>
      ) : null}
      {dlg === 'propose' ? <ProposeModal b={b} onClose={() => setDlg('')} /> : null}
      {dlg === 'decline' ? <DeclineModal b={b} onClose={() => setDlg('')} /> : null}
      {dlg === 'cancel' ? <CancelModal b={b} onClose={() => setDlg('')} /> : null}
    </article>
  );
}

/* ================================================================ the list */

const TABS: { key: string; label: string; test: (b: Booking) => boolean }[] = [
  { key: 'reply', label: 'Needs your reply', test: needsReply },
  { key: 'waiting', label: 'Waiting for the client', test: waitingClient },
  { key: 'upcoming', label: 'Confirmed', test: (b) => b.status === 'confirmed' && !toWrapUp(b) },
  { key: 'wrap', label: 'To wrap up', test: toWrapUp },
  { key: 'closed', label: 'Past and closed', test: (b) => ['completed', 'no_show', 'declined', 'cancelled'].includes(b.status) },
];

export function Requests({ tab = 'reply' }: { tab?: string }) {
  const { state, go } = useStudio();
  const [q, setQ] = useState('');
  const cur = TABS.find((t) => t.key === tab) ?? TABS[0];
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const sorted = state.bookings.filter(cur.test).filter((b) => {
      if (!term) return true;
      const c = clientOf(state, b.clientId);
      return [c?.name, c?.email, b.topic, ...b.services].join(' ').toLowerCase().includes(term);
    });
    const key = (b: Booking) => (cur.key === 'upcoming' ? Date.parse(b.start || b.updatedAt) : -Date.parse(b.updatedAt));
    return sorted.sort((a, b) => key(a) - key(b));
  }, [state, cur, q]);
  return (
    <div className="st-page">
      <header className="st-page-head"><h1>Requests</h1><input className="st-search" type="search" placeholder="Search names, topics, services" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search requests" /></header>
      <nav className="st-tabs" aria-label="Which requests">
        {TABS.map((t) => {
          const n = state.bookings.filter(t.test).length;
          return <button key={t.key} type="button" aria-current={t.key === cur.key ? 'page' : undefined} onClick={() => go(`/requests?tab=${t.key}`)}>{t.label}{n && t.key !== 'closed' ? <b>{n}</b> : null}</button>;
        })}
      </nav>
      {list.length ? <div className="st-cards">{list.map((b) => <RequestCard key={b.id} b={b} compact />)}</div> : <Empty>{cur.key === 'reply' ? 'Nothing waiting for a reply. New requests from Connect appear here, and you get an email.' : 'Nothing here.'}</Empty>}
    </div>
  );
}

/* ================================================================ one booking */

export function BookingPage({ id }: { id: string }) {
  const { state, call, go } = useStudio();
  const b = state.bookings.find((x) => x.id === id);
  const [dlg, setDlg] = useState<'' | 'propose' | 'decline' | 'cancel' | 'link'>('');
  const [keep, setKeep] = useState(false);
  if (!b) return <div className="st-page"><Empty>This booking is no longer in the Studio.</Empty></div>;
  const c = clientOf(state, b.clientId);
  const tz = state.settings.ownerTz;
  const notes = state.notes.filter((n) => n.bookingId === b.id);
  const mails = state.outbox.filter((m) => m.bookingId === b.id);
  const invs = state.invoices.filter((i) => i.bookingIds.includes(b.id));
  const open = ['requested', 'proposed', 'confirmed'].includes(b.status);
  return (
    <div className="st-page">
      <header className="st-page-head">
        <div><button type="button" className="st-back" onClick={() => history.back()}>← Back</button><h1>{c ? c.name : 'Booking'}</h1></div>
        <BookingBadge b={b} />
      </header>
      <div className="st-grid-2">
        <div>
          {needsReply(b) || waitingClient(b) || b.status === 'confirmed' ? <RequestCard b={b} /> : (
            <article className="st-card">
              <p>{b.start ? <When iso={b.start} tz={tz} also={b.clientTz} /> : 'No time was fixed.'}</p>
              {b.reason ? <p className="st-quote">“{b.reason}”</p> : null}
              {b.status === 'completed' && !invs.length ? <div className="st-row"><Btn kind="solid" small onClick={() => go(`/invoices/new?client=${b.clientId}&booking=${b.id}`)}>Make the invoice</Btn></div> : null}
            </article>
          )}
          {open ? (
            <Section title="Change it">
              <div className="st-row st-row-wrap">
                {b.status === 'confirmed' ? <>
                  <Btn onClick={() => setDlg('propose')}>Offer a new time</Btn>
                  <Btn onClick={() => setDlg('link')}>{b.meetUrl ? 'Change the meeting link' : 'Add a meeting link'}</Btn>
                  {!b.meetUrl && state.google.connected ? <Busy onClick={() => call('makeMeet', { bookingId: b.id }, (r) => (r?.outcome?.calendar?.meetUrl ? 'Meet link made' : 'Google did not give a link'))}>Make a Meet link</Busy> : null}
                  {b.meetUrl ? <Btn onClick={async () => { await copyText(b.meetUrl!); }}>Copy the link</Btn> : null}
                  {b.start ? <a className="st-btn st-btn-ghost" href={googleCalendarLink(b, `${c?.name} · conversation`, b.topic)} target="_blank" rel="noopener">Add to my Google Calendar</a> : null}
                </> : null}
                {b.status === 'proposed' ? <>
                  <Btn onClick={() => setDlg('propose')}>Offer different times</Btn>
                  <Busy onClick={() => call('propose', { bookingId: b.id, times: b.options.filter((o) => Date.parse(o) > Date.now()), message: b.message }, 'Sent again')}>Send the times again</Busy>
                  {b.previousStart ? <Btn onClick={() => setKeep(true)}>Keep the agreed time</Btn> : null}
                </> : null}
                <Btn kind="danger" onClick={() => setDlg('cancel')}>{b.status === 'confirmed' || b.previousStart ? 'Cancel the conversation' : 'Close without a reply'}</Btn>
              </div>
            </Section>
          ) : null}
          <NotesFor clientId={b.clientId} bookingId={b.id} notes={notes} />
        </div>
        <aside>
          <Section title="Their link">
            <p className="st-hint">Clients see and change their booking from the link in their emails.</p>
          </Section>
          <Section title="What happened">
            <ol className="st-timeline">{[...b.history].reverse().map((h, i) => <li key={i}><span className={`st-who st-who-${h.by}`}>{h.by === 'owner' ? 'You' : h.by === 'client' ? c?.name.split(' ')[0] : 'Studio'}</span> {after(h.what)} <Ago iso={h.at} /></li>)}</ol>
          </Section>
          {invs.length ? <Section title="Invoices">{invs.map((i) => <p key={i.id}><button type="button" className="st-link" onClick={() => go(`/invoices/${i.id}`)}>{i.number}</button></p>)}</Section> : null}
          {mails.length ? <Section title="Emails">{mails.map((m) => <p key={m.id} className="st-mailrow"><button type="button" className="st-link" onClick={() => go(`/outbox/${m.id}`)}>{m.subject}</button> <Badge tone={m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'grey'}>{m.status}</Badge></p>)}</Section> : null}
        </aside>
      </div>
      {dlg === 'propose' ? <ProposeModal b={b} title={b.status === 'confirmed' ? 'Offer a new time' : 'Offer other times'} onClose={() => setDlg('')} /> : null}
      {dlg === 'cancel' ? <CancelModal b={b} onClose={() => setDlg('')} /> : null}
      {dlg === 'link' ? <LinkModal b={b} onClose={() => setDlg('')} /> : null}
      {keep ? <Confirm title="Keep the agreed time" text={`The conversation stays at ${b.previousStart ? whenZ(b.previousStart, tz) : ''}, and ${c?.name} is told.`} yes="Keep it" onYes={() => call('keepTime', { bookingId: b.id }, 'Kept, and they have been told')} onClose={() => setKeep(false)} /> : null}
    </div>
  );
}

/* ================================================================ notes */

export function NotesFor({ clientId, bookingId, notes }: { clientId: string; bookingId?: string; notes: { id: string; text: string; pinned?: boolean; createdAt: string; bookingId?: string }[] }) {
  const { call } = useStudio();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const sorted = [...notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt));
  return (
    <Section title={bookingId ? 'Notes on this conversation' : 'Notes'} aside={<span className="st-hint">Only you see these.</span>}>
      <form className="st-note-new" onSubmit={async (e) => { e.preventDefault(); if (text.trim() && (await call('addNote', { clientId, bookingId, text }))) setText(''); }}>
        <label className="sr-only" htmlFor={`note-${bookingId ?? clientId}`}>A new note</label>
        <textarea id={`note-${bookingId ?? clientId}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="What you want to remember…" />
        <Btn kind="solid" small type="submit" disabled={!text.trim()}>Add the note</Btn>
      </form>
      {sorted.length ? (
        <ul className="st-notes">
          {sorted.map((n) => (
            <li key={n.id} className={n.pinned ? 'is-pinned' : ''}>
              {editing === n.id ? (
                <>
                  <textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit the note" />
                  <div className="st-row"><Busy small kind="solid" onClick={async () => { if (await call('updateNote', { noteId: n.id, text: draft })) setEditing(null); }}>Save</Busy><Btn small onClick={() => setEditing(null)}>Cancel</Btn></div>
                </>
              ) : (
                <>
                  <p>{n.text}</p>
                  <div className="st-note-foot">
                    <Ago iso={n.createdAt} />{n.bookingId && !bookingId ? <Badge tone="grey">session</Badge> : null}
                    <button type="button" className="st-link" onClick={() => call('updateNote', { noteId: n.id, pinned: !n.pinned })}>{n.pinned ? 'Unpin' : 'Pin'}</button>
                    <button type="button" className="st-link" onClick={() => { setEditing(n.id); setDraft(n.text); }}>Edit</button>
                    <button type="button" className="st-link st-link-danger" onClick={() => { if (confirm('Delete this note?')) call('deleteNote', { noteId: n.id }, 'Note deleted'); }}>Delete</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="st-hint">No notes yet.</p>}
    </Section>
  );
}
