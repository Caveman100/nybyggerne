// Nybyggerne – det man ser rundt om brættet: dine kort, modspillere, barbarer, store bannere,
// "Du fik"-beskeder, lyde ved nye hændelser, timeren og venstre kolonne.

import G from '../game/index.js';
import { Sound } from '../sound.js';
import { CARD_IMAGES } from '../assets.js';

import { newLogs } from './render.js';
import { app } from './state.js';
import { $, RES, esc, fmtLog, icon } from './util.js';
export let evTimer;
export function showEvent(title, text, attack, delay) {
  setTimeout(() => {
    const el = $('eventBanner');
    el.className = 'parch' + (attack ? ' attack' : '');
    el.innerHTML = `<div class="t">${title}</div><div class="d">${text}</div>`;
    void el.offsetWidth; el.classList.add('show');
    clearTimeout(evTimer); evTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }, delay);
}
export function renderBarb(s) {
  const el = $('barbHud');
  el.hidden = !s.barb;
  if (!s.barb) return;
  const cities = Object.values(s.buildings).filter(b => b.type === 'city').length;
  const def = Object.values(s.guards || {}).filter(g => g.active).length;
  const cells = Array.from({ length: G.BARB_TRACK }, (_, i) => `<span class="${i < s.barb.pos ? 'on' : ''} ${i === G.BARB_TRACK - 1 ? 'isle' : ''}">${i === s.barb.pos ? '⛵' : i === G.BARB_TRACK - 1 ? '🏰' : ''}</span>`).join('');
  el.innerHTML = `<div class="bt">Barbarerne</div><div class="track">${cells}</div><div class="st" title="Angrebets styrke = antal byer. Forsvar = aktive riddere.">⚔️ ${cities} mod 🛡️ ${def} ${def >= cities ? '✓' : '⚠️'}</div>`;
}
export function renderHud(s) {
  renderBarb(s);
  const me = app.me, p = s.players[me];
  const mh = $('myHand'), oh = $('oppHud');
  mh.hidden = !p; oh.hidden = false;
  if (p) {
    const canPlay = s.turn === me && (s.phase === 'roll' || s.phase === 'main') && !s.devPlayed;
    const devs = {};
    p.dev.forEach(d => { const g = devs[d.type] || (devs[d.type] = { n: 0, ready: 0 }); g.n++; if (d.bought < s.turnNumber) g.ready++; });
    const DI = { knight: '⚔️', vp: '🏆', roadBuilding: '🛣️', yearOfPlenty: '🌾', monopoly: '💰' };
    const devHtml = Object.keys(devs).map(k => {
      const g = devs[k], playable = k !== 'vp' && canPlay && g.ready > 0;
      return `<div class="hc dev ${playable ? 'play' : g.ready < g.n && k !== 'vp' ? 'wait' : ''}" ${playable ? `data-cmd="play" data-arg="${k}"` : ''} title="${G.DEV_DA[k]}: ${G.DEV_DESC[k]}${playable ? ' – klik for at spille' : ''}"><span class="em">${DI[k]}</span><span class="nm">${G.DEV_DA[k]}</span><span class="cnt">${g.n}</span></div>`;
    }).join('');
    mh.innerHTML = `<div class="hl">Dine kort</div><div class="row2">${RES.map(k => `<div class="hc res-${k} ${p.res[k] ? '' : 'zero'}" title="${G.RES_DA[k]}"><img src="${CARD_IMAGES[k]}" alt=""><span class="nm">${G.RES_DA[k]}</span><span class="cnt">${p.res[k]}</span></div>`).join('')}${devHtml ? '<div class="hsep"></div>' + devHtml : ''}</div>`;
  }
  const others = [];
  for (let k = 1; k < s.players.length; k++) others.push((me + k) % s.players.length);
  oh.innerHTML = others.map(i => {
    const o = s.players[i], n = G.countRes(o.res), d = o.dev.length;
    const fan = (cnt, cls) => { const show = Math.min(cnt, 7); return `<div class="fan ${cls}" style="width:${28 + Math.max(0, show - 1) * 7}px">${Array.from({ length: show }, (_, j) => `<i style="left:${j * 7}px;transform:rotate(${(j - (show - 1) / 2) * 4}deg)"></i>`).join('')}<b>${cnt}</b></div>`; };
    return `<div class="opp ${s.turn === i ? 'turn' : ''}" data-opp="${i}"><div class="who"><span class="shield" style="background:${o.color}"></span>${esc(o.name)}</div>
      ${n ? fan(n, '') : '<span class="kn">0 kort</span>'}${d ? fan(d, 'dv') : ''}${o.knights ? `<span class="kn">⚔️ ${o.knights}</span>` : ''}</div>`;
  }).join('');
}
export let bannerTimer, gainTimer;
export function showTurnBanner(s) {
  const el = $('turnBanner'), p = s.players[s.turn], mine = s.turn === app.me;
  const sub = s.phase === 'setup' ? 'Placér en bosættelse og en vej' : mine ? 'Kast terningerne' : '';
  el.style.setProperty('--pc', p.color);
  el.innerHTML = `${mine ? 'Din tur!' : `${esc(p.name)}s tur`}${sub ? `<small>${sub}</small>` : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => el.classList.remove('show'), s.phase === 'setup' ? 1300 : 1900);
}
export function showGains(prev, s, delay) {
  const me = app.me, a = prev.players[me], b = s.players[me];
  if (!a || !b) return;
  const plus = [], minus = [];
  RES.forEach(k => { const d = b.res[k] - a.res[k]; if (d > 0) plus.push([k, d]); else if (d < 0) minus.push([k, -d]); });
  if (!plus.length) return;
  // Vis kun tab når de ikke skyldes ens egen betaling (byg/handel), dvs. ved tyveri/monopol
  const stolen = newLogs(prev.log, s.log).some(m => (m.includes('🦹') || m.includes('Monopol')) && !m.includes(`[[${me}]] stjal`) && !m.includes(`[[${me}]] spillede`));
  const html = `<span class="lbl">Du fik</span>` + plus.map(([k, d]) => `<span class="g">+${d}${icon(k)}</span>`).join('')
    + (stolen && minus.length ? `<span class="lbl">mistede</span>` + minus.map(([k, d]) => `<span class="g minus">−${d}${icon(k)}</span>`).join('') : '');
  setTimeout(() => {
    const el = $('gainPop');
    el.innerHTML = html;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(gainTimer); gainTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }, delay);
}
export function playStateSounds(prev, s) {
  if (!prev || prev.players.length !== s.players.length || JSON.stringify(prev.hexes) !== JSON.stringify(s.hexes)) return;
  let d = 0;
  newLogs(prev.log, s.log).forEach(m => {
    const k = m.includes('🏆') ? 'fanfare' : m.includes('byttede') ? 'coins' : m.includes('tilbyder') ? 'paper' : m.includes('udviklingskort') || m.includes('📜') ? 'card'
      : m.includes('🦹') ? 'steal' : m.includes(' smed ') ? 'discard' : (m.includes('har nu Længste') || m.includes('har nu Største')) ? 'badge' : null;
    if (k) { Sound.play(k, d); d += 0.15; }
  });
  if (s.turn === app.me && prev.turn !== s.turn && s.phase === 'roll') Sound.play('horn', 0.25);
  if ((prev.turn !== s.turn || (prev.phase === 'setup' && s.phase === 'roll')) && s.phase !== 'gameover') showTurnBanner(s);
  showGains(prev, s, (s.rollCount || 0) !== (prev.rollCount || 0) ? 1600 : 150);
  if (s.lastEvent && s.lastEvent.seq === s.seq) { const E = G.EVENTS[s.lastEvent.ev]; showEvent('📯 ' + E.name, E.text, false, 1500); }
  if (s.lastAttack === s.seq) {
    const msgs = newLogs(prev.log, s.log).filter(m => /🛡️ \[\[|🔥|ingen byer|går i land/.test(m)).map(fmtLog);
    showEvent('🏴‍☠️ Barbarerne angriber!', msgs.join('<br>'), true, s.lastEvent && s.lastEvent.seq === s.seq ? 5600 : 1600);
    Sound.play('robber', 1.5);
  }
}

setInterval(() => {
  const s = app.state, el = $('timer');
  if (!s || !s.timeLimit || !s.turnStart || s.phase === 'gameover') { el.hidden = true; return; }
  const now = Date.now() + (app.mode === 'client' ? app.clockOffset || 0 : 0);
  const left = Math.max(0, Math.ceil((s.turnStart + s.timeLimit * 1000 - now) / 1000));
  const who = G.actors(s);
  el.hidden = false;
  el.innerHTML = `⌛ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}<span>${who.map(i => esc(s.players[i].name)).join(', ')}</span>`;
  el.classList.toggle('low', left <= 10);
  if (who.includes(app.me) && left <= 5 && left > 0 && left !== app.lastTick) { app.lastTick = left; Sound.play('tick'); }
}, 250);

// Venstre kolonne: kode → timer → statusboks → modspillere → barbarer, stablet uden overlap
export function layoutLeft() {
  const wide = window.innerWidth > 860;
  const sb = $('statusBar'), tm = $('timer'), oh = $('oppHud'), bb = $('barbHud'), ct = $('codeTag');
  if (!wide) { [sb, tm, oh, bb].forEach(e => e.style.top = ''); return; }
  let y = ct.hidden ? 10 : ct.offsetTop + ct.offsetHeight + 8;
  if (!tm.hidden) { tm.style.top = y + 'px'; y += tm.offsetHeight + 8; }
  sb.style.top = y + 'px';
  if (!$('hudLayer').hidden) y += sb.offsetHeight + 12;
  if (!oh.hidden) { oh.style.top = y + 'px'; y += oh.offsetHeight + 10; }
  const tw = $('win-trade');
  if (tw.classList.contains('docked') && !tw.hidden) { tw.style.top = y + 'px'; tw.style.maxHeight = `calc(100vh - ${y + 190}px)`; y += tw.offsetHeight + 10; }
  else tw.style.top = '';
  bb.style.top = y + 'px';
}
setInterval(layoutLeft, 200);
window.addEventListener('resize', layoutLeft);
