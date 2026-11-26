// Nybyggerne – spillogik. Hvor må man bygge? Regler for bosættelser, veje, skibe, byer, riddere og havne-bytteforhold.

import { RES } from './constants.js';
import { EDGES, VERTS } from './geometry.js';
import { edgeFree, edgeLand, edgeSea, exp, guards, validE, validV, vertexIsland, vertexLand } from './helpers.js';
export function vertexFree(s, v) { return vertexLand(s, v) && !s.buildings[v] && !guards(s)[v] && VERTS[v].adj.every(u => !s.buildings[u]); }
export function canPlaceSettlement(s, pi, v, setup) {
  if (!validV(v) || !vertexFree(s, v)) return false;
  if (setup) return !exp(s, 'seafarers') || vertexIsland(s, v) === 0;
  return VERTS[v].edges.some(e => s.roads[e] === pi || (s.ships && s.ships[e] === pi));
}
// type: 'road' eller 'ship'
export function canPlacePath(s, pi, e, fromVertex, type) {
  if (!validE(e) || !edgeFree(s, e)) return false;
  if (type === 'road' ? !edgeLand(s, e) : (!exp(s, 'seafarers') || !edgeSea(s, e))) return false;
  const E = EDGES[e];
  if (fromVertex !== null && fromVertex !== undefined) return E.a === fromVertex || E.b === fromVertex;
  const same = type === 'road' ? s.roads : s.ships;
  return [E.a, E.b].some(v => {
    const b = s.buildings[v];
    if (b) return b.owner === pi;
    return VERTS[v].edges.some(e2 => e2 !== e && same[e2] === pi);
  });
}
export const canPlaceRoad = (s, pi, e, from) => canPlacePath(s, pi, e, from, 'road');
export const canPlaceShip = (s, pi, e, from) => canPlacePath(s, pi, e, from, 'ship');
export function validSettlementSpots(s, pi) {
  const setup = s.phase === 'setup';
  return VERTS.map((_, v) => v).filter(v => canPlaceSettlement(s, pi, v, setup));
}
export function validRoadSpots(s, pi) {
  const from = s.phase === 'setup' ? s.setup.lastVertex : null;
  return EDGES.map((_, e) => e).filter(e => canPlaceRoad(s, pi, e, from));
}
export function validShipSpots(s, pi) {
  if (!exp(s, 'seafarers')) return [];
  const from = s.phase === 'setup' ? s.setup.lastVertex : null;
  return EDGES.map((_, e) => e).filter(e => canPlaceShip(s, pi, e, from));
}
export function validCitySpots(s, pi) {
  return Object.keys(s.buildings).filter(v => s.buildings[v].owner === pi && s.buildings[v].type === 'settlement').map(Number);
}
export function canPlaceKnight(s, pi, v) {
  return exp(s, 'barbarians') && validV(v) && vertexLand(s, v) && !s.buildings[v] && !guards(s)[v]
    && VERTS[v].edges.some(e => s.roads[e] === pi || (s.ships && s.ships[e] === pi));
}
export const validKnightSpots = (s, pi) => VERTS.map((_, v) => v).filter(v => canPlaceKnight(s, pi, v));
export const validActivateSpots = (s, pi) => Object.keys(guards(s)).filter(v => s.guards[v].owner === pi && !s.guards[v].active).map(Number);

export function tradeRatios(s, pi) {
  const r = {}; RES.forEach(k => (r[k] = 4));
  s.ports.forEach(pt => {
    const E = EDGES[pt.edge];
    const own = [E.a, E.b].some(v => s.buildings[v] && s.buildings[v].owner === pi);
    if (!own) return;
    if (pt.type === 'any') RES.forEach(k => (r[k] = Math.min(r[k], 3)));
    else r[pt.type] = 2;
  });
  if (s.marketTurn === s.turnNumber) RES.forEach(k => (r[k] = Math.min(r[k], 3)));
  return r;
}
