/**
 * The host's logger. Every request gets a reference (e.g. "mbx4k2p1-3f9a"), set by src/middleware.ts: it goes back to
 * the browser in the "x-request-id" header and in any error message, so "it went wrong (reference …)" leads straight
 * to that request's log lines in the Studio's Insights. Each line is one JSON object (time, level, message, reference,
 * route, and any fields), written to the host's own log (Netlify's function logs) and, for API requests, kept for 30
 * days (src/obs/core/insights.ts). Private fields and details are scrubbed before anything is written
 * (src/obs/core/clean.ts).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { scrub, scrubObject } from '../core/clean';
import type { Level, LogLine } from '../core/insights';

export interface RequestCtx { ref: string; route: string; method: string; start: number; lines: LogLine[] }
export const requestCtx = new AsyncLocalStorage<RequestCtx>();
export const currentRef = () => requestCtx.getStore()?.ref;

import { env } from '../../studio/server/env';
const DEBUG = env('LOG_LEVEL') === 'debug';

function errorOf(e: unknown): LogLine['err'] | undefined {
  if (!e) return undefined;
  if (e instanceof Error) return { name: e.name, message: scrub(e.message, 400), stack: scrub(e.stack ?? '', 1500) };
  return { message: scrub(String(e), 400) };
}

function write(lvl: Level, msg: string, fields?: Record<string, unknown>, err?: unknown) {
  if (lvl === 'debug' && !DEBUG) return;
  const ctx = requestCtx.getStore();
  const { status, ms, ...rest } = (fields ?? {}) as Record<string, unknown>;
  const line: LogLine = {
    ts: Date.now(), lvl, msg: scrub(msg, 120),
    ref: ctx?.ref, route: ctx?.route, method: ctx?.method,
    status: typeof status === 'number' ? status : undefined, ms: typeof ms === 'number' ? Math.round(ms) : undefined,
    fields: Object.keys(rest).length ? (scrubObject(rest) as Record<string, unknown>) : undefined,
    err: errorOf(err),
  };
  ctx?.lines.push(line);
  const text = JSON.stringify(line);
  if (lvl === 'error') console.error(text); else if (lvl === 'warn') console.warn(text); else console.log(text);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>, err?: unknown) => write('warn', msg, fields, err),
  error: (msg: string, fields?: Record<string, unknown>, err?: unknown) => write('error', msg, fields, err),
};
