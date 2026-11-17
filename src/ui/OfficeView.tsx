import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import type { Career } from '../model/career';
import type { Play } from '../model/types';
import { ALL_TEMPLATES } from '../content/plays';
import { lookById } from '../content/looks';
import { BACKGROUNDS, OPPONENTS, PEOPLE, PHILOSOPHIES, SCHOOL, SEASON_LENGTH, WINS_NEEDED } from '../content/world';
import { CONCEPT_VS_COVERAGE, HOW_TO_BEAT } from '../content/knowledge';
import { CONCEPTS, detectConcepts } from '../engine/concepts';
import { countBox } from '../engine/run';
import { mixPercent, opponentForWeek, record, seasonOver } from '../engine/career';
import { newGame, FAMILY_NAME } from '../engine/game';
import { ROUTES } from '../engine/routes';
import type { CoverageFamily } from '../model/types';

type Tab = 'inbox' | 'scouting' | 'plan' | 'roster';
const MAX_PLAN = 12;

export function playKind(p: Play): string {
  if (p.run) return 'Run';
  const first = p.players.find((x) => x.id === p.progression[0]);
  if (p.drop === 3 || (first?.assignment.kind === 'route' && ROUTES[first.assignment.route].level === 'short')) return 'Quick pass';
  return 'Dropback pass';
}

export function Pips({ n }: { n: number }) {
  return (
    <span className="pips" title={`Install level ${n}/3`}>
      {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'on' : ''} />)}
    </span>
  );
}

