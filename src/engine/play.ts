import type { DefensiveLook, Play, SimResult } from '../model/types';
import { simulate, type PlayerEffects } from './sim';
import { simulateRun } from './run';

export interface PlayOptions {
  seed?: number;
  players?: PlayerEffects;
  /** Run game effects from ratings */
  backBonus?: number;
  lineBonus?: number;
}

/** Run any play, pass or run, against a defensive look. */
export function simulatePlay(play: Play, look: DefensiveLook, opts: PlayOptions = {}): SimResult {
  if (play.run) return simulateRun(play, look, { seed: opts.seed, backBonus: opts.backBonus, lineBonus: opts.lineBonus });
  return simulate(play, look, { seed: opts.seed, players: opts.players });
}
