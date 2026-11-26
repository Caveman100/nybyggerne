// Nybyggerne – startskærmen og lobbyen før spillet begynder.

import G from '../game/index.js';

import { send } from '../session.js';
import { store } from '../storage.js';
import { timeName } from './panels.js';
import { app } from './state.js';
import { $, esc, toast } from './util.js';
// ---------- Start / lobby ----------
export function initStart() {
  $('nameInput').value = store.get('name') || '';
  const q = new URLSearchParams(location.search).get('kode');
  $('codeInput').value = (q || store.get('code') || '').toUpperCase();
  const h = store.get('host');
  if (h && h.state && h.state.phase !== 'gameover') {
    $('resumeBox').hidden = false;
    $('resumeBox').innerHTML = `<button data-cmd="resume">Genoptag spil ${esc(h.code)}</button><span class="muted" style="font-size:14px">(${h.state.players.map(p => esc(p.name)).join(', ')})</span>`;
  }
  const l = store.get('local');
  if (l && l.phase !== 'gameover') { $('resumeLocalBox').hidden = false; $('resumeLocalBox').innerHTML = `<button data-cmd="resumeLocal">Genoptag lokalt spil</button>`; }
}
export function getName() {
  const n = $('nameInput').value.trim().slice(0, 20);
  if (!n) { toast('Skriv dit navn først.'); $('nameInput').focus(); return null; }
  store.set('name', n); app.name = n; return n;
}
export function readExp(attr) {
  const o = {};
  document.querySelectorAll(`[${attr}]`).forEach(c => (o[c.getAttribute(attr)] = c.checked));
  return o;
}
export function setExp(attr, o) { document.querySelectorAll(`[${attr}]`).forEach(c => (c.checked = !!(o && o[c.getAttribute(attr)]))); }
export const expNames = o => Object.keys(G.EXP_DA).filter(k => o && o[k]).map(k => G.EXP_DA[k]).join(', ') || 'ingen';
export function genCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c = ''; for (let i = 0; i < 4; i++) c += a[Math.floor(Math.random() * a.length)]; return c; }
export function showLobby() {
  $('startCards').hidden = true; $('lobbyCard').hidden = false;
  $('lobbyCode').textContent = app.code || '····';
  $('lobbyLink').textContent = location.protocol.startsWith('http') && app.code ? `Eller send linket: ${location.origin}${location.pathname}?kode=${app.code}` : '';
  renderLobby();
}
export function renderLobby() {
  const names = app.mode === 'host' ? app.lobby.map(l => l.name) : app.lobbyNames;
  const host = app.mode === 'host';
  $('lobbyList').innerHTML = names.map((n, i) => `<li><span class="shield" style="background:${G.COLORS[i]}"></span>${esc(n)}${i === 0 ? ' <span class="muted">(vært)</span>' : ''}${host && app.lobby[i].bot ? ` <span class="muted">(${G.BOT_LEVELS[app.lobby[i].bot] || 'Normal'})</span> <button class="small" data-cmd="removeBot" data-arg="${i}" title="Fjern botten">✕</button>` : ''}</li>`).join('');
  $('addBotBox').hidden = !host || names.length >= 4;
  $('startBtn').hidden = app.mode !== 'host';
  $('timeRow').hidden = app.mode !== 'host';
  $('timeInfo').hidden = app.mode === 'host';
  $('expRow').hidden = app.mode !== 'host';
  if (app.mode !== 'host') $('timeInfo').textContent = 'Tid pr. tur: ' + timeName(app.lobbyTime || 0) + ' · Udvidelser: ' + expNames(app.lobbyExp);
  $('startBtn').disabled = names.length < 2;
  if (app.mode === 'host') $('lobbyStatus').textContent = names.length < 2 ? 'Venter på mindst én spiller mere…' : 'Klar! Tryk Start når alle er med (max 4).';
  else $('lobbyStatus').textContent = 'Venter på at værten starter spillet…';
}
export function showGame() {
  if (document.body.classList.contains('in-game')) return;
  document.body.classList.remove('in-start'); document.body.classList.add('in-game');
  $('startScreen').hidden = true;
  $('codeTag').hidden = false; $('hint').hidden = false; $('hudLayer').hidden = false;
  $('codeTag').textContent = app.mode === 'local' ? 'Lokalt spil' : `Kode: ${app.code}`;
  setTimeout(() => ($('hint').hidden = true), 9000);
  if (app.board && app.board.controls) app.board.controls.autoRotate = false;
}
export function leave() { try { app.peer && app.peer.destroy(); } catch (e) {} location.href = location.pathname; }
