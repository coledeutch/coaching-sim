/**
 * Game Day: downs, distance, clock, score, and the opposing defensive
 * coordinator. You call every offensive snap; opponent possessions are simulated
 * as drive summaries so a game takes 10-15 minutes.
 */
import type { Opponent, RosterPlayer } from '../model/career';
import type { CoverageFamily, DefensiveLook, Play, SimResult } from '../model/types';
import { LOOKS, lookById } from '../content/looks';
import { OPPONENTS } from '../content/world';
import { CONCEPT_VS_COVERAGE } from '../content/knowledge';
import { CONCEPTS } from './concepts';
import { simulatePlay, type PlayOptions } from './play';
import { clamp, rng } from './geometry';

export const QUARTER_SECONDS = 600; // 10-minute quarters keep a game to 10-15 minutes

export type GamePhase = 'call' | 'presnap' | 'result' | 'fourth' | 'theirDrive' | 'halftime' | 'final';

export interface LogEntry {
  q: number;
  clock: number;
  side: 'us' | 'them' | 'info';
  text: string;
  score?: boolean;
}

export interface CallRecord {
  playId: string;
  playName: string;
  lookId: string;
  family: CoverageFamily;
  concepts: string[];
  isRun: boolean;
  down: number;
  toGo: number;
  yards: number;
  success: boolean;
  /** For passes: how much better the best answer was than what we got (yards of separation) */
  missedWindow?: { receiverId: string; separation: number };
  busted?: boolean;
}

export interface GameStats {
  passAtt: number;
  passComp: number;
  passYds: number;
  rushAtt: number;
  rushYds: number;
  sacks: number;
  turnovers: number;
  firstDowns: number;
  thirdAtt: number;
  thirdConv: number;
}

export interface GameState {
  opponentId: string;
  quarter: number;
  clock: number;
  us: number;
  them: number;
  /** Yards from our own goal line, 0-100 */
  ball: number;
  down: number;
  toGo: number;
  phase: GamePhase;
  /** Where to go after the player dismisses the current result */
  next?: GamePhase;
  pendingPlayId?: string;
  pendingLookId?: string;
  audiblesLeft: number;
  lastResult?: SimResult;
  lastText?: string;
  pressBox?: string;
  theirDriveText?: string;
  log: LogEntry[];
  calls: CallRecord[];
  stats: GameStats;
  /** Second half: they receive */
  secondHalfStarted: boolean;
  /** The clock ran out on the 2nd quarter during the last action */
  halftimePending: boolean;
  /** Where their next drive starts, in our coordinates (they drive toward 0) */
  theirStart: number;
  seq: number;
}

const emptyStats = (): GameStats => ({ passAtt: 0, passComp: 0, passYds: 0, rushAtt: 0, rushYds: 0, sacks: 0, turnovers: 0, firstDowns: 0, thirdAtt: 0, thirdConv: 0 });

export function newGame(opponentId: string, audibles: number): GameState {
  return {
    opponentId, quarter: 1, clock: QUARTER_SECONDS, us: 0, them: 0, ball: 25, down: 1, toGo: 10,
    phase: 'call', audiblesLeft: audibles, log: [{ q: 1, clock: QUARTER_SECONDS, side: 'info', text: 'Boca Rio receives the opening kickoff. Ball on the 25.' }],
    calls: [], stats: emptyStats(), secondHalfStarted: false, halftimePending: false, theirStart: 75, seq: 0,
  };
}

/** "BR 34" (our side) or "OPP 22" (their side) */
export function spot(ball: number, oppShort = 'OPP'): string {
  if (ball === 50) return '50';
  return ball < 50 ? `BR ${Math.round(ball)}` : `${oppShort} ${Math.round(100 - ball)}`;
}

