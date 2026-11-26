/**
 * The Studio's settings on the host (Netlify: Site configuration → Environment variables). None of them is in
 * the repository. See docs/studio.md.
 *
 *   STUDIO_PASSWORD_HASH  the sign-in password, as a hash (make it with: node tools/studio-password.mjs)
 *   STUDIO_SECRET         a long random string that signs the sign-in cookie and locks the Google key
 *   EDITOR_DOOR           the secret door word (shared with the content editor)
 *   RESEND_API_KEY        to send email (Resend); without it emails are kept in the Studio's outbox
 *   MAIL_FROM             who emails come from, e.g. "Sarvakali <hello@sarvakali.in>" (a domain set up in Resend)
 *   GOOGLE_CLIENT_ID      to make Google Meet links (a Google Cloud OAuth client); with GOOGLE_CLIENT_SECRET
 *   SITE_URL              the site's address for links in emails (Netlify's own URL is used when not set)
 */
// outside Astro (the hourly reminders function) there is no import.meta.env
const meta = (typeof import.meta.env !== 'undefined' ? import.meta.env : {}) as Record<string, string | boolean | undefined>;

export const env = (k: string): string => {
  const p = typeof process !== 'undefined' ? process.env?.[k] : undefined;
  const m = meta[k];
  return String(p ?? m ?? '').trim();
};

export const isDev = () => !!meta.DEV;

/** in development a fixed password works when none is set (shown on the sign-in page) */
export const DEV_PASSWORD = 'studio';

export function secret() {
  const s = env('STUDIO_SECRET');
  if (s.length >= 24) return s;
  if (isDev()) return 'development-only-secret-not-for-the-live-site';
  return '';
}

export function siteUrl(requestUrl?: string) {
  const fixed = env('SITE_URL') || (isDev() ? '' : env('URL'));
  if (fixed) return fixed.replace(/\/$/, '');
  return requestUrl ? new URL(requestUrl).origin : 'http://localhost:4321';
}

/** what is set up, for the Studio's settings screen (never the values) */
export function readiness() {
  return {
    password: !!env('STUDIO_PASSWORD_HASH') || isDev(),
    secret: !!secret(),
    door: !!env('EDITOR_DOOR'),
    email: !!(env('RESEND_API_KEY') && env('MAIL_FROM')),
    mailFrom: env('MAIL_FROM'),
    google: !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')),
    dev: isDev(),
  };
}
