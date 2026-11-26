/**
 * POST /api/public: what the public pages ask: a new request from Connect, and a client's own booking and invoice
 * (by the link in their email). Limited per address, so nobody can flood the Studio.
 */
import type { APIRoute } from 'astro';
import { publicCall } from '../core/api';
import { limited } from '../server/stores';
import { isDev } from '../server/env';
import { fail, hostEnv, json } from '../server/runtime';

export const prerender = false;

const ipOf = (request: Request, fallback: string) =>
  request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || fallback || 'unknown';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let ip = 'unknown';
  try { ip = ipOf(request, clientAddress); } catch { /* no address in some runtimes */ }
  try {
    const body = (await request.json()) as { action?: string; payload?: Record<string, unknown> };
    const action = String(body.action || '');
    // six requests an hour from one address on the live site; many more on a developer's own computer, for the checks
    if (action === 'request' && (await limited(`request:${ip}`, isDev() ? 500 : 6, 3600_000))) return json({ error: 'Several requests have come from here already. Please try again in an hour, or write by email.' }, 429);
    if (await limited(`public:${ip}`, 150, 600_000)) return json({ error: 'Please wait a little and try again.' }, 429);
    return json(await publicCall(await hostEnv(request.url), action, body.payload ?? {}));
  } catch (e) { return fail(e); }
};
