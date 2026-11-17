import { useMemo, useRef, useState } from 'react';
import type { DefensiveLook, Frame, Play, Point } from '../model/types';
import { routeWaypoints, ROUTES } from '../engine/routes';
import { presnap } from '../engine/sim';
import { runDiagram } from '../engine/run';
import { FIELD_HALF_WIDTH } from '../engine/geometry';

export interface FieldProps {
  play: Play;
  look?: DefensiveLook | null;
  frame?: Frame | null;
  showZones?: boolean;
  showRoutes?: boolean;
  highlight?: { receivers?: string[]; defenders?: string[] };
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  editable?: boolean;
  onMove?: (id: string, p: Point) => void;
  onDepth?: (id: string, depth: number) => void;
  /** Prediction mode: click a receiver to pick him */
  onPick?: (id: string) => void;
  pickedId?: string | null;
  answerIds?: string[];
  yMin?: number;
  yMax?: number;
  className?: string;
}

const HS_HASH = 8.9; // high school hash marks, from the middle of the field

export function Field(props: FieldProps) {
  const {
    play, look, frame, showZones, showRoutes = true, highlight, selectedId, onSelect, editable,
    onMove, onDepth, onPick, pickedId, answerIds, yMin = -10, yMax = 26, className,
  } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: string; kind: 'player' | 'depth' } | null>(null);

  const defense = useMemo(() => (look ? presnap(play, look) : []), [play, look]);
  const runDiag = useMemo(() => (play.run ? runDiagram(play) : null), [play]);
  const hiR = new Set(highlight?.receivers ?? []);
  const hiD = new Set(highlight?.defenders ?? []);

  const toField = (e: React.PointerEvent): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: -p.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toField(e);
    if (!p) return;
    if (drag.kind === 'player' && onMove) onMove(drag.id, p);
    if (drag.kind === 'depth' && onDepth) onDepth(drag.id, p.y);
  };

  const posOf = (id: string, fallback: Point) => frame?.off[id] ?? fallback;
  const progressionIndex = (id: string) => play.progression.indexOf(id);

  const yardLines: number[] = [];
  for (let y = Math.ceil(yMin / 5) * 5; y <= yMax; y += 5) yardLines.push(y);
  const hashes: number[] = [];
  for (let y = Math.ceil(yMin); y <= yMax; y++) hashes.push(y);

  return (
    <svg
      ref={svgRef}
      className={`field ${className ?? ''}`}
      viewBox={`${-FIELD_HALF_WIDTH - 1} ${-yMax} ${2 * FIELD_HALF_WIDTH + 2} ${yMax - yMin}`}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
      onPointerDown={(e) => {
        if (e.target === svgRef.current || (e.target as Element).classList.contains('turf')) onSelect?.(null);
      }}
      role="img"
      aria-label={`${play.name}${look ? ' vs ' + look.name : ''}`}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="arrowhead" />
        </marker>
        <marker id="arrow-hi" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="arrowhead hi" />
        </marker>
      </defs>

      {/* Field */}
      <rect className="turf" x={-FIELD_HALF_WIDTH - 1} y={-yMax} width={2 * FIELD_HALF_WIDTH + 2} height={yMax - yMin} />
      <line className="sideline" x1={-FIELD_HALF_WIDTH} x2={-FIELD_HALF_WIDTH} y1={-yMax} y2={-yMin} />
      <line className="sideline" x1={FIELD_HALF_WIDTH} x2={FIELD_HALF_WIDTH} y1={-yMax} y2={-yMin} />
      {yardLines.map((y) => (
        <g key={y}>
          <line className={y === 0 ? 'los' : 'yardline'} x1={-FIELD_HALF_WIDTH} x2={FIELD_HALF_WIDTH} y1={-y} y2={-y} />
          {y > 0 && (
            <text className="yardlabel" x={-FIELD_HALF_WIDTH + 0.6} y={-y - 0.4}>
              {y}
            </text>
          )}
        </g>
      ))}
      {hashes.map((y) => (
        <g key={'h' + y}>
          <line className="hash" x1={-HS_HASH - 0.5} x2={-HS_HASH + 0.5} y1={-y} y2={-y} />
          <line className="hash" x1={HS_HASH - 0.5} x2={HS_HASH + 0.5} y1={-y} y2={-y} />
        </g>
      ))}

      {/* Zones */}
      {showZones &&
        defense.map((d) => {
          const dpos = frame?.def[d.spot.id] ?? d.pos;
          if (d.zone) {
            const z = d.zone;
            const rx = Math.min(6, (z.xmax - z.xmin) / 2 - 0.5);
            const ry = z.kind === 'deep' ? 4 : 3;
            return (
              <g key={'z' + d.spot.id} className={`zone ${z.kind}`}>
                <ellipse cx={z.landmark.x} cy={-z.landmark.y} rx={rx} ry={ry} />
                {!frame && <line x1={dpos.x} y1={-dpos.y} x2={z.landmark.x} y2={-z.landmark.y} />}
              </g>
            );
          }
          if (d.manTarget && !frame) {
            const r = play.players.find((p) => p.id === d.manTarget)!;
            return <line key={'m' + d.spot.id} className="manline" x1={dpos.x} y1={-dpos.y} x2={r.align.x} y2={-r.align.y} />;
          }
          return null;
        })}

      {/* Run play: blocking arrows and the ball carrier's path */}
      {showRoutes && runDiag && (
        <g className={frame ? 'faint-group' : ''}>
          {runDiag.blocks.map((b) => (
            <path
              key={'b' + b.id}
              className={`route block ${b.pull ? 'pull' : ''}`}
              d={b.pull ? pullPath(b.from, b.to) : blockPath(b.from, b.to)}
            />
          ))}
          <path
            className="route carrier"
            d={runDiag.path.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)},${(-q.y).toFixed(2)}`).join(' ')}
            markerEnd="url(#arrow-hi)"
          />
        </g>
      )}

      {/* Routes */}
      {showRoutes && !runDiag &&
        play.players.map((p) => {
          const a = p.assignment;
          if (a.kind === 'route') {
            const pts = routeWaypoints(p.align, a.route, a.depth);
            const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)},${(-q.y).toFixed(2)}`).join(' ');
            const isPrimary = progressionIndex(p.id) === 0;
            const hi = hiR.has(p.id) || selectedId === p.id;
            const handle = editable && selectedId === p.id ? pts[1] : null;
            return (
              <g key={'r' + p.id}>
                <path
                  d={d}
                  className={`route ${isPrimary ? 'primary' : ''} ${hi ? 'hi' : ''} ${frame ? 'faint' : ''}`}
                  markerEnd={`url(#${hi ? 'arrow-hi' : 'arrow'})`}
                />
                {handle && (
                  <circle
                    className="depth-handle"
                    cx={handle.x}
                    cy={-handle.y}
                    r={0.9}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      setDrag({ id: p.id, kind: 'depth' });
                    }}
                  >
                    <title>Drag to change the break depth ({ROUTES[a.route].minDepth}-{ROUTES[a.route].maxDepth} yds)</title>
                  </circle>
                )}
              </g>
            );
          }
          if (a.kind === 'protect') {
            const q = p.align;
            return <path key={'r' + p.id} className={`route protect ${frame ? 'faint' : ''}`} d={`M${q.x},${-q.y} L${q.x},${-q.y - 1.6} M${q.x - 0.8},${-q.y - 1.6} L${q.x + 0.8},${-q.y - 1.6}`} />;
          }
          return null;
        })}

      {/* Defense */}
      {defense.map((d) => {
        const p = frame?.def[d.spot.id] ?? d.pos;
        const hi = hiD.has(d.spot.id);
        return (
          <g key={d.spot.id} className={`defender ${hi ? 'hi' : ''}`} transform={`translate(${p.x},${-p.y})`}>
            {hi && <circle r={1.8} className="glow" />}
            <text className="def-label" textAnchor="middle" dominantBaseline="central">
              {d.spot.label}
            </text>
            <title>{`${d.spot.name}: ${d.rule}`}</title>
          </g>
        );
      })}

      {/* Offense */}
      {play.players.map((p) => {
        const pos = posOf(p.id, p.align);
        const isSkill = p.role !== 'OL' && p.role !== 'QB';
        const idx = progressionIndex(p.id);
        const hi = hiR.has(p.id);
        const picked = pickedId === p.id;
        const answer = answerIds?.includes(p.id);
        const clickable = (onPick && isSkill && p.assignment.kind === 'route') || onSelect;
        return (
          <g
            key={p.id}
            className={`player ${p.role.toLowerCase()} ${selectedId === p.id ? 'selected' : ''} ${hi ? 'hi' : ''} ${picked ? 'picked' : ''} ${answer ? 'answer' : ''} ${clickable ? 'clickable' : ''}`}
            transform={`translate(${pos.x},${-pos.y})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (onPick && isSkill && p.assignment.kind === 'route') onPick(p.id);
              onSelect?.(p.id);
              if (editable && isSkill && onMove) {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setDrag({ id: p.id, kind: 'player' });
              }
            }}
          >
            {(hi || picked || answer) && <circle r={1.9} className="glow" />}
            <circle r={p.role === 'OL' ? 0.75 : 0.95} className="body" />
            {p.role !== 'OL' && (
              <text className="off-label" textAnchor="middle" dominantBaseline="central">
                {p.role === 'QB' ? 'Q' : p.id}
              </text>
            )}
            {idx >= 0 && showRoutes && !frame && (
              <g transform="translate(1.3,1.3)">
                <circle r={0.75} className="read-badge" />
                <text className="read-num" textAnchor="middle" dominantBaseline="central">
                  {idx + 1}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Ball */}
      {frame?.ball && <ellipse className="ball" cx={frame.ball.x} cy={-frame.ball.y} rx={0.55} ry={0.38} />}
    </svg>
  );
}

/** A blocker's line ending in a "T" (the block). SVG y is flipped. */
function blockPath(from: Point, to: Point): string {
  const a = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
  const dx = 0.6 * Math.cos(a);
  const dy = 0.6 * Math.sin(a);
  return `M${from.x},${-from.y} L${to.x},${-to.y} M${to.x - dx},${-(to.y - dy)} L${to.x + dx},${-(to.y + dy)}`;
}

/** A pulling guard: step back, run along the line, turn up through the hole. */
function pullPath(from: Point, to: Point): string {
  return `M${from.x},${-from.y} L${from.x},${-from.y + 1.4} L${to.x},${-from.y + 1.4} L${to.x},${-to.y}`;
}
