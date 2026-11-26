/**
 * The Studio: Sarvakali's private dashboard (see src/studio). Loads the state, finds the page from the address
 * (#/requests/…, #/clients/…, #/invoices/…), keeps up with new requests (it checks every minute and whenever the
 * tab comes back), and shows what each action did.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CallError, ownerCall, type StudioMode } from '../client';
import type { StudioState } from '../core/api';
import { MARK } from '../../data/brand';
import { BookingPage, Requests } from './Bookings';
import { ClientPage, Clients } from './Clients';
import { InvoicePage, Invoices, NewInvoice } from './Invoices';
import { Articles, Outbox, Sessions, Settings, Today } from './Views';
import { StudioCtx, needsReply, toWrapUp, type Article, type Ctx, type Readiness } from './ui';

function useRoute() {
  const read = () => (location.hash.replace(/^#/, '') || '/');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, query = ''] = route.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(query) };
}

const NAV = [
  { to: '/', label: 'Today', icon: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' },
  { to: '/requests', label: 'Requests', icon: 'M4 6h16v12H4z M4 7l8 6 8-6' },
  { to: '/sessions', label: 'Sessions', icon: 'M5 5h14v15H5z M5 10h14 M9 3v4 M15 3v4' },
  { to: '/clients', label: 'Clients', icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6 M16 11a3 3 0 1 0 0-6 M17.5 14c2 .6 3.5 2.6 3.5 5.5' },
  { to: '/invoices', label: 'Invoices', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6' },
  { to: '/articles', label: 'Articles', icon: 'M5 4h10l4 4v12H5z M14 4v5h5 M8 13h8 M8 17h6' },
  { to: '/outbox', label: 'Outbox', icon: 'M3 12l18-8-7 18-3-7z M11 15l10-11' },
  { to: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z' },
];

export default function StudioApp({ mode, articles = [] }: { mode: StudioMode; articles?: Article[] }) {
  const [state, setState] = useState<StudioState | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: string }[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const seen = useRef<number | null>(null);
  const { parts, q } = useRoute();

  const toast = useCallback((text: string, kind: 'ok' | 'warn' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 9000 : 5200);
  }, []);

  const signedOut = (e: unknown) => e instanceof CallError && e.status === 401;

  const load = useCallback(async () => {
    try {
      const s = await ownerCall<StudioState>('state');
      setState(s);
      setError('');
      // a quiet note when a new request has come in since the last look
      const n = s.bookings.filter(needsReply).length;
      if (seen.current !== null && n > seen.current) toast(`A new request has arrived`, 'ok');
      seen.current = n;
    } catch (e) {
      if (signedOut(e)) { location.reload(); return; }
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [toast]);

  useEffect(() => {
    load();
    ownerCall<Readiness>('readiness').then(setReadiness, () => {});
    const every = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60_000);
    const back = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', back);
    // the demo: another tab (the client's pages) changed the data
    window.addEventListener('storage', back);
    return () => { clearInterval(every); document.removeEventListener('visibilitychange', back); window.removeEventListener('storage', back); };
  }, [load]);

  const call = useCallback<Ctx['call']>(async (action, payload, ok) => {
    try {
      const r = await ownerCall(action, payload);
      if (r && typeof r === 'object' && 'state' in r) setState((r as { state: StudioState }).state);
      if (ok) {
        const text = typeof ok === 'function' ? ok(r) : ok;
        toast(text, /could not|not sent|in the Outbox to send|did not/.test(text) ? 'warn' : 'ok');
      }
      return r;
    } catch (e) {
      if (signedOut(e)) { location.reload(); return null; }
      toast(e instanceof Error ? e.message : String(e), 'error');
      return null;
    }
  }, [toast]);

  const go = useCallback((path: string) => { location.hash = path; setNavOpen(false); }, []);

  const ctx = useMemo<Ctx | null>(() => (state ? { state, mode, articles, readiness, call, go, toast } : null), [state, mode, articles, readiness, call, go, toast]);

  if (!ctx) {
    return <div className="st-loading">{error ? <><p>{error}</p><button type="button" className="st-btn st-btn-solid" onClick={load}>Try again</button></> : <p>Opening the Studio…</p>}</div>;
  }

  const [section, id, sub] = parts;
  const counts: Record<string, number> = {
    '/requests': state!.bookings.filter(needsReply).length + state!.bookings.filter(toWrapUp).length,
    '/invoices': state!.invoices.filter((i) => i.claim && i.status === 'sent').length,
    '/outbox': state!.outbox.filter((m) => m.status === 'failed').length,
  };
  let page: React.ReactNode;
  if (!section) page = <Today />;
  else if (section === 'requests') page = id ? <BookingPage id={id} /> : <Requests tab={q.get('tab') ?? 'reply'} />;
  else if (section === 'sessions') page = <Sessions />;
  else if (section === 'clients') page = id ? <ClientPage id={id} /> : <Clients />;
  else if (section === 'invoices') page = id === 'new' ? <NewInvoice clientId={q.get('client') ?? ''} bookingId={q.get('booking') ?? undefined} /> : id ? <InvoicePage id={id} /> : <Invoices filter={q.get('filter') ?? 'open'} />;
  else if (section === 'articles') page = <Articles />;
  else if (section === 'outbox') page = <Outbox id={id} />;
  else if (section === 'settings') page = <Settings />;
  else page = <Today />;
  void sub;
  const active = `/${section ?? ''}`;

  return (
    <StudioCtx.Provider value={ctx}>
      <div className={`st-app${navOpen ? ' nav-open' : ''}`}>
        <header className="st-top">
          <button type="button" className="st-burger" aria-label="Menu" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16" /></svg></button>
          <a className="st-brand" href="#/" onClick={() => setNavOpen(false)}>
            <svg viewBox="0 0 64 64" aria-hidden="true"><path d={MARK.moon} className="st-brand-moon" /><path d={MARK.flame} className="st-brand-flame" /></svg>
            <span>Studio</span>
          </a>
          {mode === 'demo' ? <span className="st-demo">Demo · kept in this browser</span> : null}
          <a className="st-site" href="/" target="_blank" rel="noopener">The site ↗</a>
        </header>
        <nav className="st-nav" aria-label="Studio">
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} aria-current={active === n.to ? 'page' : undefined} onClick={() => setNavOpen(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={n.icon} /></svg>
              <span>{n.label}</span>
              {counts[n.to] ? <b className="st-count">{counts[n.to]}</b> : null}
            </a>
          ))}
        </nav>
        <main className="st-main" id="studio-main">{page}</main>
        <div className="st-toasts" role="status" aria-live="polite">
          {toasts.map((t) => <p key={t.id} className={`st-toast st-toast-${t.kind}`}>{t.text}</p>)}
        </div>
      </div>
    </StudioCtx.Provider>
  );
}
