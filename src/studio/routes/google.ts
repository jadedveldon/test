/** GET /api/studio/google/connect and /api/studio/google/callback: connecting Sarvakali's Google Calendar */
import type { APIRoute } from 'astro';
import { log } from '../../obs/server/log';
import { transact } from '../core/runner';
import { consentUrl, finishConnect, googleReady } from '../server/google';
import { PRIVATE, hostEnv, signedIn, throughDoor } from '../server/runtime';

export const prerender = false;
const STATE = 'sk_gstate';

export const GET: APIRoute = async ({ request, cookies, params, url, redirect }) => {
  if (!(await throughDoor(cookies)) || !(await signedIn(cookies))) return new Response('Not found', { status: 404, headers: PRIVATE });
  const back = (q: string) => redirect(`/studio#/settings?google=${q}`, 303);
  if (!googleReady()) return back('not-set-up');
  const redirectUri = `${url.origin}/api/studio/google/callback`;
  if (params.step === 'connect') {
    const state = crypto.randomUUID();
    cookies.set(STATE, state, { path: '/api/studio/google', httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', maxAge: 600 });
    return redirect(consentUrl(redirectUri, state), 303);
  }
  if (params.step === 'callback') {
    const want = cookies.get(STATE)?.value;
    cookies.delete(STATE, { path: '/api/studio/google' });
    if (url.searchParams.get('error')) return back('declined');
    if (!want || want !== url.searchParams.get('state')) return back('expired');
    try {
      const email = await finishConnect(url.searchParams.get('code') || '', redirectUri);
      await transact(await hostEnv(request.url), (d) => { d.google = { connected: true, email }; });
      return back('ok');
    } catch (e) {
      log.error('google connection failed', {}, e);
      return back('failed');
    }
  }
  return new Response('Not found', { status: 404, headers: PRIVATE });
};
