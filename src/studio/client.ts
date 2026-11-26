/**
 * How the browser reaches the Studio: on the host and in development, over HTTP (/api/studio behind the sign-in,
 * /api/public for Connect and the clients' own pages); in the preview, a demo that answers in the browser itself,
 * keeping everything in this browser's storage. Used by the Studio and by the public pages alike.
 */
export type StudioMode = 'server' | 'demo' | 'off';
export const MODE = (import.meta.env.PUBLIC_STUDIO || 'off') as StudioMode;

export class CallError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

async function post(url: string, body: unknown) {
  let r: Response;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new CallError('No connection. Please check your internet and try again.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new CallError(j?.error || `Something went wrong (${r.status}).`, r.status);
  return j;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ownerCall<T = any>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (MODE === 'demo') return (await import('./demo/demo')).demoOwner(action, payload) as Promise<T>;
  return post('/api/studio', { action, payload });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function publicCall<T = any>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (MODE === 'demo') return (await import('./demo/demo')).demoPublic(action, payload) as Promise<T>;
  if (MODE === 'off') throw new CallError('This works on the live site.');
  return post('/api/public', { action, payload });
}

/** the address of one of the site's pages, from wherever this page is (plain files in the preview) */
export function pageHref(name: string) {
  return /\.html$/.test(location.pathname) ? `${name}.html` : `/${name}`;
}

/** a site address from wherever this page is: "/pillars/healing#breathe" stays as it is, or becomes
 * "pillars-healing.html#breathe" in the preview, where pages are plain files side by side */
export function sitePath(p: string) {
  if (!/\.html$/.test(location.pathname)) return p;
  const [path, hash = ''] = p.split('#');
  const [bare, query = ''] = path.split('?');
  const flat = bare.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-') || 'index';
  return `${flat}.html${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

/** an article's address (in the preview every page is a plain file side by side: articles-<slug>.html) */
export function articleHref(slug: string) {
  return /\.html$/.test(location.pathname) ? `articles-${slug}.html` : `/articles/${slug}`;
}
