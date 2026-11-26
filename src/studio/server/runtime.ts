/** the Studio's working parts on the host, put together for one request */
import { owner, slim } from '../core/api';
import { StudioError } from '../core/ops';
import { transact, type Env } from '../core/runner';
import { COOKIE, doorSecret, fingerprint, same } from '../../editor/secret';
import { SESSION, sameOrigin, validSession } from './auth';
import { isDev, readiness, siteUrl } from './env';
import { disconnect, googleAccount, googleCalendar, googleReady, noCalendar } from './google';
import { serverMailer } from './mail';
import { serverStore } from './stores';

export async function hostEnv(requestUrl: string): Promise<Env> {
  const store = await serverStore();
  const replyTo = async () => { const { db } = await store.load(); return db?.settings?.ownerEmail ?? ''; };
  return { store, mailer: serverMailer(replyTo), calendar: googleReady() ? googleCalendar : noCalendar, siteUrl: siteUrl(requestUrl) };
}

export const PRIVATE = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data ?? null), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...PRIVATE } });

export function fail(e: unknown) {
  if (e instanceof StudioError) return json({ error: e.message }, e.status);
  console.error('[studio]', e);
  return json({ error: 'Something went wrong. Please try again.' }, 500);
}

type Cookies = { get(name: string): { value: string } | undefined };

/** behind the door? (always, in development with no door word set) */
export async function throughDoor(cookies: Cookies) {
  const secret = doorSecret();
  if (!secret) return isDev();
  return same(cookies.get(COOKIE)?.value ?? '', await fingerprint(secret));
}

export const signedIn = (cookies: Cookies) => validSession(cookies.get(SESSION)?.value);

/** the Studio's own requests: door, sign-in and same-site, then the named action */
export async function handleOwner(request: Request, cookies: Cookies) {
  if (!(await throughDoor(cookies))) return new Response('Not found', { status: 404, headers: PRIVATE });
  if (!(await signedIn(cookies))) return json({ error: 'Please sign in again.' }, 401);
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  try {
    const { action, payload } = (await request.json()) as { action: string; payload?: Record<string, unknown> };
    const env = await hostEnv(request.url);
    if (action === 'readiness') return json({ ...readiness(), googleAccount: await googleAccount() });
    if (action === 'google.disconnect') {
      await disconnect();
      const { db } = await transact(env, (d) => { d.google = { connected: false }; });
      return json({ state: slim(db) });
    }
    if (action === 'state') {
      // reminders that have come due go out whenever the Studio is opened, as well as hourly
      try { await owner(env, 'runReminders'); } catch { /* never in the way of opening the Studio */ }
    }
    return json(await owner(env, action, payload ?? {}));
  } catch (e) { return fail(e); }
}