export const clockText = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, '0')}`;

export const downText = (g: GameState) => {
  const goal = g.ball + g.toGo >= 100;
  return `${['1st', '2nd', '3rd', '4th'][g.down - 1]} & ${goal ? 'Goal' : Math.round(g.toGo)}`;
};

// ---------------------------------------------------------------------------
// The opposing defensive coordinator
// ---------------------------------------------------------------------------

/**
 * He calls from his habits (the scouting report) by situation, and adjusts to
 * what's been working against him. Adjusting is what makes play-calling a
 * chess match: lean on one concept and he takes it away.
 */
export function callDefense(g: GameState, opp: Opponent, seed: number): { look: DefensiveLook; note?: string } {
  const rand = rng(seed);
  const base = g.down >= 3 && g.toGo >= 7 ? opp.thirdLongMix : g.ball >= 80 ? opp.redZoneMix : opp.coverageMix;
  const w: Record<string, number> = {};
  for (const l of LOOKS) w[l.id] = (base[l.id] ?? 0) + (opp.coverageMix[l.id] ?? 0) * 0.15;

  // Adjustments: what has hurt him lately?
  const recent = g.calls.slice(-8).filter((c) => c.success);
  const pressure: Record<string, number> = {};
  for (const c of recent) {
    if (c.isRun) {
      pressure['run'] = (pressure['run'] ?? 0) + 1;
    }
    for (const concept of c.concepts) pressure[concept] = (pressure[concept] ?? 0) + 1;
  }
  let note: string | undefined;
  const k = opp.adaptiveness;
  if ((pressure['run'] ?? 0) >= 3) {
    w['cover3-sky'] += 3 * k;
    w['cover1'] += 2 * k;
    w['cover0'] += 1 * k;
    note = `Their coordinator is tired of getting run on: he's rolling a safety down to put an extra defender in the box. Count it before the snap, and if the box is loaded, throw.`;
  }
  for (const [concept, n] of Object.entries(pressure)) {
    if (concept === 'run' || n < 2 || !CONCEPT_VS_COVERAGE[concept]) continue;
    const bad = Object.entries(CONCEPT_VS_COVERAGE[concept]).filter(([, f]) => f!.fit === 'bad').map(([fam]) => fam);
    const good = Object.entries(CONCEPT_VS_COVERAGE[concept]).filter(([, f]) => f!.fit === 'good').map(([fam]) => fam);
    for (const l of LOOKS) {
      if (bad.includes(l.family)) w[l.id] += 2.5 * k * n;
      if (good.includes(l.family)) w[l.id] *= Math.max(0.2, 1 - 0.25 * k * n);
    }
    if (bad.length) note = `He's seen ${CONCEPTS[concept]?.name ?? concept} beat him ${n} times. Expect coverages built to stop it (${bad.map((b) => FAMILY_NAME[b as CoverageFamily]).join(', ')}).`;
  }

  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [id, weight] of Object.entries(w)) {
    r -= weight;
    if (r <= 0) return { look: lookById(id), note };
  }
  return { look: LOOKS[0], note };
}

export const FAMILY_NAME: Record<CoverageFamily, string> = {
  cover0: 'Cover 0', cover1: 'Cover 1', cover2: 'Cover 2', cover2man: '2-Man', cover3: 'Cover 3', cover4: 'Quarters', tampa2: 'Tampa 2',
};

// ---------------------------------------------------------------------------
// Running one of our plays
// ---------------------------------------------------------------------------

/** Ratings → engine effects. */
export function playerEffects(roster: RosterPlayer[]): PlayOptions {
  const by = (slot: string) => roster.find((p) => p.slot === slot);
  const qb = by('QB');
  const speedOf: Record<string, number> = {};
  const handsOf: Record<string, number> = {};
  for (const p of roster) {
    if (['X', 'Z', 'H', 'Y', 'RB'].includes(p.slot)) {
      speedOf[p.slot] = 6.6 + p.ratings.speed * 0.007;
      handsOf[p.slot] = (p.ratings.hands - 65) * 0.004;
    }
  }
  const rb = by('RB');
  const ol = by('OL');
  return {
    players: {
      readCost: qb ? 0.33 + (100 - (qb.ratings.processing ?? 60)) * 0.004 : undefined,
      speedOf,
      handsOf,
      accuracy: qb ? ((qb.ratings.accuracy ?? 65) - 65) * 0.004 : 0,
    },
    backBonus: rb ? ((rb.ratings.strength + rb.ratings.speed) / 2 - 65) * 0.05 : 0,
    lineBonus: ol ? (ol.ratings.strength - 70) * 0.02 : 0,
  };
}

