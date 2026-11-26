// Nybyggerne – forbindelse via Cloudflare-relæet (WebSocket over HTTPS).
//
// RelayPeer efterligner den lille del af PeerJS, som host.js og client.js bruger, så resten af
// koden er ens, uanset om vi kører via Cloudflare eller PeerJS:
//
//   const peer = new RelayPeer(url, 'rum-id')   // vært: ejer rummet
//   const peer = new RelayPeer(url)             // gæst
//   peer.on('open' | 'connection' | 'error' | 'disconnected', fn)
//   const conn = peer.connect('rum-id')         // gæst → vært
//   conn.on('open' | 'data' | 'close' | 'error', fn);  conn.send(obj);  conn.open
//
// Se cloudflare/worker.js for den anden ende.

class Emitter {
  constructor() { this._h = {}; }
  on(ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); return this; }
  emit(ev, ...a) { (this._h[ev] || []).forEach(fn => { try { fn(...a); } catch (e) { console.error(e); } }); }
}

const PING_MS = 25000; // holder forbindelsen i live gennem proxyer og firewalls

function openSocket(base, room, role) {
  const ws = new WebSocket(`${base}/${encodeURIComponent(room)}?role=${role}`);
  ws.pinger = setInterval(() => { if (ws.readyState === 1) ws.send('ping'); }, PING_MS);
  ws.addEventListener('close', () => clearInterval(ws.pinger));
  return ws;
}

// En forbindelse til én anden spiller
class RelayConn extends Emitter {
  constructor(peerId, sendFn) { super(); this.peer = peerId; this.open = false; this._send = sendFn; }
  send(data) { if (this.open) this._send(data); }
  close() { if (this._ws) try { this._ws.close(); } catch (e) {} this._closed(); }
  _opened() { if (this.open) return; this.open = true; this.emit('open'); }
  _closed() { if (!this.open && this._wasClosed) return; this._wasClosed = true; this.open = false; this.emit('close'); }
}

export class RelayPeer extends Emitter {
  constructor(base, id) {
    super();
    this.base = base;
    this.id = id || null;
    this.destroyed = false;
    this.disconnected = false;
    this.conns = new Map();
    if (this.id) this._openHost();
    else setTimeout(() => this.emit('open', null), 0); // gæster har ingen egen forbindelse før connect()
  }

  // ---- vært ----
  _openHost() {
    const ws = (this.ws = openSocket(this.base, this.id, 'host'));
    let opened = false;
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.ev === 'open') { opened = true; this.disconnected = false; this.emit('open', this.id); }
      else if (m.ev === 'error') this.emit('error', { type: m.type });
      else if (m.ev === 'join') {
        const c = new RelayConn(m.id, data => ws.readyState === 1 && ws.send(JSON.stringify({ to: m.id, data })));
        this.conns.set(m.id, c);
        this.emit('connection', c);
        setTimeout(() => c._opened(), 0);
      } else if (m.ev === 'leave') { const c = this.conns.get(m.id); if (c) { this.conns.delete(m.id); c._closed(); } }
      else if (m.ev === 'data') { const c = this.conns.get(m.from); if (c) c.emit('data', m.data); }
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.destroyed) return;
      this.conns.forEach(c => c._closed()); this.conns.clear();
      if (!opened) { this.emit('error', { type: 'network' }); return; }
      this.disconnected = true;
      this.emit('disconnected');
    };
  }

  // ---- gæst ----
  connect(hostId) {
    const conn = new RelayConn(hostId, data => ws.readyState === 1 && ws.send(JSON.stringify(data)));
    const ws = (conn._ws = openSocket(this.base, hostId, 'guest'));
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.ev === 'open') conn._opened();
      else if (m.ev === 'data') conn.emit('data', m.data);
      else if (m.ev === 'error') { conn._failed = true; this.emit('error', { type: m.type }); }
    };
    ws.onclose = () => { if (!conn._failed) conn._closed(); };
    return conn;
  }

  reconnect() { if (this.id && !this.destroyed) this._openHost(); }
  destroy() {
    this.destroyed = true;
    try { this.ws && this.ws.close(); } catch (e) {}
    this.conns.forEach(c => c.close());
  }
}
