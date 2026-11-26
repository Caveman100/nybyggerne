// Nybyggerne – en simpel computerspiller (bot).
//
// botAction(s, pi, mem, now) returnerer den næste handling for bot nr. pi, eller null hvis den
// skal vente. Den bruger kun spillets almindelige handlinger, så den kan aldrig snyde.
// mem er bottens egen lille hukommelse (hvornår den sidst lavede et handelstilbud osv.).
//
// Sværhedsgrader (players[i].bot = 'easy' | 'normal' | 'hard'):
//   Let    – bygger mere tilfældigt og spørger ikke om at bytte.
//   Normal – strategien nedenfor.
//   Svær   – som normal, men vurderer hjørner efter hvilke råstoffer den MANGLER, regner havne med,
//            vælger det mål der hurtigst giver flest point, holder igen over for den førende spiller
//            og sætter røveren mod lederen.
//
// Normal strategi (ret gerne i tallene):
//  • Huse: altid det lovlige hjørne med størst samlet chance (sum af "prikker" på talbrikkerne).
//  • Veje: bygges mod det nærmeste gode byggested, hvor den kan få flest ressourcer.
//  • Byer: opgraderer det hus, der giver flest ressourcer.
//  • Mangler den præcis 1 kort til noget, spørger den de andre om at bytte 1:1.
//  • Mangler den højst 3 sejrspoint, køber den udviklingskort hver gang den kan.
//  • Ellers: bytter overskud i banken/havne, spiller ridderkort mod røveren, og vælger klogt
//    hvor røveren skal stå, og hvad den smider.

import { RES, COST, TERRAIN_RES } from './constants.js';
import { HEXES, VERTS, EDGES } from './geometry.js';
import { canAfford, countRes, piecesLeft, zeroRes } from './helpers.js';
import { vertexFree, validSettlementSpots, validRoadSpots, validShipSpots, validCitySpots, tradeRatios } from './placement.js';
import { totalVP, publicVP } from './scoring.js';

export const BOT_LEVELS = { easy: 'Let', normal: 'Normal', hard: 'Svær' };
export const BOT_NAMES = ['🤖 Bjarke', '🤖 Gunhild', '🤖 Torvald', '🤖 Ingrid'];
const OFFER_WAIT_MS = 15000;   // så længe venter botten på svar på et byttetilbud
const DEV_RUSH_VP = 3;         // køb udviklingskort, når der mangler højst så mange point

// ---------------------------------------------------------------- værdier
// "Prikker": hvor tit et tal slås (2 og 12 = 1, 6 og 8 = 5)
const pips = n => (n ? 6 - Math.abs(7 - n) : 0);

function hexPips(s, h) {
  const hx = s.hexes[h];
  if (!hx || !TERRAIN_RES[hx.terrain] || h === s.robber) return 0;
  return pips(hx.number);
}

// Samlet chance for at få ressourcer fra et hjørne. Lille bonus for forskellige råstoffer.
export function vertexScore(s, v) {
  let sum = 0; const kinds = new Set();
  VERTS[v].hexes.forEach(h => { const p = hexPips(s, h); if (p) { sum += p; kinds.add(s.hexes[h].terrain); } });
  return sum + kinds.size * 0.01; // bonus afgør kun ved lige stilling
}

const levelOf = (s, pi) => (typeof s.players[pi].bot === 'string' ? s.players[pi].bot : 'normal');

// ---------------------------------------------------------------- "Svær": hvad mangler botten?
// Hvor meget botten producerer af hvert råstof (sum af prikker, byer tæller dobbelt)
function production(s, pi) {
  const prod = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  Object.keys(s.buildings).forEach(v => {
    const b = s.buildings[v]; if (b.owner !== pi) return;
    VERTS[v].hexes.forEach(h => { const r = TERRAIN_RES[s.hexes[h].terrain]; if (r && r !== 'gold' && h !== s.robber) prod[r] += pips(s.hexes[h].number) * (b.type === 'city' ? 2 : 1); });
  });
  return prod;
}

