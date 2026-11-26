/**
 * Keeping private things out of what the site counts and logs. Everything the browser sends and everything the host
 * writes down passes through here first:
 *
 *   - addresses keep only their path: no query (private links carry a token in it, e.g. /invoice?t=…), no #hash,
 *     except the campaign tags (utm_source, utm_medium, utm_campaign) a link was shared with;
 *   - where someone came from keeps only the other site's name (google.com), never the page;
 *   - email addresses, phone numbers, UPI IDs and long tokens in any text become [email], [phone], [upi], [token];
 *   - fields whose name says they are private (password, token, email, journal text…) are replaced whole.
 *
 * Shared by the browser (src/scripts/telemetry.ts), the host (src/obs/server) and the checks.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const UPI = /\b[\w.-]{2,}@[a-z]{2,}\b/gi; // name@bank, without a dot after the @
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const TOKEN = /\b[A-Za-z0-9_-]{24,}\b/g;
const PRIVATE_KEY = /pass|secret|token|^t$|auth|cookie|email|phone|apikey|api_key|^key$|journal|^text$|^note$|^enc$|^ct$|^iv$|^salt$|^check$|reference|upi|address|^name$/i;

/** private details in a piece of text, replaced by what they are */
export function scrub(s: unknown, max = 500): string {
  return String(s ?? '')
    .replace(EMAIL, '[email]')
    .replace(UPI, '[upi]')
    .replace(TOKEN, '[token]')
    .replace(PHONE, (m) => (m.replace(/\D/g, '').length >= 9 ? '[phone]' : m))
    .slice(0, max);
}

/** an object made safe to keep: private fields replaced whole, text scrubbed, depth and size bounded */
export function scrubObject(v: unknown, depth = 0): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'string') return scrub(v, 300);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (depth > 3) return '[…]';
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => scrubObject(x, depth + 1));
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 30)) out[k] = PRIVATE_KEY.test(k) ? '[private]' : scrubObject(x, depth + 1);
    return out;
  }
  return String(v).slice(0, 100);
}

/** a page's address as counted: its path only ("/practice/with/kali"); the preview's flat files and .html made plain */
export function cleanPath(input: string, base = 'https://x.invalid') {
  let u: URL;
  try { u = new URL(input, base); } catch { return '/'; }
  let p = decodeURIComponent(u.pathname).replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  // the preview keeps pages as flat files in a folder (…/site/practice-with-kali.html): count them by name
  const flat = p.match(/\/site\/([^/]*)$/);
  if (flat) p = `/${flat[1] === 'index' || flat[1] === '' ? '' : flat[1]}`;
  p = p.replace(/\/+$/, '') || '/';
  return scrub(p, 160).replace(/\s/g, '');
}

/** the campaign tags a link was shared with, if any */
export function campaign(input: string, base = 'https://x.invalid') {
  try {
    const q = new URL(input, base).searchParams;
    const pick = (k: string) => (q.get(k) ?? '').toLowerCase().replace(/[^a-z0-9 ._-]/g, '').slice(0, 40) || undefined;
    const c = { s: pick('utm_source') ?? pick('ref') ?? pick('source'), m: pick('utm_medium'), c: pick('utm_campaign') };
    return c.s || c.m || c.c ? c : undefined;
  } catch { return undefined; }
}

/** where someone came from: the other site's name only, nothing when it is this site */
export function refHost(referrer: string, ownHost: string) {
  if (!referrer) return undefined;
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (!h || h === ownHost.replace(/^www\./, '').toLowerCase()) return undefined;
    // apps that hide where a link was opened from
    if (/^(android-app|ios-app)/.test(referrer)) return 'app';
    return h.slice(0, 80);
  } catch { return undefined; }
}

/* ---------------------------------------------------------------- devices and robots */

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|scrapy|phantom|selenium|puppeteer|playwright|chrome-lighthouse|gtmetrix/i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

export function device(ua: string, width?: number) {
  const mobile = /Mobi|iPhone|Android.+Mobile|Windows Phone/i.test(ua);
  const tablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
  const kind = mobile ? 'phone' : tablet ? 'tablet' : width && width < 700 ? 'phone' : 'desktop';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  return { kind, browser, os };
}

/* ---------------------------------------------------------------- errors */

/** the same error, wherever and however often it happens, gets the same short name (for grouping) */
export function fingerprint(message: string, stack = '', source = '') {
  const msg = scrub(message, 200).replace(/\d+/g, 'N').replace(/'[^']*'|"[^"]*"/g, 'S').trim();
  // the first line of the stack that points into the site's own code, without line numbers (they change per build)
  const frame = (stack.split('\n').find((l) => /\/_astro\/|\/src\/|\.ts|\.js/.test(l)) ?? '').replace(/\?[^:)]*/, '').replace(/[.-][A-Za-z0-9_-]{8}\.js/, '.js').replace(/:\d+:\d+/g, '').trim();
  return hash(`${source}|${msg}|${frame}`);
}

/** a short, stable hash (FNV-1a, 32 bits, as hex) */
export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** a reference for one request, readable back into the time it happened ("mbx4k2p1-3f9a") */
export function newRef(now = Date.now()) {
  const r = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `${now.toString(36)}-${r}`;
}
export function refTime(ref: string) {
  const t = parseInt(ref.split('-')[0] ?? '', 36);
  return Number.isFinite(t) && t > 1.6e12 && t < 4e12 ? t : null;
}
