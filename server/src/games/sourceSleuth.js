// sourceSleuth.js — Unit 8 game adapter: "Source Sleuth" (SOLO, one
// class-wide group). Everyone plays the same student historian solving "The
// Case of the Gonzales Cannon." Six sources × 2 graded decisions = 12 graded
// actions. There is no "pick" and no rival, so the Teacher Command Center
// reports ONE accuracy group.
//
// THE TEACHING IDEA (spec §1): every 7.20 skill, played as detection.
// Decision 1 of each phase CLASSIFIES AND READS the source (primary or
// secondary? who made it, when, why?). Decision 2 WEIGHS it (bias?
// corroboration? does it move the case?). The finale (Phase 6, decision 2)
// asks for a claim backed by evidence — and the honest answer is a
// historian's answer: "probably, with reasons" is a strong conclusion, not
// a weak one.
//
// THE ANSWER KEY LIVES HERE, ON THE SERVER (verdicts/effects/feedback). The
// factory ships labels only; the client submits { kind, choiceIndex }.
// Student-facing text is written at a 5th grade reading level.
//
// Every step is a 'decision' — a judgment call, not a map. ✅ right (+1) ·
// ⚠️ partial (+0.5) · ❌ wrong (0).
//
// No failCheck / failEnding: this is a straight choice-driven game — the
// meters rise and fall with every call, and all 12 actions always play out.

import { createStepGame } from './_stepGame.js';

// ---------------------------------------------------------------------------
// Shared board metadata (shipped to clients at match:begin — display info only)
// ---------------------------------------------------------------------------

export const METERS = {
  evidence:    { name: 'Evidence',    icon: 'evidence',    blurb: 'What your case can actually prove. It grows when you classify a source correctly — primary or secondary.' },
  credibility: { name: 'Credibility', icon: 'credibility', blurb: 'How well you weigh each source. It grows when you catch bias, spot a motive, and look for backup instead of guessing.' },
  case:        { name: 'Case',        icon: 'case',        blurb: 'The argument taking shape. It grows when your evidence lines up into a claim you could actually defend.' },
};

// This game has no map, so there are no placed markers. Kept for engine symmetry.
export const MARKERS = {
  board: { name: 'Your case file' },
};

// All three meters begin at 50: an open case, no trust earned yet, no claim made.
const START_METERS = { evidence: 50, credibility: 50, case: 50 };

// Case Score = evidence + credibility + case (max 300).
export function caseScore(meters) {
  return (meters.evidence || 0) + (meters.credibility || 0) + (meters.case || 0);
}

// Ending tier from the final Case Score (spec §3).
export const ENDINGS = {
  top: { key: 'top', title: 'Master Sleuth',
         text: 'You worked this case exactly the way real historians do. Every source got a fair read — primary or secondary, exciting or dull, friendly or biased — and you never let a good story outrun the proof. When the evidence lined up, you said so, clearly. When a source stood alone, you went looking for backup instead of calling it settled. That is the whole method: classify carefully, weigh honestly, and build your claim on what the sources can actually support. The Gonzales cannon’s true story may never be 100% certain — but your case file would make any museum proud. This is what "probably, and here’s why" looks like when it is done right. Case closed — as closed as history ever gets.' },
  mid: { key: 'mid', title: 'Solid Case',
         text: 'You cracked the real shape of this case: a diary, a supply list, and a lab report that mostly agree, against a legend and a rival claim that do not hold up alone. Your case file is not perfect — a source or two got more trust than it earned, or less — but the heart of the method held. You read sources carefully, you asked who made them and why, and in the end you reached for evidence instead of just going with your gut. That is exactly how real historical arguments get built, one imperfect draft at a time. Look back at the sources where your instinct wavered. A sharper eye next time, and this solid case becomes an airtight one.' },
  low: { key: 'low', title: 'Reopened for Review',
         text: 'This case needs another look, and that is alright — every real historian reopens a file sometime. A few sources got more trust than they had earned, and a few got dismissed too fast, so the evidence never quite lined up into a claim you could stand behind. But here is the good news: every skill this case tested — telling primary from secondary, spotting a motive, weighing a claim against the proof — is a skill you can sharpen with practice. Go back through the file. Ask again: who made this, and when, and why? The cannon’s case is still open. So is yours — take another pass.' },
};