// Hvor meget et råstof er værd for botten lige nu: knappe råstoffer er mere værd.
// Tidligt i spillet vægter træ og ler (veje og huse), senere korn og malm (byer og kort).
function resWeights(s, pi, prod) {
  const houses = Object.values(s.buildings).filter(b => b.owner === pi).length;
  const w = {};
  RES.forEach(r => {
    w[r] = 1 + 1.4 / (1 + prod[r] / 3);
    if (houses < 4 && (r === 'wood' || r === 'brick')) w[r] *= 1.2;
    if (houses >= 4 && (r === 'wheat' || r === 'ore')) w[r] *= 1.25;
  });
  return w;
}

// Havnen ved et hjørne (hvis der er en)
function portAt(s, v) {
  const pt = s.ports.find(pt => EDGES[pt.edge].a === v || EDGES[pt.edge].b === v);
  return pt ? pt.type : null;
}

// Svær: værdien af at bygge på hjørne v for netop denne bot
function hardVertexValue(s, pi, v, prod = production(s, pi)) {
  const w = resWeights(s, pi, prod);
  let val = 0; const gain = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  VERTS[v].hexes.forEach(h => {
    const t = s.hexes[h].terrain, r = TERRAIN_RES[t], p = hexPips(s, h);
    if (!p) return;
    if (r === 'gold') { val += p * 1.6; return; }
    if (r) { val += p * w[r]; gain[r] += p; }
  });
  RES.forEach(r => { if (gain[r] && !prod[r]) val += 2.5; }); // nyt råstof bot'en slet ikke har
  const port = portAt(s, v);
  if (port === 'any') val += 1.5 + 0.08 * Object.values(prod).reduce((a, b) => a + b, 0);
  else if (port) val += 0.5 + 0.45 * (prod[port] + gain[port]); // 2:1-havn er guld værd for det man producerer meget af
  return val;
}

// Den værdi en bot med det givne niveau sætter på et hjørne
function spotValue(s, pi, v) {
  const lvl = levelOf(s, pi);
  if (lvl === 'hard') return hardVertexValue(s, pi, v);
  if (lvl === 'easy') return vertexScore(s, v) * (0.4 + Math.random());
  return vertexScore(s, v);
}

// ---------------------------------------------------------------- vejsøgning
// Hjørner bottens net når: egne huse og enderne af egne veje/skibe
function networkVerts(s, pi) {
  const set = new Set();
  Object.keys(s.buildings).forEach(v => { if (s.buildings[v].owner === pi) set.add(+v); });
  [s.roads, s.ships || {}].forEach(m => Object.keys(m).forEach(e => { if (m[e] === pi) { set.add(EDGES[e].a); set.add(EDGES[e].b); } }));
  return set;
}

// Afstand (antal kanter) fra bottens net til alle hjørner – stopper ved andres bygninger
function distances(s, pi) {
  const dist = new Map(), queue = [];
  networkVerts(s, pi).forEach(v => { dist.set(v, 0); queue.push(v); });
  while (queue.length) {
    const v = queue.shift(), d = dist.get(v);
    if (d >= 8) continue;
    const b = s.buildings[v];
    if (d > 0 && b && b.owner !== pi) continue;
    VERTS[v].edges.forEach(e => {
      const owner = s.roads[e] ?? (s.ships ? s.ships[e] : undefined);
      if (owner !== undefined && owner !== pi) return;
      const u = EDGES[e].a === v ? EDGES[e].b : EDGES[e].a;
      if (!dist.has(u)) { dist.set(u, d + 1); queue.push(u); }
    });
  }
  return dist;
}

// Bedste sted at bygge hen imod: høj chance, men ikke for langt væk
function roadTarget(s, pi) {
  const dist = distances(s, pi);
  let best = null, bestVal = -Infinity;
  dist.forEach((d, v) => {
    if (d < 2 || !vertexFree(s, v)) return;
    const val = spotValue(s, pi, v) - (levelOf(s, pi) === 'hard' ? 2.4 : 1.6) * d;
    if (val > bestVal) { bestVal = val; best = v; }
  });
  return best;
}

