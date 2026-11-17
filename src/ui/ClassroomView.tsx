import { useMemo } from 'react';
import { useStore } from '../state/store';
import { LESSONS, lessonById, type LessonBlock } from '../content/lessons';
import { TOPICS } from '../content/topics';
import { masteryFor } from '../engine/mastery';
import { TEMPLATE_PLAYS } from '../content/plays';
import { lookById } from '../content/looks';
import { Field } from './Field';
import { RichText } from './RichText';

export function ClassroomView() {
  const { lessonId, openLesson, evidence } = useStore();
  const lesson = lessonById(lessonId) ?? LESSONS[0];
  const mastery = useMemo(() => TOPICS.map((t) => ({ t, m: masteryFor(t.id, evidence) })), [evidence]);
  const lessonMastery = (topics: string[]) => {
    const ms = topics.map((t) => masteryFor(t, evidence)).filter((m) => m.attempts > 0);
    if (!ms.length) return null;
    return ms.reduce((a, m) => a + m.score, 0) / ms.length;
  };

  return (
    <div className="three-col">
      <aside className="panel list-panel">
        <h2>Coach's Classroom</h2>
        <ul className="lesson-list">
          {LESSONS.map((l) => {
            const m = lessonMastery(l.topics);
            return (
              <li key={l.id} className={l.id === lesson.id ? 'active' : ''} onClick={() => openLesson(l.id)}>
                <span>{l.title}</span>
                <span className="tags">{l.minutes} min{m !== null ? ` · ${Math.round(m * 100)}%` : ''}</span>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="center lesson">
        <h1>{lesson.title}</h1>
        <p className="lede">{lesson.summary}</p>
        {lesson.blocks.map((b, i) => <Block key={i} block={b} />)}
      </section>

      <aside className="panel inspector">
        <h2>Your mastery</h2>
        <p className="small muted">Mastery comes from what you prove: predictions in Practice and the checks in each lesson. Recent answers count most.</p>
        {(['Reading the defense', 'Coverages', 'Concepts', 'Quarterbacking'] as const).map((g) => (
          <div key={g} className="section">
            <h3>{g}</h3>
            {mastery.filter((x) => x.t.group === g).map(({ t, m }) => (
              <div key={t.id} className="mastery-row" onClick={() => openLesson(t.lessonId)} title={`${m.attempts} answers · open lesson`}>
                <span className="m-name">{t.name}</span>
                <span className="m-bar"><span style={{ width: `${m.attempts ? Math.round(m.score * 100) : 0}%` }} className={m.level.replace(' ', '-').toLowerCase()} /></span>
                <span className={`m-level ${m.level.replace(' ', '-').toLowerCase()}`}>{m.level}</span>
              </div>
            ))}
          </div>
        ))}
      </aside>
    </div>
  );
}

function Block({ block: b }: { block: LessonBlock }) {
  const { checkAnswers, answerCheck, addEvidence, setPractice, setView } = useStore();
  switch (b.type) {
    case 'h':
      return <h2>{b.text}</h2>;
    case 'p':
      return <p><RichText text={b.text} /></p>;
    case 'key':
      return <div className="keypoint"><RichText text={b.text} /></div>;
    case 'list':
      return <ul>{b.items.map((it, i) => <li key={i}><RichText text={it} /></li>)}</ul>;
    case 'diagram': {
      const play = TEMPLATE_PLAYS.find((p) => p.id === b.playId)!;
      return (
        <figure className="diagram">
          <Field play={play} look={lookById(b.lookId)} showZones={b.zones} yMin={-7} yMax={24} />
          <figcaption>{b.caption}</figcaption>
        </figure>
      );
    }
    case 'try':
      return (
        <button className="btn try" onClick={() => { setPractice(b.playId, b.lookId); setView('practice'); }}>
          {b.text} →
        </button>
      );
    case 'check': {
      const chosen = checkAnswers[b.id];
      const answered = chosen !== undefined;
      return (
        <div className="check-q">
          <div className="q-title">Check: {b.question}</div>
          <div className="options">
            {b.options.map((o, i) => (
              <button
                key={i}
                disabled={answered}
                className={`opt ${answered && i === b.answer ? 'right' : ''} ${answered && i === chosen && i !== b.answer ? 'wrong' : ''}`}
                onClick={() => {
                  answerCheck(b.id, i);
                  addEvidence([{ topic: b.topic, correct: i === b.answer, source: 'lessonCheck', detail: b.id }]);
                }}
              >
                {o}
              </button>
            ))}
          </div>
          {answered && <p className={`explain ${chosen === b.answer ? 'ok' : 'bad'}`}>{chosen === b.answer ? '✔ ' : '✘ '}<RichText text={b.explain} /></p>}
        </div>
      );
    }
  }
}
