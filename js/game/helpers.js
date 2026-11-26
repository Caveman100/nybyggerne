// Nybyggerne – spillogik. Små hjælpefunktioner: blanding, råstof-regning, betaling, log og opslag på brættet.

import { PIECES, RES, RES_DA } from './constants.js';
import { EDGES, VERTS } from './geometry.js';
export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const zeroRes = () => ({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
export const countRes = r => RES.reduce((s, k) => s + (r[k] || 0), 0);
export function cleanRes(r) {
  const o = zeroRes();
  if (r && typeof r === 'object') RES.forEach(k => { const n = Math.floor(Number(r[k]) || 0); o[k] = Math.max(0, n); });
  return o;
}
export function fmtRes(r) {
  const parts = RES.filter(k => r[k] > 0).map(k => `${r[k]} ${RES_DA[k]}`);
  return parts.length ? parts.join(', ') : 'intet';
}
export const canAfford = (p, cost) => Object.keys(cost).every(k => p.res[k] >= cost[k]);
export function pay(s, pi, cost) { const p = s.players[pi]; for (const k in cost) { p.res[k] -= cost[k]; s.bank[k] += cost[k]; } }
export function give(s, pi, r, n = 1) { const m = Math.min(n, s.bank[r]); s.bank[r] -= m; s.players[pi].res[r] += m; return m; }
export function log(s, msg) { s.log.push(msg); if (s.log.length > 100) s.log.shift(); }
export const validV = v => Number.isInteger(v) && v >= 0 && v < VERTS.length;
export const validE = e => Number.isInteger(e) && e >= 0 && e < EDGES.length;
export const isRes = r => RES.includes(r);
export const exp = (s, k) => !!(s.exp && s.exp[k]);

export const isLand = (s, h) => s.hexes[h].terrain !== 'sea';
export const vertexLand = (s, v) => VERTS[v].hexes.some(h => isLand(s, h));
export const edgeLand = (s, e) => EDGES[e].hexes.some(h => isLand(s, h));
export const edgeSea = (s, e) => EDGES[e].hexes.length < 2 || EDGES[e].hexes.some(h => !isLand(s, h));
export const vertexIsland = (s, v) => { const h = VERTS[v].hexes.find(h => isLand(s, h)); return h === undefined ? -1 : s.hexes[h].island; };
export const guards = s => s.guards || {};

export function piecesUsed(s, pi, type) {
  if (type === 'road') return Object.values(s.roads).filter(o => o === pi).length;
  if (type === 'ship') return Object.values(s.ships || {}).filter(o => o === pi).length;
  if (type === 'knight') return Object.values(guards(s)).filter(g => g.owner === pi).length;
  return Object.values(s.buildings).filter(b => b.owner === pi && b.type === type).length;
}
export const piecesLeft = (s, pi, type) => PIECES[type] - piecesUsed(s, pi, type);
export const edgeFree = (s, e) => s.roads[e] === undefined && (!s.ships || s.ships[e] === undefined);
