// Nybyggerne – alle billeder og 3D-modeller samlet ét sted.
// Vil du skifte et billede ud, så læg den nye fil i assets/ og ret stien her.
// Stierne er relative til index.html, så spillet virker både lokalt og på GitHub Pages.

const IMG = 'assets/images/';

// Når spillet er bygget som én samlet fil (tools/build-single-file.js), ligger alle billeder
// og modeller inde i filen. inline() slår stien op dér og falder ellers tilbage til selve stien.
export const inline = path => (globalThis.__INLINE_ASSETS && globalThis.__INLINE_ASSETS[path]) || path;

// Malerierne på sekskantfelterne (nøglen er råstoffet, feltet giver)
export const TILE_IMAGES = {
  wood: inline(IMG + 'tiles/wood.webp'),     // skov
  brick: inline(IMG + 'tiles/brick.webp'),   // lergrav
  sheep: inline(IMG + 'tiles/sheep.webp'),   // græsmark
  wheat: inline(IMG + 'tiles/wheat.webp'),   // kornmark
  ore: inline(IMG + 'tiles/ore.webp'),       // bjerge (bruges også tonet i guld til guldfelter)
  desert: inline(IMG + 'tiles/desert.webp'), // ørken
};

// Små billeder på råstofkortene (hånden, byggeknapperne, handel og havneskilte)
export const CARD_IMAGES = {
  wood: inline(IMG + 'cards/wood.webp'),
  brick: inline(IMG + 'cards/brick.webp'),
  sheep: inline(IMG + 'cards/sheep.webp'),
  wheat: inline(IMG + 'cards/wheat.webp'),
  ore: inline(IMG + 'cards/ore.webp'),
  desert: inline(IMG + 'cards/desert.webp'),
};

export const ROBBER_IMAGE = inline(IMG + 'robber.webp');
export const SEA_IMAGE = inline(IMG + 'sea.webp');
export const TABLE_IMAGE = inline(IMG + 'table.webp'); // bordpladen (sømløs, gentages)

// Havnebillederne. Hver råstofhavn har sit eget motiv, og 3:1-havnene skiftes mellem dem.
// HARBOR_ASPECT er billedernes højde delt med bredde (bruges til at placere dem rigtigt).
export const HARBOR_IMAGES = [
  inline(IMG + 'ports/harbor-1.webp'), // fyrtårn ved klipperne → malm
  inline(IMG + 'ports/harbor-2.webp'), // marked ved byporten  → uld
  inline(IMG + 'ports/harbor-3.webp'), // borg                 → ler
  inline(IMG + 'ports/harbor-4.webp'), // skibsværft           → træ
  inline(IMG + 'ports/harbor-5.webp'), // kirkeby med torv     → korn
];
export const HARBOR_ASPECT = [0.6578, 0.6672, 0.8, 0.7875, 0.825];
export const HARBOR_FOR = { ore: 0, sheep: 1, brick: 2, wood: 3, wheat: 4 };

// 3D-modeller af huse og borge (KayKit Medieval Hexagon Pack, CC0) – én pr. spillerfarve
export const MODEL_DIR = 'assets/models/';
export const MODEL_NAMES = [
  'building_home_A_red', 'building_castle_red',
  'building_home_A_blue', 'building_castle_blue',
  'building_home_A_green', 'building_castle_green',
  'building_home_A_yellow', 'building_castle_yellow',
];
