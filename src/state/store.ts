import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MasteryEvidence, Play } from '../model/types';

export type View = 'playbook' | 'practice' | 'classroom';

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

  reps: number;
  /** Throw predictions made / correct (the headline "calls right" stat) */
  calls: number;
  callsRight: number;
  countRep: (call?: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      view: 'practice',
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
    { name: 'chalkboard-v1', partialize: (s) => ({ plays: s.plays, evidence: s.evidence, checkAnswers: s.checkAnswers, reps: s.reps, calls: s.calls, callsRight: s.callsRight }) },
  ),
);
