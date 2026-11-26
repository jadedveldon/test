/**
 * Every hour on the host: reminders for conversations coming up (Settings → reminders, a day before by default).
 * The Studio also sends any that have come due whenever it is opened.
 */
import { owner } from '../../src/studio/core/api';
import { hostEnv } from '../../src/studio/server/runtime';

export default async () => {
  const env = await hostEnv(process.env.SITE_URL || process.env.URL || 'https://example.org');
  await owner(env, 'runReminders');
  return new Response('ok');
};

export const config = { schedule: '@hourly' };
