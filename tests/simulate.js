// Simulerer tilfældige spil (alle kombinationer af udvidelser) og tjekker invarianter.
import G from '../js/game/index.js';
import assert from 'node:assert';
const pick = a => a[Math.floor(Math.random() * a.length)];
const RES = G.RES;

assert.strictEqual(G.HEXES.length, 37);

function checkInvariants(s) {
  RES.forEach(r => {
    const tot = s.bank[r] + s.players.reduce((a, p) => a + p.res[r], 0);
    assert.strictEqual(tot, 19, 'resource total ' + r);
    assert(s.bank[r] >= 0);
    s.players.forEach(p => assert(p.res[r] >= 0, 'negative res'));
  });
  s.players.forEach((p, i) => ['road', 'settlement', 'city', 'ship', 'knight'].forEach(t => assert(G.piecesLeft(s, i, t) >= 0, t)));
  Object.keys(s.buildings).forEach(v => {
    G.VERTS[v].adj.forEach(u => assert(!s.buildings[u], 'distance rule'));
    assert(G.VERTS[v].hexes.some(h => s.hexes[h].terrain !== 'sea'), 'building on land');
    assert(!s.guards[v], 'guard and building on same vertex');
  });
  Object.keys(s.roads).forEach(e => { assert(G.EDGES[e].hexes.some(h => s.hexes[h].terrain !== 'sea'), 'road on land'); assert(s.ships[e] === undefined, 'road+ship'); });
  Object.keys(s.ships).forEach(e => assert(G.EDGES[e].hexes.length < 2 || G.EDGES[e].hexes.some(h => s.hexes[h].terrain === 'sea'), 'ship on sea'));
  assert(s.hexes[s.robber].terrain !== 'sea', 'robber on land');
  if (s.barb) assert(s.barb.pos >= 0 && s.barb.pos < G.BARB_TRACK);
}

