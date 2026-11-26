// Nybyggerne – knapper og taster. Alle knapper har data-cmd="..." i HTML, og her står hvad de gør.

import G from '../game/index.js';
import { Sound } from '../sound.js';

import { clientJoin } from '../net/client.js';
import { hostCreate, hostStart, addBot, removeBot } from '../net/host.js';
import { applyState, localStart, send } from '../session.js';
import { getName, leave } from './lobby.js';
import { TIPS, openPanel, timeName } from './panels.js';
import { render } from './render.js';
import { openRules } from './rules.js';
import { app } from './state.js';
import { $, toast } from './util.js';
// ---------- Kommandoer ----------
document.addEventListener('click', e => {
  const tip = e.target.closest('[data-tip]');
  if (tip) { const t = TIPS[tip.dataset.tip]; toast(`${t.name}: ${t.text}`, null, 7000); return; }
  const b = e.target.closest('[data-cmd]'); if (!b || b.disabled) return;
  if (!['roll', 'mute'].includes(b.dataset.cmd)) Sound.play('click');
  const arg = b.dataset.arg, s = app.state, ui = app.ui;
  switch (b.dataset.cmd) {
    case 'create': if (getName()) hostCreate(false); break;
    case 'resume': if (getName()) hostCreate(true); break;
    case 'join': if (getName()) clientJoin(); break;
    case 'local': localStart(false); break;
    case 'resumeLocal': localStart(true); break;
    case 'start': hostStart(); break;
    case 'addBot': addBot(); break;
    case 'removeBot': removeBot(+arg); break;
    case 'leave': leave(); break;
    case 'mute': Sound.setMuted(!Sound.muted); b.innerHTML = (Sound.muted ? '🔇' : '🔊') + '<span>Lyd</span>'; if (!Sound.muted) Sound.play('click'); break;
    case 'panel': openPanel(arg); break;
    case 'rules': openRules(); break;
    case 'rulesTab': openRules(arg); break;
    case 'roll': send({ type: 'roll' }); break;
    case 'build': ui.build = ui.build === arg ? null : arg; render(); break;
    case 'buydev': send({ type: 'buy-dev' }); break;
    case 'end': ui.build = null; send({ type: 'end-turn' }); break;
    case 'skiproad': send({ type: 'skip-road' }); break;
    case 'steal': send({ type: 'steal', target: +arg }); break;
    case 'play':
      if (arg === 'yearOfPlenty' || arg === 'monopoly') { ui.modal = arg; render(); } else send({ type: 'play-dev', card: arg });
      break;
    case 'playYop': ui.modal = null; send({ type: 'play-dev', card: 'yearOfPlenty', res1: ui.yop1, res2: ui.yop2 }); render(); break;
    case 'playMono': ui.modal = null; send({ type: 'play-dev', card: 'monopoly', res: ui.mono }); render(); break;
    case 'closeModal': ui.modal = null; render(); break;
    case 'closeWin': ui.modal = 'closedWin'; render(); break;
    case 'bank': send({ type: 'bank-trade', give: ui.bankGive, get: ui.bankGet }); break;
    case 'step': {
      const [side, k, d] = arg.split(':');
      const max = side === 'get' ? 9 : s.players[app.me].res[k];
      ui[side][k] = Math.max(0, Math.min(max, ui[side][k] + +d));
      if (side === 'disc' && s.discard && G.countRes(ui.disc) > s.discard[app.me]) ui[side][k]--;
      render(); break;
    }
    case 'offer': send({ type: 'offer-trade', give: ui.give, get: ui.get }); ui.give = G.zeroRes(); ui.get = G.zeroRes(); break;
    case 'accept': send({ type: 'accept-trade' }); break;
    case 'decline': send({ type: 'decline-trade' }); break;
    case 'confirm': send({ type: 'confirm-trade', with: +arg }); break;
    case 'cancel': send({ type: 'cancel-trade' }); break;
    case 'discard': send({ type: 'discard', res: ui.disc }); break;
    case 'again': {
      const ns = G.newGame(s.players.map(p => ({ name: p.name, id: p.id })), { timeLimit: s.timeLimit, expansions: s.exp });
      ui.modal = null;
      app.prevState = null;
      applyState(ns, null);
      break;
    }
  }
});
$('rules').addEventListener('click', e => { if (e.target.id === 'rules') $('rules').hidden = true; });
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ui]'); if (!el) return;
  if (el.dataset.ui === 'timeLimit') {
    if (app.mode === 'client' || !app.state) return;
    const ns = JSON.parse(JSON.stringify(app.state)); ns.timeLimit = +el.value; ns.seq++;
    ns.log.push(`⌛ Tid pr. tur er nu: ${timeName(ns.timeLimit)}.`);
    applyState(ns, app.state); return;
  }
  if (el.dataset.ui === 'viewAs') { app.me = +el.value; app.ui.build = null; app.ui.lastSeq = -1; } else app.ui[el.dataset.ui] = el.value;
  render();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('rules').hidden = true; if (app.ui.panel) openPanel(app.ui.panel); app.ui.build = null; if (app.ui.modal && app.ui.modal !== 'closedWin') app.ui.modal = null; if (app.state) render(); }
});
$('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.querySelector('[data-cmd="join"]').click(); });
