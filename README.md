# Chalkboard

A football coaching career sim whose real goal is to make **you** a better coach.
Design pass plays, test them against real defensive coverages, and get a diagnosis
of *why* each rep worked or failed, written in coaching language.

You're the new offensive coordinator at **Boca Rio**, a small Gulf Coast town where Friday
nights are everything. The Tarpons went 3-7 last year. Head coach Dale Pruitt needs six wins.
Ray Delgado, who called plays for the 1994 state champions, runs a bait shop by the docks
and will teach you everything he knows.

> Current version: offense only. A career season (10 games), weekly game planning, a pass game
> and a run game, a play editor, practice, a Classroom, and mastery tracking.

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

## How to play

The first time you open it, you'll create your coach: a name, a background (Former QB, Film
Junkie, or Players' Coach), and an offensive philosophy. If you don't know your philosophy yet,
answer two "what do you like" questions and Ray will suggest one.

Then every week:

1. **Office → Scouting report**: what does this week's defense do? Coverage mix, box count,
   Ray's notes on what beats it.
2. **Office → Game plan**: pick 5-12 plays for your call sheet. The table shows how each play
   fits their most common coverages, and how well your team knows it (install pips).
3. **Practice**: your scout team runs their defense. Name the coverage, predict the read, snap
   it. Each rep installs the play; plays with low install get busted on game day.
4. **Friday night**: call every offensive snap. The defense adapts to what you're doing (watch
   the press box notes). After any play, click **Why?** for the full breakdown.
5. **Film review**: the inbox fills with reactions from Pruitt, Ray, and your players.

Other tabs:
- **Playbook**: study templates or design your own plays (routes, depths, read order, runs).
- **Practice → Film room lab**: test any play against any look, free.
- **Classroom**: Ray's lessons with live diagrams and knowledge checks.

## How the engine works

`src/engine/sim.ts` is a **rules engine with simple geometry**, not a physics sim:

- Receivers run timed routes (`routes.ts`), losing time at each break.
- Every defender follows a coaching rule: zone landmarks with priorities (`zones.ts`),
  man coverage with leverage, cushion and a reaction lag, or Quarters-style pattern matching.
  Defenders have momentum, which is why breaks create separation.
- Protection counts rushers against blockers. A free rusher means about 1.7s to throw.
- The QB works the play's progression and throws to the first window that's open enough.
- Runs (`run.ts`) are decided by the box count: blockers vs defenders near the line, plus the
  scheme (Inside Zone leaves the backside end unblocked; Power pulls a guard).
- Game Day (`game.ts`) handles downs, clock, scoring, simulated opponent drives, and the opposing
  coordinator, who calls from his scouting tendencies and adjusts to what's beating him.
- Player ratings matter: receiver speed, hands, the QB's accuracy and read speed, the back and line.
- The **diagnosis is the engine's own reasoning**: which defender was in conflict, what
  each read looked like, what the best answer was, and coaching adjustments from
  `content/knowledge.ts`.

## Project layout

```
src/model/types.ts      shared data model (plays, looks, sim results, mastery)
src/engine/             simulation, routes, zones, numbering, concept detection, mastery
src/content/            formations, template plays, defensive looks, lessons, topics, knowledge
src/ui/                 React views: Field (SVG), Playbook, Practice, Classroom
src/content/world.ts    Boca Rio: story, people, roster, opponents
src/engine/game.ts      Game Day state machine and the opposing coordinator
src/engine/career.ts    weekly loop: results, job security, buy-in, inbox
tests/engine.test.ts    "football truths" the engine must respect
tests/game.test.ts      game day and career rules
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
