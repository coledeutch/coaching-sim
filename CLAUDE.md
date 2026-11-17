# Chalkboard: notes for AI assistants

Educational football coaching sim (offense first). Priority: teaching quality and diagnostic clarity over visuals.

- Stack: Vite + React + TypeScript, zustand (persisted to localStorage), Vitest. No backend.
- `npm test` must pass. `tests/engine.test.ts` encodes football truths (e.g. Smash beats Cover 2 with the corner route). If tuning breaks one, fix the engine; only change a test when the football in it is wrong, and say why.
- Run `npm run matrix` after any engine change and sanity-check results against conventional coaching knowledge.
- The diagnosis must come from the engine's actual reasoning (the trace), never invented text.
- Plays are semantic (route types, depths, read order), not drawings. Keep it that way.
- Content (looks, plays, lessons, knowledge) is data in `src/content/`. Keep terminology consistent: receiver numbering from the sideline in, S/W for strong/weak, standard coverage names.
- The user is learning coaching through this project: explain football reasoning in plain language.
