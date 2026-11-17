import { newGame, callDefense, executePlay, applyPlay, theirDrive, fourthDownDecision, startSecondHalf, playerEffects, fieldGoalChance } from '../src/engine/game';
import { OPPONENTS, startingRoster } from '../src/content/world';
import { ALL_TEMPLATES } from '../src/content/plays';
const roster = startingRoster('formerQB');
const fx = playerEffects(roster);
const plan = ['t-iz', 't-power', 't-smash', 't-stick', 't-mesh', 't-slantflat', 't-fourverts', 't-curlflat', 't-flood', 't-dagger'];
let seed = 1;
const results: string[] = [];
let totalPlays = 0;
for (const opp of OPPONENTS) {
  for (let rep = 0; rep < 3; rep++) {
    let g = newGame(opp.id, 1);
    let ourPlays = 0, guard = 0;
    while (guard++ < 500) {
      if (g.phase === 'call') {
        const play = ALL_TEMPLATES.find((p) => p.id === plan[(seed * 7) % plan.length])!;
        const { look } = callDefense(g, opp, seed++);
        const { result, busted } = executePlay(play, look, fx, 2, false, seed++);
        g = applyPlay(g, play, look, result, busted, 'OPP');
        ourPlays++;
      } else if (g.phase === 'result' || g.phase === 'theirDrive') {
        const next = g.next!;
        if (next === 'theirDrive') g = theirDrive(g, opp, 55, seed++);
        else if (next === 'final') break;
        else if (next === 'halftime') g = theirDrive(startSecondHalf(g, 1), opp, 55, seed++);
        else g = { ...g, phase: next };
      } else if (g.phase === 'fourth') {
        g = fourthDownDecision(g, g.ball > 62 && fieldGoalChance(g.ball) > 0.5 ? 'fg' : g.toGo <= 2 ? 'go' : 'punt', seed++);
      } else { console.log('stuck', g.phase); break; }
    }
    totalPlays += ourPlays;
    results.push(`cmp=${g.stats.passComp}/${g.stats.passAtt} ${opp.school.padEnd(15)} ${String(g.us).padStart(2)}-${String(g.them).padEnd(2)} plays=${ourPlays} passYds=${g.stats.passYds} rush=${g.stats.rushAtt}/${g.stats.rushYds} TO=${g.stats.turnovers} sacks=${g.stats.sacks}`);
  }
}
console.log(results.join('\n'));
console.log('avg plays', totalPlays / results.length);
