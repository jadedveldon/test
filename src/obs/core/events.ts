/**
 * What the site counts, and how a day of it becomes numbers.
 *
 * The browser sends small events (src/scripts/telemetry.ts):
 *   view   a page was opened: its path, where the visitor came from (the other site's name), campaign tags, width
 *   leave  the page was left: how long it was in view, how far down it was read, its speed (web vitals)
 *   goal   a step that matters: a service kept, a request sent, a practice finished, a search, a help line tapped…
 *   error  something broke: the message, where in the code, and the trail of steps before it
 * The host adds what the browser cannot be trusted with or should not hold: the time, a visitor hash that changes
 * every day (so one person's pages can be followed through one day and never linked across days or to a person),
 * the country, and the kind of device and browser. The host's own errors join the same groups.
 *
 * `rollup` turns one day of these into a summary (visitors, visits, pages, sources, journeys, goals, speed, errors),
 * and `combine` adds days together. Shared by the host, the preview's demo and the checks.
 */
import { campaign, cleanPath, fingerprint, scrub } from './clean';

export type Crumb = { t: number; c: 'nav' | 'click' | 'fetch' | 'console' | 'goal' | 'error'; m: string };
export type Vitals = Partial<Record<'lcp' | 'cls' | 'inp' | 'fcp' | 'ttfb', number>>;

export type ClientEvent =
  | { k: 'view'; p: string; r?: string; u?: { s?: string; m?: string; c?: string }; w?: number; lang?: string; first?: boolean }
  | { k: 'leave'; p: string; ms: number; sd: number; v?: Vitals }
  | { k: 'goal'; p: string; n: string; d?: string }
  | { k: 'error'; p: string; m: string; s?: string; src: string; f?: string; crumbs?: Crumb[]; ref?: string };

/** as kept on the host */
export type Stored = ClientEvent & { ts: number; vh: string; pv: string; co?: string; dev?: string; br?: string; os?: string; own?: boolean };

const GOAL = /^[a-z][a-z0-9-]{1,30}$/;
const num = (x: unknown, min: number, max: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : undefined);
const str = (x: unknown, max: number) => (typeof x === 'string' && x.trim() ? scrub(x.trim(), max) : undefined);

/** only well-formed events, made safe, are kept (whatever arrives) */
export function cleanEvent(e: unknown): ClientEvent | null {
  if (!e || typeof e !== 'object') return null;
  const x = e as Record<string, unknown>;
  const p = typeof x.p === 'string' ? cleanPath(x.p) : '/';
  switch (x.k) {
    case 'view': {
      const u = x.u && typeof x.u === 'object' ? (x.u as Record<string, unknown>) : null;
      return { k: 'view', p, r: str(x.r, 80)?.toLowerCase(), u: u ? { s: str(u.s, 40), m: str(u.m, 40), c: str(u.c, 40) } : undefined, w: num(x.w, 0, 10000), lang: str(x.lang, 12), first: x.first === true || undefined };
    }
    case 'leave': {
      const v = x.v && typeof x.v === 'object' ? (x.v as Record<string, unknown>) : {};
      const vit: Vitals = {};
      for (const k of ['lcp', 'inp', 'fcp', 'ttfb'] as const) { const n = num(v[k], 0, 120000); if (n !== undefined) vit[k] = Math.round(n); }
      const cls = num(v.cls, 0, 50); if (cls !== undefined) vit.cls = Math.round(cls * 1000) / 1000;
      return { k: 'leave', p, ms: Math.round(num(x.ms, 0, 6 * 3600_000) ?? 0), sd: Math.round(num(x.sd, 0, 100) ?? 0), v: Object.keys(vit).length ? vit : undefined };
    }
    case 'goal': {
      const n = typeof x.n === 'string' && GOAL.test(x.n) ? x.n : null;
      return n ? { k: 'goal', p, n, d: str(x.d, 60) } : null;
    }
    case 'error': {
      const m = str(x.m, 400) ?? 'Unknown error';
      const s = str(x.s, 1500);
      const src = typeof x.src === 'string' && /^[a-z-]{2,20}$/.test(x.src) ? x.src : 'unknown';
      const crumbs = (Array.isArray(x.crumbs) ? x.crumbs : []).slice(-40).map((c) => {
        const y = (c ?? {}) as Record<string, unknown>;
        return { t: Math.round(num(y.t, -1e7, 1e10) ?? 0), c: (['nav', 'click', 'fetch', 'console', 'goal', 'error'].includes(y.c as string) ? y.c : 'nav') as Crumb['c'], m: scrub(String(y.m ?? ''), 160) };
      });
      return { k: 'error', p, m, s, src, f: fingerprint(m, s, src), crumbs, ref: typeof x.ref === 'string' && /^[a-z0-9]{6,12}-[0-9a-f]{4}$/.test(x.ref) ? x.ref : undefined };
    }
    default:
      return null;
  }
}

export { campaign };

/* ---------------------------------------------------------------- a day in numbers */

