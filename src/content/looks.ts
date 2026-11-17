import type { DefAlign, DefAssignment, DefPlayerSpot, DefRole, DefensiveLook, ReceiverRef, ZoneRef } from '../model/types';

/*
 * Defensive looks. Alignment and assignments are written relative to the
 * offense's strength (S = strong, the side with more receivers; W = weak),
 * so each look adjusts to any formation, just like a real defense.
 * All looks are 4-2-5 nickel personnel for now.
 */

const S1: ReceiverRef = { side: 'S', number: 1 };
const S2: ReceiverRef = { side: 'S', number: 2 };
const S3: ReceiverRef = { side: 'S', number: 3 };
const W1: ReceiverRef = { side: 'W', number: 1 };
const W2: ReceiverRef = { side: 'W', number: 2 };

const zone = (area: ZoneRef['area'], side?: ZoneRef['side']): DefAssignment => ({ kind: 'zone', zone: { area, side } });
const abs = (x: number, y: number): DefAlign => ({ kind: 'abs', x, y });
const over = (target: ReceiverRef, dx: number, y: number, fallbackX: number): DefAlign => ({ kind: 'over', target, dx, y, fallbackX });

function p(id: string, label: string, name: string, role: DefRole, align: DefAlign, assignment: DefAssignment): DefPlayerSpot {
  return { id, label, name, role, align, assignment };
}

/** Four-man front: everyone rushes. */
const fourDown = (): DefPlayerSpot[] => [
  p('E-S', 'E', 'strong defensive end', 'DL', abs(6.2, 1), { kind: 'rush' }),
  p('T-S', 'T', '3-technique tackle', 'DL', abs(2.6, 1), { kind: 'rush' }),
  p('T-W', 'N', 'nose tackle', 'DL', abs(-1, 1), { kind: 'rush' }),
  p('E-W', 'E', 'weak defensive end', 'DL', abs(-6.2, 1), { kind: 'rush' }),
];

