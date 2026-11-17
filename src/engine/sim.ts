/**
 * The Chalkboard play engine.
 *
 * This is a rules engine with simple geometry, not a physics simulation. Every
 * defender follows a coaching rule (zone landmark + priority, man with a reaction
 * lag, pattern-match), receivers run timed routes, and the QB works his
 * progression. Because outcomes come from rules, the engine can explain them:
 * the diagnosis is the engine's own reasoning written in coaching language.
 */
import type {
  ConflictInfo,
  DefPlayerSpot,
  DefensiveLook,
  Frame,
  OffPlayerSpot,
  Play,
  PlayResult,
  Point,
  ReadWindow,
  RouteType,
  SimResult,
  TraceEvent,
} from '../model/types';
import { clamp, dist, rng, stepToward } from './geometry';
import { alignDefender, numberReceivers, resolveRef, type Numbering } from './formation';
import { ROUTES, routeWaypoints, timeRoute, type TimedRoute } from './routes';
import { clampToZone, inZone, zoneGeom, ZONE_NAME, ZONE_TEXT, type ZoneGeom } from './zones';
import { CONCEPTS, detectConcepts } from './concepts';
import { CONCEPT_VS_COVERAGE, HOW_TO_BEAT } from '../content/knowledge';

export const DT = 0.05;
/** How long the defense is simulated (long enough for deep throws to land). */
export const MAX_T = 6.0;

