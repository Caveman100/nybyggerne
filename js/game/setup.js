// Nybyggerne – spillogik. Opsætning af et nyt spil: bræt, tal, havne, begivenhedskort og spillere.

import { COLORS, EVENTS, EXP_DA } from './constants.js';
import { EDGES, HEXES, HEX_ADJ, HEX_AT, VERTS } from './geometry.js';
import { exp, guards, log, shuffle, zeroRes } from './helpers.js';
export function numbersFor(n) {
  const base = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const extra = [3, 4, 5, 6, 8, 9, 10, 11];
  if (n === 17) { const o = base.slice(); o.splice(o.lastIndexOf(11), 1); return o; }
  const out = base.slice(0, Math.min(n, base.length));
  let k = 0;
  while (out.length < n) out.push(extra[k++ % extra.length]);
  return out;
}
export function placeNumbers(hexes) {
  const prod = hexes.map((h, i) => i).filter(i => !['desert', 'sea'].includes(hexes[i].terrain));
  for (let tries = 0; tries < 3000; tries++) {
    const ns = shuffle(numbersFor(prod.length));
    prod.forEach((h, k) => (hexes[h].number = ns[k]));
    const hot = n => n === 6 || n === 8;
    if (!HEX_ADJ.some(([a, b]) => hot(hexes[a].number) && hot(hexes[b].number))) break;
  }
}
export function makeBoard(seafarers) {
  const hexes = HEXES.map(() => ({ terrain: 'sea', number: null, island: -1 }));
  const at = (q, r) => HEX_AT.get(q + ',' + r);
  if (!seafarers) {
    const land = HEXES.map((h, i) => i).filter(i => HEXES[i].d <= 2);
    const terr = shuffle([...Array(4).fill('forest'), ...Array(4).fill('pasture'), ...Array(4).fill('fields'), ...Array(3).fill('hills'), ...Array(3).fill('mountains'), 'desert']);
    land.forEach((i, k) => { hexes[i] = { terrain: terr[k], number: null, island: 0 }; });
  } else {
    // Hovedø mod vest + tre små øer mod øst, adskilt af et stræde
    const main = HEXES.map((h, i) => i).filter(i => HEXES[i].d <= 1 || (HEXES[i].d === 2 && HEXES[i].q <= -1));
    const terr = shuffle(['forest', 'forest', 'hills', 'hills', 'pasture', 'pasture', 'pasture', 'fields', 'fields', 'mountains', 'mountains', 'desert']);
    main.forEach((i, k) => { hexes[i] = { terrain: terr[k], number: null, island: 0 }; });
    const islands = [[[1, -3], [2, -3]], [[3, -2], [3, -1]], [[2, 1], [1, 2]]];
    const iterr = shuffle(['gold', 'gold', 'forest', 'hills', 'fields', 'mountains']);
    let k = 0;
    islands.forEach((cells, n) => cells.forEach(([q, r]) => { hexes[at(q, r)] = { terrain: iterr[k++], number: null, island: n + 1 }; }));
  }
  placeNumbers(hexes);
  return hexes;
}
export function makePorts(hexes) {
  const landOf = e => EDGES[e].hexes.filter(h => hexes[h].terrain !== 'sea');
  const seaOf = e => EDGES[e].hexes.filter(h => hexes[h].terrain === 'sea');
  const coast = EDGES.map((e, i) => i).filter(i => landOf(i).length === 1 && seaOf(i).length === 1);
  const ang = i => { const E = EDGES[i]; return Math.atan2((VERTS[E.a].y + VERTS[E.b].y) / 2, (VERTS[E.a].x + VERTS[E.b].x) / 2); };
  const mainCoast = coast.filter(i => hexes[landOf(i)[0]].island === 0).sort((a, b) => ang(a) - ang(b));
  const chosen = [], usedV = new Set(), usedSea = new Set();
  const tryAdd = e => {
    const E = EDGES[e], sea = seaOf(e)[0];
    if (usedV.has(E.a) || usedV.has(E.b) || usedSea.has(sea)) return false;
    if ([E.a, E.b].some(v => VERTS[v].adj.some(u => usedV.has(u)))) return false;
    chosen.push(e); usedV.add(E.a); usedV.add(E.b); usedSea.add(sea); return true;
  };
  const isBase = hexes.filter(h => h.terrain !== 'sea').length === 19;
  if (isBase) [0, 3, 7, 10, 13, 17, 20, 23, 27].forEach(i => tryAdd(mainCoast[i]));
  else {
    const step = mainCoast.length / 6;
    for (let k = 0; k < 6; k++) tryAdd(mainCoast[Math.floor(k * step)]);
    shuffle(coast.filter(i => hexes[landOf(i)[0]].island > 0)).some(e => { tryAdd(e); return chosen.length >= 9; });
    shuffle(mainCoast.slice()).some(e => { if (chosen.length >= 9) return true; tryAdd(e); return false; });
  }
  const types = shuffle(['any', 'any', 'any', 'any', 'wood', 'brick', 'sheep', 'wheat', 'ore']);
  return chosen.slice(0, 9).map((e, i) => ({ edge: e, type: types[i] }));
}
export function makeEventDeck() {
  const deck = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) deck.push({ d: [a, b], ev: null });
  shuffle(deck);
  const evs = shuffle(Object.keys(EVENTS));
  let k = 0;
  deck.forEach(c => { if (k < evs.length && c.d[0] + c.d[1] !== 7) c.ev = evs[k++]; });
  return shuffle(deck);
}

