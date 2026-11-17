import { simulate } from '../src/engine/sim';
import { TEMPLATE_PLAYS } from '../src/content/plays';
import { lookById } from '../src/content/looks';
const [playId, lookId] = process.argv.slice(2);
const r = simulate(TEMPLATE_PLAYS.find(p=>p.id===playId)!, lookById(lookId));
console.log(JSON.stringify(r.windows, null, 0));
console.log(JSON.stringify(r.reads, null, 0));
