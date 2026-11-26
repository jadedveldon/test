/**
 * Google Calendar and Meet. Sarvakali connects her Google account once, from the Studio's settings (Google asks
 * her to allow it). After that, each confirmed conversation becomes an event in her calendar, with a Google Meet
 * link, the client as a guest, and the event moved or removed when the conversation is. The key Google gives is
 * kept on the host only, encrypted with STUDIO_SECRET.
 *
 * Needs, on the host: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, from an OAuth client (type "Web application") in
 * a Google Cloud project with the Google Calendar API turned on, whose redirect address is
 * <site>/api/studio/google/callback. See docs/studio.md.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { Calendar } from '../core/runner';
import type { Booking, Client, Settings } from '../core/types';
import { env, secret } from './env';
import { serverStore } from './stores';

const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'];
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

type Saved = { refresh: string; email?: string; at: string };

const key = () => createHash('sha256').update(`google:${secret()}`).digest();
function lock(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}
function unlock(box: string) {
  const [iv, tag, enc] = box.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

export const googleReady = () => !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET') && secret());

export function consentUrl(redirect: string, state: string) {
  const q = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '),
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function token(body: Record<string, string>) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google sign-in: ${j.error_description || j.error || r.status}`);
  return j as { access_token: string; refresh_token?: string; expires_in: number; id_token?: string };
}

/** after Google sends Sarvakali back: keep the key, note which account it is */
export async function finishConnect(code: string, redirect: string) {
  const t = await token({ code, grant_type: 'authorization_code', redirect_uri: redirect });
  if (!t.refresh_token) throw new Error('Google did not give a lasting key. Remove the Studio from your Google account’s connected apps, then connect again.');
  let email: string | undefined;
  try {
    const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } });
    email = (await r.json()).email;
  } catch { /* the address is only shown in settings */ }
  const s = await serverStore();
  await s.kvSet('google', { refresh: lock(t.refresh_token), email, at: new Date().toISOString() } satisfies Saved);
  return email;
}

export async function disconnect() {
  const s = await serverStore();
  const saved = await s.kvGet<Saved>('google');
  if (saved) {
    try { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(unlock(saved.refresh))}`, { method: 'POST' }); } catch { /* already gone */ }
  }
  await s.kvDelete('google');
}

let access: { token: string; until: number } | null = null;
async function accessToken() {
  if (access && access.until > Date.now() + 60_000) return access.token;
  const saved = await (await serverStore()).kvGet<Saved>('google');
  if (!saved) throw new Error('Google Calendar is not connected.');
  const t = await token({ refresh_token: unlock(saved.refresh), grant_type: 'refresh_token' });
  access = { token: t.access_token, until: Date.now() + t.expires_in * 1000 };
  return access.token;
}

async function call(method: string, url: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 204 || r.status === 410 || (method === 'DELETE' && r.status === 404)) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google Calendar ${r.status}: ${j.error?.message || 'error'}`);
  return j;
}

const meetOf = (ev: { hangoutLink?: string; conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] } } | null) =>
  ev?.hangoutLink || ev?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;

export const googleCalendar: Calendar = {
  name: 'google',
  async available() { return googleReady() && !!(await (await serverStore()).kvGet('google')); },
  async upsert(b: Booking, c: Client, s: Settings, site: string) {
    if (!b.start) return {};
    const end = new Date(Date.parse(b.start) + b.durationMin * 60000).toISOString();
    const send = s.googleInvites ? 'all' : 'none';
    const event: Record<string, unknown> = {
      summary: `${c.name} · conversation with ${s.practiceName}`,
      description: [b.services.length ? `Asked about: ${b.services.join(', ')}` : '', b.topic ? `Their words: ${b.topic}` : '', `In the Studio: ${site}/studio#/requests/${b.id}`].filter(Boolean).join('\n\n'),
      start: { dateTime: b.start, timeZone: s.ownerTz },
      end: { dateTime: end, timeZone: s.ownerTz },
      attendees: [{ email: c.email, displayName: c.name }],
      reminders: { useDefault: true },
    };
    if (b.meetUrl && !b.calendarEventId) event.location = b.meetUrl;
    if (!b.meetUrl) event.conferenceData = { createRequest: { requestId: `${b.id}-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } };
    let ev = b.calendarEventId
      ? await call('PATCH', `${API}/${encodeURIComponent(b.calendarEventId)}?conferenceDataVersion=1&sendUpdates=${send}`, event)
      : await call('POST', `${API}?conferenceDataVersion=1&sendUpdates=${send}`, event);
    // the Meet link is sometimes still being made: ask again, briefly
    for (let i = 0; i < 3 && ev && !meetOf(ev) && ev.conferenceData?.createRequest?.status?.statusCode === 'pending'; i++) {
      await new Promise((r) => setTimeout(r, 800));
      ev = await call('GET', `${API}/${encodeURIComponent(ev.id)}`);
    }
    return { eventId: ev?.id, meetUrl: meetOf(ev) };
  },
  async remove(eventId: string, s: Settings) {
    await call('DELETE', `${API}/${encodeURIComponent(eventId)}?sendUpdates=${s.googleInvites ? 'all' : 'none'}`);
  },
};

/** used when Google is not connected: nothing happens, and the email says the link will follow */
export const noCalendar: Calendar = { name: 'none', available: async () => false, upsert: async () => ({}), remove: async () => {} };

export async function googleAccount() {
  const saved = await (await serverStore()).kvGet<Saved>('google');
  return saved ? { email: saved.email, at: saved.at } : null;
}
