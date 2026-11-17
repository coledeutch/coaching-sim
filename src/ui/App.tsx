import { useStore, type View } from '../state/store';
import { PlaybookView } from './PlaybookView';
import { PracticeView } from './PracticeView';
import { ClassroomView } from './ClassroomView';

const TABS: { id: View; label: string; hint: string }[] = [
  { id: 'playbook', label: 'Playbook', hint: 'Design plays' },
  { id: 'practice', label: 'Practice', hint: 'Test vs any look' },
  { id: 'classroom', label: 'Classroom', hint: 'Learn the concepts' },
];

export function App() {
  const { view, setView, reps, calls, callsRight } = useStore();
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Chalkboard <span className="muted">offensive coordinator</span></div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${view === t.id ? 'on' : ''}`} onClick={() => setView(t.id)} title={t.hint}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="stats small">
          {reps} reps · {calls ? `${callsRight}/${calls} reads right` : 'no reads yet'}
        </div>
      </header>
      <main>
        {view === 'playbook' && <PlaybookView />}
        {view === 'practice' && <PracticeView />}
        {view === 'classroom' && <ClassroomView />}
      </main>
    </div>
  );
}
