/* Sarvakali service worker: pages you have visited keep working without a connection. */
const CACHE = 'sarvakali-v4'; // a new name clears copies kept by the earlier version
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './practice', './path']).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // never saved: the content editor and its door (the door's address holds its secret word), the Studio and its
  // requests, and a client's own booking and invoice pages (their address holds the client's private link)
  if (/^\/(keystatic|api|door|studio|booking|invoice)(\/|$|\.html)/.test(new URL(req.url).pathname)) return;
  if (req.mode === 'navigate') {
    // pages: the network first, so content is always fresh; the saved copy when offline
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  // built scripts and styles carry a fingerprint in their name, so a saved copy is never out of date: saved copy first
  if (new URL(req.url).pathname.includes('/_astro/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  // everything else (the search index, pictures, icons) can change under the same name: the network first, the saved copy offline
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((r) => r || Response.error())));
});
