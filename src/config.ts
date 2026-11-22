/**
 * Site settings that change between the prototype and the real launch.
 */
export const site = {
  /** the real address, once there is one (used for link previews) */
  url: 'https://sarvakali.example',
};

/**
 * Visitor counts. Off in the prototype. To turn on, pick one privacy-friendly
 * service (none of these need a cookie banner) and paste the value it gives you:
 *   cloudflare: the token from Cloudflare Web Analytics
 *   umami:      the website ID, plus the script URL of your Umami instance
 *   plausible:  the domain registered with Plausible
 */
export const analytics: { provider: 'none' | 'cloudflare' | 'umami' | 'plausible'; id: string; src?: string } = {
  provider: 'none',
  id: '',
};
