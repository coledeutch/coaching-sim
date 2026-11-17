import type { MasteryEvidence } from '../model/types';

export type MasteryLevel = 'Not started' | 'Learning' | 'Developing' | 'Mastered';

export interface MasteryScore {
  topic: string;
  score: number; // 0..1
  attempts: number;
  level: MasteryLevel;
}

/**
 * Mastery comes only from evidence the person demonstrated: predictions before
 * the snap, lesson checks, and diagnoses. Recent evidence counts more, so
 * mastery reflects what you know now, not what you guessed on day one.
 */
export function masteryFor(topic: string, evidence: MasteryEvidence[]): MasteryScore {
  const items = evidence.filter((e) => e.topic === topic).sort((a, b) => a.at - b.at);
  if (items.length === 0) return { topic, score: 0, attempts: 0, level: 'Not started' };
  let w = 1;
  let num = 0.5; // weak prior: start at 50% with the weight of one answer
  let den = 1;
  for (let i = items.length - 1; i >= 0; i--) {
    num += (items[i].correct ? 1 : 0) * w;
    den += w;
    w *= 0.85;
  }
  const score = num / den;
  const level: MasteryLevel =
    score >= 0.75 && items.length >= 4 ? 'Mastered' : score >= 0.5 && items.length >= 2 ? 'Developing' : 'Learning';
  return { topic, score, attempts: items.length, level };
}
