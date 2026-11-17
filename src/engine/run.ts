/**
 * The run game engine.
 *
 * The core idea every coordinator lives by: **count the box**. Compare the
 * defenders near the line who can fit the run to the blockers you have. If you
 * have the numbers, run. If they've loaded the box, they're short somewhere in
 * coverage, so throw.
 *
 * Inside Zone: the line steps playside together and the back reads the blocks.
 * The backside end is left unblocked because the play hits before he can make
 * it, so effectively he's out of the count.
 * Power: the backside guard pulls to lead through the hole, which adds a blocker
 * at the point of attack. It's best with a tight end, and slower to develop, so
 * pressure hurts it more.
 */
import type { DefensiveLook, Frame, Play, Point, SimResult, TraceEvent } from '../model/types';
import { clamp, dist, rng, stepToward } from './geometry';
import { presnap, type PresnapDefender } from './sim';

export interface RunOptions {
  seed?: number;
  /** Ball carrier quality: yards added per carry on average (from ratings) */
  backBonus?: number;
  /** Line quality: + = wins more blocks */
  lineBonus?: number;
}

export interface BoxCount {
  inBox: PresnapDefender[];
  blockers: number;
  /** Defenders the scheme doesn't need to block */
  unblockedByDesign: number;
  /** blockers − (box − unblocked by design); positive = offense has the numbers */
  advantage: number;
  teOnPlaySide: boolean;
}

/** The box: from tackle to tackle plus about two yards (more with a tight end), and within 8 yards of the ball. */
export function countBox(play: Play, look: DefensiveLook): BoxCount {
  const defense = presnap(play, look);
  const te = play.players.filter((p) => p.role === 'TE' && p.align.y >= -1 && Math.abs(p.align.x) < 9);
  const teBlocking = te.filter((p) => p.assignment.kind !== 'route');
  const width = (side: number) => (te.some((p) => Math.sign(p.align.x) === side) ? 9 : 7);
  const inBox = defense.filter((d) => d.pos.y <= 8 && Math.abs(d.pos.x) <= width(Math.sign(d.pos.x) || 1));
  const blockers = 5 + teBlocking.length;
  const dir = play.run?.dir === 'L' ? -1 : 1;
  const teOnPlaySide = teBlocking.some((p) => Math.sign(p.align.x) === dir);
  const unblockedByDesign = 1; // zone: backside end; power: backside end (the guard pulls away from him)
  return { inBox, blockers, unblockedByDesign, advantage: blockers - (inBox.length - unblockedByDesign), teOnPlaySide };
}

