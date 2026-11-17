import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoverageFamily, DefensiveLook, MasteryEvidence, SimResult, TraceEvent } from '../model/types';
import { useStore } from '../state/store';
import { ALL_TEMPLATES } from '../content/plays';
import { LOOKS, lookById } from '../content/looks';
import { simulatePlay } from '../engine/play';
import { countBox } from '../engine/run';
import { opponentForWeek, seasonOver } from '../engine/career';
import { playerEffects } from '../engine/game';
import { Pips } from './OfficeView';
import { ROUTES } from '../engine/routes';
import { CONCEPTS } from '../engine/concepts';
import { numberReceivers } from '../engine/formation';
import { topicById } from '../content/topics';
import { HOW_TO_BEAT } from '../content/knowledge';
import { Field } from './Field';
import { RichText } from './RichText';

const FAMILIES: { id: CoverageFamily; name: string; shell: string }[] = [
  { id: 'cover0', name: 'Cover 0', shell: '0-high' },
  { id: 'cover1', name: 'Cover 1', shell: '1-high' },
  { id: 'cover3', name: 'Cover 3', shell: '1-high' },
  { id: 'cover2', name: 'Cover 2', shell: '2-high' },
  { id: 'tampa2', name: 'Tampa 2', shell: '2-high' },
  { id: 'cover4', name: 'Quarters', shell: '2-high' },
  { id: 'cover2man', name: '2-Man', shell: '2-high' },
];

type Phase = 'predict' | 'playing' | 'review';

const RESULT_TEXT: Record<string, string> = {
  run: 'Run',
  fumble: 'Fumble',
  complete: 'Complete',
  incomplete: 'Incomplete',
  interception: 'Intercepted',
  sack: 'Sacked',
  throwaway: 'Thrown away',
};