export function endingFor(score) {
  if (score >= 200) return ENDINGS.top;
  if (score >= 110) return ENDINGS.mid;
  return ENDINGS.low;
}

// The universal debrief: the true, still-debated history behind the case (TEKS 7.20A/D/E/F).
export const DEBRIEF =
  'The mystery you just solved is real. In October 1835, Mexican soldiers marched to Gonzales, Texas. They came to take back a small cannon the government had loaned the town years before. The town said no. Settlers rolled the cannon into a field. They raised a flag with a black cannon, one star, and two words: "COME AND TAKE IT." On October 2, shots were fired. Almost no one was hurt, but the moment mattered — it was the first battle of the Texas Revolution. Some call it "the Lexington of Texas," after the battle that opened the American Revolution. What happened to the actual cannon next is a real mystery. Some accounts say it was buried again and lost for decades during the war. Long after, a cannon believed to be the same gun was found and put on display in Gonzales, Texas. Historians still argue about whether it is truly the original. That argument is the whole point of this case. Real history is almost never one clean fact — it is built from sources, weighed with care, honest about what it cannot prove. The best historians, like the best sleuths, say "probably" — and show their work.';

// ===========================================================================
// THE SIX SOURCES of one case. Player-facing text at a 5th grade reading level.
// ===========================================================================

