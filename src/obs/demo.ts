/**
 * Observability in the preview: the counting runs as on the live site, but what it records stays in this browser
 * ("sk-obs-demo"), for the Studio demo's Insights. So that Insights has something to show, it starts with thirty days
 * of made-up visits, errors and logs (no real visitor), on top of which the preview's own visits are counted.
 */
import { device, hash } from './core/clean';
import { dayOf, rollup, toStored, type ClientEvent, type Stored } from './core/events';
import { insightsAction, recordEvents, recordLog, type LogLine, type ObsEnv, type ObsKv } from './core/insights';

const KEY = 'sk-obs-demo-2';
let memory: Record<string, unknown> = {};
const load = (): Record<string, unknown> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return memory; } };
const save = (m: Record<string, unknown>) => {
  // the browser's storage is small: the oldest raw batches give way first
  const evKeys = Object.keys(m).filter((k) => k.startsWith('ev/')).sort();
  for (const k of evKeys.slice(0, Math.max(0, evKeys.length - 600))) delete m[k];
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { memory = m; }
};
const kv: ObsKv = {
  async get<T>(k: string) { return (load()[k] as T) ?? null; },
  async put(k, v) { const m = load(); m[k] = JSON.parse(JSON.stringify(v)); save(m); },
  async del(k) { const m = load(); delete m[k]; save(m); },
  async list(p) { return Object.keys(load()).filter((k) => k.startsWith(p)); },
};
const env: ObsEnv = { kv, now: () => Date.now() };

/** the preview's own visits, enriched as the host would (no address here: the visitor hash is the browser's, per day) */
export async function demoRecord(events: ClientEvent[], pv: string) {
  // kept first: the page may be closing, and the made-up month can wait for the Studio
  const ua = navigator.userAgent;
  const view = events.find((e) => e.k === 'view') as { w?: number } | undefined;
  const d = device(ua, view?.w ?? innerWidth);
  const now = Date.now();
  const vh = hash(`${dayOf(now)}|${ua}`) + 'demo';
  await recordEvents(env, events.map((e, i) => ({ ...e, ts: now + i, vh, pv, co: 'IN', dev: d.kind, br: d.browser, os: d.os })));
}

/* ---------------------------------------------------------------- the made-up month */

function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const pick = <T,>(r: () => number, items: [T, number][]) => { const tot = items.reduce((a, [, w]) => a + w, 0); let x = r() * tot; for (const [v, w] of items) { x -= w; if (x <= 0) return v; } return items[0][0]; };

