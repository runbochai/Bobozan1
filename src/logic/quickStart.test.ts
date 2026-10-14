import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY_LESSONS } from '../data/academy';
import { QUICK_START_STEPS } from '../data/quickStart';
import { getPracticePlayers, resolvePracticeRound, PRACTICE_HERO_ID, PRACTICE_ENEMY_ID } from './academy';

test('quick start teaches four legal multiplayer decisions using the shared practice engine', () => {
  assert.deepEqual(QUICK_START_STEPS.map(step => step.id), ['charge', 'catch-charge', 'free-defense', 'break-defense']);
  const answers = ['charge', 'hong', 'defend', 'ka'];
  for (const [index, step] of QUICK_START_STEPS.entries()) {
    const source = ACADEMY_LESSONS.find(lesson => lesson.id === step.id)!;
    assert.equal(step.lesson.rounds.length, 1);
    assert.deepEqual(step.lesson.rounds[0].hero, source.rounds[0].hero);
    assert.deepEqual(step.lesson.rounds[0].enemy, source.rounds[0].enemy);
    assert.equal(step.lesson.rounds[0].hero.hp, 1);
    assert.equal(step.lesson.rounds[0].enemy.hp, 1);
    assert.equal(resolvePracticeRound(step.lesson, 0, answers[index]).passed, true);
    for (const move of step.lesson.rounds[0].choices) {
      assert.doesNotThrow(() => resolvePracticeRound(step.lesson, 0, move));
    }
    assert.ok(step.lesson.rounds[0].choices.some(move => !resolvePracticeRound(step.lesson, 0, move).passed));
    assert.doesNotMatch(step.lesson.rounds[0].explanation.zh, /远征|商店|装备/);
    assert.doesNotMatch(step.lesson.rounds[0].explanation.en, /expedition|shop|equipment/i);
  }
});

test('wrong quick-start choices reveal real consequences and retries restore the preset', () => {
  const defending = QUICK_START_STEPS[2].lesson;
  const before = getPracticePlayers(defending, 0);
  const mistake = resolvePracticeRound(defending, 0, 'charge');
  assert.equal(mistake.passed, false);
  assert.equal(mistake.players.find(player => player.id === PRACTICE_HERO_ID)?.hp, 0);
  assert.equal(mistake.heroEnergyDelta, 0);
  assert.equal(mistake.players.find(player => player.id === PRACTICE_ENEMY_ID)?.lastCardId, 'hong');
  assert.deepEqual(getPracticePlayers(defending, 0), before);
  const retry = resolvePracticeRound(defending, 0, 'defend');
  assert.equal(retry.passed, true);
  assert.equal(retry.players.find(player => player.id === PRACTICE_HERO_ID)?.hp, 1);
  assert.equal(retry.heroEnergyDelta, 0);
});
