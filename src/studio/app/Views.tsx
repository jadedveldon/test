/** The Studio's other pages: Today, Sessions, Articles, Outbox, Settings */
import { useEffect, useMemo, useState } from 'react';
import type { Mail, Settings as S } from '../core/types';
import { rupees, standing, totals, validUpi } from '../core/money';
import { dayIn, longDay, when, whenZ } from '../core/time';
import { articleHref, ownerCall } from '../client';
import { RequestCard } from './Bookings';
import { Ago, Badge, Btn, Busy, Empty, Field, Section, When, clientOf, copyText, needsReply, toWrapUp, today, useStudio, waitingClient, type Article } from './ui';

/* ================================================================ Today */

export function Today() {
  const { state, go, readiness } = useStudio();
  const tz = state.settings.ownerTz;
  const now = Date.now();
  const reply = state.bookings.filter(needsReply).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const waiting = state.bookings.filter(waitingClient);
  const wrap = state.bookings.filter(toWrapUp);
  const upcoming = state.bookings.filter((b) => b.status === 'confirmed' && b.start && Date.parse(b.start) + b.durationMin * 60000 > now).sort((a, b) => a.start!.localeCompare(b.start!));
  const t = today(state);
  const claims = state.invoices.filter((i) => i.claim && i.status === 'sent');
  const open = state.invoices.filter((i) => ['unpaid', 'part-paid', 'overdue'].includes(standing(i, t)));
  const overdue = open.filter((i) => standing(i, t) === 'overdue');
  const problems = state.activity.filter((a) => a.kind === 'problem' && Date.parse(a.at) > now - 7 * 86400_000).slice(0, 5);
  const failed = state.outbox.filter((m) => m.status === 'failed').slice(0, 5);
  const todays = upcoming.filter((b) => dayIn(tz, Date.parse(b.start!)) === t);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const setup = readiness && !readiness.demo && (!readiness.email || !state.settings.ownerEmail || !state.settings.upiId || !state.google.connected);
  return (
    <div className="st-page">
      <header className="st-page-head"><div><h1>{hello}</h1><p className="st-contact">{new Date().toLocaleDateString('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' })}</p></div></header>
      <dl className="st-stats st-stats-links">
        <div><dt>Needs your reply</dt><dd><button type="button" className="st-link" onClick={() => go('/requests?tab=reply')}>{reply.length}</button></dd></div>
        <div><dt>Waiting for clients</dt><dd><button type="button" className="st-link" onClick={() => go('/requests?tab=waiting')}>{waiting.length}</button></dd></div>
        <div><dt>Today</dt><dd><button type="button" className="st-link" onClick={() => go('/sessions')}>{todays.length} conversation{todays.length === 1 ? '' : 's'}</button></dd></div>
        <div><dt>Still to be paid</dt><dd><button type="button" className="st-link" onClick={() => go('/invoices?filter=open')}>{rupees(open.reduce((a, i) => a + totals(i).due, 0))}</button>{overdue.length ? <small className="is-owed"> · {overdue.length} overdue</small> : null}</dd></div>
      </dl>

      {setup ? (
        <div className="st-callout">
          <p><b>Finish setting up</b>, so emails reach people and payments can be made:</p>
          <ul>
            {!state.settings.ownerEmail ? <li>Your email for notifications (Settings)</li> : null}
            {!state.settings.upiId ? <li>Your UPI ID, for invoices (Settings)</li> : null}
            {readiness && !readiness.email ? <li>Email sending (Resend; see docs/studio.md). Until then emails wait in the Outbox.</li> : null}
            {!state.google.connected ? <li>Google Calendar, for Meet links (Settings)</li> : null}
          </ul>
          <div className="st-row"><Btn small onClick={() => go('/settings')}>Open Settings</Btn></div>
        </div>
      ) : null}

      {claims.length ? (
        <Section title="Payments to check">
          <ul className="st-list">{claims.map((i) => { const c = clientOf(state, i.clientId); return <li key={i.id}><button type="button" className="st-list-row" onClick={() => go(`/invoices/${i.id}`)}><span><b>{c?.name}</b> says {i.number} is paid</span><span className="st-list-sub">{rupees(totals(i).due)}{i.claim?.reference ? ` · ref ${i.claim.reference}` : ''}</span><Badge tone="blue">Check</Badge></button></li>; })}</ul>
        </Section>
      ) : null}

      <div className="st-grid-2">
        <div>
          <Section title="Needs your reply" aside={reply.length > 3 ? <Btn small onClick={() => go('/requests?tab=reply')}>All {reply.length}</Btn> : null}>
            {reply.length ? <div className="st-cards">{reply.slice(0, 3).map((b) => <RequestCard key={b.id} b={b} compact />)}</div> : <Empty>All replied to.</Empty>}
          </Section>
          {wrap.length ? (
            <Section title="To wrap up" aside={<span className="st-hint">Did these take place?</span>}>
              <div className="st-cards">{wrap.map((b) => <RequestCard key={b.id} b={b} compact />)}</div>
            </Section>
          ) : null}
        </div>
        <aside>
          <Section title="Coming up">
            {upcoming.length ? (
              <ul className="st-agenda">
                {upcoming.slice(0, 6).map((b) => {
                  const c = clientOf(state, b.clientId);
                  const soon = Date.parse(b.start!) - now < 20 * 60000;
                  return (
                    <li key={b.id}>
                      <button type="button" className="st-agenda-row" onClick={() => go(`/requests/${b.id}`)}><b>{when(b.start!, tz)}</b><span>{c?.name}</span></button>
                      {b.meetUrl ? <a className={`st-btn st-btn-sm ${soon ? 'st-btn-solid' : 'st-btn-ghost'}`} href={b.meetUrl} target="_blank" rel="noopener">Join</a> : <Badge tone="amber">No link</Badge>}
                    </li>
                  );
                })}
              </ul>
            ) : <Empty>Nothing booked yet.</Empty>}
          </Section>
          {waiting.length ? <Section title="Waiting for the client"><ul className="st-list">{waiting.map((b) => <li key={b.id}><button type="button" className="st-list-row" onClick={() => go(`/requests/${b.id}`)}><span>{clientOf(state, b.clientId)?.name}</span><span className="st-list-sub">offered <Ago iso={b.updatedAt} /></span></button></li>)}</ul></Section> : null}
          {problems.length || failed.length ? (
            <Section title="Something to look at">
              <ul className="st-list">
                {failed.map((m) => <li key={m.id}><button type="button" className="st-list-row" onClick={() => go(`/outbox/${m.id}`)}><span>An email to {m.to} was not sent</span><Badge tone="red">Failed</Badge></button></li>)}
                {problems.map((a) => <li key={a.id} className="st-list-row st-list-static"><span>{a.text}</span><Ago iso={a.at} /></li>)}
              </ul>
            </Section>
          ) : null}
          <Section title="Lately">
            <ol className="st-timeline">{state.activity.filter((a) => a.kind !== 'problem').slice(0, 8).map((a) => <li key={a.id}>{a.text} <Ago iso={a.at} /></li>)}</ol>
          </Section>
        </aside>
      </div>
    </div>
  );
}

