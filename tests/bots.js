// Lader botter spille mod hinanden og tjekker, at de kun laver lovlige træk.
// Viser også hvor tit hver sværhedsgrad vinder.   node tests/bots.js
import G from '../js/game/index.js';

function play(levels, exp) {
  const players = levels.map((l, i) => ({ name: l + i, id: 'p' + i, bot: l }));
  let s = G.newGame(players, { expansions: exp });
  const mem = players.map(() => ({}));
  let now = 0, errors = 0;
  for (let steps = 0; s.phase !== 'gameover' && steps < 20000; steps++) {
    now += 1000;
    const who = s.trade && s.phase === 'main' ? s.players.map((_, i) => i).filter(i => i !== s.trade.from).concat(G.actors(s)) : G.actors(s);
    for (const pi of who) {
      const a = G.botAction(s, pi, mem[pi], now);
      if (!a) continue;
      let r = G.act(s, pi, a);
      if (r.error) { errors++; if (errors < 6) console.log('ULOVLIGT', s.players[pi].bot, s.phase, JSON.stringify(a), r.error); r = G.act(s, pi, G.autoAction(s, pi) || { type: 'end-turn' }); }
      if (!r.error) { s = r.state; break; }
    }
  }
  return { s, errors };
}

const combos = [{}, { events: true }, { barbarians: true }, { seafarers: true }];
const lineups = [['easy', 'normal', 'hard'], ['hard', 'easy', 'normal'], ['normal', 'hard', 'easy']];
const wins = { easy: 0, normal: 0, hard: 0 };
let errs = 0, done = 0, games = 0, turns = 0;
for (let g = 0; g < 300; g++) {
  const { s, errors } = play(lineups[g % 3], combos[g % 4]);
  games++; errs += errors;
  if (s.phase === 'gameover') { done++; turns += s.turnNumber; wins[s.players[s.winner].bot]++; }
}
console.log({ games, finished: done, errors: errs, avgTurns: (turns / Math.max(1, done)).toFixed(0), wins });

// Hard mod normal, én mod én (seat skiftes)
const duel = { normal: 0, hard: 0 };
for (let g = 0; g < 200; g++) { const { s } = play(g % 2 ? ['hard', 'normal'] : ['normal', 'hard'], combos[g % 4]); if (s.phase === 'gameover') duel[s.players[s.winner].bot]++; }
console.log('svær mod normal:', duel);
if (errs) process.exit(1);
