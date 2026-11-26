/**
 * POST /api/t: the browser's counts and error reports (src/scripts/telemetry.ts), a batch at a time.
 * Robots are left out. The visitor is not identified: their address and browser make a hash with a secret that
 * changes every day and is then thrown away, so one person's pages can be followed through one day and never
 * linked across days or back to them; the address itself is never kept. Sarvakali's own visits (signed in to the
 * Studio) are marked so they are not counted. Always answers 204: the page never waits on it or learns anything.
 */
import type { APIRoute } from 'astro';
import { createHash, randomBytes } from 'node:crypto';
import { device, isBot } from '../core/clean';
import { cleanEvent, dayOf, type Stored } from '../core/events';
import { recordEvents } from '../core/insights';
import { obsEnv } from '../server/store';
import { log } from '../server/log';
import { SESSION, sameOrigin, validSession } from '../../studio/server/auth';

export const prerender = false;
const NONE = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

// the day's secret, held in memory and in the store (so every copy of the function agrees), gone after two days
const salts = new Map<string, string>();
async function saltFor(day: string) {
  const known = salts.get(day);
  if (known) return known;
  const env = await obsEnv();
  let s = (await env.kv.get<string>(`state/salt-${day}`)) ?? '';
  if (!s) { s = randomBytes(24).toString('hex'); await env.kv.put(`state/salt-${day}`, s); }
  salts.clear();
  salts.set(day, s);
  return s as string;
}

// a simple guard per visitor, per copy of the function: enough to stop a runaway page
const seen = new Map<string, { n: number; reset: number }>();
function tooMany(vh: string, n: number) {
  const now = Date.now();
  if (seen.size > 5000) seen.clear();
  const g = seen.get(vh) ?? { n: 0, reset: now + 60_000 };
  if (g.reset < now) { g.n = 0; g.reset = now + 60_000; }
  g.n += n;
  seen.set(vh, g);
  return g.n > 200;
}

export const POST: APIRoute = async ({ request, cookies, clientAddress, locals }) => {
  try {
    if (!sameOrigin(request)) return NONE();
    const ua = request.headers.get('user-agent') ?? '';
    if (isBot(ua)) return NONE();
    const text = await request.text();
    if (text.length > 64_000) return NONE();
    const body = JSON.parse(text) as { e?: unknown[]; pv?: unknown };
    const events = (Array.isArray(body.e) ? body.e : []).slice(0, 60).map(cleanEvent).filter(Boolean);
    if (!events.length) return NONE();
    let ip = '';
    try { ip = request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress; } catch { ip = 'unknown'; }
    const now = Date.now();
    const vh = createHash('sha256').update(`${await saltFor(dayOf(now))}|${ip}|${ua}`).digest('hex').slice(0, 16);
    if (tooMany(vh, events.length)) return NONE();
    const geo = (locals as { netlify?: { context?: { geo?: { country?: { code?: string } } } } }).netlify?.context?.geo;
    const co = (geo?.country?.code ?? request.headers.get('x-country') ?? '').toUpperCase().slice(0, 2) || undefined;
    const own = await validSession(cookies.get(SESSION)?.value);
    const pv = typeof body.pv === 'string' && /^[a-z0-9]{6,16}$/.test(body.pv) ? body.pv : vh.slice(0, 8);
    const firstView = events.find((e) => e!.k === 'view') as { w?: number } | undefined;
    const d = device(ua, firstView?.w);
    const stored: Stored[] = events.map((e, i) => ({ ...e!, ts: now + i, vh, pv, co, dev: d.kind, br: d.browser, os: d.os, own: own || undefined }));
    await recordEvents(await obsEnv(), stored);
    return NONE();
  } catch (e) {
    // counting must never trouble a visitor; the problem is still in the host's log
    log.warn('telemetry batch dropped', {}, e);
    return NONE();
  }
};
