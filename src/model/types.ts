/**
 * Core data model for Chalkboard.
 *
 * Coordinate system (yards):
 *   x = lateral position. 0 = the ball. Negative = offense's left, positive = offense's right.
 *       The field is 53.33 yards wide, so sidelines are at about ±26.67.
 *   y = depth relative to the line of scrimmage. Positive = downfield, negative = offensive backfield.
 *
 * The editor and the simulation engine share these types. Plays are stored as
 * football meaning (route types, depths, read order), never as freehand drawings,
 * so the engine can reason about them and explain what happened.
 */

export interface Point {
  x: number;
  y: number;
}

export type Side = 'L' | 'R';

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

/** Lightweight ratings (0-100). In the MVP they only nudge outcomes; play design dominates. */
export interface Ratings {
  speed: number;
  hands: number;
  routeRunning: number;
  strength: number;
  footballIQ: number;
  /** QB only */
  accuracy?: number;
  /** QB only: how fast he processes reads */
  processing?: number;
  /** Defenders only */
  coverage?: number;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  year: 'FR' | 'SO' | 'JR' | 'SR';
  ratings: Ratings;
}

// ---------------------------------------------------------------------------
// Offense
// ---------------------------------------------------------------------------

export type OffRole = 'OL' | 'QB' | 'RB' | 'TE' | 'WR';

/**
 * Route library. Each route is a rule the engine can expand into a path
 * from wherever the receiver lines up.
 */
export type RouteType =
  | 'go'
  | 'seam'
  | 'hitch'
  | 'slant'
  | 'quickOut'
  | 'out'
  | 'flat'
  | 'arrow'
  | 'curl'
  | 'stick'
  | 'dig'
  | 'corner'
  | 'post'
  | 'drag'
  | 'wheel'
  | 'swing';

export type Assignment =
  | { kind: 'route'; route: RouteType; depth?: number }
  | { kind: 'protect' }
  | { kind: 'block' } // offensive line
  | { kind: 'qb' };

export interface OffPlayerSpot {
  /** Stable slot id within a play, e.g. "X", "Z", "H", "Y", "RB", "QB", "LT" */
  id: string;
  role: OffRole;
  align: Point;
  assignment: Assignment;
}

