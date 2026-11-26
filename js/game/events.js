// Nybyggerne – spillogik. Hændelser: produktion efter terningslag, tyveri, begivenhedskort og barbarangreb.

import { EVENTS, RES, RES_DA, TERRAIN_RES } from './constants.js';
import { HEXES, VERTS } from './geometry.js';
import { countRes, exp, fmtRes, give, guards, log, pick, piecesLeft, vertexIsland, zeroRes } from './helpers.js';
import { publicVP, updateLongestRoad } from './scoring.js';
export function steal(s, thief, victim) {
  const v = s.players[victim];
  const bag = [];
  RES.forEach(k => { for (let i = 0; i < v.res[k]; i++) bag.push(k); });
  if (!bag.length) return;
  const r = pick(bag);
  v.res[r]--; s.players[thief].res[r]++;
  log(s, `🦹 [[${thief}]] stjal et kort fra [[${victim}]].`);
  s.lastSteal = { thief, victim, res: r, seq: s.seq + 1 };
}

export function produce(s, total) {
  const demand = {}, gold = {};
  s.hexes.forEach((h, hi) => {
    if (h.number !== total || hi === s.robber) return;
    const r = TERRAIN_RES[h.terrain];
    if (!r) return;
    HEXES[hi].verts.forEach(v => {
      const b = s.buildings[v];
      if (!b) return;
      const n = b.type === 'city' ? 2 : 1;
      if (r === 'gold') { gold[b.owner] = (gold[b.owner] || 0) + n; return; }
      demand[r] = demand[r] || {};
      demand[r][b.owner] = (demand[r][b.owner] || 0) + n;
    });
  });
  const gains = s.players.map(() => zeroRes());
  for (const r in demand) {
    const d = demand[r];
    const owners = Object.keys(d).map(Number);
    const tot = owners.reduce((a, o) => a + d[o], 0);
    if (tot > s.bank[r] && owners.length > 1) { log(s, `Banken mangler ${RES_DA[r]} – ingen får ${RES_DA[r]}.`); continue; }
    owners.forEach(o => { gains[o][r] += give(s, o, r, d[o]); });
  }
  // Guld giver et tilfældigt råstof pr. enhed
  for (const o in gold) for (let k = 0; k < gold[o]; k++) {
    const avail = RES.filter(r => s.bank[r] > 0);
    if (!avail.length) break;
    const r = pick(avail);
    gains[o][r] += give(s, +o, r, 1);
  }
  let any = false;
  gains.forEach((g, i) => { if (countRes(g) > 0) { any = true; log(s, `[[${i}]] fik ${fmtRes(g)}${gold[i] ? ' (inkl. guld)' : ''}.`); } });
  if (!any) log(s, 'Ingen fik noget.');
}

export function applyEvent(s, ev) {
  const E = EVENTS[ev];
  s.lastEvent = { ev, seq: s.seq + 1 };
  log(s, `📯 Begivenhed: ${E.name} – ${E.text}`);
  const n = s.players.length;
  const nearTerrain = (pi, t) => Object.keys(s.buildings).some(v => s.buildings[v].owner === pi && VERTS[v].hexes.some(h => s.hexes[h].terrain === t));
  switch (ev) {
    case 'feast': for (let i = 0; i < n; i++) give(s, i, 'wheat'); break;
    case 'plague': s.players.forEach(p => { if (p.res.sheep > 0) { p.res.sheep--; s.bank.sheep++; } }); break;
    case 'market': s.marketTurn = s.turnNumber; break;
    case 'storm': s.stormTurn = s.turnNumber; break;
    case 'vein': for (let i = 0; i < n; i++) if (nearTerrain(i, 'mountains')) give(s, i, 'ore'); break;
    case 'timber': for (let i = 0; i < n; i++) if (nearTerrain(i, 'forest')) give(s, i, 'wood'); break;
    case 'tournament': {
      const max = Math.max(...s.players.map(p => p.knights));
      if (max > 0) s.players.forEach((p, i) => { if (p.knights === max) { const r = pick(RES.filter(k => s.bank[k] > 0)); if (r) { give(s, i, r); log(s, `[[${i}]] vandt turneringen og fik 1 ${RES_DA[r]}.`); } } });
      else log(s, 'Ingen deltog i turneringen.');
      break;
    }
    case 'charity': {
      const vps = s.players.map((_, i) => publicVP(s, i)), min = Math.min(...vps);
      const who = vps.map((v, i) => (v === min ? i : -1)).filter(i => i >= 0);
      if (who.length === 1) { const r = pick(RES.filter(k => s.bank[k] > 0)); if (r) { give(s, who[0], r); log(s, `[[${who[0]}]] fik 1 ${RES_DA[r]}.`); } }
      else log(s, 'Flere står lige – ingen får noget.');
      break;
    }
  }
}

export function barbarianAttack(s) {
  const cities = Object.values(s.buildings).filter(b => b.type === 'city').length;
  const per = s.players.map((_, i) => Object.values(guards(s)).filter(g => g.owner === i && g.active).length);
  const def = per.reduce((a, b) => a + b, 0);
  log(s, `🏴‍☠️ Barbarerne går i land! Styrke ${cities} (byer) mod forsvar ${def} (aktive riddere).`);
  if (cities === 0) log(s, 'Der er ingen byer at plyndre – barbarerne sejler hjem.');
  else if (def >= cities) {
    const m = Math.max(...per);
    if (m > 0) per.forEach((k, i) => { if (k === m) { s.players[i].defenderVP++; log(s, `🛡️ [[${i}]] er Øens forsvarer (+1 point).`); } });
  } else {
    const cand = s.players.map((_, i) => i).filter(i => Object.values(s.buildings).some(b => b.owner === i && b.type === 'city'));
    const m = Math.min(...cand.map(i => per[i]));
    cand.filter(i => per[i] === m).forEach(i => {
      const v = Object.keys(s.buildings).find(k => s.buildings[k].owner === i && s.buildings[k].type === 'city');
      if (piecesLeft(s, i, 'settlement') > 0) { s.buildings[v].type = 'settlement'; log(s, `🔥 Barbarerne plyndrede [[${i}]]s by – den er nu en bosættelse.`); }
      else { delete s.buildings[v]; log(s, `🔥 Barbarerne ødelagde [[${i}]]s by.`); }
    });
  }
  Object.values(guards(s)).forEach(g => (g.active = false));
  s.barb.pos = 0;
  s.barb.attacks = (s.barb.attacks || 0) + 1;
  s.lastAttack = s.seq + 1;
  updateLongestRoad(s);
}

export function checkIsland(s, pi, v) {
  if (!exp(s, 'seafarers')) return;
  const isl = vertexIsland(s, v), p = s.players[pi];
  if (isl > 0 && !p.islands.includes(isl)) { p.islands.push(isl); p.islandVP += 2; log(s, `⛵ [[${pi}]] koloniserede en ny ø (+2 point).`); }
}
