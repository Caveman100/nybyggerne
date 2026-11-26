// Nybyggerne – værten: opretter rummet, modtager handlinger fra de andre og sender spillets tilstand ud.
// Værtens browser er "dommeren": kun værten kører spillogikken i et online-spil.

import G from '../game/index.js';

import { PREFIX } from '../config.js';
import { createPeer, peerAvailable, ready, transport } from './transport.js';
import { applyState, stamp } from '../session.js';
import { store } from '../storage.js';
import { genCode, readExp, renderLobby, showGame, showLobby } from '../ui/lobby.js';
import { render } from '../ui/render.js';
import { app } from '../ui/state.js';
import { $, banner, toast } from '../ui/util.js';
// ---------- Vært ----------
export function hostCreate(resume) {
  app.mode = 'host';
  if (resume) {
    const h = store.get('host');
    app.code = h.code; app.state = h.state;
    app.lobby = h.lobby.map(l => ({ ...l, conn: null }));
    app.me = Math.max(0, app.lobby.findIndex(l => l.cid === h.hostCid));
    app.lobby[app.me].cid = app.cid;
  } else {
    app.code = genCode(); app.state = null; app.me = 0;
    app.lobby = [{ name: app.name, cid: app.cid, conn: null }];
  }
  openHostPeer();
  if (app.state) { showGame(); render(); } else showLobby();
}
export function openHostPeer() {
  if (!transport.kind) { ready.then(openHostPeer); return; }
  if (!peerAvailable()) { toast('Forbindelsesbiblioteket kunne ikke indlæses.'); return; }
  if (app.peer) try { app.peer.destroy(); } catch (e) {}
  banner('Forbinder…');
  const peer = createPeer(PREFIX + app.code.toLowerCase());
  app.peer = peer;
  peer.on('open', () => { banner(''); app.retries = 0; if (!app.state) showLobby(); else render(); });
  peer.on('connection', conn => {
    conn.on('data', d => hostOnData(conn, d));
    conn.on('close', () => hostOnClose(conn));
    conn.on('error', () => hostOnClose(conn));
  });
  peer.on('disconnected', () => { banner('Mistede forbindelsen – prøver igen…'); setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500); });
  peer.on('error', err => {
    if (err.type === 'unavailable-id') {
      if (app.state || app.retries > 0) {
        app.retries++;
        banner(`Koden ${app.code} er stadig optaget – prøver igen (${app.retries})…`);
        if (app.retries < 15) setTimeout(openHostPeer, 3000); else banner('Kunne ikke genoptage koden. Genindlæs siden og prøv igen.');
      } else { app.code = genCode(); openHostPeer(); }
    } else if (['network', 'server-error', 'socket-error'].includes(err.type)) { banner('Netværksfejl – prøver igen…'); setTimeout(openHostPeer, 3000); }
    else if (err.type === 'browser-incompatible') banner('Din browser understøtter ikke WebRTC.');
    else console.warn(err);
  });
}
export function hostOnData(conn, d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'hello') {
    const name = String(d.name || 'Spiller').slice(0, 20), cid = String(d.cid || '');
    let i = app.lobby.findIndex(l => l.cid === cid);
    if (i < 0) {
      if (app.state) { conn.send({ t: 'err', m: 'Spillet er allerede i gang.', fatal: true }); return; }
      if (app.lobby.length >= 4) { conn.send({ t: 'err', m: 'Spillet er fuldt (max 4 spillere).', fatal: true }); return; }
      app.lobby.push({ name, cid, conn }); i = app.lobby.length - 1;
    } else {
      if (app.lobby[i].conn && app.lobby[i].conn !== conn) try { app.lobby[i].conn.close(); } catch (e) {}
      app.lobby[i].conn = conn;
      if (!app.state) app.lobby[i].name = name;
    }
    conn.cid = cid;
    if (app.state) { toast(`${app.lobby[i].name} er forbundet.`); broadcastState(); }
    else { saveHost(); broadcastLobby(); renderLobby(); }
  } else if (d.t === 'act') {
    const i = app.lobby.findIndex(l => l.cid === conn.cid);
    if (i < 0 || !app.state) return;
    const r = G.act(app.state, i, d.a);
    if (r.error) { conn.send({ t: 'err', m: r.error }); return; }
    applyState(r.state, app.state);
  }
}
export function hostOnClose(conn) {
  const i = app.lobby.findIndex(l => l.conn === conn);
  if (i < 0) return;
  app.lobby[i].conn = null;
  if (!app.state) { app.lobby.splice(i, 1); broadcastLobby(); renderLobby(); }
  else { toast(`${app.lobby[i].name} mistede forbindelsen.`); broadcastState(); }
}
export const online = () => app.lobby.map((l, i) => i === app.me || l.bot || !!(l.conn && l.conn.open));
export function broadcastLobby() { const names = app.lobby.map(l => l.name), timeLimit = +$('timeSelect').value, exp = readExp('data-exp-host'); app.lobby.forEach(l => { if (l.conn && l.conn.open) l.conn.send({ t: 'lobby', players: names, timeLimit, exp }); }); }
export function broadcastState() {
  app.online = online();
  const now = Date.now();
  app.lobby.forEach((l, i) => { if (l.conn && l.conn.open) l.conn.send({ t: 'state', s: app.state, you: i, online: app.online, now }); });
  render();
}
export function saveHost() { store.set('host', { code: app.code, hostCid: app.cid, lobby: app.lobby.map(l => ({ name: l.name, cid: l.cid, bot: l.bot || false })), state: app.state }); }
export function commit(s) { app.state = s; saveHost(); broadcastState(); }
export function hostStart() {
  if (app.lobby.length < 2) return;
  app.state = G.newGame(app.lobby.map(l => ({ name: l.name, id: l.cid, bot: l.bot || false })), { timeLimit: +$('timeSelect').value, expansions: readExp('data-exp-host') });
  stamp(null, app.state);
  saveHost(); showGame(); broadcastState();
}

// Botter i lobbyen (kun værten). De kører hos værten – se js/bots.js.
export function addBot() {
  if (app.state || app.lobby.length >= 4) return;
  const used = new Set(app.lobby.map(l => l.name));
  const name = G.BOT_NAMES.find(n => !used.has(n)) || '🤖 Bot';
  app.lobby.push({ name, cid: 'bot-' + Math.random().toString(36).slice(2, 8), bot: $('botLevel').value || 'hard', conn: null });
  saveHost(); broadcastLobby(); renderLobby();
}
export function removeBot(i) {
  if (app.state || !app.lobby[i] || !app.lobby[i].bot) return;
  app.lobby.splice(i, 1);
  saveHost(); broadcastLobby(); renderLobby();
}
