// Nybyggerne – vinduerne bag knapperne i højre side (handel, spillere, krønike, indstillinger)
// samt dialogbokse (smid kort, overflodsår, monopol, vinder).

import G from '../game/index.js';

import { app } from './state.js';
import { $, RES, esc, icon, pname, resLine } from './util.js';
export function openPanel(name, force) {
  const cur = app.ui.panel;
  app.ui.panel = !force && cur === name ? null : name;
  const docked = window.innerWidth > 860 && !!app.state; // på store skærme står handel altid fremme i venstre side
  if (docked && name === 'trade') app.ui.panel = null;
  ['trade', 'players', 'log', 'settings'].forEach(n => { $('win-' + n).hidden = app.ui.panel !== n && !(n === 'trade' && docked); });
  $('win-trade').classList.toggle('docked', docked);
  document.querySelectorAll('.tool[data-cmd="panel"]').forEach(b => b.classList.toggle('on', b.dataset.arg === app.ui.panel));
}
export const TIPS = {
  vp: { name: 'Sejrspoint', text: 'Bosættelse = 1, by = 2, Længste vej = 2, Største hær = 2, sejrspointkort = 1, Øens forsvarer = 1, ny ø koloniseret = 2. Målet står i Indstillinger (10 point uden udvidelser). Andres skjulte sejrspointkort kan du ikke se – en * ved dit eget tal betyder at dine skjulte kort er talt med.' },
  cards: { name: 'Råstofkort', text: 'Antal råstofkort på hånden. Har man mere end 7, når der slås 7, skal man smide halvdelen.' },
  dev: { name: 'Udviklingskort', text: 'Antal udviklingskort på hånden. De andre kan ikke se, hvilke kort det er.' },
  knights: { name: 'Riddere', text: 'Antal spillede ridderkort. Den første med mindst 3 får Største hær (+2 point) – indtil en anden får flere.' },
  road: { name: 'Længste vej', text: 'Spillerens længste sammenhængende vej. Den første med mindst 5 får Længste vej (+2 point) – indtil en anden får en længere.' },
};
export const TIME_NAMES = { 0: 'Ingen grænse', 30: '30 sekunder', 60: '1 minut', 90: '1½ minut', 120: '2 minutter', 180: '3 minutter', 300: '5 minutter' };
export const timeName = v => TIME_NAMES[v] || `${v} sekunder`;
export const chip = (k, ic, val) => `<span class="chip" data-tip="${k}" title="${TIPS[k].name}">${ic} ${val}</span>`;
export function legendHtml() { return Object.entries(TIPS).map(([k, t]) => `<div><b>${{ vp: '⭐', cards: '🃏', dev: '📜', knights: '⚔️', road: '🛣️' }[k]} ${t.name}:</b> ${t.text}</div>`).join(''); }

export const COSTS = [
  ['road', 'Vej', 'til Længste vej'],
  ['settlement', 'Bosættelse', '1 point'],
  ['city', 'By', '2 point · dobbelt høst'],
  ['dev', 'Udviklingskort', 'ridderkort, point m.m.'],
  ['ship', 'Skib', 'sejl til nye øer', 'seafarers'],
  ['knight', 'Ridder', 'forsvarer mod barbarer', 'barbarians'],
  ['activate', 'Aktivér ridder', 'efter et angreb', 'barbarians'],
];
export function renderCosts(s) {
  const me = app.me, p = s.players[me];
  return COSTS.filter(c => !c[3] || (s.exp && s.exp[c[3]])).map(([t, name, note]) => {
    const cost = G.COST[t];
    const icons = Object.keys(cost).flatMap(k => Array(cost[k]).fill(icon(k, true))).join('');
    const left = t === 'dev' ? s.devDeck.length : t === 'activate' ? G.validActivateSpots(s, me).length : G.piecesLeft(s, me, t);
    const ok = G.canAfford(p, cost) && left > 0;
    return `<div class="costrow ${ok ? 'ok' : ''}" title="${G.fmtRes(cost)}"><div class="nm"><span>${name}</span><small>${note}</small></div><div class="ic">${icons}</div><span class="vp">${left} ${t === 'activate' ? 'hviler' : 'tilbage'}</span></div>`;
  }).join('');
}

export function stepper(side, k) {
  return `<div class="stepper"><button class="small" data-cmd="step" data-arg="${side}:${k}:-1">−</button><b>${app.ui[side][k]}</b><button class="small" data-cmd="step" data-arg="${side}:${k}:1">+</button></div>`;
}

