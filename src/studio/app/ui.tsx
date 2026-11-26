/** The Studio's small parts: its shared context, buttons, dialogs, fields, badges, time pickers */
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { StudioState } from '../core/api';
import type { Booking, Client, Invoice } from '../core/types';
import { STATUS_LABEL } from '../core/ops';

/** a history line follows who did it ("You confirmed a time"), so it starts in lower case */
export const after = (what: string) => what.charAt(0).toLowerCase() + what.slice(1);
import { STANDING_LABEL, standing, totals, type Standing } from '../core/money';
import { dayIn, relative, utcToLocalInput, whenZ, zonedToUtc } from '../core/time';
import type { StudioMode } from '../client';

export interface Article { slug: string; title: string; date: string; pillar: string; draft: boolean; summary: string }
export interface Readiness { password: boolean; secret: boolean; door: boolean; email: boolean; mailFrom: string; google: boolean; dev: boolean; demo?: boolean; googleAccount: { email?: string; at: string } | null }

export interface Ctx {
  state: StudioState;
  mode: StudioMode;
  articles: Article[];
  readiness: Readiness | null;
  /** do something; on success shows `ok` (if given) and returns the answer */
  call: <T = any>(action: string, payload?: Record<string, unknown>, ok?: string | ((r: any) => string)) => Promise<T | null>; // eslint-disable-line @typescript-eslint/no-explicit-any
  go: (path: string) => void;
  toast: (text: string, kind?: 'ok' | 'warn' | 'error') => void;
}
export const StudioCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStudio = () => useContext(StudioCtx);

/* ---------------------------------------------------------------- looking things up */

export const clientOf = (s: StudioState, id: string) => s.clients.find((c) => c.id === id);
export const bookingsOf = (s: StudioState, clientId: string) => s.bookings.filter((b) => b.clientId === clientId);
export const invoicesOf = (s: StudioState, clientId: string) => s.invoices.filter((i) => i.clientId === clientId);
export const today = (s: StudioState) => dayIn(s.settings.ownerTz);
export const standingOf = (s: StudioState, i: Invoice): Standing => standing(i, today(s));

/** how many times they have met, and what is coming */
export function clientSummary(s: StudioState, c: Client) {
  const bs = bookingsOf(s, c.id);
  const now = Date.now();
  const held = bs.filter((b) => b.status === 'completed').length;
  const upcoming = bs.filter((b) => b.status === 'confirmed' && b.start && Date.parse(b.start) > now).sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!));
  const invs = invoicesOf(s, c.id).filter((i) => i.status !== 'void' && i.status !== 'draft');
  const owed = invs.reduce((a, i) => a + totals(i).due, 0);
  const paid = invs.reduce((a, i) => a + totals(i).paid, 0);
  const last = [...bs.map((b) => b.updatedAt), c.updatedAt].sort().at(-1)!;
  return { held, upcoming, next: upcoming[0], owed, paid, requests: bs.length, missed: bs.filter((b) => b.status === 'no_show').length, last };
}

export const needsReply = (b: Booking) => b.status === 'requested';
export const waitingClient = (b: Booking) => b.status === 'proposed';
export const toWrapUp = (b: Booking) => b.status === 'confirmed' && !!b.start && Date.parse(b.start) + b.durationMin * 60000 < Date.now();

/* ---------------------------------------------------------------- small pieces */

export function Btn({ kind = 'ghost', small, children, ...p }: { kind?: 'solid' | 'ghost' | 'danger' | 'quiet'; small?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`st-btn st-btn-${kind}${small ? ' st-btn-sm' : ''}`} {...p}>{children}</button>;
}

export function Busy({ onClick, children, ...p }: { onClick: () => Promise<unknown> | void; children: ReactNode; kind?: 'solid' | 'ghost' | 'danger' | 'quiet'; small?: boolean; disabled?: boolean; title?: string }) {
  const [busy, setBusy] = useState(false);
  return <Btn {...p} disabled={busy || p.disabled} aria-busy={busy} onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}>{busy ? '…' : children}</Btn>;
}

export function Badge({ tone = 'plain', children }: { tone?: 'plain' | 'gold' | 'green' | 'red' | 'blue' | 'grey' | 'amber'; children: ReactNode }) {
  return <span className={`st-badge st-badge-${tone}`}>{children}</span>;
}

