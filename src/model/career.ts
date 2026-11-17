import type { Ratings } from './types';

export type Background = 'formerQB' | 'filmJunkie' | 'playersCoach';
export type Philosophy = 'airRaid' | 'spread' | 'proStyle';

export interface Coach {
  name: string;
  background: Background;
  philosophy: Philosophy;
}

/** A player on your roster. `slot` maps him onto the play diagrams (X, Z, H, Y, RB, QB, OL). */
export interface RosterPlayer {
  id: string;
  name: string;
  slot: string;
  position: string;
  year: 'FR' | 'SO' | 'JR' | 'SR';
  ratings: Ratings;
  /** One-line personality, shown on his card */
  trait: string;
  /** 0-100: how much he believes in you and your system */
  buyIn: number;
}

export interface Opponent {
  id: string;
  school: string;
  mascot: string;
  blurb: string;
  /** Strength of their offense vs our defense (0-100). Drives the simulated opponent drives. */
  offense: number;
  /** Their defensive coordinator's habits: look id → weight */
  coverageMix: Record<string, number>;
  /** What they call on 3rd & long */
  thirdLongMix: Record<string, number>;
  /** Inside our 20 */
  redZoneMix: Record<string, number>;
  /** How quickly their DC adjusts to what you're doing (0-1) */
  adaptiveness: number;
  rival?: boolean;
}

export interface InboxMessage {
  id: string;
  week: number;
  from: string;
  subject: string;
  body: string;
  read?: boolean;
}

export interface GameRecord {
  week: number;
  opponentId: string;
  us: number;
  them: number;
}

export interface Career {
  coach: Coach;
  week: number; // 1-based
  results: GameRecord[];
  /** 0-100: how secure your job is. Below 20 and Pruitt makes a change. */
  jobSecurity: number;
  /** Play id → install level 0-3: how well the team knows it */
  install: Record<string, number>;
  /** Play ids on this week's call sheet */
  gamePlan: string[];
  practiceRepsLeft: number;
  roster: RosterPlayer[];
  inbox: InboxMessage[];
  /** Which steps of the week are done */
  weekSteps: { scouted: boolean; planned: boolean };
}