/* ================================================================ Sessions: an agenda by week */

export function Sessions() {
  const { state, go } = useStudio();
  const tz = state.settings.ownerTz;
  const [week, setWeek] = useState(0);
  const start = useMemo(() => {
    const t = today(state);
    const d = new Date(`${t}T00:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow + week * 7);
    return d;
  }, [state, week]);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  const items = state.bookings.flatMap((b) => {
    if (b.status === 'confirmed' || b.status === 'completed' || b.status === 'no_show') return b.start ? [{ b, at: b.start, tentative: false }] : [];
    if (b.status === 'requested' || b.status === 'proposed') return b.options.map((o) => ({ b, at: o, tentative: true }));
    return [];
  });
  const t = today(state);
  return (
    <div className="st-page">
      <header className="st-page-head">
        <h1>Sessions</h1>
        <div className="st-row"><Btn small onClick={() => setWeek(week - 1)} aria-label="The week before">←</Btn><Btn small onClick={() => setWeek(0)}>This week</Btn><Btn small onClick={() => setWeek(week + 1)} aria-label="The week after">→</Btn></div>
      </header>
      <p className="st-hint">Confirmed conversations, with times still being agreed shown faintly. Times in {tz.replace('_', ' ')}.</p>
      <div className="st-week">
        {days.map((d) => {
          const here = items.filter((x) => dayIn(tz, Date.parse(x.at)) === d).sort((a, b) => a.at.localeCompare(b.at));
          return (
            <section key={d} className={`st-day${d === t ? ' is-today' : ''}`} aria-label={longDay(d)}>
              <h2>{new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}</h2>
              {here.length ? here.map(({ b, at, tentative }) => (
                <button key={b.id + at} type="button" className={`st-slot st-slot-${b.status}${tentative ? ' is-tentative' : ''}`} onClick={() => go(`/requests/${b.id}`)}>
                  <b>{new Date(at).toLocaleTimeString('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true })}</b>
                  <span>{clientOf(state, b.clientId)?.name}</span>
                  {tentative ? <small>{b.status === 'requested' ? 'they offered' : 'you offered'}</small> : null}
                </button>
              )) : <p className="st-hint">—</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================ Articles */

export function Articles() {
  const { articles, mode } = useStudio();
  const editor = mode === 'server';
  const [q, setQ] = useState('');
  const list = articles.filter((a) => !q.trim() || `${a.title} ${a.summary}`.toLowerCase().includes(q.trim().toLowerCase()));
  const edit = (a: Article) => `/keystatic/collection/writings/item/${a.slug}`;
  return (
    <div className="st-page">
      <header className="st-page-head">
        <h1>Articles</h1>
        <div className="st-row"><input className="st-search" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search articles" />
          {editor ? <a className="st-btn st-btn-solid" href="/keystatic/collection/writings/create">Write a new article</a> : <Btn kind="solid" disabled title="Opens the content editor on the live site">Write a new article</Btn>}</div>
      </header>
      <p className="st-hint">
        Articles are written in the content editor, behind this same sign-in: write, edit, save as a draft, publish, or delete (Delete is in the editor’s ⋯ menu on each article). Each save is a new version of the site, live in a minute or two.
        {!editor ? ' In this preview the editor is not running; on the live site these buttons open it.' : ''}
      </p>
      {list.length ? (
        <ul className="st-list">
          {list.map((a) => (
            <li key={a.slug} className="st-list-row st-list-static st-article-row">
              <span><b>{a.title}</b><br /><small className="st-hint">{a.summary}</small></span>
              <span className="st-list-sub">{longDay(a.date)}</span>
              <span>{a.draft ? <Badge tone="amber">Draft</Badge> : <Badge tone="green">Published</Badge>}</span>
              <span className="st-row">
                <a className="st-btn st-btn-ghost st-btn-sm" href={articleHref(a.slug)} target="_blank" rel="noopener">View</a>
                {editor ? <a className="st-btn st-btn-ghost st-btn-sm" href={edit(a)}>Edit or delete</a> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : <Empty>No articles yet.</Empty>}
    </div>
  );
}

/* ================================================================ Outbox */

export function Outbox({ id }: { id?: string }) {
  const { state, go, readiness, call } = useStudio();
  const [mail, setMail] = useState<Mail | null>(null);
  useEffect(() => {
    let live = true;
    setMail(null);
    if (id) ownerCall<Mail>('mail', { id }).then((m) => { if (live) setMail(m); }, () => {});
    return () => { live = false; };
  }, [id]);
  if (id) {
    const meta = state.outbox.find((m) => m.id === id);
    return (
      <div className="st-page">
        <header className="st-page-head"><div><button type="button" className="st-back" onClick={() => history.back()}>← Back</button><h1>{meta?.subject ?? 'Email'}</h1><p className="st-contact">To {meta?.to} · <Ago iso={meta?.at ?? new Date().toISOString()} /> · {meta?.status}{meta?.error ? ` · ${meta.error}` : ''}</p></div>
          <div className="st-row st-row-wrap">
            {meta && meta.status !== 'sent' && readiness?.email ? <Busy kind="solid" onClick={() => call('resendMail', { id }, (r) => (r?.outcome?.mails?.[0]?.status === 'sent' ? 'Sent' : 'It could not be sent'))}>Send it now</Busy> : null}
            {mail ? <a className="st-btn st-btn-ghost" href={`mailto:${mail.to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.text)}`}>Open in my email</a> : null}
            {mail ? <Btn onClick={async () => { await copyText(mail.text); }}>Copy the text</Btn> : null}
          </div>
        </header>
        {mail ? <iframe className="st-mail" title="The email" sandbox="" srcDoc={mail.html} /> : <Empty>Opening…</Empty>}
      </div>
    );
  }
  const provider = readiness?.demo ? 'In the demo nothing is sent: every email is kept here, so you can see what clients would receive.'
    : readiness?.email ? `Emails go out through Resend, from ${readiness.mailFrom}.` : 'Email sending is not set up yet, so emails are kept here to send by hand (open one, then “Open in my email”). See docs/studio.md.';
  return (
    <div className="st-page">
      <header className="st-page-head"><h1>Outbox</h1></header>
      <p className="st-hint">{provider}</p>
      {state.outbox.length ? (
        <ul className="st-list">
          {state.outbox.map((m) => (
            <li key={m.id}><button type="button" className="st-list-row" onClick={() => go(`/outbox/${m.id}`)}>
              <span><b>{m.subject}</b><br /><small className="st-hint">to {m.to}</small></span>
              <span className="st-list-sub"><Ago iso={m.at} /></span>
              <Badge tone={m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'grey'}>{m.status === 'saved' ? 'kept here' : m.status}</Badge>
            </button></li>
          ))}
        </ul>
      ) : <Empty>No emails yet.</Empty>}
    </div>
  );
}

/* ================================================================ Settings */

const TZS = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Australia/Sydney'];

export function Settings() {
  const { state, call, readiness, mode } = useStudio();
  const [f, setF] = useState<S>(state.settings);
  useEffect(() => setF(state.settings), [state.settings]);
  const set = <K extends keyof S>(k: K, v: S[K]) => setF({ ...f, [k]: v });
  const txt = (k: keyof S) => ({ value: String(f[k] ?? ''), onChange: (e: { target: { value: string } }) => set(k, e.target.value as never) });
  const changed = JSON.stringify(f) !== JSON.stringify(state.settings);
  const flag = new URLSearchParams(location.hash.split('?')[1] || '').get('google');
  const gMsg: Record<string, string> = { ok: 'Google Calendar is connected.', declined: 'Google was not allowed; nothing changed.', expired: 'That took too long; please connect again.', failed: 'Google could not be connected; please try again.', 'not-set-up': 'Google is not set up on the host yet (see docs/studio.md).' };
  return (
    <div className="st-page">
      <header className="st-page-head"><h1>Settings</h1>{changed ? <div className="st-row"><Btn onClick={() => setF(state.settings)}>Undo</Btn><Busy kind="solid" onClick={() => call('updateSettings', f as never, 'Settings saved')}>Save</Busy></div> : null}</header>
      {flag && gMsg[flag] ? <p className={`st-callout${flag === 'ok' ? ' st-callout-green' : ''}`}>{gMsg[flag]}</p> : null}
      <div className="st-grid-2">
        <div>
          <Section title="You and your practice">
            <div className="st-form st-form-2">
              <Field label="Practice name (on invoices and emails)"><input {...txt('practiceName')} /></Field>
              <Field label="Your name"><input {...txt('ownerName')} /></Field>
              <Field label="Your email" hint="New requests and replies are sent here; clients’ replies come here too."><input type="email" {...txt('ownerEmail')} /></Field>
              <Field label="Phone on invoices (optional)"><input type="tel" {...txt('phone')} /></Field>
              <Field label="Address on invoices (optional)"><input {...txt('address')} /></Field>
              <Field label="Your time zone"><select value={f.ownerTz} onChange={(e) => set('ownerTz', e.target.value)}>{[...new Set([f.ownerTz, ...TZS])].map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}</select></Field>
            </div>
          </Section>
          <Section title="Conversations">
            <div className="st-form st-form-2">
              <Field label="Usual length"><select value={f.defaultDurationMin} onChange={(e) => set('defaultDurationMin', Number(e.target.value))}>{[30, 45, 60, 75, 90, 120].map((d) => <option key={d} value={d}>{d} minutes</option>)}</select></Field>
              <Field label="Reminder before each conversation"><select value={f.reminders.enabled ? f.reminders.hoursBefore : 0} onChange={(e) => { const h = Number(e.target.value); set('reminders', { enabled: h > 0, hoursBefore: h || 24 }); }}><option value={0}>None</option><option value={2}>2 hours before</option><option value={12}>12 hours before</option><option value={24}>A day before</option><option value={48}>Two days before</option></select></Field>
            </div>
            <Field label="In every confirmation" hint="What to have ready, how the call goes."><textarea rows={3} {...txt('meetingNote')} /></Field>
            <Field label="Your signature on emails"><textarea rows={2} {...txt('signature')} /></Field>
            <fieldset className="st-fieldset"><legend>Tell me by email when</legend>
              <label className="st-check"><input type="checkbox" checked={f.notify.newRequest} onChange={(e) => set('notify', { ...f.notify, newRequest: e.target.checked })} /> a new request arrives</label>
              <label className="st-check"><input type="checkbox" checked={f.notify.clientReplies} onChange={(e) => set('notify', { ...f.notify, clientReplies: e.target.checked })} /> a client chooses a time, suggests another, or cancels</label>
              <label className="st-check"><input type="checkbox" checked={f.notify.payments} onChange={(e) => set('notify', { ...f.notify, payments: e.target.checked })} /> a client says they have paid</label>
            </fieldset>
          </Section>
          <Section title="Invoices and payment">
            <div className="st-form st-form-2">
              <Field label="UPI ID" hint={f.upiId && !validUpi(f.upiId) ? 'That does not look like a UPI ID (name@bank).' : 'Clients pay to this; it is on every invoice with a QR code.'}><input {...txt('upiId')} placeholder="name@bank" inputMode="email" /></Field>
              <Field label="Name on the UPI account"><input {...txt('upiName')} /></Field>
              <Field label="GSTIN (only if registered)"><input {...txt('gstin')} /></Field>
              <Field label="Days to pay" hint="The due date on a new invoice."><input type="number" min="0" max="120" value={f.paymentTermsDays} onChange={(e) => set('paymentTermsDays', Number(e.target.value))} /></Field>
              <Field label="Invoice numbers start with"><input {...txt('invoicePrefix')} /></Field>
              <Field label="Next invoice number" hint={`The next is ${f.invoicePrefix || 'SK'}-${today(state).slice(0, 4)}-${String(f.nextInvoiceSeq).padStart(4, '0')}`}><input type="number" min="1" value={f.nextInvoiceSeq} onChange={(e) => set('nextInvoiceSeq', Number(e.target.value))} /></Field>
            </div>
          </Section>
        </div>
        <aside>
          <Section title="Google Calendar and Meet">
            {state.google.connected ? (
              <>
                <p>Connected{state.google.email ? <> as <b>{state.google.email}</b></> : null}. Each confirmed conversation goes into your calendar with a Meet link, and moves or goes when it does.</p>
                <label className="st-check"><input type="checkbox" checked={f.googleInvites} onChange={(e) => set('googleInvites', e.target.checked)} /> Google also sends the client its own invitation</label>
                <Busy small onClick={() => call('google.disconnect', {}, 'Disconnected')}>Disconnect</Busy>
              </>
            ) : readiness?.google ? (
              <><p>Not connected. Connect once, and every confirmed conversation gets a Google Meet link by itself.</p><a className="st-btn st-btn-solid st-btn-sm" href="/api/studio/google/connect">Connect Google Calendar</a></>
            ) : <p className="st-hint">Not set up on the host yet: it needs a Google Cloud OAuth client (docs/studio.md, about ten minutes). Until then you can paste a meeting link into each conversation.</p>}
          </Section>
          <Section title="Email">
            {readiness?.demo ? <p className="st-hint">Demo: nothing is sent.</p> : readiness?.email ? <p>Sending from <b>{readiness.mailFrom}</b>, through Resend.</p> : <p className="st-hint">Not set up: emails wait in the Outbox. Add RESEND_API_KEY and MAIL_FROM on the host (docs/studio.md).</p>}
          </Section>
          <Section title="Writing and pages">
            <p>Articles and every word of the site are in the content editor.</p>
            {mode === 'server' ? <a className="st-btn st-btn-ghost st-btn-sm" href="/keystatic">Open the content editor</a> : <p className="st-hint">On the live site, the editor opens from here.</p>}
          </Section>
          <Section title="Signing in">
            <p className="st-hint">{readiness?.demo ? 'The demo needs no password.' : 'The Studio opens only on devices that have used the secret door address, and then asks for your password. Signing in lasts 30 days on a device.'}</p>
            {mode === 'server' ? <Busy small onClick={async () => { await fetch('/api/studio/sign-out', { method: 'POST' }); location.reload(); }}>Sign out on this device</Busy> : null}
          </Section>
          {readiness?.demo ? (
            <Section title="The demo">
              <p className="st-hint">Everything here is kept in this browser only. Start again with the made-up people:</p>
              <Busy small onClick={() => call('demo.reset', {}, 'The demo has started again')}>Start the demo again</Busy>
            </Section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export const fmtLong = (iso: string, tz: string) => whenZ(iso, tz, { year: true });
