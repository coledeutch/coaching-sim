import type { Point, RouteType } from '../model/types';
import { clampToField, polyline, pointAt, type Polyline } from './geometry';

export type RouteLevel = 'short' | 'intermediate' | 'deep';
export type RouteStress = 'vertical' | 'horizontal' | 'both';

export interface RouteDef {
  type: RouteType;
  label: string;
  description: string;
  level: RouteLevel;
  stress: RouteStress;
  /** Default break depth in yards (where the route "declares" itself) */
  defaultDepth: number;
  minDepth: number;
  maxDepth: number;
  /** Index of the waypoint (after the start) where the route breaks */
  breakIndex: number;
  /** Time after the break point before the ball can be thrown (negative = throw it on the run, before the break) */
  settle: number;
  /** For backfield / slot players */
  backfieldOk: boolean;
}

export const ROUTES: Record<RouteType, RouteDef> = {
  go: { type: 'go', label: 'Go', description: 'Win vertically. Stack the defender, then find the ball over your outside shoulder.', level: 'deep', stress: 'vertical', defaultDepth: 16, minDepth: 14, maxDepth: 20, breakIndex: 1, settle: 0.3, backfieldOk: false },
  seam: { type: 'seam', label: 'Seam', description: 'Vertical route from an inside receiver, run up the seam between the hash and the numbers.', level: 'deep', stress: 'vertical', defaultDepth: 14, minDepth: 12, maxDepth: 18, breakIndex: 1, settle: 0.25, backfieldOk: false },
  hitch: { type: 'hitch', label: 'Hitch', description: 'Push to 6, snap back to 5 facing the QB. Ball should be out on the plant.', level: 'short', stress: 'horizontal', defaultDepth: 6, minDepth: 5, maxDepth: 8, breakIndex: 2, settle: 0.05, backfieldOk: false },
  slant: { type: 'slant', label: 'Slant', description: 'Three hard steps, break inside at 45°. Win inside leverage and catch in front of the linebackers.', level: 'short', stress: 'horizontal', defaultDepth: 3, minDepth: 2, maxDepth: 5, breakIndex: 1, settle: 0.35, backfieldOk: false },
  quickOut: { type: 'quickOut', label: 'Quick Out', description: 'Speed out at 5. Flatten to the sideline; ball is out on the break.', level: 'short', stress: 'horizontal', defaultDepth: 5, minDepth: 4, maxDepth: 6, breakIndex: 1, settle: 0.3, backfieldOk: false },
  out: { type: 'out', label: 'Out', description: 'Stem to 10-12, sink the hips, and break flat to the sideline.', level: 'intermediate', stress: 'horizontal', defaultDepth: 10, minDepth: 8, maxDepth: 14, breakIndex: 1, settle: 0.4, backfieldOk: false },
  flat: { type: 'flat', label: 'Flat', description: 'Get width fast and arrive in the flat at 2-3 yards. Makes the flat defender choose.', level: 'short', stress: 'horizontal', defaultDepth: 2, minDepth: 1, maxDepth: 4, breakIndex: 1, settle: 0.4, backfieldOk: true },
  arrow: { type: 'arrow', label: 'Arrow', description: 'Angle straight to the flat at 4-5 yards, outrunning inside defenders.', level: 'short', stress: 'horizontal', defaultDepth: 5, minDepth: 3, maxDepth: 6, breakIndex: 1, settle: -0.4, backfieldOk: true },
  curl: { type: 'curl', label: 'Curl', description: 'Push vertical to 12, turn back inside toward the QB, and settle in the window.', level: 'intermediate', stress: 'vertical', defaultDepth: 12, minDepth: 10, maxDepth: 14, breakIndex: 2, settle: 0.05, backfieldOk: false },
  stick: { type: 'stick', label: 'Stick', description: 'Push to 6 and turn out. Sit vs zone, keep running away vs man.', level: 'short', stress: 'horizontal', defaultDepth: 6, minDepth: 5, maxDepth: 7, breakIndex: 2, settle: 0.05, backfieldOk: false },
  dig: { type: 'dig', label: 'Dig', description: 'Stem to 12, break flat inside, and run across the field behind the linebackers.', level: 'intermediate', stress: 'horizontal', defaultDepth: 12, minDepth: 10, maxDepth: 15, breakIndex: 1, settle: 0.45, backfieldOk: false },
  corner: { type: 'corner', label: 'Corner', description: 'Stem to 10-12, break at 45° to the pylon. Attacks the area behind the flat defender.', level: 'deep', stress: 'both', defaultDepth: 10, minDepth: 8, maxDepth: 12, breakIndex: 1, settle: 0.55, backfieldOk: false },
  post: { type: 'post', label: 'Post', description: 'Stem to 10-12, break at 45° to the far goalpost. Attacks the deep middle.', level: 'deep', stress: 'vertical', defaultDepth: 10, minDepth: 8, maxDepth: 14, breakIndex: 1, settle: 0.6, backfieldOk: false },
  drag: { type: 'drag', label: 'Drag', description: 'Cross the formation at 2-3 yards, underneath the linebackers. Run away from man, settle in zone holes.', level: 'short', stress: 'horizontal', defaultDepth: 2, minDepth: 1, maxDepth: 4, breakIndex: 1, settle: 0.6, backfieldOk: false },
  wheel: { type: 'wheel', label: 'Wheel', description: 'Start to the flat, then turn up the sideline. Punishes defenders who jump the flat.', level: 'deep', stress: 'vertical', defaultDepth: 3, minDepth: 2, maxDepth: 4, breakIndex: 2, settle: 0.5, backfieldOk: true },
  swing: { type: 'swing', label: 'Swing', description: 'Back bows out to the flat behind the line. A safe outlet that stretches the defense horizontally.', level: 'short', stress: 'horizontal', defaultDepth: 0, minDepth: -1, maxDepth: 1, breakIndex: 1, settle: 0.4, backfieldOk: true },
};