async function seed() {
  if (await kv.get('state/demo-seeded')) return;
  const r = rng(20261126);
  const pages: [string, number][] = [['/', 30], ['/practice', 18], ['/practice/with/kali', 6], ['/practice/with/grief', 4], ['/practice/library', 6], ['/practice/thursday', 3], ['/pillars/devotion', 7], ['/pillars/healing', 6], ['/pillars/divination', 5], ['/path', 6], ['/connect', 7], ['/about', 5], ['/articles/who-is-kali', 4], ['/care', 3], ['/me', 2]];
  const sources: [string | undefined, number][] = [[undefined, 40], ['google.com', 30], ['instagram.com', 18], ['l.facebook.com', 5], ['app', 4], ['duckduckgo.com', 3]];
  const countries: [string, number][] = [['IN', 70], ['GB', 8], ['US', 9], ['AE', 5], ['SG', 3], ['CA', 3], ['AU', 2]];
  const devs: [[string, string, string], number][] = [[['phone', 'Chrome', 'Android'], 48], [['phone', 'Safari', 'iOS'], 22], [['desktop', 'Chrome', 'Windows'], 16], [['desktop', 'Safari', 'macOS'], 8], [['tablet', 'Safari', 'iOS'], 4], [['desktop', 'Firefox', 'Windows'], 2]];
  const goals: [string, string | undefined, number][] = [['practice-start', 'kali', 4], ['practice-start', 'grief', 3], ['practice-finish', 'kali', 2.5], ['practice-finish', 'grief', 1.6], ['chant', 'gayatri', 2], ['chant', 'aum-namah-shivaya', 1.5], ['keep', 'Kali Working', 1], ['keep', 'Protection Spell', 0.8], ['search', 'kali', 1.2], ['search', 'protection', 0.9], ['search', 'tarot', 0.8], ['search', 'nothing found', 0.6], ['path-result', 'healing', 1], ['path-result', 'devotion', 0.8], ['help-line', undefined, 0.4], ['signin', undefined, 0.6], ['request', undefined, 0.8], ['not-found', 'a link on this site', 0.1]];
  const today = Date.now();
  for (let back = 30; back >= 1; back--) {
    const base = today - back * 86400_000;
    const day = dayOf(base);
    const events: Stored[] = [];
    const visitors = Math.round(18 + (30 - back) * 1.1 + r() * 14 + (new Date(base).getUTCDay() === 0 ? 10 : 0));
    for (let v = 0; v < visitors; v++) {
      const vh = `demo${back}-${v}`;
      const [dev, br, os] = pick(r, devs);
      const co = pick(r, countries);
      let ts = Date.parse(`${day}T00:00:00Z`) - 330 * 60_000 + (6 + r() * 16) * 3600_000;
      const n = 1 + Math.floor(r() * r() * 6);
      // about one in five comes back later the same day
      const back2 = r() < 0.2 ? Math.min(n, 1 + Math.floor(r() * 2)) : 0;
      for (let i = 0; i < n + back2; i++) {
        if (i === n) ts += (2 + r() * 4) * 3600_000;
        const p = i === 0 || i === n ? pick(r, pages) : pick(r, pages.slice(1));
        const src = i === 0 || i === n ? pick(r, sources) : undefined;
        events.push({ k: 'view', p, r: src, w: dev === 'phone' ? 390 : 1440, ts, vh, pv: `${vh}-${i}`, co, dev, br, os } as Stored);
        const ms = Math.round(8000 + r() * 160000);
        events.push({ k: 'leave', p, ms, sd: Math.round(20 + r() * 80), v: i === 0 ? { lcp: Math.round((dev === 'phone' ? 1300 : 800) + r() * r() * 3200), cls: Math.round(r() * r() * 200) / 1000, inp: Math.round(60 + r() * 260), fcp: Math.round(700 + r() * 1400), ttfb: Math.round(120 + r() * 700) } : undefined, ts: ts + ms, vh, pv: `${vh}-${i}`, co, dev, br, os } as Stored);
        for (const [g, d, w] of goals) if (r() < w / 40) events.push({ k: 'goal', p, n: g, d, ts: ts + 2000, vh, pv: `${vh}-${i}` } as Stored);
        ts += ms + 3000;
      }
    }
    if (back % 4 === 1) events.push({ k: 'error', p: '/practice/library', m: 'TypeError: Cannot read properties of null (reading \'dataset\')', s: 'TypeError: Cannot read properties of null (reading \'dataset\')\n    at filter (/_astro/mantra.js:1:2210)', src: 'onerror', f: 'a1b2c3d4', crumbs: [{ t: 0, c: 'nav', m: '/practice/library' }, { t: 4200, c: 'click', m: 'input [data-f-day] “Thursday”' }, { t: 4300, c: 'click', m: 'button [data-f-clear] “Clear”' }, { t: 4310, c: 'error', m: 'TypeError: Cannot read properties of null' }], ts: base, vh: 'demoE', pv: 'demoE', dev: 'phone', br: 'Safari', os: 'iOS' } as Stored);
    if (back === 3) events.push({ k: 'error', p: '/api/public', m: 'Store unavailable: timed out after 10 s', src: 'server', f: 'e5f6a7b8', ref: 'mdemo001-0a0a', ts: base + 3600_000, vh: 'server', pv: 'server' } as Stored);
    if (back % 6 === 2) events.push({ k: 'error', p: '/pillars/devotion', m: 'Could not load img: /depth/kali-163.jpg', src: 'resource', f: 'c9d0e1f2', crumbs: [{ t: 0, c: 'nav', m: '/pillars/devotion' }, { t: 900, c: 'nav', m: 'went offline' }], ts: base + 7200_000, vh: 'demoR', pv: 'demoR', dev: 'phone', br: 'Chrome', os: 'Android' } as Stored);
    await kv.put(`sum/${day}`, toStored(rollup(day, events)));
  }
  // a few requests' log lines, as the host keeps them
  const at = today - 3 * 86400_000 + 3600_000;
  const lines = (ref: string, t: number, route: string, status: number, extra: Partial<LogLine>[] = []): LogLine[] => [...extra.map((x) => ({ ts: t, lvl: 'info' as const, msg: '', ref, route, method: 'POST', ...x })), { ts: t + 40, lvl: status >= 500 ? 'error' : 'info', msg: 'request', ref, route, method: 'POST', status, ms: status >= 500 ? 10021 : 84 }];
  await recordLog(env, 'mdemo001-0a0a', lines('mdemo001-0a0a', at, '/api/public', 500, [{ lvl: 'error', msg: 'studio action failed', err: { name: 'Error', message: 'Store unavailable: timed out after 10 s', stack: 'Error: Store unavailable\n    at blobStore.load (src/studio/server/stores.ts)' } }]));
  for (let k = 0; k < 6; k++) { const t = today - k * 1800_000; const ref = `${t.toString(36)}-00${k}a`; await recordLog(env, ref, lines(ref, t, k % 2 ? '/api/me' : '/api/public', 200, [{ msg: k % 2 ? 'account sync' : 'request received', fields: { action: k % 2 ? 'sync' : 'request' } }])); }
  await kv.put('state/demo-seeded', 1);
}

export async function demoInsights(action: string, p: Record<string, unknown> = {}) {
  await seed();
  if (action === 'insights.health') return { status: 'ok', version: 'preview', time: new Date().toISOString(), checks: { demo: true } };
  return insightsAction(env, action, p);
}
