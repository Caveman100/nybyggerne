// Nybyggerne – Cloudflare-relæ.
//
// Workeren gør to ting:
//   1. Viser selve spillet (alle filerne i repositoriet serveres som almindelige websider).
//   2. Videresender beskeder mellem spillerne på adressen /relay/<rum> via WebSockets.
//
// Alt går over almindelig HTTPS (port 443), ligesom en hjemmeside. Derfor slipper det igennem
// skole-, firma- og hotel-firewalls, som ofte blokerer PeerJS/WebRTC's direkte forbindelser.
//
// Hvert rum er et "Durable Object" (Room): en lille proces hos Cloudflare, som alle spillere
// i samme rum forbindes til. Værten kører stadig spillets regler – rummet sender kun videre.
//
//   vært  ──ws──►  Room  ◄──ws──  gæst
//   { to: gæsteId, data }  →  gæsten får { ev: 'data', data }
//   gæst sender data       →  værten får { ev: 'data', from: gæsteId, data }

import { DurableObject } from 'cloudflare:workers';

const ROOM_RE = /\/relay\/([a-z0-9-]{1,48})$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/relay/ping')) {
      return new Response('nybyggerne-relay', { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
    }
    const m = url.pathname.match(ROOM_RE);
    if (m) {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Forventede en WebSocket', { status: 426 });
      return env.ROOMS.getByName(m[1].toLowerCase()).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Svar på "ping" uden at vække rummet (holder forbindelsen åben gennem proxyer)
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  host() { return this.ctx.getWebSockets('host').find(ws => ws.readyState === WebSocket.OPEN); }
  guest(id) { return this.ctx.getWebSockets('g:' + id).find(ws => ws.readyState === WebSocket.OPEN); }
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch (e) {} }

  async fetch(request) {
    const role = new URL(request.url).searchParams.get('role');
    const [client, server] = Object.values(new WebSocketPair());

    if (role === 'host') {
      if (this.host()) {
        // Koden er allerede i brug af en anden vært
        this.ctx.acceptWebSocket(server, ['rejected']);
        this.send(server, { ev: 'error', type: 'unavailable-id' });
        server.close(4001, 'unavailable-id');
      } else {
        this.ctx.acceptWebSocket(server, ['host']);
        server.serializeAttachment({ role: 'host' });
        this.send(server, { ev: 'open' });
        // Gæster der stadig er forbundet (værten genindlæste siden) meldes til den nye vært
        for (const ws of this.ctx.getWebSockets('guest')) {
          const a = ws.deserializeAttachment();
          if (a && ws.readyState === WebSocket.OPEN) this.send(server, { ev: 'join', id: a.id });
        }
      }
    } else {
      const host = this.host();
      if (!host) {
        this.ctx.acceptWebSocket(server, ['rejected']);
        this.send(server, { ev: 'error', type: 'peer-unavailable' });
        server.close(4004, 'peer-unavailable');
      } else {
        const id = crypto.randomUUID().slice(0, 8);
        this.ctx.acceptWebSocket(server, ['guest', 'g:' + id]);
        server.serializeAttachment({ role: 'guest', id });
        this.send(server, { ev: 'open', id });
        this.send(host, { ev: 'join', id });
      }
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment();
    if (!a) return;
    if (a.role === 'host') {
      let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
      const g = msg && this.guest(msg.to);
      if (g) g.send(JSON.stringify({ ev: 'data', data: msg.data }));
    } else {
      const host = this.host();
      if (host) host.send(`{"ev":"data","from":"${a.id}","data":${raw}}`);
    }
  }

  async webSocketClose(ws) { this.gone(ws); }
  async webSocketError(ws) { this.gone(ws); }

  gone(ws) {
    const a = ws.deserializeAttachment();
    if (!a) return;
    if (a.role === 'guest') {
      const host = this.host();
      if (host) this.send(host, { ev: 'leave', id: a.id });
    } else if (!this.host()) {
      // Værten er væk: luk gæsterne, så de prøver at genforbinde (værten kan komme tilbage)
      for (const g of this.ctx.getWebSockets('guest')) try { g.close(4000, 'host-left'); } catch (e) {}
    }
  }
}
