import { useEffect, useMemo, useState } from 'react';
import type { Play, Point, RouteType } from '../model/types';
import { useStore } from '../state/store';
import { TEMPLATE_PLAYS } from '../content/plays';
import { FORMATIONS, formationSpots } from '../content/formations';
import { ROUTES, ROUTE_ORDER } from '../engine/routes';
import { detectConcepts, CONCEPTS } from '../engine/concepts';
import { numberReceivers } from '../engine/formation';
import { CONCEPT_VS_COVERAGE } from '../content/knowledge';
import { FIELD_HALF_WIDTH } from '../engine/geometry';
import { Field } from './Field';

const FAMILY_NAMES: Record<string, string> = {
  cover0: 'Cover 0', cover1: 'Cover 1', cover2: 'Cover 2', cover2man: '2-Man', cover3: 'Cover 3', cover4: 'Quarters', tampa2: 'Tampa 2',
};

const newId = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function blankPlay(): Play {
  const f = FORMATIONS[0];
  return {
    id: newId(),
    name: 'New Play',
    formation: f.id,
    drop: 5,
    players: formationSpots(f),
    progression: ['Z', 'Y', 'H', 'X'],
    notes: '',
    teachingPoints: [],
  };
}

/** Coaching rules a play must follow, explained. */
export function validatePlay(play: Play): { level: 'error' | 'warn' | 'tip'; text: string }[] {
  const out: { level: 'error' | 'warn' | 'tip'; text: string }[] = [];
  const onLine = play.players.filter((p) => p.align.y >= -0.9);
  if (onLine.length < 7) {
    out.push({ level: 'error', text: `Illegal formation: only ${onLine.length} players on the line of scrimmage. You need at least 7 (five linemen plus two receivers, usually the widest one on each side).` });
  }
  for (const side of [-1, 1]) {
    const line = onLine.filter((p) => p.role !== 'OL' && Math.sign(p.align.x || 1) === side).sort((a, b) => Math.abs(b.align.x) - Math.abs(a.align.x));
    for (const covered of line.slice(1)) {
      if (covered.assignment.kind === 'route') {
        out.push({ level: 'error', text: `${covered.id} is "covered up": ${line[0].id} is also on the line outside him, which makes ${covered.id} an ineligible receiver. Move one of them off the line (1 yard back).` });
      }
    }
  }
  if (play.progression.length === 0) out.push({ level: 'warn', text: 'No progression set. Click receivers in the "Read order" panel to tell the QB where to look.' });
  const runners = play.players.filter((p) => p.assignment.kind === 'route').map((p) => p.id);
  const unread = runners.filter((id) => !play.progression.includes(id));
  if (unread.length) out.push({ level: 'tip', text: `${unread.join(', ')} ${unread.length > 1 ? 'are' : 'is'} not in the read order. The QB won't look there, so ${unread.length > 1 ? 'they act' : 'he acts'} as a decoy or clear-out.` });
  const first = play.players.find((p) => p.id === play.progression[0]);
  if (first && first.assignment.kind === 'route') {
    const def = ROUTES[first.assignment.route];
    if (play.drop === 3 && def.level === 'deep') out.push({ level: 'tip', text: `Your first read is a ${def.label.toLowerCase()} (a deep route) from a 3-step drop. The QB will be set long before it's ready. Consider a 5-step drop, or a quicker first read.` });
    if (play.drop === 5 && def.level === 'short' && first.assignment.route !== 'stick') out.push({ level: 'tip', text: `Your first read is a quick route (${def.label.toLowerCase()}) from a 5-step drop. It may be covered by the time the QB is set; quick routes pair best with a 3-step drop.` });
  }
  const protectors = play.players.filter((p) => p.assignment.kind === 'protect').length;
  if (protectors === 0) out.push({ level: 'tip', text: 'Five-man protection: every eligible player is out on a route. Against a 6-man pressure someone will be unblocked, so make sure there is a hot route.' });
  return out;
}

