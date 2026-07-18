// content.test.js — sanity + historical-balance checks on the Source Sleuth
// content bank (spec §1–§6). One class-wide role (a student historian), six
// sources, choice-based, with NO early-fail and NO scripted event tolls —
// every effect comes straight from the player's own call.
import test from 'node:test';
import assert from 'node:assert/strict';
import game, { PHASES, caseScore, endingFor, ENDINGS } from '../src/games/sourceSleuth.js';

const SIDE = 'historian';

const allText = () =>
  PHASES.flatMap((p) => [p.event, ...p.steps.flatMap((s) => [s.prompt, ...s.choices.map((c) => `${c.label} ${c.feedback}`)])]).join(' ');

test('one class-wide role is the single side, with no rival', () => {
  assert.deepEqual(game.sides, [SIDE]);
  assert.equal(game.hasOpponent, false, 'everyone works the same case — a single class-wide accuracy group');
  assert.equal(game.totalActions, 12);
  assert.equal(game.chapterCount, 6);
  assert.ok(game.meta.variants[SIDE], 'Your Case File ships as the one variant');
  assert.deepEqual(game.meta.variants[SIDE].waypoints, [], 'no map: the evidence board replaces it');
});

test('six sources, each with an event and two graded decisions (right/partial/wrong)', () => {
  assert.equal(PHASES.length, 6, 'source count');
  for (const [i, ph] of PHASES.entries()) {
    assert.ok(ph.title && ph.date && ph.event, `source ${i} metadata`);
    assert.equal(ph.steps.length, 2, `source ${i} has 2 steps`);
    for (const [j, step] of ph.steps.entries()) {
      assert.equal(step.kind, 'decision', `source ${i} step ${j} is a decision (no map)`);
      assert.ok(step.prompt?.length > 5, `source ${i} step ${j} prompt`);
      const verdicts = step.choices.map((c) => c.verdict).sort();
      assert.deepEqual(verdicts, ['partial', 'right', 'wrong'], `source ${i} step ${j} verdicts`);
      for (const c of step.choices) {
        assert.ok(c.label?.length > 5 && c.feedback?.length > 10, `source ${i} step ${j} choice text`);
      }
    }
  }
  const steps = PHASES.flatMap((p) => p.steps);
  assert.equal(steps.length, 12, '12 graded actions');
});

test('meters start at 50/50/50 — evidence, credibility, case', () => {
  const state = game.initMatch({ soloSide: SIDE });
  assert.deepEqual(state.sides[SIDE].meters, { evidence: 50, credibility: 50, case: 50 });
});

test('the content teaches the spec’s six sources and the finale claim (TEKS 7.20A/D/E/F)', () => {
  const text = allText();
  assert.match(text, /primary/i, 'primary vs secondary vocabulary');
  assert.match(text, /secondary/i, 'primary vs secondary vocabulary');
  assert.match(text, /motive/i, 'motive / bias (newspaper source)');
  assert.match(text, /corroborat/i, 'corroboration (supply list source)');
  assert.match(text, /loaded words/i, 'loaded language (rival website source)');
  assert.match(text, /no sources|no author|no documents/i, 'no-citation red flag (rival website source)');
  assert.match(text, /probably/i, 'the finale models an honest "probably, with reasons" claim');
  const debrief = game.report(game.initMatch({ soloSide: SIDE })).perSide[SIDE].debrief;
  assert.match(debrief, /1835/, 'debrief names the 1835 Battle of Gonzales');
  assert.match(debrief, /COME AND TAKE IT/i, 'debrief names the flag and phrase');
  assert.match(debrief, /October 2/i, 'debrief names the October 2 skirmish date');
  assert.match(debrief, /Lexington of Texas/i, 'debrief names the "Lexington of Texas" nickname');
  assert.match(debrief, /historians still argue|still debate/i, 'debrief is honest that the relic cannon’s authenticity is genuinely disputed');
});

test('sensitivity: no gore, no spectacle, and the family-legend source is never mocked (spec §6)', () => {
  const text = allText();
  assert.doesNotMatch(text, /\b(gore|blood|dying|death|explod\w*)\b/i, 'no graphic detail anywhere in the content bank');
  assert.doesNotMatch(text, /savage|primitive|heathen/i, 'no slurs, no spectacle');
  const legend = PHASES[2]; // "Grandpa's Story"
  const legendText = [legend.event, ...legend.steps.flatMap((s) => [s.prompt, ...s.choices.map((c) => `${c.label} ${c.feedback}`)])].join(' ');
  assert.doesNotMatch(legendText, /silly|foolish|worthless|nonsense|not real evidence/i, 'the family legend is never mocked or dismissed with contempt — only "uncorroborated"');
});

