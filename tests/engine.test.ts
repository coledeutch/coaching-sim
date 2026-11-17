/**
 * Football truths the engine must respect.
 *
 * Each test is a coaching claim in plain English. If tuning the engine breaks
 * one of these, the engine is teaching something wrong, so fix the engine, not
 * the test. (Unless the football in the test is wrong: then fix the test and
 * say why.)
 */
import { describe, expect, it } from 'vitest';
import { simulate } from '../src/engine/sim';
import { detectConcepts } from '../src/engine/concepts';
import { numberReceivers } from '../src/engine/formation';
import { TEMPLATE_PLAYS, TEMPLATE_RUNS } from '../src/content/plays';
import { simulateRun, countBox } from '../src/engine/run';
import { lookById } from '../src/content/looks';

const play = (id: string) => TEMPLATE_PLAYS.find((p) => p.id === id)!;
const run = (playId: string, lookId: string) => simulate(play(playId), lookById(lookId), { seed: 3 });
const sepOf = (r: ReturnType<typeof run>, id: string) => r.windows.find((w) => w.receiverId === id)?.separation ?? 0;

describe('Receiver numbering', () => {
  it('numbers receivers from the outside in, and trips is the strong side', () => {
    const n = numberReceivers(play('t-stick'));
    expect(n.strength).toBe('R');
    expect(n.R).toEqual(['Z', 'Y', 'H']); // #1, #2, #3 to the trips side
    expect(n.L).toEqual(['X']);
    expect(n.rbId).toBe('RB');
  });
});

describe('Concept recognition', () => {
  it.each([
    ['t-smash', 'smash'],
    ['t-fourverts', 'fourVerts'],
    ['t-stick', 'stick'],
    ['t-curlflat', 'curlFlat'],
    ['t-slantflat', 'slantFlat'],
    ['t-flood', 'flood'],
    ['t-mesh', 'mesh'],
    ['t-dagger', 'dagger'],
  ])('%s is recognised as %s', (id, concept) => {
    expect(detectConcepts(play(id))).toContain(concept);
  });
});

describe('Smash', () => {
  it('beats Cover 2 with the corner route over the squatting corner', () => {
    const r = run('t-smash', 'cover2');
    expect(['H', 'Y']).toContain(r.bestAnswer?.receiverId);
    // The hitch is taken away by the flat defender.
    expect(sepOf(r, 'Z')).toBeLessThan(1.5);
    // The corner (flat defender) is the one put in conflict.
    expect(r.conflicts.some((c) => c.defenderId.startsWith('CB'))).toBe(true);
  });

  it('vs Cover 3, the hitch is open under the bailing corner', () => {
    const r = run('t-smash', 'cover3-sky');
    expect(['X', 'Z']).toContain(r.bestAnswer?.receiverId);
    expect(sepOf(r, 'Z')).toBeGreaterThan(sepOf(r, 'Y'));
  });
});

describe('Four Verticals', () => {
  it('beats Cover 3: the single safety can only take one seam', () => {
    const r = run('t-fourverts', 'cover3-sky');
    expect(['H', 'Y']).toContain(r.bestAnswer?.receiverId);
    expect(r.conflicts.some((c) => c.defenderId === 'FS')).toBe(true);
  });

  it('is capped by Quarters: every vertical has a defender', () => {
    const r = run('t-fourverts', 'cover4');
    for (const id of ['X', 'H', 'Y', 'Z']) expect(sepOf(r, id)).toBeLessThan(3);
  });
});

describe('Protection and pressure', () => {
  it('Cover 0 brings more rushers than a 5-man protection can block', () => {
    const r = run('t-smash', 'cover0');
    expect(r.unblockedRushers).toBeGreaterThanOrEqual(1);
    expect(r.pressureTime).toBeLessThan(2);
    expect(r.trace.some((e) => e.kind === 'protection' && /came free/.test(e.text))).toBe(true);
  });

  it('a 5-step concept with no hot route fails against Cover 0', () => {
    const r = run('t-smash', 'cover0');
    expect(['sack', 'throwaway', 'incomplete', 'interception']).toContain(r.result.kind);
  });

  it('the quick game (slants) beats Cover 0 before the rush arrives', () => {
    const r = run('t-slantflat', 'cover0');
    const slant = Math.max(sepOf(r, 'X'), sepOf(r, 'Z'));
    expect(slant).toBeGreaterThanOrEqual(2);
    expect(r.result.kind).not.toBe('sack');
  });
});

