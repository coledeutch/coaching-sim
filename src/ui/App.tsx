import { useStore, type View } from '../state/store';
import { PlaybookView } from './PlaybookView';
import { PracticeView } from './PracticeView';
import { ClassroomView } from './ClassroomView';
import { OfficeView } from './OfficeView';
import { GameView } from './GameView';
import { IntroView } from './IntroView';
import { SCHOOL } from '../content/world';
import { record } from '../engine/career';

const TABS: { id: View; label: string; hint: string }[] = [
  { id: 'office', label: 'Office', hint: 'Inbox, scouting, game plan, roster' },
  { id: 'playbook', label: 'Playbook', hint: 'Design plays' },
  { id: 'practice', label: 'Practice', hint: 'Rep your plays vs the scout team' },
  { id: 'classroom', label: 'Classroom', hint: "Ray's lessons" },
];

export function App() {
  const { view, setView, career, game } = useStore();
  if (!career) return <IntroView />;
  const unread = career.inbox.filter((m) => !m.read).length;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Chalkboard <span className="muted">{SCHOOL.name} {SCHOOL.mascot} · Coach {career.coach.name}</span></div>
        <nav>
          {game && (
            <button className={`tab live ${view === 'game' ? 'on' : ''}`} onClick={() => setView('game')}>● Game Day</button>
          )}
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${view === t.id ? 'on' : ''}`} onClick={() => setView(t.id)} title={t.hint}>
              {t.label}{t.id === 'office' && unread > 0 && <span className="badge">{unread}</span>}
            </button>
          ))}
        </nav>
        <div className="stats small">Week {Math.min(career.week, 10)} · {record(career).text}</div>
      </header>
      <main>
        {view === 'office' && <OfficeView />}
        {view === 'playbook' && <PlaybookView />}
        {view === 'practice' && <PracticeView />}
        {view === 'classroom' && <ClassroomView />}
        {view === 'game' && <GameView />}
      </main>
    </div>
  );
}