// Den lovlige vej, hvis nye ende kommer tættest på målet
function bestRoad(s, pi, spots) {
  if (!spots.length) return null;
  const target = roadTarget(s, pi);
  if (target === null) return null;
  // afstand fra målet til alle hjørner (ignorerer ejerskab for enkelhedens skyld)
  const dt = new Map([[target, 0]]), q = [target];
  while (q.length) { const v = q.shift(); VERTS[v].adj.forEach(u => { if (!dt.has(u)) { dt.set(u, dt.get(v) + 1); q.push(u); } }); }
  let best = null, bestD = Infinity;
  spots.forEach(e => { const d = Math.min(dt.get(EDGES[e].a) ?? 99, dt.get(EDGES[e].b) ?? 99); if (d < bestD) { bestD = d; best = e; } });
  return best;
}

const bestBy = (list, f) => list.reduce((b, x) => (b === null || f(x) > f(b) ? x : b), null);

// ---------------------------------------------------------------- hvad vil botten bygge?
function goals(s, pi) {
  if (levelOf(s, pi) === 'hard') return hardGoals(s, pi);
  const p = s.players[pi], out = [];
  if (s.winVP - totalVP(s, pi) <= DEV_RUSH_VP && s.devDeck.length) return [{ type: 'dev', cost: COST.dev }];
  const cities = piecesLeft(s, pi, 'city') > 0 ? validCitySpots(s, pi) : [];
  if (cities.length) out.push({ type: 'city', cost: COST.city, v: bestBy(cities, v => spotValue(s, pi, v)) });
  const spots = piecesLeft(s, pi, 'settlement') > 0 ? validSettlementSpots(s, pi) : [];
  if (spots.length) out.push({ type: 'settlement', cost: COST.settlement, v: bestBy(spots, v => spotValue(s, pi, v)) });
  else if (piecesLeft(s, pi, 'road') > 0 && s.stormTurn !== s.turnNumber) {
    const e = bestRoad(s, pi, validRoadSpots(s, pi));
    if (e !== null) out.push({ type: 'road', cost: COST.road, e });
  }
  if (s.devDeck.length && (countRes(p.res) >= 7 || !out.length)) out.push({ type: 'dev', cost: COST.dev });
  return out;
}

// Svær: vælg mål efter "point pr. ventetid". Ventetiden regnes ud fra bottens produktion.
function hardGoals(s, pi) {
  const p = s.players[pi], prod = production(s, pi), n = s.players.length;
  const left = s.winVP - totalVP(s, pi);
  const eta = cost => RES.reduce((m, r) => {
    const miss = Math.max(0, (cost[r] || 0) - p.res[r]);
    return miss ? Math.max(m, miss / Math.max(0.15, (prod[r] * n) / 36)) : m;   // runder til det kommer
  }, 0);
  const cands = [];
  const cities = piecesLeft(s, pi, 'city') > 0 ? validCitySpots(s, pi) : [];
  if (cities.length) { const v = bestBy(cities, v => hardVertexValue(s, pi, v, prod)); cands.push({ type: 'city', cost: COST.city, v, gain: 1 + hardVertexValue(s, pi, v, prod) * 0.12 }); }
  const spots = piecesLeft(s, pi, 'settlement') > 0 ? validSettlementSpots(s, pi) : [];
  if (spots.length) { const v = bestBy(spots, v => hardVertexValue(s, pi, v, prod)); cands.push({ type: 'settlement', cost: COST.settlement, v, gain: 1 + hardVertexValue(s, pi, v, prod) * 0.14 }); }
  else if (piecesLeft(s, pi, 'road') > 0 && s.stormTurn !== s.turnNumber) {
    const e = bestRoad(s, pi, validRoadSpots(s, pi));
    if (e !== null) cands.push({ type: 'road', cost: COST.road, e, gain: 0.55 });
  }
  if (s.devDeck.length) {
    const armyRace = p.knights >= 1 && (!s.largestArmy || s.largestArmy !== pi);
    cands.push({ type: 'dev', cost: COST.dev, gain: (left <= 2 ? 0.9 : 0.5) + (armyRace ? 0.2 : 0) });
  }
  cands.forEach(c => { c.score = c.gain / (1 + 0.6 * eta(c.cost)); });
  return cands.sort((a, b) => b.score - a.score);
}

const missing = (p, cost) => RES.reduce((m, k) => m + Math.max(0, (cost[k] || 0) - p.res[k]), 0);
const buildAction = g => ({ city: { type: 'build-city', v: g.v }, settlement: { type: 'build-settlement', v: g.v }, road: { type: 'build-road', e: g.e }, dev: { type: 'buy-dev' } })[g.type];