export function simulateRun(play: Play, look: DefensiveLook, opts: RunOptions = {}): SimResult {
  const rand = rng(opts.seed ?? 1);
  const design = play.run!;
  const dir = design.dir === 'L' ? -1 : 1;
  const box = countBox(play, look);
  const rushers = look.players.filter((p) => p.assignment.kind === 'rush').length;
  const blitz = rushers >= 6;
  const noDeepSafety = look.shell === '0-high';

  // Scheme fit at the point of attack.
  let schemeEdge = 0;
  if (design.scheme === 'power') schemeEdge = box.teOnPlaySide ? 0.4 : -0.5;
  const edge = box.advantage + schemeEdge + (opts.lineBonus ?? 0);

  // Yards: numbers decide the average, randomness decides the rest.
  const noise = (rand() + rand() + rand() - 1.5) * 4.5;
  let yards = 3.6 + 1.7 * edge + noise + (opts.backBonus ?? 0);
  let tfl = false;
  let explosive = false;
  if (blitz && rand() < (design.scheme === 'power' ? 0.4 : 0.3)) {
    yards = -2 - Math.floor(rand() * 3);
    tfl = true;
  } else if (edge <= -1 && rand() < 0.25) {
    yards = -1 - Math.floor(rand() * 3);
    tfl = true;
  } else if (rand() < (edge >= 0.5 ? 0.09 : edge >= 0 ? 0.05 : 0.02) || (noDeepSafety && yards > 4 && rand() < 0.4)) {
    yards += 10 + rand() * 22;
    explosive = true;
  }
  yards = Math.round(clamp(yards, -5, 75));
  const fumble = rand() < 0.012;

  // ---- Frames (a simple picture of the run, for playback)
  const rb = play.players.find((p) => p.role === 'RB')!;
  const qb = play.players.find((p) => p.role === 'QB')!;
  const hole: Point = { x: dir * (design.scheme === 'power' ? 4.5 : 2.4), y: 0 };
  const mesh: Point = { x: qb.align.x + dir * 0.6, y: qb.align.y + 0.6 };
  const cut = design.scheme === 'insideZone' && rand() < 0.35 ? -dir * 2.5 : dir * 1.5;
  const endPoint: Point = { x: hole.x + (yards > 2 ? cut : 0), y: yards };
  const tMesh = 0.55;
  const tHole = 1.15;
  const tEnd = tHole + Math.max(0.4, Math.abs(yards) / 6.8);
  const rbAt = (t: number): Point => {
    if (t <= tMesh) return lerpP(rb.align, mesh, t / tMesh);
    if (t <= tHole) return lerpP(mesh, hole, (t - tMesh) / (tHole - tMesh));
    return lerpP(hole, endPoint, Math.min(1, (t - tHole) / (tEnd - tHole)));
  };
  const defense = presnap(play, look);
  const defPos = new Map(defense.map((d) => [d.spot.id, { ...d.pos }]));
  const frames: Frame[] = [];
  const DT = 0.05;
  const steps = Math.ceil((tEnd + 0.4) / DT);
  for (let i = 0; i <= steps; i++) {
    const t = i * DT;
    const off: Record<string, Point> = {};
    for (const p of play.players) {
      if (p.id === rb.id) off[p.id] = rbAt(t);
      else if (p.role === 'QB') off[p.id] = t < tMesh ? p.align : { x: p.align.x - dir * Math.min(2, (t - tMesh) * 3), y: p.align.y - 0.5 };
      else if (p.role === 'OL' || p.role === 'TE') off[p.id] = { x: p.align.x + dir * Math.min(1.2, t * 1.5), y: p.align.y + Math.min(1.2, t * 1.4) };
      else off[p.id] = { x: p.align.x - Math.sign(p.align.x) * Math.min(2, t * 2), y: p.align.y + Math.min(5, t * 4) };
    }
    const carrier = off[rb.id];
    const def: Record<string, Point> = {};
    for (const d of defense) {
      const cur = defPos.get(d.spot.id)!;
      const sp = d.spot.role === 'DL' ? 3.5 : d.spot.role === 'LB' ? 5.8 : 6.3;
      const react = d.spot.role === 'DL' ? 0 : 0.35;
      // DL engage at the line; second level reads and pursues; deep players come downhill late.
      // Pursuers converge but stay spread around the ball carrier, so the pile stays readable.
      const away = dist(cur, carrier) || 1;
      const ring = { x: carrier.x + ((cur.x - carrier.x) / away) * 1.3, y: carrier.y + ((cur.y - carrier.y) / away) * 1.3 };
      const target = d.spot.role === 'DL'
        ? { x: cur.x * 0.97 + carrier.x * 0.03, y: Math.max(0.6, Math.min(cur.y, 1)) }
        : ring;
      const next = t < react ? cur : stepToward(cur, target, sp * DT);
      defPos.set(d.spot.id, next);
      def[d.spot.id] = { ...next };
    }
    frames.push({ t: Math.round(t * 100) / 100, off, def, ball: off[rb.id] });
  }

  // ---- Diagnosis
  const ev: TraceEvent[] = [];
  const names = box.inBox.map((d) => d.spot.label).join(', ');
  const schemeName = design.scheme === 'insideZone' ? 'Inside Zone' : 'Power';
  ev.push({ t: 0, kind: 'presnap', text: `Shell: ${look.shell}. ${look.shell === '2-high' ? 'Two safeties deep means fewer defenders near the line: the defense is inviting the run.' : look.shell === '1-high' ? 'One safety deep lets the defense put an extra defender near the line to stop the run.' : 'No deep safety: everyone is near the line. High risk, high reward.'}`, topics: ['shell', 'boxCount'] });
  ev.push({ t: 0, kind: 'presnap', text: `Coverage: ${look.name}. ${look.summary}`, topics: [look.family] });
  ev.push({
    t: 0, kind: 'box',
    text: `Box count: ${box.inBox.length} defenders in the box (${names}) vs your ${box.blockers} blockers. ${schemeName} leaves the backside end unblocked on purpose, so the real math is ${box.blockers} blockers vs ${box.inBox.length - box.unblockedByDesign} defenders: ${box.advantage > 0 ? 'you have the numbers. Run the ball.' : box.advantage === 0 ? 'even numbers: a hat on a hat. Expect 3-5 yards if everyone wins his block.' : `they have ${-box.advantage} more defender${box.advantage < -1 ? 's' : ''} than you can block. Someone will be free to make the tackle.`}`,
    defenders: box.inBox.map((d) => d.spot.id), topics: ['boxCount'],
  });
  if (design.scheme === 'power') {
    ev.push({ t: 0.6, kind: 'scheme', text: box.teOnPlaySide
      ? 'Power with a tight end on the play side: the tight end and tackle double-team, the pulling guard kicks through the hole. An extra hat at the point of attack.'
      : 'Power without a tight end to the play side: there is no extra blocker on the edge, so the pulling guard is just replacing a missing blocker. Power works best with a tight end.', topics: ['runSchemes'] });
  } else {
    ev.push({ t: 0.6, kind: 'scheme', text: 'Inside Zone: the line steps play side together, double-teams up to the linebackers, and the back reads the first down lineman past the center to choose his cut, either playside or a cutback.', topics: ['runSchemes'] });
  }
  if (blitz) ev.push({ t: 0.3, kind: 'protection', text: `${rushers} rushers: the defense is blitzing. ${tfl ? 'A free defender shot the gap before the back got to the line.' : 'The blitz left no deep safety, so once the back got past the first wave there was nobody behind it.'}`, topics: ['cover0'] });
  const resultText = fumble
    ? `Fumble! ${rb.id} put the ball on the ground after ${yards} yards.`
    : tfl ? `Stopped for a loss: ${yards} yards.` : explosive ? `Breakaway! ${yards} yards.` : `Gain of ${yards}.`;
  ev.push({ t: tEnd, kind: 'result', text: resultText });
  if (box.advantage < 0) {
    ev.push({ t: 0, kind: 'adjustment', text: `They loaded the box (${box.inBox.length} defenders). That means they're short in coverage: ${look.shell === '1-high' ? 'one safety deep and one-on-one outside. This is a passing look; quick game or a shot play.' : look.shell === '0-high' ? 'no safety at all. Any completion can go the distance.' : 'look for the soft spot in their coverage.'}`, topics: ['boxCount'] });
  } else if (box.advantage > 0) {
    ev.push({ t: 0, kind: 'adjustment', text: `A light box (${box.inBox.length}). When the defense gives you the numbers, take them: keep running until they bring another defender down, then that's your cue to throw.`, topics: ['boxCount'] });
  } else {
    ev.push({ t: 0, kind: 'adjustment', text: 'Even numbers: the run works if your line wins one-on-one. Adding a tight end (an extra blocker) or spreading them out (pulling a defender out of the box) tips the math.', topics: ['boxCount'] });
  }

  return {
    playId: play.id,
    isRun: true,
    lookId: look.id,
    seed: opts.seed ?? 1,
    frames,
    trace: ev,
    reads: [],
    bestAnswer: null,
    goodAnswers: [],
    windows: [],
    conflicts: [],
    pressureTime: 0,
    unblockedRushers: 0,
    result: fumble ? { kind: 'fumble', yards: Math.max(0, yards), targetId: rb.id } : { kind: 'run', yards, targetId: rb.id },
    concepts: [design.scheme],
    suggestedLessons: ['boxCount', 'runSchemes', look.family],
  };
}

