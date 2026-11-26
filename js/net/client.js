// Nybyggerne – gæsten: forbinder til værten med rumkoden og modtager spillets tilstand.

import { PREFIX } from '../config.js';
import { createPeer, peerAvailable, ready, transport } from './transport.js';
import { store } from '../storage.js';
import { renderLobby, showGame, showLobby } from '../ui/lobby.js';
import { render } from '../ui/render.js';
import { app } from '../ui/state.js';
import { $, banner, toast } from '../ui/util.js';
// ---------- Klient ----------
export function clientJoin() {
  if (!transport.kind) { ready.then(clientJoin); return; }
  if (!peerAvailable()) { toast('Forbindelsesbiblioteket kunne ikke indlæses.'); return; }
  const code = $('codeInput').value.trim().toUpperCase();
  if (code.length !== 4) { toast('Skriv den 4-bogstavs kode.'); return; }
  store.set('code', code);
  app.mode = 'client'; app.code = code;
  showLobby();
  $('lobbyStatus').textContent = 'Forbinder…';
  const peer = createPeer();
  app.peer = peer;
  peer.on('open', connectToHost);
  peer.on('disconnected', () => setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500));
  peer.on('error', err => {
    if (err.type === 'peer-unavailable') {
      if (app.state) { banner('Værten er væk – prøver igen…'); setTimeout(connectToHost, 3000); }
      else { toast(`Fandt intet spil med koden ${app.code}.`); $('lobbyStatus').textContent = 'Fandt ikke spillet. Tjek koden.'; }
    } else if (['network', 'server-error', 'socket-error'].includes(err.type)) banner('Netværksfejl – prøver igen…');
    else console.warn(err);
  });
}
export function connectToHost() {
  if (!app.peer || app.peer.destroyed) return;
  if (app.peer.disconnected) { try { app.peer.reconnect(); } catch (e) {} setTimeout(connectToHost, 2000); return; }
  const conn = app.peer.connect(PREFIX + app.code.toLowerCase(), { reliable: true });
  app.conn = conn;
  conn.on('open', () => { banner(''); app.retries = 0; conn.send({ t: 'hello', name: app.name, cid: app.cid }); });
  conn.on('data', onClientData);
  conn.on('close', onLostHost);
  conn.on('error', onLostHost);
}
export function onLostHost() {
  if (app.fatal) return;
  app.retries++;
  banner('Forbindelsen til værten er tabt – prøver igen…');
  if (app.retries < 40) setTimeout(connectToHost, 3000); else banner('Kunne ikke genforbinde. Genindlæs siden og deltag igen med samme kode.');
}
export function onClientData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'lobby') { app.lobbyNames = d.players; app.lobbyTime = d.timeLimit || 0; app.lobbyExp = d.exp || {}; renderLobby(); }
  else if (d.t === 'state') { if (d.now) app.clockOffset = d.now - Date.now(); app.state = d.s; app.me = d.you; app.online = d.online || []; showGame(); render(); }
  else if (d.t === 'err') { toast(d.m, 'error'); if (d.fatal) { app.fatal = true; $('lobbyStatus').textContent = d.m; } }
}
