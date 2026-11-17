/**
 * The career layer: what happens between games. Results move your job
 * security; how you call and teach moves your players' buy-in.
 */
import type { Career, InboxMessage, Opponent } from '../model/career';
import type { GameState } from './game';
import { FAMILY_NAME } from './game';
import { OPPONENTS, PEOPLE, SEASON_LENGTH, WINS_NEEDED } from '../content/world';
import { clamp } from './geometry';

export const opponentForWeek = (week: number): Opponent => OPPONENTS[Math.min(week, SEASON_LENGTH) - 1];
export const record = (c: Career) => {
  const w = c.results.filter((r) => r.us > r.them).length;
  const l = c.results.filter((r) => r.us < r.them).length;
  const t = c.results.length - w - l;
  return { w, l, t, text: `${w}-${l}${t ? `-${t}` : ''}` };
};
export const seasonOver = (c: Career) => c.week > SEASON_LENGTH;
export const BASE_REPS = (c: Career) => (c.coach.background === 'playersCoach' ? 11 : 8);

/** Summary of how a game went, used for the post-game screen and the inbox. */
export function gameReview(g: GameState) {
  const runs = g.calls.filter((c) => c.isRun);
  const passes = g.calls.filter((c) => !c.isRun);
  const missed = g.calls.filter((c) => c.missedWindow);
  const busts = g.calls.filter((c) => c.busted);
  const famCount: Record<string, number> = {};
  for (const c of g.calls) famCount[c.family] = (famCount[c.family] ?? 0) + 1;
  const topFam = Object.entries(famCount).sort((a, b) => b[1] - a[1])[0];
  const byPlay: Record<string, { name: string; n: number; yards: number; success: number }> = {};
  for (const c of g.calls) {
    const e = (byPlay[c.playId] ??= { name: c.playName, n: 0, yards: 0, success: 0 });
    e.n++;
    e.yards += c.yards;
    e.success += c.success ? 1 : 0;
  }
  const plays = Object.values(byPlay).sort((a, b) => b.n - a.n);
  const successRate = g.calls.length ? g.calls.filter((c) => c.success).length / g.calls.length : 0;
  return {
    runShare: g.calls.length ? runs.length / g.calls.length : 0,
    runs: runs.length,
    passes: passes.length,
    missed,
    busts,
    topFamily: topFam ? { family: FAMILY_NAME[topFam[0] as keyof typeof FAMILY_NAME], share: topFam[1] / g.calls.length } : null,
    plays,
    successRate,
  };
}

/** Close out the week: record the result, react, and set up next week. */
export function finishWeek(c0: Career, g: GameState): Career {
  const c: Career = structuredClone(c0);
  const opp = opponentForWeek(c.week);
  const won = g.us > g.them;
  const margin = g.us - g.them;
  const rev = gameReview(g);
  c.results.push({ week: c.week, opponentId: opp.id, us: g.us, them: g.them });

  // Job security
  let delta = won ? 9 + Math.min(6, margin / 7) : margin === 0 ? 0 : -7 - (margin < -21 ? 4 : 0);
  if (opp.rival && won) delta += 10;
  if (g.us >= 28) delta += 2;
  c.jobSecurity = clamp(Math.round(c.jobSecurity + delta), 0, 100);

  // Buy-in: winning helps everyone; the line wants to run; receivers want the ball; busts hurt trust.
  for (const p of c.roster) {
    let d = won ? 4 : -2;
    if (p.slot === 'OL') d += rev.runShare >= 0.4 ? 3 : -3;
    if (p.slot === 'RB') d += rev.runs >= 12 ? 3 : -2;
    if (p.slot === 'QB') d += rev.busts.length >= 3 ? -3 : 1;
    p.buyIn = clamp(p.buyIn + d, 0, 100);
  }

  // Messages
  const wk = c.week;
  const msgs: InboxMessage[] = [];
  const score = `${g.us}-${g.them}`;
  const pruitt = won
    ? margin >= 14 ? `That's what I'm talking about. ${score}. The town's going to be buzzing at the diner tomorrow. Keep it rolling.` : `A win's a win. ${score}. Let's clean some things up and go get another one.`
    : margin <= -14 ? `${score}. That's not good enough and you know it. I need to see something different next week.` : `${score}. Close isn't a win. Figure out what went wrong.`;
  msgs.push({ id: `w${wk}-pruitt`, week: wk + 1, from: `Coach ${PEOPLE.headCoach.name}`, subject: won ? `Good win vs ${opp.school}` : `About ${opp.school}`, body: `${pruitt}\n\nWe're ${record(c).text}. I need ${WINS_NEEDED}.\n\n- D.P.` });

  const notes: string[] = [];
  if (rev.topFamily) notes.push(`They played ${rev.topFamily.family} on ${Math.round(rev.topFamily.share * 100)}% of your snaps. Did your call sheet have answers for it?`);
  if (rev.missed.length) notes.push(`I counted ${rev.missed.length} play${rev.missed.length > 1 ? 's' : ''} where a better throw was there and we didn't take it. That's reading the defense, and that's coachable. Rep the reads in practice.`);
  if (rev.busts.length) notes.push(`${rev.busts.length} mental error${rev.busts.length > 1 ? 's' : ''}. That's on install, not the kids. Fewer plays, more reps.`);
  const best = rev.plays.filter((p) => p.n >= 2).sort((a, b) => b.yards / b.n - a.yards / a.n)[0];
  if (best) notes.push(`${best.name} was your best call: ${best.n} times for ${best.yards} yards.`);
  msgs.push({ id: `w${wk}-delgado`, week: wk + 1, from: PEOPLE.mentor.name, subject: 'Watched the film', body: `${notes.join('\n\n') || 'Watched the tape. Nothing jumped out. Keep learning.'}\n\n- Ray` });

  const fuentes = c.roster.find((p) => p.slot === 'OL');
  if (fuentes && rev.runShare < 0.3) msgs.push({ id: `w${wk}-fuentes`, week: wk + 1, from: 'Hector Fuentes (C, captain)', subject: 'The line', body: `Coach, we ran it ${rev.runs} times. The line feels like spectators out there. We can move people if you let us.` });
  if (fuentes && rev.runShare >= 0.45 && won) msgs.push({ id: `w${wk}-fuentes`, week: wk + 1, from: 'Hector Fuentes (C, captain)', subject: 'The line', body: `That felt like football. The guys are buying in, Coach.` });

  c.inbox = [...msgs, ...c.inbox];
  c.week++;
  c.practiceRepsLeft = BASE_REPS(c);
  c.weekSteps = { scouted: false, planned: false };
  return c;
}

/** Coverage mix as sorted percentages, for the scouting report. */
export function mixPercent(mix: Record<string, number>): { id: string; pct: number }[] {
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(mix).map(([id, w]) => ({ id, pct: Math.round((w / total) * 100) })).sort((a, b) => b.pct - a.pct);
}