export function renderTrade(s) {
  if (s.phase !== 'main') return '';
  const me = app.me, p = s.players[me], mine = s.turn === me, tr = s.trade;
  let h = '';
  if (tr) {
    h += `<div class="offer">${pname(tr.from)} giver <b>${resLine(tr.give)}</b> og vil have <b>${resLine(tr.get)}</b>.`;
    if (tr.from === me) {
      h += `<div class="btns" style="margin-top:8px">${tr.accepted.map(i => `<button class="primary" data-cmd="confirm" data-arg="${i}">Byt med ${esc(s.players[i].name)}</button>`).join('')}<button data-cmd="cancel">Annullér</button></div>`;
      const waiting = s.players.map((_, i) => i).filter(i => i !== me && !tr.accepted.includes(i) && !tr.declined.includes(i));
      h += `<div class="muted" style="font-size:14px;margin-top:6px">${tr.declined.length ? 'Afslået af: ' + tr.declined.map(pname).join(', ') + '. ' : ''}${waiting.length ? 'Venter på: ' + waiting.map(pname).join(', ') : ''}</div>`;
    } else if (tr.accepted.includes(me)) {
      h += `<div class="muted" style="margin-top:6px">Du har accepteret – venter på ${pname(tr.from)}.</div><div class="btns" style="margin-top:6px"><button data-cmd="decline">Fortryd</button></div>`;
    } else {
      const ok = RES.every(k => p.res[k] >= tr.get[k]);
      h += `<div class="btns" style="margin-top:8px"><button class="primary" data-cmd="accept" ${ok ? '' : 'disabled'}>Accepter</button><button data-cmd="decline">Afslå</button></div>`;
      if (!ok) h += `<div class="muted" style="font-size:14px">Du har ikke de kort, der bedes om.</div>`;
    }
    return h + `</div>`;
  }
  if (!mine) return '';
  const ratios = G.tradeRatios(s, me);
  const opt = sel => RES.map(k => `<option value="${k}" ${sel === k ? 'selected' : ''}>${G.RES_ICON[k]} ${G.RES_DA[k]}</option>`).join('');
  const r = ratios[app.ui.bankGive];
  h += `<div class="row" style="margin-bottom:10px"><span class="cz" style="font-size:14px">Bank:</span> giv ${r}× <select data-ui="bankGive">${opt(app.ui.bankGive)}</select> → 1× <select data-ui="bankGet">${opt(app.ui.bankGet)}</select>
        <button data-cmd="bank" ${p.res[app.ui.bankGive] >= r && app.ui.bankGive !== app.ui.bankGet ? '' : 'disabled'}>Byt</button></div>`;
  h += `<div class="tradeGrid"><span></span><b class="cz th give">⬆ Du giver</b><b class="cz th get">⬇ Du får</b>`;
  RES.forEach(k => { h += `<span class="resTag res-${k}" title="${G.RES_DA[k]}">${icon(k, true)}<small>${G.RES_DA[k]}</small></span><div class="cell give">${stepper('give', k)}</div><div class="cell get">${stepper('get', k)}</div>`; });
  h += `</div><div class="btns" style="margin-top:8px"><button data-cmd="offer" ${G.countRes(app.ui.give) && G.countRes(app.ui.get) ? '' : 'disabled'}>Send tilbud til de andre</button></div>`;
  return h;
}

export function renderModal(s) {
  const m = $('modal'), me = app.me, p = s.players[me];
  const opt = sel => RES.map(k => `<option value="${k}" ${sel === k ? 'selected' : ''}>${G.RES_ICON[k]} ${G.RES_DA[k]}</option>`).join('');
  let h = '';
  if (s.phase === 'discard' && s.discard && s.discard[me]) {
    const need = s.discard[me], sel = G.countRes(app.ui.disc);
    h = `<h2>Smid ${need} kort</h2><p class="muted" style="font-style:italic">Røveren er på spil, og du har mere end 7 kort.</p><div class="tradeGrid" style="grid-template-columns:auto auto 1fr">`;
    RES.forEach(k => { h += `<span>${G.RES_ICON[k]} ${G.RES_DA[k]}</span><span class="muted">har ${p.res[k]}</span>${stepper('disc', k)}`; });
    h += `</div><div class="btns" style="margin-top:12px"><button class="primary" data-cmd="discard" ${sel === need ? '' : 'disabled'}>Smid (${sel}/${need})</button></div>`;
  } else if (app.ui.modal === 'yearOfPlenty') {
    h = `<h2>Overflodsår</h2><p class="muted">Vælg 2 råstoffer fra banken.</p><div class="row"><select data-ui="yop1">${opt(app.ui.yop1)}</select><select data-ui="yop2">${opt(app.ui.yop2)}</select></div>
      <div class="btns" style="margin-top:12px"><button class="primary" data-cmd="playYop">Tag dem</button><button data-cmd="closeModal">Annullér</button></div>`;
  } else if (app.ui.modal === 'monopoly') {
    h = `<h2>Monopol</h2><p class="muted">Alle andre giver dig alle deres kort af én slags.</p><select data-ui="mono">${opt(app.ui.mono)}</select>
      <div class="btns" style="margin-top:12px"><button class="primary" data-cmd="playMono">Spil</button><button data-cmd="closeModal">Annullér</button></div>`;
  } else if (s.phase === 'gameover' && app.ui.modal !== 'closedWin') {
    h = `<h2>🏆 ${pname(s.winner)} har vundet!</h2><p>${s.players.map((pl, i) => `${esc(pl.name)}: ${G.totalVP(s, i)} point`).join('<br>')}</p>
      <div class="btns">${app.mode !== 'client' ? '<button class="primary" data-cmd="again">Nyt spil</button>' : ''}<button data-cmd="closeWin">Se øen</button></div>`;
  }
  m.hidden = !h;
  m.innerHTML = h ? `<div class="box parch">${h}</div>` : '';
}