export const LOOKS: DefensiveLook[] = [
  {
    id: 'cover3-sky',
    name: 'Cover 3 Sky',
    family: 'cover3',
    front: '4-2-5 Over',
    shell: '1-high',
    summary: 'Three deep (two corners and the free safety), four underneath. The strong safety rotates down to the curl/flat ("sky").',
    presnapKeys: ['One high safety in the middle at 12-14 yards', 'Corners off at 7 yards, outside leverage', 'Strong safety down at 8-9 yards outside the box'],
    strengths: ['Protects deep middle and deep outside', 'Eight-man run front with the down safety', 'Simple rules'],
    weaknesses: ['Each curl/flat defender has a lot of ground to cover: horizontal stretches (stick, curl-flat)', 'Four verticals: the single safety can\'t take both seams', 'Floods: three receivers vs two defenders on one side'],
    players: [
      ...fourDown(),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, 1, 7, 18), zone('deepThird', 'S')),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, 1, 7, 18), zone('deepThird', 'W')),
      p('FS', 'FS', 'free safety', 'S', abs(0, 13), zone('deepMiddle')),
      p('SS', 'SS', 'strong safety', 'S', abs(10, 8), zone('curlFlat', 'S')),
      p('NB', 'N', 'nickel', 'NB', { kind: 'apex', side: 'S', y: 5 }, zone('hookCurl', 'S')),
      p('MIKE', 'M', 'Mike linebacker', 'LB', abs(-1.5, 5), zone('hookCurl', 'W')),
      p('WILL', 'W', 'Will linebacker', 'LB', { kind: 'apex', side: 'W', y: 5 }, zone('curlFlat', 'W')),
    ],
  },
  {
    id: 'cover3-buzz',
    name: 'Cover 3 Buzz',
    family: 'cover3',
    front: '4-2-5 Over',
    shell: '1-high',
    summary: 'Cover 3 where the safety "buzzes" down to the hook/curl and the nickel takes the curl/flat. Same three-deep shell with different underneath players.',
    presnapKeys: ['One high safety', 'Strong safety rotates down inside, toward the box', 'Nickel walked out over #2'],
    strengths: ['Gets a safety into the hook/curl to wall off seams and slants', 'Disguises well from a 2-high look'],
    weaknesses: ['Same Cover 3 stresses: curl/flat defender in conflict, seams vs the single safety'],
    players: [
      ...fourDown(),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, 1, 7, 18), zone('deepThird', 'S')),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, 1, 7, 18), zone('deepThird', 'W')),
      p('FS', 'FS', 'free safety', 'S', abs(0, 13), zone('deepMiddle')),
      p('SS', 'SS', 'strong safety', 'S', abs(6, 9), zone('hookCurl', 'S')),
      p('NB', 'N', 'nickel', 'NB', over(S2, 1, 5, 10), zone('curlFlat', 'S')),
      p('MIKE', 'M', 'Mike linebacker', 'LB', abs(-1.5, 5), zone('hookCurl', 'W')),
      p('WILL', 'W', 'Will linebacker', 'LB', { kind: 'apex', side: 'W', y: 5 }, zone('curlFlat', 'W')),
    ],
  },
  {
    id: 'cover2',
    name: 'Cover 2',
    family: 'cover2',
    front: '4-2-5 Over',
    shell: '2-high',
    summary: 'Two safeties split the deep field in halves. Five underneath, with the corners squatting in the flats.',
    presnapKeys: ['Two high safeties on or outside the hashes at 12-14 yards', 'Corners at 5 yards with outside leverage, "hard" alignment', 'Linebackers stacked in the box'],
    strengths: ['Corners take away quick outs and flats', 'Five underneath defenders make short windows tight', 'Safeties keep the deep balls in front'],
    weaknesses: ['The hole between the squatting corner and the half safety (smash, corner routes)', 'The seam between the two safeties', 'The deep middle if the Mike doesn\'t get depth'],
    players: [
      ...fourDown(),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, 1, 5, 18), zone('flat', 'S')),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, 1, 5, 18), zone('flat', 'W')),
      p('SS', 'SS', 'strong safety', 'S', abs(9, 13), zone('deepHalf', 'S')),
      p('FS', 'FS', 'free safety', 'S', abs(-9, 13), zone('deepHalf', 'W')),
      p('NB', 'N', 'nickel', 'NB', { kind: 'apex', side: 'S', y: 5 }, zone('hookCurl', 'S')),
      p('MIKE', 'M', 'Mike linebacker', 'LB', abs(0, 5), zone('hookMiddle')),
      p('WILL', 'W', 'Will linebacker', 'LB', abs(-4, 5), zone('hookCurl', 'W')),
    ],
  },
  {
    id: 'tampa2',
    name: 'Tampa 2',
    family: 'tampa2',
    front: '4-2-5 Over',
    shell: '2-high',
    summary: 'Cover 2 where the Mike linebacker sprints to the deep middle, making it three deep at the snap after showing two.',
    presnapKeys: ['Looks exactly like Cover 2 before the snap', 'Tell: the Mike opens and runs at the snap'],
    strengths: ['Walls off the seams and the deep middle that hurt normal Cover 2'],
    weaknesses: ['Still has the corner/safety hole on the outside (smash)', 'Mike can\'t be in the run fit and the deep middle'],
    players: [
      ...fourDown(),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, 1, 5, 18), zone('flat', 'S')),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, 1, 5, 18), zone('flat', 'W')),
      p('SS', 'SS', 'strong safety', 'S', abs(10, 13), zone('deepHalf', 'S')),
      p('FS', 'FS', 'free safety', 'S', abs(-10, 13), zone('deepHalf', 'W')),
      p('NB', 'N', 'nickel', 'NB', { kind: 'apex', side: 'S', y: 5 }, zone('hookCurl', 'S')),
      p('MIKE', 'M', 'Mike linebacker', 'LB', abs(0, 5), zone('tampaMiddle')),
      p('WILL', 'W', 'Will linebacker', 'LB', abs(-4, 5), zone('hookCurl', 'W')),
    ],
  },
  {
    id: 'cover4',
    name: 'Cover 4 (Quarters)',
    family: 'cover4',
    front: '4-2-5 Over',
    shell: '2-high',
    summary: 'Four deep defenders, but they pattern-match: corners carry #1 vertical, safeties read #2 and carry him if he goes vertical. Three underneath.',
    presnapKeys: ['Two high safeties, often shallower (9-10 yards) and tighter to the box', 'Corners off at 7 yards'],
    strengths: ['Shuts down verticals: every vertical has a defender', 'Safeties add to the run fit'],
    weaknesses: ['Only three underneath: quick game and horizontal stretches', 'Dagger and digs behind a safety who jumps #2', 'Flats when everyone is carrying verticals'],
    players: [
      ...fourDown(),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, 1, 7, 18), { kind: 'match', target: S1, depth: 7, zone: { area: 'deepQuarterOut', side: 'S' } }),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, 1, 7, 18), { kind: 'match', target: W1, depth: 7, zone: { area: 'deepQuarterOut', side: 'W' } }),
      p('SS', 'SS', 'strong safety', 'S', abs(8, 10), { kind: 'match', target: S2, depth: 7, zone: { area: 'deepQuarterIn', side: 'S' } }),
      p('FS', 'FS', 'free safety', 'S', abs(-8, 10), { kind: 'match', target: W2, depth: 7, zone: { area: 'deepQuarterIn', side: 'W' } }),
      p('NB', 'N', 'nickel', 'NB', { kind: 'apex', side: 'S', y: 5 }, zone('curlFlat', 'S')),
      p('MIKE', 'M', 'Mike linebacker', 'LB', abs(0, 5), zone('hookMiddle')),
      p('WILL', 'W', 'Will linebacker', 'LB', { kind: 'apex', side: 'W', y: 5 }, zone('curlFlat', 'W')),
    ],
  },
  {
    id: 'cover1',
    name: 'Cover 1 (Man-Free)',
    family: 'cover1',
    front: '4-2-5 Over',
    shell: '1-high',
    summary: 'Man coverage everywhere, with a free safety deep in the middle and a robber ("rat") underneath.',
    presnapKeys: ['One high safety', 'Corners pressed or tight on #1, often inside leverage', 'Defenders follow receivers in motion'],
    strengths: ['Tight coverage everywhere; great when the defense has better athletes', 'Robber takes away crossers and the middle'],
    weaknesses: ['Rubs and picks (mesh)', 'Routes that break away from leverage', 'One-on-one deep shots outside, away from the safety'],
    players: [
      ...fourDown(),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, 0.7, 2, 18), { kind: 'man', targets: [S1], fallback: { area: 'flat', side: 'S' } }),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, 0.7, 2, 18), { kind: 'man', targets: [W1], fallback: { area: 'flat', side: 'W' } }),
      p('NB', 'N', 'nickel', 'NB', over(S2, 0.5, 3, 9), { kind: 'man', targets: [S2], fallback: { area: 'hookCurl', side: 'S' } }),
      p('SS', 'SS', 'strong safety', 'S', abs(-8, 7), { kind: 'man', targets: [W2, S3], fallback: { area: 'robber' } }),
      p('WILL', 'W', 'Will linebacker', 'LB', abs(-2.5, 5), { kind: 'man', targets: ['RB'], fallback: { area: 'hookMiddle' } }),
      p('MIKE', 'M', 'Mike linebacker (rat)', 'LB', abs(1.5, 6), zone('robber')),
      p('FS', 'FS', 'free safety', 'S', abs(0, 14), zone('deepMiddle')),
    ],
  },
  {
    id: 'cover2man',
    name: '2-Man',
    family: 'cover2man',
    front: '4-2-5 Over',
    shell: '2-high',
    summary: 'Man coverage underneath with "trail" technique (playing under and inside), and two safeties splitting the deep halves over the top.',
    presnapKeys: ['Two high safeties', 'Corners pressed, inside shade', 'Linebackers aligned on backs and slots'],
    strengths: ['Underneath defenders can be aggressive because they have help deep', 'Takes away quick game and intermediate routes'],
    weaknesses: ['Crossing routes and rubs: trail defenders can\'t undercut them', 'Quarterback scrambles: everyone has their back to the QB'],
    players: [
      ...fourDown(),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, -0.8, 1.5, 18), { kind: 'man', targets: [S1], fallback: { area: 'flat', side: 'S' } }),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, -0.8, 1.5, 18), { kind: 'man', targets: [W1], fallback: { area: 'flat', side: 'W' } }),
      p('NB', 'N', 'nickel', 'NB', over(S2, -0.8, 2, 9), { kind: 'man', targets: [S2], fallback: { area: 'hookCurl', side: 'S' } }),
      p('WILL', 'W', 'Will linebacker', 'LB', abs(-4, 5), { kind: 'man', targets: [W2, S3], fallback: { area: 'hookMiddle' } }),
      p('MIKE', 'M', 'Mike linebacker', 'LB', abs(1, 5), { kind: 'man', targets: ['RB'], fallback: { area: 'hookMiddle' } }),
      p('SS', 'SS', 'strong safety', 'S', abs(10, 13), zone('deepHalf', 'S')),
      p('FS', 'FS', 'free safety', 'S', abs(-10, 13), zone('deepHalf', 'W')),
    ],
  },
  {
    id: 'cover0',
    name: 'Cover 0 Blitz',
    family: 'cover0',
    front: '4-2-5 Over + both LBs',
    shell: '0-high',
    summary: 'All-out pressure: six rushers and pure man coverage with no deep safety. Any win is a big play for either side.',
    presnapKeys: ['No deep safety', 'Everyone pressed or tight on a receiver', 'Linebackers creeping toward the line of scrimmage'],
    strengths: ['Overwhelms a five-man protection: someone comes free', 'Forces quick decisions'],
    weaknesses: ['No help: any route that wins is a touchdown', 'Hot routes (slants, quick outs) beat it before the rush arrives', 'Rubs against man coverage'],
    players: [
      ...fourDown(),
      p('MIKE', 'M', 'Mike linebacker', 'LB', abs(1, 3), { kind: 'rush' }),
      p('WILL', 'W', 'Will linebacker', 'LB', abs(-2.5, 3), { kind: 'rush' }),
      p('CB-S', 'C', 'strong corner', 'CB', over(S1, -0.5, 1.5, 18), { kind: 'man', targets: [S1], fallback: 'rush' }),
      p('CB-W', 'C', 'weak corner', 'CB', over(W1, -0.5, 1.5, 18), { kind: 'man', targets: [W1], fallback: 'rush' }),
      p('NB', 'N', 'nickel', 'NB', over(S2, -0.5, 2, 9), { kind: 'man', targets: [S2], fallback: 'rush' }),
      p('SS', 'SS', 'strong safety', 'S', over(W2, -0.5, 4, -9), { kind: 'man', targets: [W2, S3], fallback: 'rush' }),
      p('FS', 'FS', 'free safety', 'S', abs(0, 7), { kind: 'man', targets: ['RB'], fallback: 'rush' }),
    ],
  },
];

export const lookById = (id: string) => LOOKS.find((l) => l.id === id)!;
