import type { Point, Side, SideRef, ZoneArea, ZoneRef } from '../model/types';

export interface ZoneGeom {
  area: ZoneArea;
  kind: 'deep' | 'under';
  landmark: Point;
  /** Where to sit if nobody threatens the zone (e.g. Cover 2 corner "sinks") */
  idle?: Point;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

interface ZoneTemplate {
  kind: 'deep' | 'under';
  landmark: Point;
  idle?: Point;
  x: [number, number];
  y: [number, number];
  sided: boolean;
}

/** Zones are defined for the right side (positive x) and mirrored to the left. */
const ZONES: Record<ZoneArea, ZoneTemplate> = {
  deepThird: { kind: 'deep', landmark: { x: 17, y: 17 }, x: [9.5, 27], y: [9, 50], sided: true },
  deepMiddle: { kind: 'deep', landmark: { x: 0, y: 17 }, x: [-9.5, 9.5], y: [9, 50], sided: false },
  deepHalf: { kind: 'deep', landmark: { x: 11, y: 16 }, x: [0, 27], y: [9, 50], sided: true },
  deepQuarterOut: { kind: 'deep', landmark: { x: 17, y: 14 }, x: [11, 27], y: [8, 50], sided: true },
  deepQuarterIn: { kind: 'deep', landmark: { x: 7, y: 14 }, x: [0, 13], y: [8, 50], sided: true },
  tampaMiddle: { kind: 'deep', landmark: { x: 0, y: 16 }, x: [-10, 10], y: [6, 30], sided: false },
  flat: { kind: 'under', landmark: { x: 17, y: 5 }, idle: { x: 16, y: 10 }, x: [10, 27], y: [-3, 10], sided: true },
  curlFlat: { kind: 'under', landmark: { x: 13, y: 8 }, x: [5, 27], y: [-3, 14], sided: true },
  hookCurl: { kind: 'under', landmark: { x: 7, y: 9 }, x: [0, 15], y: [-1, 14], sided: true },
  hookMiddle: { kind: 'under', landmark: { x: 0, y: 9 }, x: [-8, 8], y: [-1, 14], sided: false },
  robber: { kind: 'under', landmark: { x: 0, y: 8 }, x: [-10, 10], y: [0, 13], sided: false },
};

export const ZONE_TEXT: Record<ZoneArea, string> = {
  deepThird: 'deep third: keep everything in his third in front of him',
  deepMiddle: 'deep middle: the single high safety, protecting the middle of the field deep',
  deepHalf: 'deep half: responsible for everything deep in his half of the field',
  deepQuarterOut: 'deep outside quarter: carry #1 if he goes vertical',
  deepQuarterIn: 'deep inside quarter: read #2, help on #1 if #2 doesn\'t go vertical',
  tampaMiddle: 'Tampa runner: the middle linebacker opens and runs to the deep middle',
  flat: 'flat: jam #1, squat in the flat, sink only if no one threatens it',
  curlFlat: 'curl-to-flat: sink under the curl, widen to the flat as soon as someone threatens it',
  hookCurl: 'hook-to-curl: wall off #2, carry a vertical to ~12 yards, then pick up crossers',
  hookMiddle: 'middle hook: drop to the middle at 8-10 yards and take anything crossing his face',
  robber: 'robber: sit in the middle at 8 yards and jump crossing routes',
};

export const ZONE_NAME: Record<ZoneArea, string> = {
  deepThird: 'deep third',
  deepMiddle: 'deep middle',
  deepHalf: 'deep half',
  deepQuarterOut: 'deep quarter',
  deepQuarterIn: 'deep quarter',
  tampaMiddle: 'Tampa middle',
  flat: 'flat',
  curlFlat: 'curl/flat',
  hookCurl: 'hook/curl',
  hookMiddle: 'middle hook',
  robber: 'robber',
};

export function sideSign(side: SideRef | undefined, strength: Side): 1 | -1 {
  const s = strength === 'R' ? 1 : -1;
  switch (side) {
    case 'R': return 1;
    case 'L': return -1;
    case 'S': return s as 1 | -1;
    case 'W': return (-s) as 1 | -1;
    default: return s as 1 | -1;
  }
}

export function zoneGeom(ref: ZoneRef, strength: Side): ZoneGeom {
  const z = ZONES[ref.area];
  const k = z.sided ? sideSign(ref.side, strength) : 1;
  const mx = (x: number) => x * k;
  const [a, b] = z.x;
  return {
    area: ref.area,
    kind: z.kind,
    landmark: { x: mx(z.landmark.x), y: z.landmark.y },
    idle: z.idle ? { x: mx(z.idle.x), y: z.idle.y } : undefined,
    xmin: k === 1 ? a : -b,
    xmax: k === 1 ? b : -a,
    ymin: z.y[0],
    ymax: z.y[1],
  };
}

export function inZone(z: ZoneGeom, p: Point, pad = 0): boolean {
  return p.x >= z.xmin - pad && p.x <= z.xmax + pad && p.y >= z.ymin - pad && p.y <= z.ymax + pad;
}

export function clampToZone(z: ZoneGeom, p: Point, pad = 0): Point {
  return {
    x: Math.max(z.xmin - pad, Math.min(z.xmax + pad, p.x)),
    y: Math.max(z.ymin - pad, Math.min(z.ymax + pad, p.y)),
  };
}
