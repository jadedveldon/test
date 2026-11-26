/**
 * Sending email. With RESEND_API_KEY and MAIL_FROM set on the host, emails go out through Resend (replies go to
 * Sarvakali's own address, from the Studio's settings). Without them, nothing is sent: each email is kept in the
 * Studio's outbox, marked "saved", where it can be read, copied, or sent later once email is set up.
 */
import type { Rendered } from '../core/emails';
import type { Mailer } from '../core/runner';
import { env } from './env';

export function serverMailer(replyTo: () => Promise<string>): Mailer {
  const key = env('RESEND_API_KEY');
  const from = env('MAIL_FROM');
  if (!key || !from) return { name: 'outbox only', send: async () => ({ status: 'saved' }) };
  return {
    name: 'resend',
    async send(m: Rendered) {
      const reply = await replyTo();
      const body: Record<string, unknown> = { from, to: [m.to], subject: m.subject, html: m.html, text: m.text };
      if (reply && reply !== m.to) body.reply_to = reply;
      if (m.ics) body.attachments = [{ filename: m.ics.filename, content: Buffer.from(m.ics.content).toString('base64') }];
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (r.ok) return { status: 'sent' };
        const t = await r.text();
        return { status: 'failed', error: `Resend ${r.status}: ${t.slice(0, 200)}` };
      } catch (e) {
        return { status: 'failed', error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}