// ---------- Nyt spil ----------
export function newGame(players, opts) {
  opts = opts || {};
  const ex = opts.expansions || {};
  const expansions = { events: !!ex.events, barbarians: !!ex.barbarians, seafarers: !!ex.seafarers };
  const hexes = makeBoard(expansions.seafarers);
  const n = players.length;
  const start = Math.floor(Math.random() * n);
  const seq = [...Array(n).keys()].map(i => (i + start) % n);
  const s = {
    version: 2,
    exp: expansions,
    winVP: 10 + (expansions.seafarers ? 2 : 0) + (expansions.barbarians ? 1 : 0),
    hexes,
    ports: makePorts(hexes),
    robber: hexes.findIndex(h => h.terrain === 'desert'),
    buildings: {},
    roads: {},
    ships: {},
    guards: {},
    players: players.map((p, i) => ({ name: p.name, id: p.id, bot: p.bot || false, color: COLORS[i], res: zeroRes(), dev: [], knights: 0, defenderVP: 0, islandVP: 0, islands: [] })),
    bank: { wood: 19, brick: 19, sheep: 19, wheat: 19, ore: 19 },
    devDeck: shuffle([...Array(14).fill('knight'), ...Array(5).fill('vp'), 'roadBuilding', 'roadBuilding', 'yearOfPlenty', 'yearOfPlenty', 'monopoly', 'monopoly']),
    eventDeck: expansions.events ? makeEventDeck() : null,
    lastEvent: null,
    barb: expansions.barbarians ? { pos: 0 } : null,
    turn: seq[0],
    turnNumber: 0,
    phase: 'setup',
    setup: { order: seq.concat(seq.slice().reverse()), step: 0, need: 'settlement', lastVertex: null },
    dice: null,
    devPlayed: false,
    discard: null,
    returnPhase: null,
    freeRoads: 0,
    stealTargets: null,
    trade: null,
    longestRoad: null,
    largestArmy: null,
    roadLengths: players.map(() => 0),
    log: [],
    winner: null,
    seq: 0,
    rollCount: 0,
    timeLimit: Math.max(0, Math.floor(Number(opts.timeLimit) || 0)),
    turnStart: null,
  };
  const on = Object.keys(EXP_DA).filter(k => expansions[k]).map(k => EXP_DA[k]);
  if (on.length) log(s, `Udvidelser: ${on.join(', ')}. Først til ${s.winVP} point vinder.`);
  log(s, `Spillet starter! [[${seq[0]}]] begynder. Placér en bosættelse og en vej.`);
  return s;
}