// Et kort botten kan undvære til målet (det den har flest af ud over behovet)
function spare(p, cost) {
  return bestBy(RES.filter(k => p.res[k] > (cost[k] || 0)), k => p.res[k] - (cost[k] || 0));
}

// ---------------------------------------------------------------- hovedfunktion
export function botAction(s, pi, mem = {}, now = Date.now()) {
  const p = s.players[pi], isTurn = s.turn === pi;

  // Andres byttetilbud: sig ja, hvis det giver os noget vi mangler for noget vi kunne undvære
  if (s.trade && s.trade.from !== pi && s.phase === 'main' && !s.trade.accepted.includes(pi) && !s.trade.declined.includes(pi)) {
    const tr = s.trade, g = goals(s, pi)[0];
    const canPay = RES.every(k => p.res[k] >= tr.get[k]);
    const after = { res: { ...p.res } }; RES.forEach(k => { after.res[k] += tr.give[k] - tr.get[k]; });
    let helps = g && canPay && missing(after, g.cost) < missing(p, g.cost) && countRes(tr.give) >= countRes(tr.get);
    const lvl = levelOf(s, pi);
    if (lvl === 'hard' && s.winVP - publicVPof(s, tr.from) <= 2) helps = false;            // hjælp ikke den, der er ved at vinde
    if (lvl === 'hard' && helps && publicVPof(s, tr.from) > totalVP(s, pi) + 2 && countRes(tr.give) <= countRes(tr.get)) helps = false;
    if (lvl === 'easy') helps = canPay && Math.random() < 0.4;
    return { type: helps ? 'accept-trade' : 'decline-trade' };
  }

  switch (s.phase) {
    case 'setup': {
      if (!isTurn) return null;
      if (s.setup.need === 'settlement') return { type: 'build-settlement', v: bestBy(validSettlementSpots(s, pi), v => spotValue(s, pi, v)) };
      const roads = validRoadSpots(s, pi);
      if (roads.length) return { type: 'build-road', e: bestRoad(s, pi, roads) ?? roads[0] };
      return { type: 'build-ship', e: validShipSpots(s, pi)[0] };
    }

    case 'roll': {
      if (!isTurn) return null;
      const k = playableKnight(s, pi);
      if (k && robberOnMe(s, pi)) return { type: 'play-dev', card: 'knight' };
      return { type: 'roll' };
    }

    case 'discard': {
      const need = s.discard && s.discard[pi];
      if (!need) return null;
      const r = zeroRes(), left = { ...p.res };
      const keep = levelOf(s, pi) === 'hard' && goals(s, pi)[0] ? goals(s, pi)[0].cost : {};
      for (let i = 0; i < need; i++) { const k = bestBy(RES.filter(x => left[x] > 0), x => left[x] - 1.5 * (keep[x] || 0)); left[k]--; r[k]++; }
      return { type: 'discard', res: r };
    }

    case 'robber': {
      if (!isTurn) return null;
      const lands = HEXES.map((_, i) => i).filter(i => i !== s.robber && s.hexes[i].terrain !== 'sea');
      const hurt = h => {
        let v = 0;
        const lead = levelOf(s, pi) === 'hard' ? 0.8 : 0.3;
        HEXES[h].verts.forEach(x => { const b = s.buildings[x]; if (b) v += (b.owner === pi ? -10 : 1 + publicVPof(s, b.owner) * lead) * (b.type === 'city' ? 2 : 1); });
        return v * pips(s.hexes[h].number);
      };
      return { type: 'move-robber', hex: bestBy(lands, hurt) };
    }

    case 'steal':
      return isTurn ? { type: 'steal', target: bestBy(s.stealTargets, t => countRes(s.players[t].res) + (levelOf(s, pi) === 'hard' ? publicVPof(s, t) : 0)) } : null;

    case 'roadBuilding': {
      if (!isTurn) return null;
      const e = s.stormTurn === s.turnNumber ? null : bestRoad(s, pi, validRoadSpots(s, pi));
      return e !== null ? { type: 'build-road', e } : { type: 'skip-road' };
    }

    case 'main': {
      if (!isTurn) return null;

      // Vores eget tilbud: byt med den første der siger ja, ellers træk det tilbage
      if (s.trade && s.trade.from === pi) {
        const tr = s.trade;
        if (tr.accepted.length) return { type: 'confirm-trade', with: tr.accepted[0] };
        const others = s.players.length - 1;
        if (tr.declined.length >= others || now - (mem.offerAt || 0) > OFFER_WAIT_MS) return { type: 'cancel-trade' };
        return null; // vent på svar
      }

      const dev = playDevCard(s, pi);
      if (dev) return dev;

      const list = goals(s, pi);
      for (const g of list) if (canAfford(p, g.cost)) return buildAction(g);

      // Mangler præcis 1 kort: spørg de andre om 1:1 (én gang pr. mål pr. tur)
      const g = list[0];
      if (g && levelOf(s, pi) !== 'easy' && missing(p, g.cost) === 1 && mem.asked !== `${s.turnNumber}:${g.type}`) {
        const want = RES.find(k => p.res[k] < (g.cost[k] || 0)), give = spare(p, g.cost);
        if (give) {
          mem.asked = `${s.turnNumber}:${g.type}`; mem.offerAt = now;
          return { type: 'offer-trade', give: { ...zeroRes(), [give]: 1 }, get: { ...zeroRes(), [want]: 1 } };
        }
      }
      // Bank eller havn: byt overskud til det der mangler (prøv målene i rækkefølge)
      const ratios = tradeRatios(s, pi);
      for (const goal of list) {
        const want = RES.find(k => p.res[k] < (goal.cost[k] || 0) && s.bank[k] > 0);
        const surplus = k => p.res[k] - (goal.cost[k] || 0) - ratios[k];
        const give = want && bestBy(RES.filter(k => k !== want && surplus(k) >= 0), k => surplus(k) - ratios[k]);
        if (want && give) return { type: 'bank-trade', give, get: want };
      }
      return { type: 'end-turn' };
    }
  }
  return null;
}

