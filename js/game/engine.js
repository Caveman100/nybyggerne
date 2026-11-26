// Nybyggerne – spillogik. Indgangen til spillogikken: act() udfører en handling sikkert, autoAction() når tiden løber ud.

import { apply } from './actions.js';
import { RES } from './constants.js';
import { steal } from './events.js';
import { HEXES } from './geometry.js';
import { isLand, log, pick, zeroRes } from './helpers.js';
import { validRoadSpots, validSettlementSpots, validShipSpots } from './placement.js';
import { totalVP } from './scoring.js';
// Udfør en handling sikkert: returnerer {error, state}. Den gamle tilstand ændres aldrig.
export function act(state, pi, action) {
  const s = JSON.parse(JSON.stringify(state));
  let err;
  try { err = apply(s, pi, action && typeof action === 'object' ? action : {}); }
  catch (e) { err = 'Intern fejl: ' + e.message; }
  if (err) return { error: err, state };
  s.seq = (s.seq || 0) + 1;
  const goal = s.winVP || 10;
  if (s.phase !== 'setup' && s.phase !== 'gameover') {
    const vp = totalVP(s, s.turn);
    if (vp >= goal) { s.winner = s.turn; s.phase = 'gameover'; s.trade = null; log(s, `🏆 [[${s.turn}]] har vundet med ${vp} point!`); }
  }
  return { error: null, state: s };
}

// Automatisk handling når en spillers tid løber ud
export function autoAction(s, pi) {
  const isTurn = pi === s.turn;
  switch (s.phase) {
    case 'setup': {
      if (!isTurn) return null;
      if (s.setup.need === 'settlement') return { type: 'build-settlement', v: pick(validSettlementSpots(s, pi)) };
      const roads = validRoadSpots(s, pi);
      return roads.length ? { type: 'build-road', e: pick(roads) } : { type: 'build-ship', e: pick(validShipSpots(s, pi)) };
    }
    case 'roll': return isTurn ? { type: 'roll' } : null;
    case 'discard': {
      const need = s.discard && s.discard[pi];
      if (!need) return null;
      const p = s.players[pi], bag = [], r = zeroRes();
      RES.forEach(k => { for (let i = 0; i < p.res[k]; i++) bag.push(k); });
      for (let i = 0; i < need; i++) r[bag.splice(Math.floor(Math.random() * bag.length), 1)[0]]++;
      return { type: 'discard', res: r };
    }
    case 'robber': {
      if (!isTurn) return null;
      const all = HEXES.map((_, i) => i).filter(i => i !== s.robber && isLand(s, i));
      const good = all.filter(i => !HEXES[i].verts.some(v => s.buildings[v] && s.buildings[v].owner === pi));
      return { type: 'move-robber', hex: pick(good.length ? good : all) };
    }
    case 'steal': return isTurn ? { type: 'steal', target: pick(s.stealTargets) } : null;
    case 'roadBuilding': return isTurn ? { type: 'skip-road' } : null;
    case 'main': return isTurn ? { type: 'end-turn' } : null;
  }
  return null;
}

export function actors(s) {
  if (s.phase === 'discard' && s.discard) return Object.keys(s.discard).map(Number);
  return [s.turn];
}