/** Chance of a mental error (busted route, missed block) by install level. */
export const bustChance = (install: number, lowBuyIn: boolean) => [0.12, 0.06, 0.03, 0.01][clamp(install, 0, 3)] + (lowBuyIn ? 0.03 : 0);

export function executePlay(play: Play, look: DefensiveLook, opts: PlayOptions, install: number, lowBuyIn: boolean, seed: number): { result: SimResult; busted: boolean } {
  const result = simulatePlay(play, look, { ...opts, seed });
  const rand = rng(seed * 7 + 3);
  if (rand() >= bustChance(install, lowBuyIn)) return { result, busted: false };
  const who = play.run ? 'the left guard' : play.players.find((p) => p.id === play.progression[0])?.id ?? 'a receiver';
  const yards = play.run ? Math.round(rand() * 3) - 2 : 0;
  const text = play.run
    ? `Mental error: ${who} blocked the wrong man and the play was blown up. Install level ${install}/3: the team hasn't repped this enough.`
    : `Mental error: ${who} ran the wrong depth and the QB's timing was off. Install level ${install}/3: the team hasn't repped this enough.`;
  return {
    busted: true,
    result: {
      ...result,
      result: play.run ? { kind: 'run', yards, targetId: 'RB' } : { kind: 'incomplete', yards: 0 },
      trace: [{ t: 0, kind: 'result', text, topics: ['install'] }, ...result.trace.filter((e) => e.kind !== 'result')],
    },
  };
}

const playSeconds: Record<string, number> = { run: 36, complete: 32, incomplete: 7, sack: 34, throwaway: 7, interception: 10, fumble: 12 };

/** Apply the result of our snap to the game. */
export function applyPlay(g0: GameState, play: Play, look: DefensiveLook, r: SimResult, busted: boolean, oppShort: string, names: Record<string, string> = {}): GameState {
  const g: GameState = structuredClone({ ...g0, lastResult: undefined });
  g.lastResult = r;
  g.seq++;
  const kind = r.result.kind;
  let yards = kind === 'sack' ? r.result.yards : kind === 'run' || kind === 'complete' ? r.result.yards : kind === 'fumble' ? r.result.yards : 0;
  if (g.ball + yards >= 100) yards = 100 - g.ball;
  const startDown = g.down;
  const startToGo = g.toGo;
  if (startDown === 3) g.stats.thirdAtt++;

  // Stats
  if (r.isRun) {
    g.stats.rushAtt++;
    g.stats.rushYds += yards;
  } else if (kind === 'sack') g.stats.sacks++;
  else if (kind !== 'throwaway') {
    g.stats.passAtt++;
    if (kind === 'complete') {
      g.stats.passComp++;
      g.stats.passYds += yards;
    }
  }

  const who = r.result.targetId ? names[r.result.targetId] ?? r.result.targetId : '';
  let text: string;
  switch (kind) {
    case 'run': text = `${play.name}: ${who} runs for ${yards >= 0 ? yards : `a loss of ${-yards}`}.`; break;
    case 'complete': text = `${play.name}: complete to ${who} for ${yards}.`; break;
    case 'incomplete': text = `${play.name}: incomplete${who ? `, intended for ${who}` : ''}.`; break;
    case 'sack': text = `${play.name}: sacked for a loss of ${-yards}.`; break;
    case 'throwaway': text = `${play.name}: nobody open, thrown away.`; break;
    case 'interception': text = `${play.name}: INTERCEPTED, intended for ${who}.`; break;
    case 'fumble': text = `${play.name}: FUMBLE! ${who} loses it after ${yards}.`; break;
  }
  if (busted) text += ' (mental error)';

  const success = yards >= (startDown === 1 ? 0.4 : startDown === 2 ? 0.6 : 1) * startToGo && kind !== 'interception' && kind !== 'fumble';
  const best = r.bestAnswer;
  const thrownSep = r.reads.find((w) => w.receiverId === r.result.targetId)?.separation ?? 0;
  g.calls.push({
    playId: play.id, playName: play.name, lookId: look.id, family: look.family, concepts: r.concepts, isRun: !!r.isRun,
    down: startDown, toGo: startToGo, yards, success, busted,
    missedWindow: best && best.receiverId !== r.result.targetId && best.separation - thrownSep > 1.2 ? { receiverId: best.receiverId, separation: best.separation } : undefined,
  });

  tick(g, playSeconds[kind] ?? 30);
  g.ball += yards;

  // Turnovers
  if (kind === 'interception' || kind === 'fumble') {
    g.stats.turnovers++;
    g.lastText = text;
    log(g, 'us', text);
    return endPossession(g, 'turnover');
  }
  // Touchdown
  if (g.ball >= 100) {
    g.us += 7;
    text += ` TOUCHDOWN, Boca Rio! (${g.us}-${g.them})`;
    g.lastText = text;
    log(g, 'us', text, true);
    return endPossession(g, 'score');
  }
  // Downs
  if (yards >= g.toGo) {
    g.stats.firstDowns++;
    if (startDown === 3) g.stats.thirdConv++;
    g.down = 1;
    g.toGo = Math.min(10, 100 - g.ball);
    text += ' First down.';
  } else {
    g.down++;
    g.toGo -= yards;
  }
  text += ` ${g.down <= 4 ? `Next: ${downText(g)} at ${spot(g.ball, oppShort)}.` : ''}`;
  g.lastText = text;
  log(g, 'us', text);

  if (g.down > 4) {
    log(g, 'info', 'Turnover on downs.');
    return endPossession(g, 'downs');
  }
  return settle(g, 'result', g.down === 4 ? 'fourth' : 'call');
}

