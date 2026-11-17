import { simulate } from '../src/engine/sim';
import { TEMPLATE_PLAYS } from '../src/content/plays';
import { lookById } from '../src/content/looks';
const [playId, lookId, ...ids] = process.argv.slice(2);
const r = simulate(TEMPLATE_PLAYS.find(p=>p.id===playId)!, lookById(lookId));
for (const f of r.frames) if (Math.round(f.t*100) % 25 === 0) {
  console.log(f.t.toFixed(2), ids.map((id: string) => { const p = f.off[id] ?? f.def[id]; return `${id}(${p.x.toFixed(1)},${p.y.toFixed(1)})`; }).join(' '));
}
