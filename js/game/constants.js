// Nybyggerne – spillogik. Konstanter: råstoffer, priser, brikker, farver, kort- og begivenhedstekster.
// Ret her for at ændre priser, antal brikker eller danske navne.
export const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
export const RES_DA = { wood: 'Træ', brick: 'Ler', sheep: 'Uld', wheat: 'Korn', ore: 'Malm' };
export const RES_ICON = { wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };
export const TERRAIN_RES = { forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore', desert: null, sea: null, gold: 'gold' };
export const COST = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  dev: { sheep: 1, wheat: 1, ore: 1 },
  ship: { wood: 1, sheep: 1 },
  knight: { sheep: 1, ore: 1 },
  activate: { wheat: 1 },
};
export const PIECES = { road: 15, settlement: 5, city: 4, ship: 15, knight: 6 };
export const COLORS = ['#c8423a', '#3a74c8', '#4f9e3f', '#e0b52c'];
export const COLOR_KEYS = ['red', 'blue', 'green', 'yellow'];
export const DEV_DA = { knight: 'Ridderkort', vp: 'Sejrspoint', roadBuilding: 'Vejbygning', yearOfPlenty: 'Overflodsår', monopoly: 'Monopol' };
export const DEV_DESC = {
  knight: 'Flyt røveren og stjæl et kort. Tæller til Største hær.',
  vp: 'Giver 1 sejrspoint (tæller automatisk).',
  roadBuilding: 'Byg 2 veje (eller skibe) gratis.',
  yearOfPlenty: 'Tag 2 valgfrie råstoffer fra banken.',
  monopoly: 'Vælg et råstof – alle andre giver dig alle deres af det.',
};
export const EXP_DA = { events: 'Begivenhedskort', barbarians: 'Riddere og barbarer', seafarers: 'Søfarere' };
export const EVENTS = {
  feast: { name: 'Høstfest', text: 'Alle spillere får 1 korn.' },
  plague: { name: 'Pest blandt fårene', text: 'Alle spillere mister 1 uld.' },
  market: { name: 'Markedsdag', text: 'I denne tur kan alle bytte 3:1 med banken.' },
  tournament: { name: 'Turnering', text: 'Spilleren med flest spillede ridderkort får 1 råstof.' },
  charity: { name: 'Velgørenhed', text: 'Spilleren med færrest point får 1 råstof.' },
  vein: { name: 'Rig malmåre', text: 'Alle med en bygning ved et bjerg får 1 malm.' },
  timber: { name: 'Tømmerflod', text: 'Alle med en bygning ved en skov får 1 træ.' },
  storm: { name: 'Storm', text: 'Ingen kan bygge veje eller skibe i denne tur.' },
};
export const BARB_TRACK = 7;
