// Nybyggerne – programmets start. index.html indlæser kun denne fil.

import { Sound } from './sound.js';

// Moduler der selv sætter knapper, taster og ure i gang, når de indlæses
import './ui/commands.js';
import './ui/hud.js';
import './session.js';
import './bots.js';

import { broadcastLobby } from './net/host.js';
import { store } from './storage.js';
import { startBoard } from './ui/board-view.js';
import { initStart, readExp, setExp } from './ui/lobby.js';
import { app } from './ui/state.js';
import { $ } from './ui/util.js';
window.__app = app; // til fejlfinding
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Sound.unlock(), { passive: true }));
$('muteBtn').innerHTML = (Sound.muted ? '🔇' : '🔊') + '<span>Lyd</span>';
// Lydstyrke: skyderen vises, når man holder musen over lyd-knappen
$('volume').value = Math.round(Sound.volume * 100);
$('volume').addEventListener('input', e => { Sound.unlock(); Sound.setVolume(e.target.value / 100); if (Sound.muted && +e.target.value > 0) { Sound.setMuted(false); $('muteBtn').innerHTML = '🔊<span>Lyd</span>'; } });
// Foldbare sektioner i panelet – husker hvad spilleren har åbnet og lukket
document.querySelectorAll('details.fold').forEach(d => {
  const v = store.get('fold-' + d.id);
  if (v !== null) d.open = v;
  d.addEventListener('toggle', () => store.set('fold-' + d.id, d.open));
});
initStart();
const savedTime = store.get('time');
if (savedTime !== null) { $('timeSelect').value = savedTime; $('localTime').value = savedTime; }
const savedExp = store.get('exp');
if (savedExp) { setExp('data-exp-host', savedExp); setExp('data-exp-local', savedExp); }
document.querySelectorAll('[data-exp-host],[data-exp-local]').forEach(c => c.addEventListener('change', () => {
  store.set('exp', readExp(c.hasAttribute('data-exp-host') ? 'data-exp-host' : 'data-exp-local'));
  if (app.mode === 'host') broadcastLobby();
}));
$('timeSelect').addEventListener('change', () => { store.set('time', +$('timeSelect').value); if (app.mode === 'host') broadcastLobby(); });
startBoard();
