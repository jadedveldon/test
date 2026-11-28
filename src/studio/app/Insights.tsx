/**
 * Insights: how the site is doing, from its own counting (src/obs, docs/observability.md). Who comes (visitors,
 * visits, pages, where from, which countries and devices, at what hours), where they go (first and last pages, the
 * steps between, the way to a booking), what they do (practices, chants, searches, the help line), how fast the
 * pages are for them, what has gone wrong (each problem with the steps that led to it and its log lines), the host's
 * logs by reference, and whether everything answers. Nothing here identifies a visitor.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ownerCall } from '../client';
import { p75, rate, sourceKinds } from '../../obs/core/events';
import type { DaySummary, ErrorGroup } from '../../obs/core/events';
import type { LogLine } from '../../obs/core/insights';
import { Badge, Btn, Busy, Empty, Section, useStudio } from './ui';

type Ins = {
  from: string; to: string; span: number; updatedAt: number;
  series: { day: string; visitors: number; visits: number; views: number; errors: number; goals: Record<string, number> }[];
  total: DaySummary;
  errors: (ErrorGroup & { status: 'open' | 'fixed' | 'ignored' })[];
};
type Count = Record<string, number>;

const TABS = [['', 'Overview'], ['journeys', 'Journeys'], ['practice', 'What people do'], ['speed', 'Speed'], ['errors', 'Problems'], ['logs', 'Logs'], ['health', 'Health']] as const;
const n = (x: number) => x.toLocaleString('en-IN');
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const dur = (ms: number) => { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ''}`.trim(); };
const top = (o: Count = {}, k = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k);
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const country = (() => { let dn: Intl.DisplayNames | null = null; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* fine */ } return (c: string) => (c.length === 2 && dn ? dn.of(c) ?? c : c); })();
const PAGE_NAMES: Record<string, string> = { '/': 'Homepage' };
const pageName = (p: string) => PAGE_NAMES[p] ?? p;

const GOAL_NAMES: Record<string, string> = {
  'practice-start': 'Guided practices begun', 'practice-finish': 'Guided practices finished', chant: 'Mantras chanted (times)', rite: 'Daily rites', fire: 'Offerings to the fire', lamp: 'Lamps lit',
  journal: 'Journal lines written', 'keep-mantra': 'Mantras kept', keep: 'Services kept', request: 'Requests sent', search: 'Searches', 'path-result': 'Find your path: finished',
  'help-line': 'Help line tapped (Tele-MANAS)', call: 'Phone numbers tapped', email: 'Email links', outbound: 'Links to other sites', 'not-found': 'Missing pages reached',
  'signin-link': 'Sign-in links asked for', signin: 'Signed in', 'account-created': 'Accounts made', 'account-deleted': 'Accounts deleted',
  'booking-accept': 'Times accepted by clients', 'booking-suggest': 'Other times suggested', 'booking-cancel': 'Cancelled by clients', 'invoice-paid-claim': '“I have paid”', install: 'Added to home screen', 'record-cleared': 'Practice records cleared',
};

/* ---------------------------------------------------------------- charts (one series each, so one hue and no legend) */

