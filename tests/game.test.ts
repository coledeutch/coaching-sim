import { describe, expect, it } from 'vitest';
import { applyPlay, callDefense, executePlay, fourthDownDecision, newGame, playerEffects, startSecondHalf, theirDrive, type GameState } from '../src/engine/game';
import { finishWeek } from '../src/engine/career';
import { OPPONENTS, startingRoster, welcomeMessages } from '../src/content/world';
import { ALL_TEMPLATES } from '../src/content/plays';
import { lookById } from '../src/content/looks';
import type { Career } from '../src/model/career';

const opp = OPPONENTS[0];
const fx = playerEffects(startingRoster('formerQB'));
const play = (id: string) => ALL_TEMPLATES.find((p) => p.id === id)!;

function autoplay(calls: string[], seed0 = 1): { g: GameState; sawHalftime: boolean } {
  let g = newGame(opp.id, 1);
  let seed = seed0;
  let sawHalftime = false;
  for (let guard = 0; guard < 600; guard++) {
    if (g.phase === 'call') {
      const p = play(calls[guard % calls.length]);
      const { look } = callDefense(g, opp, seed++);
      const { result, busted } = executePlay(p, look, fx, 3, false, seed++);
      g = applyPlay(g, p, look, result, busted, 'CR');
    } else if (g.phase === 'fourth') g = fourthDownDecision(g, 'punt', seed++);
    else if (g.next === 'theirDrive') g = theirDrive(g, opp, 55, seed++);
    else if (g.next === 'halftime') { sawHalftime = true; g = theirDrive(startSecondHalf(g, 1), opp, 55, seed++); }
    else if (g.next === 'final') return { g, sawHalftime };
    else g = { ...g, phase: g.next! };
  }
  throw new Error('game did not finish');
}

describe('Game Day', () => {
  it('a game runs from kickoff to final, with a halftime', () => {
    const { g, sawHalftime } = autoplay(['t-iz', 't-stick', 't-smash', 't-curlflat']);
    expect(sawHalftime).toBe(true);
    expect(g.quarter).toBe(4);
    expect(g.clock).toBe(0);
    expect(g.calls.length).toBeGreaterThan(20);
    expect(g.calls.length).toBeLessThan(70);
  });

  it('every point is accounted for in the play-by-play', () => {
    const { g } = autoplay(['t-mesh', 't-iz', 't-fourverts'], 5);
    expect(g.us % 1).toBe(0);
    expect(g.log.some((e) => e.text.startsWith('Final'))).toBe(true);
  });

  it("the opposing coordinator adjusts: after Smash beats him, he calls more coverages that stop Smash", () => {
    const g = newGame('stbrendan', 1);
    const smash = { playId: 't-smash', playName: 'Smash', lookId: 'cover2', family: 'cover2' as const, concepts: ['smash'], isRun: false, down: 1, toGo: 10, yards: 15, success: true };
    const burned: GameState = { ...g, calls: [smash, smash, smash] };
    const stbrendan = OPPONENTS.find((o) => o.id === 'stbrendan')!;
    const count = (state: GameState) => {
      let n = 0;
      for (let s = 1; s <= 400; s++) if (callDefense(state, stbrendan, s).look.family === 'cover2man') n++;
      return n;
    };
    expect(count(burned)).toBeGreaterThan(count(g) + 40);
    expect(callDefense(burned, stbrendan, 1).note).toMatch(/Smash/);
  });

  it('unpracticed plays get busted more often than installed ones', () => {
    let low = 0, high = 0;
    for (let s = 1; s <= 600; s++) {
      if (executePlay(play('t-smash'), lookById('cover2'), fx, 0, false, s).busted) low++;
      if (executePlay(play('t-smash'), lookById('cover2'), fx, 3, false, s).busted) high++;
    }
    expect(low).toBeGreaterThan(high * 3);
  });

  it('finishing a week records the result and moves to next week', () => {
    const { g } = autoplay(['t-iz', 't-stick'], 9);
    const c: Career = {
      coach: { name: 'Test', background: 'formerQB', philosophy: 'spread' }, week: 1, results: [], jobSecurity: 55,
      install: {}, gamePlan: [], practiceRepsLeft: 0, roster: startingRoster('formerQB'), inbox: welcomeMessages('Test', 'formerQB'),
      weekSteps: { scouted: true, planned: true },
    };
    const next = finishWeek(c, g);
    expect(next.week).toBe(2);
    expect(next.results).toHaveLength(1);
    expect(next.practiceRepsLeft).toBe(8);
    expect(next.inbox.length).toBeGreaterThan(c.inbox.length);
  });
});
