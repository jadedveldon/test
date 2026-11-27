/**
 * Site settings that change between the prototype and the real launch. They are kept in
 * src/content/settings.json, where the content editor writes ("Site settings").
 */
import settings from './content/settings.json';

type Provider = 'none' | 'cloudflare' | 'umami' | 'plausible';
const PROVIDERS: Provider[] = ['none', 'cloudflare', 'umami', 'plausible'];

// on Netlify, until the real domain is set in Site settings, the site's own Netlify address is used (Netlify gives
// it to the build as URL), so link previews, the sitemap and search engines see a working address from day one
const fromHost = typeof process !== 'undefined' ? (process.env?.URL ?? '') : '';
const PLACEHOLDER = 'https://sarvakali.example';
const given = settings.url.trim();
export const site = {
  /** the real address, once there is one (link previews, the sitemap, canonical addresses); a mistyped one falls back */
  url: /^https:\/\/[^\s/]+/.test(given) && given !== PLACEHOLDER ? given.replace(/\/$/, '') : /^https:\/\/[^\s/]+/.test(fromHost) ? fromHost.replace(/\/$/, '') : PLACEHOLDER,
};

/**
 * Visitor counts. Off in the prototype. To turn on, pick one privacy-friendly
 * service (none of these need a cookie banner) and paste the value it gives you:
 *   cloudflare: the token from Cloudflare Web Analytics
 *   umami:      the website ID, plus the script URL of your Umami instance
 *   plausible:  the domain registered with Plausible
 */
const a = settings.analytics;
export const analytics: { provider: Provider; id: string; src?: string } = {
  provider: PROVIDERS.includes(a.provider as Provider) ? (a.provider as Provider) : 'none',
  id: a.id.trim(),
  src: /^https:\/\//.test(a.src.trim()) ? a.src.trim() : undefined,
};

/** words shared by every pillar page */
export const words = settings.words;

/** the trail at the top of inner pages (breadcrumbs) */
export const crumbWords = settings.crumbs;

/** each page's title and line for search engines and link previews (Site settings → Pages for search engines) */
export const pageMeta = settings.pages;
