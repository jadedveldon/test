/**
 * Visitor accounts on the host: the shared rules (src/me/core/accounts.ts) with Netlify Blobs for storage (a file
 * in .studio-data/ in development), Resend for the sign-in email, and a signed cookie for each signed-in device.
 * Uses the Studio's own settings (STUDIO_SECRET, RESEND_API_KEY, MAIL_FROM); nothing new to set up.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { MeEnv } from '../core/accounts';
import { b64url, hmac } from '../../studio/server/auth';
import { env as envVar, isDev, siteUrl } from '../../studio/server/env';
import { serverMailer } from '../../studio/server/mail';
import { serverStore } from '../../studio/server/stores';

export const COOKIE = 'sk_me';
const YEAR = 365 * 86400;

export async function hostMeEnv(requestUrl: string): Promise<MeEnv> {
  const s = await serverStore();
  const site = siteUrl(requestUrl);
  const mailer = serverMailer(async () => '');
  const emailReady = !!(envVar('RESEND_API_KEY') && envVar('MAIL_FROM'));
  return {
    kv: { get: (k) => s.kvGet(k), set: (k, v) => s.kvSet(k, v), del: (k) => s.kvDelete(k), swap: (k, fn) => s.kvSwap(k, fn) },
    now: () => Date.now(),
    token: () => b64url(randomBytes(24)),
    sha256: async (x) => createHash('sha256').update(x).digest('hex'),
    async send(to, m) {
      // on a developer's own computer, with no email set up, the link is shown on screen instead
      if (!emailReady) return isDev() ? 'shown' : 'saved';
      const r = await mailer.send({ kind: 'me.signIn', to, subject: m.subject, html: m.html, text: m.text });
      return r.status;
    },
    linkUrl: (t) => `${site}/me?t=${t}`,
    siteUrl: site,
    page: (name) => `/${name}`,
    async studio() { try { return (await s.load()).db; } catch { return null; } },
  };
}

/* ---------------------------------------------------------------- the device's cookie */

// "me." keeps these signatures apart from the Studio's own cookie, signed with the same secret
export async function makeMeCookie(id: string, gen: number) {
  const payload = b64url(Buffer.from(JSON.stringify({ id, gen, exp: Date.now() + YEAR * 1000 })));
  return `${payload}.${await hmac(`me.${payload}`)}`;
}

export async function readMeCookie(value?: string): Promise<{ id: string; gen: number } | null> {
  if (!value) return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const want = await hmac(`me.${payload}`);
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const x = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return typeof x.id === 'string' && typeof x.gen === 'number' && x.exp > Date.now() ? { id: x.id, gen: x.gen } : null;
  } catch { return null; }
}

export const meCookieOptions = () => ({ path: '/', httpOnly: true, secure: !isDev(), sameSite: 'lax' as const, maxAge: YEAR });
