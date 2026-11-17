import type { Assignment, Play, RouteType } from '../model/types';
import { FORMATIONS, formationSpots } from './formations';

type Spec = Record<string, RouteType | 'protect' | [RouteType, number]>;

function build(
  id: string,
  name: string,
  formation: string,
  drop: 3 | 5,
  spec: Spec,
  progression: string[],
  notes: string,
  teachingPoints: string[],
): Play {
  const f = FORMATIONS.find((x) => x.id === formation)!;
  const players = formationSpots(f).map((p) => {
    const s = spec[p.id];
    if (s === undefined) return p;
    const assignment: Assignment =
      s === 'protect' ? { kind: 'protect' } :
      Array.isArray(s) ? { kind: 'route', route: s[0], depth: s[1] } :
      { kind: 'route', route: s };
    return { ...p, assignment };
  });
  return { id, name, formation, drop, players, progression, notes, teachingPoints, isTemplate: true };
}

export const TEMPLATE_PLAYS: Play[] = [
  build('t-smash', 'Smash', 'doubles', 5,
    { X: 'hitch', H: 'corner', Y: 'corner', Z: 'hitch', RB: 'protect' },
    ['Y', 'Z', 'H', 'X'],
    'A high-low on the flat defender. #1 runs a hitch underneath, #2 runs a corner over the top. In Cover 2 the corner is the flat defender: he can\'t take both.',
    [
      'QB: read the flat defender. If he squats on the hitch, throw the corner. If he sinks under the corner, throw the hitch.',
      'Corner route: stem to 10, sell inside to hold the safety, then break to the pylon. Stay away from the safety.',
      'Hitch: push to 6, snap back to 5, face the QB. Be ready on the plant.',
    ]),
  build('t-fourverts', 'Four Verticals', 'doubles', 5,
    { X: 'go', H: 'seam', Y: 'seam', Z: 'go', RB: 'swing' },
    ['Y', 'H', 'Z', 'RB'],
    'Four vertical routes stretch the deep zones. Against a single-high safety, two seams put him in conflict. The swing is the check-down when the defense drops everyone deep.',
    [
      'QB: eyes on the middle safety. Throw the seam he doesn\'t take.',
      'Seams: release inside, then stay on the hash/numbers landmark. Don\'t drift into the safety.',
      'Outside receivers: win on the outside release and keep 4-5 yards of room from the sideline.',
    ]),
  build('t-stick', 'Stick', 'trips', 3,
    { X: 'slant', H: 'stick', Y: 'flat', Z: 'go', RB: 'protect' },
    ['H', 'Y', 'X'],
    'A quick-game horizontal stretch. The fade clears out the corner, #2 runs to the flat, and #3 sits at 6 yards. The curl/flat defender can\'t cover both.',
    [
      'QB: read the curl/flat defender. If he widens to the flat, throw the stick. If he sits inside, throw the flat.',
      'Stick: push to 6 and turn outside. Sit down against zone, keep running against man.',
      'Flat: get width immediately; you have to threaten the defender to make him choose.',
    ]),
  build('t-curlflat', 'Curl-Flat', 'doubles', 5,
    { X: 'curl', H: 'arrow', Y: 'arrow', Z: 'curl', RB: 'protect' },
    ['Z', 'Y', 'X', 'H'],
    'A vertical stretch (high-low) on the curl/flat defender. A staple against Cover 3.',
    [
      'QB: read the curl/flat defender. If he widens with the arrow, throw the curl behind him. If he sinks, throw the arrow.',
      'Curl: sell vertical to 12 so the corner bails, then come back inside to the QB.',
    ]),
  build('t-slantflat', 'Slant-Flat', 'doubles', 3,
    { X: 'slant', H: 'arrow', Y: 'arrow', Z: 'slant', RB: 'protect' },
    ['Z', 'Y', 'X', 'H'],
    'The quickest concept in the book. Use it against pressure and press coverage: the ball is out before the rush arrives.',
    [
      'QB: three-step drop, throw on the third step. Read the flat defender: if he widens, slant; if he squeezes the slant, flat.',
      'Slant: three hard steps and break at 45°. Catch it in front of the linebackers, not behind them.',
    ]),
  build('t-flood', 'Flood', 'trips', 5,
    { X: 'post', H: 'flat', Y: ['out', 12], Z: 'go', RB: 'protect' },
    ['Y', 'H', 'Z', 'X'],
    'Three receivers at three depths to one side: deep, intermediate, flat. Against Cover 3 only two defenders cover that side (the corner and the curl/flat defender), so someone is open.',
    [
      'QB: read the curl/flat defender. If he sinks, the flat is open; if he widens, the out is open behind him.',
      'Go route: run off the corner. Make him carry you.',
      'Out: land at 12, flatten, and work back toward the ball.',
    ]),
  build('t-mesh', 'Mesh', 'doubles', 5,
    { X: 'corner', H: ['drag', 1.5], Y: ['drag', 3.5], Z: 'corner', RB: 'swing' },
    ['H', 'Y', 'RB', 'Z'],
    'Two shallow crossers that "mesh" by passing close to each other. Against man coverage the defenders get rubbed; against zone the drags settle in the holes.',
    [
      'Drags: the shallow (1-2 yds) drag sets the mesh point; the other goes over the top. Pass close enough to slap hands.',
      'vs man: keep running. vs zone: sit down in the first hole past the center.',
      'QB: watch for the rub. If the drags are covered, the swing is your outlet.',
    ]),
  build('t-dagger', 'Dagger', 'doubles', 5,
    { X: 'go', H: ['drag', 2], Y: 'seam', Z: 'dig', RB: 'protect' },
    ['Y', 'Z', 'H'],
    'The seam clears the middle (pulling the hook/curl defender and the safety), and the dig comes in behind it at 12-15 yards.',
    [
      'Seam: take the linebacker and the safety with you. You are the clear-out unless the safety ignores you.',
      'Dig: stem hard to 12, sell vertical, then flatten across. Settle in the void the seam created.',
      'QB: seam to dig to drag.',
    ]),
];
