// Nybyggerne – tegner skærmen ud fra spillets tilstand: statusboks, byggeknapper og markeringer.
// render() kaldes hver gang tilstanden ændrer sig.

import G from '../game/index.js';
import { Sound } from '../sound.js';

import { playStateSounds, renderHud } from './hud.js';
import { expNames } from './lobby.js';
import { TIME_NAMES, chip, legendHtml, openPanel, renderModal, renderTrade, timeName } from './panels.js';
import { app } from './state.js';
import { $, RES, esc, fmtLog, icon, pname } from './util.js';
// ---------- Visning ----------
export function currentMode(s) {
  if (s.turn !== app.me || s.phase === 'gameover') return null;
  if (s.phase === 'setup') return s.setup.need;
  if (s.phase === 'roadBuilding') return 'road';
  if (s.phase === 'robber') return 'robber';
  if (s.phase === 'main') return app.ui.build;
  return null;
}
export function highlights(s) {
  const mode = currentMode(s), me = app.me;
  if (mode === 'settlement') return { settlement: G.validSettlementSpots(s, me) };
  if (mode === 'city') return { city: G.validCitySpots(s, me) };
  if (mode === 'road') {
    if (s.phase === 'setup' || s.phase === 'roadBuilding') return { road: G.piecesLeft(s, me, 'road') > 0 ? G.validRoadSpots(s, me) : [], ship: G.piecesLeft(s, me, 'ship') > 0 ? G.validShipSpots(s, me) : [] };
    return { road: G.validRoadSpots(s, me) };
  }
  if (mode === 'ship') return { ship: G.validShipSpots(s, me) };
  if (mode === 'knight') return { knight: G.validKnightSpots(s, me) };
  if (mode === 'activate') return { activate: G.validActivateSpots(s, me) };
  if (mode === 'robber') return { robber: s.hexes.map((_, i) => i).filter(i => i !== s.robber && s.hexes[i].terrain !== 'sea') };
  return {};
}

export function statusText(s) {
  const me = app.me, mine = s.turn === me, who = pname(s.turn);
  switch (s.phase) {
    case 'setup': return mine ? (s.setup.need === 'settlement' ? 'Placér en bosættelse – klik på en lysende ring.' : (s.exp && s.exp.seafarers ? 'Placér en vej eller et skib ved din nye bosættelse.' : 'Placér en vej ved din nye bosættelse.')) : `Venter på at ${who} placerer ${s.setup.need === 'settlement' ? 'en bosættelse' : 'en vej'}…`;
    case 'roll': return mine ? 'Din tur – kast terningerne!' : `Venter på at ${who} kaster…`;
    case 'discard': { const pend = Object.keys(s.discard || {}).map(Number); return pend.includes(me) ? `Der blev slået 7 – smid ${s.discard[me]} kort.` : `Venter på at ${pend.map(pname).join(', ')} smider kort…`; }
    case 'robber': return mine ? 'Klik på et felt for at flytte røveren.' : `${who} flytter røveren…`;
    case 'steal': return mine ? 'Vælg hvem du vil stjæle fra.' : `${who} vælger et offer…`;
    case 'roadBuilding': return mine ? `Placér en gratis vej (${s.freeRoads} tilbage).` : `${who} bygger gratis veje…`;
    case 'main': return mine ? (app.ui.build ? { road: 'Klik hvor vejen skal ligge.', settlement: 'Klik hvor bosættelsen skal ligge.', city: 'Klik på en af dine bosættelser.', ship: 'Klik hvor skibet skal sejle.', knight: 'Klik på et hjørne ved dine veje til ridderen.', activate: 'Klik på en hvilende ridder.' }[app.ui.build] : 'Din tur – byg, byt eller afslut turen.') : `Det er ${who}s tur.`;
    case 'gameover': return `🏆 ${pname(s.winner)} er herre over øen!`;
  }
  return '';
}