export const ROUTE_ORDER: RouteType[] = [
  'hitch', 'slant', 'quickOut', 'stick', 'flat', 'arrow', 'drag', 'swing',
  'out', 'curl', 'dig', 'corner', 'post', 'go', 'seam', 'wheel',
];

/**
 * Which way is "outside" for a receiver: toward the sideline he's closest to.
 * Players aligned at x = 0 (a back directly behind the QB) release to the right.
 */
export const outSign = (align: Point) => (align.x < 0 ? -1 : 1);

/** Expand a route rule into waypoints from the receiver's alignment. */
export function routeWaypoints(align: Point, route: RouteType, depthOverride?: number): Point[] {
  const def = ROUTES[route];
  const d = depthOverride ?? def.defaultDepth;
  const o = outSign(align);
  const x = align.x;
  const start = { ...align };
  // Receivers on the line start from the LOS; backs start in the backfield.
  const y0 = Math.max(align.y, 0);
  const pts: Point[] = (() => {
    switch (route) {
      case 'go':
        return [start, { x, y: d }, { x, y: 40 }];
      case 'seam':
        return [start, { x, y: d }, { x: x - o * 1, y: 40 }];
      case 'hitch':
        return [start, { x, y: d + 0.5 }, { x: x - o * 0.5, y: d - 0.5 }];
      case 'slant':
        return [start, { x, y: d }, { x: x - o * 9, y: d + 5 }, { x: x - o * 22, y: d + 12 }];
      case 'quickOut':
        return [start, { x, y: d }, { x: x + o * 12, y: d - 0.5 }];
      case 'out':
        return [start, { x, y: d }, { x: x + o * 12, y: d - 1 }];
      case 'flat':
        return [start, { x: x + o * 3, y: Math.max(y0, 0) + d }, { x: x + o * 14, y: d + 1 }];
      case 'arrow':
        return [start, { x: x + o * 7, y: d }, { x: x + o * 15, y: d + 1 }];
      case 'curl':
        return [start, { x, y: d }, { x: x - o * 0.5, y: d + 0.5 }, { x: x - o * 2, y: d - 1.5 }];
      case 'stick':
        return [start, { x, y: d }, { x, y: d + 0.3 }, { x: x + o * 1.5, y: d - 0.5 }];
      case 'dig':
        return [start, { x, y: d }, { x: x - o * 16, y: d }, { x: x - o * 30, y: d }];
      case 'corner':
        return [start, { x, y: d }, { x: x + o * 8, y: d + 7 }, { x: x + o * 13, y: d + 11 }];
      case 'post':
        return [start, { x, y: d }, { x: x - o * 8, y: d + 9 }, { x: x - o * 14, y: d + 20 }];
      case 'drag':
        return [start, { x: x - o * 2, y: d }, { x: x - o * 18, y: d + 0.5 }, { x: x - o * 30, y: d + 0.5 }];
      case 'wheel':
        return [start, { x: x + o * 5, y: Math.max(y0, 0) + 1 }, { x: x + o * 9, y: d + 1 }, { x: x + o * 10, y: 40 }];
      case 'swing':
        return [start, { x: x + o * 4, y: align.y + 0.5 }, { x: x + o * 10, y: d + 0.5 }, { x: x + o * 14, y: d + 1.5 }];
    }
  })();
  return pts.map(clampToField);
}

