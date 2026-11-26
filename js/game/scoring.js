// Nybyggerne – spillogik. Point: længste handelsrute, største hær og sejrspoint.

import { EDGES, VERTS } from './geometry.js';
import { log } from './helpers.js';
// Længste handelsrute: veje og skibe tæller, men man kan kun skifte mellem dem ved egen bygning
export function longestRoadFor(s, pi) {
  const mine = new Map();
  Object.keys(s.roads).forEach(e => { if (s.roads[e] === pi) mine.set(+e, 'road'); });
  Object.keys(s.ships || {}).forEach(e => { if (s.ships[e] === pi) mine.set(+e, 'ship'); });
  if (!mine.size) return 0;
  let best = 0;
  const blocked = v => { const b = s.buildings[v]; return b && b.owner !== pi; };
  const own = v => { const b = s.buildings[v]; return b && b.owner === pi; };
  const used = new Set();
  function dfs(v, last, len) {
    if (len > best) best = len;
    if (len > 0 && blocked(v)) return;
    for (const e of VERTS[v].edges) {
      const t = mine.get(e);
      if (!t || used.has(e)) continue;
      if (last && t !== last && !own(v)) continue;
      const E = EDGES[e];
      used.add(e);
      dfs(E.a === v ? E.b : E.a, t, len + 1);
      used.delete(e);
    }
  }
  const starts = new Set();
  mine.forEach((_, e) => { starts.add(EDGES[e].a); starts.add(EDGES[e].b); });
  starts.forEach(v => dfs(v, null, 0));
  return best;
}
export function updateLongestRoad(s) {
  const L = s.players.map((_, i) => longestRoadFor(s, i));
  s.roadLengths = L;
  const max = Math.max(...L);
  const cur = s.longestRoad;
  let nh;
  if (max < 5) nh = null;
  else if (cur !== null && L[cur] === max) nh = cur;
  else { const c = L.map((l, i) => (l === max ? i : -1)).filter(i => i >= 0); nh = c.length === 1 ? c[0] : null; }
  if (nh !== cur) {
    if (nh === null) log(s, 'Ingen har længere "Længste vej".');
    else log(s, `🛣️ [[${nh}]] har nu Længste vej (${max}).`);
    s.longestRoad = nh;
  }
}
export function updateLargestArmy(s, pi) {
  const k = s.players[pi].knights, cur = s.largestArmy;
  if (k >= 3 && (cur === null || (cur !== pi && k > s.players[cur].knights))) {
    s.largestArmy = pi;
    log(s, `⚔️ [[${pi}]] har nu Største hær (${k}).`);
  }
}
export function publicVP(s, pi) {
  let vp = 0;
  for (const k in s.buildings) { const b = s.buildings[k]; if (b.owner === pi) vp += b.type === 'city' ? 2 : 1; }
  if (s.longestRoad === pi) vp += 2;
  if (s.largestArmy === pi) vp += 2;
  const p = s.players[pi];
  vp += (p.defenderVP || 0) + (p.islandVP || 0);
  return vp;
}
export const totalVP = (s, pi) => publicVP(s, pi) + s.players[pi].dev.filter(d => d.type === 'vp').length;
