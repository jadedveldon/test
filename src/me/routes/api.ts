/**
 * POST /api/me: visitor accounts. Without a sign-in: `start` (email me a link) and `redeem` (the link, opened on
 * /me). Signed in, by this device's cookie: `state`, `sync`, `journal.set`, `journal.forget`, `export`,
 * `signout`, `signoutAll`, `delete`. Limited per address and per email, and only from the site's own pages.
 */
import type { APIRoute } from 'astro';
import { MeError, account, act, redeem, startSignIn } from '../core/accounts';
import { COOKIE, hostMeEnv, makeMeCookie, meCookieOptions, readMeCookie } from '../server/host';
import { sameOrigin } from '../../studio/server/auth';
import { isDev, secret } from '../../studio/server/env';
import { limited } from '../../studio/server/stores';
import { json } from '../../studio/server/runtime';
import words from '../../content/pages/me.json';
import { currentRef, log } from '../../obs/server/log';

export const prerender = false;

const ipOf = (request: Request, fallback: () => string) => {
  try { return request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || fallback(); } catch { return 'unknown'; }
};

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  if (!secret()) return json({ error: words.errors.noEmail }, 503);
  const ip = ipOf(request, () => clientAddress);
  const many = isDev() ? 50 : 1;
  try {
    const { action, payload = {} } = (await request.json()) as { action?: string; payload?: Record<string, unknown> };
    const env = await hostMeEnv(request.url);
    if (await limited(`me:${ip}`, 600 * many, 600_000)) return json({ error: words.errors.tooMany }, 429);
    if (action === 'start') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      if ((await limited(`me-start:${ip}`, 10 * many, 3600_000)) || (await limited(`me-start:${await env.sha256(email)}`, 5 * many, 3600_000))) return json({ error: words.errors.tooMany }, 429);
      return json(await startSignIn(env, payload.email, payload.consent));
    }
    if (action === 'redeem') {
      if (await limited(`me-redeem:${ip}`, 20 * many, 3600_000)) return json({ error: words.errors.tooMany }, 429);
      const r = await redeem(env, payload.t);
      cookies.set(COOKIE, await makeMeCookie(r.id, r.gen), meCookieOptions());
      const acc = await account(env, r.id, r.gen);
      return json({ ok: true, created: r.created, state: await act(env, acc, 'state', {}) });
    }
    if (action === 'signout') { cookies.delete(COOKIE, { path: '/' }); return json({ ok: true }); }
    const who = await readMeCookie(cookies.get(COOKIE)?.value);
    if (!who) return json({ error: words.errors.signedOut, signedOut: true }, 401);
    const acc = await account(env, who.id, who.gen);
    const out = await act(env, acc, String(action ?? ''), payload);
    if (action === 'signoutAll' || action === 'delete') cookies.delete(COOKIE, { path: '/' });
    return json(out);
  } catch (e) {
    if (e instanceof MeError) {
      if (e.status === 401) cookies.delete(COOKIE, { path: '/' });
      return json({ error: e.message, signedOut: e.status === 401 || undefined }, e.status);
    }
    log.error('account action failed', {}, e);
    return json({ error: words.errors.generic, ref: currentRef() }, 500);
  }
};
