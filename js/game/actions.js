// Nybyggerne – spillogik. Spillernes handlinger: opsætningsfasen, turens handlinger og udviklingskort.
// Hver handling er et objekt som { type: 'build', what: 'road', edge: 12 }.

import { BARB_TRACK, COST, DEV_DA, RES, RES_DA, TERRAIN_RES } from './constants.js';
import { applyEvent, barbarianAttack, checkIsland, produce, steal } from './events.js';
import { HEXES, VERTS } from './geometry.js';
import { canAfford, cleanRes, countRes, exp, fmtRes, give, guards, isLand, isRes, log, pay, piecesLeft, zeroRes } from './helpers.js';
import { canPlaceKnight, canPlaceRoad, canPlaceSettlement, canPlaceShip, tradeRatios, validRoadSpots, validShipSpots } from './placement.js';
import { updateLargestArmy, updateLongestRoad } from './scoring.js';
import { makeEventDeck } from './setup.js';
export function apply(s, pi, a) {
  if (s.phase === 'gameover') return 'Spillet er slut.';
  if (!s.players[pi]) return 'Ukendt spiller.';
  const p = s.players[pi];
  const isTurn = pi === s.turn;
  const t = a.type;

  switch (s.phase) {
    case 'setup': {
      if (!isTurn) return 'Det er ikke din tur.';
      const st = s.setup;
      if (t === 'build-settlement' && st.need === 'settlement') {
        const v = a.v;
        if (!canPlaceSettlement(s, pi, v, true)) return exp(s, 'seafarers') ? 'Startbosættelser skal ligge på hovedøen og mindst én vej fra andre.' : 'Du kan ikke bygge der (der skal være mindst én vej imellem bosættelser).';
        s.buildings[v] = { owner: pi, type: 'settlement' };
        st.lastVertex = v; st.need = 'road';
        log(s, `[[${pi}]] byggede en bosættelse.`);
        if (st.step >= s.players.length) {
          const got = zeroRes();
          VERTS[v].hexes.forEach(h => { const r = TERRAIN_RES[s.hexes[h].terrain]; if (r && r !== 'gold' && s.bank[r] > 0) { got[r] += give(s, pi, r); } });
          log(s, `[[${pi}]] fik ${fmtRes(got)} fra sin anden bosættelse.`);
        }
        return null;
      }
      if ((t === 'build-road' || t === 'build-ship') && st.need === 'road') {
        const ok = t === 'build-road' ? canPlaceRoad(s, pi, a.e, st.lastVertex) : canPlaceShip(s, pi, a.e, st.lastVertex);
        if (!ok) return 'Vejen (eller skibet) skal ligge op ad din nye bosættelse.';
        (t === 'build-road' ? s.roads : s.ships)[a.e] = pi;
        st.step++;
        updateLongestRoad(s);
        if (st.step >= st.order.length) {
          s.phase = 'roll'; s.turn = st.order[0]; s.turnNumber = 1;
          log(s, `Opstarten er færdig. [[${s.turn}]] starter – slå terningerne!`);
        } else { s.turn = st.order[st.step]; st.need = 'settlement'; st.lastVertex = null; }
        return null;
      }
      return st.need === 'settlement' ? 'Placér en bosættelse.' : 'Placér en vej ved din nye bosættelse.';
    }

    case 'discard': {
      if (t !== 'discard') return 'Der skal først smides kort.';
      const need = s.discard[pi];
      if (!need) return 'Du skal ikke smide kort.';
      const r = cleanRes(a.res);
      if (countRes(r) !== need) return `Du skal smide præcis ${need} kort.`;
      if (!RES.every(k => p.res[k] >= r[k])) return 'Du har ikke de kort.';
      RES.forEach(k => { p.res[k] -= r[k]; s.bank[k] += r[k]; });
      delete s.discard[pi];
      log(s, `[[${pi}]] smed ${need} kort.`);
      if (!Object.keys(s.discard).length) { s.discard = null; s.phase = 'robber'; s.returnPhase = 'main'; }
      return null;
    }

    case 'robber': {
      if (!isTurn) return 'Det er ikke din tur.';
      if (t !== 'move-robber') return 'Flyt røveren først.';
      const h = a.hex;
      if (!(Number.isInteger(h) && h >= 0 && h < HEXES.length) || h === s.robber || !isLand(s, h)) return 'Vælg et andet landfelt.';
      s.robber = h;
      log(s, `[[${pi}]] flyttede røveren.`);
      const owners = new Set();
      HEXES[h].verts.forEach(v => { const b = s.buildings[v]; if (b && b.owner !== pi) owners.add(b.owner); });
      const targets = [...owners].filter(o => countRes(s.players[o].res) > 0);
      if (targets.length === 1) steal(s, pi, targets[0]);
      if (targets.length > 1) { s.phase = 'steal'; s.stealTargets = targets; }
      else { s.phase = s.returnPhase || 'main'; s.returnPhase = null; }
      return null;
    }

    case 'steal': {
      if (!isTurn) return 'Det er ikke din tur.';
      if (t !== 'steal' || !s.stealTargets.includes(a.target)) return 'Vælg hvem du vil stjæle fra.';
      steal(s, pi, a.target);
      s.stealTargets = null;
      s.phase = s.returnPhase || 'main'; s.returnPhase = null;
      return null;
    }

    case 'roadBuilding': {
      if (!isTurn) return 'Det er ikke din tur.';
      const finish = () => { s.freeRoads = 0; s.phase = s.returnPhase || 'main'; s.returnPhase = null; };
      const anySpot = () => (piecesLeft(s, pi, 'road') > 0 && validRoadSpots(s, pi).length) || (piecesLeft(s, pi, 'ship') > 0 && validShipSpots(s, pi).length);
      if (t === 'skip-road') { finish(); return null; }
      if (t !== 'build-road' && t !== 'build-ship') return 'Placér dine gratis veje (eller spring over).';
      const kind = t === 'build-road' ? 'road' : 'ship';
      if (piecesLeft(s, pi, kind) <= 0) return kind === 'road' ? 'Du har ikke flere veje.' : 'Du har ikke flere skibe.';
      if (!(kind === 'road' ? canPlaceRoad(s, pi, a.e, null) : canPlaceShip(s, pi, a.e, null))) return 'Du kan ikke bygge der.';
      (kind === 'road' ? s.roads : s.ships)[a.e] = pi; s.freeRoads--;
      log(s, `[[${pi}]] byggede ${kind === 'road' ? 'en gratis vej' : 'et gratis skib'}.`);
      updateLongestRoad(s);
      if (s.freeRoads <= 0 || !anySpot()) finish();
      return null;
    }

    case 'roll':
    case 'main':
      return applyTurn(s, pi, a);
  }
  return 'Ukendt fase.';
}