export const BUILD_ITEMS = [
  ['road', 'Vej'], ['settlement', 'Bosættelse'], ['city', 'By'], ['dev', 'Udviklings&shy;kort'],
  ['ship', 'Skib', 'seafarers'], ['knight', 'Ridder', 'barbarians'], ['activate', 'Aktivér ridder', 'barbarians'],
];
export function renderBuildBar(s) {
  const me = app.me, p = s.players[me], mine = s.turn === me && s.phase === 'main';
  const storm = s.stormTurn === s.turnNumber;
  return BUILD_ITEMS.filter(it => !it[2] || (s.exp && s.exp[it[2]])).map(([t, name]) => {
    const cost = G.COST[t];
    const icons = Object.keys(cost).flatMap(k => Array(cost[k]).fill(icon(k, true))).join('');
    const left = t === 'dev' ? s.devDeck.length : t === 'activate' ? G.validActivateSpots(s, me).length : G.piecesLeft(s, me, t);
    const afford = G.canAfford(p, cost) && left > 0 && !(storm && (t === 'road' || t === 'ship'));
    const ok = mine && afford, on = app.ui.build === t;
    const cmd = t === 'dev' ? 'data-cmd="buydev"' : `data-cmd="build" data-arg="${t}"`;
    const tip = `${name.replace('&shy;', '')}: ${G.fmtRes(cost)}${storm && (t === 'road' || t === 'ship') ? ' – stormen forhindrer det i denne tur' : ''}`;
    return `<button class="bi ${ok ? 'ok' : ''} ${on ? 'on' : ''} ${mine ? '' : 'idle'}" ${cmd} ${ok || on ? '' : 'disabled'} title="${tip}">
      <span class="t">${name}</span><span class="c">${icons}</span><span class="n">${left} ${t === 'activate' ? 'hviler' : 'tilbage'}</span></button>`;
  }).join('');
}

export function renderSide(s) {
  const me = app.me, p = s.players[me], mine = s.turn === me;
  const st = $('status');
  st.innerHTML = statusText(s);
  st.className = (mine || (s.phase === 'discard' && s.discard && s.discard[me])) && s.phase !== 'gameover' ? 'mine' : '';

  const ls = $('localSwitch');
  ls.hidden = app.mode !== 'local';
  const humans = s.players.map((pl, i) => i).filter(i => !s.players[i].bot);
  ls.innerHTML = app.mode === 'local' && humans.length > 1 ? `Du styrer: <select data-ui="viewAs">${humans.map(i => `<option value="${i}" ${i === me ? 'selected' : ''}>${esc(s.players[i].name)}</option>`).join('')}</select>` : '';

  // Store handlingsknap ved butikken
  let act = '';
  if (mine && s.phase === 'roll') act = `<button class="primary glow" data-cmd="roll">${s.exp && s.exp.events ? '🃏 Træk begivenhedskort' : '🎲 Kast terningerne'}</button>`;
  if (mine && s.phase === 'main') act = `<button class="primary" data-cmd="end">Afslut tur ➜</button>`;
  $('actionBtn').innerHTML = act;
  $('buildBar').innerHTML = renderBuildBar(s);

  // Situationsknapper under statuslinjen
  let a = '';
  if (mine && s.phase === 'roadBuilding') a += `<button data-cmd="skiproad">Spring resten over</button>`;
  if (mine && s.phase === 'steal') a += s.stealTargets.map(t => `<button class="primary" data-cmd="steal" data-arg="${t}">Stjæl fra ${esc(s.players[t].name)} (${G.countRes(s.players[t].res)} kort)</button>`).join('');
  if (s.phase === 'gameover' && app.mode !== 'client') a += `<button class="primary" data-cmd="again">Nyt spil med samme spillere</button>`;
  if (s.lastSteal && s.lastSteal.seq === s.seq && (s.lastSteal.thief === me || s.lastSteal.victim === me)) {
    const l = s.lastSteal;
    a += `<span class="note">${l.thief === me ? 'Du stjal' : 'Du mistede'} 1 ${G.RES_ICON[l.res]} ${G.RES_DA[l.res]}.</span>`;
  }
  $('turnActions').innerHTML = a;

  // Handel
  const tr = renderTrade(s);
  const ratios = G.tradeRatios(s, me);
  if (window.innerWidth > 860 && $('win-trade').hidden) openPanel(app.ui.panel, true);
  $('tradeBox').innerHTML = tr || `<p class="muted" style="margin-top:0;font-style:italic">Du kan handle, når det er din tur og terningerne er kastet. Andres tilbud dukker op her.</p>
    <div class="muted">Dine byttekurser med banken:</div><div class="row" style="gap:10px;margin-top:6px">${RES.map(k => `<span title="${G.RES_DA[k]}">${icon(k, true)} ${ratios[k]}:1</span>`).join('')}</div>`;
  const incoming = s.trade && s.trade.from !== me && s.phase === 'main';
  document.querySelector('[data-arg="trade"] .dot').hidden = !(incoming && !s.trade.accepted.includes(me) && !s.trade.declined.includes(me));
  if (incoming && app.ui.seenTrade !== s.trade.id) { app.ui.seenTrade = s.trade.id; openPanel('trade', true); Sound.play('chime'); Sound.play('paper', 0.15); }
  renderTradePopup(s, incoming);
  $('legend').innerHTML = legendHtml();

  $('players').innerHTML = s.players.map((pl, i) => {
    const vp = i === me ? G.totalVP(s, i) : G.publicVP(s, i);
    const off = app.mode !== 'local' && app.online.length && !app.online[i] ? '<span class="off">offline</span>' : '';
    return `<div class="pl ${i === s.turn ? 'active' : ''}"><span class="shield" style="background:${pl.color}"></span><div style="flex:1">
      <span class="plname">${esc(pl.name)}</span>${i === me ? ' <span class="muted">(dig)</span>' : ''}${off}
      ${s.longestRoad === i ? '<span class="badge">Længste vej</span>' : ''}${s.largestArmy === i ? '<span class="badge">Største hær</span>' : ''}
      <div class="stats">${chip('vp', '⭐', vp + (i === me && vp !== G.publicVP(s, i) ? '*' : ''))}${chip('cards', '🃏', G.countRes(pl.res))}${chip('dev', '📜', pl.dev.length)}${chip('knights', '⚔️', pl.knights)}${chip('road', '🛣️', s.roadLengths[i] || 0)}</div></div></div>`;
  }).join('');

  $('log').innerHTML = s.log.slice(-40).reverse().map(m => `<div>${fmtLog(m)}</div>`).join('');
  const goal = `<div class="muted" style="margin-bottom:6px">Først til <b>${s.winVP || 10} point</b> · Udvidelser: ${expNames(s.exp)}</div>`;
  $('settingsBox').innerHTML = goal + (app.mode === 'client'
    ? `<span class="muted">Tid pr. tur: ${timeName(s.timeLimit || 0)}</span>`
    : `<div class="row"><span class="cz" style="font-size:14px">Tid pr. tur:</span><select data-ui="timeLimit">${Object.keys(TIME_NAMES).map(v => `<option value="${v}" ${+v === (s.timeLimit || 0) ? 'selected' : ''}>${TIME_NAMES[v]}</option>`).join('')}</select></div>`);
}

