/**
 * The world of Boca Rio: the town, the people, the roster, the schedule.
 * Everything here is fictional.
 */
import type { Background, InboxMessage, Opponent, Philosophy, RosterPlayer } from '../model/career';

export const SCHOOL = {
  name: 'Boca Rio',
  mascot: 'Tarpons',
  stadium: 'Tarpon Field',
  colors: 'teal and silver',
};

export const PEOPLE = {
  headCoach: { name: 'Dale Pruitt', title: 'Head Coach' },
  mentor: { name: 'Ray Delgado', title: 'Retired OC, 1994 state champions' },
  ad: { name: 'Teresa Vance', title: 'Athletic Director' },
};

/** The opening story. Pages are shown one at a time; {coach} is replaced with the player's name. */
export const INTRO_PAGES: { kicker?: string; title: string; body: string[] }[] = [
  {
    kicker: 'Last November',
    title: 'Friday night in Boca Rio',
    body: [
      'Boca Rio sits where the river meets the Gulf: shrimp boats, one stoplight, a refinery glow on the horizon. On Friday nights the whole town empties into Tarpon Field.',
      'Tonight the scoreboard reads **Puerto Viejo 35, Boca Rio 7**. Third straight loss to the rival. A 3-7 season. In the stands somebody has already started saying it: *the old days are gone.*',
      'The old days were 1994. A state championship, a parade down Main Street, a banner that has faded to pale blue above the end zone.',
    ],
  },
  {
    kicker: 'The Monday after',
    title: 'The phone call',
    body: [
      'Head coach **Dale Pruitt** fires his offensive coordinator on Monday morning. By Monday afternoon he is calling you.',
      'Pruitt is 61. A defensive coach for 22 years, three straight losing seasons, two years left on his contract and a booster club that wants his job. He doesn\'t know much about modern offense. He knows he needs one.',
      '"I watched your film. You see the field different. I\'ll be straight with you: I can\'t teach you offense. You\'re going to have to figure it out, and you\'re going to have to teach these kids. Win six games and we both keep our jobs."',
    ],
  },
  {
    kicker: 'Your first night in town',
    title: 'The bait shop',
    body: [
      'Down by the docks there\'s a bait shop with a hand-painted sign and a TV playing VHS game film behind the counter. The man running it is **Ray Delgado**, offensive coordinator of the 1994 state champions. Retired twelve years.',
      '"So you\'re the new OC." He doesn\'t look up from the tape. "Let me guess: you have a playbook full of plays you saw on TV."',
      '"Here\'s the secret. Plays don\'t win games. Knowing *why* a play works, and seeing it before the snap, wins games. Come by whenever you want. I\'ll teach you what I know." He finally looks up. "If you\'re willing to learn."',
    ],
  },
];

export const BACKGROUNDS: Record<Background, { name: string; tagline: string; description: string; perk: string; flaw: string }> = {
  formerQB: {
    name: 'Former Quarterback',
    tagline: 'You played the position. You see the field like a QB.',
    description: 'You were a backup quarterback at a small college. You never started, but you spent four years learning to read defenses from the inside.',
    perk: 'On game day you see the defense\'s shell (1-high / 2-high) before every snap, and you get one extra audible per half.',
    flaw: 'Your scouting reports are basic: you trust your eyes more than the film.',
  },
  filmJunkie: {
    name: 'Film Junkie',
    tagline: 'You\'ve watched more film than anyone in the county.',
    description: 'You never played past high school, but you\'ve broken down thousands of hours of tape. You find tendencies other coaches miss.',
    perk: 'Your scouting reports show what each opponent calls on 3rd & long and in the red zone, not just their overall habits.',
    flaw: 'Players don\'t know you yet. Buy-in starts a little lower.',
  },
  playersCoach: {
    name: 'Players\' Coach',
    tagline: 'Kids run through walls for you.',
    description: 'You\'ve coached youth and JV ball for years. You know how to teach, and players trust you.',
    perk: 'Players start with higher buy-in, and you get 3 extra practice reps every week to install plays.',
    flaw: 'You\'re learning scheme as you go: basic scouting reports.',
  },
};

