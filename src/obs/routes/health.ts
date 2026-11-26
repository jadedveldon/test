/**
 * GET /api/health: whether the site's working parts answer, for an uptime monitor (any service that calls an address
 * every few minutes and tells you when it stops answering). Everyone sees "ok" or "degraded" and the version; signed
 * in to the Studio, the details. Answers 503 when something is down, so a monitor notices.
 */
import type { APIRoute } from 'astro';
import { obsEnv } from '../server/store';
import { serverStore } from '../../studio/server/stores';
import { SESSION, validSession } from '../../studio/server/auth';
import { env, readiness } from '../../studio/server/env';
import { PRIVATE } from '../../studio/server/runtime';

export const prerender = false;

async function timed<T>(f: () => Promise<T>) {
  const t = performance.now();
  try { await f(); return { ok: true, ms: Math.round(performance.now() - t) }; } catch (e) { return { ok: false, ms: Math.round(performance.now() - t), error: String(e).slice(0, 120) }; }
}

/** the report itself; the details only for Sarvakali */
export async function healthReport(details: boolean) {
  const [studio, obs] = await Promise.all([
    timed(async () => { await (await serverStore()).load(); }),
    timed(async () => { const o = await obsEnv(); await o.kv.put('state/ping', Date.now()); await o.kv.get('state/ping'); }),
  ]);
  const status = studio.ok && obs.ok ? 'ok' : 'degraded';
  const version = (env('COMMIT_REF') || env('DEPLOY_ID') || 'dev').slice(0, 12);
  const body: Record<string, unknown> = { status, version, time: new Date().toISOString() };
  if (details) {
    const meta = await (await obsEnv()).kv.get<{ rolledAt?: number; alertedAt?: number }>('state/meta');
    body.checks = { studioStore: studio, obsStore: obs, setup: readiness(), lastRollup: meta?.rolledAt ? new Date(meta.rolledAt).toISOString() : null, lastAlert: meta?.alertedAt ? new Date(meta.alertedAt).toISOString() : null };
  }
  return body;
}

export const GET: APIRoute = async ({ cookies }) => {
  const body = await healthReport(await validSession(cookies.get(SESSION)?.value));
  return new Response(JSON.stringify(body), { status: body.status === 'ok' ? 200 : 503, headers: { 'content-type': 'application/json; charset=utf-8', ...PRIVATE } });
};
