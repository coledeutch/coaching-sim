import type { Play, RouteType } from '../model/types';
import { numberReceivers } from './formation';

export interface ConceptDef {
  id: string;
  name: string;
  summary: string;
  /** The defender this concept tries to put in conflict */
  conflictTarget: string;
  /** Topic / lesson id */
  topic: string;
}

export const CONCEPTS: Record<string, ConceptDef> = {
  smash: { id: 'smash', name: 'Smash', summary: 'Hitch by #1 and corner by #2: a high-low on the flat defender (the Cover 2 corner).', conflictTarget: 'the flat defender', topic: 'smash' },
  fourVerts: { id: 'fourVerts', name: 'Four Verticals', summary: 'Four receivers go deep, so a single-high safety cannot cover both seams.', conflictTarget: 'the deep middle safety', topic: 'fourVerts' },
  stick: { id: 'stick', name: 'Stick', summary: 'Stick route at 6 plus a flat route: a horizontal stretch on the curl/flat defender.', conflictTarget: 'the curl/flat defender', topic: 'stick' },
  curlFlat: { id: 'curlFlat', name: 'Curl-Flat', summary: 'Curl by #1 and flat by #2: a high-low on the curl/flat defender.', conflictTarget: 'the curl/flat defender', topic: 'curlFlat' },
  slantFlat: { id: 'slantFlat', name: 'Slant-Flat', summary: 'Slant by #1 and flat/arrow by #2: an inside-outside stretch on the flat defender. A quick-game answer to pressure.', conflictTarget: 'the flat defender', topic: 'slantFlat' },
  flood: { id: 'flood', name: 'Flood', summary: 'Three receivers at three depths on one side (deep, intermediate, flat). Floods a three-deep zone with more receivers than defenders.', conflictTarget: 'the curl/flat defender and the deep third', topic: 'flood' },
  mesh: { id: 'mesh', name: 'Mesh', summary: 'Two shallow crossers that brush past each other. They rub man defenders and find holes vs zone.', conflictTarget: 'man defenders (rubs) and the hook defenders', topic: 'mesh' },
  dagger: { id: 'dagger', name: 'Dagger', summary: 'Inside receiver runs a seam to clear the hook defender; #1 runs a dig behind it.', conflictTarget: 'the hook/curl defender', topic: 'dagger' },
};

const isShort = (r?: RouteType) => r === 'hitch' || r === 'quickOut' || r === 'stick';
const isFlat = (r?: RouteType) => r === 'flat' || r === 'arrow' || r === 'swing';
const isVert = (r?: RouteType) => r === 'go' || r === 'seam';

/** Recognise named concepts from the structure of the play. */
export function detectConcepts(play: Play): string[] {
  const n = numberReceivers(play);
  const route = (id?: string): RouteType | undefined => {
    const a = play.players.find((p) => p.id === id)?.assignment;
    return a?.kind === 'route' ? a.route : undefined;
  };
  const found = new Set<string>();
  const all = play.players.map((p) => (p.assignment.kind === 'route' ? p.assignment.route : undefined));
  if (all.filter(isVert).length >= 4) found.add('fourVerts');
  if (all.filter((r) => r === 'drag').length >= 2) found.add('mesh');
  const rbRoute = route(n.rbId);

  for (const side of ['L', 'R'] as const) {
    const ids = n[side];
    const r1 = route(ids[0]);
    const r2 = route(ids[1]);
    const r3 = route(ids[2]);
    const rbHere = rbRoute && isFlat(rbRoute) ? rbRoute : undefined;
    const sideRoutes = [r1, r2, r3];
    if (isShort(r1) && r1 !== 'stick' && r2 === 'corner') found.add('smash');
    if (r1 === 'curl' && (isFlat(r2) || (!r2 && rbHere))) found.add('curlFlat');
    if (r1 === 'slant' && isFlat(r2)) found.add('slantFlat');
    if (sideRoutes.includes('stick') && (sideRoutes.some(isFlat) || rbHere)) found.add('stick');
    const deep = sideRoutes.some((r) => r === 'go' || r === 'seam' || r === 'post');
    const mid = sideRoutes.some((r) => r === 'out' || r === 'corner');
    const flat = sideRoutes.some(isFlat) || !!rbHere;
    if (deep && mid && flat && sideRoutes.filter(Boolean).length >= 2) found.add('flood');
    if (isVert(r2) && r1 === 'dig') found.add('dagger');
  }
  return [...found];
}
