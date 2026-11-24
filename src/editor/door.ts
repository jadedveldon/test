import type { APIRoute } from 'astro';
import { COOKIE, PRIVATE, doorSecret, fingerprint, notFound, same } from './secret';

export const prerender = false;

/** /door/<secret>: opens the editor on this device for 30 days, then goes to it; any other word is "not found" */
export const GET: APIRoute = async ({ params, cookies, redirect }) => {
  const secret = doorSecret();
  if (!secret || !same(params.key ?? '', secret)) return notFound();
  cookies.set(COOKIE, await fingerprint(secret), { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
  const res = redirect('/keystatic', 303);
  for (const [k, v] of Object.entries(PRIVATE)) res.headers.set(k, v);
  return res;
};
