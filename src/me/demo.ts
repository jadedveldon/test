/**
 * Accounts in the preview: the same rules (src/me/core/accounts.ts) answering in the browser, with nothing sent.
 * The "email" is shown on screen as a link; the "host" is this browser's storage ("sk-me-demo"), so a second
 * browser profile cannot share it, but signing out and back in, the journal lock and My space all work as they
 * will. Sign in with one of the Studio demo's made-up clients (asha.rao@example.com) to see a client's space.
 */
import { MeError, account, act, hasAccount, redeem, startSignIn, type Kv, type MeEnv } from './core/accounts';
import { demoDb } from '../studio/demo/demo';
import { pageHref } from '../studio/client';
import words from '../content/pages/me.json';

const KEY = 'sk-me-demo';
type Box = { kv: Record<string, unknown>; session?: { id: string; gen: number } };
let memory: Box = { kv: {} };
const load = (): Box => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') ?? { kv: {} }; } catch { return memory; } };
const save = (b: Box) => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { memory = b; } };
const copy = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const kv: Kv = {
  async get<T>(k: string) { return (copy(load().kv[k]) as T) ?? null; },
  async set(k, v) { const b = load(); b.kv[k] = copy(v); save(b); },
  async del(k) { const b = load(); delete b.kv[k]; save(b); },
  async swap<T>(k: string, fn: (v: T | null) => T | null) { const b = load(); const next = fn((copy(b.kv[k]) as T) ?? null); if (next === null) return null; b.kv[k] = copy(next); save(b); return next; },
};

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');
const site = () => location.href.split(/[?#]/)[0].replace(/\/[^/]*$/, '');

const env = (): MeEnv => ({
  kv,
  now: () => Date.now(),
  token: () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  sha256: async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))),
  send: async () => 'shown',
  linkUrl: (t) => `${pageHref('me')}?t=${t}`,
  siteUrl: site(),
  page: (name) => pageHref(name),
  studio: async () => { try { return await demoDb(); } catch { return null; } },
});

export async function demoMe(action: string, p: Record<string, unknown> = {}) {
  const e = env();
  try {
    if (action === 'start') return await startSignIn(e, p.email, p.consent);
    if (action === 'redeem') {
      const r = await redeem(e, p.t);
      const b = load(); b.session = { id: r.id, gen: r.gen }; save(b);
      return { ok: true, created: r.created, state: await act(e, await account(e, r.id, r.gen), 'state', {}) };
    }
    if (action === 'signout') { const b = load(); delete b.session; save(b); return { ok: true }; }
    const s = load().session;
    if (!s) throw new MeError(401, words.errors.signedOut);
    const out = await act(e, await account(e, s.id, s.gen), action, p);
    if (action === 'signoutAll' || action === 'delete') { const b = load(); delete b.session; save(b); }
    return out;
  } catch (err) {
    if (err instanceof MeError && err.status === 401) { const b = load(); delete b.session; save(b); }
    throw err;
  }
}

/** for the Studio demo's client page */
export const demoHasAccount = (email: unknown) => hasAccount(env(), email);
