import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MasteryEvidence, Play } from '../model/types';
import type { Career, Coach } from '../model/career';
import type { GameState } from '../engine/game';
import { PHILOSOPHIES, startingRoster, welcomeMessages } from '../content/world';

export type View = 'office' | 'playbook' | 'practice' | 'classroom' | 'game';

interface AppState {
  view: View;
  setView: (v: View) => void;

  /** The person's own plays (templates live in content/plays.ts) */
  plays: Play[];
  savePlay: (p: Play) => void;
  deletePlay: (id: string) => void;

  /** Which play/look the Practice field is set to */
  practicePlayId: string;
  practiceLookId: string;
  setPractice: (playId?: string, lookId?: string) => void;

  /** Open a lesson in the classroom */
  lessonId: string;
  openLesson: (id: string) => void;

  evidence: MasteryEvidence[];
  addEvidence: (e: Omit<MasteryEvidence, 'at'>[]) => void;
  /** Lesson check answers, keyed by check id → chosen option index */
  checkAnswers: Record<string, number>;
  answerCheck: (id: string, choice: number) => void;

  career: Career | null;
  startCareer: (coach: Coach) => void;
  updateCareer: (fn: (c: Career) => Career) => void;
  resetCareer: () => void;
  game: GameState | null;
  setGame: (g: GameState | null) => void;
  /** Practice: 'week' uses this week's reps vs the opponent's scout team; 'lab' is free experimentation */
  practiceMode: 'week' | 'lab';
  setPracticeMode: (m: 'week' | 'lab') => void;

  reps: number;
  /** Throw predictions made / correct (the headline "calls right" stat) */
  calls: number;
  callsRight: number;
  countRep: (call?: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      view: 'office',
      setView: (view) => set({ view }),

      plays: [],
      savePlay: (p) =>
        set((s) => {
          const plays = s.plays.some((x) => x.id === p.id)
            ? s.plays.map((x) => (x.id === p.id ? { ...p, updatedAt: Date.now() } : x))
            : [...s.plays, { ...p, createdAt: Date.now(), updatedAt: Date.now() }];
          return { plays };
        }),
      deletePlay: (id) => set((s) => ({ plays: s.plays.filter((p) => p.id !== id) })),

      practicePlayId: 't-smash',
      practiceLookId: 'cover2',
      setPractice: (playId, lookId) =>
        set((s) => ({ practicePlayId: playId ?? s.practicePlayId, practiceLookId: lookId ?? s.practiceLookId })),

      lessonId: 'reading-defense',
      openLesson: (lessonId) => set({ lessonId, view: 'classroom' }),

      evidence: [],
      addEvidence: (items) =>
        set((s) => ({ evidence: [...s.evidence, ...items.map((e) => ({ ...e, at: Date.now() }))] })),
      checkAnswers: {},
      answerCheck: (id, choice) => set((s) => ({ checkAnswers: { ...s.checkAnswers, [id]: choice } })),

      career: null,
      startCareer: (coach) => {
        const starters = PHILOSOPHIES[coach.philosophy].starterPlays;
        const career: Career = {
          coach,
          week: 1,
          results: [],
          jobSecurity: 55,
          install: Object.fromEntries(starters.map((id) => [id, 1])),
          gamePlan: [...starters],
          practiceRepsLeft: coach.background === 'playersCoach' ? 11 : 8,
          roster: startingRoster(coach.background),
          inbox: welcomeMessages(coach.name, coach.background),
          weekSteps: { scouted: false, planned: false },
        };
        set({ career, view: 'office', game: null, practicePlayId: starters[0] });
      },
      updateCareer: (fn) => set((s) => (s.career ? { career: fn(s.career) } : {})),
      resetCareer: () => set({ career: null, game: null, view: 'office' }),
      game: null,
      setGame: (game) => set({ game }),
      practiceMode: 'week',
      setPracticeMode: (practiceMode) => set({ practiceMode }),

      reps: 0,
      calls: 0,
      callsRight: 0,
      countRep: (call) =>
        set((s) => ({
          reps: s.reps + 1,
          calls: s.calls + (call === undefined ? 0 : 1),
          callsRight: s.callsRight + (call ? 1 : 0),
        })),
    }),
    { name: 'chalkboard-v1', partialize: (s) => ({ career: s.career, game: s.game, plays: s.plays, evidence: s.evidence, checkAnswers: s.checkAnswers, reps: s.reps, calls: s.calls, callsRight: s.callsRight }) },
  ),
);
