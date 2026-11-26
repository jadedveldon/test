/**
 * The site's own counting, in the browser (docs/observability.md). No cookies, nothing kept in the browser, nothing
 * that identifies anyone. For each page: that it was opened (its path, which site sent the visitor, campaign tags, the
 * screen's width), and when it is left, how long it was in view and how far down it was read, with its speed on a
 * first visit (the web's own measures: LCP, CLS, INP, FCP, TTFB). Steps that matter are marked with track()
 * (src/scripts/track.ts), and links to the help line, email and other sites are noticed.
 *
 * Errors are caught everywhere (uncaught errors, failed promises, files that would not load, and those reported by
 * the site's code) with the trail of the last steps before them: pages opened, buttons pressed (their label, never
 * what was typed), requests made (with the host's reference for each) and console warnings. Each kind of error is
 * sent once per page, at most ten per page.
 *
 * Visitors whose browser asks not to be tracked (Global Privacy Control, Do Not Track) are not counted; errors are
 * still reported, as they carry nothing about the person. Events go out in small batches to /api/t; in the preview
 * they stay in this browser for the Studio demo's Insights.
 */
import { MODE } from '../studio/client';
import { cleanPath, campaign, fingerprint, refHost, scrub } from '../obs/core/clean';
import type { ClientEvent, Crumb, Vitals } from '../obs/core/events';
import { connectSink } from './track';

const QUIET = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === '1';
const ENDPOINT = '/api/t';
const t0 = performance.now();
const now = () => Math.round(performance.now() - t0);
const rid = () => Math.random().toString(36).slice(2, 12);

let queue: ClientEvent[] = [];
const crumbs: Crumb[] = [];
let pv = rid();
let path = '/';
let shown = 0;
let visibleMs = 0;
let visibleSince = 0;
let maxScroll = 0;
let leaveSent = false;
let errorsHere = 0;
let sentHere = 0;
const seenHere = new Set<string>();
const vitals: Vitals = {};
let firstPage = true;
let lastFetchRef: { ref: string; at: number; status: number } | null = null;

const ownPage = () => /^\/(studio|keystatic|door)/.test(path) || /studio$/.test(path);

function crumb(c: Crumb['c'], m: string) {
  crumbs.push({ t: now(), c, m: scrub(m, 160) });
  if (crumbs.length > 40) crumbs.shift();
}

function push(e: ClientEvent) {
  if (sentHere > 60) return;
  sentHere++;
  queue.push(e);
  if (e.k === 'error' || queue.length >= 20) flush();
}

/* ---------------------------------------------------------------- sending */

function flush(leaving = false) {
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  if (MODE === 'off') return;
  if (MODE === 'demo') { import('../obs/demo').then((m) => m.demoRecord(batch, pv)).catch(() => {}); return; }
  const body = JSON.stringify({ pv, e: batch });
  try {
    if (leaving && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
    void origFetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' }, credentials: 'same-origin' }).catch(() => {});
  } catch { /* counting must never trouble the page */ }
}

/* ---------------------------------------------------------------- pages */

function scrollDepth() {
  const h = document.documentElement.scrollHeight;
  const d = h > 0 ? Math.min(100, Math.round(((scrollY + innerHeight) / h) * 100)) : 100;
  if (d > maxScroll) maxScroll = d;
}

function leave() {
  if (leaveSent || QUIET || ownPage()) return;
  leaveSent = true;
  if (visibleSince) { visibleMs += performance.now() - visibleSince; visibleSince = document.visibilityState === 'visible' ? performance.now() : 0; }
  scrollDepth();
  push({ k: 'leave', p: path, ms: Math.round(visibleMs), sd: maxScroll, v: firstPage && Object.keys(vitals).length ? { ...vitals } : undefined });
}

let lastHref = '';
let pageAt = 0;
function startPage() {
  // the first page-load event arrives as the counting starts: one page, counted once
  if (location.href === lastHref && performance.now() - pageAt < 1500) return;
  lastHref = location.href;
  pageAt = performance.now();
  if (shown) { leave(); firstPage = false; flush(); }
  shown++;
  pv = rid();
  path = cleanPath(location.href);
  visibleMs = 0;
  visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
  maxScroll = 0; leaveSent = false; errorsHere = 0; sentHere = 0; seenHere.clear();
  scrollDepth();
  crumb('nav', path);
  if (QUIET || ownPage()) return;
  // a missing page: noted with where the broken link was (another site, this site, or typed in)
  if (document.querySelector('section.notfound')) track('not-found', document.referrer ? refHost(document.referrer, location.hostname) ?? 'a link on this site' : 'typed or bookmarked');
  push({ k: 'view', p: path, r: shown === 1 ? refHost(document.referrer, location.hostname) : undefined, u: shown === 1 ? campaign(location.href) : undefined, w: innerWidth, lang: navigator.language?.slice(0, 12), first: shown === 1 || undefined });
}

/* ---------------------------------------------------------------- errors */

function sendError(e: unknown, src: string, ref?: string) {
  const err = e instanceof Error ? e : null;
  const m = scrub(err ? `${err.name}: ${err.message}` : typeof e === 'string' ? e : (() => { try { return JSON.stringify(e); } catch { return String(e); } })(), 400);
  const s = err?.stack ? scrub(err.stack, 1500) : undefined;
  const f = fingerprint(m, s, src);
  crumb('error', m);
  if (seenHere.has(f) || errorsHere >= 10) return;
  seenHere.add(f);
  errorsHere++;
  // a failed request a moment before: its reference leads to the host's log lines
  const r = ref ?? (e as { ref?: string })?.ref ?? (lastFetchRef && performance.now() - lastFetchRef.at < 10_000 && lastFetchRef.status >= 400 ? lastFetchRef.ref : undefined);
  push({ k: 'error', p: path, m, s, src, f, crumbs: crumbs.slice(-30), ref: r });
}

/* ---------------------------------------------------------------- the trail */

const origFetch = window.fetch.bind(window);
function wrapFetch() {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const p = cleanPath(url, location.href);
    const start = performance.now();
    try {
      const res = await origFetch(input, init);
      const ref = res.headers.get('x-request-id') ?? undefined;
      if (ref) lastFetchRef = { ref, at: performance.now(), status: res.status };
      crumb('fetch', `${method} ${p} → ${res.status} in ${Math.round(performance.now() - start)} ms${ref ? ` (ref ${ref})` : ''}`);
      return res;
    } catch (err) {
      crumb('fetch', `${method} ${p} → failed (${navigator.onLine ? 'network' : 'offline'})`);
      throw err;
    }
  };
}

