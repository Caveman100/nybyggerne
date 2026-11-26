// Nybyggerne – 3D-brættet: fælles mål og små hjælpefunktioner.

// Spillogikkens enheder → 3D-enheder (en sekskant er 2 bred i 3D)
export const K = 2 / Math.sqrt(3);

// Højden på bordpladen under brættet
export const TABLE_Y = -0.55;

// Størrelse på de kort, der flyver hen til spillerne (bredde, højde, tykkelse)
export const CW = 0.86, CH = 1.22, CT = 0.016;

// Tilfældighedsgenerator med fast startværdi, så pynt ser ens ud hver gang
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Bløde bevægelser til animationer (t går fra 0 til 1)
export const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