export interface Play {
  id: string;
  name: string;
  formation: string;
  /** Number of steps in the QB drop: 3 = quick game, 5 = intermediate */
  drop: 3 | 5;
  players: OffPlayerSpot[];
  /** Read order: list of player slot ids */
  progression: string[];
  /** Coaching notes: why this play exists */
  notes: string;
  /** Short coaching points you would tell players when installing it */
  teachingPoints: string[];
  /** Template plays come with the game; the player's own plays are not templates */
  isTemplate?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// ---------------------------------------------------------------------------
// Defense
// ---------------------------------------------------------------------------

export type DefRole = 'DL' | 'LB' | 'CB' | 'S' | 'NB';

/** S = strong side (more receivers), W = weak side. L/R are absolute. */
export type SideRef = Side | 'S' | 'W';

/**
 * Zone areas the defense can drop into. Landmarks and boundaries live in
 * engine/zones.ts. Side-less areas (deepMiddle, hookMiddle, tampaMiddle, robber)
 * ignore `side`.
 */
export type ZoneArea =
  | 'deepThird'
  | 'deepMiddle'
  | 'deepHalf'
  | 'deepQuarterOut'
  | 'deepQuarterIn'
  | 'flat'
  | 'curlFlat'
  | 'hookCurl'
  | 'hookMiddle'
  | 'tampaMiddle'
  | 'robber';

export interface ZoneRef {
  area: ZoneArea;
  side?: SideRef;
}

/** Receivers are numbered from the sideline in: #1 is the widest on that side. */
export interface ReceiverRef {
  side: SideRef;
  number: 1 | 2 | 3;
}

export type DefAssignment =
  | { kind: 'rush' }
  | { kind: 'zone'; zone: ZoneRef }
  /**
   * Man coverage on the first target in the list that exists in this formation.
   * If none exist (or the back stays in to block), play `fallback` instead:
   * a zone, or 'rush' (a "green dog" blitz when his man blocks).
   */
  | { kind: 'man'; targets: Array<ReceiverRef | 'RB'>; fallback: ZoneRef | 'rush' }
  /**
   * Pattern matching (Quarters): play man on `target` if he goes vertical
   * past `depth` yards; otherwise play `zone`.
   */
  | { kind: 'match'; target: ReceiverRef; depth: number; zone: ZoneRef };

/**
 * Alignment rules let one defensive look adjust to any formation.
 * For `abs`, positive x means toward the strong side.
 */
export type DefAlign =
  | { kind: 'abs'; x: number; y: number }
  /** Line up over a receiver. dx > 0 means shaded outside him. */
  | { kind: 'over'; target: ReceiverRef; dx: number; y: number; fallbackX: number }
  /** Line up halfway between the tackle box and #1 (the "apex"). */
  | { kind: 'apex'; side: SideRef; y: number };

export interface DefPlayerSpot {
  id: string;
  /** Short diagram label, e.g. "C", "FS", "SS", "M", "W", "N", "E", "T" */
  label: string;
  /** Name used in feedback text, e.g. "strong corner", "Mike linebacker" */
  name: string;
  role: DefRole;
  align: DefAlign;
  assignment: DefAssignment;
}

export type Shell = '0-high' | '1-high' | '2-high';

export interface DefensiveLook {
  id: string;
  name: string;
  family: CoverageFamily;
  front: string;
  shell: Shell;
  players: DefPlayerSpot[];
  /** How a coordinator identifies it before the snap */
  presnapKeys: string[];
  /** Plain-language summary */
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export type CoverageFamily =
  | 'cover0'
  | 'cover1'
  | 'cover2'
  | 'cover2man'
  | 'cover3'
  | 'cover4'
  | 'tampa2';

// ---------------------------------------------------------------------------
// Simulation output
// ---------------------------------------------------------------------------

export type Openness = 'open' | 'tight' | 'covered';

export interface Frame {
  t: number;
  off: Record<string, Point>;
  def: Record<string, Point>;
  ball?: Point;
}

export type TraceKind =
  | 'presnap'
  | 'protection'
  | 'defender'
  | 'conflict'
  | 'read'
  | 'throw'
  | 'result'
  | 'adjustment'
  | 'scheme';

/** One step of the engine's reasoning, written in coaching language. */
export interface TraceEvent {
  t: number;
  kind: TraceKind;
  text: string;
  receivers?: string[];
  defenders?: string[];
  /** Topic ids this event teaches (link into the Classroom) */
  topics?: string[];
}

export interface ReadWindow {
  receiverId: string;
  /** When the ball could be thrown */
  t: number;
  /** Yards of separation at the catch point */
  separation: number;
  openness: Openness;
  /** Closest defender at the catch point */
  coveredBy?: string;
  catchPoint: Point;
}

export interface ConflictInfo {
  defenderId: string;
  receivers: string[];
  chose: string;
  freed: string;
  stretch: 'high-low' | 'horizontal';
}

export type PlayResultKind =
  | 'complete'
  | 'incomplete'
  | 'interception'
  | 'sack'
  | 'throwaway';

export interface PlayResult {
  kind: PlayResultKind;
  yards: number;
  targetId?: string;
  throwTime?: number;
}

export interface SimResult {
  playId: string;
  lookId: string;
  seed: number;
  frames: Frame[];
  trace: TraceEvent[];
  /** What the QB saw at each read in the progression */
  reads: ReadWindow[];
  /** The best window available to any receiver during the play (the "right answer") */
  bestAnswer: ReadWindow | null;
  /** Every receiver whose best window was nearly as good as the best answer */
  goodAnswers: string[];
  /** Best window found for each receiver (for the diagnosis table) */
  windows: ReadWindow[];
  conflicts: ConflictInfo[];
  pressureTime: number;
  unblockedRushers: number;
  result: PlayResult;
  /** Concepts detected in the play */
  concepts: string[];
  /** Topics to study, based on this rep */
  suggestedLessons: string[];
}

// ---------------------------------------------------------------------------
// Learning and mastery
// ---------------------------------------------------------------------------

export type EvidenceSource = 'prediction' | 'lessonCheck' | 'diagnosis';

/** One piece of evidence that the person knows (or doesn't yet know) something. */
export interface MasteryEvidence {
  topic: string;
  correct: boolean;
  source: EvidenceSource;
  at: number;
  detail?: string;
}
