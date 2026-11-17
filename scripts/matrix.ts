import { simulate } from '../src/engine/sim';
import { TEMPLATE_PLAYS } from '../src/content/plays';
import { LOOKS } from '../src/content/looks';

const verbose = process.argv.includes('-v');
for (const play of TEMPLATE_PLAYS) {
  console.log(`\n=== ${play.name}`);
  for (const look of LOOKS) {
    const r = simulate(play, look, { seed: 7 });
    const w = r.windows.map((x) => `${x.receiverId}:${x.separation.toFixed(1)}@${x.t.toFixed(1)}`).join(' ');
    const res = `${r.result.kind}${r.result.targetId ? '→' + r.result.targetId : ''} ${r.result.yards}`;
    console.log(`${look.name.padEnd(20)} best=${(r.bestAnswer?.receiverId ?? '-').padEnd(3)} ${res.padEnd(22)} | ${w} | conflicts: ${r.conflicts.map((c) => `${c.defenderId}(${c.chose}>${c.freed})`).join(',')}`);
    if (verbose) for (const e of r.trace) console.log('     -', e.kind, e.text);
  }
}
