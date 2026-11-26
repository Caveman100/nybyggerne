// Nybyggerne – vælger hvordan spillerne forbindes.
//
//   'relay'  – via Cloudflare-relæet (WebSocket over HTTPS). Virker bag firewalls. Bruges automatisk,
//              når spillet ligger på Cloudflare, eller når RELAY_URL er sat i config.js.
//   'peerjs' – direkte mellem browserne (WebRTC) via PeerJS. Bruges ellers, f.eks. på GitHub Pages.

import { PEER_OPTS, RELAY_URL } from '../config.js';
import { RelayPeer } from './relay.js';

export const transport = { kind: null, base: null };

const toWs = url => url.replace(/^http/, 'ws').replace(/\/+$/, '');

async function detect() {
  const q = new URLSearchParams(location.search);
  if (q.get('peerjs')) return { kind: 'peerjs' };                       // tving PeerJS (test)
  const configured = q.get('relay') || RELAY_URL;
  if (configured) return { kind: 'relay', base: toWs(new URL(configured, location.href).href.replace(/\/relay\/?$/, '')) + '/relay' };
  // Ligger spillet selv på Cloudflare? Så svarer relay/ping ved siden af index.html.
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch('relay/ping', { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (res.ok && (await res.text()).trim() === 'nybyggerne-relay') return { kind: 'relay', base: toWs(new URL('relay', location.href).href) };
  } catch (e) {}
  return { kind: 'peerjs' };
}

export const ready = detect().then(r => { Object.assign(transport, r); console.info('Nybyggerne forbinder via', r.kind, r.base || ''); return transport; });

export const peerAvailable = () => transport.kind === 'relay' || typeof Peer !== 'undefined';

// id givet → vært (ejer rumkoden). Intet id → gæst.
export function createPeer(id) {
  if (transport.kind === 'relay') return new RelayPeer(transport.base, id);
  return id ? new Peer(id, PEER_OPTS) : new Peer(PEER_OPTS);
}
