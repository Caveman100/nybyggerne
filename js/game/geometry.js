// Nybyggerne – spillogik. Brættets geometri: sekskanter (HEXES), hjørner (VERTS) og kanter (EDGES).
// Sekskanter op til afstand 3 fra midten; de yderste er hav i grundspillet.
export const SQ3 = Math.sqrt(3);
export const HEXES = [];
for (let r = -3; r <= 3; r++) for (let q = -3; q <= 3; q++) if (Math.abs(-q - r) <= 3) HEXES.push({ q, r, d: (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 });
export const HEX_AT = new Map(HEXES.map((h, i) => [h.q + ',' + h.r, i]));
export const VERTS = [];
export const EDGES = [];
(function buildTopology() {
  const vkey = new Map(), ekey = new Map();
  const key = (x, y) => Math.round(x * 100) + ',' + Math.round(y * 100);
  HEXES.forEach((h, hi) => {
    h.x = SQ3 * (h.q + h.r / 2);
    h.y = 1.5 * h.r;
    h.verts = [];
    h.edges = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      const x = h.x + Math.cos(ang), y = h.y + Math.sin(ang);
      const k = key(x, y);
      let vi = vkey.get(k);
      if (vi === undefined) { vi = VERTS.length; VERTS.push({ x, y, hexes: [], adj: [], edges: [] }); vkey.set(k, vi); }
      VERTS[vi].hexes.push(hi);
      h.verts.push(vi);
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.min(h.verts[i], h.verts[(i + 1) % 6]);
      const b = Math.max(h.verts[i], h.verts[(i + 1) % 6]);
      const k = a + '-' + b;
      let ei = ekey.get(k);
      if (ei === undefined) {
        ei = EDGES.length;
        EDGES.push({ a, b, hexes: [] });
        ekey.set(k, ei);
        VERTS[a].edges.push(ei); VERTS[b].edges.push(ei);
        VERTS[a].adj.push(b); VERTS[b].adj.push(a);
      }
      EDGES[ei].hexes.push(hi);
      h.edges.push(ei);
    }
  });
})();
export const HEX_ADJ = EDGES.filter(e => e.hexes.length === 2).map(e => e.hexes);
