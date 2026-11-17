import type { CoverageFamily } from '../model/types';

/**
 * Coaching knowledge: how each concept fares against each coverage family.
 * This drives the "adjustments" part of the diagnosis. Keep notes short and in
 * coaching language. Ratings: 'good' = a classic answer, 'ok' = workable,
 * 'bad' = the coverage is built to stop it.
 */
export type Fit = 'good' | 'ok' | 'bad';

export const CONCEPT_VS_COVERAGE: Record<string, Partial<Record<CoverageFamily, { fit: Fit; note: string }>>> = {
  smash: {
    cover2: { fit: 'good', note: 'The textbook answer. The Cover 2 corner is the flat defender: if he squats on the hitch, throw the corner over him before the half safety arrives; if he sinks, throw the hitch.' },
    tampa2: { fit: 'good', note: 'Same read as Cover 2. Tampa takes away the middle, not the corner.' },
    cover3: { fit: 'ok', note: 'The deep-third corner sits on top of the corner route. The hitch is your throw if the curl/flat defender doesn\'t widen fast enough.' },
    cover4: { fit: 'ok', note: 'The quarters safety reads #2 and can carry the corner route. The hitch is often the answer.' },
    cover1: { fit: 'ok', note: 'Becomes a man-beater only if your receivers win. The corner route away from the safety\'s leverage is the best shot.' },
    cover2man: { fit: 'bad', note: 'Trail-technique man with two deep safeties sits on both routes. Use crossers instead.' },
    cover0: { fit: 'ok', note: 'No safety help, so the hitch is a hot answer if you can get it out quickly.' },
  },
  fourVerts: {
    cover3: { fit: 'good', note: 'Two seams on one deep middle safety: he can\'t cover both. Read his leverage and throw the seam he doesn\'t take.' },
    cover1: { fit: 'ok', note: 'A one-on-one shot on the outside if you have the better athlete. The middle safety helps the seams.' },
    cover2: { fit: 'ok', note: 'Throw the seam between the two half safeties, or hit the back underneath when the linebackers drop.' },
    tampa2: { fit: 'bad', note: 'The Tampa middle linebacker runs the middle and walls the seams. Look for the check-down.' },
    cover4: { fit: 'bad', note: 'Quarters puts four defenders deep, one on each vertical. Throw underneath.' },
    cover0: { fit: 'ok', note: 'Big-play potential, but you need protection for routes this long against an all-out blitz.' },
  },
  stick: {
    cover3: { fit: 'good', note: 'The curl/flat defender can\'t take both the flat and the stick. Read him: if he widens, throw the stick.' },
    cover2: { fit: 'ok', note: 'The squatting corner takes the flat, but the stick can sit in the hole in front of the hook defender.' },
    cover4: { fit: 'good', note: 'Quarters is light underneath; the stick and flat stretch the curl/flat defender.' },
    cover1: { fit: 'ok', note: 'The stick route must keep running away from man coverage rather than sit.' },
  },
  curlFlat: {
    cover3: { fit: 'good', note: 'High-low on the curl/flat defender. If he widens with the flat, throw the curl; if he sinks under the curl, throw the flat.' },
    cover4: { fit: 'ok', note: 'Workable, but the quarters corner and safety sit on top of the curl.' },
    cover2: { fit: 'bad', note: 'The Cover 2 corner squats on the flat and the hook/curl defender walls the curl.' },
  },
  slantFlat: {
    cover0: { fit: 'good', note: 'The classic hot answer: the slant is ready before an unblocked rusher arrives.' },
    cover1: { fit: 'good', note: 'Slant vs outside-leverage man is a quick win; the flat route can pick the slant defender.' },
    cover3: { fit: 'good', note: 'The curl/flat defender is in conflict between the slant (inside) and the flat (outside).' },
    cover2: { fit: 'ok', note: 'The squatting corner takes the flat; the slant must beat the hook/curl defender inside.' },
  },
  flood: {
    cover3: { fit: 'good', note: 'Three receivers at three levels vs two defenders on that side (the deep-third corner and the curl/flat defender). Someone is open.' },
    cover1: { fit: 'ok', note: 'Becomes three one-on-one matchups. Pick the best matchup.' },
    cover4: { fit: 'ok', note: 'The flat route is usually open, because the quarters defenders are busy with the verticals.' },
    cover2: { fit: 'ok', note: 'The out route can sit in the hole between the corner and the half safety.' },
  },
  mesh: {
    cover1: { fit: 'good', note: 'The crossers rub the man defenders and keep running away from them.' },
    cover0: { fit: 'good', note: 'Rubs against all-out man; the drag is open quickly enough to beat the blitz.' },
    cover2man: { fit: 'good', note: 'Trail-technique defenders get picked by the mesh and the safeties are too deep to help.' },
    cover3: { fit: 'ok', note: 'Against zone the drags should settle in the holes between the hook defenders.' },
    cover2: { fit: 'ok', note: 'Settle in the holes; the five underneath defenders make windows tight.' },
  },
  dagger: {
    cover3: { fit: 'good', note: 'The seam pulls the hook/curl defender (and the middle safety) and the dig comes in behind.' },
    cover4: { fit: 'good', note: 'The quarters safety takes the seam (#2 vertical), which opens the dig in front of the corner.' },
    cover2: { fit: 'ok', note: 'The seam splits the safeties; the dig has to clear the hook defenders.' },
    tampa2: { fit: 'bad', note: 'The Tampa linebacker runs with the seam, but the dig is hard to fit in front of the half safety.' },
  },
};

/** How a coordinator thinks about attacking each coverage. */
export const HOW_TO_BEAT: Record<CoverageFamily, string> = {
  cover0: 'No deep help and more rushers than you can block. Get the ball out hot (slant, quick out, hitch) or block one more. Any win is a touchdown.',
  cover1: 'Man coverage with a single-high safety and a robber. Beat it with rubs and crossers (mesh), routes that break away from leverage, and matchups.',
  cover2: 'Two deep halves and five underneath. Attack the hole between the corner and the safety (smash, corner routes) and the seams between the safeties.',
  cover2man: 'Trail man underneath with two safeties over the top. Run crossers and rubs; the underneath defenders trail and the safeties are too deep.',
  cover3: 'Three deep and four underneath, so each curl/flat defender covers a lot of ground. Stretch him horizontally (stick, curl-flat) or flood one side; the seams beat the single safety.',
  cover4: 'Four deep, three underneath. Strong against verticals but light underneath. Throw short and quick (stick, curl-flat, quick game) or run dagger behind the safety reading #2.',
  tampa2: 'Cover 2 with the middle linebacker running the deep middle. Seams are walled, so attack the corner (smash) and the holes underneath.',
};