export function OfficeView() {
  const { career, updateCareer, setView, setGame, plays, setPracticeMode, resetCareer } = useStore();
  const [tab, setTab] = useState<Tab>('inbox');
  const [openMsg, setOpenMsg] = useState<string | null>(null);
  if (!career) return null;
  const c = career;
  const over = seasonOver(c);
  const opp = over ? null : opponentForWeek(c.week);
  const rec = record(c);
  const unread = c.inbox.filter((m) => !m.read).length;

  const startGame = () => {
    if (!opp) return;
    setGame(newGame(opp.id, c.coach.background === 'formerQB' ? 2 : 1));
    setView('game');
  };

  return (
    <div className="three-col">
      <aside className="panel list-panel">
        <h2>Coach {c.coach.name}</h2>
        <p className="small muted">Offensive Coordinator · {SCHOOL.name} {SCHOOL.mascot}<br />{BACKGROUNDS[c.coach.background].name} · {PHILOSOPHIES[c.coach.philosophy].name}</p>
        <ul className="lesson-list office-nav">
          <li className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}><span>Inbox {unread > 0 && <span className="badge">{unread}</span>}</span></li>
          <li className={tab === 'scouting' ? 'active' : ''} onClick={() => { setTab('scouting'); updateCareer((x) => ({ ...x, weekSteps: { ...x.weekSteps, scouted: true } })); }}>
            <span>1. Scouting report {c.weekSteps.scouted && '✔'}</span><span className="tags">What does their defense do?</span>
          </li>
          <li className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>
            <span>2. Game plan {c.gamePlan.length >= 5 && '✔'}</span><span className="tags">{c.gamePlan.length}/{MAX_PLAN} plays on the call sheet</span>
          </li>
          <li onClick={() => { setPracticeMode('week'); setView('practice'); }}>
            <span>3. Practice →</span><span className="tags">{c.practiceRepsLeft} reps left this week</span>
          </li>
          <li className={tab === 'roster' ? 'active' : ''} onClick={() => setTab('roster')}><span>Roster</span><span className="tags">Ratings, buy-in</span></li>
        </ul>
        <div className="section">
          <h3>Season</h3>
          <ul className="sched">
            {OPPONENTS.map((o, i) => {
              const r = c.results.find((x) => x.opponentId === o.id);
              return (
                <li key={o.id} className={i + 1 === c.week ? 'now' : ''}>
                  <span>Wk {i + 1} {o.school}{o.rival ? ' ★' : ''}</span>
                  <span className={r ? (r.us > r.them ? 'w' : r.us < r.them ? 'l' : '') : 'muted'}>{r ? `${r.us > r.them ? 'W' : r.us < r.them ? 'L' : 'T'} ${r.us}-${r.them}` : ''}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <button className="btn ghost small" onClick={() => { if (confirm('Start a brand-new career? This erases your current season (your custom plays and Classroom progress are kept).')) resetCareer(); }}>New career</button>
      </aside>

      <section className="center office-main">
        {over ? <SeasonSummary c={c} /> : (
          <>
            {tab === 'inbox' && (
              <div className="inbox">
                <ul className="msg-list">
                  {c.inbox.map((m) => (
                    <li key={m.id} className={`${openMsg === m.id ? 'active' : ''} ${m.read ? '' : 'unread'}`} onClick={() => { setOpenMsg(m.id); updateCareer((x) => ({ ...x, inbox: x.inbox.map((y) => (y.id === m.id ? { ...y, read: true } : y)) })); }}>
                      <span className="from">{m.from}</span>
                      <span className="subj">{m.subject}</span>
                    </li>
                  ))}
                </ul>
                <div className="msg-body">
                  {(() => {
                    const m = c.inbox.find((x) => x.id === openMsg);
                    if (!m) return <p className="muted">Select a message.</p>;
                    return (
                      <>
                        <div className="muted small">From {m.from} · Week {Math.min(m.week, SEASON_LENGTH)}</div>
                        <h2>{m.subject}</h2>
                        {m.body.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            {tab === 'scouting' && opp && <Scouting c={c} />}
            {tab === 'plan' && opp && <GamePlan c={c} myPlays={plays} />}
            {tab === 'roster' && <Roster c={c} />}
          </>
        )}
      </section>

      <aside className="panel inspector">
        <div className="section">
          <h3>Record</h3>
          <div className="big-record">{rec.text}</div>
          <p className="small muted">Pruitt needs {WINS_NEEDED} wins. {Math.max(0, WINS_NEEDED - rec.w)} to go.</p>
          <h3>Job security</h3>
          <div className="meter"><span style={{ width: `${c.jobSecurity}%` }} className={c.jobSecurity < 30 ? 'bad' : c.jobSecurity < 55 ? 'mid' : 'good'} /></div>
          <p className="small muted">{c.jobSecurity >= 70 ? 'The town loves you.' : c.jobSecurity >= 45 ? 'Pruitt is patient. For now.' : c.jobSecurity >= 25 ? 'Boosters are asking questions.' : 'You are coaching for your job.'}</p>
        </div>
        {opp && (
          <div className="section">
            <h3>Week {c.week} of {SEASON_LENGTH}</h3>
            <div className="next-game">
              <div className="vs">vs <b>{opp.school} {opp.mascot}</b>{opp.rival && <span className="badge">Rivalry</span>}</div>
              <p className="small">{opp.blurb}</p>
              <ul className="checklist small">
                <li className={c.weekSteps.scouted ? 'done' : ''}>Read the scouting report</li>
                <li className={c.gamePlan.length >= 5 ? 'done' : ''}>Build a call sheet (5-{MAX_PLAN} plays)</li>
                <li className={c.practiceRepsLeft === 0 ? 'done' : ''}>Practice ({c.practiceRepsLeft} reps left)</li>
              </ul>
              <button className="btn primary big full" disabled={c.gamePlan.length < 5} onClick={startGame}>Friday night: play {opp.school} →</button>
              {c.gamePlan.length < 5 && <p className="small muted">Put at least 5 plays on your call sheet first.</p>}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Scouting({ c }: { c: Career }) {
  const opp = opponentForWeek(c.week);
  const film = c.coach.background === 'filmJunkie';
  const base = mixPercent(opp.coverageMix);
  const iz = ALL_TEMPLATES.find((p) => p.id === 't-iz')!;
  const avgBox = base.reduce((a, m) => a + (countBox(iz, lookById(m.id)).inBox.length * m.pct) / 100, 0);
  const topFamilies = [...new Set(base.slice(0, 3).map((m) => lookById(m.id).family))].slice(0, 2);
  const beaters = (fam: CoverageFamily) => Object.entries(CONCEPT_VS_COVERAGE).filter(([, v]) => v[fam]?.fit === 'good').map(([k]) => CONCEPTS[k].name);
  const blitz = mixPercent(opp.thirdLongMix).find((m) => m.id === 'cover0')?.pct ?? 0;
  return (
    <div className="report">
      <div className="kicker">Scouting report · Week {c.week}</div>
      <h1>{opp.school} {opp.mascot} defense</h1>
      <p className="lede">{opp.blurb}</p>
      <h2>Base calls (all downs)</h2>
      <MixBars mix={opp.coverageMix} />
      <p className="small muted">Against a 2x2 formation, expect about <b>{avgBox.toFixed(1)}</b> defenders in the box on average. {avgBox >= 6.5 ? 'They load the box: they want to stop the run first.' : 'A lighter box: the run game should have room.'}</p>
      {film ? (
        <>
          <h2>3rd & long</h2>
          <MixBars mix={opp.thirdLongMix} />
          {blitz > 0 && <p className="small">They bring Cover 0 pressure on <b>{blitz}%</b> of 3rd & longs. Have a hot answer ready.</p>}
          <h2>Red zone</h2>
          <MixBars mix={opp.redZoneMix} />
        </>
      ) : (
        <div className="locked small">Situational tendencies (3rd & long, red zone) are hidden. A Film Junkie coach would have broken those down.</div>
      )}
      <h2>Ray's notes</h2>
      {topFamilies.map((fam) => (
        <div key={fam} className="keypoint">
          <b>vs {FAMILY_NAME[fam]}:</b> {HOW_TO_BEAT[fam]}
          <div className="small" style={{ marginTop: 6 }}>Classic answers: {beaters(fam).join(', ') || '—'}</div>
        </div>
      ))}
      <p className="small muted">How {opp.school}'s coordinator adjusts during a game: {opp.adaptiveness >= 0.7 ? 'fast. He will take away whatever is working.' : opp.adaptiveness >= 0.5 ? 'he will adjust if you keep calling the same thing.' : 'slowly. He trusts his base defense.'}</p>
    </div>
  );
}

function MixBars({ mix }: { mix: Record<string, number> }) {
  return (
    <div className="mix">
      {mixPercent(mix).map((m) => {
        const l = lookById(m.id);
        return (
          <div key={m.id} className="mix-row">
            <span className="mix-name">{l.name}</span>
            <span className="mix-bar"><span style={{ width: `${m.pct}%` }} /></span>
            <span className="mix-pct">{m.pct}%</span>
            <span className="tags">{l.shell}</span>
          </div>
        );
      })}
    </div>
  );
}

function GamePlan({ c, myPlays }: { c: Career; myPlays: Play[] }) {
  const { updateCareer } = useStore();
  const opp = opponentForWeek(c.week);
  const top = mixPercent(opp.coverageMix).slice(0, 3).map((m) => lookById(m.id));
  const all = [...myPlays, ...ALL_TEMPLATES];
  const fitFor = (p: Play, lookId: string): 'good' | 'ok' | 'bad' | null => {
    const look = lookById(lookId);
    if (p.run) {
      const adv = countBox(p, look).advantage;
      return adv > 0 ? 'good' : adv === 0 ? 'ok' : 'bad';
    }
    const fits = detectConcepts(p).map((k) => CONCEPT_VS_COVERAGE[k]?.[look.family]?.fit).filter(Boolean) as string[];
    if (!fits.length) return null;
    return fits.includes('good') ? 'good' : fits.includes('ok') ? 'ok' : 'bad';
  };
  const toggle = (id: string) =>
    updateCareer((x) => {
      const on = x.gamePlan.includes(id);
      if (!on && x.gamePlan.length >= MAX_PLAN) return x;
      return { ...x, gamePlan: on ? x.gamePlan.filter((y) => y !== id) : [...x.gamePlan, id], weekSteps: { ...x.weekSteps, planned: true } };
    });
  const groups = useMemo(() => {
    const g: Record<string, Play[]> = {};
    for (const p of all) (g[playKind(p)] ??= []).push(p);
    return g;
  }, [all]);
  return (
    <div className="report">
      <div className="kicker">Game plan · Week {c.week} vs {opp.school}</div>
      <h1>Build your call sheet</h1>
      <p className="lede">Pick up to {MAX_PLAN} plays for Friday. The ratings show how each play fits their three most common looks. Install pips show how well your team knows the play; practice raises them.</p>
      <table className="plan-table">
        <thead>
          <tr>
            <th></th><th>Play</th><th>Install</th>
            {top.map((l) => <th key={l.id} className="fit-col">{l.name}</th>)}
          </tr>
        </thead>
        {Object.entries(groups).map(([kind, ps]) => (
          <tbody key={kind}>
            <tr className="group-row"><td colSpan={3 + top.length}>{kind}</td></tr>
            {ps.map((p) => {
              const on = c.gamePlan.includes(p.id);
              return (
                <tr key={p.id} className={on ? 'on' : ''} onClick={() => toggle(p.id)}>
                  <td><input type="checkbox" readOnly checked={on} /></td>
                  <td><b>{p.name}</b> <span className="tags">{p.isTemplate ? '' : '(yours)'}</span></td>
                  <td><Pips n={c.install[p.id] ?? 0} /></td>
                  {top.map((l) => {
                    const f = fitFor(p, l.id);
                    return <td key={l.id} className="fit-col">{f ? <span className={`fit ${f}`}>{f === 'good' ? 'beats it' : f === 'ok' ? 'workable' : 'struggles'}</span> : <span className="muted">?</span>}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
      <p className="small muted">"?" means the play isn't a named concept, so there's no scouting note for it. Test it in the Practice lab to find out.</p>
    </div>
  );
}

function Roster({ c }: { c: Career }) {
  const keys: [string, keyof Career['roster'][number]['ratings']][] = [['SPD', 'speed'], ['HND', 'hands'], ['RTE', 'routeRunning'], ['STR', 'strength'], ['IQ', 'footballIQ']];
  return (
    <div className="report">
      <div className="kicker">{SCHOOL.name} {SCHOOL.mascot}</div>
      <h1>Your offense</h1>
      <p className="lede">Ratings affect every snap: receiver speed creates separation, hands decide close catches, and your QB's processing speed decides how fast he gets through his reads. Buy-in rises with wins and good teaching; low buy-in means more mental errors.</p>
      <div className="roster-grid">
        {c.roster.map((p) => (
          <div key={p.id} className="player-card">
            <div className="pc-head"><b>{p.name}</b> <span className="muted">{p.position} · {p.year} · plays {p.slot}</span></div>
            <div className="small">{p.trait}</div>
            <div className="ratings">
              {p.slot === 'QB' && <><Rating label="ACC" v={p.ratings.accuracy ?? 0} /><Rating label="READ" v={p.ratings.processing ?? 0} /></>}
              {keys.filter(([, k]) => !(p.slot === 'OL' && (k === 'hands' || k === 'routeRunning'))).map(([label, k]) => <Rating key={label} label={label} v={p.ratings[k] as number} />)}
            </div>
            <div className="buyin small">Buy-in <span className="meter thin"><span style={{ width: `${p.buyIn}%` }} className={p.buyIn < 40 ? 'bad' : p.buyIn < 65 ? 'mid' : 'good'} /></span> {p.buyIn}</div>
          </div>
        ))}
      </div>
      <p className="small muted">{PEOPLE.headCoach.name} runs the defense. It's average: about what you'd expect from a 3-7 team.</p>
    </div>
  );
}

function Rating({ label, v }: { label: string; v: number }) {
  return (
    <span className="rating">
      <span className="r-label">{label}</span>
      <span className={`r-val ${v >= 75 ? 'good' : v >= 55 ? 'mid' : 'bad'}`}>{v}</span>
    </span>
  );
}

function SeasonSummary({ c }: { c: Career }) {
  const rec = record(c);
  const made = rec.w >= WINS_NEEDED;
  const beatRival = c.results.some((r) => OPPONENTS.find((o) => o.id === r.opponentId)?.rival && r.us > r.them);
  return (
    <div className="report">
      <div className="kicker">End of the regular season</div>
      <h1>{rec.text}. {made ? 'You did it.' : 'Not enough.'}</h1>
      <p className="lede">
        {made
          ? `Pruitt meets you at midfield. "Six wins. I told the boosters you'd do it." ${beatRival ? 'And Boca Rio finally beat Puerto Viejo. Nobody in town is paying for a meal for a while.' : ''}`
          : `Pruitt calls you into his office on Monday. "I went to bat for you. We needed six." The booster club gets its way.`}
      </p>
      <p>Points scored: {c.results.reduce((a, r) => a + r.us, 0)} · Points allowed: {c.results.reduce((a, r) => a + r.them, 0)}</p>
      <p className="muted">The next chapter (playoffs, offers from other programs, and the climb to head coach) is coming in a future update. Start a new career from the left panel to play again.</p>
    </div>
  );
}
