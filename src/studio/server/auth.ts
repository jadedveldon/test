/**
 * Signing in to the Studio. Behind the secret door (as for the content editor) there is one password, Sarvakali's,
 * kept on the host only as a scrypt hash. Signing in sets a cookie that is signed (HMAC), lasts 30 days, cannot be
 * read by scripts and is only sent to this site. Wrong passwords are counted per address and slowed down.
 */
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import { DEV_PASSWORD, env, isDev, secret } from './env';

export const SESSION = 'sk_studio';
const DAYS = 30;

export const b64url = (b: Buffer | Uint8Array) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))));
}

/** a hash for STUDIO_PASSWORD_HASH: scrypt$N$r$p$salt$hash */
export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const h = scryptSync(pw.normalize('NFKC'), salt, 32, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${b64url(salt)}$${b64url(h)}`;
}

export function checkPassword(pw: string) {
  const stored = env('STUDIO_PASSWORD_HASH');
  if (!stored) return isDev() && pw === DEV_PASSWORD;
  const [kind, N, r, p, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const got = scryptSync(pw.normalize('NFKC'), Buffer.from(salt.replace(/-/g, '+').replace(/_/g, '/'), 'base64'), want.length, { N: Number(N), r: Number(r), p: Number(p) });
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function makeSession() {
  const payload = b64url(Buffer.from(JSON.stringify({ exp: Date.now() + DAYS * 86400_000, n: b64url(randomBytes(9)) })));
  return `${payload}.${await hmac(payload)}`;
}

export async function validSession(cookie?: string) {
  if (!cookie || !secret()) return false;
  const [payload, sig] = cookie.split('.');
  if (!payload || !sig) return false;
  const want = await hmac(payload);
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch { return false; }
}

export const cookieOptions = () => ({ path: '/', httpOnly: true, secure: !isDev(), sameSite: 'lax' as const, maxAge: DAYS * 86400 });

/** a change from the Studio must come from the Studio's own pages */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return request.method === 'GET';
  return origin === new URL(request.url).origin;
}
