// Nybyggerne – netværksindstillinger.

// PREFIX bruges foran rumkoden, så vores spil ikke rammer andres rum.
// Skift den (f.eks. til "nybyggerne-v2-"), hvis I laver en version, der ikke kan spille med den gamle.
export const PREFIX = 'nybyggerne-v1-';

// Cloudflare-relæ (virker bag firewalls – se docs/CLOUDFLARE.md).
// Ligger spillet selv på Cloudflare, findes relæet automatisk, og feltet kan stå tomt.
// Ligger spillet et andet sted (f.eks. GitHub Pages), så skriv adressen på din Cloudflare-worker her,
// f.eks. 'https://nybyggerne.dit-navn.workers.dev'. Tomt = brug PeerJS, hvis der ikke findes et relæ.
export const RELAY_URL = '';

// PeerJS (bruges kun, når der ikke er et Cloudflare-relæ)
export const PEER_OPTS = (() => {
  // Kun til test: ?peerhost=127.0.0.1&peerport=9000 bruger en lokal PeerJS-server
  const q = new URLSearchParams(location.search), host = q.get('peerhost');
  return host ? { host, port: +(q.get('peerport') || 9000), path: '/', secure: false, debug: 1 } : { debug: 1 };
})();
