/**
 * Where the site's own numbers, errors and logs are kept, and how the Studio's Insights reads them. The same rules
 * run on the host (Netlify Blobs, store "obs"; a folder in .studio-data/ in development) and in the preview's demo
 * (this browser's storage). Keys:
 *
 *   ev/<day>/<hour>/<id>     one batch of events from one page, as the host enriched them        kept 30 days
 *   log/<day>/<hour>/<ref>   one request's log lines, found again by its reference               kept 30 days
 *   sum/<day>                that day in numbers (src/obs/core/events.ts)                         kept 400 days
 *   state/errors             what Sarvakali marked each error (open, fixed, ignored)
 *   state/known              errors already alerted about
 *   state/meta               when the numbers were last worked out, and the last alert
 *
 * Days are Sarvakali's (India time). See docs/observability.md.
 */
import { refTime } from './clean';
import { combine, dayOf, emptyDay, rollup, toStored, type DaySummary, type ErrorGroup, type Stored } from './events';

export interface ObsKv {
  get<T>(key: string): Promise<T | null>;
  put(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  /** every key starting with the prefix */
  list(prefix: string): Promise<string[]>;
}
export interface ObsEnv { kv: ObsKv; now(): number; tz?: number }

export type Level = 'debug' | 'info' | 'warn' | 'error';
export interface LogLine { ts: number; lvl: Level; msg: string; ref?: string; route?: string; method?: string; status?: number; ms?: number; fields?: Record<string, unknown>; err?: { name?: string; message: string; stack?: string } }

export const RAW_DAYS = 30;
export const SUM_DAYS = 400;
const tz = (env: ObsEnv) => env.tz ?? 330;
const hourOf = (ts: number, off: number) => new Date(ts + off * 60_000).toISOString().slice(11, 13);
const daysBack = (day: string, n: number) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const rand = () => Math.floor(Math.random() * 0xffffff).toString(36);

/* ---------------------------------------------------------------- writing */

export async function recordEvents(env: ObsEnv, events: Stored[]) {
  if (!events.length) return;
  const ts = events[0].ts;
  await env.kv.put(`ev/${dayOf(ts, tz(env))}/${hourOf(ts, tz(env))}/${ts.toString(36)}-${rand()}`, events);
}

export async function recordLog(env: ObsEnv, ref: string, lines: LogLine[]) {
  if (!lines.length) return;
  const ts = refTime(ref) ?? lines[0].ts;
  await env.kv.put(`log/${dayOf(ts, tz(env))}/${hourOf(ts, tz(env))}/${ref}`, lines);
}

/* ---------------------------------------------------------------- a day in numbers */

async function rawDay(env: ObsEnv, day: string) {
  const keys = await env.kv.list(`ev/${day}/`);
  const out: Stored[] = [];
  // a busy day is read in batches, so the host is never asked for thousands at once
  for (let i = 0; i < keys.length; i += 50) {
    const got = await Promise.all(keys.slice(i, i + 50).map((k) => env.kv.get<Stored[]>(k)));
    for (const g of got) if (Array.isArray(g)) out.push(...g);
  }
  return out;
}

/** works out one day from its events and keeps the result */
export async function rollupDay(env: ObsEnv, day: string) {
  const s = toStored(rollup(day, await rawDay(env, day), tz(env)));
  await env.kv.put(`sum/${day}`, s);
  return s;
}

type Meta = { rolledAt?: number; alertedAt?: number; pruneAt?: number };

/** the hourly round: today and yesterday worked out, old raw events and logs let go */
export async function hourly(env: ObsEnv) {
  const today = dayOf(env.now(), tz(env));
  const sums = [await rollupDay(env, daysBack(today, 1)), await rollupDay(env, today)];
  const meta = (await env.kv.get<Meta>('state/meta')) ?? {};
  let pruned = 0;
  if (!meta.pruneAt || env.now() - meta.pruneAt > 6 * 3600_000) {
    pruned = await prune(env, today);
    meta.pruneAt = env.now();
  }
  meta.rolledAt = env.now();
  await env.kv.put('state/meta', meta);
  return { today: sums[1], yesterday: sums[0], pruned };
}

async function prune(env: ObsEnv, today: string) {
  let n = 0;
  const rawEdge = daysBack(today, RAW_DAYS);
  const sumEdge = daysBack(today, SUM_DAYS);
  // the daily secrets that make visitor hashes: gone after two days, so old hashes can never be worked back
  for (const k of await env.kv.list('state/salt-')) if (k.slice(11) < daysBack(today, 1)) { await env.kv.del(k); n++; }
  for (const [prefix, edge] of [['ev/', rawEdge], ['log/', rawEdge], ['sum/', sumEdge]] as const) {
    for (const k of await env.kv.list(prefix)) {
      const day = k.slice(prefix.length, prefix.length + 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day < edge) { await env.kv.del(k); n++; }
    }
  }
  return n;
}

/* ---------------------------------------------------------------- what the Studio reads */

export type ErrorState = Record<string, { status: 'open' | 'fixed' | 'ignored'; at: number }>;

export async function insights(env: ObsEnv, a: { days?: number; to?: string; force?: boolean } = {}) {
  const span = Math.min(366, Math.max(1, Math.round(a.days ?? 30)));
  const today = dayOf(env.now(), tz(env));
  const to = a.to && /^\d{4}-\d{2}-\d{2}$/.test(a.to) && a.to <= today ? a.to : today;
  const meta = (await env.kv.get<Meta>('state/meta')) ?? {};
  // worked out a moment ago: read as kept (the refresh button asks for it afresh)
  const fresh = !a.force && meta.rolledAt && env.now() - meta.rolledAt < 2 * 60_000;
  const days: DaySummary[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const day = daysBack(to, i);
    // today is always worked out afresh (unless it was a moment ago); earlier days are read as kept
    let s = day === today && !fresh ? null : await env.kv.get<DaySummary>(`sum/${day}`);
    if (!s && day >= daysBack(today, RAW_DAYS)) s = (await env.kv.list(`ev/${day}/`)).length ? await rollupDay(env, day) : null;
    days.push(s ?? emptyDay(day));
  }
  if (!fresh) { meta.rolledAt = env.now(); await env.kv.put('state/meta', meta); }
  const total = combine(days);
  const state = (await env.kv.get<ErrorState>('state/errors')) ?? {};
  const errors = Object.values(total.errors)
    .map((g) => ({ ...g, status: state[g.f] && state[g.f].at >= g.last ? state[g.f].status : state[g.f]?.status === 'ignored' ? 'ignored' : 'open' }))
    .sort((x, y) => (x.status === 'open' ? 0 : 1) - (y.status === 'open' ? 0 : 1) || y.last - x.last);
  return {
    from: days[0].day, to, span,
    series: days.map((d) => ({ day: d.day, visitors: d.visitors, visits: d.visits, views: d.views, errors: Object.values(d.errors).reduce((n, g) => n + g.n, 0), goals: d.goals })),
    total: { ...total, errors: {} },
    errors,
    updatedAt: env.now(),
  };
}

/** a client's "it went wrong" reference, or a log line's, back to everything the host wrote for that request */
export async function logByRef(env: ObsEnv, ref: string) {
  const ts = refTime(ref);
  if (!ts) return null;
  return env.kv.get<LogLine[]>(`log/${dayOf(ts, tz(env))}/${hourOf(ts, tz(env))}/${ref}`);
}

/** the most recent requests' logs of a day, newest first (warnings and errors only, if asked) */
export async function recentLogs(env: ObsEnv, a: { day?: string; level?: Level; limit?: number; route?: string } = {}) {
  const day = a.day && /^\d{4}-\d{2}-\d{2}$/.test(a.day) ? a.day : dayOf(env.now(), tz(env));
  const keys = (await env.kv.list(`log/${day}/`)).sort().reverse().slice(0, 400);
  const out: { ref: string; lines: LogLine[] }[] = [];
  const want = (l: LogLine) => (a.level === 'error' ? l.lvl === 'error' : a.level === 'warn' ? l.lvl === 'warn' || l.lvl === 'error' : true) && (!a.route || (l.route ?? '').includes(a.route));
  for (let i = 0; i < keys.length && out.length < (a.limit ?? 60); i += 40) {
    const got = await Promise.all(keys.slice(i, i + 40).map(async (k) => ({ ref: k.split('/').pop()!, lines: (await env.kv.get<LogLine[]>(k)) ?? [] })));
    for (const g of got) if (g.lines.some(want) && out.length < (a.limit ?? 60)) out.push(g);
  }
  return { day, logs: out };
}

export async function setErrorStatus(env: ObsEnv, f: string, status: 'open' | 'fixed' | 'ignored') {
  const s = (await env.kv.get<ErrorState>('state/errors')) ?? {};
  s[f] = { status, at: env.now() };
  await env.kv.put('state/errors', s);
  return { ok: true };
}

/* ---------------------------------------------------------------- alerts */

/** errors not seen before (or come back after being marked fixed), worth telling Sarvakali about */
export async function newProblems(env: ObsEnv, today: DaySummary): Promise<ErrorGroup[]> {
  const known = (await env.kv.get<Record<string, number>>('state/known')) ?? {};
  const state = (await env.kv.get<ErrorState>('state/errors')) ?? {};
  const fresh = Object.values(today.errors).filter((g) => {
    if (state[g.f]?.status === 'ignored') return false;
    const back = state[g.f]?.status === 'fixed' && g.last > state[g.f].at;
    // a visitor's browser can fail for its own reasons: one-offs wait until they happen three times
    const enough = g.src === 'server' || g.n >= 3;
    return enough && (!known[g.f] || back);
  });
  return fresh;
}

/** at most one alert every few hours; what was not told waits for the next one */
export async function mayAlert(env: ObsEnv, everyMs = 3 * 3600_000) {
  const meta = (await env.kv.get<Meta>('state/meta')) ?? {};
  return !meta.alertedAt || env.now() - meta.alertedAt >= everyMs;
}

/** after telling Sarvakali: these errors are known, and the next alert waits */
export async function alerted(env: ObsEnv, groups: ErrorGroup[]) {
  const known = (await env.kv.get<Record<string, number>>('state/known')) ?? {};
  for (const g of groups) known[g.f] = env.now();
  await env.kv.put('state/known', known);
  const meta = (await env.kv.get<Meta>('state/meta')) ?? {};
  meta.alertedAt = env.now();
  await env.kv.put('state/meta', meta);
}

/** the Studio's Insights actions, the same on the host and in the demo */
export async function insightsAction(env: ObsEnv, action: string, p: Record<string, unknown>) {
  switch (action) {
    case 'insights': return insights(env, { days: Number(p.days) || 30, to: typeof p.to === 'string' ? p.to : undefined, force: p.force === true });
    case 'insights.logs': return recentLogs(env, { day: typeof p.day === 'string' ? p.day : undefined, level: p.level === 'error' || p.level === 'warn' ? p.level : undefined, route: typeof p.route === 'string' ? p.route.slice(0, 60) : undefined });
    case 'insights.log': return { ref: String(p.ref ?? ''), lines: typeof p.ref === 'string' ? await logByRef(env, p.ref.trim()) : null };
    case 'insights.error': {
      const st = p.status === 'fixed' || p.status === 'ignored' || p.status === 'open' ? p.status : null;
      if (typeof p.f !== 'string' || !/^[0-9a-f]{8}$/.test(p.f) || !st) throw new Error('Unknown error group');
      return setErrorStatus(env, p.f, st);
    }
    default: return null;
  }
}
