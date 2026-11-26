// Nybyggerne – programmets fælles tilstand (app). Alle UI-moduler læser og skriver her.

import G from '../game/index.js';

import { online } from '../net/host.js';
import { randId, store } from '../storage.js';
export const app = {
  mode: null, peer: null, conn: null, code: null, name: '',
  lobby: [], lobbyNames: [], online: [],
  state: null, me: 0,
  cid: store.get('cid', true) || randId(),
  retries: 0, board: null,
  ui: { build: null, give: G.zeroRes(), get: G.zeroRes(), disc: G.zeroRes(), bankGive: 'wood', bankGet: 'brick', modal: null, yop1: 'wood', yop2: 'wood', mono: 'wood', lastSeq: -1 },
};
store.set('cid', app.cid, true);