export function newLogs(a, b) {
  if (!a) return [];
  if (b.length > a.length) return b.slice(a.length);
  const idx = b.lastIndexOf(a[a.length - 1]);
  return idx >= 0 ? b.slice(idx + 1) : [];
}
export function render() {
  const s = app.state; if (!s) return;
  if (s.seq !== app.ui.lastSeq) {
    if (s.phase !== 'main' || s.turn !== app.me || ['settlement', 'city', 'knight', 'activate'].includes(app.ui.build)) app.ui.build = null;
    else if (app.ui.build && G.COST[app.ui.build] && !G.canAfford(s.players[app.me], G.COST[app.ui.build])) app.ui.build = null;
    if (!(s.phase === 'discard' && s.discard && s.discard[app.me])) app.ui.disc = G.zeroRes();
    if (s.phase !== 'gameover' && app.ui.modal === 'closedWin') app.ui.modal = null;
    if (!s.dice) $('diceSum').hidden = true;
    playStateSounds(app.prevState, s);
    app.prevState = s;
    app.ui.lastSeq = s.seq;
  }
  if (app.board) app.board.update(s, { highlights: highlights(s), me: app.me });
  renderHud(s);
  renderSide(s); renderModal(s);
}

// Byttetilbud fra en anden spiller vises midt på skærmen, indtil man har svaret
function renderTradePopup(s, incoming) {
  const el = $('tradePopup'), me = app.me, tr = s.trade;
  const open = incoming && !tr.accepted.includes(me) && !tr.declined.includes(me);
  if (!open) { el.hidden = true; el.dataset.id = ''; return; }
  if (el.dataset.id === String(tr.id) && !el.hidden) return; // allerede vist
  el.dataset.id = tr.id;
  const p = s.players[me], ok = RES.every(k => p.res[k] >= tr.get[k]);
  const cards = r => RES.flatMap(k => Array(r[k] || 0).fill(icon(k, true))).join('');
  el.innerHTML = `<h3>🤝 ${pname(tr.from)} vil bytte</h3>
    <div class="swap"><div class="side"><span class="muted">Du får</span><div class="cards">${cards(tr.give)}</div></div>
    <span class="arrow">⇄</span><div class="side"><span class="muted">Du giver</span><div class="cards">${cards(tr.get)}</div></div></div>
    ${ok ? '' : '<div class="muted" style="margin-bottom:8px">Du har ikke de kort, der bedes om.</div>'}
    <div class="btns"><button class="primary" data-cmd="accept" ${ok ? '' : 'disabled'}>Accepter</button><button data-cmd="decline">Afslå</button></div>`;
  el.hidden = false;
}
