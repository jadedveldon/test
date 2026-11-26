/**
 * Every hour on the host: the site's numbers worked out, old raw events and logs let go, and an email to Sarvakali
 * when something new has broken (src/obs/server/alerts.ts, docs/observability.md).
 */
import { hourlyRound } from '../../src/obs/server/alerts';

export default async () => {
  try {
    const r = await hourlyRound(process.env.SITE_URL || process.env.URL || 'https://example.org');
    return new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error(JSON.stringify({ ts: Date.now(), lvl: 'error', msg: 'hourly round failed', err: String(e).slice(0, 300) }));
    return new Response('failed', { status: 500 });
  }
};

export const config = { schedule: '@hourly' };