const lerpP = (a: Point, b: Point, f: number): Point => ({ x: a.x + (b.x - a.x) * clamp(f, 0, 1), y: a.y + (b.y - a.y) * clamp(f, 0, 1) });

/** Diagram geometry for a run play: the ball carrier's path and each blocker's direction. */
export function runDiagram(play: Play): { carrier: string; path: Point[]; blocks: { id: string; from: Point; to: Point; pull?: boolean }[] } {
  const design = play.run!;
  const dir = design.dir === 'L' ? -1 : 1;
  const rb = play.players.find((p) => p.role === 'RB')!;
  const qb = play.players.find((p) => p.role === 'QB')!;
  const holeX = dir * (design.scheme === 'power' ? 4.5 : 2.4);
  const path = [rb.align, { x: qb.align.x + dir * 0.6, y: qb.align.y + 0.6 }, { x: holeX, y: -0.3 }, { x: holeX + dir * 1, y: 5 }];
  const blocks: { id: string; from: Point; to: Point; pull?: boolean }[] = [];
  for (const p of play.players) {
    if (p.role === 'OL') {
      const backsideGuard = design.scheme === 'power' && Math.sign(p.align.x) === -dir && Math.abs(Math.abs(p.align.x) - 2.2) < 0.3;
      if (backsideGuard) blocks.push({ id: p.id, from: p.align, to: { x: holeX - dir * 0.5, y: 0.6 }, pull: true });
      else if (design.scheme === 'power') blocks.push({ id: p.id, from: p.align, to: { x: p.align.x - dir * 1.2, y: p.align.y + 1.3 } });
      else blocks.push({ id: p.id, from: p.align, to: { x: p.align.x + dir * 1.2, y: p.align.y + 1.3 } });
    } else if (p.role === 'TE' && p.assignment.kind !== 'route') {
      blocks.push({ id: p.id, from: p.align, to: { x: p.align.x - (design.scheme === 'power' ? dir : -dir) * 1.2, y: p.align.y + 1.3 } });
    } else if (p.role === 'WR') {
      blocks.push({ id: p.id, from: p.align, to: { x: p.align.x - Math.sign(p.align.x) * 0.6, y: p.align.y + 3 } });
    }
  }
  return { carrier: rb.id, path, blocks };
}
