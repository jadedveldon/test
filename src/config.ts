/**
 * Site settings that change between the prototype and the real launch. They are kept in
 * src/content/settings.json, where the content editor writes ("Site settings").
 */
import settings from './content/settings.json';

type Provider = 'none' | 'cloudflare' | 'umami' | 'plausible';
const PROVIDERS: Provider[] = ['none', 'cloudflare', 'umami', 'plausible'];

export const site = {
  /** the real address, once there is one (used for link previews); a mistyped one falls back to the placeholder */
  url: /^https:\/\/[^\s/]+/.test(settings.url.trim()) ? settings.url.trim() : 'https://sarvakali.example',
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
