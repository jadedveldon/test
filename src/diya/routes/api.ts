/**
 * /api/diya: the day's shared count of lamps. GET reads it; POST adds one lamp. Nothing about the visitor is kept:
 * the address is used only, for a few minutes, to stop one place from adding lamps by the hundred.
 */
import type { APIRoute } from 'astro';
import { bump, dayKey, type Tally } from '../core';
import { limited, serverStore } from '../../studio/server/stores';
import { sameOrigin } from '../../studio/server/auth';
import { isDev } from '../../studio/server/env';
import { json } from '../../studio/server/runtime';
import { log } from '../../obs/server/log';

export const prerender = false;

const ipOf = (request: Request, fallback: () => string) => {
  try { return request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || fallback(); } catch { return 'unknown'; }
};

export const GET: APIRoute = async () => {
  try {
    const day = dayKey();
    const t = await (await serverStore()).kvGet<Tally>(`diya-${day}`);
    return json({ day, n: t?.n ?? 0 });
  } catch (e) {
    log.error('diya read failed', {}, e);
    return json({ error: 'unavailable' }, 503);
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  const day = dayKey();
  try {
    const s = await serverStore();
    // a lamp counts; a hundred from one place in ten minutes do not (they are still lit on the visitor's own screen)
    if (await limited(`diya:${ipOf(request, () => clientAddress)}`, isDev() ? 1000 : 40, 600_000)) {
      const t = await s.kvGet<Tally>(`diya-${day}`);
      return json({ day, n: t?.n ?? 0, counted: false });
    }
    const t = await s.kvSwap<Tally>(`diya-${day}`, bump);
    return json({ day, n: t?.n ?? 0, counted: true });
  } catch (e) {
    log.error('diya count failed', {}, e);
    return json({ error: 'unavailable' }, 503);
  }
};
