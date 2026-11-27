/**
 * Install on phone. The site can be added to the home screen and opens like an
 * app, with shortcuts to today's card and the daily practice. A small service
 * worker keeps the pages visited so far available without a connection.
 */
import { track } from './track';
import { say } from './words';
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIP | null = null;
const listeners = new Set<() => void>();

export const installed = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPrompt = () => !!deferred;
/** returns a function that stops listening, so a page that goes away does not stay in memory */
export function onInstallChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export async function promptInstall(): Promise<string> {
  if (installed()) return say('pwa.already');
  if (deferred) {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    track(outcome === 'accepted' ? 'install' : 'install-declined');
    listeners.forEach((f) => f());
    return outcome === 'accepted' ? say('pwa.added') : say('pwa.later');
  }
  if (isIOS()) return say('pwa.iphone');
  return say('pwa.elsewhere');
}

let ready = false;
export function initPwa() {
  if (ready) return;
  ready = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIP;
    listeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()); });
  // the service worker lives next to the app manifest, wherever the site is hosted
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifest || !('serviceWorker' in navigator) || window.self !== window.top) return;
  const url = new URL('sw.js', manifest.href);
  if (url.origin !== location.origin) return;
  navigator.serviceWorker.register(url.href, { scope: new URL('./', url).pathname }).catch(() => { /* not available here; the site works without it */ });
}
