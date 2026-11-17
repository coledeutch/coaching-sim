import { simulateRun, countBox } from '../src/engine/run';
import { TEMPLATE_RUNS } from '../src/content/plays';
import { LOOKS } from '../src/content/looks';
for (const play of TEMPLATE_RUNS) {
  console.log('===', play.name);
  for (const look of LOOKS) {
    const b = countBox(play, look);
    const ys: number[] = [];
    for (let s = 1; s <= 400; s++) ys.push(simulateRun(play, look, { seed: s }).result.yards);
    const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
    const neg = ys.filter((y) => y <= 0).length / ys.length;
    const big = ys.filter((y) => y >= 15).length / ys.length;
    console.log(`${look.name.padEnd(20)} box=${b.inBox.length} (${b.inBox.map(d=>d.spot.label).join('')}) blk=${b.blockers} adv=${b.advantage} avg=${avg.toFixed(1)} neg=${(neg*100).toFixed(0)}% 15+=${(big*100).toFixed(0)}%`);
  }
}
