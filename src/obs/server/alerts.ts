/**
 * The hourly round on the host (netlify/functions/obs-hourly.mts): today's and yesterday's numbers worked out, old
 * raw events and logs let go, and, when something new has broken, one short email to Sarvakali (at most one every
 * three hours; the rest waits for the next). The email says what broke, where and how often, and links to the
 * Studio's Insights; it never holds a visitor's details.
 */
import { layout } from '../../studio/core/emails';
import { serverMailer } from '../../studio/server/mail';
import { serverStore } from '../../studio/server/stores';
import { alerted, hourly, mayAlert, newProblems } from '../core/insights';
import { obsEnv } from './store';
import { log } from './log';

export async function hourlyRound(site: string) {
  const env = await obsEnv();
  const r = await hourly(env);
  const problems = await newProblems(env, r.today);
  let sent = 'none';
  if (problems.length && (await mayAlert(env))) {
    const { db } = await (await serverStore()).load();
    const to = db?.settings?.ownerEmail ?? '';
    if (to) {
      const rows: [string, string][] = problems.slice(0, 8).map((g) => [g.src === 'server' ? 'On the site’s host' : 'In visitors’ browsers', `${g.m}\n${g.n}× · ${Object.keys(g.pages).slice(0, 3).join(', ')}`]);
      const { html, text } = layout(site, 'Sarvakali’s Studio', [
        { p: problems.length === 1 ? 'Something new has gone wrong on the site.' : `${problems.length} new problems on the site.` },
        { rows },
        { button: 'Open Insights', href: `${site}/studio#/insights/errors` },
        { small: 'Each one has the steps that led to it, and a reference to its log lines, in Insights. Mark it fixed there once it is; if it comes back, you will hear again.' },
      ], 'Sent by your website when it notices a new problem. At most one of these every three hours.');
      const m = await serverMailer(async () => '').send({ kind: 'owner.alert', to, subject: problems.length === 1 ? 'Sarvakali: something new went wrong' : `Sarvakali: ${problems.length} new problems`, html, text });
      sent = m.status;
      if (m.status !== 'failed') await alerted(env, problems);
      else log.warn('alert email failed', { error: m.error });
    } else sent = 'no owner email';
  }
  log.info('hourly round', { views: r.today.views, pruned: r.pruned, problems: problems.length, alert: sent });
  return { pruned: r.pruned, problems: problems.length, alert: sent };
}
