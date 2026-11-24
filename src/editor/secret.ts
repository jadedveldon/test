/** the door's secret, kept only in the host's settings (never in the repository) */
export const doorSecret = () => (typeof process !== 'undefined' ? process.env.EDITOR_DOOR : undefined) || '';

export const COOKIE = 'sk_door';

/** what the cookie holds: a fingerprint of the secret, never the secret itself */
export async function fingerprint(secret: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`sarvakali-door:${secret}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** compares in time that does not depend on where the strings differ */
export function same(a: string, b: string) {
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

/** what every editor response carries: never indexed, never cached */
export const PRIVATE = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

export const notFound = () => new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', ...PRIVATE } });
