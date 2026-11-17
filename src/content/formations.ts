import type { OffPlayerSpot, OffRole, Point } from '../model/types';

export interface FormationDef {
  id: string;
  name: string;
  description: string;
  players: { id: string; role: OffRole; align: Point }[];
}

const OL: FormationDef['players'] = [
  { id: 'LT', role: 'OL', align: { x: -4.4, y: -0.8 } },
  { id: 'LG', role: 'OL', align: { x: -2.2, y: -0.8 } },
  { id: 'C', role: 'OL', align: { x: 0, y: -0.8 } },
  { id: 'RG', role: 'OL', align: { x: 2.2, y: -0.8 } },
  { id: 'RT', role: 'OL', align: { x: 4.4, y: -0.8 } },
  { id: 'QB', role: 'QB', align: { x: 0, y: -5 } },
];

export const FORMATIONS: FormationDef[] = [
  {
    id: 'doubles',
    name: 'Doubles (2x2)',
    description: 'Two receivers on each side, back next to the QB in the shotgun. Balanced: the defense must declare its coverage.',
    players: [
      ...OL,
      { id: 'X', role: 'WR', align: { x: -20, y: 0 } },
      { id: 'H', role: 'WR', align: { x: -9, y: -1 } },
      { id: 'Y', role: 'WR', align: { x: 9, y: -1 } },
      { id: 'Z', role: 'WR', align: { x: 20, y: 0 } },
      { id: 'RB', role: 'RB', align: { x: -1.5, y: -5 } },
    ],
  },
  {
    id: 'trips',
    name: 'Trips Right (3x1)',
    description: 'Three receivers to the right, one to the left. Forces the defense to decide how to handle #3.',
    players: [
      ...OL,
      { id: 'X', role: 'WR', align: { x: -20, y: 0 } },
      { id: 'H', role: 'WR', align: { x: 7, y: -1 } },
      { id: 'Y', role: 'WR', align: { x: 12, y: -1 } },
      { id: 'Z', role: 'WR', align: { x: 20, y: 0 } },
      { id: 'RB', role: 'RB', align: { x: -1.5, y: -5 } },
    ],
  },
  {
    id: 'doublesTE',
    name: 'Doubles TE (11 personnel)',
    description: 'Tight end attached to the right, slot to the left. A tight end adds a sixth blocker or a receiver.',
    players: [
      ...OL,
      { id: 'X', role: 'WR', align: { x: -20, y: 0 } },
      { id: 'H', role: 'WR', align: { x: -9, y: -1 } },
      { id: 'Y', role: 'TE', align: { x: 6.6, y: -0.8 } },
      { id: 'Z', role: 'WR', align: { x: 18, y: -1 } },
      { id: 'RB', role: 'RB', align: { x: -1.5, y: -5 } },
    ],
  },
  {
    id: 'empty',
    name: 'Empty (3x2)',
    description: 'Five receivers, no back. Maximum spread, but only five blockers: the QB must get the ball out.',
    players: [
      ...OL,
      { id: 'X', role: 'WR', align: { x: -20, y: 0 } },
      { id: 'H', role: 'WR', align: { x: -9, y: -1 } },
      { id: 'RB', role: 'RB', align: { x: 5.5, y: -1 } },
      { id: 'Y', role: 'WR', align: { x: 11, y: -1 } },
      { id: 'Z', role: 'WR', align: { x: 20, y: 0 } },
    ],
  },
];

/** Default assignments when a formation is first chosen. */
export function formationSpots(f: FormationDef): OffPlayerSpot[] {
  return f.players.map((p) => ({
    id: p.id,
    role: p.role,
    align: { ...p.align },
    assignment:
      p.role === 'OL' ? { kind: 'block' } :
      p.role === 'QB' ? { kind: 'qb' } :
      p.role === 'RB' && p.align.y <= -2.5 ? { kind: 'protect' } :
      { kind: 'route', route: 'go' },
  }));
}