/** A route with timing attached: the receiver's position at any time after the snap. */
export interface TimedRoute {
  path: Polyline;
  /** Seconds after the snap the receiver reaches each waypoint */
  times: number[];
  /** Seconds after the snap the route breaks (declares itself) */
  breakTime: number;
  /** Earliest time the ball should be thrown to it */
  readyTime: number;
  position: (t: number) => Point;
}

export interface TimingParams {
  /** Receiver speed in yards/second */
  speed: number;
  /** Seconds lost per 90° of direction change */
  breakCost: number;
  /** Delay off the snap (backs who check-release, etc.) */
  releaseDelay: number;
}

export function timeRoute(waypoints: Point[], route: RouteType, p: TimingParams): TimedRoute {
  const def = ROUTES[route];
  const pl = polyline(waypoints);
  const times: number[] = [p.releaseDelay];
  // Time at each waypoint, with a slowdown at each change of direction.
  for (let i = 1; i < waypoints.length; i++) {
    let penalty = 0;
    if (i >= 2) {
      const a = waypoints[i - 2], b = waypoints[i - 1], c = waypoints[i];
      const a1 = Math.atan2(b.y - a.y, b.x - a.x);
      const a2 = Math.atan2(c.y - b.y, c.x - b.x);
      let turn = Math.abs(a2 - a1);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      penalty = (turn / (Math.PI / 2)) * p.breakCost;
    }
    const segLen = pl.cum[i] - pl.cum[i - 1];
    times.push(times[i - 1] + penalty + segLen / p.speed);
  }
  // Speed is non-uniform in time (we pause at breaks), so map time → distance along the path.
  const position = (t: number): Point => {
    if (t <= times[0]) return { ...waypoints[0] };
    for (let i = 1; i < times.length; i++) {
      if (t <= times[i]) {
        const segLen = pl.cum[i] - pl.cum[i - 1];
        const segRun = segLen / p.speed;
        const segStart = times[i] - segRun; // after any break pause
        if (t <= segStart) return { ...waypoints[i - 1] };
        return pointAt(pl, pl.cum[i - 1] + (t - segStart) * p.speed);
      }
    }
    // Past the last waypoint: keep running in the last direction (or stay put if settling).
    const last = waypoints[waypoints.length - 1];
    return { ...last };
  };
  const bi = Math.min(def.breakIndex, waypoints.length - 1);
  const breakTime = times[bi];
  return { path: pl, times, breakTime, readyTime: breakTime + def.settle, position };
}
