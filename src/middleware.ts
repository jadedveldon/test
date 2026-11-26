/**
 * Around every request the host answers itself (the APIs, the Studio's sign-in, the content editor; never the plain
 * pages, which are files):
 *   - a reference for the request, sent back as "x-request-id" and kept with its log lines;
 *   - how long it took ("server-timing");
 *   - anything that fails unexpectedly is caught, logged with its stack, and answered with a plain message and the
 *     reference, never a stack trace;
 *   - one line per request (method, route, status, time), and for API requests the lines are kept 30 days, so the
 *     Studio's Insights can show them and find them by reference; an error on the host also joins the error groups.
 * Static builds (the preview) skip all of this. See docs/observability.md.
 */
import { defineMiddleware } from 'astro:middleware';
import { newRef, fingerprint } from './obs/core/clean';
import { recordEvents, recordLog } from './obs/core/insights';
import { log, requestCtx, type RequestCtx } from './obs/server/log';

// requests whose log lines are not worth keeping (the counter itself, the health check, the editor's own traffic)
const QUIET = /^\/api\/(t|health)$|^\/api\/keystatic|^\/keystatic|^\/_astro\/|^\/_image/;

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();
  const url = new URL(context.request.url);
  const ctx: RequestCtx = { ref: newRef(), route: url.pathname, method: context.request.method, start: performance.now(), lines: [] };
  return requestCtx.run(ctx, async () => {
    let res: Response;
    try {
      res = await next();
    } catch (e) {
      log.error('unhandled error', {}, e);
      res = new Response(JSON.stringify({ error: 'Something went wrong on our side. Please try again in a little while.', ref: ctx.ref }), {
        status: 500, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    const ms = performance.now() - ctx.start;
    try {
      res.headers.set('x-request-id', ctx.ref);
      res.headers.set('server-timing', `app;dur=${ms.toFixed(1)}`);
    } catch {
      // some responses (redirects) have fixed headers: make a copy that can carry them
      res = new Response(res.body, res);
      res.headers.set('x-request-id', ctx.ref);
      res.headers.set('server-timing', `app;dur=${ms.toFixed(1)}`);
    }
    const level = res.status >= 500 ? 'error' : res.status >= 400 && res.status !== 401 && res.status !== 404 ? 'warn' : 'info';
    log[level]('request', { status: res.status, ms });
    const quiet = QUIET.test(url.pathname);
    const keep = !quiet && (url.pathname.startsWith('/api/') || ctx.lines.some((l) => l.lvl !== 'info'));
    if (keep) {
      try {
        const { obsEnv } = await import('./obs/server/store');
        const env = await obsEnv();
        await recordLog(env, ctx.ref, ctx.lines);
        const errors = ctx.lines.filter((l) => l.lvl === 'error' && l.msg !== 'request');
        if (errors.length) {
          await recordEvents(env, errors.map((l) => {
            const m = l.err?.message ?? l.msg;
            return { k: 'error' as const, p: ctx.route, m, s: l.err?.stack, src: 'server', f: fingerprint(m, l.err?.stack, 'server'), ref: ctx.ref, ts: l.ts, vh: 'server', pv: ctx.ref };
          }));
        }
      } catch (e) {
        // keeping the log must never break the answer; the line is still in the host's own log
        console.error(JSON.stringify({ ts: Date.now(), lvl: 'error', msg: 'could not keep log lines', ref: ctx.ref, err: String(e).slice(0, 200) }));
      }
    }
    return res;
  });
});
