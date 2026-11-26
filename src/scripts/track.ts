/**
 * Marking a step that matters ("a request was sent", "a practice was finished"), from anywhere in the site's code,
 * and reporting an error that was caught. Tiny on purpose: the counting itself (src/scripts/telemetry.ts) arrives
 * a moment later and picks up anything marked before it did. Never pass anything a visitor typed.
 */
type Sink = { goal(n: string, d?: string): void; error(e: unknown, src?: string, ref?: string): void };
const early: (['goal', string, string?] | ['error', unknown, string?, string?])[] = [];
let sink: Sink | null = null;

export function track(name: string, detail?: string) {
  if (sink) sink.goal(name, detail); else if (early.length < 50) early.push(['goal', name, detail]);
}
export function reportError(e: unknown, src = 'caught', ref?: string) {
  if (sink) sink.error(e, src, ref); else if (early.length < 50) early.push(['error', e, src, ref]);
}
export function connectSink(s: Sink) {
  sink = s;
  for (const x of early.splice(0)) { if (x[0] === 'goal') s.goal(x[1], x[2]); else s.error(x[1], x[2], x[3]); }
}
