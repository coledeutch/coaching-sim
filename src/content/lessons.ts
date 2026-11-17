/**
 * Coach's Classroom lessons.
 *
 * Lessons are structured data rather than free text, so they can include live
 * diagrams (any play vs any look, drawn by the same engine) and knowledge
 * checks that feed mastery. Inline **bold** is supported in text.
 * To add a lesson: add an entry here and point topics at it in topics.ts.
 */
export type LessonBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'key'; text: string }
  | { type: 'diagram'; playId: string; lookId: string; caption: string; zones?: boolean }
  | { type: 'check'; id: string; topic: string; question: string; options: string[]; answer: number; explain: string }
  | { type: 'try'; playId: string; lookId: string; text: string };

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  topics: string[];
  blocks: LessonBlock[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'reading-defense',
    title: 'Reading the Defense: Numbers and Shells',
    minutes: 6,
    summary: 'The two things every coordinator checks before the snap: how the receivers are numbered, and how many safeties are deep.',
    topics: ['numbering', 'shell'],
    blocks: [
      { type: 'p', text: 'Before the snap, a quarterback and a coordinator answer two questions: **who is where** (receiver numbering) and **what can the defense be playing** (the shell). Everything else builds on these.' },
      { type: 'h', text: 'Receiver numbering' },
      { type: 'p', text: 'On each side of the ball, count the eligible receivers **from the sideline in**. The widest is **#1**, the next is **#2**, then **#3**. Backs in the backfield aren\'t numbered until they release.' },
      { type: 'list', items: [
        'In a 2x2 (Doubles) formation, each side has a #1 and a #2.',
        'In 3x1 (Trips), the trips side has #1, #2 and #3. The single receiver is #1 to the weak side.',
        'The side with more receivers is the **strong side** (with equal numbers, the tight end side).',
      ] },
      { type: 'key', text: 'Defenses are taught with numbers too: "the curl/flat defender widens with #2," "the safety carries #2 vertical." Numbering lets you predict what a defender will do.' },
      { type: 'diagram', playId: 't-stick', lookId: 'cover3-sky', caption: 'Trips right: Z is #1, Y is #2, H is #3 to the strong side. X is #1 weak.' },
      { type: 'check', id: 'rd-1', topic: 'numbering', question: 'In Trips Right, which receiver is #3?', options: ['The widest receiver to the right', 'The innermost of the three receivers to the right', 'The single receiver to the left', 'The running back'], answer: 1, explain: 'Count from the sideline in: the innermost of the three is #3.' },
      { type: 'h', text: 'Shells: count the safeties' },
      { type: 'p', text: 'Look at the deep safeties, about 10-15 yards off the ball. Their number is the **shell**, and it narrows the coverage down fast.' },
      { type: 'list', items: [
        '**2-high** (two deep safeties): Cover 2, Tampa 2, Cover 4 (Quarters), 2-Man. The middle of the field is **open** (MOFO).',
        '**1-high** (one safety in the middle): Cover 3 or Cover 1. The middle of the field is **closed** (MOFC).',
        '**0-high** (no deep safety): Cover 0. Expect a blitz, with no help behind anyone.',
      ] },
      { type: 'diagram', playId: 't-smash', lookId: 'cover2', caption: '2-high: two safeties deep, splitting the field.' },
      { type: 'diagram', playId: 't-smash', lookId: 'cover3-sky', caption: '1-high: one free safety in the middle, a strong safety rolled down.' },
      { type: 'check', id: 'rd-2', topic: 'shell', question: 'You see one safety in the middle of the field at 13 yards and corners off at 7. What are the two most likely coverages?', options: ['Cover 2 or Cover 4', 'Cover 3 or Cover 1', 'Cover 0 or Cover 2', 'Tampa 2 or 2-Man'], answer: 1, explain: 'One high safety means a 1-high shell: Cover 3 (zone) or Cover 1 (man). Off corners lean toward Cover 3.' },
      { type: 'check', id: 'rd-3', topic: 'shell', question: 'No safety deeper than 7 yards and linebackers creeping toward the line. What should the QB expect?', options: ['Cover 4: throw underneath', 'Cover 0: pressure, so the ball has to come out hot', 'Cover 2: attack the hole shot', 'Nothing: wait and see'], answer: 1, explain: 'No deep safety plus walked-up linebackers is the classic Cover 0 blitz picture. Get the ball out before the free rusher arrives.' },
      { type: 'try', playId: 't-smash', lookId: 'cover2', text: 'Practice: run Smash vs a mystery look and name the coverage before the snap.' },
    ],
  },
  {
    id: 'cover3',
    title: 'Cover 3: Three Deep, Four Under',
    minutes: 7,
    summary: 'The most common coverage in football. Learn its rules, and the three classic ways to attack it.',
    topics: ['cover3', 'fourVerts', 'flood'],
    blocks: [
      { type: 'p', text: 'Cover 3 splits the deep field into **three thirds**: each corner takes a deep outside third and the free safety takes the deep middle. Four defenders play underneath: two **curl/flat** defenders on the outside and two **hook/curl** defenders inside.' },
      { type: 'diagram', playId: 't-curlflat', lookId: 'cover3-sky', caption: 'Cover 3 Sky: the corners and free safety play the deep thirds; the strong safety rolls down to the curl/flat.', zones: true },
      { type: 'h', text: 'The rules' },
      { type: 'list', items: [
        '**Corners (deep third):** nothing gets behind you. Keep the deepest receiver in your third in front of you.',
        '**Free safety (deep middle):** play the deepest route in the middle of the field. Read the QB\'s eyes.',
        '**Curl/flat:** sink under #1\'s curl, and widen to the flat as soon as someone threatens it.',
        '**Hook/curl:** wall off #2, carry him to about 12 yards, then pick up crossers.',
      ] },
      { type: 'key', text: 'Cover 3\'s stress points: each curl/flat defender covers a lot of ground, and the free safety is alone in the middle.' },
      { type: 'h', text: 'Three ways to beat it' },
      { type: 'list', items: [
        '**Horizontal stretch** on the curl/flat defender: Stick, Curl-Flat. He can\'t cover the flat and the curl.',
        '**Four Verticals**: two seams vs one free safety. He can only take one.',
        '**Flood**: three receivers at three depths vs the two defenders on that side (the corner and the curl/flat).',
      ] },
      { type: 'diagram', playId: 't-fourverts', lookId: 'cover3-sky', caption: 'Four Verticals vs Cover 3: both seams (H, Y) run at the lone free safety.', zones: true },
      { type: 'check', id: 'c3-1', topic: 'cover3', question: 'In Cover 3, which defender is responsible for a seam route by #2 once it passes about 12 yards?', options: ['The corner', 'The hook/curl defender, all the way down the field', 'The free safety (deep middle)', 'Nobody, by design'], answer: 2, explain: 'The hook/curl defender carries #2 to about 12 yards and then passes him off to the deep middle safety. With two seams, the safety is in conflict.' },
      { type: 'check', id: 'c3-2', topic: 'fourVerts', question: 'Four Verticals vs Cover 3. The free safety turns and runs with the left seam. Where does the ball go?', options: ['The left seam', 'The right seam', 'The running back', 'Throw it away'], answer: 1, explain: 'He can only take one seam. Throw the one he didn\'t take.' },
      { type: 'check', id: 'c3-3', topic: 'flood', question: 'Why does Flood work against Cover 3?', options: ['It attacks the middle of the field', 'It puts three receivers against two defenders on one side', 'It beats man coverage with rubs', 'It gets the ball out before the blitz'], answer: 1, explain: 'On the flood side, only the deep-third corner and the curl/flat defender are there to cover three levels.' },
      { type: 'try', playId: 't-fourverts', lookId: 'cover3-sky', text: 'Practice: Four Verticals vs Cover 3 Sky. Predict the open seam.' },
    ],
  },
  {
    id: 'cover2',
    title: 'Cover 2 and Tampa 2',
    minutes: 6,
    summary: 'Two deep halves and five underneath. Why the corner is a "flat" player, and where the holes are.',
    topics: ['cover2', 'tampa2'],
    blocks: [
      { type: 'p', text: 'In **Cover 2** the two safeties split the deep field in halves. The corners play **hard** (about 5 yards, outside leverage), jam #1, and squat in the **flat**. Three more defenders play hook/curl and middle hook.' },
      { type: 'diagram', playId: 't-smash', lookId: 'cover2', caption: 'Cover 2: two deep halves; the corners are the flat defenders.', zones: true },
      { type: 'h', text: 'Where Cover 2 is weak' },
      { type: 'list', items: [
        '**The hole**: between the squatting corner and the deep half safety, along the sideline at 12-20 yards. Corner routes live here.',
        '**The seam**: between the two safeties, especially the middle of the field deep.',
        '**Each half safety** covers a lot of width, so a vertical outside plus a vertical inside puts him in conflict.',
      ] },
      { type: 'h', text: 'Tampa 2' },
      { type: 'p', text: 'Tampa 2 looks identical before the snap. At the snap the **Mike linebacker runs to the deep middle**, closing the seam hole. The corner/safety hole on the outside is still there.' },
      { type: 'check', id: 'c2-1', topic: 'cover2', question: 'In Cover 2, who is the flat defender?', options: ['The safety', 'The corner', 'The Mike linebacker', 'The defensive end'], answer: 1, explain: 'Cover 2 corners squat in the flats. That makes them the target of high-low concepts like Smash.' },
      { type: 'check', id: 'c2-2', topic: 'tampa2', question: 'What\'s the tell that Cover 2 is actually Tampa 2?', options: ['Three deep safeties pre-snap', 'The Mike linebacker opens and sprints deep at the snap', 'The corners bail at the snap', 'Six rushers'], answer: 1, explain: 'Same picture pre-snap. Watch the Mike: in Tampa he runs to the deep middle.' },
      { type: 'try', playId: 't-smash', lookId: 'cover2', text: 'Practice: Smash vs Cover 2. Watch the corner choose.' },
    ],
  },
  {
    id: 'conflict',
    title: 'Conflict Defenders: The Heart of Pass Concepts',
    minutes: 7,
    summary: 'Almost every pass concept is built to make one defender wrong. Learn to find him.',
    topics: ['conflict', 'stick', 'curlFlat'],
    blocks: [
      { type: 'p', text: 'A **conflict defender** is one defender with two receivers in his area who are far enough apart that he can\'t cover both. Whichever he takes, the other is open. Good pass concepts are built around one conflict defender, and the QB **reads that defender**.' },
      { type: 'h', text: 'Two kinds of stretch' },
      { type: 'list', items: [
        '**High-low (vertical)**: one route above the defender and one below. Smash (corner over a hitch), Curl-Flat (curl over a flat).',
        '**Horizontal**: one route inside the defender and one outside. Stick (stick inside, flat outside), Slant-Flat.',
      ] },
      { type: 'diagram', playId: 't-curlflat', lookId: 'cover3-sky', caption: 'Curl-Flat vs Cover 3: the curl/flat defender (the SS to the right) has the curl above him and the flat below him.', zones: true },
      { type: 'key', text: 'The QB doesn\'t read "who is open." He reads **one defender** and throws away from him. That\'s why the ball can come out fast.' },
      { type: 'h', text: 'Stick' },
      { type: 'p', text: 'From trips: #1 runs a fade (clears out the corner), #2 runs to the flat, and #3 runs a stick route to 6 yards and turns out. The curl/flat defender has the flat outside and the stick inside. If he widens, throw the stick; if he sits, throw the flat.' },
      { type: 'diagram', playId: 't-stick', lookId: 'cover3-sky', caption: 'Stick vs Cover 3: a horizontal stretch on the curl/flat defender.', zones: true },
      { type: 'check', id: 'cf-1', topic: 'conflict', question: 'Curl-Flat vs Cover 3. The curl/flat defender widens with the flat route. Where does the ball go?', options: ['The flat', 'The curl', 'The other side of the field', 'The running back'], answer: 1, explain: 'He chose the flat, so the curl behind him is open. Throw away from the conflict defender.' },
      { type: 'check', id: 'cf-2', topic: 'stick', question: 'What kind of stretch is Stick?', options: ['High-low', 'Horizontal', 'Vertical (four deep)', 'A rub'], answer: 1, explain: 'Stick puts one route inside (the stick) and one outside (the flat) of the curl/flat defender.' },
      { type: 'check', id: 'cf-3', topic: 'curlFlat', question: 'Why is Curl-Flat a poor call against Cover 2?', options: ['Cover 2 has no flat defender', 'The squatting corner takes the flat and the hook/curl defender walls off the curl', 'It takes too long against Cover 2\'s blitz', 'The safeties take the curl'], answer: 1, explain: 'In Cover 2, the corner sits in the flat and an inside defender sinks under the curl. There\'s no single defender in conflict.' },
      { type: 'try', playId: 't-curlflat', lookId: 'cover3-sky', text: 'Practice: Curl-Flat vs Cover 3. Find the conflict defender.' },
    ],
  },
  {
    id: 'smash',
    title: 'Smash: Beating Cover 2',
    minutes: 5,
    summary: 'The classic high-low on the Cover 2 corner, and why it struggles against other coverages.',
    topics: ['smash'],
    blocks: [
      { type: 'p', text: '**Smash** pairs a **hitch by #1** with a **corner route by #2**. Against Cover 2, the corner is the flat defender. If he squats on the hitch, the corner route is open behind him, in front of the half safety. If he sinks under the corner route, the hitch is open.' },
      { type: 'diagram', playId: 't-smash', lookId: 'cover2', caption: 'Smash vs Cover 2: the corner (C) is high-lowed by the hitch and the corner route.', zones: true },
      { type: 'list', items: [
        '**QB read:** the flat defender. Squat = corner. Sink = hitch.',
        '**Corner route:** stem to 10, push inside to hold the safety, break to the pylon. Stay away from the safety.',
        '**Timing:** a 5-step drop. The corner route needs time to clear the squatting corner.',
      ] },
      { type: 'h', text: 'Against other looks' },
      { type: 'p', text: 'Against **Cover 3** the corner bails to the deep third and sits on top of the corner route, so the hitch is usually the answer. Against **Cover 0**, a 5-step concept with no hot route is in trouble.' },
      { type: 'check', id: 'sm-1', topic: 'smash', question: 'Smash vs Cover 2. The corner jumps the hitch. Where does the ball go?', options: ['The hitch', 'The corner route', 'Check down to the back', 'The backside hitch'], answer: 1, explain: 'He squatted on the hitch, so the corner route is open behind him and in front of the safety.' },
      { type: 'check', id: 'sm-2', topic: 'smash', question: 'Smash vs Cover 3. Which route is usually open?', options: ['The corner route', 'The hitch', 'Neither: Smash can\'t work against Cover 3', 'The running back'], answer: 1, explain: 'The Cover 3 corner bails deep and caps the corner route. The hitch is open underneath him.' },
      { type: 'try', playId: 't-smash', lookId: 'cover2', text: 'Practice: run Smash vs Cover 2, then vs Cover 3, and compare.' },
    ],
  },
  {
    id: 'man-pressure',
    title: 'Man Coverage, Blitzes and Hot Reads',
    minutes: 8,
    summary: 'Cover 1 and Cover 0: how to recognise man coverage and pressure, and the answers that beat them.',
    topics: ['cover1', 'cover0', 'protection', 'mesh', 'slantFlat'],
    blocks: [
      { type: 'p', text: 'In **man coverage** each defender follows one receiver. Concepts that stretch zones don\'t work the same way, because there\'s no zone defender to put in conflict. You beat man with **leverage, rubs, and timing**.' },
      { type: 'h', text: 'Cover 1 (man-free)' },
      { type: 'p', text: 'Man everywhere, plus a **free safety** in the deep middle and often a **robber ("rat")** sitting in the middle at 8 yards.' },
      { type: 'list', items: [
        '**Leverage:** if the defender is outside, break inside (slant). If he\'s inside, break outside (out, corner).',
        '**Rubs:** crossing routes (Mesh) make defenders run through traffic.',
        '**Comeback routes** (curls, hitches) are hard against a defender sitting on top of them.',
      ] },
      { type: 'diagram', playId: 't-mesh', lookId: 'cover1', caption: 'Mesh vs Cover 1: two drags cross and drag their defenders through traffic.' },
      { type: 'h', text: 'Cover 0 and protection math' },
      { type: 'p', text: 'Count the rushers against your blockers. Five linemen block five. If the defense sends six and you only have five blockers, **one rusher is free**, and the QB has about 1.7 seconds. Two answers:' },
      { type: 'list', items: [
        '**Block more:** keep a back or tight end in (6- or 7-man protection).',
        '**Throw hot:** have a route that\'s ready before the free rusher arrives: slant, quick out, hitch. Cover 0 has no deep help, so a quick win can go the distance.',
      ] },
      { type: 'diagram', playId: 't-slantflat', lookId: 'cover0', caption: 'Slant-Flat vs Cover 0: three-step drop, ball out before the free rusher arrives.' },
      { type: 'check', id: 'mp-1', topic: 'protection', question: 'The defense rushes 6. You have 5 linemen and the back is running a route. What happens?', options: ['Everyone is blocked', 'One rusher is unblocked: the ball must come out hot', 'The QB has more time than usual', 'The center blocks two'], answer: 1, explain: '6 rushers vs 5 blockers leaves one free. Either keep the back in or throw before he arrives.' },
      { type: 'check', id: 'mp-2', topic: 'cover1', question: 'A Cover 1 corner aligns outside your receiver. Which route is best for that receiver?', options: ['Out', 'Slant', 'Fade along the sideline', 'Comeback'], answer: 1, explain: 'Break away from leverage: an outside defender is beaten inside.' },
      { type: 'check', id: 'mp-3', topic: 'mesh', question: 'Why does Mesh work against man coverage?', options: ['It floods a zone', 'The crossers rub defenders and keep running away from them', 'It goes deep over the safety', 'It adds protection'], answer: 1, explain: 'Defenders trailing their man have to fight through the other crossing receiver, and drags keep running away from man coverage.' },
      { type: 'check', id: 'mp-4', topic: 'cover0', question: 'Why is a hot throw against Cover 0 so dangerous for the defense?', options: ['There\'s no deep safety: any win can go the distance', 'The QB is protected', 'The corners are playing zone', 'It isn\'t dangerous'], answer: 0, explain: 'Cover 0 has nobody behind the man defenders, so a missed tackle or a quick win is a touchdown.' },
      { type: 'try', playId: 't-slantflat', lookId: 'cover0', text: 'Practice: Slant-Flat vs Cover 0, then try Smash vs Cover 0 and see the difference.' },
    ],
  },
  {
    id: 'progressions',
    title: 'Progressions: Where the QB Looks, and When',
    minutes: 5,
    summary: 'Read order is part of play design. A good progression matches the timing of the routes and the coverage you expect.',
    topics: ['progression'],
    blocks: [
      { type: 'p', text: 'A **progression** is the order in which the QB checks receivers. Each look takes time (about half a second here), so read order is a design decision: **an open receiver the QB never gets to is not open.**' },
      { type: 'list', items: [
        '**Match timing to the drop.** A 3-step drop is for routes that are ready by about 1 second (slant, hitch, quick out). A 5-step drop gives intermediate routes (curl, corner, dig) time to develop.',
        '**Read high to low** on a high-low (the deep route first, then the shallow one) so you don\'t pass up the bigger play.',
        '**Build around one defender.** "If he does X, throw A; if he does Y, throw B." That\'s faster than scanning receivers.',
        '**Have an outlet.** A back on a swing or a drag gives the QB somewhere to go when the primary reads are covered.',
      ] },
      { type: 'key', text: 'In Practice, the diagnosis tells you the best answer vs each look and where it sat in your progression. If the best answer is often read #3 or #4 against the coverage you expect, reorder.' },
      { type: 'check', id: 'pr-1', topic: 'progression', question: 'You call Four Verticals expecting Cover 3. Which receiver should usually be your first read?', options: ['An outside go route', 'A seam (reading the free safety)', 'The running back', 'Whoever is open'], answer: 1, explain: 'Against Cover 3 the seams stress the lone free safety. Read him first and throw the seam he doesn\'t take.' },
      { type: 'check', id: 'pr-2', topic: 'progression', question: 'Why pair a 3-step drop with quick routes?', options: ['It looks better', 'The QB is set when the routes are ready, so the ball comes out on time', 'It guarantees the protection holds', 'Deep routes need a 3-step drop'], answer: 1, explain: 'Drop timing and route timing should match: the QB hits his last step as the receiver breaks.' },
    ],
  },
  {
    id: 'quarters',
    title: 'Quarters and 2-Man: The Modern Two-High Defenses',
    minutes: 6,
    summary: 'Pattern-matching Quarters stops verticals; 2-Man takes away underneath routes. Here\'s what beats each.',
    topics: ['cover4', 'cover2man', 'dagger'],
    blocks: [
      { type: 'p', text: '**Cover 4 (Quarters)** has four deep defenders, but they **pattern-match**: each corner carries #1 if he goes vertical, and each safety reads #2. If #2 goes vertical the safety carries him; if not, the safety helps on #1.' },
      { type: 'diagram', playId: 't-fourverts', lookId: 'cover4', caption: 'Four Verticals vs Quarters: every vertical has a defender.', zones: true },
      { type: 'list', items: [
        '**Strength:** shuts down verticals, and the safeties can fit the run.',
        '**Weakness:** only three underneath, so quick game and horizontal stretches work.',
        '**Dagger:** #2 runs a seam, the safety jumps him, and #1\'s dig comes in where the safety used to be.',
      ] },
      { type: 'diagram', playId: 't-dagger', lookId: 'cover4', caption: 'Dagger vs Quarters: the seam takes the safety; the dig fits behind.', zones: true },
      { type: 'h', text: '2-Man' },
      { type: 'p', text: 'Man coverage underneath with **trail technique** (playing under and inside the receiver) and two safeties over the top. Underneath defenders can be aggressive because they have help deep. Beat it with **crossers and rubs**: trail defenders can\'t undercut a receiver running away from them.' },
      { type: 'check', id: 'q-1', topic: 'cover4', question: 'In Quarters, what does the safety do when #2 runs to the flat?', options: ['Runs to the flat with him', 'Helps on #1 (the safety doesn\'t chase a short route)', 'Blitzes', 'Covers the deep middle alone'], answer: 1, explain: 'The safety\'s key is #2 going vertical. If #2 goes short, the safety looks to help on #1.' },
      { type: 'check', id: 'q-2', topic: 'dagger', question: 'Why does Dagger work against Quarters?', options: ['The seam pulls the safety, opening the dig behind him', 'It\'s a quick-game concept', 'It puts the corner in conflict', 'Quarters has no deep defenders'], answer: 0, explain: 'The quarters safety carries #2\'s seam, leaving the area he would have protected open for the dig.' },
      { type: 'check', id: 'q-3', topic: 'cover2man', question: 'Best concept against 2-Man?', options: ['Four Verticals', 'Mesh (crossers)', 'Curl-Flat', 'Smash'], answer: 1, explain: 'Trail-technique defenders can\'t undercut crossers, and the safeties are too deep to help.' },
      { type: 'try', playId: 't-dagger', lookId: 'cover4', text: 'Practice: Dagger vs Quarters. Who takes the seam?' },
    ],
  },
  {
    id: 'run-game',
    title: 'The Run Game: Count the Box',
    minutes: 6,
    summary: 'The most important math in football: defenders in the box vs. blockers. It tells you whether to run or throw.',
    topics: ['boxCount', 'runSchemes'],
    blocks: [
      { type: 'p', text: '"The defense tells you what to do," Ray says. "You just have to count." The **box** is the area from tackle to tackle plus a couple of yards, out to about 7-8 yards deep. Count the defenders in it, then count your blockers.' },
      { type: 'list', items: [
        '**More blockers than defenders:** run the ball. Someone is getting a free path.',
        '**Even:** a hat on a hat. The run works if your line wins one-on-one.',
        '**More defenders than blockers:** they\'ve loaded the box. Someone will be free to tackle the runner, so **throw**. A loaded box means they\'re short somewhere in coverage.',
      ] },
      { type: 'key', text: 'Shells and boxes are connected. Two deep safeties usually means only 6 in the box (a run look). One deep safety lets the defense roll a safety down for 7 or 8 in the box (a pass look).' },
      { type: 'diagram', playId: 't-iz', lookId: 'cover2', caption: 'Inside Zone vs Cover 2: two safeties deep, 6 in the box. Even numbers: run it.' },
      { type: 'diagram', playId: 't-iz', lookId: 'cover3-sky', caption: 'Inside Zone vs Cover 3 Sky: the strong safety rolled down. 7 in the box: throw.' },
      { type: 'h', text: 'Two ways to block a run' },
      { type: 'list', items: [
        '**Inside Zone**: the whole line steps the same way and blocks an area. The back reads the blocks and cuts where the defense isn\'t. The backside end is left unblocked on purpose, because the play hits before he can get there. Works from any formation.',
        '**Power**: a gap scheme. The play side blocks down, and the backside guard **pulls** and leads through the hole. That adds a blocker at the point of attack. Best with a tight end; physical and downhill.',
      ] },
      { type: 'p', text: 'Spread formations help the run by pulling defenders out of the box: every receiver split wide takes a defender with him. A tight end does the opposite: he adds a blocker.' },
      { type: 'check', id: 'rg-1', topic: 'boxCount', question: 'You have 5 offensive linemen and no tight end. The defense has 7 defenders in the box. Run or pass?', options: ['Run: 7 is normal', 'Pass: they have more defenders than you can block', 'Run Power: the pulling guard fixes it', 'It doesn\'t matter'], answer: 1, explain: 'Even leaving the backside end unblocked, 6 defenders vs 5 blockers means somebody is free. A loaded box usually means one-on-one coverage outside.' },
      { type: 'check', id: 'rg-2', topic: 'boxCount', question: 'Two high safeties, 6 in the box, and you have a tight end in to block. What does the math say?', options: ['Throw it: two-high means pass', 'Run it: 6 blockers vs 6 defenders, minus the unblocked backside end', 'Punt', 'Run only if it\'s 3rd down'], answer: 1, explain: 'Your 6 blockers vs their 6 defenders, with the backside end left unblocked by design, is a numbers advantage. Run the ball.' },
      { type: 'check', id: 'rg-3', topic: 'runSchemes', question: 'What makes Power different from Inside Zone?', options: ['Power is a pass play', 'Power pulls a guard to add a blocker at the point of attack', 'Power never uses a tight end', 'Inside Zone always goes outside'], answer: 1, explain: 'The pulling guard leads through the hole: an extra hat where the ball is going.' },
      { type: 'try', playId: 't-iz', lookId: 'cover3-sky', text: 'Practice: count the box for Inside Zone against different looks.' },
    ],
  },
  {
    id: 'game-planning',
    title: 'Game Planning: Fewer Plays, More Reps',
    minutes: 5,
    summary: 'How coordinators turn a scouting report into a call sheet, and why a short playbook the team knows beats a big one it doesn\'t.',
    topics: ['install'],
    blocks: [
      { type: 'p', text: 'Every week starts with the same question: **what does this defense do, and which of our plays beat it?** The scouting report tells you their habits: which coverages, on which downs. The game plan is your answer.' },
      { type: 'list', items: [
        '**Start with their top two coverages.** If they play Cover 3 most of the time, you need two or three Cover 3 beaters (Stick, Curl-Flat, Four Verticals, Flood).',
        '**Have a plan for their pressure down.** If they blitz on 3rd & long, carry a hot answer (Slant-Flat, Mesh).',
        '**Keep the run game honest.** Even a passing team needs a run to punish a light box.',
        '**Twelve plays is plenty.** Most teams win with far fewer than they think.',
      ] },
      { type: 'key', text: 'Install is real. A play your team has never practiced will get busted: wrong route depth, a missed block. Every practice rep makes the team sharper on that play. Spread your reps over 20 plays and nothing gets good.' },
      { type: 'h', text: 'Self-scouting' },
      { type: 'p', text: 'The other coordinator is scouting you too. Call the same play over and over and he\'ll take it away. Watch the press box notes during the game: when he adjusts, you go to the play that beats his adjustment. That\'s the chess match.' },
      { type: 'check', id: 'gp-1', topic: 'install', question: 'Your opponent plays Cover 2 on 60% of snaps. Which play belongs at the top of your call sheet?', options: ['Curl-Flat', 'Smash', 'Four Verticals vs Tampa', 'Running into an 8-man box'], answer: 1, explain: 'Smash is the classic Cover 2 beater: it high-lows the squatting corner.' },
      { type: 'check', id: 'gp-2', topic: 'install', question: 'You have 8 practice reps this week. What\'s the better plan?', options: ['1 rep each on 8 different new plays', 'Several reps each on the 3-4 plays you\'ll lean on most', 'No reps: save energy for Friday', 'All 8 reps on a play you won\'t call'], answer: 1, explain: 'Install matters more than volume. The plays you\'ll call most should be the ones your team knows best.' },
    ],
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