test('the design is honest: NO early-fail, and NO scripted event tolls (spec §3, §6)', () => {
  const state = game.initMatch({ soloSide: SIDE });
  const rep = game.report(state);
  assert.equal(rep.perSide[SIDE].failed, false, 'there is no early game-over');
  const scriptedEffects = PHASES.filter((p) => p.eventEffects);
  assert.equal(scriptedEffects.length, 0, 'no source carries a scripted meter toll — every effect comes from the player’s own call');
});

// --- Playthrough helpers (drive the adapter directly, no GameManager) --------

function playRun(pick) {
  const state = game.initMatch({ soloSide: SIDE });
  for (let step = 0; step < game.totalActions; step++) {
    game.chapterEvent(state, SIDE);            // idempotent per source; safe each step
    const res = game.resolve(state, SIDE, pick(state));
    assert.ok(!res.error, `step ${step} failed: ${res.error}`);
  }
  return game.report(state);
}

const rightMove = (state) => game.aiMove(state, SIDE);

const moveWithVerdict = (verdict) => (state) => {
  const ss = state.sides[SIDE];
  const steps = PHASES.flatMap((p) => p.steps);
  const step = steps[ss.cursor];
  const realIdx = step.choices.findIndex((c) => c.verdict === verdict);
  return { kind: step.kind, choiceIndex: ss.shuffles[ss.cursor].indexOf(realIdx) };
};

const wrongMove = moveWithVerdict('wrong');
const partialMove = moveWithVerdict('partial');

test('all-right run: 100% accuracy and "Master Sleuth"', () => {
  const you = playRun(rightMove).perSide[SIDE];
  assert.equal(you.accuracy, 100);
  assert.equal(you.failed, false);
  assert.equal(you.ending.key, 'top');
  assert.equal(you.ending.title, ENDINGS.top.title);
  assert.equal(you.score, 290);
});

test('all-wrong run: 0% accuracy, "Reopened for Review", but it still finishes (no early-fail)', () => {
  const you = playRun(wrongMove).perSide[SIDE];
  assert.equal(you.accuracy, 0, 'every wrong answer scores 0 across the full 12-action denominator');
  assert.equal(you.failed, false, 'the game never ends early — the meters just fall');
  assert.equal(you.ending.key, 'low');
  assert.equal(you.ending.title, ENDINGS.low.title);
  assert.equal(you.score, 40);
});

test('all-partial run: 50% accuracy and a mid-tier "Solid Case"', () => {
  const you = playRun(partialMove).perSide[SIDE];
  assert.equal(you.accuracy, 50, '12 halves = 50%');
  assert.equal(you.ending.key, 'mid');
  assert.equal(you.ending.title, ENDINGS.mid.title);
  assert.equal(you.score, 150);
});

test('currentPrompt never leaks the answer key', () => {
  const state = game.initMatch({ soloSide: SIDE });
  game.chapterEvent(state, SIDE);
  const prompt = game.currentPrompt(state, SIDE);
  assert.equal(prompt.choices.length, 3);
  for (const c of prompt.choices) {
    if (typeof c === 'object') {
      assert.ok(!('verdict' in c) && !('feedback' in c) && !('effects' in c), 'no answer key on a choice');
    }
  }
});

test('case-score tiers: Master Sleuth >= 200, Solid Case 110–199, Reopened for Review < 110', () => {
  assert.equal(endingFor(300).key, 'top');
  assert.equal(endingFor(200).key, 'top');
  assert.equal(endingFor(199).key, 'mid');
  assert.equal(endingFor(110).key, 'mid');
  assert.equal(endingFor(109).key, 'low');
  assert.equal(caseScore({ evidence: 50, credibility: 50, case: 50 }), 150);
});

test('the finale (source 6, decision 2) is the biggest single Case swing, per spec’s example', () => {
  const finale = PHASES[5].steps[1];
  const right = finale.choices.find((c) => c.verdict === 'right');
  assert.equal(right.effects.case, 15, 'a correct, evidence-backed claim moves Case by +15');
});