describe('Man coverage', () => {
  it('mesh crossers get open against Cover 1', () => {
    const r = run('t-mesh', 'cover1');
    expect(Math.max(sepOf(r, 'H'), sepOf(r, 'Y'))).toBeGreaterThanOrEqual(2.5);
  });

  it('curls are smothered by man coverage', () => {
    const r = run('t-curlflat', 'cover1');
    expect(sepOf(r, 'Z')).toBeLessThan(1.5);
    expect(sepOf(r, 'X')).toBeLessThan(1.5);
  });

  it('slants beat outside-leverage man', () => {
    const r = run('t-slantflat', 'cover1');
    expect(Math.max(sepOf(r, 'X'), sepOf(r, 'Z'))).toBeGreaterThanOrEqual(2.5);
  });

  it('defenders adjust to trips: someone is in man on #3', () => {
    const r = run('t-stick', 'cover1');
    const h = r.frames[0].off['H'];
    const nearest = Math.min(...Object.values(r.frames[0].def).map((d) => Math.hypot(d.x - h.x, d.y - h.y)));
    expect(nearest).toBeLessThan(6);
  });
});

describe('Engine behaviour', () => {
  it('is deterministic for the same seed', () => {
    const a = simulate(play('t-smash'), lookById('cover2'), { seed: 42 });
    const b = simulate(play('t-smash'), lookById('cover2'), { seed: 42 });
    expect(a.result).toEqual(b.result);
    expect(a.trace.map((e) => e.text)).toEqual(b.trace.map((e) => e.text));
  });

  it('always explains itself: every rep has a pre-snap read, protection, and a result', () => {
    for (const p of TEMPLATE_PLAYS) {
      for (const lookId of ['cover2', 'cover3-sky', 'cover1', 'cover0', 'cover4', 'tampa2', 'cover2man', 'cover3-buzz']) {
        const r = simulate(p, lookById(lookId));
        const kinds = new Set(r.trace.map((e) => e.kind));
        expect(kinds.has('presnap')).toBe(true);
        expect(kinds.has('protection')).toBe(true);
        expect(kinds.has('result')).toBe(true);
        expect(r.frames.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('Run game: count the box', () => {
  const runPlay = (id: string) => TEMPLATE_RUNS.find((p) => p.id === id)!;
  const avg = (playId: string, lookId: string) => {
    let total = 0;
    for (let s = 1; s <= 300; s++) total += simulateRun(runPlay(playId), lookById(lookId), { seed: s }).result.yards;
    return total / 300;
  };

  it('counts a rolled-down safety: Cover 3 Sky puts 7 in the box vs 2x2', () => {
    expect(countBox(runPlay('t-iz'), lookById('cover3-sky')).inBox.length).toBe(7);
    expect(countBox(runPlay('t-iz'), lookById('cover2')).inBox.length).toBe(6);
  });

  it('runs better against a 2-high, 6-man box than a loaded 1-high box', () => {
    expect(avg('t-iz', 'cover2')).toBeGreaterThan(avg('t-iz', 'cover3-sky') + 2);
  });

  it('a tight end adds a blocker: Power from 11 personnel has the numbers vs a 6-man box', () => {
    expect(countBox(runPlay('t-power'), lookById('cover2')).advantage).toBeGreaterThan(0);
  });

  it('running into Cover 0 is boom or bust: lots of negative plays', () => {
    let neg = 0;
    for (let s = 1; s <= 300; s++) if (simulateRun(runPlay('t-iz'), lookById('cover0'), { seed: s }).result.yards <= 0) neg++;
    expect(neg / 300).toBeGreaterThan(0.3);
  });

  it('explains itself with a box count', () => {
    const r = simulateRun(runPlay('t-iz'), lookById('cover3-sky'), { seed: 1 });
    expect(r.trace.some((e) => e.kind === 'box' && /7 defenders in the box/.test(e.text))).toBe(true);
  });
});
