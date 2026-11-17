import type { Point } from '../model/types';

export const FIELD_HALF_WIDTH = 26.67;
export const HASH_X = 3.08; // high school hashes are ~53'4" apart; college ~40'. We use the ball at the middle for now.

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Point, b: Point, f: number): Point => ({
  x: a.x + (b.x - a.x) * f,
  y: a.y + (b.y - a.y) * f,
});
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const clampToField = (p: Point): Point => ({
  x: clamp(p.x, -FIELD_HALF_WIDTH + 0.5, FIELD_HALF_WIDTH - 0.5),
  y: p.y,
});

/** Move from `from` toward `to` by at most `maxStep` yards. */
export function stepToward(from: Point, to: Point, maxStep: number): Point {
  const d = dist(from, to);
  if (d <= maxStep || d === 0) return { ...to };
  return lerp(from, to, maxStep / d);
}

export interface Polyline {
  points: Point[];
  /** Cumulative length at each point */
  cum: number[];
  length: number;
}

export function polyline(points: Point[]): Polyline {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]));
  return { points, cum, length: cum[cum.length - 1] };
}

/** Point at distance `s` along the polyline (clamped to the end). */
export function pointAt(pl: Polyline, s: number): Point {
  if (s <= 0) return { ...pl.points[0] };
  if (s >= pl.length) return { ...pl.points[pl.points.length - 1] };
  for (let i = 1; i < pl.points.length; i++) {
    if (s <= pl.cum[i]) {
      const seg = pl.cum[i] - pl.cum[i - 1];
      return lerp(pl.points[i - 1], pl.points[i], seg === 0 ? 0 : (s - pl.cum[i - 1]) / seg);
    }
  }
  return { ...pl.points[pl.points.length - 1] };
}

/** Small deterministic RNG (mulberry32) so every rep can be replayed exactly. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