// Spil et udviklingskort, hvis det giver mening (kun ét pr. tur, og ikke et der er købt i denne tur)
function playDevCard(s, pi) {
  if (s.devPlayed) return null;
  const p = s.players[pi], has = t => p.dev.some(d => d.type === t && d.bought < s.turnNumber);
  if (has('knight')) return { type: 'play-dev', card: 'knight' };            // tæller mod Største hær
  const g = goals(s, pi)[0];
  if (has('yearOfPlenty') && g) {
    const need = []; RES.forEach(k => { for (let i = p.res[k]; i < (g.cost[k] || 0); i++) need.push(k); });
    const ok = need.filter(k => s.bank[k] >= 2 || (s.bank[k] >= 1 && need.filter(x => x === k).length === 1));
    if (ok.length) {
      const r1 = ok[0], r2 = ok.find((k, i) => i > 0 && (k !== r1 || s.bank[k] >= 2)) || (s.bank[r1] >= 2 ? r1 : RES.find(k => k !== r1 && s.bank[k] > 0));
      if (r2) return { type: 'play-dev', card: 'yearOfPlenty', res1: r1, res2: r2 };
    }
  }
  if (has('roadBuilding') && g && g.type === 'road' && piecesLeft(s, pi, 'road') >= 2) return { type: 'play-dev', card: 'roadBuilding' };
  if (has('monopoly')) {
    const k = bestBy(RES, r => s.players.reduce((n, o, i) => n + (i === pi ? 0 : o.res[r]), 0));
    if (s.players.reduce((n, o, i) => n + (i === pi ? 0 : o.res[k]), 0) >= 3) return { type: 'play-dev', card: 'monopoly', res: k };
  }
  return null;
}

function playableKnight(s, pi) {
  return s.players[pi].dev.find(d => d.type === 'knight' && d.bought < s.turnNumber) && !s.devPlayed;
}
function robberOnMe(s, pi) {
  return HEXES[s.robber].verts.some(v => s.buildings[v] && s.buildings[v].owner === pi);
}

// Point man kan se (botten kender ikke de andres skjulte sejrspointkort)
const publicVPof = (s, pi) => publicVP(s, pi);