const stats = { errors: 0, finished: 0, games: 0, ships: 0, knights: 0, attacks: 0, events: 0, islandVP: 0, gold: 0 };
function run(nPlayers, ex) {
  let s = G.newGame([...Array(nPlayers)].map((_, i) => ({ name: 'P' + i, id: 'c' + i })), { expansions: ex });
  if (ex.seafarers) assert.strictEqual(s.hexes.filter(h => h.terrain !== 'sea').length, 18);
  else assert.strictEqual(s.hexes.filter(h => h.terrain !== 'sea').length, 19);
  assert.strictEqual(s.ports.length, 9);
  stats.games++;
  const doAct = (pi, a, mustWork = true) => {
    const r = G.act(s, pi, a);
    if (r.error && mustWork) { stats.errors++; if (stats.errors < 15) console.log('ERR', JSON.stringify(ex), s.phase, JSON.stringify(a), r.error); }
    if (!r.error) {
      if (a.type === 'build-ship') stats.ships++;
      if (a.type === 'build-knight') stats.knights++;
      s = r.state;
    }
    checkInvariants(s);
    return !r.error;
  };
  for (let i = 0; i < 6000 && s.phase !== 'gameover'; i++) {
    const pi = G.actors(s)[0];
    const p = s.players[pi];
    const storm = s.stormTurn === s.turnNumber;
    switch (s.phase) {
      case 'setup':
        if (s.setup.need === 'settlement') doAct(pi, { type: 'build-settlement', v: pick(G.validSettlementSpots(s, pi)) });
        else { const rs = G.validRoadSpots(s, pi), ss = G.validShipSpots(s, pi); if (ss.length && (Math.random() < 0.3 || !rs.length)) doAct(pi, { type: 'build-ship', e: pick(ss) }); else doAct(pi, { type: 'build-road', e: pick(rs) }); }
        break;
      case 'discard': doAct(pi, G.autoAction(s, pi)); break;
      case 'robber': doAct(pi, G.autoAction(s, pi)); break;
      case 'steal': doAct(pi, { type: 'steal', target: pick(s.stealTargets) }); break;
      case 'roadBuilding': {
        const rs = G.piecesLeft(s, pi, 'road') > 0 ? G.validRoadSpots(s, pi) : [], ss = G.piecesLeft(s, pi, 'ship') > 0 ? G.validShipSpots(s, pi) : [];
        if (ss.length && Math.random() < 0.4) doAct(pi, { type: 'build-ship', e: pick(ss) });
        else if (rs.length && Math.random() < 0.9) doAct(pi, { type: 'build-road', e: pick(rs) });
        else doAct(pi, { type: 'skip-road' });
        break;
      }
      case 'roll': {
        const k = p.dev.find(d => d.type === 'knight' && d.bought < s.turnNumber);
        if (k && !s.devPlayed && Math.random() < 0.4) doAct(pi, { type: 'play-dev', card: 'knight' });
        else { const n0 = s.log.length; doAct(pi, { type: 'roll' }); if (s.lastEvent && s.lastEvent.seq === s.seq) stats.events++; }
        break;
      }
      case 'main': {
        const can = t => G.canAfford(p, G.COST[t]) && G.piecesLeft(s, pi, t) > 0;
        if (can('city') && G.validCitySpots(s, pi).length) { doAct(pi, { type: 'build-city', v: pick(G.validCitySpots(s, pi)) }); break; }
        const ss = G.validSettlementSpots(s, pi);
        if (can('settlement') && ss.length) { doAct(pi, { type: 'build-settlement', v: pick(ss) }); break; }
        if (ex.barbarians && G.canAfford(p, G.COST.activate) && G.validActivateSpots(s, pi).length && Math.random() < 0.7) { doAct(pi, { type: 'activate-knight', v: pick(G.validActivateSpots(s, pi)) }); break; }
        if (ex.barbarians && can('knight') && G.validKnightSpots(s, pi).length && Math.random() < 0.5) { doAct(pi, { type: 'build-knight', v: pick(G.validKnightSpots(s, pi)) }); break; }
        const shs = G.validShipSpots(s, pi);
        if (ex.seafarers && !storm && can('ship') && shs.length && Math.random() < 0.6) { doAct(pi, { type: 'build-ship', e: pick(shs) }); break; }
        const rs = G.validRoadSpots(s, pi);
        if (!storm && can('road') && rs.length && Math.random() < 0.6) { doAct(pi, { type: 'build-road', e: pick(rs) }); break; }
        if (storm && can('road') && rs.length && Math.random() < 0.1) { assert(G.act(s, pi, { type: 'build-road', e: rs[0] }).error, 'storm must block'); }
        if (G.canAfford(p, G.COST.dev) && s.devDeck.length && Math.random() < 0.5) { doAct(pi, { type: 'buy-dev' }); break; }
        const playable = p.dev.filter(d => d.type !== 'vp' && d.bought < s.turnNumber);
        if (playable.length && !s.devPlayed && Math.random() < 0.5) {
          const c = pick(playable).type;
          doAct(pi, { type: 'play-dev', card: c, res: pick(RES), res1: pick(RES), res2: pick(RES) }, c !== 'roadBuilding' && c !== 'yearOfPlenty');
          break;
        }
        const ratios = G.tradeRatios(s, pi);
        const tradeable = RES.filter(k => p.res[k] >= ratios[k] + 1);
        if (tradeable.length && Math.random() < 0.5) {
          const give = pick(tradeable); const get = pick(RES.filter(k => k !== give && s.bank[k] > 0));
          if (get) { doAct(pi, { type: 'bank-trade', give, get }); break; }
        }
        doAct(pi, { type: 'end-turn' });
        break;
      }
    }
  }
  if (s.phase === 'gameover') { stats.finished++; assert(G.totalVP(s, s.winner) >= s.winVP); }
  if (s.barb) stats.attacks += s.barb.attacks || 0;
  stats.islandVP += s.players.reduce((a, p) => a + p.islandVP, 0);
}
const combos = [];
for (let m = 0; m < 8; m++) combos.push({ events: !!(m & 1), barbarians: !!(m & 2), seafarers: !!(m & 4) });
for (let g = 0; g < 320; g++) run(2 + (g % 3), combos[g % 8]);
console.log(stats);

// Tidsgrænse: automatiske handlinger skal altid være lovlige
combos.forEach(ex => {
  let s = G.newGame([{ name: 'A', id: 'a' }, { name: 'B', id: 'b' }, { name: 'C', id: 'c' }], { timeLimit: 30, expansions: ex });
  let bad = 0, n = 0;
  while (s.phase !== 'gameover' && n < 3000 && s.turnNumber <= 40) {
    if (n % 7 === 0) s.players.forEach(p => RES.forEach(k => { if (s.bank[k] > 0) { s.bank[k]--; p.res[k]++; } }));
    for (const pi of G.actors(s)) { const a = G.autoAction(s, pi); if (!a) { bad++; continue; } const r = G.act(s, pi, a); if (r.error) { bad++; console.log('auto ERR', s.phase, r.error); } else s = r.state; }
    n++;
  }
  if (bad) { console.log('auto bad', JSON.stringify(ex), bad); process.exit(1); }
});
console.log('auto-actions ok');
if (stats.errors || stats.finished < stats.games * 0.9) process.exit(1);
