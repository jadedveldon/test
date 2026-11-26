/** POST /api/studio/sign-in and /api/studio/sign-out */
import type { APIRoute } from 'astro';
import { SESSION, checkPassword, cookieOptions, makeSession, sameOrigin } from '../server/auth';
import { secret } from '../server/env';
import { limited } from '../server/stores';
import { PRIVATE, json, throughDoor } from '../server/runtime';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, params, clientAddress }) => {
  if (!(await throughDoor(cookies))) return new Response('Not found', { status: 404, headers: PRIVATE });
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  if (params.step !== 'sign-in' && params.step !== 'sign-out') return new Response('Not found', { status: 404, headers: PRIVATE });
  if (params.step === 'sign-out') { cookies.delete(SESSION, { path: '/' }); return json({ ok: true }); }
  if (!secret()) return json({ error: 'The Studio is not set up yet: STUDIO_SECRET is missing on the host.' }, 503);
  let ip = 'unknown';
  try { ip = request.headers.get('x-nf-client-connection-ip') || clientAddress; } catch { /* fine */ }
  if (await limited(`signin:${ip}`, 8, 15 * 60_000)) return json({ error: 'Too many tries. Please wait fifteen minutes.' }, 429);
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  // a pause on every try, so guessing is slow
  await new Promise((r) => setTimeout(r, 350));
  if (!password || !checkPassword(String(password))) return json({ error: 'That password is not right.' }, 401);
  cookies.set(SESSION, await makeSession(), cookieOptions());
  return json({ ok: true });
};
