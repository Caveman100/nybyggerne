// Nybyggerne – forbinder 3D-brættet med resten af programmet (start, klik, terningesum).

import G from '../game/index.js';
import { Board3D } from '../render/board3d.js';

import { send } from '../session.js';
import { render } from './render.js';
import { app } from './state.js';
import { $ } from './util.js';
export const DEMO = G.newGame([{ name: 'A', id: 'a' }, { name: 'B', id: 'b' }]);
export function startBoard() {
  try {
    app.board = new Board3D($('stage'), G, { onPick, onDiceDone: showDiceSum, flyTarget });
  } catch (e) {
    $('loading').textContent = 'Din browser kan ikke vise 3D (WebGL).';
    return;
  }
  Promise.all([app.board.ready, document.fonts.load('700 40px Cinzel').catch(() => {})]).then(() => {
    $('loading').hidden = true;

    if (app.state) render(); else { app.board.update(DEMO, {}); }
  }).catch(e => { console.error(e); $('loading').textContent = 'Kunne ikke indlæse 3D-modellerne.'; });
}
// Hvor på skærmen et kort skal flyve hen (spillerens egne kort / modspillerens boks)
export function flyTarget(pi) {
  const el = pi === app.me ? $('myHand') : document.querySelector(`[data-opp="${pi}"]`);
  if (!el || el.hidden) return null;
  const r = el.getBoundingClientRect(), s = $('stage').getBoundingClientRect();
  return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
}
export function onPick(kind, id) {
  ({
    ship: () => send({ type: 'build-ship', e: id }),
    knight: () => send({ type: 'build-knight', v: id }),
    activate: () => send({ type: 'activate-knight', v: id }),
    settlement: () => send({ type: 'build-settlement', v: id }),
    city: () => send({ type: 'build-city', v: id }),
    road: () => send({ type: 'build-road', e: id }),
    robber: () => send({ type: 'move-robber', hex: id }),
  })[kind]();
}
export function showDiceSum(vals) {
  const el = $('diceSum'), r = app.board && app.board.diceRect();
  if (!r || !app.state) return;
  el.textContent = `Slag: ${vals[0] + vals[1]}` + (app.state.eventDeck ? ` · 🃏 ${app.state.eventDeck.length}` : '');
  el.style.left = r.x + 'px'; el.style.top = (r.below ? r.y + r.h + 4 : r.y - 30) + 'px';
  el.hidden = false;
}
