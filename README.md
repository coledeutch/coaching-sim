# Chalkboard

A football coaching career sim whose real goal is to make **you** a better coach.
Design pass plays, test them against real defensive coverages, and get a diagnosis
of *why* each rep worked or failed, written in coaching language.

> Milestone 1 (current): offense only, dropback passing game. Play editor, rules-based
> simulation vs 8 coverages, prediction-based practice, 8 Classroom lessons, mastery tracking.

## Run it on a Mac

You need Node.js once. The easiest way is the installer from https://nodejs.org (LTS).
Check it worked in Terminal:

```bash
node -v
```

Then get the code and start it:

```bash
git clone https://github.com/coledeutch/coaching-sim.git
```

```bash
cd coaching-sim
```

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173). Your plays and progress are
saved in the browser, on your machine.

To pick up new versions later: `git pull`, then `npm install`, then `npm run dev`.

## How to use it

1. **Practice**: pick a play and a defensive look (or a *Mystery look*), predict where the
   ball should go, snap it, and read the diagnosis. Hover a line in the diagnosis to see
   the players it talks about; click it to jump to that moment.
2. **Playbook**: study the template plays, duplicate one, or build your own. Click a
   receiver to give him a route, drag to move him, drag the yellow handle to change depth,
   and set the QB's read order.
3. **Classroom**: short lessons with live diagrams and knowledge checks.

Mastery only grows from what you *prove*: predictions in Practice and lesson checks.

## How the engine works

`src/engine/sim.ts` is a **rules engine with simple geometry**, not a physics sim:

- Receivers run timed routes (`routes.ts`), losing time at each break.
- Every defender follows a coaching rule: zone landmarks with priorities (`zones.ts`),
  man coverage with leverage, cushion and a reaction lag, or Quarters-style pattern matching.
  Defenders have momentum, which is why breaks create separation.
- Protection counts rushers against blockers. A free rusher means about 1.7s to throw.
- The QB works the play's progression and throws to the first window that's open enough.
- The **diagnosis is the engine's own reasoning**: which defender was in conflict, what
  each read looked like, what the best answer was, and coaching adjustments from
  `content/knowledge.ts`.

## Project layout

```
src/model/types.ts      shared data model (plays, looks, sim results, mastery)
src/engine/             simulation, routes, zones, numbering, concept detection, mastery
src/content/            formations, template plays, defensive looks, lessons, topics, knowledge
src/ui/                 React views: Field (SVG), Playbook, Practice, Classroom
tests/engine.test.ts    "football truths" the engine must respect
scripts/matrix.ts       every template play vs every look, for tuning
```

## Adding content

- **A defensive look**: add to `src/content/looks.ts`. Alignments and assignments are relative
  to the offense's strength (`S`/`W`), so one definition works against any formation.
- **A template play**: add to `src/content/plays.ts`.
- **A lesson**: add to `src/content/lessons.ts` (paragraphs, live diagrams, knowledge checks)
  and point topics at it in `src/content/topics.ts`.
- **Concept knowledge**: `src/content/knowledge.ts` rates each concept against each coverage.

## Development

```bash
npm test
```

```bash
npm run matrix
```

If a change breaks a test in `tests/engine.test.ts`, the engine is probably teaching
something wrong. Fix the engine, not the test.
