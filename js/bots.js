// Nybyggerne – kører botterne.
// Botterne "bor" hos værten (eller på skærmen i et lokalt spil). Gæster ser dem bare som spillere.
// Hver bot laver ét træk ad gangen med en lille pause, så man kan følge med.
// Selve strategien ligger i js/game/bot.js.

import G from './game/index.js';
import { applyState } from './session.js';
import { app } from './ui/state.js';

const BOT_DELAY_MS = 900; // pause mellem bottens træk
const mem = {};           // hver bots hukommelse (f.eks. hvornår den sidst bød på en handel)
let lastMove = 0;

function botsToAsk(s) {
  const bots = s.players.map((p, i) => i).filter(i => s.players[i].bot);
  if (!bots.length) return [];
  const actors = G.actors(s);
  // svar på andres byttetilbud først, derefter den/de bots der skal handle
  const responders = s.trade && s.phase === 'main' ? bots.filter(i => i !== s.trade.from) : [];
  return [...responders, ...bots.filter(i => actors.includes(i))];
}

setInterval(() => {
  const s = app.state;
  if (!s || s.phase === 'gameover' || (app.mode !== 'host' && app.mode !== 'local')) return;
  if (Date.now() - lastMove < BOT_DELAY_MS) return;
  for (const pi of botsToAsk(s)) {
    let a = G.botAction(s, pi, (mem[pi] = mem[pi] || {}), Date.now());
    if (!a) continue;
    let r = G.act(s, pi, a);
    if (r.error) {
      // Skulle botten tage fejl, så brug den samme reserve-handling som ved tidsgrænsen
      console.warn('Bot', pi, a, r.error);
      const fb = G.autoAction(s, pi);
      if (!fb) continue;
      r = G.act(s, pi, fb);
      if (r.error) continue;
    }
    lastMove = Date.now();
    applyState(r.state, s);
    return;
  }
}, 150);