export const PHILOSOPHIES: Record<Philosophy, { name: string; oneLiner: string; plain: string; looksLike: string; starterPlays: string[] }> = {
  airRaid: {
    name: 'Air Raid',
    oneLiner: 'Spread them out and throw it.',
    plain: 'Four or five receivers spread across the field. Lots of quick, simple passing concepts the team runs over and over until they\'re perfect. The run game keeps the defense honest.',
    looksLike: 'Lots of passing, fast tempo, a QB who gets the ball out quickly.',
    starterPlays: ['t-mesh', 't-fourverts', 't-stick', 't-slantflat', 't-smash', 't-iz'],
  },
  spread: {
    name: 'Spread',
    oneLiner: 'Make the defense defend the whole field, then run where they aren\'t.',
    plain: 'Spread formations take defenders out of the middle of the field. Then you run the ball when they\'re light inside, and throw when they load up. Balanced, and built on counting defenders.',
    looksLike: 'About half runs and half passes, choosing based on what the defense shows.',
    starterPlays: ['t-iz', 't-iz-l', 't-stick', 't-curlflat', 't-slantflat', 't-smash'],
  },
  proStyle: {
    name: 'Pro-Style',
    oneLiner: 'Line up with a tight end and be physical.',
    plain: 'Tight ends and power running. You win the line of scrimmage, then hit the defense with deeper passes when they crowd the box to stop the run.',
    looksLike: 'More runs, tight end formations, play-action shots downfield.',
    starterPlays: ['t-power', 't-iz', 't-flood', 't-dagger', 't-curlflat', 't-smash'],
  },
};

/** Two "what do you like" questions for players who don't know their philosophy yet. */
export const TASTE_QUESTIONS: { q: string; options: { text: string; leans: Philosophy }[] }[] = [
  {
    q: 'It\'s 3rd & 2 with the game on the line. What do you want to see?',
    options: [
      { text: 'A quick throw to a receiver who\'s open before the defense can react.', leans: 'airRaid' },
      { text: 'Whatever the defense gives us: run if they\'re light, throw if they\'re crowding the line.', leans: 'spread' },
      { text: 'Line up big and run it right at them. They know it\'s coming and can\'t stop it.', leans: 'proStyle' },
    ],
  },
  {
    q: 'Which highlight gets you out of your seat?',
    options: [
      { text: 'A 40-yard bomb down the sideline.', leans: 'airRaid' },
      { text: 'A running back cutting through a huge hole while the defense is spread thin.', leans: 'spread' },
      { text: 'A play-action fake that sucks in the linebackers and a tight end wide open behind them.', leans: 'proStyle' },
    ],
  },
];

/** The Boca Rio offense. Slots tie each player to a spot on the play diagrams. */
export function startingRoster(background: Background): RosterPlayer[] {
  const b = background === 'playersCoach' ? 12 : background === 'filmJunkie' ? -5 : 0;
  return [
    { id: 'bell', name: 'Marcus Bell', slot: 'QB', position: 'QB', year: 'SR', trait: 'Big arm, slow to read coverage. Locks onto his first read under pressure.', buyIn: 45 + b,
      ratings: { speed: 60, hands: 60, routeRunning: 40, strength: 65, footballIQ: 50, accuracy: 62, processing: 45 } },
    { id: 'price', name: 'DeShawn Price', slot: 'X', position: 'WR', year: 'SR', trait: 'Fastest kid in the district. Drops a few he shouldn\'t.', buyIn: 50 + b,
      ratings: { speed: 88, hands: 58, routeRunning: 62, strength: 50, footballIQ: 55 } },
    { id: 'ortega', name: 'Javi Ortega', slot: 'H', position: 'Slot WR', year: 'JR', trait: 'Quick and precise. The film-room kid; always asks "why?"', buyIn: 60 + b,
      ratings: { speed: 78, hands: 75, routeRunning: 80, strength: 45, footballIQ: 78 } },
    { id: 'hale', name: 'Tyler Hale', slot: 'Z', position: 'WR', year: 'SO', trait: 'Sure hands, not much speed. Coaches love him.', buyIn: 55 + b,
      ratings: { speed: 62, hands: 82, routeRunning: 68, strength: 55, footballIQ: 65 } },
    { id: 'ramirez', name: 'Luke Ramirez', slot: 'Y', position: 'TE / Slot', year: 'JR', trait: 'Big target, good blocker. Plays wherever you need him.', buyIn: 55 + b,
      ratings: { speed: 66, hands: 70, routeRunning: 58, strength: 74, footballIQ: 60 } },
    { id: 'thompson', name: 'Andre "Train" Thompson', slot: 'RB', position: 'RB', year: 'JR', trait: 'Runs angry. Wants the ball 25 times a game.', buyIn: 50 + b,
      ratings: { speed: 74, hands: 55, routeRunning: 45, strength: 82, footballIQ: 55 } },
    { id: 'fuentes', name: 'Hector Fuentes', slot: 'OL', position: 'Center (captain)', year: 'SR', trait: 'Four-year starter. Skeptical of new coaches. Speaks for the line.', buyIn: 35 + b,
      ratings: { speed: 40, hands: 40, routeRunning: 0, strength: 80, footballIQ: 72 } },
  ];
}