type Count = Record<string, number>;
export interface ErrorGroup { f: string; n: number; m: string; src: string; first: number; last: number; pages: Count; browsers: Count; visitors: number; samples: { ts: number; p: string; s?: string; crumbs?: Crumb[]; ref?: string; br?: string; os?: string; dev?: string }[] }
export interface DaySummary {
  day: string;
  /** different visitors that day (the daily hash) */
  visitors: number;
  /** visits: a visitor's pages with no gap of more than 30 minutes */
  visits: number;
  views: number;
  /** visits of one page only */
  bounces: number;
  /** time pages were in view, in all (ms), and how many pages reported it */
  viewMs: number;
  viewMsN: number;
  scrollSum: number;
  scrollN: number;
  hours: number[];
  pages: Record<string, { views: number; visitors: number; ms: number; msN: number; sd: number; sdN: number }>;
  sources: Count;
  campaigns: Count;
  countries: Count;
  devices: Count;
  browsers: Count;
  os: Count;
  entries: Count;
  exits: Count;
  /** a → b: how often visitors went from one page to the next */
  steps: Count;
  goals: Count;
  goalDetails: Record<string, Count>;
  /** speed samples, kept to work out the 75th percentile (what three in four visitors get or better) */
  vitals: Record<string, number[]>;
  vitalsByPage: Record<string, Record<string, number[]>>;
  errors: Record<string, ErrorGroup>;
}

const inc = (o: Count, k: string | undefined, n = 1) => { if (k) o[k] = (o[k] ?? 0) + n; };
const cap = (a: number[], n = 400) => (a.length > n ? a.filter((_, i) => i % Math.ceil(a.length / n) === 0) : a);

export function emptyDay(day: string): DaySummary {
  return { day, visitors: 0, visits: 0, views: 0, bounces: 0, viewMs: 0, viewMsN: 0, scrollSum: 0, scrollN: 0, hours: Array(24).fill(0), pages: {}, sources: {}, campaigns: {}, countries: {}, devices: {}, browsers: {}, os: {}, entries: {}, exits: {}, steps: {}, goals: {}, goalDetails: {}, vitals: {}, vitalsByPage: {}, errors: {} };
}

/** one day of stored events (the owner's own visits left out of the counts, not out of the errors) */
export function rollup(day: string, events: Stored[], tzOffsetMin = 330): DaySummary {
  const d = emptyDay(day);
  const evs = [...events].sort((a, b) => a.ts - b.ts);
  const byVisitor = new Map<string, Stored[]>();
  const pageVisitors = new Map<string, Set<string>>();
  for (const e of evs) {
    if (e.k === 'error') { addError(d, e); continue; }
    if (e.own) continue;
    if (e.k === 'view') {
      d.views++;
      d.hours[new Date(e.ts + tzOffsetMin * 60_000).getUTCHours()]++;
      const pg = (d.pages[e.p] ??= { views: 0, visitors: 0, ms: 0, msN: 0, sd: 0, sdN: 0 });
      pg.views++;
      (pageVisitors.get(e.p) ?? pageVisitors.set(e.p, new Set()).get(e.p)!).add(e.vh);
      (byVisitor.get(e.vh) ?? byVisitor.set(e.vh, []).get(e.vh)!).push(e);
      inc(d.countries, e.co ?? 'Unknown');
      inc(d.devices, e.dev);
      inc(d.browsers, e.br);
      inc(d.os, e.os);
    } else if (e.k === 'leave') {
      const pg = (d.pages[e.p] ??= { views: 0, visitors: 0, ms: 0, msN: 0, sd: 0, sdN: 0 });
      if (e.ms > 0) { pg.ms += e.ms; pg.msN++; d.viewMs += e.ms; d.viewMsN++; }
      pg.sd += e.sd; pg.sdN++; d.scrollSum += e.sd; d.scrollN++;
      for (const [k, v] of Object.entries(e.v ?? {})) {
        (d.vitals[k] ??= []).push(v as number);
        ((d.vitalsByPage[e.p] ??= {})[k] ??= []).push(v as number);
      }
    } else if (e.k === 'goal') {
      inc(d.goals, e.n);
      if (e.d) inc((d.goalDetails[e.n] ??= {}), e.d);
    }
  }
  for (const [p, s] of pageVisitors) d.pages[p].visitors = s.size;
  d.visitors = byVisitor.size;
  // visits, with where they started and ended and each step between
  for (const views of byVisitor.values()) {
    let visit: Stored[] = [];
    const close = () => {
      if (!visit.length) return;
      d.visits++;
      if (visit.length === 1) d.bounces++;
      const first = visit[0] as Extract<Stored, { k: 'view' }>;
      inc(d.entries, first.p);
      inc(d.exits, visit[visit.length - 1].p);
      inc(d.sources, first.r ?? 'Direct');
      if (first.u?.s || first.u?.c) inc(d.campaigns, [first.u.s, first.u.m, first.u.c].filter(Boolean).join(' / '));
      for (let i = 1; i < visit.length; i++) if (visit[i].p !== visit[i - 1].p) inc(d.steps, `${visit[i - 1].p} → ${visit[i].p}`);
      visit = [];
    };
    for (const v of views) {
      // a new visit: after half an hour away, or on arriving again from another site or a campaign link
      const fromOutside = (v as Extract<Stored, { k: 'view' }>).r || (v as Extract<Stored, { k: 'view' }>).u;
      if (visit.length && (v.ts - visit[visit.length - 1].ts > 30 * 60_000 || fromOutside)) close();
      visit.push(v);
    }
    close();
  }
  for (const k of Object.keys(d.vitals)) d.vitals[k] = cap(d.vitals[k]);
  for (const p of Object.keys(d.vitalsByPage)) for (const k of Object.keys(d.vitalsByPage[p])) d.vitalsByPage[p][k] = cap(d.vitalsByPage[p][k], 100);
  return d;
}