export function PracticeView() {
  const { plays, practicePlayId, practiceLookId, setPractice, addEvidence, openLesson, countRep, career, updateCareer, practiceMode, setPracticeMode } = useStore();
  const allPlays = [...plays, ...ALL_TEMPLATES];
  // Week practice: only your call sheet, against the opponent's scout-team looks, using limited reps.
  const weekMode = practiceMode === 'week' && !!career && !seasonOver(career);
  const opp = weekMode ? opponentForWeek(career!.week) : null;
  const planPlays = weekMode ? career!.gamePlan.map((id) => allPlays.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p) : [];
  const selectable = weekMode ? planPlays : allPlays;
  const play = selectable.find((p) => p.id === practicePlayId) ?? selectable[0] ?? ALL_TEMPLATES[0];
  const [mysteryChoice, setMystery] = useState(false);
  const mystery = weekMode || mysteryChoice;
  const drawLook = (): DefensiveLook => {
    if (!opp) return LOOKS[Math.floor(Math.random() * LOOKS.length)];
    const entries = Object.entries(opp.coverageMix);
    let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
    for (const [id, w] of entries) if ((r -= w) <= 0) return lookById(id);
    return lookById(entries[0][0]);
  };
  const [hiddenLook, setHiddenLook] = useState<DefensiveLook>(() => drawLook());
  const look = mystery ? hiddenLook : lookById(practiceLookId);
  const repsLeft = career?.practiceRepsLeft ?? 0;

  const [phase, setPhase] = useState<Phase>('predict');
  const [predFamily, setPredFamily] = useState<CoverageFamily | null>(null);
  const [predTarget, setPredTarget] = useState<string | 'none' | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.6);
  const [hover, setHover] = useState<TraceEvent | null>(null);
  const [showZones, setShowZones] = useState(false);
  const [graded, setGraded] = useState<{ target?: boolean; family?: boolean; shell?: boolean } | null>(null);

  const numbering = useMemo(() => numberReceivers(play), [play]);

  const reset = (newMystery = mystery) => {
    setPhase('predict');
    setResult(null);
    setPredFamily(null);
    setPredTarget(null);
    setFrameIdx(0);
    setPlaying(false);
    setGraded(null);
    setHover(null);
    if (newMystery || weekMode) setHiddenLook(drawLook());
  };

  useEffect(() => reset(), [practicePlayId, practiceLookId, practiceMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Playback loop
  const raf = useRef<number>();
  useEffect(() => {
    if (!playing || !result) return;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      acc += ((now - last) / 1000) * speed;
      last = now;
      const steps = Math.floor(acc / 0.05);
      if (steps > 0) {
        acc -= steps * 0.05;
        setFrameIdx((i) => {
          const next = Math.min(result.frames.length - 1, i + steps);
          if (next === result.frames.length - 1) {
            setPlaying(false);
            setPhase('review');
          }
          return next;
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, result, speed]);

  const snap = () => {
    if (weekMode && repsLeft <= 0) return;
    const r = simulatePlay(play, look, { seed: Math.floor(Math.random() * 1e9), ...(weekMode && career ? playerEffects(career.roster) : {}) });
    setResult(r);
    setFrameIdx(0);
    setPhase('playing');
    setPlaying(true);

    // Grade the prediction: this is the evidence that drives mastery.
    const ev: Omit<MasteryEvidence, 'at'>[] = [];
    const g: { target?: boolean; family?: boolean; shell?: boolean } = {};
    if (predTarget && play.run) {
      // Runs: "is this a good look to run against?" The box count is the answer.
      const adv = countBox(play, look).advantage;
      const correct = predTarget === 'yes' ? adv >= 0 : adv < 0;
      g.target = correct;
      ev.push({ topic: 'boxCount', correct, source: 'prediction', detail: `${play.name} vs ${look.name}: said ${predTarget}` });
    } else if (predTarget) {
      const correct = predTarget === 'none' ? r.bestAnswer === null : r.goodAnswers.includes(predTarget);
      g.target = correct;
      const topics = new Set<string>([look.family, ...r.concepts.map((c) => CONCEPTS[c].topic)]);
      if (r.concepts.length) topics.add('conflict');
      topics.forEach((topic) => ev.push({ topic, correct, source: 'prediction', detail: `${play.name} vs ${look.name}: picked ${predTarget}` }));
    }
    if (mystery && predFamily) {
      const fam = FAMILIES.find((f) => f.id === predFamily)!;
      g.family = predFamily === look.family;
      g.shell = fam.shell === look.shell;
      ev.push({ topic: look.family, correct: g.family, source: 'prediction', detail: `Identify coverage: said ${fam.name}` });
      ev.push({ topic: 'shell', correct: g.shell, source: 'prediction', detail: `Identify shell: said ${fam.shell}` });
    }
    if (ev.length) addEvidence(ev);
    countRep(g.target);
    setGraded(g);
    if (weekMode) {
      // A practice rep installs the play: +1, or +2 when the read was right (the team saw it done correctly).
      updateCareer((c) => ({
        ...c,
        practiceRepsLeft: Math.max(0, c.practiceRepsLeft - 1),
        install: { ...c.install, [play.id]: Math.min(3, (c.install[play.id] ?? 0) + (g.target ? 2 : 1)) },
        roster: c.roster.map((p) => (p.slot === 'QB' && g.target ? { ...p, buyIn: Math.min(100, p.buyIn + 1) } : p)),
      }));
    }
  };

  const frame = result ? result.frames[frameIdx] : null;
  const answerIds = phase === 'review' && result ? result.goodAnswers : undefined;
  const runners = play.run ? [] : play.players.filter((p) => p.assignment.kind === 'route');
  const highlight = hover
    ? { receivers: hover.receivers, defenders: hover.defenders }
    : undefined;

  const canSnap = predTarget !== null && (!mystery || predFamily !== null);

  return (
    <div className="three-col">
      <aside className="panel list-panel">
        {career && !seasonOver(career) && (
          <div className="toggle-row mode-toggle">
            <button className={`chip ${weekMode ? 'on' : ''}`} onClick={() => setPracticeMode('week')}>Week {career.week} practice</button>
            <button className={`chip ${!weekMode ? 'on' : ''}`} onClick={() => setPracticeMode('lab')}>Film room lab</button>
          </div>
        )}
        {weekMode ? (
          <>
            <h2>Practice vs {opp!.school}</h2>
            <p className="small muted">Your scout team runs {opp!.school}'s defense. Each rep installs the play (install pips): +1, or +2 when you call the read right. {repsLeft} rep{repsLeft === 1 ? '' : 's'} left this week.</p>
            <ul className="play-list">
              {planPlays.map((p) => (
                <li key={p.id} className={p.id === play.id ? 'active' : ''} onClick={() => setPractice(p.id)}>
                  <span>{p.name}</span>
                  <Pips n={career!.install[p.id] ?? 0} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2>Film room lab</h2>
            <p className="small muted">Experiment freely: any play, any look. The lab doesn't use practice reps or install plays.</p>
            <label className="field-label">Play</label>
            <select value={play.id} onChange={(e) => setPractice(e.target.value)}>
              {plays.length > 0 && (
                <optgroup label="My playbook">
                  {plays.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
              <optgroup label="Templates">
                {ALL_TEMPLATES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            </select>
          </>
        )}

        {!weekMode && <>
        <label className="field-label">Defensive look</label>
        <div className="toggle-row">
          <button className={`chip ${!mystery ? 'on' : ''}`} onClick={() => { setMystery(false); reset(false); }}>Choose a look</button>
          <button className={`chip ${mystery ? 'on' : ''}`} onClick={() => { setMystery(true); reset(true); }}>Mystery look</button>
        </div>
        {!mystery ? (
          <ul className="look-list">
            {LOOKS.map((l) => (
              <li key={l.id} className={l.id === practiceLookId ? 'active' : ''} onClick={() => setPractice(undefined, l.id)}>
                <span>{l.name}</span>
                <span className="tags">{l.shell}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">The defense is hidden until the snap. Read the alignment, name the coverage, then predict the throw: game conditions.</p>
        )}
        </>}
        {!mystery && (
          <div className="look-card">
            <b>{look.name}</b>
            <p className="small">{look.summary}</p>
            <div className="small"><b>Pre-snap keys:</b>
              <ul>{look.presnapKeys.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
          </div>
        )}
      </aside>

      <section className="center">
        <div className="toolbar">
          <h2 className="play-title">{play.name} <span className="muted">vs {phase === 'review' || !mystery ? look.name : '???'}</span></h2>
          <div className="spacer" />
          <label className="check"><input type="checkbox" checked={showZones} disabled={mystery && phase === 'predict'} onChange={(e) => setShowZones(e.target.checked)} /> Show coverage</label>
        </div>
        <Field
          play={play}
          look={look}
          frame={phase === 'predict' ? null : frame}
          showZones={showZones && !(mystery && phase === 'predict')}
          highlight={highlight}
          onPick={phase === 'predict' ? (id) => setPredTarget(id) : undefined}
          pickedId={predTarget !== 'none' ? predTarget : null}
          answerIds={answerIds}
        />
        {result && phase !== 'predict' && (
          <div className="playback">
            <button className="btn small" onClick={() => { if (frameIdx >= result.frames.length - 1) setFrameIdx(0); setPlaying(!playing); }}>
              {playing ? 'Pause' : frameIdx >= result.frames.length - 1 ? 'Replay' : 'Play'}
            </button>
            <input
              type="range"
              min={0}
              max={result.frames.length - 1}
              value={frameIdx}
              onChange={(e) => { setPlaying(false); setFrameIdx(Number(e.target.value)); }}
              aria-label="Scrub through the play"
            />
            <span className="mono">{frame?.t.toFixed(2)}s</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed">
              <option value={0.25}>¼×</option>
              <option value={0.6}>½×</option>
              <option value={1}>1×</option>
            </select>
          </div>
        )}

        {phase === 'predict' && (
          <div className="predict">
            {mystery && (
              <div className="q">
                <div className="q-title"><span className="step">1</span> What coverage is this? <span className="muted">(count the safeties)</span></div>
                <div className="chips">
                  {FAMILIES.map((f) => (
                    <button key={f.id} className={`chip ${predFamily === f.id ? 'on' : ''}`} onClick={() => setPredFamily(f.id)}>{f.name}</button>
                  ))}
                </div>
              </div>
            )}
            {play.run ? (
              <div className="q">
                <div className="q-title"><span className="step">{mystery ? 2 : 1}</span> Count the box. Is this a good look to run {play.name} against?</div>
                <div className="chips">
                  <button className={`chip ${predTarget === 'yes' ? 'on' : ''}`} onClick={() => setPredTarget('yes')}>Yes: we have the numbers (or even)</button>
                  <button className={`chip ${predTarget === 'no' ? 'on' : ''}`} onClick={() => setPredTarget('no')}>No: they've loaded the box</button>
                </div>
              </div>
            ) : (
            <div className="q">
              <div className="q-title"><span className="step">{mystery ? 2 : 1}</span> Where should the ball go against this look? <span className="muted">(click a receiver)</span></div>
              <div className="chips">
                {runners.map((p) => (
                  <button key={p.id} className={`chip ${predTarget === p.id ? 'on' : ''}`} onClick={() => setPredTarget(p.id)}>
                    {p.id} <span className="muted">{p.assignment.kind === 'route' ? ROUTES[p.assignment.route].label : ''}</span>
                  </button>
                ))}
                <button className={`chip ${predTarget === 'none' ? 'on' : ''}`} onClick={() => setPredTarget('none')}>Nobody: check it down / throw it away</button>
              </div>
            </div>
            )}
            <button className="btn primary big" disabled={!canSnap || (weekMode && repsLeft <= 0)} onClick={snap}>{weekMode ? `Snap it (uses 1 of ${repsLeft} reps)` : 'Snap it'}</button>
            {weekMode && repsLeft <= 0 && <span className="muted small"> No practice reps left this week. Go play the game, or switch to the film room lab.</span>}
            {!canSnap && <span className="muted small"> Make your call first. Predicting is how you learn.</span>}
          </div>
        )}
      </section>

      <aside className="panel inspector diag">
        {!result || phase === 'predict' ? (
          <div className="section">
            <h3>How practice works</h3>
            <ol className="small steps">
              <li>Study the play and the defense{mystery ? ' (hidden: read the alignment)' : ''}.</li>
              <li>Predict where the ball should go.</li>
              <li>Snap it and watch the rep (scrub to slow it down).</li>
              <li>Read the diagnosis: <i>why</i> it worked or failed, and what to change.</li>
            </ol>
            <p className="small muted">Your predictions are how Chalkboard measures what you've learned. Mastery only grows when you call it right.</p>
            <h3>Numbering</h3>
            <ul className="small">
              {runners.map((p) => <li key={p.id}><b>{p.id}</b>: {numbering.labelOf[p.id] ?? 'back'}</li>)}
            </ul>
          </div>
        ) : (
          <Diagnosis
            result={result}
            look={look}
            playName={play.name}
            predTarget={predTarget}
            predFamily={predFamily}
            graded={graded}
            revealed={phase === 'review'}
            onHover={setHover}
            onSeek={(t) => { setPlaying(false); setFrameIdx(Math.min(result.frames.length - 1, Math.round(t / 0.05))); }}
            onLesson={openLesson}
            onAgain={() => reset()}
            onTryLook={(id) => { setMystery(false); setPractice(undefined, id); }}
          />
        )}
      </aside>
    </div>
  );
}

export function Diagnosis(props: {
  result: SimResult;
  look: DefensiveLook;
  playName: string;
  predTarget: string | null;
  predFamily: CoverageFamily | null;
  graded: { target?: boolean; family?: boolean; shell?: boolean } | null;
  revealed: boolean;
  onHover: (e: TraceEvent | null) => void;
  onSeek: (t: number) => void;
  onLesson: (id: string) => void;
  onAgain: () => void;
  onTryLook: (id: string) => void;
  /** Game mode: hide the practice-only sections */
  compact?: boolean;
}) {
  const { result: r, look, predTarget, predFamily, graded, revealed, onHover, onSeek, onLesson, onAgain, onTryLook } = props;
  if (!revealed) return <div className="section"><p className="muted">Watching the rep…</p></div>;
  const groups: { title: string; kinds: TraceEvent['kind'][] }[] = [
    { title: 'Before the snap', kinds: ['presnap', 'box', 'protection'] },
    { title: 'What happened', kinds: ['conflict', 'defender', 'read', 'result', 'scheme'] },
    { title: 'Coaching adjustments', kinds: ['adjustment'] },
  ];
  const best = r.bestAnswer;
  const pickedWindow = r.windows.find((w) => w.receiverId === predTarget);
  const famName = FAMILIES.find((f) => f.id === predFamily)?.name;

  return (
    <>
      <div className={`result-banner ${r.result.kind}`}>
        <span className="result-kind">{RESULT_TEXT[r.result.kind]}</span>
        <span className="result-yds">{r.result.yards > 0 ? '+' : ''}{r.result.yards} yds</span>
      </div>

      <div className="section grade">
        {graded?.family !== undefined && (
          <div className={graded.family ? 'ok' : graded.shell ? 'half' : 'bad'}>
            {graded.family ? '✔' : '✘'} Coverage: you said <b>{famName}</b>; it was <b>{look.name}</b>.
            {!graded.family && graded.shell && ' Right shell, wrong coverage. Close.'}
          </div>
        )}
        {graded?.target !== undefined && r.isRun && (
          <div className={graded.target ? 'ok' : 'bad'}>
            {graded.target ? '✔ Right call on the box count.' : '✘ Check the box count below: that call was wrong.'}
          </div>
        )}
        {graded?.target !== undefined && !r.isRun && (
          <div className={graded.target ? 'ok' : 'bad'}>
            {graded.target ? '✔ Good read. ' : '✘ '}
            {predTarget === 'none'
              ? best ? <>You said nobody, but <b>{best.receiverId}</b> had {best.separation.toFixed(1)} yds.</> : <>Nothing was open. Correct.</>
              : <>You picked <b>{predTarget}</b> ({pickedWindow ? `${pickedWindow.separation.toFixed(1)} yds, ${pickedWindow.openness}` : 'no window'}).
                {best && !graded.target && <> Best answer: <b>{best.receiverId}</b> ({best.separation.toFixed(1)} yds at {best.t.toFixed(1)}s).</>}
                {!best && <> Nothing got open against this look.</>}</>}
          </div>
        )}
      </div>

      {groups.map((g) => {
        const items = r.trace.filter((e) => g.kinds.includes(e.kind));
        if (!items.length) return null;
        return (
          <div className="section" key={g.title}>
            <h3>{g.title}</h3>
            <ul className="trace">
              {items.map((e, i) => (
                <li
                  key={i}
                  className={`ev ${e.kind}`}
                  onMouseEnter={() => onHover(e)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => e.t > 0 && onSeek(e.t)}
                  title={e.t > 0 ? 'Click to jump to this moment' : undefined}
                >
                  {e.t > 0 && <span className="t">{e.t.toFixed(1)}s</span>}
                  <RichText text={e.text} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {!r.isRun && <div className="section">
        <h3>Every receiver's best window</h3>
        <table className="windows">
          <thead><tr><th>Rcvr</th><th>Sep.</th><th>When</th><th>Closest defender</th></tr></thead>
          <tbody>
            {r.windows.map((w) => (
              <tr key={w.receiverId} className={w.openness}>
                <td><b>{w.receiverId}</b></td>
                <td>{w.separation >= 6 ? 'wide open' : `${w.separation.toFixed(1)} yds`}</td>
                <td>{w.t.toFixed(1)}s</td>
                <td>{look.players.find((d) => d.id === w.coveredBy)?.name ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">Separation = yards between the receiver and the nearest defender when the ball arrives. 2.5+ is open, 1.2-2.5 is a tight window.</p>
      </div>}

      <div className="section">
        <h3>How to beat {look.name}</h3>
        <p className="small"><RichText text={HOW_TO_BEAT[look.family]} /></p>
      </div>

      {!props.compact && <div className="section">
        <h3>Study next</h3>
        <div className="chips">
          {r.suggestedLessons.map((t) => {
            const topic = topicById(t);
            return topic ? <button key={t} className="chip" onClick={() => onLesson(topic.lessonId)}>{topic.name} →</button> : null;
          })}
        </div>
        <h3>Same play, different look</h3>
        <div className="chips">
          {LOOKS.filter((l) => l.id !== look.id).map((l) => (
            <button key={l.id} className="chip" onClick={() => onTryLook(l.id)}>{l.name}</button>
          ))}
        </div>
        <button className="btn primary" onClick={onAgain}>Next rep</button>
      </div>}
    </>
  );
}