const mix = (o: Record<string, number>) => o;

export const OPPONENTS: Opponent[] = [
  { id: 'calder', school: 'Calder Ridge', mascot: 'Bobcats', offense: 50, adaptiveness: 0.4,
    blurb: 'A blue-collar program with an old-school defensive coordinator. They play Cover 3 and dare you to beat it.',
    coverageMix: mix({ 'cover3-sky': 5, 'cover3-buzz': 2, cover1: 2, cover2: 1 }),
    thirdLongMix: mix({ 'cover3-buzz': 3, cover1: 2, cover0: 1 }),
    redZoneMix: mix({ cover1: 3, 'cover3-sky': 2, cover0: 1 }) },
  { id: 'portsalinas', school: 'Port Salinas', mascot: 'Mariners', offense: 58, adaptiveness: 0.5,
    blurb: 'Disciplined and patient. Two deep safeties on almost every snap: they will not give up the big play.',
    coverageMix: mix({ cover2: 4, tampa2: 3, cover4: 2, 'cover3-sky': 1 }),
    thirdLongMix: mix({ tampa2: 3, cover4: 2, cover2: 1 }),
    redZoneMix: mix({ cover2: 2, cover2man: 2, cover1: 1 }) },
  { id: 'mesquite', school: 'Mesquite Flats', mascot: 'Rattlers', offense: 55, adaptiveness: 0.6,
    blurb: 'Aggressive and fast. They play man coverage and send pressure. Bring your hot routes.',
    coverageMix: mix({ cover1: 5, cover0: 2, cover2man: 2, 'cover3-sky': 1 }),
    thirdLongMix: mix({ cover0: 3, cover1: 2 }),
    redZoneMix: mix({ cover0: 2, cover1: 3 }) },
  { id: 'stbrendan', school: 'St. Brendan', mascot: 'Crusaders', offense: 62, adaptiveness: 0.7,
    blurb: 'A well-coached private school. Their Quarters defense pattern-matches everything. Smart, and they adjust fast.',
    coverageMix: mix({ cover4: 5, cover2: 2, 'cover3-buzz': 2, cover1: 1 }),
    thirdLongMix: mix({ cover4: 2, cover2man: 2, tampa2: 1 }),
    redZoneMix: mix({ cover4: 2, cover1: 2, cover2man: 1 }) },
  { id: 'harlow', school: 'Harlow Creek', mascot: 'Wildcats', offense: 48, adaptiveness: 0.3,
    blurb: 'A young team in a rebuilding year. Their defense mixes everything and doesn\'t do any of it especially well.',
    coverageMix: mix({ 'cover3-sky': 2, cover2: 2, cover1: 2, cover4: 1, tampa2: 1 }),
    thirdLongMix: mix({ cover1: 2, cover2: 2 }),
    redZoneMix: mix({ cover1: 2, 'cover3-sky': 2 }) },
  { id: 'bayview', school: 'Bayview', mascot: 'Admirals', offense: 60, adaptiveness: 0.5,
    blurb: 'Big and physical up front. Two-high safeties with man coverage underneath on passing downs.',
    coverageMix: mix({ cover2man: 3, cover2: 3, cover4: 2, 'cover3-sky': 1 }),
    thirdLongMix: mix({ cover2man: 4, tampa2: 1 }),
    redZoneMix: mix({ cover2man: 2, cover1: 2 }) },
  { id: 'laspalmas', school: 'Las Palmas', mascot: 'Toros', offense: 64, adaptiveness: 0.6,
    blurb: 'The district favorite. Single-high safety, eight in the box, and they blitz on every passing down.',
    coverageMix: mix({ 'cover3-sky': 4, cover1: 3, cover0: 1, 'cover3-buzz': 1 }),
    thirdLongMix: mix({ cover0: 3, cover1: 2 }),
    redZoneMix: mix({ cover0: 2, cover1: 2 }) },
  { id: 'kingsbury', school: 'Kingsbury', mascot: 'Knights', offense: 52, adaptiveness: 0.5,
    blurb: 'A soft-zone team: two deep, rally and tackle. Patience beats them.',
    coverageMix: mix({ cover4: 3, tampa2: 3, cover2: 2 }),
    thirdLongMix: mix({ tampa2: 3, cover4: 2 }),
    redZoneMix: mix({ cover2: 2, cover4: 2 }) },
  { id: 'dunmore', school: 'Dunmore Valley', mascot: 'Bulldogs', offense: 57, adaptiveness: 0.6,
    blurb: 'Their coordinator used to coach in college. They disguise: two-high before the snap, rotating late.',
    coverageMix: mix({ 'cover3-buzz': 3, cover4: 2, cover2: 2, cover1: 2, cover2man: 1 }),
    thirdLongMix: mix({ cover2man: 2, cover0: 1, 'cover3-buzz': 2 }),
    redZoneMix: mix({ cover1: 2, cover2man: 2 }) },
  { id: 'puertoviejo', school: 'Puerto Viejo', mascot: 'Pirates', offense: 68, adaptiveness: 0.8, rival: true,
    blurb: 'The rival. They beat Boca Rio 35-7 last year and haven\'t lost to the Tarpons in three seasons. Their defensive coordinator calls everything.',
    coverageMix: mix({ 'cover3-sky': 2, cover1: 2, cover4: 2, cover2: 1, tampa2: 1, cover0: 1, cover2man: 1 }),
    thirdLongMix: mix({ cover0: 2, cover2man: 2, tampa2: 1 }),
    redZoneMix: mix({ cover0: 2, cover1: 2, cover2man: 1 }) },
];

