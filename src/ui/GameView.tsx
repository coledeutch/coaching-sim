import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import type { Play, TraceEvent } from '../model/types';
import { ALL_TEMPLATES } from '../content/plays';
import { lookById } from '../content/looks';
import { OPPONENTS, PEOPLE, SCHOOL } from '../content/world';
import {
  applyPlay, callDefense, clockText, downText, executePlay, fieldGoalChance, fourthDownDecision, playerEffects,
  situationName, spot, startSecondHalf, theirDrive, type GameState,
} from '../engine/game';
import { finishWeek, gameReview, mixPercent } from '../engine/career';
import { countBox } from '../engine/run';
import { Field } from './Field';
import { Diagnosis } from './PracticeView';
import { Pips, playKind } from './OfficeView';
import { usePlayback } from './usePlayback';

const OUR_DEFENSE = 55;
const newSeed = () => Math.floor(Math.random() * 1e9);

export function GameView() {
  const { career, game, setGame, updateCareer, setView, plays } = useStore();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [hover, setHover] = useState<TraceEvent | null>(null);
  const [animDone, setAnimDone] = useState(true);
  const fx = useMemo(() => (career ? playerEffects(career.roster) : {}), [career]);
  const pb = usePlayback(game?.lastResult, 1, () => setAnimDone(true));

  if (!career || !game) {
    return (
      <div className="center"><p>No game in progress.</p><button className="btn" onClick={() => setView('office')}>Back to the office</button></div>
    );
  }
  const g = game;
  const opp = OPPONENTS.find((o) => o.id === g.opponentId)!;
  const oppShort = opp.school.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
  const allPlays: Play[] = [...plays, ...ALL_TEMPLATES];
  const callSheet = career.gamePlan.map((id) => allPlays.find((p) => p.id === id)).filter((p): p is Play => !!p);
  const avgBuyIn = career.roster.reduce((a, p) => a + p.buyIn, 0) / career.roster.length;
  const formerQB = career.coach.background === 'formerQB';
  const audibles = formerQB ? 2 : 1;

  const pending = callSheet.find((p) => p.id === g.pendingPlayId);
  const pendingLook = g.pendingLookId ? lookById(g.pendingLookId) : null;
  const lastPlay = g.lastResult ? allPlays.find((p) => p.id === g.lastResult!.playId) : undefined;
  const lastLook = g.lastResult ? lookById(g.lastResult.lookId) : null;

  const usage = (id: string) => {
    const cs = g.calls.filter((c) => c.playId === id);
    return cs.length ? `${cs.length}× · ${cs.reduce((a, c) => a + c.yards, 0)} yds` : '';
  };

  const callPlay = (p: Play) => {
    if (g.phase === 'call') {
      const { look, note } = callDefense(g, opp, newSeed());
      setGame({ ...g, phase: 'presnap', pendingPlayId: p.id, pendingLookId: look.id, pressBox: note ?? g.pressBox });
      setShowBreakdown(false);
    } else if (g.phase === 'presnap' && g.audiblesLeft > 0 && p.id !== g.pendingPlayId) {
      setGame({ ...g, pendingPlayId: p.id, audiblesLeft: g.audiblesLeft - 1 });
    }
  };

  const snap = () => {
    if (!pending || !pendingLook) return;
    const install = career.install[pending.id] ?? 0;
    const { result, busted } = executePlay(pending, pendingLook, fx, install, avgBuyIn < 40, newSeed());
    const names = Object.fromEntries(career.roster.map((p) => [p.slot, p.name.split(' ').slice(-1)[0]]));
    setGame(applyPlay(g, pending, pendingLook, result, busted, oppShort, names));
    setAnimDone(false);
    setTimeout(() => pb.start(), 0);
  };

  const advance = () => {
    setShowBreakdown(false);
    switch (g.next) {
      case 'call': setGame({ ...g, phase: 'call', pendingPlayId: undefined, pendingLookId: undefined }); break;
      case 'fourth': setGame({ ...g, phase: 'fourth' }); break;
      case 'theirDrive': setGame(theirDrive(g, opp, OUR_DEFENSE, newSeed())); break;
      case 'halftime': setGame({ ...g, phase: 'halftime' }); break;
      case 'final': setGame({ ...g, phase: 'final' }); break;
    }
  };

  const finish = () => {
    updateCareer((c) => finishWeek(c, g));
    setGame(null);
    setView('office');
  };

  const showFrame = g.phase === 'result' && g.lastResult ? pb.frame : null;
  const fieldPlay = g.phase === 'presnap' ? pending : g.phase === 'result' ? lastPlay : undefined;
  const fieldLook = g.phase === 'presnap' ? pendingLook : g.phase === 'result' ? lastLook : null;
  const box = g.phase === 'presnap' && pending && pendingLook ? countBox(pending, pendingLook).inBox.length : null;
  const topMix = mixPercent(opp.coverageMix).slice(0, 2).map((m) => `${lookById(m.id).name} ${m.pct}%`).join(' · ');

  return (
    <div className="three-col game">
      <aside className="panel list-panel">
        <Scoreboard g={g} opp={opp.school} oppShort={oppShort} />
        <div className="section">
          <h3>Call sheet</h3>
          <p className="small muted">Scouting: {topMix}</p>
          {(['Run', 'Quick pass', 'Dropback pass'] as const).map((kind) => {
            const ps = callSheet.filter((p) => playKind(p) === kind);
            if (!ps.length) return null;
            return (
              <div key={kind} className="callgroup">
                <div className="tags">{kind}</div>
                {ps.map((p) => {
                  const canCall = g.phase === 'call' || (g.phase === 'presnap' && g.audiblesLeft > 0 && p.id !== g.pendingPlayId);
                  return (
                    <button key={p.id} className={`call ${g.pendingPlayId === p.id && g.phase === 'presnap' ? 'on' : ''}`} disabled={!canCall} onClick={() => callPlay(p)}>
                      <span>{p.name}</span>
                      <span className="call-meta"><span className="tags">{usage(p.id)}</span><Pips n={career.install[p.id] ?? 0} /></span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {g.phase === 'presnap' && <p className="small muted">{g.audiblesLeft > 0 ? `Audibles left this half: ${g.audiblesLeft}. Click another play to check out of this one.` : 'No audibles left this half.'}</p>}
        </div>
      </aside>

      <section className="center">
        {g.pressBox && (g.phase === 'call' || g.phase === 'presnap') && <div className="pressbox"><b>Press box:</b> {g.pressBox}</div>}

        {fieldPlay ? (
          <Field
            play={fieldPlay}
            look={fieldLook}
            frame={showFrame}
            highlight={hover ? { receivers: hover.receivers, defenders: hover.defenders } : undefined}
          />
        ) : (
          <div className="field-placeholder">
            {g.phase === 'call' && <><div className="situation">{downText(g)} at {spot(g.ball, oppShort)}</div><div className="muted">{situationName(g)} · Call a play from your call sheet.</div></>}
            {g.phase === 'theirDrive' && <><div className="muted">{opp.school} has the ball</div><div className="situation small-sit">{g.theirDriveText}</div></>}
            {g.phase === 'fourth' && <div className="situation">4th & {Math.round(g.toGo)} at {spot(g.ball, oppShort)}</div>}
            {g.phase === 'result' && <div className="situation small-sit">{g.lastText}</div>}
            {(g.phase === 'halftime' || g.phase === 'final') && <div className="situation">{SCHOOL.name} {g.us}, {opp.school} {g.them}</div>}
          </div>
        )}

        {g.phase === 'presnap' && pending && (
          <div className="presnap-bar">
            <div>
              <b>{pending.name}</b> <span className="muted">· {downText(g)} at {spot(g.ball, oppShort)}</span>
              <div className="small muted">
                {formerQB && pendingLook ? <>Your read: <b>{pendingLook.shell}</b> shell, {box} in the box.</> : 'Count the safeties and the box before you snap it.'}
              </div>
            </div>
            <div className="spacer" />
            <button className="btn primary big" onClick={snap}>Snap it</button>
          </div>
        )}

        {g.phase === 'result' && (
          <div className="result-bar">
            <div className={`result-line ${g.lastResult?.result.kind ?? ''}`}>{g.lastText}</div>
            <div className="result-actions">
              {g.lastResult && <button className="btn small" onClick={() => { setAnimDone(false); pb.start(); }}>Replay</button>}
              {g.lastResult && <button className="btn small" onClick={() => setShowBreakdown((v) => !v)}>{showBreakdown ? 'Hide breakdown' : 'Why? (breakdown)'}</button>}
              <div className="spacer" />
              <button className="btn primary" disabled={!animDone && pb.playing} onClick={advance}>Continue →</button>
            </div>
          </div>
        )}

        {g.phase === 'theirDrive' && (
          <div className="result-bar">
            <div className="result-line">{g.theirDriveText}</div>
            <div className="result-actions"><div className="spacer" /><button className="btn primary" onClick={advance}>{g.next === 'call' ? 'Take the field →' : 'Continue →'}</button></div>
          </div>
        )}

        {g.phase === 'fourth' && (
          <div className="result-bar">
            <div className="result-line">4th & {Math.round(g.toGo)}. What's the call, Coach?</div>
            <div className="result-actions">
              <button className="btn" onClick={() => setGame(fourthDownDecision(g, 'go', newSeed()))}>Go for it</button>
              <button className="btn" onClick={() => setGame(fourthDownDecision(g, 'punt', newSeed()))}>Punt</button>
              {g.ball >= 55 && <button className="btn" onClick={() => setGame(fourthDownDecision(g, 'fg', newSeed()))}>Field goal ({Math.round(100 - g.ball + 17)} yds, {Math.round(fieldGoalChance(g.ball) * 100)}%)</button>}
            </div>
          </div>
        )}

        {g.phase === 'halftime' && <Halftime g={g} onContinue={() => setGame(theirDrive(startSecondHalf(g, audibles), opp, OUR_DEFENSE, newSeed()))} opp={opp.school} />}
        {g.phase === 'final' && <Final g={g} opp={opp.school} onFinish={finish} />}
      </section>

      <aside className="panel inspector diag">
        {showBreakdown && g.lastResult && lastLook ? (
          <Diagnosis
            result={g.lastResult}
            look={lastLook}
            playName={lastPlay?.name ?? ''}
            predTarget={null}
            predFamily={null}
            graded={null}
            revealed
            compact
            onHover={setHover}
            onSeek={(t) => { pb.setPlaying(false); pb.setFrameIdx(Math.round(t / 0.05)); }}
            onLesson={() => {}}
            onAgain={() => {}}
            onTryLook={() => {}}
          />
        ) : (
          <div className="section">
            <h3>Play-by-play</h3>
            <ul className="pbp">
              {[...g.log].reverse().slice(0, 40).map((e, i) => (
                <li key={i} className={`${e.side} ${e.score ? 'score' : ''}`}>
                  <span className="t">Q{e.q} {clockText(e.clock)}</span> {e.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function Scoreboard({ g, opp, oppShort }: { g: GameState; opp: string; oppShort: string }) {
  return (
    <div className="scoreboard">
      <div className="sb-teams">
        <div className="sb-team"><span>{SCHOOL.name}</span><span className="sb-score">{g.us}</span></div>
        <div className="sb-team"><span>{opp}</span><span className="sb-score">{g.them}</span></div>
      </div>
      <div className="sb-meta">
        <span>Q{g.quarter}</span>
        <span className="mono">{clockText(g.clock)}</span>
      </div>
      <div className="sb-down">{g.phase === 'theirDrive' ? `${opp} ball` : `${downText(g)} · ${spot(g.ball, oppShort)}`}</div>
    </div>
  );
}

function StatLine({ g }: { g: GameState }) {
  const s = g.stats;
  return (
    <table className="windows statline">
      <tbody>
        <tr><td>Passing</td><td>{s.passComp}/{s.passAtt}, {s.passYds} yds</td></tr>
        <tr><td>Rushing</td><td>{s.rushAtt} for {s.rushYds} yds ({s.rushAtt ? (s.rushYds / s.rushAtt).toFixed(1) : '0.0'} avg)</td></tr>
        <tr><td>3rd down</td><td>{s.thirdConv}/{s.thirdAtt}</td></tr>
        <tr><td>Sacks / turnovers</td><td>{s.sacks} / {s.turnovers}</td></tr>
      </tbody>
    </table>
  );
}

function CoachNotes({ g }: { g: GameState }) {
  const rev = gameReview(g);
  const notes: string[] = [];
  if (rev.topFamily) notes.push(`They've played ${rev.topFamily.family} on ${Math.round(rev.topFamily.share * 100)}% of snaps.`);
  if (rev.missed.length) notes.push(`${rev.missed.length} time${rev.missed.length > 1 ? 's' : ''} a better throw was open: ${rev.missed.slice(-3).map((m) => `${m.missedWindow!.receiverId} on ${m.playName}`).join(', ')}. Open "Why?" after a play to see the read.`);
  if (rev.busts.length) notes.push(`${rev.busts.length} mental error${rev.busts.length > 1 ? 's' : ''}: plays with low install. Practice those plays, or call the ones your team knows.`);
  const best = rev.plays.filter((p) => p.n >= 2).sort((a, b) => b.yards / b.n - a.yards / a.n)[0];
  const worst = rev.plays.filter((p) => p.n >= 2).sort((a, b) => a.yards / a.n - b.yards / b.n)[0];
  if (best) notes.push(`Working: ${best.name} (${best.n} calls, ${(best.yards / best.n).toFixed(1)} per play).`);
  if (worst && worst !== best) notes.push(`Not working: ${worst.name} (${(worst.yards / worst.n).toFixed(1)} per play). Why? Check what coverage they're playing when you call it.`);
  notes.push(`Run/pass: ${rev.runs} runs, ${rev.passes} passes.`);
  return <ul className="notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>;
}

function Halftime({ g, onContinue, opp }: { g: GameState; onContinue: () => void; opp: string }) {
  return (
    <div className="card-panel">
      <div className="kicker">Halftime</div>
      <h2>{SCHOOL.name} {g.us}, {opp} {g.them}</h2>
      <StatLine g={g} />
      <h3>{PEOPLE.mentor.name}, from the stands</h3>
      <CoachNotes g={g} />
      <p className="small muted">{opp} receives the second-half kickoff.</p>
      <button className="btn primary" onClick={onContinue}>Second half →</button>
    </div>
  );
}

function Final({ g, opp, onFinish }: { g: GameState; opp: string; onFinish: () => void }) {
  const won = g.us > g.them;
  return (
    <div className="card-panel">
      <div className="kicker">Final</div>
      <h2>{won ? 'WIN' : g.us === g.them ? 'TIE' : 'LOSS'}: {SCHOOL.name} {g.us}, {opp} {g.them}</h2>
      <StatLine g={g} />
      <h3>Film review</h3>
      <CoachNotes g={g} />
      <button className="btn primary big" onClick={onFinish}>Back to the office →</button>
    </div>
  );
}
