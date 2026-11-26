// Nybyggerne – sørger for, at browseren altid henter den nyeste udgave af spillets filer.
// Uden den kan en browser blande gamle og nye filer efter en opdatering, så spillet ikke starter.
// Hver fil hentes fra serveren med "no-cache" (hurtigt tjek – uændrede filer koster næsten intet).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/relay/')) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).catch(() => fetch(e.request)));
});