/** Tunable constants. Kept in one place so football logic stays readable. */
export const TUNING = {
  receiverSpeed: 7.0,
  breakCost: 0.22,
  backReleaseDelay: 0.25,
  zoneReact: 0.45,
  zoneLag: 0.3,
  manLag: 0.28,
  speed: { DL: 5.5, LB: 6.0, S: 6.6, CB: 6.9, NB: 6.7 } as Record<string, number>,
  /** How quickly a defender can change velocity (yd/s²). Momentum is why breaks create separation. */
  accel: { DL: 16, LB: 20, S: 24, CB: 26, NB: 25 } as Record<string, number>,
  manSpeedBonus: 0,
  readCost: 0.45,
  ballSpeed: 24,
  releaseTime: 0.15,
  throwThreshold: 1.8,
  hurryThreshold: 1.2,
  openSep: 2.5,
  tightSep: 1.2,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

interface Rec {
  spot: OffPlayerSpot;
  route?: RouteType;
  timed?: TimedRoute;
  protect: boolean;
}

type DefMode =
  | { kind: 'rush'; unblocked: boolean }
  | { kind: 'zone'; geom: ZoneGeom }
  | { kind: 'man'; targetId: string }
  | { kind: 'match'; targetId?: string; depth: number; geom: ZoneGeom; matched: boolean; matchedAt?: number };

interface Def {
  spot: DefPlayerSpot;
  align: Point;
  pos: Point;
  mode: DefMode;
  /** What he started as (match defenders change mode at runtime) */
  baseMode: DefMode['kind'];
  speed: number;
  threat?: string;
  rubbedAt?: number;
  rubbedBy?: string;
  /** Which receiver he was on at each frame (for the diagnosis) */
  threatLog: (string | undefined)[];
  /** Receivers in his zone at each frame (for conflict detection) */
  seenLog: string[][];
  /** Man leverage: lateral offset from his man (+ = toward the sideline) */
  leverage: number;
  /** Man depth offset (negative = trail underneath) */
  trail: number;
  seen: string[];
  vel: Point;
  accel: number;
}

export interface SimOptions {
  seed?: number;
  /** Player effects (ratings). Defaults are a neutral, average team. */
  players?: PlayerEffects;
}

export interface PlayerEffects {
  /** Seconds the QB needs per read (default TUNING.readCost). Slow processors take longer. */
  readCost?: number;
  /** Receiver speed in yd/s by slot id (default TUNING.receiverSpeed) */
  speedOf?: Record<string, number>;
  /** Completion modifier by slot id (e.g. +0.05 for great hands) */
  handsOf?: Record<string, number>;
  /** Completion modifier for the QB's accuracy */
  accuracy?: number;
}

export function simulate(play: Play, look: DefensiveLook, opts: SimOptions = {}): SimResult {
  const seed = opts.seed ?? 1;
  const rand = rng(seed);
  const n = numberReceivers(play);
  const qbSpot = play.players.find((p) => p.role === 'QB')!;

  // ---- Offense
  const recs = new Map<string, Rec>();
  for (const p of play.players) {
    if (p.role === 'OL' || p.role === 'QB') continue;
    if (p.assignment.kind === 'route') {
      const isBack = p.align.y <= -2.5;
      const timed = timeRoute(routeWaypoints(p.align, p.assignment.route, p.assignment.depth), p.assignment.route, {
        speed: opts.players?.speedOf?.[p.id] ?? TUNING.receiverSpeed,
        breakCost: TUNING.breakCost,
        releaseDelay: isBack ? TUNING.backReleaseDelay : p.role === 'TE' ? 0.1 : 0,
      });
      recs.set(p.id, { spot: p, route: p.assignment.route, timed, protect: false });
    } else {
      recs.set(p.id, { spot: p, protect: true });
    }
  }
  const runners = [...recs.values()].filter((r) => r.timed);
  const recPos = (id: string, t: number): Point => {
    const r = recs.get(id)!;
    return r.timed ? r.timed.position(Math.max(0, t)) : protectPos(r.spot, t);
  };

  // ---- Defense
  const strength = n.strength;
  const defs: Def[] = look.players.map((spot) => {
    const mode = resolveMode(spot, n, recs, strength);
    const align = defenderAlign(spot, mode, play, n, recs);
    let leverage = -0.7;
    if (mode.kind === 'man' || mode.kind === 'match') {
      const tid = mode.targetId;
      const tx = tid ? recs.get(tid)!.spot.align.x : 0;
      const o = tx < 0 ? -1 : 1;
      leverage = clamp((align.x - tx) * o, -1, 1);
    }
    return {
      spot,
      align,
      pos: { ...align },
      mode,
      baseMode: mode.kind,
      speed: TUNING.speed[spot.role] ?? 6.3,
      threatLog: [],
      seenLog: [],
      seen: [],
      vel: { x: 0, y: 0 },
      accel: TUNING.accel[spot.role] ?? 20,
      leverage,
      // 2-Man defenders trail underneath (they have safety help); Cover 1/0 defenders stay on top.
      trail: look.family === 'cover2man' ? -1.0 : 0.4,
    };
  });

  // ---- Protection
  const blockers = 5 + [...recs.values()].filter((r) => r.protect).length;
  const rushers = defs.filter((d) => d.mode.kind === 'rush');
  const unblocked = Math.max(0, rushers.length - blockers);
  // Second-level rushers (LBs, DBs) are the ones who come free.
  const freeRushers = [...rushers]
    .sort((a, b) => (a.spot.role === 'DL' ? 1 : 0) - (b.spot.role === 'DL' ? 1 : 0))
    .slice(0, unblocked);
  for (const d of freeRushers) (d.mode as { kind: 'rush'; unblocked: boolean }).unblocked = true;
  const pressureTime = unblocked > 0 ? 1.75 : clamp(2.9 + 0.3 * (blockers - rushers.length), 2.9, 3.8);

  // ---- QB
  const setTime = play.drop === 3 ? 0.9 : 1.35;
  const qbAlign = qbSpot.align;
  const qbSet = { x: qbAlign.x, y: qbAlign.y - (play.drop === 3 ? 1.5 : 3) };
  const qbPos = (t: number): Point => (t >= setTime ? { ...qbSet } : { x: qbAlign.x, y: qbAlign.y + (qbSet.y - qbAlign.y) * (t / setTime) });

  // ---------------------------------------------------------------------------
  // Run the defense through time
  // ---------------------------------------------------------------------------
  const steps = Math.round(MAX_T / DT);
  const defFrames: Point[][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i * DT;
    for (const d of defs) {
      d.seen = [];
      d.pos = stepDefender(d, t);
      d.threatLog.push(d.threat);
      d.seenLog.push(d.seen);
    }
    defFrames.push(defs.map((d) => ({ ...d.pos })));
  }

  function stepDefender(d: Def, t: number): Point {
    if (t === 0) return d.pos;
    const m = d.mode;
    if (m.kind === 'rush') {
      if (m.unblocked) {
        const target = qbPos(pressureTime);
        const v = dist(d.align, target) / pressureTime;
        return stepToward(d.pos, qbPos(t), v * DT * 1.05);
      }
      return stepToward(d.pos, { x: d.align.x * 0.75, y: -1.2 }, 3 * DT);
    }
    if (m.kind === 'match') {
      if (!m.matched && m.targetId) {
        const p = recPos(m.targetId, t - TUNING.zoneLag);
        const prev = recPos(m.targetId, t - TUNING.zoneLag - 0.2);
        const vertical = p.y - prev.y > Math.abs(p.x - prev.x) * 0.8;
        if (p.y > m.depth && vertical && t > TUNING.zoneReact) {
          m.matched = true;
          m.matchedAt = t;
        }
      }
      if (m.matched && m.targetId) return manStep(d, m.targetId, t);
      return zoneStep(d, m.geom, t);
    }
    if (m.kind === 'man') return manStep(d, m.targetId, t);
    return zoneStep(d, m.geom, t);
  }

  /** Move with momentum: velocity can only change by `accel` per second. */
  function move(d: Def, target: Point, maxSpeed: number): Point {
    const dx = target.x - d.pos.x;
    const dy = target.y - d.pos.y;
    const dd = Math.hypot(dx, dy);
    // Desired velocity: full speed toward the target, slowing as he arrives.
    const sp = Math.min(maxSpeed, dd / (DT * 3));
    const want = dd > 1e-6 ? { x: (dx / dd) * sp, y: (dy / dd) * sp } : { x: 0, y: 0 };
    let ax = want.x - d.vel.x;
    let ay = want.y - d.vel.y;
    const am = Math.hypot(ax, ay);
    const lim = d.accel * DT;
    if (am > lim) {
      ax = (ax / am) * lim;
      ay = (ay / am) * lim;
    }
    d.vel = { x: d.vel.x + ax, y: d.vel.y + ay };
    return { x: d.pos.x + d.vel.x * DT, y: d.pos.y + d.vel.y * DT };
  }

  function manStep(d: Def, targetId: string, t: number): Point {
    d.threat = targetId;
    const lagged = recPos(targetId, t - TUNING.manLag);
    const o = lagged.x < 0 ? -1 : 1;
    // Keep the leverage he aligned with. While his man is still pushing vertically,
    // keep the cushion (never come forward); drive on him only once he breaks.
    const prev = recPos(targetId, t - TUNING.manLag - 0.15);
    const pushingVertical = lagged.y - prev.y > 0.3;
    // Pattern-match (quarters) defenders carry verticals from on top.
    const trail = d.baseMode === 'match' ? 1.5 : d.trail;
    const cushionY = pushingVertical ? Math.max(lagged.y + trail, Math.min(d.pos.y, lagged.y + 3)) : lagged.y + trail;
    const target = { x: lagged.x + o * d.leverage, y: cushionY };
    let speed = d.speed + TUNING.manSpeedBonus;
    // Rubs: another receiver crossing through the defender's path slows him down.
    for (const r of runners) {
      if (r.spot.id === targetId) continue;
      const rp = recPos(r.spot.id, t);
      if (dist(rp, d.pos) < 1.6 && t > 0.6 && t < 3) {
        speed *= 0.35;
        if (d.rubbedAt === undefined) {
          d.rubbedAt = t;
          d.rubbedBy = r.spot.id;
        }
      }
    }
    return move(d, target, speed);
  }

  function zoneStep(d: Def, z: ZoneGeom, t: number): Point {
    if (t < TUNING.zoneReact) {
      d.threat = undefined;
      return move(d, z.landmark, d.speed * 0.85);
    }
    const seen = runners
      .map((r) => ({
        id: r.spot.id,
        p: recPos(r.spot.id, t - TUNING.zoneLag),
        prev: recPos(r.spot.id, t - TUNING.zoneLag - 0.15),
      }))
      .filter((c) => c.p.y > -0.5 && inZone(z, c.p, z.kind === 'deep' ? 0 : 1));
    d.seen = seen.map((c) => c.id);
    if (seen.length === 0) {
      d.threat = undefined;
      return move(d, z.idle ?? z.landmark, d.speed);
    }
    const score = (c: { p: Point; prev: Point }) => {
      if (z.kind === 'deep') return -c.p.y + 0.15 * dist(c.p, z.landmark);
      if (z.area === 'curlFlat' || z.area === 'flat') {
        // Widen to a receiver who is running to the flat; otherwise play what's closest.
        const vx = (c.p.x - c.prev.x) / 0.15;
        const outward = vx * Math.sign(z.landmark.x || 1);
        const flatThreat = c.p.y < 7 && outward > 3;
        return dist(c.p, z.landmark) - (flatThreat ? 8 : 0);
      }
      return dist(c.p, z.landmark);
    };
    seen.sort((a, b) => score(a) - score(b));
    let pick = seen[0];
    const current = seen.find((c) => c.id === d.threat);
    if (current && score(current) < score(pick) + 2.5) pick = current; // don't flip-flop
    d.threat = pick.id;

    let target: Point;
    if (z.kind === 'deep') {
      // Stay on top: deeper than the receiver, shaded toward him.
      target = { x: z.landmark.x * 0.25 + pick.p.x * 0.75, y: Math.max(pick.p.y + 3, z.landmark.y - 3) };
    } else {
      // Underneath: get in front of the receiver, between him and the QB.
      target = { x: z.landmark.x * 0.15 + pick.p.x * 0.85, y: z.landmark.y * 0.15 + pick.p.y * 0.85 - 0.5 };
    }
    return move(d, clampToZone(z, target, 3), d.speed);
  }

  const defAt = (di: number, t: number): Point => {
    const f = clamp(t / DT, 0, steps);
    const i0 = Math.floor(f);
    const i1 = Math.min(steps, i0 + 1);
    const a = defFrames[i0][di];
    const b = defFrames[i1][di];
    const k = f - i0;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  const coverIdx = defs.map((d, i) => (d.mode.kind === 'rush' ? -1 : i)).filter((i) => i >= 0);

  // ---------------------------------------------------------------------------
  // The throw window: how open is a receiver if the ball is released at t?
  // ---------------------------------------------------------------------------
  function windowAt(rid: string, t: number): ReadWindow {
    const qb = qbPos(t);
    let cp = recPos(rid, t + 0.5);
    let f = 0.5;
    for (let k = 0; k < 3; k++) {
      f = TUNING.releaseTime + dist(qb, cp) / TUNING.ballSpeed;
      cp = recPos(rid, t + f);
    }
    const catchT = Math.min(MAX_T, t + f);
    const tooLate = t + f > MAX_T - 0.1;
    const closeBonus = Math.min(1.4, 2.0 * Math.max(0, f - 0.5));
    let best = Infinity;
    let by: string | undefined;
    for (const i of coverIdx) {
      // Defenders break on the ball while it's in the air, but a defender who is
      // already in position can't be credited with closing ground twice.
      const raw = dist(defAt(i, catchT), cp);
      const dd = raw - Math.min(closeBonus, Math.max(0, raw - 0.8));
      if (dd < best) {
        best = dd;
        by = defs[i].spot.id;
      }
    }
    const sep = tooLate ? 0 : Math.max(0, Math.round(best * 10) / 10);
    return {
      receiverId: rid,
      t: Math.round(t * 100) / 100,
      separation: sep,
      openness: sep >= TUNING.openSep ? 'open' : sep >= TUNING.tightSep ? 'tight' : 'covered',
      coveredBy: by,
      catchPoint: cp,
    };
  }

  // ---------------------------------------------------------------------------
  // QB progression
  // ---------------------------------------------------------------------------
  const readCost = opts.players?.readCost ?? TUNING.readCost;
  const progression = play.progression.filter((id) => recs.get(id)?.timed);
  const reads: ReadWindow[] = [];
  let thrown: ReadWindow | undefined;
  let tq = setTime;
  for (const rid of progression) {
    const r = recs.get(rid)!;
    const tr = Math.max(tq, r.timed!.readyTime);
    if (tr > pressureTime) break;
    const w = windowAt(rid, tr);
    reads.push(w);
    const threshold = tr > pressureTime - 0.5 ? TUNING.hurryThreshold : TUNING.throwThreshold;
    if (w.separation >= threshold) {
      thrown = w;
      break;
    }
    tq = tr + readCost;
  }
  // Progression exhausted with time left: work back through it with a lower bar.
  let secondPass = false;
  while (!thrown && tq < pressureTime && progression.length) {
    secondPass = true;
    const options = progression
      .filter((id) => recs.get(id)!.timed!.readyTime <= tq)
      .map((id) => windowAt(id, tq))
      .sort((a, b) => b.separation - a.separation);
    if (options[0] && options[0].separation >= 1.5) {
      thrown = options[0];
      reads.push(options[0]);
      break;
    }
    tq += readCost;
  }

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------
  let result: PlayResult;
  let endT: number;
  let ball: { from: Point; to: Point; t0: number; t1: number } | undefined;
  if (thrown) {
    const sep = thrown.separation;
    const deep = thrown.catchPoint.y > 15;
    const skill = (opts.players?.handsOf?.[thrown.receiverId] ?? 0) + (opts.players?.accuracy ?? 0);
    // High school completion curve: a 2.5-yard window is about a coin flip; wide open is ~85%.
    const pComplete = clamp(0.05 + 0.2 * sep - (deep ? 0.1 : 0) + skill, 0.05, 0.88);
    const pInt = sep < 1.0 ? 0.14 : sep < 1.6 ? 0.05 : 0.01;
    const roll = rand();
    const from = qbPos(thrown.t);
    const flight = TUNING.releaseTime + dist(from, thrown.catchPoint) / TUNING.ballSpeed;
    ball = { from, to: thrown.catchPoint, t0: thrown.t, t1: thrown.t + flight };
    endT = Math.min(MAX_T, thrown.t + flight + 0.7);
    if (roll < pInt) result = { kind: 'interception', yards: 0, targetId: thrown.receiverId, throwTime: thrown.t };
    else if (roll < pInt + pComplete) {
      const deepestDef = Math.max(...coverIdx.map((i) => defAt(i, thrown!.t + flight).y));
      const behindNobody = thrown.catchPoint.y > deepestDef + 1;
      const yac = behindNobody ? 8 + rand() * 22 : clamp(sep * 0.9 + rand() * 3 - 1, 0, 15);
      result = {
        kind: 'complete',
        yards: Math.round(thrown.catchPoint.y + yac),
        targetId: thrown.receiverId,
        throwTime: thrown.t,
      };
    } else result = { kind: 'incomplete', yards: 0, targetId: thrown.receiverId, throwTime: thrown.t };
  } else {
    const sack = unblocked > 0 ? rand() < 0.75 : rand() < 0.35;
    result = sack ? { kind: 'sack', yards: -7 } : { kind: 'throwaway', yards: 0 };
    endT = Math.min(MAX_T, pressureTime + 0.4);
  }

  // ---------------------------------------------------------------------------
  // The "right answer": the best window anyone had before pressure arrived.
  // ---------------------------------------------------------------------------
  const windows: ReadWindow[] = [];
  for (const r of runners) {
    let best: ReadWindow | undefined;
    const t0 = Math.max(setTime, r.timed!.readyTime);
    const t1 = Math.min(pressureTime, 3.6);
    for (let t = t0; t <= t1 + 1e-9; t += 0.1) {
      const w = windowAt(r.spot.id, t);
      // Prefer earlier throws: take the first comfortably open window, else the best one.
      if (!best || w.separation > best.separation + 0.3) best = w;
      if (best.separation >= 3.5) break;
    }
    if (best) windows.push(best);
  }
  windows.sort((a, b) => b.separation - a.separation);
  const bestAnswer = windows[0] && windows[0].separation >= TUNING.tightSep ? windows[0] : null;
  const goodAnswers = bestAnswer
    ? windows.filter((w) => w.separation >= Math.max(TUNING.tightSep, bestAnswer.separation - 0.6)).map((w) => w.receiverId)
    : [];

  // ---------------------------------------------------------------------------
  // Frames for playback
  // ---------------------------------------------------------------------------
  const frames: Frame[] = [];
  const endStep = Math.round(endT / DT);
  const sackerIdx = defs.findIndex((d) => d.mode.kind === 'rush' && d.mode.unblocked);
  for (let i = 0; i <= endStep; i++) {
    const t = i * DT;
    const off: Record<string, Point> = {};
    for (const p of play.players) {
      if (p.role === 'QB') off[p.id] = qbPos(Math.min(t, thrown ? thrown.t : t));
      else if (p.role === 'OL') off[p.id] = { x: p.align.x, y: p.align.y - Math.min(1, t) * 1.2 };
      else off[p.id] = recPos(p.id, t);
    }
    const def: Record<string, Point> = {};
    defs.forEach((d, di) => (def[d.spot.id] = defFrames[i][di]));
    if (!thrown && result.kind === 'sack' && sackerIdx >= 0 && t >= pressureTime) {
      def[defs[sackerIdx].spot.id] = off[qbSpot.id];
    }
    let b: Point | undefined;
    if (ball) {
      if (t < ball.t0) b = off[qbSpot.id];
      else if (t <= ball.t1) {
        const k = (t - ball.t0) / (ball.t1 - ball.t0);
        b = { x: ball.from.x + (ball.to.x - ball.from.x) * k, y: ball.from.y + (ball.to.y - ball.from.y) * k };
      } else b = result.kind === 'complete' || result.kind === 'interception' ? undefined : ball.to;
    } else b = off[qbSpot.id];
    frames.push({ t: Math.round(t * 100) / 100, off, def, ball: b });
  }

  // ---------------------------------------------------------------------------
  // Diagnosis
  // ---------------------------------------------------------------------------
  const concepts = detectConcepts(play);
  /**
   * Conflicts that mattered: at the moment of the throw (or of the best window),
   * which zone defender had two receivers in his area and left one of them?
   */
  const conflicts: (ConflictInfo & { t: number })[] = [];
  const keyMoments = [thrown, bestAnswer].filter((w): w is ReadWindow => !!w);
  for (const w of keyMoments) {
    const i = Math.min(steps, Math.round(w.t / DT));
    for (const d of defs) {
      const seen = d.seenLog[i] ?? [];
      const chose = d.threatLog[i];
      if (seen.length < 2 || !chose || !seen.includes(w.receiverId) || chose === w.receiverId) continue;
      // Compare where the two receivers are when the ball arrives.
      const tc = w.t + TUNING.releaseTime + dist(qbPos(w.t), w.catchPoint) / TUNING.ballSpeed;
      const a = recPos(chose, tc), b = w.catchPoint;
      if (dist(a, b) < 4) continue;
      if (conflicts.some((k) => k.defenderId === d.spot.id && k.freed === w.receiverId)) continue;
      conflicts.push({
        t: w.t,
        defenderId: d.spot.id,
        receivers: [chose, w.receiverId],
        chose,
        freed: w.receiverId,
        stretch: Math.abs(a.y - b.y) > Math.abs(a.x - b.x) ? 'high-low' : 'horizontal',
      });
    }
  }
  const ctx: DiagContext = {
    play, look, n, recs, defs, reads, thrown, result, pressureTime, unblocked, blockers,
    rushers: rushers.length, setTime, windows, bestAnswer, goodAnswers, concepts, conflicts,
    secondPass, progression,
  };
  const trace = buildTrace(ctx);
  const suggested = new Set<string>([look.family]);
  concepts.forEach((c) => suggested.add(CONCEPTS[c].topic));
  if (unblocked > 0) suggested.add('protection');
  if (conflicts.length) suggested.add('conflict');
  if (bestAnswer && thrown?.receiverId !== bestAnswer.receiverId) suggested.add('progression');

  return {
    playId: play.id,
    lookId: look.id,
    seed,
    frames,
    trace,
    reads,
    bestAnswer,
    goodAnswers,
    windows,
    conflicts: conflicts.map(({ t: _t, ...c }) => c),
    pressureTime,
    unblockedRushers: unblocked,
    result,
    concepts,
    suggestedLessons: [...suggested],
  };
}

function protectPos(spot: OffPlayerSpot, t: number): Point {
  const k = Math.min(1, t / 0.6);
  const o = spot.align.x < 0 ? -1 : 1;
  return { x: spot.align.x + o * 1.2 * k, y: spot.align.y + (spot.align.y < -2 ? 1.2 : -1) * k };
}

/** Where a defender lines up. A man defender whose rule sent him to a different receiver (e.g. #3 in trips) aligns on him. */
function defenderAlign(spot: DefPlayerSpot, mode: DefMode, play: Play, n: Numbering, recs: Map<string, Rec>): Point {
  const align = alignDefender(spot, play, n);
  if (mode.kind === 'man' && spot.align.kind === 'abs') {
    const r = recs.get(mode.targetId)!;
    if (r.spot.align.y > -2.5) {
      const o = r.spot.align.x < 0 ? -1 : 1;
      return { x: r.spot.align.x - o * 0.8, y: Math.min(spot.align.y, 5) };
    }
  }
  return align;
}

function resolveMode(spot: DefPlayerSpot, n: Numbering, recs: Map<string, Rec>, strength: 'L' | 'R'): DefMode {
  const a = spot.assignment;
  switch (a.kind) {
    case 'rush':
      return { kind: 'rush', unblocked: false };
    case 'zone':
      return { kind: 'zone', geom: zoneGeom(a.zone, strength) };
    case 'man': {
      for (const target of a.targets) {
        const id = resolveRef(target, n);
        if (id && recs.get(id)?.timed) return { kind: 'man', targetId: id };
      }
      if (a.fallback === 'rush') return { kind: 'rush', unblocked: false };
      return { kind: 'zone', geom: zoneGeom(a.fallback, strength) };
    }
    case 'match': {
      const id = resolveRef(a.target, n);
      return {
        kind: 'match',
        targetId: id && recs.get(id)?.timed ? id : undefined,
        depth: a.depth,
        geom: zoneGeom(a.zone, strength),
        matched: false,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Trace / diagnosis
// ---------------------------------------------------------------------------

interface DiagContext {
  play: Play;
  look: DefensiveLook;
  n: Numbering;
  recs: Map<string, Rec>;
  defs: Def[];
  reads: ReadWindow[];
  thrown?: ReadWindow;
  result: PlayResult;
  pressureTime: number;
  unblocked: number;
  blockers: number;
  rushers: number;
  setTime: number;
  windows: ReadWindow[];
  bestAnswer: ReadWindow | null;
  goodAnswers: string[];
  concepts: string[];
  conflicts: (ConflictInfo & { t: number })[];
  secondPass: boolean;
  progression: string[];
}

const fmt = (x: number) => x.toFixed(1);

function buildTrace(c: DiagContext): TraceEvent[] {
  const ev: TraceEvent[] = [];
  const recName = (id: string) => {
    const r = c.recs.get(id);
    const route = r?.route ? ROUTES[r.route].label.toLowerCase() : 'protect';
    const num = c.n.labelOf[id];
    return `${id} (${num ? num + ', ' : ''}${route})`;
  };
  const def = (id?: string) => c.defs.find((d) => d.spot.id === id);
  const defName = (id?: string) => {
    const d = def(id);
    return d ? `the ${d.spot.name}` : 'a defender';
  };
  const describeDef = (d: Def): string => {
    const m = d.mode;
    if (m.kind === 'rush') return 'rushed the passer';
    if (m.kind === 'man') return `played man on ${recName(m.targetId)}`;
    if (m.kind === 'match') {
      return m.matched && m.targetId
        ? `matched ${recName(m.targetId)} when he went vertical (quarters rule)`
        : `stayed in his ${ZONE_NAME[m.geom.area]} because his key (#2) didn't go vertical`;
    }
    return `dropped to the ${ZONE_NAME[m.geom.area]} (${ZONE_TEXT[m.geom.area]})`;
  };

  // ---- Pre-snap
  const shellText: Record<string, string> = {
    '2-high': 'Two safeties deep: think Cover 2, Tampa 2, Cover 4 or 2-Man. The middle of the field is open (MOFO).',
    '1-high': 'One safety in the middle: think Cover 3 or Cover 1. The middle of the field is closed (MOFC).',
    '0-high': 'No deep safety: expect Cover 0 and an all-out blitz. There is no help behind anyone.',
  };
  ev.push({ t: 0, kind: 'presnap', text: `Shell: ${c.look.shell}. ${shellText[c.look.shell]}`, topics: ['shell'] });
  ev.push({ t: 0, kind: 'presnap', text: `Coverage: ${c.look.name}. ${c.look.summary}`, topics: [c.look.family] });

  // ---- Protection
  if (c.unblocked > 0) {
    ev.push({
      t: 0, kind: 'protection',
      text: `${c.rushers} rushers vs ${c.blockers} blockers: ${c.unblocked} rusher${c.unblocked > 1 ? 's' : ''} came free. The QB had about ${fmt(c.pressureTime)}s, so the ball had to come out "hot" before then.`,
      defenders: c.defs.filter((d) => d.mode.kind === 'rush' && d.mode.unblocked).map((d) => d.spot.id),
      topics: ['protection'],
    });
  } else {
    ev.push({
      t: 0, kind: 'protection',
      text: `${c.rushers} rushers vs ${c.blockers} blockers: protection held, giving the QB about ${fmt(c.pressureTime)}s.${c.blockers - c.rushers >= 3 ? ' You kept extra blockers in against a 4-man rush; that\'s a receiver you could have used.' : ''}`,
      topics: ['protection'],
    });
  }

  // ---- Conflicts (the heart of most pass concepts)
  for (const k of c.conflicts) {
    const d = def(k.defenderId)!;
    ev.push({
      t: k.t, kind: 'conflict',
      text: `Conflict: ${defName(k.defenderId)} (${ZONE_NAME[(d.mode as { geom: ZoneGeom }).geom?.area ?? 'robber']}) had ${recName(k.receivers[0])} and ${recName(k.receivers[1])} in his area: a ${k.stretch} stretch. He took ${k.chose}, which left ${k.freed} for someone else.`,
      receivers: k.receivers, defenders: [k.defenderId], topics: ['conflict'],
    });
  }
  for (const d of c.defs) {
    if (d.rubbedAt !== undefined && d.mode.kind === 'man') {
      ev.push({
        t: d.rubbedAt, kind: 'defender',
        text: `Rub: ${defName(d.spot.id)}, trailing ${d.mode.targetId} in man coverage, got picked by ${d.rubbedBy}'s route crossing his path.`,
        defenders: [d.spot.id], receivers: [d.mode.targetId, d.rubbedBy!], topics: ['mesh'],
      });
    }
  }

  // ---- Reads
  c.reads.forEach((w, i) => {
    const cov = def(w.coveredBy);
    const verdict =
      w.openness === 'open' ? 'OPEN' : w.openness === 'tight' ? 'tight window' : 'covered';
    const why = cov ? ` Closest defender: ${defName(cov.spot.id)}, who ${describeDef(cov)}.` : '';
    ev.push({
      t: w.t, kind: 'read',
      text: `Read ${i + 1}${c.secondPass && i === c.reads.length - 1 && c.thrown ? ' (back through the progression)' : ''}: ${recName(w.receiverId)} at ${fmt(w.t)}s: ${verdict}, ${fmt(w.separation)} yds of separation at the catch point.${why}`,
      receivers: [w.receiverId], defenders: cov ? [cov.spot.id] : [],
    });
  });

  // ---- Result
  const r = c.result;
  const resultText: Record<string, string> = {
    complete: `Complete to ${r.targetId} for ${r.yards} yards.`,
    incomplete: `Incomplete, intended for ${r.targetId}.`,
    interception: `Intercepted, intended for ${r.targetId}. Throwing into a ${c.thrown ? fmt(c.thrown.separation) : '?'}-yard window is a gamble.`,
    sack: `Sacked for ${-r.yards} yards. The QB never found an open receiver before pressure arrived.`,
    throwaway: 'Thrown away. Nothing came open before pressure arrived.',
  };
  ev.push({ t: r.throwTime ?? c.pressureTime, kind: 'result', text: resultText[r.kind], receivers: r.targetId ? [r.targetId] : [] });

  // ---- Why: the deciding factor
  const target = c.thrown;
  if (target) {
    const freedBy = c.conflicts.find((k) => k.freed === target.receiverId);
    if (freedBy) {
      ev.push({
        t: target.t, kind: 'scheme',
        text: `${c.result.kind === 'complete' ? 'Why it worked' : 'The read was right'}: ${target.receiverId} was open because ${defName(freedBy.defenderId)} was put in conflict and chose ${freedBy.chose}. This is what the concept is designed to do: make one defender wrong.${c.result.kind === 'complete' ? '' : ' Good decisions don\'t always produce completions; over many reps, this read wins.'}`,
        defenders: [freedBy.defenderId], receivers: [target.receiverId], topics: ['conflict'],
      });
    } else if (target.openness !== 'open') {
      ev.push({
        t: target.t, kind: 'scheme',
        text: `Why it was hard: the throw went into a ${target.openness === 'tight' ? 'tight' : 'covered'} window. ${defName(target.coveredBy)} was in position.`,
        defenders: target.coveredBy ? [target.coveredBy] : [],
      });
    }
  }

  // ---- Adjustments
  const best = c.bestAnswer;
  if (best && (!target || best.receiverId !== target.receiverId) && best.separation - (target?.separation ?? 0) > 0.8) {
    const pos = c.progression.indexOf(best.receiverId);
    ev.push({
      t: best.t, kind: 'adjustment',
      text: `Best answer vs this look: ${recName(best.receiverId)} had ${fmt(best.separation)} yds of separation at ${fmt(best.t)}s.${pos >= 0 ? ` He was read #${pos + 1} in your progression; against ${c.look.name}, consider reading him earlier, or build the read around the defender who covers him.` : ' He wasn\'t in your progression at all.'}`,
      receivers: [best.receiverId], topics: ['progression'],
    });
  }
  if (!best) {
    ev.push({
      t: 0, kind: 'adjustment',
      text: `Nothing in this play got open against ${c.look.name}. ${HOW_TO_BEAT[c.look.family]}`,
      topics: [c.look.family],
    });
  }
  if (c.unblocked > 0) {
    const quick = [...c.recs.values()].filter((r) => r.timed && r.timed.readyTime < c.pressureTime - 0.2);
    ev.push({
      t: 0, kind: 'adjustment',
      text: quick.length
        ? `Against pressure, your hot options were ${quick.map((r) => r.spot.id).join(', ')}: routes that are ready before ${fmt(c.pressureTime)}s. Put one of them first in the progression, or keep a back in to block.`
        : `No route in this play is ready before the free rusher arrives (${fmt(c.pressureTime)}s). Add a hot route (slant, quick out, hitch) or keep the back in to block.`,
      topics: ['protection'],
    });
  }
  for (const id of c.concepts) {
    const fit = CONCEPT_VS_COVERAGE[id]?.[c.look.family];
    if (fit) {
      ev.push({
        t: 0, kind: 'adjustment',
        text: `${CONCEPTS[id].name} vs ${c.look.name} (${fit.fit === 'good' ? 'a classic answer' : fit.fit === 'ok' ? 'workable' : 'built to stop it'}): ${fit.note}`,
        topics: [CONCEPTS[id].topic, c.look.family],
      });
    }
  }
  return ev;
}

// ---------------------------------------------------------------------------
// Pre-snap picture (for diagrams and the editor): where each defender lines up
// against this formation, and what his rule is.
// ---------------------------------------------------------------------------
export interface PresnapDefender {
  spot: DefPlayerSpot;
  pos: Point;
  kind: 'rush' | 'zone' | 'man' | 'match';
  zone?: ZoneGeom;
  manTarget?: string;
  rule: string;
}

export function presnap(play: Play, look: DefensiveLook): PresnapDefender[] {
  const n = numberReceivers(play);
  const recs = new Map<string, Rec>();
  for (const p of play.players) {
    if (p.role === 'OL' || p.role === 'QB') continue;
    recs.set(p.id, { spot: p, protect: p.assignment.kind !== 'route', timed: p.assignment.kind === 'route' ? ({} as TimedRoute) : undefined });
  }
  return look.players.map((spot) => {
    const mode = resolveMode(spot, n, recs, n.strength);
    const pos = defenderAlign(spot, mode, play, n, recs);
    const label = (id?: string) => (id ? `${id} (${n.labelOf[id] ?? ''})` : '');
    switch (mode.kind) {
      case 'rush':
        return { spot, pos, kind: 'rush', rule: 'Rush the passer' };
      case 'zone':
        return { spot, pos, kind: 'zone', zone: mode.geom, rule: `Zone: ${ZONE_TEXT[mode.geom.area]}` };
      case 'man':
        return { spot, pos, kind: 'man', manTarget: mode.targetId, rule: `Man on ${label(mode.targetId)}` };
      case 'match':
        return {
          spot, pos, kind: 'match', zone: mode.geom, manTarget: mode.targetId,
          rule: mode.targetId
            ? `Match: carry ${label(mode.targetId)} if he goes vertical, otherwise ${ZONE_NAME[mode.geom.area]}`
            : `Zone: ${ZONE_TEXT[mode.geom.area]}`,
        };
    }
  });
}