export function applyTurn(s, pi, a) {
  const t = a.type, p = s.players[pi], isTurn = pi === s.turn;

  if (t === 'accept-trade' || t === 'decline-trade') {
    const tr = s.trade;
    if (!tr) return 'Der er intet tilbud.';
    if (pi === tr.from) return 'Det er dit eget tilbud.';
    if (t === 'accept-trade') {
      if (!RES.every(k => p.res[k] >= tr.get[k])) return 'Du har ikke de kort, der bedes om.';
      if (!tr.accepted.includes(pi)) tr.accepted.push(pi);
      tr.declined = tr.declined.filter(x => x !== pi);
    } else {
      if (!tr.declined.includes(pi)) tr.declined.push(pi);
      tr.accepted = tr.accepted.filter(x => x !== pi);
    }
    return null;
  }
  if (!isTurn) return 'Det er ikke din tur.';
  if (t === 'play-dev') return playDev(s, pi, a);

  if (s.phase === 'roll') {
    if (t !== 'roll') return 'Slå terningerne først.';
    let d1, d2, ev = null;
    if (exp(s, 'events')) {
      if (!s.eventDeck || s.eventDeck.length <= 5) { s.eventDeck = makeEventDeck(); log(s, '🃏 Begivenhedskortene blandes.'); }
      const c = s.eventDeck.pop();
      [d1, d2] = c.d; ev = c.ev;
    } else { d1 = 1 + Math.floor(Math.random() * 6); d2 = 1 + Math.floor(Math.random() * 6); }
    const total = d1 + d2;
    s.dice = [d1, d2];
    s.rollCount = (s.rollCount || 0) + 1;
    log(s, `🎲 [[${pi}]] slog ${total}.`);
    if (ev) applyEvent(s, ev);
    if (exp(s, 'barbarians')) {
      if (Math.random() < 0.5) {
        s.barb.pos++;
        if (s.barb.pos >= BARB_TRACK) barbarianAttack(s);
        else log(s, `⛵ Barbarskibet nærmer sig (${s.barb.pos}/${BARB_TRACK}).`);
      }
    }
    if (total === 7) {
      const pend = {};
      s.players.forEach((pl, i) => { const c = countRes(pl.res); if (c > 7) pend[i] = Math.floor(c / 2); });
      if (Object.keys(pend).length) { s.discard = pend; s.phase = 'discard'; log(s, 'Spillere med mere end 7 kort skal smide halvdelen.'); }
      else { s.phase = 'robber'; s.returnPhase = 'main'; }
    } else {
      produce(s, total);
      s.phase = 'main';
    }
    return null;
  }

  // Fase: main
  const storm = s.stormTurn === s.turnNumber;
  switch (t) {
    case 'build-road':
    case 'build-ship': {
      const kind = t === 'build-road' ? 'road' : 'ship';
      if (kind === 'ship' && !exp(s, 'seafarers')) return 'Skibe kræver udvidelsen Søfarere.';
      if (storm) return 'Stormen raser – ingen kan bygge veje eller skibe i denne tur.';
      if (!canAfford(p, COST[kind])) return kind === 'road' ? 'Du har ikke råd (Træ + Ler).' : 'Du har ikke råd (Træ + Uld).';
      if (piecesLeft(s, pi, kind) <= 0) return kind === 'road' ? 'Du har ikke flere veje.' : 'Du har ikke flere skibe.';
      if (!(kind === 'road' ? canPlaceRoad(s, pi, a.e, null) : canPlaceShip(s, pi, a.e, null)))
        return kind === 'road' ? 'Vejen skal hænge sammen med dine egne veje eller bygninger.' : 'Skibet skal ligge på vandet og hænge sammen med dine skibe eller bygninger.';
      pay(s, pi, COST[kind]); (kind === 'road' ? s.roads : s.ships)[a.e] = pi;
      log(s, `[[${pi}]] byggede ${kind === 'road' ? 'en vej' : 'et skib'}.`);
      updateLongestRoad(s);
      return null;
    }
    case 'build-settlement': {
      if (!canAfford(p, COST.settlement)) return 'Du har ikke råd (Træ + Ler + Uld + Korn).';
      if (piecesLeft(s, pi, 'settlement') <= 0) return 'Du har ikke flere bosættelser.';
      if (!canPlaceSettlement(s, pi, a.v, false)) return 'Du kan ikke bygge der.';
      pay(s, pi, COST.settlement); s.buildings[a.v] = { owner: pi, type: 'settlement' };
      log(s, `[[${pi}]] byggede en bosættelse.`);
      checkIsland(s, pi, a.v);
      updateLongestRoad(s);
      return null;
    }
    case 'build-city': {
      if (!canAfford(p, COST.city)) return 'Du har ikke råd (2 Korn + 3 Malm).';
      if (piecesLeft(s, pi, 'city') <= 0) return 'Du har ikke flere byer.';
      const b = s.buildings[a.v];
      if (!b || b.owner !== pi || b.type !== 'settlement') return 'En by skal bygges på en af dine bosættelser.';
      pay(s, pi, COST.city); b.type = 'city';
      log(s, `[[${pi}]] opgraderede til en by.`);
      return null;
    }
    case 'build-knight': {
      if (!exp(s, 'barbarians')) return 'Riddere kræver udvidelsen Riddere og barbarer.';
      if (!canAfford(p, COST.knight)) return 'Du har ikke råd (Uld + Malm).';
      if (piecesLeft(s, pi, 'knight') <= 0) return 'Du har ikke flere riddere.';
      if (!canPlaceKnight(s, pi, a.v)) return 'En ridder skal stå på et frit hjørne ved dine veje eller skibe.';
      pay(s, pi, COST.knight); s.guards[a.v] = { owner: pi, active: true };
      log(s, `🛡️ [[${pi}]] udnævnte en ridder.`);
      return null;
    }
    case 'activate-knight': {
      const g = guards(s)[a.v];
      if (!g || g.owner !== pi || g.active) return 'Vælg en af dine hvilende riddere.';
      if (!canAfford(p, COST.activate)) return 'Du har ikke råd (1 Korn).';
      pay(s, pi, COST.activate); g.active = true;
      log(s, `🛡️ [[${pi}]] gjorde en ridder klar til kamp.`);
      return null;
    }
    case 'buy-dev': {
      if (!canAfford(p, COST.dev)) return 'Du har ikke råd (Uld + Korn + Malm).';
      if (!s.devDeck.length) return 'Der er ikke flere udviklingskort.';
      pay(s, pi, COST.dev);
      p.dev.push({ type: s.devDeck.pop(), bought: s.turnNumber });
      log(s, `[[${pi}]] købte et udviklingskort.`);
      return null;
    }
    case 'bank-trade': {
      const { give: g, get } = a;
      if (!isRes(g) || !isRes(get) || g === get) return 'Vælg to forskellige råstoffer.';
      const ratio = tradeRatios(s, pi)[g];
      if (p.res[g] < ratio) return `Du skal have ${ratio} ${RES_DA[g]}.`;
      if (s.bank[get] < 1) return `Banken har ikke mere ${RES_DA[get]}.`;
      p.res[g] -= ratio; s.bank[g] += ratio; p.res[get]++; s.bank[get]--;
      log(s, `[[${pi}]] byttede ${ratio} ${RES_DA[g]} med banken for 1 ${RES_DA[get]}.`);
      return null;
    }
    case 'offer-trade': {
      const g = cleanRes(a.give), get = cleanRes(a.get);
      if (!countRes(g) || !countRes(get)) return 'Et tilbud skal både give og få noget.';
      if (!RES.every(k => p.res[k] >= g[k])) return 'Du har ikke de kort, du tilbyder.';
      s.trade = { from: pi, give: g, get, accepted: [], declined: [], id: s.seq + 1 };
      log(s, `🤝 [[${pi}]] tilbyder ${fmtRes(g)} for ${fmtRes(get)}.`);
      return null;
    }
    case 'confirm-trade': {
      const tr = s.trade;
      if (!tr) return 'Der er intet tilbud.';
      const w = a.with;
      if (!tr.accepted.includes(w)) return 'Den spiller har ikke accepteret.';
      const o = s.players[w];
      if (!RES.every(k => p.res[k] >= tr.give[k])) return 'Du har ikke længere de kort, du tilbød.';
      if (!RES.every(k => o.res[k] >= tr.get[k])) return 'Den anden spiller har ikke længere kortene.';
      RES.forEach(k => { p.res[k] += tr.get[k] - tr.give[k]; o.res[k] += tr.give[k] - tr.get[k]; });
      log(s, `🤝 [[${pi}]] og [[${w}]] byttede.`);
      s.trade = null;
      return null;
    }
    case 'cancel-trade':
      s.trade = null;
      return null;
    case 'end-turn': {
      s.trade = null;
      s.turn = (s.turn + 1) % s.players.length;
      s.turnNumber++;
      s.phase = 'roll';
      s.devPlayed = false;
      s.dice = null;
      log(s, `Det er nu [[${s.turn}]]s tur.`);
      return null;
    }
  }
  return 'Ugyldig handling.';
}

