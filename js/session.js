// Nybyggerne – spillets gang på denne skærm: send en handling, modtag ny tilstand,
// lokalt spil (alle ved samme skærm) og tidsgrænse.

import G from './game/index.js';
import { Sound } from './sound.js';

import { commit } from './net/host.js';
import { store } from './storage.js';
import { readExp, showGame } from './ui/lobby.js';
import { render } from './ui/render.js';
import { app } from './ui/state.js';
import { $, toast } from './ui/util.js';
// Ny tilstand fra en handling (vært eller lokalt) – stempler tidsgrænsen
export function stamp(prev, s) {
  if (!s.timeLimit || s.phase === 'gameover') { s.turnStart = null; return; }
  const reset = !prev || !s.turnStart || prev.turn !== s.turn || prev.timeLimit !== s.timeLimit
    || (s.phase === 'discard' && prev.phase !== 'discard') || (s.phase === 'setup' && prev.setup && prev.setup.step !== s.setup.step);
  if (reset) s.turnStart = Date.now();
}
export function applyState(ns, prev) {
  stamp(prev, ns);
  if (app.mode === 'host') { commit(ns); return; }
  app.state = ns; store.set('local', ns);
  const act = G.actors(ns);
  const humans = act.filter(i => !ns.players[i].bot);
  if (!act.includes(app.me) && !(ns.trade && ns.phase === 'main') && humans.length) app.me = humans[0];
  render();
}
// ---------- Lokalt ----------
export function localStart(resume) {
  app.mode = 'local';
  if (resume) app.state = store.get('local');
  else {
    const bots = +$('localBots').value;
    const names = $('localNames').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4 - bots);
    if (!names.length) { toast('Skriv mindst ét navn.'); return; }
    if (names.length + bots < 2) { toast('Der skal være mindst 2 spillere – tilføj en bot.'); return; }
    const players = names.map((n, i) => ({ name: n.slice(0, 20), id: 'local' + i }));
    for (let i = 0; i < bots; i++) players.push({ name: G.BOT_NAMES[i], id: 'bot' + i, bot: $('localBotLevel').value || 'hard' });
    app.state = G.newGame(players, { timeLimit: +$('localTime').value, expansions: readExp('data-exp-local') });
    store.set('exp', readExp('data-exp-local'));
    store.set('time', +$('localTime').value);
  }
  stamp(null, app.state);
  app.me = G.actors(app.state).find(i => !app.state.players[i].bot) ?? app.state.players.findIndex(p => !p.bot);
  showGame(); render();
}

// ---------- Handlinger ----------
export function send(a) {
  if (app.mode === 'client') {
    if (app.conn && app.conn.open) app.conn.send({ t: 'act', a }); else toast('Ingen forbindelse til værten.');
    return;
  }
  const r = G.act(app.state, app.me, a);
  if (r.error) { toast(r.error, 'error'); return; }
  applyState(r.state, app.state);
}
// Tidsgrænse: værten (eller den lokale skærm) udfører automatiske handlinger når tiden er gået
setInterval(() => {
  const s = app.state;
  if (!s || !app.mode || app.mode === 'client' || !s.timeLimit || !s.turnStart || s.phase === 'gameover') return;
  if (Date.now() < s.turnStart + s.timeLimit * 1000) return;
  const who = G.actors(s);
  let st = s;
  for (const pi of who) { const a = G.autoAction(st, pi); if (!a) continue; const r = G.act(st, pi, a); if (!r.error) st = r.state; }
  if (st === s) return;
  if (app.lastTimeout !== s.turnStart) { app.lastTimeout = s.turnStart; st.log.push(`⌛ Tiden løb ud for ${who.map(i => `[[${i}]]`).join(', ')}.`); Sound.play('timeout'); }
  applyState(st, s);
}, 600);