const STATUS_TONE: Record<Booking['status'], 'gold' | 'blue' | 'green' | 'grey' | 'red' | 'amber'> = {
  requested: 'gold', proposed: 'blue', confirmed: 'green', completed: 'grey', no_show: 'amber', declined: 'grey', cancelled: 'red',
};
export function BookingBadge({ b }: { b: Booking }) {
  if (toWrapUp(b)) return <Badge tone="amber">To wrap up</Badge>;
  if (b.status === 'requested' && b.previousStart) return <Badge tone="gold">Asked to move</Badge>;
  return <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>;
}

const STANDING_TONE: Record<Standing, 'grey' | 'gold' | 'amber' | 'red' | 'green'> = { draft: 'grey', unpaid: 'gold', 'part-paid': 'amber', overdue: 'red', paid: 'green', void: 'grey' };
export function InvoiceBadge({ st }: { st: Standing }) { return <Badge tone={STANDING_TONE[st]}>{STANDING_LABEL[st]}</Badge>; }

export function Empty({ children }: { children: ReactNode }) { return <div className="st-empty">{children}</div>; }

export function Section({ title, aside, children, id }: { title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="st-section" id={id}>
      <header className="st-section-head"><h2>{title}</h2>{aside}</header>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return <label className="st-field"><span className="st-label">{label}</span>{children}{hint ? <span className="st-hint">{hint}</span> : null}</label>;
}

export const When = ({ iso, tz, also }: { iso: string; tz: string; also?: string }) => (
  <span className="st-when" title={new Date(iso).toString()}>
    {whenZ(iso, tz)}{also && also !== tz && whenZ(iso, also).split(' ').at(-1) !== whenZ(iso, tz).split(' ').at(-1) ? <small> · {whenZ(iso, also)}</small> : null}
  </span>
);
export const Ago = ({ iso }: { iso: string }) => <span className="st-ago" title={new Date(iso).toLocaleString()}>{relative(iso)}</span>;

/* ---------------------------------------------------------------- a dialog */

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    const close = () => onClose();
    d.addEventListener('close', close);
    return () => d.removeEventListener('close', close);
  }, [onClose]);
  return (
    <dialog ref={ref} className={`st-modal${wide ? ' st-modal-wide' : ''}`} aria-label={title} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="st-modal-inner">
        <header className="st-modal-head"><h2>{title}</h2><button type="button" className="st-x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></header>
        {children}
      </div>
    </dialog>
  );
}

/** "are you sure?", with what will happen */
export function Confirm({ title, text, yes, danger, onYes, onClose, children }: { title: string; text: ReactNode; yes: string; danger?: boolean; onYes: () => Promise<unknown>; onClose: () => void; children?: ReactNode }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="st-modal-body">{typeof text === 'string' ? <p>{text}</p> : text}{children}</div>
      <footer className="st-modal-foot"><Btn onClick={onClose}>Not now</Btn><Busy kind={danger ? 'danger' : 'solid'} onClick={async () => { await onYes(); onClose(); }}>{yes}</Busy></footer>
    </Modal>
  );
}

/* ---------------------------------------------------------------- choosing times, in Sarvakali's zone */

export function TimesPicker({ tz, value, onChange, max = 3, clientTz }: { tz: string; value: string[]; onChange: (v: string[]) => void; max?: number; clientTz?: string }) {
  const id = useId();
  const rows = value.length ? value : [''];
  const minLocal = utcToLocalInput(new Date(Date.now() + 30 * 60000).toISOString(), tz);
  return (
    <div className="st-times">
      {rows.map((v, i) => {
        const local = v ? utcToLocalInput(v, tz) : '';
        return (
          <div className="st-time-row" key={i}>
            <label className="sr-only" htmlFor={`${id}-${i}`}>Time {i + 1}</label>
            <input id={`${id}-${i}`} type="datetime-local" value={local} min={minLocal} step={900} onChange={(e) => {
              const next = [...rows];
              next[i] = e.target.value ? zonedToUtc(e.target.value, tz) ?? '' : '';
              onChange(next.filter((x, j) => x || j < next.length));
            }} />
            {clientTz && v && clientTz !== tz ? <small className="st-hint">for them: {whenZ(v, clientTz)}</small> : null}
            {rows.length > 1 ? <button type="button" className="st-x" aria-label={`Remove time ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>×</button> : null}
          </div>
        );
      })}
      {rows.length < max ? <Btn small onClick={() => onChange([...rows, ''])}>Add another time</Btn> : null}
      <p className="st-hint">Times in your zone ({tz.replace('_', ' ')}).</p>
    </div>
  );
}

export function copyText(text: string) {
  try { return navigator.clipboard.writeText(text).then(() => true, () => false); } catch { return Promise.resolve(false); }
}

export function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}