export function playDev(s, pi, a) {
  const p = s.players[pi];
  const card = a.card;
  if (s.devPlayed) return 'Du har allerede spillet et udviklingskort i denne tur.';
  if (card === 'vp') return 'Sejrspointkort tæller automatisk.';
  const idx = p.dev.findIndex(d => d.type === card && d.bought < s.turnNumber);
  if (idx < 0) return 'Du har ikke et spilbart kort af den type (kort købt i denne tur kan ikke spilles).';
  if (card === 'yearOfPlenty') {
    if (!isRes(a.res1) || !isRes(a.res2)) return 'Vælg to råstoffer.';
    const need = zeroRes(); need[a.res1]++; need[a.res2]++;
    if (!RES.every(k => s.bank[k] >= need[k])) return 'Banken har ikke nok af det.';
  }
  if (card === 'monopoly' && !isRes(a.res)) return 'Vælg et råstof.';
  if (card === 'roadBuilding' && !((piecesLeft(s, pi, 'road') > 0 && validRoadSpots(s, pi).length) || (piecesLeft(s, pi, 'ship') > 0 && validShipSpots(s, pi).length))) return 'Du har ingen steder at bygge veje.';

  p.dev.splice(idx, 1);
  s.devPlayed = true;
  log(s, `📜 [[${pi}]] spillede ${DEV_DA[card]}.`);
  switch (card) {
    case 'knight':
      p.knights++;
      updateLargestArmy(s, pi);
      s.trade = null;
      s.returnPhase = s.phase;
      s.phase = 'robber';
      break;
    case 'roadBuilding':
      s.trade = null;
      s.freeRoads = 2;
      s.returnPhase = s.phase;
      s.phase = 'roadBuilding';
      break;
    case 'yearOfPlenty':
      [a.res1, a.res2].forEach(r => { s.bank[r]--; p.res[r]++; });
      log(s, `[[${pi}]] tog 1 ${RES_DA[a.res1]} og 1 ${RES_DA[a.res2]}.`);
      break;
    case 'monopoly': {
      let n = 0;
      s.players.forEach((o, i) => { if (i !== pi) { n += o.res[a.res]; o.res[a.res] = 0; } });
      p.res[a.res] += n;
      log(s, `[[${pi}]] fik ${n} ${RES_DA[a.res]} fra de andre.`);
      break;
    }
  }
  return null;
}