function snapAlign(p: Point, role: string): Point {
  let x = Math.round(Math.max(-FIELD_HALF_WIDTH + 1.5, Math.min(FIELD_HALF_WIDTH - 1.5, p.x)) * 2) / 2;
  let y: number;
  if (p.y > -0.5 && role !== 'RB') y = 0;
  else if (p.y > -2.5) y = -1;
  else y = Math.round(Math.max(-7, Math.min(-3, p.y)) * 2) / 2;
  // Don't stack receivers on top of the offensive line.
  if (y > -2.5 && Math.abs(x) < 6.6) x = x < 0 ? -6.6 : 6.6;
  if (role === 'TE' && Math.abs(x) <= 7) y = Math.min(y, -0.8);
  return { x, y };
}

export function PlaybookView() {
  const { plays, savePlay, deletePlay, setPractice, setView } = useStore();
  const [currentId, setCurrentId] = useState<string>(plays[0]?.id ?? TEMPLATE_PLAYS[0].id);
  const source = plays.find((p) => p.id === currentId) ?? TEMPLATE_PLAYS.find((p) => p.id === currentId) ?? TEMPLATE_PLAYS[0];
  const [draft, setDraft] = useState<Play>(source);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const readOnly = !!draft.isTemplate;

  useEffect(() => {
    setDraft(source);
    setDirty(false);
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const update = (fn: (p: Play) => Play) => {
    if (readOnly) return;
    setDraft((p) => fn(p));
    setDirty(true);
  };

  const concepts = useMemo(() => detectConcepts(draft), [draft]);
  const issues = useMemo(() => validatePlay(draft), [draft]);
  const numbering = useMemo(() => numberReceivers(draft), [draft]);
  const sel = draft.players.find((p) => p.id === selected && p.role !== 'OL' && p.role !== 'QB');

  const setRoute = (id: string, route: RouteType | 'protect') =>
    update((p) => ({
      ...p,
      players: p.players.map((x) =>
        x.id !== id ? x : { ...x, assignment: route === 'protect' ? { kind: 'protect' } : { kind: 'route', route } },
      ),
      progression: route === 'protect' ? p.progression.filter((r) => r !== id) : p.progression,
    }));

  const duplicate = () => {
    const copy: Play = { ...structuredClone(draft), id: newId(), name: `${draft.name} (my version)`, isTemplate: false };
    savePlay(copy);
    setCurrentId(copy.id);
  };

  const save = () => {
    savePlay(draft);
    setDirty(false);
  };

  const changeFormation = (fid: string) =>
    update((p) => {
      const f = FORMATIONS.find((x) => x.id === fid)!;
      const fresh = formationSpots(f).map((s) => {
        const old = p.players.find((o) => o.id === s.id);
        if (!old || s.role === 'OL' || s.role === 'QB') return s;
        const keep = old.assignment.kind === 'route' || (old.assignment.kind === 'protect' && s.align.y <= -2.5);
        return keep ? { ...s, assignment: old.assignment } : s;
      });
      return { ...p, formation: fid, players: fresh };
    });

  const moveProg = (id: string, dir: -1 | 1) =>
    update((p) => {
      const arr = [...p.progression];
      const i = arr.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...p, progression: arr };
    });

  const toggleProg = (id: string) =>
    update((p) => ({
      ...p,
      progression: p.progression.includes(id) ? p.progression.filter((x) => x !== id) : [...p.progression, id],
    }));

  return (
    <div className="three-col">
      <aside className="panel list-panel">
        <div className="panel-head">
          <h2>My Playbook</h2>
          <button className="btn small" onClick={() => { const p = blankPlay(); savePlay(p); setCurrentId(p.id); }}>+ New</button>
        </div>
        {plays.length === 0 && <p className="muted small">No plays yet. Start a new one, or duplicate a template below and make it yours.</p>}
        <ul className="play-list">
          {plays.map((p) => (
            <li key={p.id} className={p.id === currentId ? 'active' : ''} onClick={() => setCurrentId(p.id)}>
              <span>{p.name}</span>
              <span className="tags">{detectConcepts(p).map((c) => CONCEPTS[c].name).join(', ')}</span>
            </li>
          ))}
        </ul>
        <h3 className="subhead">Template library</h3>
        <ul className="play-list">
          {TEMPLATE_PLAYS.map((p) => (
            <li key={p.id} className={p.id === currentId ? 'active' : ''} onClick={() => setCurrentId(p.id)}>
              <span>{p.name}</span>
              <span className="tags">{FORMATIONS.find((f) => f.id === p.formation)?.name}</span>
            </li>
          ))}
        </ul>
      </aside>

      <section className="center">
        <div className="toolbar">
          <input
            className="title-input"
            value={draft.name}
            disabled={readOnly}
            onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
            aria-label="Play name"
          />
          <select value={draft.formation} disabled={readOnly} onChange={(e) => changeFormation(e.target.value)} aria-label="Formation">
            {FORMATIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={draft.drop} disabled={readOnly} onChange={(e) => update((p) => ({ ...p, drop: Number(e.target.value) as 3 | 5 }))} aria-label="QB drop">
            <option value={3}>3-step drop</option>
            <option value={5}>5-step drop</option>
          </select>
          <div className="spacer" />
          {readOnly ? (
            <button className="btn primary" onClick={duplicate}>Duplicate to edit</button>
          ) : (
            <>
              <button className="btn primary" disabled={!dirty} onClick={save}>{dirty ? 'Save' : 'Saved'}</button>
              <button className="btn ghost" onClick={() => { if (confirm(`Delete "${draft.name}"?`)) { deletePlay(draft.id); setCurrentId(TEMPLATE_PLAYS[0].id); } }}>Delete</button>
            </>
          )}
          <button className="btn" onClick={() => { if (!readOnly && dirty) save(); setPractice(draft.id); setView('practice'); }}>Test in Practice →</button>
        </div>
        {readOnly && <div className="banner">Template play: study it here, or duplicate it into your playbook to change it.</div>}
        <Field
          play={draft}
          editable={!readOnly}
          selectedId={selected}
          onSelect={setSelected}
          onMove={(id, pt) =>
            update((p) => ({
              ...p,
              players: p.players.map((x) => (x.id === id ? { ...x, align: snapAlign(pt, x.role) } : x)),
            }))
          }
          onDepth={(id, y) =>
            update((p) => ({
              ...p,
              players: p.players.map((x) => {
                if (x.id !== id || x.assignment.kind !== 'route') return x;
                const def = ROUTES[x.assignment.route];
                const depth = Math.round(Math.max(def.minDepth, Math.min(def.maxDepth, y)) * 2) / 2;
                return { ...x, assignment: { ...x.assignment, depth } };
              }),
            }))
          }
        />
        <p className="hint">
          {readOnly
            ? 'Click a receiver to see his assignment.'
            : 'Click a receiver to give him a route. Drag receivers to move them; drag the handle on a route to change its depth.'}
        </p>
        {issues.length > 0 && (
          <ul className="issues">
            {issues.map((i, k) => <li key={k} className={i.level}>{i.text}</li>)}
          </ul>
        )}
      </section>

      <aside className="panel inspector">
        {sel ? (
          <div className="section">
            <h3>{sel.id} <span className="muted">{numbering.labelOf[sel.id] ?? ''} · {sel.role}</span></h3>
            <div className="route-grid">
              {ROUTE_ORDER.filter((r) => sel.align.y > -2.5 || ROUTES[r].backfieldOk).map((r) => (
                <button
                  key={r}
                  disabled={readOnly}
                  className={`chip ${sel.assignment.kind === 'route' && sel.assignment.route === r ? 'on' : ''}`}
                  onClick={() => setRoute(sel.id, r)}
                  title={ROUTES[r].description}
                >
                  {ROUTES[r].label}
                </button>
              ))}
              {(sel.role === 'RB' || sel.role === 'TE') && (
                <button disabled={readOnly} className={`chip ${sel.assignment.kind === 'protect' ? 'on' : ''}`} onClick={() => setRoute(sel.id, 'protect')}>
                  Protect
                </button>
              )}
            </div>
            {sel.assignment.kind === 'route' && (
              <>
                <p className="route-desc">{ROUTES[sel.assignment.route].description}</p>
                <label className="slider">
                  Break depth: <b>{sel.assignment.depth ?? ROUTES[sel.assignment.route].defaultDepth} yds</b>
                  <input
                    type="range"
                    disabled={readOnly}
                    min={ROUTES[sel.assignment.route].minDepth}
                    max={ROUTES[sel.assignment.route].maxDepth}
                    step={0.5}
                    value={sel.assignment.depth ?? ROUTES[sel.assignment.route].defaultDepth}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        players: p.players.map((x) =>
                          x.id === sel.id && x.assignment.kind === 'route' ? { ...x, assignment: { ...x.assignment, depth: Number(e.target.value) } } : x,
                        ),
                      }))
                    }
                  />
                </label>
              </>
            )}
            {sel.assignment.kind === 'protect' && <p className="route-desc">Stays in to block. Adds a sixth blocker, which helps against a 6-man pressure but takes away a receiver.</p>}
          </div>
        ) : (
          <div className="section"><p className="muted small">Select a receiver on the field to assign a route.</p></div>
        )}

        <div className="section">
          <h3>Read order</h3>
          <ol className="prog">
            {draft.progression.map((id, i) => {
              const p = draft.players.find((x) => x.id === id);
              const r = p?.assignment.kind === 'route' ? ROUTES[p.assignment.route].label : '';
              return (
                <li key={id}>
                  <span className="read-pill">{i + 1}</span> {id} <span className="muted">{r}</span>
                  {!readOnly && (
                    <span className="prog-btns">
                      <button onClick={() => moveProg(id, -1)} aria-label="Read earlier">↑</button>
                      <button onClick={() => moveProg(id, 1)} aria-label="Read later">↓</button>
                      <button onClick={() => toggleProg(id)} aria-label="Remove from read order">×</button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {!readOnly && (
            <div className="add-prog">
              {draft.players.filter((p) => p.assignment.kind === 'route' && !draft.progression.includes(p.id)).map((p) => (
                <button key={p.id} className="chip" onClick={() => toggleProg(p.id)}>+ {p.id}</button>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <h3>Concepts</h3>
          {concepts.length === 0 && <p className="muted small">No named concept recognised yet. That's fine: the engine still simulates it. Named concepts unlock scheme notes.</p>}
          {concepts.map((c) => (
            <div key={c} className="concept">
              <div><b>{CONCEPTS[c].name}</b>: {CONCEPTS[c].summary}</div>
              <div className="fit-row">
                {Object.entries(CONCEPT_VS_COVERAGE[c] ?? {}).map(([fam, f]) => (
                  <span key={fam} className={`fit ${f!.fit}`} title={f!.note}>{FAMILY_NAMES[fam]}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="section">
          <h3>Coaching notes</h3>
          <textarea
            rows={3}
            value={draft.notes}
            disabled={readOnly}
            placeholder="Why does this play exist? What is it designed to beat?"
            onChange={(e) => update((p) => ({ ...p, notes: e.target.value }))}
          />
          <h3>Teaching points</h3>
          <textarea
            rows={4}
            value={draft.teachingPoints.join('\n')}
            disabled={readOnly}
            placeholder={'One per line: what you tell each position when you install it.\ne.g. QB: read the flat defender…'}
            onChange={(e) => update((p) => ({ ...p, teachingPoints: e.target.value.split('\n') }))}
          />
        </div>
      </aside>
    </div>
  );
}