function describe(el: Element) {
  const tag = el.tagName.toLowerCase();
  const label = el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('title') || (el as HTMLInputElement).name || '';
  const data = [...el.attributes].filter((a) => a.name.startsWith('data-')).slice(0, 2).map((a) => a.name).join(' ');
  return `${tag}${data ? ` [${data}]` : ''} “${label.replace(/\s+/g, ' ').trim().slice(0, 50)}”`;
}

function onClick(e: Event) {
  const el = (e.target as Element)?.closest?.('a, button, summary, label, [role="button"], input[type="checkbox"], input[type="radio"], select');
  if (!el) return;
  crumb('click', describe(el));
  const a = el.closest('a');
  if (a?.href) {
    if (a.protocol === 'tel:') track(a.href.replace(/\D/g, '') === '14416' ? 'help-line' : 'call');
    else if (a.protocol === 'mailto:') track('email');
    else if (a.host && a.host !== location.host && /^https?:$/.test(a.protocol)) track('outbound', a.hostname.replace(/^www\./, ''));
  }
  const named = el.closest<HTMLElement>('[data-track]');
  if (named?.dataset.track && /^[a-z][a-z0-9-]{1,30}$/.test(named.dataset.track)) track(named.dataset.track, named.dataset.trackDetail);
}

function wrapConsole() {
  for (const k of ['error', 'warn'] as const) {
    const orig = console[k].bind(console);
    console[k] = (...args: unknown[]) => { try { crumb('console', `${k}: ${args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : '')).join(' ')}`); } catch { /* fine */ } orig(...args); };
  }
}

/* ---------------------------------------------------------------- speed (first page of a visit) */

function observeVitals() {
  const obs = (type: string, cb: (e: PerformanceEntry) => void, opts: Record<string, unknown> = {}) => {
    try { new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type, buffered: true, ...opts } as PerformanceObserverInit); } catch { /* not in this browser */ }
  };
  obs('largest-contentful-paint', (e) => { if (firstPage) vitals.lcp = Math.round(e.startTime); });
  obs('paint', (e) => { if (e.name === 'first-contentful-paint') vitals.fcp = Math.round(e.startTime); });
  obs('layout-shift', (e) => { const x = e as PerformanceEntry & { value: number; hadRecentInput: boolean }; if (firstPage && !x.hadRecentInput) vitals.cls = Math.round(((vitals.cls ?? 0) + x.value) * 1000) / 1000; });
  obs('event', (e) => { const x = e as PerformanceEntry & { interactionId?: number }; if (firstPage && x.interactionId && e.duration > (vitals.inp ?? 0)) vitals.inp = Math.round(e.duration); }, { durationThreshold: 40 });
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav) vitals.ttfb = Math.round(nav.responseStart);
}

/* ---------------------------------------------------------------- starting */

function track(name: string, detail?: string) {
  crumb('goal', detail ? `${name}: ${detail}` : name);
  if (QUIET || ownPage()) return;
  push({ k: 'goal', p: path, n: name, d: detail ? scrub(detail, 60) : undefined });
}

let started = false;
export function startTelemetry() {
  if (started) return;
  started = true;
  wrapFetch();
  wrapConsole();
  observeVitals();
  addEventListener('error', (e) => {
    const t = e.target as HTMLElement | null;
    // a picture, script or stylesheet that would not load
    if (t && t !== (window as unknown as HTMLElement) && (t as HTMLElement).tagName) {
      const src = (t as HTMLImageElement).src || (t as HTMLLinkElement).href || '';
      if (src) sendError(`Could not load ${t.tagName.toLowerCase()}: ${cleanPath(src, location.href)}`, 'resource');
      return;
    }
    const ev = e as ErrorEvent;
    sendError(ev.error ?? `${ev.message} (${cleanPath(ev.filename || '', location.href)}:${ev.lineno})`, 'onerror');
  }, true);
  addEventListener('unhandledrejection', (e) => sendError((e as PromiseRejectionEvent).reason ?? 'Unhandled rejection', 'rejection'));
  document.addEventListener('click', onClick, { capture: true, passive: true });
  addEventListener('scroll', scrollDepth, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (visibleSince) { visibleMs += performance.now() - visibleSince; visibleSince = 0; }
      leave();
      flush(true);
    } else visibleSince = performance.now();
  });
  addEventListener('pagehide', () => { leave(); flush(true); });
  document.addEventListener('astro:before-preparation', () => leave());
  document.addEventListener('astro:page-load', startPage);
  addEventListener('online', () => crumb('nav', 'back online'));
  addEventListener('offline', () => crumb('nav', 'went offline'));
  setInterval(() => flush(), 15_000);
  connectSink({ goal: track, error: (e, src, ref) => sendError(e, src ?? 'caught', ref) });
  startPage();
}