/** visitors per day: a line, with a crosshair and the day's numbers on hover, focus or tap; a table on request */
function DailyChart({ series }: { series: Ins['series'] }) {
  const [at, setAt] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const ref = useRef<SVGSVGElement>(null);
  const W = 720, H = 200, L = 36, R = 10, T = 12, B = 26;
  const max = Math.max(4, ...series.map((s) => s.visitors));
  const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const yMax = Math.ceil(max / step) * step;
  const x = (i: number) => L + (series.length <= 1 ? 0 : (i * (W - L - R)) / (series.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / yMax);
  const d = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.visitors).toFixed(1)}`).join('');
  const area = `${d}L${x(series.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const labelsEvery = Math.ceil(series.length / 7);
  const pick = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((clientX - r.left) / r.width) * W;
    setAt(Math.max(0, Math.min(series.length - 1, Math.round(((px - L) / (W - L - R)) * (series.length - 1)))));
  };
  const s = at !== null ? series[at] : null;
  return (
    <div className="in-chart">
      <div className="in-chart-head"><h3>Visitors each day</h3><button type="button" className="st-link" onClick={() => setTable(!table)}>{table ? 'Show as a chart' : 'Show as a table'}</button></div>
      {table ? (
        <div className="in-table-wrap"><table className="in-table"><thead><tr><th>Day</th><th>Visitors</th><th>Visits</th><th>Page views</th><th>Problems</th></tr></thead>
          <tbody>{[...series].reverse().map((r) => <tr key={r.day}><td>{dayLabel(r.day)}</td><td>{n(r.visitors)}</td><td>{n(r.visits)}</td><td>{n(r.views)}</td><td>{n(r.errors)}</td></tr>)}</tbody></table></div>
      ) : (
        <div className="in-plot">
          <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Visitors each day, ${series[0]?.day} to ${series[series.length - 1]?.day}: from ${Math.min(...series.map((r) => r.visitors))} to ${max}. Use the arrow keys to read each day.`} tabIndex={0}
            onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setAt(null)} onBlur={() => setAt(null)}
            onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setAt((a) => Math.max(0, Math.min(series.length - 1, (a ?? series.length - 1) + (e.key === 'ArrowRight' ? 1 : -1)))); } }}>
            {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="in-grid" /><text x={L - 8} y={y(t) + 4} className="in-axis" textAnchor="end">{t}</text></g>)}
            {series.map((r, i) => (i % labelsEvery === 0 || i === series.length - 1 ? <text key={r.day} x={x(i)} y={H - 6} className="in-axis" textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}>{dayLabel(r.day)}</text> : null))}
            <path d={area} className="in-area" />
            <path d={d} className="in-line" />
            {s && at !== null ? <g><line x1={x(at)} x2={x(at)} y1={T} y2={y(0)} className="in-cross" /><circle cx={x(at)} cy={y(s.visitors)} r={5} className="in-dot" /></g> : null}
          </svg>
          {s && at !== null ? (
            <div className="in-tip" style={{ left: `${(x(at) / W) * 100}%` }} role="status">
              <b>{new Date(`${s.day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b>
              <span>{n(s.visitors)} visitors · {n(s.visits)} visits · {n(s.views)} pages</span>
              {s.errors ? <span>{n(s.errors)} problems</span> : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** the hours of the day (Sarvakali's time): columns, with the count on hover or focus */
function Hours({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const [at, setAt] = useState<number | null>(null);
  return (
    <div className="in-chart">
      <div className="in-chart-head"><h3>When people come <small>(India time)</small></h3>{at !== null ? <span className="in-read">{String(at).padStart(2, '0')}:00–{String(at + 1).padStart(2, '0')}:00 · {n(hours[at])} pages</span> : null}</div>
      <div className="in-hours" role="list" aria-label="Page views by hour of the day">
        {hours.map((h, i) => (
          <div key={i} role="listitem" tabIndex={0} className="in-hour" aria-label={`${i}:00, ${h} pages`} onPointerEnter={() => setAt(i)} onPointerLeave={() => setAt(null)} onFocus={() => setAt(i)} onBlur={() => setAt(null)}>
            <span style={{ height: `${Math.max(h ? 3 : 0, (h / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="in-hours-axis"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
    </div>
  );
}

/** a ranked list: the name, a thin bar for its share of the largest, and the number */
function Bars({ title, rows, total, empty = 'Nothing yet.', note, format = n }: { title: ReactNode; rows: [string, number, ReactNode?][]; total?: number; empty?: string; note?: ReactNode; format?: (x: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="in-bars">
      <h3>{title}</h3>
      {rows.length ? (
        <ol>{rows.map(([label, v, extra]) => (
          <li key={label} title={`${label}: ${format(v)}${total ? ` (${pct(v, total)})` : ''}`}>
            <div className="in-bar-row"><span className="in-bar-label">{label}</span><span className="in-bar-value">{format(v)}{total ? <small> {pct(v, total)}</small> : null}</span></div>
            <div className="in-bar-track" aria-hidden="true"><span style={{ width: `${(v / max) * 100}%` }} /></div>
            {extra ? <div className="in-bar-extra">{extra}</div> : null}
          </li>
        ))}</ol>
      ) : <p className="st-hint">{empty}</p>}
      {note ? <p className="st-hint">{note}</p> : null}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return <div><dt>{label}</dt><dd>{value}</dd>{sub ? <small>{sub}</small> : null}</div>;
}

/* ---------------------------------------------------------------- the tabs */

function Overview({ ins }: { ins: Ins }) {
  const t = ins.total;
  const pages = Object.entries(t.pages).sort((a, b) => b[1].views - a[1].views).slice(0, 12);
  return (
    <>
      <dl className="st-stats in-tiles">
        <Tile label="Visitors" value={n(t.visitors)} sub="added up day by day" />
        <Tile label="Visits" value={n(t.visits)} sub={`${pct(t.bounces, t.visits)} saw one page only`} />
        <Tile label="Pages seen" value={n(t.views)} sub={t.visits ? `${(t.views / t.visits).toFixed(1)} a visit` : undefined} />
        <Tile label="Time on a page" value={t.viewMsN ? dur(t.viewMs / t.viewMsN) : '–'} sub="on average, while in view" />
        <Tile label="Read down the page" value={t.scrollN ? `${Math.round(t.scrollSum / t.scrollN)}%` : '–'} sub="on average" />
      </dl>
      <DailyChart series={ins.series} />
      <div className="in-grid2">
        <Bars title="Pages seen most" rows={pages.map(([p, s]) => [pageName(p), s.views, <>{n(s.visitors)} visitors{s.msN ? ` · ${dur(s.ms / s.msN)} in view` : ''}{s.sdN ? ` · read ${Math.round(s.sd / s.sdN)}%` : ''}</>])} />
        <div className="in-stack">
          <Bars title="Kinds of source" rows={top(sourceKinds(t.sources)).map(([k, v]) => [k === 'Direct' ? 'Direct (typed, bookmarked or an app)' : k === 'AI assistants' ? 'AI assistants (ChatGPT, Perplexity, Claude, Gemini…)' : k, v])} total={t.visits} />
          <Bars title="Where visits came from" rows={top(t.sources).map(([k, v]) => [k === 'Direct' ? 'Direct (typed, bookmarked or an app)' : k, v])} total={t.visits} />
          <Bars title="Campaign links" rows={top(t.campaigns)} empty="No visits from tagged links yet. Add ?utm_source=instagram (and utm_campaign) to links you share, to see them here." />
        </div>
      </div>
      <Hours hours={t.hours} />
      <div className="in-grid3">
        <Bars title="Countries" rows={top(t.countries).map(([k, v]) => [k === 'Unknown' ? 'Not known' : country(k), v])} total={t.views} />
        <Bars title="Devices" rows={top(t.devices).map(([k, v]) => [k[0].toUpperCase() + k.slice(1), v])} total={t.views} />
        <Bars title="Browsers" rows={top(t.browsers)} total={t.views} note={<>Systems: {top(t.os, 5).map(([k, v]) => `${k} ${pct(v, t.views)}`).join(' · ') || '–'}</>} />
      </div>
    </>
  );
}

function Journeys({ ins }: { ins: Ins }) {
  const { state } = useStudio();
  const t = ins.total;
  const from = Date.parse(`${ins.from}T00:00:00+05:30`);
  const asked = (t.goals.request ?? 0);
  const confirmed = state.bookings.filter((b) => Date.parse(b.createdAt) >= from && (b.status === 'confirmed' || b.status === 'completed')).length;
  const held = state.bookings.filter((b) => Date.parse(b.createdAt) >= from && b.status === 'completed').length;
  const paid = state.invoices.filter((i) => i.paidAt && Date.parse(i.paidAt) >= from).length;
  const connect = t.pages['/connect']?.visitors ?? 0;
  const funnel: [string, number][] = [['Visits', t.visits], ['Opened Connect', connect], ['Sent a request', asked], ['A time confirmed', confirmed], ['Conversation held', held], ['Invoice paid', paid]];
  return (
    <>
      <div className="in-chart">
        <div className="in-chart-head"><h3>The way to a conversation</h3></div>
        <ol className="in-funnel">
          {funnel.map(([label, v], i) => (
            <li key={label}>
              <span className="in-bar-label">{label}</span>
              <div className="in-bar-track"><span style={{ width: `${funnel[0][1] ? Math.max(v ? 1.5 : 0, (v / funnel[0][1]) * 100) : 0}%` }} /></div>
              <span className="in-bar-value">{n(v)}{i ? <small> {pct(v, funnel[i - 1][1])} of the step before</small> : null}</span>
            </li>
          ))}
        </ol>
        <p className="st-hint">The first three steps are counted on the site; the rest come from the Studio (requests made in this period). Requests sent by someone who does not want to be counted appear only from “A time confirmed” on.</p>
      </div>
      <div className="in-grid3">
        <Bars title="Where visits began" rows={top(t.entries, 10).map(([p, v]) => [pageName(p), v])} total={t.visits} />
        <Bars title="Where visits ended" rows={top(t.exits, 10).map(([p, v]) => [pageName(p), v])} total={t.visits} />
        <Bars title="From one page to the next" rows={top(t.steps, 10).map(([p, v]) => [p.split(' → ').map(pageName).join(' → '), v])} empty="Visits of more than one page will show their steps here." />
      </div>
    </>
  );
}

function Practice({ ins }: { ins: Ins }) {
  const t = ins.total;
  const g = t.goals;
  const det = (k: string, label = (s: string) => s) => top(t.goalDetails[k], 8).map(([d, v]) => [label(d), v] as [string, number]);
  const groups: [string, string[]][] = [
    ['Practice', ['practice-from', 'practice-start', 'practice-finish', 'rite', 'chant', 'fire', 'lamp', 'journal', 'keep-mantra']],
    ['Finding things', ['search', 'path-result', 'keep', 'not-found', 'outbound']],
    ['Reaching out', ['request', 'help-line', 'call', 'email', 'booking-accept', 'booking-suggest', 'booking-cancel', 'invoice-paid-claim']],
    ['Accounts and the app', ['signin-link', 'signin', 'account-created', 'account-deleted', 'install', 'record-cleared']],
  ];
  return (
    <>
      <div className="in-grid2">
        {groups.map(([title, keys]) => <Bars key={title} title={title} rows={keys.filter((k) => g[k]).map((k) => [GOAL_NAMES[k] ?? k, g[k]])} empty="Nothing yet in this period." />)}
      </div>
      <div className="in-grid3">
        <Bars title="Guided practices finished" rows={det('practice-finish')} />
        <Bars title="Mantras chanted" rows={det('chant')} empty="No chanting counted yet." />
        <Bars title="Practices opened from other pages" rows={det('practice-from')} empty="None opened from another page yet." note="Where a guided practice was offered: a pillar's page, an article, Find your path, Connect after sending, or the moon card in the header." />
        <Bars title="What people searched for" rows={det('search')} note="Only words that found something on the site are kept; searches that found nothing are counted as “nothing found”." />
        <Bars title="Find your path: where it led" rows={det('path-result')} />
        <Bars title="Missing pages: how people got there" rows={det('not-found')} empty="No missing pages reached." note="“A link on this site” means one of the site’s own links is broken: worth fixing first." />
        <Bars title="Services kept" rows={det('keep')} />
      </div>
    </>
  );
}

const VITALS: [string, string, string, (v: number) => string][] = [
  ['lcp', 'Main content shown', 'Largest Contentful Paint: when the biggest thing on the page appears.', (v) => `${(v / 1000).toFixed(1)} s`],
  ['inp', 'Answer to a tap', 'Interaction to Next Paint: how long the page takes to respond.', (v) => `${Math.round(v)} ms`],
  ['cls', 'Steadiness', 'Cumulative Layout Shift: how much things jump around while loading.', (v) => v.toFixed(2)],
  ['fcp', 'First thing shown', 'First Contentful Paint.', (v) => `${(v / 1000).toFixed(1)} s`],
  ['ttfb', 'Host’s first answer', 'Time to First Byte.', (v) => `${Math.round(v)} ms`],
];
const RATE_ICON: Record<string, [string, 'green' | 'amber' | 'red']> = { good: ['✓', 'green'], 'needs work': ['!', 'amber'], poor: ['✕', 'red'] };

function Speed({ ins }: { ins: Ins }) {
  const t = ins.total;
  const pages = Object.entries(t.vitalsByPage).map(([p, m]) => ({ p, lcp: p75(m.lcp), inp: p75(m.inp), cls: p75(m.cls), n: m.lcp?.length ?? 0 })).filter((r) => r.n).sort((a, b) => (b.lcp ?? 0) - (a.lcp ?? 0)).slice(0, 15);
  const cell = (k: string, v: number | null, f: (v: number) => string) => { const r = rate(k, v); return v === null ? <td>–</td> : <td><span className={`in-rate in-rate-${RATE_ICON[r!][1]}`}><b aria-hidden="true">{RATE_ICON[r!][0]}</b> {f(v)}</span></td>; };
  return (
    <>
      <p className="st-hint">What three visitors in four get, or better, on the first page of their visit (the way the web measures speed). Judged against the web’s own thresholds (web.dev).</p>
      <dl className="st-stats in-tiles">
        {VITALS.map(([k, label, help, f]) => {
          const v = p75(t.vitals[k]);
          const r = rate(k, v);
          return <Tile key={k} label={label} value={v === null ? '–' : f(v)} sub={<>{r ? <Badge tone={RATE_ICON[r][1]}><span aria-hidden="true">{RATE_ICON[r][0]}</span> {r}</Badge> : 'not measured yet'} <span className="in-help">{help}</span></>} />;
        })}
      </dl>
      <div className="in-chart">
        <div className="in-chart-head"><h3>Page by page, slowest first</h3></div>
        {pages.length ? (
          <div className="in-table-wrap"><table className="in-table"><thead><tr><th>Page</th><th>Main content</th><th>Answer to a tap</th><th>Steadiness</th><th>Visits measured</th></tr></thead>
            <tbody>{pages.map((r) => <tr key={r.p}><td>{pageName(r.p)}</td>{cell('lcp', r.lcp, VITALS[0][3])}{cell('inp', r.inp, VITALS[1][3])}{cell('cls', r.cls, VITALS[2][3])}<td>{n(r.n)}</td></tr>)}</tbody></table></div>
        ) : <Empty>No speed measured yet.</Empty>}
      </div>
    </>
  );
}

const SRC: Record<string, string> = { server: 'On the site’s host', onerror: 'In a visitor’s browser', rejection: 'In a visitor’s browser', resource: 'A file did not load', caught: 'Noticed by the site', react: 'In the Studio' };

function Problems({ ins, reload, openLog }: { ins: Ins; reload: () => void; openLog: (ref: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [show, setShow] = useState<'open' | 'all'>('open');
  const list = ins.errors.filter((e) => show === 'all' || e.status === 'open');
  const set = (f: string, status: string) => ownerCall('insights.error', { f, status }).then(reload);
  return (
    <>
      <div className="st-tabs st-tabs-sm" role="tablist">
        <button type="button" aria-current={show === 'open' ? 'page' : undefined} onClick={() => setShow('open')}>Open <b>{ins.errors.filter((e) => e.status === 'open').length}</b></button>
        <button type="button" aria-current={show === 'all' ? 'page' : undefined} onClick={() => setShow('all')}>All <b>{ins.errors.length}</b></button>
      </div>
      {list.length ? (
        <ul className="in-problems">
          {list.map((e) => (
            <li key={e.f} className={`in-problem is-${e.status}`}>
              <button type="button" className="in-problem-head" aria-expanded={open === e.f} onClick={() => setOpen(open === e.f ? null : e.f)}>
                <span className="in-problem-msg">{e.m}</span>
                <span className="in-problem-meta">
                  {e.status !== 'open' ? <Badge tone={e.status === 'fixed' ? 'green' : 'grey'}>{e.status === 'fixed' ? 'Marked fixed' : 'Ignored'}</Badge> : null}
                  <Badge tone={e.src === 'server' ? 'red' : 'amber'}>{SRC[e.src] ?? e.src}</Badge>
                  <span>{n(e.n)}× · {n(e.visitors)} {e.src === 'server' ? (e.visitors === 1 ? 'request' : 'requests') : e.visitors === 1 ? 'visitor' : 'visitors'} · last {new Date(e.last).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </button>
              {open === e.f ? (
                <div className="in-problem-body">
                  <p><b>Where:</b> {top(e.pages, 5).map(([p, c]) => `${pageName(p)} (${c})`).join(', ')}{Object.keys(e.browsers).length ? <> · <b>On:</b> {top(e.browsers, 4).map(([b, c]) => `${b} (${c})`).join(', ')}</> : null}</p>
                  {e.samples.slice().reverse().map((s, i) => (
                    <div key={i} className="in-sample">
                      <p className="st-hint">{new Date(s.ts).toLocaleString('en-GB')} · {pageName(s.p)}{s.dev ? ` · ${s.dev}, ${s.br ?? ''} on ${s.os ?? ''}` : ''}{s.ref ? <> · <button type="button" className="st-link" onClick={() => openLog(s.ref!)}>log lines ({s.ref})</button></> : null}</p>
                      {s.crumbs?.length ? (
                        <ol className="in-trail" aria-label="The steps before it">
                          {s.crumbs.map((c, j) => <li key={j} className={`in-crumb in-crumb-${c.c}`}><span className="in-crumb-t">{c.t >= 0 ? `${(c.t / 1000).toFixed(1)} s` : ''}</span><span className="in-crumb-c">{c.c}</span><span>{c.m}</span></li>)}
                        </ol>
                      ) : null}
                      {s.s ? <details><summary>Where in the code</summary><pre className="in-pre">{s.s}</pre></details> : null}
                    </div>
                  ))}
                  <div className="st-row st-row-wrap">
                    {e.status !== 'fixed' ? <Busy small kind="solid" onClick={() => set(e.f, 'fixed')}>Mark fixed</Busy> : null}
                    {e.status !== 'ignored' ? <Busy small onClick={() => set(e.f, 'ignored')}>Ignore</Busy> : null}
                    {e.status !== 'open' ? <Busy small onClick={() => set(e.f, 'open')}>Reopen</Busy> : null}
                  </div>
                  <p className="st-hint">Marked fixed, it disappears from the open list; if it happens again, it comes back and you get an email.</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <Empty>{show === 'open' ? 'Nothing is wrong that the site has noticed.' : 'No problems in this period.'}</Empty>}
    </>
  );
}

function LogLines({ lines }: { lines: LogLine[] }) {
  return (
    <ol className="in-loglines">
      {lines.map((l, i) => (
        <li key={i} className={`in-log-${l.lvl}`}>
          <span className="in-log-t">{new Date(l.ts).toLocaleTimeString('en-GB')}</span>
          <span className="in-log-lvl">{l.lvl}</span>
          <span>{l.msg}{l.status ? ` · ${l.status}` : ''}{l.ms !== undefined ? ` · ${l.ms} ms` : ''}{l.fields ? <code> {JSON.stringify(l.fields)}</code> : null}{l.err ? <><br /><b>{l.err.message}</b>{l.err.stack ? <pre className="in-pre">{l.err.stack}</pre> : null}</> : null}</span>
        </li>
      ))}
    </ol>
  );
}

function Logs({ initialRef }: { initialRef: string }) {
  const [ref, setRef] = useState(initialRef);
  const [found, setFound] = useState<{ ref: string; lines: LogLine[] | null } | null>(null);
  const [level, setLevel] = useState<'' | 'warn' | 'error'>('');
  const [day, setDay] = useState(new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10));
  const [recent, setRecent] = useState<{ ref: string; lines: LogLine[] }[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const look = useCallback((r: string) => { if (r.trim()) ownerCall<{ ref: string; lines: LogLine[] | null }>('insights.log', { ref: r.trim() }).then(setFound, () => setFound({ ref: r, lines: null })); }, []);
  useEffect(() => { if (initialRef) look(initialRef); }, [initialRef, look]);
  useEffect(() => { setRecent(null); ownerCall<{ logs: { ref: string; lines: LogLine[] }[] }>('insights.logs', { day, level: level || undefined }).then((r) => setRecent(r.logs), () => setRecent([])); }, [day, level]);
  return (
    <>
      <form className="in-filters" onSubmit={(e) => { e.preventDefault(); look(ref); }}>
        <label>Find a reference <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. mbx4k2p1-3f9a" spellCheck={false} /></label>
        <Btn kind="solid" type="submit">Find</Btn>
      </form>
      <p className="st-hint">When something goes wrong for a visitor or a client, the message they see ends with a reference. It leads here, to everything the host wrote down for that request.</p>
      {found ? (found.lines?.length ? <div className="st-card"><h3>Reference {found.ref}</h3><LogLines lines={found.lines} /></div> : <Empty>No log lines for {found.ref}. Lines are kept for 30 days.</Empty>) : null}
      <div className="in-filters">
        <label>Day <input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        <label>Show <select value={level} onChange={(e) => setLevel(e.target.value as '' | 'warn' | 'error')}><option value="">Every request</option><option value="warn">Warnings and errors</option><option value="error">Errors only</option></select></label>
      </div>
      {recent === null ? <p className="st-hint">Reading the logs…</p> : recent.length ? (
        <ul className="in-requests">
          {recent.map((r) => {
            const last = r.lines[r.lines.length - 1];
            const worst = r.lines.some((l) => l.lvl === 'error') ? 'error' : r.lines.some((l) => l.lvl === 'warn') ? 'warn' : 'info';
            return (
              <li key={r.ref} className={`in-log-${worst}`}>
                <button type="button" aria-expanded={open === r.ref} onClick={() => setOpen(open === r.ref ? null : r.ref)}>
                  <span className="in-log-t">{new Date(last.ts).toLocaleTimeString('en-GB')}</span>
                  <span className="in-log-lvl">{worst}</span>
                  <span>{last.method} {last.route}</span>
                  <span>{last.status ?? ''}{last.ms !== undefined ? ` · ${last.ms} ms` : ''}</span>
                  <code>{r.ref}</code>
                </button>
                {open === r.ref ? <LogLines lines={r.lines} /> : null}
              </li>
            );
          })}
        </ul>
      ) : <Empty>No requests kept for this day{level ? ' at this level' : ''}.</Empty>}
    </>
  );
}

function Health() {
  const { readiness } = useStudio();
  const [h, setH] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { ownerCall<Record<string, unknown>>('insights.health').then(setH, (e) => setH({ status: 'degraded', error: (e as Error).message })); }, []);
  if (!h) return <p className="st-hint">Asking the host…</p>;
  const c = (h.checks ?? {}) as Record<string, { ok?: boolean; ms?: number } | string | null | boolean | Record<string, unknown>>;
  const row = (label: string, ok: boolean | null, text: string) => <li><Badge tone={ok === null ? 'grey' : ok ? 'green' : 'red'}><span aria-hidden="true">{ok === null ? '–' : ok ? '✓' : '✕'}</span> {ok === null ? 'n/a' : ok ? 'ok' : 'down'}</Badge> <b>{label}</b> <span className="st-hint">{text}</span></li>;
  const store = (x: unknown) => x as { ok?: boolean; ms?: number } | undefined;
  return (
    <>
      <dl className="st-stats in-tiles">
        <Tile label="The site" value={<Badge tone={h.status === 'ok' ? 'green' : 'red'}>{h.status === 'ok' ? '✓ answering' : '✕ something is down'}</Badge>} sub={`version ${String(h.version ?? '')}`} />
        <Tile label="Numbers last worked out" value={c.lastRollup ? new Date(String(c.lastRollup)).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : c.demo ? 'in this browser' : 'not yet'} sub="every hour, and whenever Insights opens" />
        <Tile label="Last alert email" value={c.lastAlert ? new Date(String(c.lastAlert)).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'none sent'} />
      </dl>
      <Section title="What answers">
        <ul className="in-health">
          {c.demo ? row('The demo', true, 'Everything here is kept in this browser.') : <>
            {row('The Studio’s records', store(c.studioStore)?.ok ?? null, store(c.studioStore)?.ms !== undefined ? `${store(c.studioStore)!.ms} ms` : '')}
            {row('Counts, problems and logs', store(c.obsStore)?.ok ?? null, store(c.obsStore)?.ms !== undefined ? `${store(c.obsStore)!.ms} ms` : '')}
          </>}
          {row('Email', readiness?.demo ? null : !!readiness?.email, readiness?.demo ? 'nothing is sent in the demo' : readiness?.email ? `from ${readiness.mailFrom}` : 'not set up: alerts and sign-in links cannot be sent')}
          {row('Google Meet', readiness?.demo ? null : !!readiness?.google, readiness?.demo ? '' : readiness?.google ? '' : 'not set up')}
          {row('Studio secret', readiness?.demo ? null : !!readiness?.secret, 'signs the sign-in cookies')}
        </ul>
      </Section>
      <Section title="Being told when the site is down">
        <p>The site emails you about new problems it notices itself. To hear when it stops answering altogether, give an uptime service (UptimeRobot, Better Stack and others have free plans) this address to check every few minutes: <code>{location.origin}/api/health</code>. It answers “ok”, or 503 when something is down.</p>
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------- the page */

export function Insights({ tab = '' }: { tab?: string }) {
  const { go, mode } = useStudio();
  const [days, setDays] = useState(() => { try { return Number(localStorage.getItem('sk-insights-days')) || 30; } catch { return 30; } });
  const [ins, setIns] = useState<Ins | null>(null);
  const [err, setErr] = useState('');
  const [logRef, setLogRef] = useState(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('ref') ?? '');
  const load = useCallback((force = false) => { setErr(''); ownerCall<Ins>('insights', { days, force }).then(setIns, (e) => setErr((e as Error).message)); }, [days]);
  useEffect(() => { setIns(null); load(); }, [load]);
  useEffect(() => { try { localStorage.setItem('sk-insights-days', String(days)); } catch { /* fine */ } }, [days]);
  const active = TABS.some(([k]) => k === tab) ? tab : '';
  const openErrors = useMemo(() => ins?.errors.filter((e) => e.status === 'open').length ?? 0, [ins]);
  const openLog = (r: string) => { setLogRef(r); go('/insights/logs'); };
  return (
    <div className="st-page in-page">
      <header className="st-page-head">
        <div>
          <h1>Insights</h1>
          <p className="st-hint">{mode === 'demo' ? 'Demo: thirty days of made-up visits, with your own visits to the preview added on top.' : 'The site’s own counting: no cookies, nothing that identifies anyone. Your own visits, signed in here, are not counted.'}</p>
        </div>
        <div className="in-range" role="group" aria-label="Period">
          {[7, 30, 90].map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d} days</button>)}
          <Btn small onClick={() => load(true)} aria-label="Work the numbers out again now" title="Work the numbers out again now">↻</Btn>
        </div>
      </header>
      <nav className="st-tabs" aria-label="Insights">
        {TABS.map(([k, label]) => <button key={k} type="button" aria-current={active === k ? 'page' : undefined} onClick={() => go(`/insights${k ? `/${k}` : ''}`)}>{label}{k === 'errors' && openErrors ? <b>{openErrors}</b> : null}</button>)}
      </nav>
      {err ? <p className="st-error">{err}</p> : null}
      {active === 'logs' ? <Logs initialRef={logRef} /> : active === 'health' ? <Health /> : !ins ? <p className="st-hint">Working out the numbers…</p> : (
        active === 'journeys' ? <Journeys ins={ins} /> : active === 'practice' ? <Practice ins={ins} /> : active === 'speed' ? <Speed ins={ins} /> : active === 'errors' ? <Problems ins={ins} reload={() => load(true)} openLog={openLog} /> : <Overview ins={ins} />
      )}
      {ins && active !== 'logs' && active !== 'health' ? <p className="st-hint in-foot">{dayLabel(ins.from)} to {dayLabel(ins.to)} · worked out {new Date(ins.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p> : null}
    </div>
  );
}
