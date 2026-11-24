import { defineMiddleware } from 'astro:middleware';
import { COOKIE, PRIVATE, doorSecret, fingerprint, notFound, same } from './secret';

/** the editor's own addresses */
const EDITOR = /^\/(keystatic|api\/keystatic)(\/|$)/;

export const onRequest = defineMiddleware(async (ctx, next) => {
  if (!EDITOR.test(ctx.url.pathname)) return next();
  const secret = doorSecret();
  if (secret) {
    const have = ctx.cookies.get(COOKIE)?.value ?? '';
    if (!same(have, await fingerprint(secret))) return notFound();
  } else if (!import.meta.env.DEV) {
    // on the live site the editor stays shut until a door word is set in the host's settings
    return notFound();
  }
  const res = await next();
  for (const [k, v] of Object.entries(PRIVATE)) res.headers.set(k, v);
  return res;
});