export function fieldGoalChance(ball: number) {
  const dist = 100 - ball + 17;
  return clamp(0.92 - (dist - 20) * 0.03, 0.05, 0.92);
}

export function fourthDownDecision(g0: GameState, choice: 'go' | 'punt' | 'fg', seed: number): GameState {
  const g: GameState = structuredClone(g0);
  const rand = rng(seed);
  if (choice === 'go') {
    g.phase = 'call';
    return g;
  }
  g.lastResult = undefined;
  if (choice === 'punt') {
    tick(g, 12);
    log(g, 'us', 'Boca Rio punts.');
    g.lastText = 'Boca Rio punts.';
    return endPossession(g, 'punt');
  }
  const p = fieldGoalChance(g.ball);
  tick(g, 8);
  const dist = Math.round(100 - g.ball + 17);
  if (rand() < p) {
    g.us += 3;
    g.lastText = `${dist}-yard field goal is GOOD. (${g.us}-${g.them})`;
    log(g, 'us', g.lastText, true);
    return endPossession(g, 'score');
  }
  g.lastText = `${dist}-yard field goal is no good.`;
  log(g, 'us', g.lastText);
  return endPossession(g, 'missedFG');
}

type EndReason = 'score' | 'turnover' | 'punt' | 'downs' | 'missedFG';

/** Our possession ended: set up their drive (unless the half or game is over). */
function endPossession(g: GameState, why: EndReason): GameState {
  // Where they start, in OUR coordinates (yards from our goal): they drive toward 0.
  g.theirStart = why === 'score' ? 75 : why === 'punt' ? clamp(g.ball + 36, 60, 90) : why === 'missedFG' ? Math.max(g.ball, 80) : g.ball;
  return settle(g, 'result', 'theirDrive');
}