const PHASES = [
  // ---- Phase 1 — The Diary ----
  {
    title: 'The Diary', date: "A soldier's diary, 1835", image: 'source_diary.jpg',
    event: 'A leather diary just arrived from a donor’s attic. Inside, a young Texian volunteer wrote about the fight at Gonzales in October 1835 — and about a small cannon the town refused to give back. He wrote these pages the same week it happened. Open it up. Your case begins here.',
    steps: [
      {
        kind: 'decision',
        prompt: 'The diary’s ink is faded and hard to read. But one thing is clear: this soldier was there, and he wrote it down right away. What kind of source is this?',
        choices: [
          { label: 'Secondary — it’s nearly 200 years old, so by now it counts as secondary.',
            verdict: 'partial', effects: { evidence: 3, credibility: -3 },
            feedback: 'Watch that trap: a source doesn’t switch from primary to secondary as it ages. What matters is who made it and when — a witness, at the time. This diary is still primary today, faded ink and all.' },
          { label: 'Unusable — the handwriting is too messy to be real evidence.',
            verdict: 'wrong', effects: { evidence: -10 },
            feedback: 'Hard to read isn’t the same as unreliable. A sleuth doesn’t toss out a clue because it takes extra work — you dig in, and you read it.' },
          { label: 'Primary — it was made by a witness, close to the time it happened.',
            verdict: 'right', effects: { evidence: 10 },
            feedback: 'That’s the test for primary: a witness, at the time. This diary passes both parts — the soldier was there, and he wrote it that same week.' },
        ],
      },
      {
        kind: 'decision',
        prompt: 'One soldier, writing what he saw. That’s your first real lead. What’s your next move?',
        choices: [
          { label: 'Log it as strong evidence, then go find a second source that backs it up.',
            verdict: 'right', effects: { credibility: 10, case: 5 },
            feedback: 'That’s how real cases get built. A firsthand account is a strong lead — but good sleuths always look for a second voice before they call it settled.' },
          { label: 'It’s just one soldier’s word. Barely worth logging.',
            verdict: 'partial', effects: { credibility: 3, case: -3 },
            feedback: 'You’re right to want more proof — but don’t undersell it. A witness who was there, writing it down that week, is real evidence. It’s a strong lead, just not the whole case yet.' },
          { label: 'Case closed — the diary said it, so that settles it.',
            verdict: 'wrong', effects: { credibility: -10 },
            feedback: 'Slow down. One source is a lead, not a verdict. Even an honest witness can misremember, or only see part of the story. Keep digging.' },
        ],
      },
    ],
  },

  // ---- Phase 2 — The 1897 Newspaper ----
  {
    title: 'The 1897 Newspaper', date: 'A newspaper story, 1897', image: 'source_newspaper.jpg',
    event: 'Deep in the museum’s files, you find a yellowed newspaper from 1897 — more than sixty years after the battle. The story reads like a movie: brave heroes, rolling smoke, and a cannon "mighty as a mountain." But check the top of the page. The paper printed this to advertise the town’s new festival. It had a motive — a reason of its own to tell the story big. And it calls the cannon huge. Your diary called it little. Hmm.',
    steps: [
      {
        kind: 'decision',
        prompt: 'The writer wasn’t born until after the battle. He wrote this more than sixty years later, to help sell a festival. What kind of source is this?',
        choices: [
          { label: 'Secondary — you can tell because the story is so wild and dramatic.',
            verdict: 'partial', effects: { evidence: 3, credibility: -3 },
            feedback: 'Right label, wrong test. Plenty of primary sources are dramatic too — battles are dramatic! It’s secondary because the writer wasn’t there and wrote long after. Judge sources by who and when, never by style.' },
          { label: 'Secondary — the writer wasn’t there, and he wrote it long after, using other people’s stories.',
            verdict: 'right', effects: { evidence: 10 },
            feedback: 'You checked all three questions: who, when, and why. Not a witness, long after the event, and written to sell a festival. That’s secondary — with a motive worth watching.' },
          { label: 'Primary — it’s a newspaper, and newspapers are primary sources.',
            verdict: 'wrong', effects: { evidence: -10 },
            feedback: 'Careful — the format isn’t the test. A newspaper printed in October 1835 would be primary. This one came sixty years late, from a writer who wasn’t there. Always ask who made it, and when.' },
        ],
      },
      {
        kind: 'decision',
        prompt: 'The paper tells a thrilling tale — but it wanted to sell festival tickets, and it clashes with your diary on the cannon’s size. How much weight does it get?',
        choices: [
          { label: 'Trust the exciting details — it’s a great story, and it made it into print.',
            verdict: 'partial', effects: { credibility: 3, case: -3 },
            feedback: 'Fun to read isn’t the same as true, and print isn’t proof — anyone can print things. This paper wanted a thrilling tale to sell tickets. Enjoy the story, but check every detail before it enters your case file.' },
          { label: 'Toss it — the writer wasn’t there, so this source is worthless.',
            verdict: 'wrong', effects: { credibility: -10 },
            feedback: 'Don’t toss it! Secondary sources can hold real clues — this writer may have talked with old-timers who truly were there. Late and flashy means "handle with care." It never means "throw away."' },
          { label: 'Flag its motive, then check each detail against the diary — keep what matches, question what doesn’t.',
            verdict: 'right', effects: { credibility: 10, case: 5 },
            feedback: 'That’s sleuth work. A motive can tilt a story — that tilt is called bias. It doesn’t make the source worthless; it makes it one you double-check. Where it matches your eyewitness, keep it. Where it clashes, trust the witness.' },
        ],
      },
    ],
  },

  // ---- Phase 3 — Grandpa's Story ----
  {
    title: "Grandpa's Story", date: 'A family story, passed down', image: 'source_family.jpg',
    event: 'Today the man who found the cannon visits your workroom. Over coffee, he shares what his family has always known. "Grandpa said it his whole life: that gun in our barn is the Gonzales cannon — the real one." He heard it from his grandpa, who heard it from his. The story has traveled four generations, voice to voice. No letter. No photo. No paper. Just family memory, kept with love. Listen closely, sleuth. This story matters to them — and it might matter to your case.',
    steps: [
      {
        kind: 'decision',
        prompt: 'No one wrote this story down at the time. It has been retold, parent to child, for over a hundred years. What kind of source is it?',
        choices: [
          { label: 'Primary — the cannon sat in their barn, so the family’s word is firsthand.',
            verdict: 'partial', effects: { evidence: 3, credibility: -3 },
            feedback: 'Owning the cannon makes them part of its story — but firsthand means seeing it yourself. Nobody living saw 1835. The story reached them the same way it reached you: passed down, voice to voice.' },
          { label: 'Secondhand — a story passed from person to person, not a record made by a witness.',
            verdict: 'right', effects: { evidence: 10 },
            feedback: 'That’s the honest label. Nobody alive saw it happen, and nothing was written down at the time. That doesn’t make it false — families carry true things. It means the story can’t be checked all by itself.' },
          { label: 'Primary — and the strongest source yet, because family memory keeps a story true forever.',
            verdict: 'wrong', effects: { evidence: -10 },
            feedback: 'Family memory is precious, and it can carry truth a long way. But small details can shift with each retelling — nobody lying, just time at work. Passed-down stories need outside backup before they can settle anything.' },
        ],
      },
      {
        kind: 'decision',
        prompt: 'The family believes it with all their heart — and belief is not the same as proof. What do you do with Grandpa’s story?',
        choices: [
          { label: 'Treat it as a real lead — log it, and hunt for outside sources that back it up.',
            verdict: 'right', effects: { credibility: 10, case: 5 },
            feedback: 'Perfect balance. You honored the story and kept investigating. Family memory is a real clue — it points somewhere. Now see if other sources point the same way. If they do, this legend gets much stronger.' },
          { label: 'A story without any paper behind it isn’t really evidence — set it gently aside.',
            verdict: 'partial', effects: { credibility: 3, case: -3 },
            feedback: 'Careful — don’t set it aside. Spoken history is real evidence; whole chapters of the past survived only by voice. It just can’t stand alone. Keep it in your file and test it against every source you find.' },
          { label: 'The family has always known it’s the true cannon — that settles the case.',
            verdict: 'wrong', effects: { credibility: -10 },
            feedback: 'Their love is real, but love isn’t proof. A family can believe something honestly and still be mistaken after a hundred years of retellings. Keep the story close — and keep checking it. That’s how you respect it best.' },
        ],
      },
    ],
  },

  // ---- Phase 4 — The Supply List ----
  {
    title: 'The Supply List', date: 'An army supply list, 1836', image: 'source_ledger.jpg',
    event: 'A packet of copied army records from 1836 arrives from the state archives — the place where old government papers are kept. Most of it is dry as dust: flour, boots, rope, more rope. Then one line grabs you: "1 cannon, six-pound," listed with the Texian army near Gonzales. You measured the barn cannon yesterday. It’s a six-pounder too — a small gun that fired a six-pound ball. No heroes here. No drama. Just a clerk, counting gear. Don’t yawn yet, sleuth.',
    steps: [
      {
        kind: 'decision',
        prompt: 'It’s not a story. It’s just a list, scratched out by an army clerk in 1836 as supplies moved. What kind of source is this?',
        choices: [
          { label: 'Primary — it’s from 1836, and anything that old counts as primary.',
            verdict: 'partial', effects: { evidence: 3, credibility: -3 },
            feedback: 'Right label, but fix the reason. Old doesn’t mean primary — that 1897 newspaper was old too, and still secondary. This list is primary because the army made it at the time, about its own gear.' },
          { label: 'Primary — an official record, made at the time, by the people doing the work.',
            verdict: 'right', effects: { evidence: 10 },
            feedback: 'Yes! Primary doesn’t mean exciting. Lists, receipts, and records count too — and they’re often extra trustworthy. Nobody writes a supply list to impress a crowd. The clerk was just recording facts.' },
          { label: 'Secondary — real primary sources are witness stories, and this is just a boring list.',
            verdict: 'wrong', effects: { evidence: -10 },
            feedback: 'That’s the trap! A source doesn’t have to be a story. Primary means made at the time, by people involved — and this clerk was there, counting real cannons. Boring papers are often the most honest ones.' },
        ],
      },
      {
        kind: 'decision',
        prompt: 'One dry line: a six-pound cannon, with the army, near Gonzales, in 1836. Does it move your case?',
        choices: [
          { label: 'Log it as strong evidence — the army’s own list backs up the soldier’s diary.',
            verdict: 'right', effects: { credibility: 10, case: 5 },
            feedback: 'That’s corroboration — when separate sources, made by different people, point the same way. The diary described a little cannon with the army; the army’s list shows one, the same small size. Two voices agreeing beats one voice alone.' },
          { label: 'It’s a solid source — log it, but it doesn’t really add much to what you have.',
            verdict: 'partial', effects: { credibility: 3, case: -3 },
            feedback: 'It adds the very thing your case was missing: a second, separate voice. Flip back to the diary — a little cannon, with the army. Now the army’s own paperwork says the same. Sources are stronger together than apart.' },
          { label: 'Skip it — a dull list can’t matter next to a real eyewitness diary.',
            verdict: 'wrong', effects: { credibility: -10 },
            feedback: 'Flip that around. Nobody ever spiced up a supply list — no motive, no audience, just facts. That can make it stronger than a colorful story. And it doesn’t compete with your diary. It teams up with it.' },
        ],
      },
    ],
  },

  // ---- Phase 5 — The Lab Report ----
  {
    title: 'The Lab Report', date: "An archaeologist's report, 2010s", image: 'source_labreport.jpg',
    event: 'Your file holds one more expert voice. Years ago, the museum asked an archaeologist — a scientist who studies the objects people leave behind — to examine the cannon. Her lab tested the barrel’s metal. The result: it matches how cannons were made in the 1830s. That’s the right era — the right stretch of time. But her last line is underlined: "These tests show the cannon’s age. They cannot show which cannon this is." Read that twice, sleuth.',
    steps: [
      {
        kind: 'decision',
        prompt: 'The report is from the 2010s, written by an expert who tested the cannon herself — but who never saw 1835. What kind of source is this?',
        choices: [
          { label: 'Primary — she worked on the actual cannon with her own hands, so it’s firsthand.',
            verdict: 'partial', effects: { evidence: 3, credibility: -3 },
            feedback: 'Close — but primary or secondary is about the event you’re studying. She saw the metal today, not the battle in 1835. Her report is secondary. The hands-on testing is what makes it good secondary.' },
          { label: 'Secondary — and since it’s the newest source in the file, it must be the weakest.',
            verdict: 'wrong', effects: { evidence: -10 },
            feedback: 'Age doesn’t rank sources. A brand-new report can hold brand-new facts — like a metal test no one in the 1830s could run. Weigh every source by its evidence, not its birthday.' },
          { label: 'Secondary — she’s not a witness, but it’s expert work built on tests anyone could recheck.',
            verdict: 'right', effects: { evidence: 10 },
            feedback: 'Exactly. No time machine, so it’s secondary. But secondary never means second-rate. An expert who runs careful tests adds new, checkable facts to your case. Judge the category — and the quality.' },
        ],
      },
      {
        kind: 'decision',
        prompt: 'The metal matches the 1830s. That’s real science from a real expert. How much does it prove?',
        choices: [
          { label: 'She wasn’t there in 1835, so her report can’t really tell us much.',
            verdict: 'partial', effects: { credibility: 3, case: -3 },
            feedback: 'Don’t shortchange the expert. No, she’s not a witness — but her tests pulled a hard fact out of the cannon itself: this barrel truly is from the right era. No diary could tell you that. Log it.' },
          { label: 'Science has spoken — the lab proved this is the Gonzales cannon, case closed.',
            verdict: 'wrong', effects: { credibility: -10 },
            feedback: 'Check what the test measured: age. Old metal means this could be the gun — not that it is. Plenty of cannons were made back then. Claiming more than the evidence shows is how strong cases fall apart.' },
          { label: 'A lot, but not everything — it proves the right era, not which cannon this is.',
            verdict: 'right', effects: { credibility: 10, case: 5 },
            feedback: 'That’s expert-level thinking. The lab moved your case forward: right size, right age, nothing fake. But the test answered "how old," never "which one." Knowing exactly what a source can and can’t prove is a sleuth’s sharpest skill.' },
        ],
      },
    ],
  },

  // ---- Phase 6 — The Rival Claim ----
  {
    title: 'The Rival Claim', date: "A rival town's website", image: null,
    event: 'One last source, sleuth — and it’s a loud one. A town down the highway has a website announcing that their cannon is the true Gonzales gun. The page is flashy and absolutely sure of itself. It leans on loaded words — words chosen to stir your feelings instead of showing facts. So scroll down. Hunt for the part every honest source has: where the information came from. Keep scrolling. It isn’t there. No author. No documents. Not one source named.',
    steps: [
      {
        kind: 'decision',
        prompt: 'Big claims, bold design, total confidence — and zero sources behind any of it. How do you rate this website?',
        choices: [
          { label: 'Confidence isn’t evidence — it names no sources, so treat every claim with real doubt.',
            verdict: 'right', effects: { credibility: 10 },
            feedback: 'That’s the catch of the case. Loud words and bold claims are easy to type — evidence is the hard part, and this page shows none. When a source can’t show where its facts came from, a sleuth asks: "Says who?"' },
          { label: 'Something feels off here, but it’s hard to say what — call it half-trustworthy.',
            verdict: 'partial', effects: { credibility: 3, evidence: -3 },
            feedback: 'Your gut is good — now train it to name things. No author. No dates. No documents. Loaded words where evidence should be. Once you can list why a source fails, you don’t have to settle for "half-trust."' },
          { label: 'It’s published for the whole world to see — somebody must have checked it first.',
            verdict: 'wrong', effects: { credibility: -10 },
            feedback: 'Nobody has to check a website before it goes up. Anyone can post anything, in minutes, for free. Real credibility — being worth your trust — is earned with named sources and checkable facts. This page brought loud words instead.' },
        ],
      },
      {
        kind: 'decision',
        prompt: 'Six sources sit in your case file. The museum is waiting. Given everything you’ve gathered, what’s your verdict on the Gonzales cannon?',
        choices: [
          { label: 'There’s no way to ever know for sure, so it’s pointless to pick an answer.',
            verdict: 'partial', effects: { case: -3, credibility: 3 },
            feedback: 'Your humility is honest — total proof really is out of reach. But a historian’s job is to build the best-supported answer anyway. Your evidence points one way: probably yes. Don’t leave a good case unfinished.' },
          { label: 'Probably yes — the diary, the supply list, and the metal test all agree, and the legend and rival claim can’t stand alone.',
            verdict: 'right', effects: { case: 15, evidence: 5, credibility: 5 },
            feedback: 'That’s a historian’s verdict — the strong answer, not the weak one. An eyewitness diary, an army record, and a lab test all point the same way. The legend supports them; the rival site showed nothing. You claimed exactly what your evidence could carry — and that’s how history gets written. Case built, sleuth.' },
          { label: 'Yes — one hundred percent, proven beyond all doubt, case closed forever.',
            verdict: 'wrong', effects: { case: -10, evidence: -5 },
            feedback: 'You built a real case — don’t overload it. No source proved this exact cannon beyond all doubt, and honest historians almost never reach 100%. Claiming more certainty than your evidence holds is the rival website’s move — not yours. "Probably, with proof" beats "definitely" without.' },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Assemble the single class-wide role into a one-variant game. One side, no
// rival — so the Command Center reports ONE class accuracy group (spec §1).
// ---------------------------------------------------------------------------

export const VARIANTS = {
  historian: {
    name: 'Your Case File',
    sub: 'Student historian on the case · six sources, six tests',
    phases: PHASES,
    waypoints: [], // no map: the evidence board tells the story instead
  },
};

export { PHASES };

export default createStepGame({
  id: 'sourceSleuth',
  title: 'Source Sleuth',
  meters: METERS,
  markers: MARKERS,
  startMeters: () => ({ ...START_METERS }),
  scoreMeters: caseScore,
  endingFor,
  debrief: DEBRIEF,
  variants: VARIANTS,
  // No failCheck / failEnding: a straight choice-driven game — the meters rise
  // and fall with every call, and all 12 actions always play through.
});