function addError(d: DaySummary, e: Extract<Stored, { k: 'error' }>) {
  const f = e.f ?? fingerprint(e.m, e.s, e.src);
  const g = (d.errors[f] ??= { f, n: 0, m: e.m, src: e.src, first: e.ts, last: e.ts, pages: {}, browsers: {}, visitors: 0, samples: [] });
  g.n++;
  g.first = Math.min(g.first, e.ts);
  g.last = Math.max(g.last, e.ts);
  inc(g.pages, e.p);
  inc(g.browsers, e.br ? `${e.br} · ${e.os ?? ''}`.trim() : undefined);
  g.samples.push({ ts: e.ts, p: e.p, s: e.s, crumbs: e.crumbs, ref: e.ref, br: e.br, os: e.os, dev: e.dev });
  if (g.samples.length > 3) g.samples.shift();
  (g as ErrorGroup & { _v?: Set<string> })._v ??= new Set();
  (g as ErrorGroup & { _v?: Set<string> })._v!.add(e.vh);
  g.visitors = (g as ErrorGroup & { _v?: Set<string> })._v!.size;
}

/** a summary as kept (the working sets left out) */
export function toStored(d: DaySummary): DaySummary {
  return JSON.parse(JSON.stringify(d, (k, v) => (k === '_v' ? undefined : v)));
}

/** days added together (visitors are summed: each day's visitors are counted apart, by design) */
export function combine(days: DaySummary[]) {
  const out = emptyDay(days.length ? `${days[0].day}…${days[days.length - 1].day}` : '');
  const add = (a: Count, b: Count) => { for (const [k, v] of Object.entries(b)) a[k] = (a[k] ?? 0) + v; };
  for (const d of days) {
    out.visitors += d.visitors; out.visits += d.visits; out.views += d.views; out.bounces += d.bounces;
    out.viewMs += d.viewMs; out.viewMsN += d.viewMsN; out.scrollSum += d.scrollSum; out.scrollN += d.scrollN ?? 0;
    d.hours.forEach((n, i) => (out.hours[i] += n));
    for (const [p, s] of Object.entries(d.pages)) {
      const o = (out.pages[p] ??= { views: 0, visitors: 0, ms: 0, msN: 0, sd: 0, sdN: 0 });
      o.views += s.views; o.visitors += s.visitors; o.ms += s.ms; o.msN += s.msN; o.sd += s.sd; o.sdN += s.sdN ?? 0;
    }
    for (const k of ['sources', 'campaigns', 'countries', 'devices', 'browsers', 'os', 'entries', 'exits', 'steps', 'goals'] as const) add(out[k], d[k]);
    for (const [g, c] of Object.entries(d.goalDetails)) add((out.goalDetails[g] ??= {}), c);
    for (const [k, v] of Object.entries(d.vitals)) out.vitals[k] = cap([...(out.vitals[k] ?? []), ...v], 2000);
    for (const [p, m] of Object.entries(d.vitalsByPage)) for (const [k, v] of Object.entries(m)) ((out.vitalsByPage[p] ??= {})[k] = cap([...(out.vitalsByPage[p]?.[k] ?? []), ...v], 400));
    for (const [f, g] of Object.entries(d.errors)) {
      const o = out.errors[f];
      if (!o) out.errors[f] = JSON.parse(JSON.stringify(g));
      else {
        o.n += g.n; o.visitors += g.visitors; o.first = Math.min(o.first, g.first); o.last = Math.max(o.last, g.last);
        add(o.pages, g.pages); add(o.browsers, g.browsers);
        o.samples = [...o.samples, ...g.samples].sort((a, b) => a.ts - b.ts).slice(-3);
      }
    }
  }
  return out;
}

/** the 75th percentile, as the web's speed measures are judged */
export function p75(a: number[] | undefined) {
  if (!a?.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))];
}
/** good / needs work / poor, by the thresholds the web uses (web.dev) */
export const VITAL_LIMITS: Record<string, [number, number]> = { lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25], fcp: [1800, 3000], ttfb: [800, 1800] };
export function rate(metric: string, v: number | null) {
  if (v === null) return null;
  const [good, poor] = VITAL_LIMITS[metric] ?? [Infinity, Infinity];
  return v <= good ? 'good' : v <= poor ? 'needs work' : 'poor';
}

/** the day a moment falls on, in Sarvakali's own time (India by default) */
export function dayOf(ts: number, tzOffsetMin = 330) {
  return new Date(ts + tzOffsetMin * 60_000).toISOString().slice(0, 10);
}
