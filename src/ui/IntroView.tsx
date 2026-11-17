import { useMemo, useState } from 'react';
import type { Background, Philosophy } from '../model/career';
import { BACKGROUNDS, INTRO_PAGES, PEOPLE, PHILOSOPHIES, SCHOOL, TASTE_QUESTIONS, startingRoster } from '../content/world';
import { useStore } from '../state/store';
import { RichText } from './RichText';

type Step = { kind: 'story'; i: number } | { kind: 'name' } | { kind: 'background' } | { kind: 'philosophy' } | { kind: 'team' } | { kind: 'ready' };

const STEPS: Step[] = [
  ...INTRO_PAGES.map((_, i) => ({ kind: 'story', i }) as Step),
  { kind: 'name' },
  { kind: 'background' },
  { kind: 'philosophy' },
  { kind: 'team' },
  { kind: 'ready' },
];

export function IntroView() {
  const startCareer = useStore((s) => s.startCareer);
  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState('');
  const [background, setBackground] = useState<Background | null>(null);
  const [answers, setAnswers] = useState<(Philosophy | null)[]>(TASTE_QUESTIONS.map(() => null));
  const [philosophy, setPhilosophy] = useState<Philosophy | null>(null);
  const step = STEPS[stepIdx];
  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const recommendation = useMemo<Philosophy | null>(() => {
    if (answers.some((a) => !a)) return null;
    const count: Record<string, number> = {};
    answers.forEach((a) => (count[a!] = (count[a!] ?? 0) + 1));
    const top = Object.entries(count).sort((a, b) => b[1] - a[1]);
    return top[0][1] > 1 ? (top[0][0] as Philosophy) : 'spread';
  }, [answers]);

  const coachName = name.trim() || 'Coach';
  const canNext =
    step.kind === 'name' ? name.trim().length > 0 :
    step.kind === 'background' ? !!background :
    step.kind === 'philosophy' ? !!(philosophy ?? recommendation) :
    true;

  return (
    <div className="intro">
      <div className="intro-card">
        <div className="intro-progress">
          {STEPS.map((_, i) => <span key={i} className={i <= stepIdx ? 'on' : ''} />)}
        </div>

        {step.kind === 'story' && (
          <>
            {INTRO_PAGES[step.i].kicker && <div className="kicker">{INTRO_PAGES[step.i].kicker}</div>}
            <h1>{INTRO_PAGES[step.i].title}</h1>
            {INTRO_PAGES[step.i].body.map((p, i) => <p key={i}><RichText text={p.replace(/\*([^*]+)\*/g, '$1')} /></p>)}
          </>
        )}

        {step.kind === 'name' && (
          <>
            <div className="kicker">Your new office has a nameplate</div>
            <h1>What do the players call you?</h1>
            <p>Pruitt slides a staff ID card across the desk. "Fill in your name. Kids'll call you Coach either way."</p>
            <input
              className="name-input"
              autoFocus
              placeholder="Your coach's last name"
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canNext && next()}
            />
            {name.trim() && <p className="muted">Offensive Coordinator · {SCHOOL.name} {SCHOOL.mascot} · Coach {coachName}</p>}
          </>
        )}

        {step.kind === 'background' && (
          <>
            <div className="kicker">Who you are</div>
            <h1>How did you get here, Coach {coachName}?</h1>
            <p className="muted">Each background gives you a strength and a weakness. None is wrong.</p>
            <div className="choice-grid">
              {(Object.keys(BACKGROUNDS) as Background[]).map((b) => (
                <button key={b} className={`choice ${background === b ? 'on' : ''}`} onClick={() => setBackground(b)}>
                  <div className="choice-title">{BACKGROUNDS[b].name}</div>
                  <div className="choice-tag">{BACKGROUNDS[b].tagline}</div>
                  <p className="small">{BACKGROUNDS[b].description}</p>
                  <div className="perk">+ {BACKGROUNDS[b].perk}</div>
                  <div className="flaw">− {BACKGROUNDS[b].flaw}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step.kind === 'philosophy' && (
          <>
            <div className="kicker">Your offense</div>
            <h1>What kind of football do you like?</h1>
            <p className="muted">Don't worry if you don't know offensive schemes yet. That's what you're here to learn. Answer from your gut, and Ray will point you in a direction.</p>
            {TASTE_QUESTIONS.map((q, qi) => (
              <div key={qi} className="taste">
                <div className="q-title">{q.q}</div>
                <div className="options">
                  {q.options.map((o, oi) => (
                    <button
                      key={oi}
                      className={`opt ${answers[qi] === o.leans ? 'right' : ''}`}
                      onClick={() => setAnswers((a) => a.map((x, i) => (i === qi ? o.leans : x)))}
                    >
                      {o.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {recommendation && (
              <>
                <div className="keypoint">
                  <b>Ray:</b> "Sounds like you'd enjoy a <b>{PHILOSOPHIES[recommendation].name}</b> offense. {PHILOSOPHIES[recommendation].oneLiner} But don't marry anything yet. Your real identity is whatever you end up calling on Friday nights."
                </div>
                <div className="choice-grid">
                  {(Object.keys(PHILOSOPHIES) as Philosophy[]).map((ph) => {
                    const on = (philosophy ?? recommendation) === ph;
                    return (
                      <button key={ph} className={`choice ${on ? 'on' : ''}`} onClick={() => setPhilosophy(ph)}>
                        <div className="choice-title">{PHILOSOPHIES[ph].name} {ph === recommendation && <span className="badge">Ray's pick</span>}</div>
                        <div className="choice-tag">{PHILOSOPHIES[ph].oneLiner}</div>
                        <p className="small">{PHILOSOPHIES[ph].plain}</p>
                        <p className="small muted">Looks like: {PHILOSOPHIES[ph].looksLike}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="small muted">Your philosophy sets your starting playbook and what the team practiced this summer. You can call any play you want, any week.</p>
              </>
            )}
          </>
        )}

        {step.kind === 'team' && (
          <>
            <div className="kicker">First practice</div>
            <h1>Meet your offense</h1>
            <p>Ten kids in practice jerseys watch you walk onto Tarpon Field. These are the ones who'll matter most.</p>
            <div className="roster-grid">
              {startingRoster(background ?? 'formerQB').map((p) => (
                <div key={p.id} className="player-card">
                  <div className="pc-head"><b>{p.name}</b> <span className="muted">{p.position} · {p.year}</span></div>
                  <div className="small">{p.trait}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {step.kind === 'ready' && (
          <>
            <div className="kicker">Week 1</div>
            <h1>Win six.</h1>
            <p>Pruitt hands you a folder. Calder Ridge, week one: "They play Cover 3 and dare you to beat it. Always have."</p>
            <p>Your job each week:</p>
            <ol className="week-steps-intro">
              <li><b>Scout</b> the opponent: what does their defense do?</li>
              <li><b>Game plan</b>: pick the plays that beat it. Not too many.</li>
              <li><b>Practice</b>: rep those plays until your team knows them.</li>
              <li><b>Friday night</b>: call the game.</li>
            </ol>
            <p>When you don't know something, the Classroom is {PEOPLE.mentor.name}'s bait shop: lessons on everything you'll face.</p>
          </>
        )}

        <div className="intro-nav">
          {stepIdx > 0 && <button className="btn ghost" onClick={back}>Back</button>}
          <div className="spacer" />
          {step.kind !== 'ready' ? (
            <button className="btn primary" disabled={!canNext} onClick={next}>Continue</button>
          ) : (
            <button
              className="btn primary big"
              onClick={() => startCareer({ name: coachName, background: background ?? 'formerQB', philosophy: philosophy ?? recommendation ?? 'spread' })}
            >
              Walk into the office →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
