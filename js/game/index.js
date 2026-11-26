// Nybyggerne – spillogik samlet ét sted.
// Resten af programmet bruger kun dette objekt: `import G from './game/index.js'`.
// Logikken er ren JavaScript uden afhængigheder og kører hos værten (eller lokalt).
// Alle ændringer af spillet sker gennem G.act(tilstand, spillerIndex, handling).

import { RES, RES_DA, RES_ICON, TERRAIN_RES, COST, PIECES, COLORS, COLOR_KEYS, DEV_DA, DEV_DESC, EVENTS, EXP_DA, BARB_TRACK } from './constants.js';
import { HEXES, VERTS, EDGES } from './geometry.js';
import { countRes, canAfford, piecesLeft, fmtRes, zeroRes, isLand } from './helpers.js';
import {
  tradeRatios, validSettlementSpots, validRoadSpots, validShipSpots, validCitySpots,
  validKnightSpots, validActivateSpots, canPlaceRoad, canPlaceShip,
} from './placement.js';
import { publicVP, totalVP, longestRoadFor } from './scoring.js';
import { newGame } from './setup.js';
import { act, actors, autoAction } from './engine.js';
import { botAction, BOT_NAMES, BOT_LEVELS } from './bot.js';

const Game = {
  // Konstanter
  RES, RES_DA, RES_ICON, TERRAIN_RES, COST, PIECES, COLORS, COLOR_KEYS, DEV_DA, DEV_DESC, EVENTS, EXP_DA, BARB_TRACK,
  // Brættets geometri
  HEXES, VERTS, EDGES,
  // Spillets gang
  newGame, act, actors, autoAction,
  // Computerspiller
  botAction, BOT_NAMES, BOT_LEVELS,
  // Opslag til visningen
  countRes, canAfford, piecesLeft, tradeRatios, publicVP, totalVP, longestRoadFor, fmtRes, zeroRes, isLand,
  validSettlementSpots, validRoadSpots, validShipSpots, validCitySpots, validKnightSpots, validActivateSpots,
  canPlaceRoad, canPlaceShip,
};

export default Game;
