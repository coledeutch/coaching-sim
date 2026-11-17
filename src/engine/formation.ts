import type { DefAlign, DefPlayerSpot, Play, Point, ReceiverRef, Side } from '../model/types';
import { sideSign } from './zones';

/**
 * Receiver numbering: on each side of the ball, count eligible receivers from
 * the sideline in. The widest is #1. Backs in the backfield are not numbered.
 */
export interface Numbering {
  L: string[];
  R: string[];
  strength: Side;
  rbId?: string;
  /** slot id → "#2 strong", etc. */
  labelOf: Record<string, string>;
}

export function isBackfield(p: { align: Point }) {
  return p.align.y <= -2.5;
}

export function numberReceivers(play: Play): Numbering {
  const eligible = play.players.filter(
    (p) => p.role === 'WR' || p.role === 'TE' || p.role === 'RB',
  );
  const onLine = eligible.filter((p) => !isBackfield(p));
  const L = onLine.filter((p) => p.align.x < 0).sort((a, b) => a.align.x - b.align.x).map((p) => p.id);
  const R = onLine.filter((p) => p.align.x >= 0).sort((a, b) => b.align.x - a.align.x).map((p) => p.id);
  let strength: Side = 'R';
  if (L.length > R.length) strength = 'L';
  else if (L.length === R.length) {
    const te = play.players.find((p) => p.role === 'TE' && !isBackfield(p));
    if (te && te.align.x < 0) strength = 'L';
  }
  const rb = eligible.find((p) => isBackfield(p));
  const labelOf: Record<string, string> = {};
  const name = (side: Side) => (side === strength ? 'strong' : 'weak');
  L.forEach((id, i) => (labelOf[id] = `#${i + 1} ${name('L')}`));
  R.forEach((id, i) => (labelOf[id] = `#${i + 1} ${name('R')}`));
  if (rb) labelOf[rb.id] = 'back';
  return { L, R, strength, rbId: rb?.id, labelOf };
}

export function resolveRef(ref: ReceiverRef | 'RB', n: Numbering): string | undefined {
  if (ref === 'RB') return n.rbId;
  const side = sideSign(ref.side, n.strength) === 1 ? 'R' : 'L';
  return n[side][ref.number - 1];
}

export function alignDefender(spot: DefPlayerSpot, play: Play, n: Numbering): Point {
  const s = n.strength === 'R' ? 1 : -1;
  const pos = (id: string) => play.players.find((p) => p.id === id)!.align;
  const a: DefAlign = spot.align;
  switch (a.kind) {
    case 'abs':
      return { x: a.x * s, y: a.y };
    case 'over': {
      const id = resolveRef(a.target, n);
      if (id) {
        const rx = pos(id).x;
        const o = rx < 0 ? -1 : 1;
        return { x: rx + a.dx * o, y: a.y };
      }
      return { x: a.fallbackX * s, y: a.y };
    }
    case 'apex': {
      const k = sideSign(a.side, n.strength);
      const side = k === 1 ? 'R' : 'L';
      const n1 = n[side][0];
      const x1 = n1 ? pos(n1).x : 18 * k;
      return { x: (4 * k + x1) / 2, y: a.y };
    }
  }
}