/** Simulate an opponent possession as one summary. */
export function theirDrive(g0: GameState, opp: Opponent, defense: number, seed: number): GameState {
  const g: GameState = structuredClone(g0);
  const rand = rng(seed);
  const start = g.theirStart; // in our coordinates
  const yardsToGo = start; // they need to reach 0
  const edge = (opp.offense - defense) / 100;
  const fieldBonus = (75 - yardsToGo) / 150;
  const pTD = clamp(0.28 + edge * 0.9 + fieldBonus, 0.05, 0.75);
  const pFG = 0.13;
  const pTO = 0.1;
  const roll = rand();
  const secs = Math.round(130 + rand() * 170);
  const plays = Math.round(4 + rand() * 7);
  const name = `${opp.school}`;
  let text: string;
  let nextBall = 25;
  if (roll < pTD) {
    g.them += 7;
    text = `${name} drive: ${plays} plays, ${Math.round(yardsToGo)} yards, TOUCHDOWN. (${g.us}-${g.them})`;
  } else if (roll < pTD + pFG) {
    g.them += 3;
    text = `${name} drive: ${plays} plays, field goal. (${g.us}-${g.them})`;
  } else if (roll < pTD + pFG + pTO) {
    nextBall = clamp(Math.round(start - rand() * 40), 15, 70);
    text = `${name} drive: ${rand() < 0.5 ? 'interception by the Boca Rio defense' : 'fumble recovered by Boca Rio'}! Tarpons ball at ${spot(nextBall)}.`;
  } else {
    nextBall = Math.round(15 + rand() * 20);
    text = `${name} drive: ${plays} plays, punt. Boca Rio takes over at ${spot(nextBall)}.`;
  }
  tick(g, secs);
  log(g, 'them', text, roll < pTD + pFG);
  g.theirDriveText = text;
  g.ball = nextBall;
  g.down = 1;
  g.toGo = 10;
  return settle(g, 'theirDrive', 'call');
}

function tick(g: GameState, secs: number) {
  g.clock -= secs;
  if (g.clock > 0) return;
  if (g.quarter === 2) {
    g.halftimePending = true;
    g.quarter = 3;
    g.clock = QUARTER_SECONDS;
    return;
  }
  if (g.quarter === 4) {
    g.quarter = 5; // game over
    return;
  }
  log(g, 'info', `End of the ${g.quarter === 1 ? '1st' : '3rd'} quarter.`);
  g.quarter++;
  g.clock += QUARTER_SECONDS;
}

/**
 * After any action: if the game ended, finish it; if the half ended, go to
 * halftime (they receive the second-half kickoff); otherwise show `phase` and go
 * to `next` after it.
 */
function settle(g: GameState, phase: GamePhase, next: GamePhase): GameState {
  if (g.quarter > 4) {
    g.quarter = 4;
    g.clock = 0;
    g.phase = phase;
    g.next = 'final';
    log(g, 'info', `Final: Boca Rio ${g.us}, ${oppName(g)} ${g.them}.`);
    return g;
  }
  if (g.halftimePending && !g.secondHalfStarted) {
    g.halftimePending = false;
    g.secondHalfStarted = true;
    g.phase = phase;
    g.next = 'halftime';
    g.theirStart = 75;
    log(g, 'info', `Halftime: Boca Rio ${g.us}, ${oppName(g)} ${g.them}.`);
    return g;
  }
  g.phase = phase;
  g.next = next;
  return g;
}

/** After halftime they receive: returns a state ready for their drive. */
export function startSecondHalf(g0: GameState, audibles: number): GameState {
  const g: GameState = structuredClone(g0);
  g.theirStart = 75;
  g.audiblesLeft = audibles;
  g.phase = 'result';
  g.next = 'theirDrive';
  return g;
}

const oppName = (g: GameState) => OPPONENTS.find((o) => o.id === g.opponentId)?.school ?? 'Opponent';

function log(g: GameState, side: LogEntry['side'], text: string, score = false) {
  g.log.push({ q: Math.min(4, g.quarter), clock: g.clock, side, text, score });
}

/** Which situation the defense thinks it's in (for the scouting report and the call sheet). */
export function situationName(g: GameState): string {
  if (g.ball >= 80) return 'Red zone';
  if (g.down >= 3 && g.toGo >= 7) return '3rd & long';
  if (g.down >= 3 && g.toGo <= 3) return 'Short yardage';
  return 'Normal down';
}
