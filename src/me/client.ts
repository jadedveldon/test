/**
 * How the browser reaches visitor accounts: POST /api/me on the host and in development; in the preview, a demo
 * answering in this browser (src/me/demo.ts). Without the Studio (a plain build) there are no accounts.
 */
import { MODE } from '../studio/client';
import words from '../content/pages/me.json';

export const ACCOUNTS = MODE !== 'off';

export class MeCallError extends Error { constructor(message: string, public status = 0, public signedOut = false, public ref?: string) { super(message); } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function meCall<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (MODE === 'demo') {
    try { return (await (await import('./demo')).demoMe(action, payload)) as T; } catch (e) {
      const st = (e as { status?: number }).status ?? 0;
      throw new MeCallError((e as Error).message || words.errors.generic, st, st === 401);
    }
  }
  if (MODE === 'off') throw new MeCallError(words.errors.noEmail);
  let r: Response;
  try {
    r = await fetch('/api/me', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action, payload }) });
  } catch { throw new MeCallError(words.errors.offline, 0); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const ref = j?.ref || (r.status >= 500 ? r.headers.get('x-request-id') : null) || undefined;
    throw new MeCallError(`${j?.error || words.errors.generic}${ref ? ` (Reference: ${ref})` : ''}`, r.status, !!j?.signedOut || r.status === 401, ref);
  }
  return j as T;
}