export const SEASON_LENGTH = OPPONENTS.length;
export const WINS_NEEDED = 6;

export function welcomeMessages(coachName: string, background: Background): InboxMessage[] {
  return [
    {
      id: 'w1-pruitt', week: 1, from: `Coach ${PEOPLE.headCoach.name}`, subject: 'Welcome aboard',
      body: `Coach ${coachName},\n\nGlad to have you. The offense is yours: plays, practice, game day. I'll run the defense.\n\nWe open with Calder Ridge. They play Cover 3, same as always. Put together a game plan, get the boys repped up, and let's go win a football game.\n\nWin six. That's all I need.\n\n- D.P.`,
    },
    {
      id: 'w1-delgado', week: 1, from: `${PEOPLE.mentor.name}`, subject: 'Some advice',
      body: `Saw your name in the paper.\n\nFree advice: don't try to install fifty plays. Pick a handful that beat what the other team does, and rep them until the kids could run them in their sleep. A play your players half-know is worse than no play at all.\n\nAnd learn to count. Count the safeties. Count the box. The defense tells you what it's doing if you know how to look.\n\nShop's open till six. - Ray\n\n(The Classroom has everything I can teach you.)`,
    },
    {
      id: 'w1-bell', week: 1, from: 'Marcus Bell (QB)', subject: 'hey coach',
      body: `hey coach. marcus here, the QB. just wanted to say im ready to work. last coach mostly had me throw it deep and hope lol. i dont really get the reading stuff yet but i want to learn. ${background === 'formerQB' ? 'heard you played QB in college, thats cool' : 'see you at practice'}`,
    },
    {
      id: 'w1-fuentes', week: 1, from: 'Hector Fuentes (C, captain)', subject: 'From the line',
      body: `Coach. Hector Fuentes, center. I'll be honest because somebody should be. This is our third OC in four years. Every one of them came in with a big new playbook and we never got good at any of it.\n\nThe line wants to run the ball. If you're going to throw it 50 times, at least make it stuff we can actually execute.`,
    },
  ];
}
