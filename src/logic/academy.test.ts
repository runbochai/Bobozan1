import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY_LESSONS, MULTIPLAYER_ACADEMY_LESSONS, RULE_TOPICS, type AcademyLesson } from '../data/academy';
import { FINAL_LEVEL } from '../data/constants';
import { SKILL_DB } from '../data/skills';
import { EXPEDITION_STAGES } from '../data/expedition';
import type { Player } from '../types';
import { calculateTurnOutcome, doesCard1Overpower, getEffectiveLevel, getPlayerCards } from './combat';
import {
  ACADEMY_STORAGE_KEY, PRACTICE_HERO_ID, PRACTICE_ENEMY_ID,
  getPracticePlayers, readCompletedAcademyLessons, resolvePracticeRound, writeCompletedAcademyLessons,
  getMultiplayerPractice, resolveMultiplayerPractice,
  type AcademyStorage,
} from './academy';

const lesson = (id: string): AcademyLesson => {
  const found = ACADEMY_LESSONS.find(item => item.id === id);
  assert.ok(found, `Missing lesson: ${id}`);
  return found;
};
const card = (id: string) => {
  const found = SKILL_DB.find(item => item.id === id);
  assert.ok(found, `Missing card: ${id}`);
  return found;
};
const hero = (players: Player[]) => players.find(player => player.id === PRACTICE_HERO_ID)!;
const enemy = (players: Player[]) => players.find(player => player.id === PRACTICE_ENEMY_ID)!;

test('lesson and rule IDs are unique, bilingual, and small enough for focused practice', () => {
  assert.equal(new Set(ACADEMY_LESSONS.map(item => item.id)).size, ACADEMY_LESSONS.length);
  assert.equal(new Set(RULE_TOPICS.map(item => item.id)).size, RULE_TOPICS.length);
  for (const item of ACADEMY_LESSONS) {
    assert.ok(item.rounds.length >= 1 && item.rounds.length <= 2);
    for (const value of [item.title, item.intro, item.opponentHint]) {
      assert.ok(value.zh.trim() && value.en.trim());
    }
  }
  for (const topic of RULE_TOPICS) {
    for (const value of [topic.title, ...topic.items]) assert.ok(value.zh.trim() && value.en.trim());
  }
});

test('multiplayer situations each require a real decision and use unchanged engine output', () => {
  assert.equal(new Set(MULTIPLAYER_ACADEMY_LESSONS.map(item => item.id)).size, MULTIPLAYER_ACADEMY_LESSONS.length);
  for (const item of MULTIPLAYER_ACADEMY_LESSONS) {
    for (const value of [item.title, item.intro, item.prompt, ...item.choices.map(choice => choice.label)]) {
      assert.ok(value.zh.trim() && value.en.trim());
    }
    const practice = getMultiplayerPractice(item.id);
    const actual = calculateTurnOutcome(practice.beforePlayers, practice.game.turn, practice.game.matchCount, 'zh');
    assert.deepEqual(practice.game.players, actual.players);
    assert.equal(practice.game.status, actual.isGameOver ? 'GAMEOVER' : 'PLAYING');
    assert.equal(practice.survivorReset, actual.survivorReset);
    assert.equal(item.choices.filter(choice => resolveMultiplayerPractice(item.id, choice.id).passed).length, 1);
    assert.throws(() => resolveMultiplayerPractice(item.id, 'unknown-choice'), /Unknown/);
  }
});

test('multiplayer teaching separates a turn, a match winner, and the final kill ranking', () => {
  const ongoing = getMultiplayerPractice('turn-and-match');
  assert.equal(ongoing.game.status, 'PLAYING');
  assert.ok(ongoing.game.players.every(player => player.energy === 2 && !player.isDead));
  assert.equal(ongoing.summary.roundWinner, null);
  assert.equal(resolveMultiplayerPractice('turn-and-match', 'next-turn').passed, true);

  const match = getMultiplayerPractice('winner-and-leader');
  assert.equal(match.summary.roundWinner?.id, PRACTICE_HERO_ID);
  assert.equal(match.summary.leaders[0].id, PRACTICE_ENEMY_ID, 'The eliminated player can still lead total kills');
  assert.ok(hero(match.game.players).inventory.includes(match.game.matchCount), 'The survivor receives the real engine reward');
  assert.equal(match.summary.isSeriesOver, false);
  assert.deepEqual(match.summary.champions, []);
  assert.equal(resolveMultiplayerPractice('winner-and-leader', 'survivor-reward').passed, true);

  const final = getMultiplayerPractice('final-standings');
  assert.equal(final.game.matchCount, FINAL_LEVEL);
  assert.equal(final.summary.isSeriesOver, true);
  assert.equal(final.summary.remainingMatches, 0);
  assert.deepEqual(final.summary.champions.map(player => player.id).sort(), [PRACTICE_HERO_ID, PRACTICE_ENEMY_ID].sort());
  assert.ok(final.summary.champions.every(player => player.kills === 5));
  assert.equal(hero(final.game.players).inventory.includes(FINAL_LEVEL), false, 'Final match does not award a new skill');
  assert.equal(resolveMultiplayerPractice('final-standings', 'joint-champions').passed, true);
});

test('three-player teaching keeps eliminated players out and preserves survivors’ earned skills', () => {
  const practice = getMultiplayerPractice('elimination-reset');
  assert.equal(practice.game.status, 'PLAYING');
  assert.equal(practice.survivorReset, true);
  assert.equal(enemy(practice.game.players).isDead, true);
  assert.equal(practice.summary.roundWinner, null);
  const survivor = hero(practice.game.players);
  assert.equal(survivor.hp, 1);
  assert.equal(survivor.energy, 0);
  assert.equal(survivor.layer, 0);
  assert.deepEqual(survivor.inventory, [0, 1]);
  assert.deepEqual(survivor.disabledSkills, []);
  assert.deepEqual(survivor.freeSkills, []);
  assert.equal(resolveMultiplayerPractice('elimination-reset', 'survivors-continue').passed, true);
});

for (const item of ACADEMY_LESSONS) {
  test(`${item.id}: every round offers legal choices and has a real-engine solution`, () => {
    for (const [index, round] of item.rounds.entries()) {
      const preview = getPracticePlayers(item, index);
      assert.ok(round.choices.length >= 2, 'Practice must allow an actual decision');
      assert.equal(new Set(round.choices).size, round.choices.length);
      const heroCards = getPlayerCards(hero(preview), preview);
      const enemyCards = getPlayerCards(enemy(preview), preview);
      assert.ok(enemyCards.some(move => move.id === round.enemyMove), 'Enemy must own its move');
      assert.ok(card(round.enemyMove).cost <= round.enemy.energy, 'Enemy must afford its move');
      const results = round.choices.map(move => {
        assert.ok(heroCards.some(candidate => candidate.id === move), `Hero must own ${move}`);
        assert.ok(card(move).cost <= round.hero.energy, `Hero must afford ${move}`);
        const result = resolvePracticeRound(item, index, move);
        const actual = calculateTurnOutcome(getPracticePlayers(item, index, move), index + 1, 1, 'zh', { mode: 'practice' });
        assert.deepEqual(result.players, [hero(actual.players), enemy(actual.players)], 'Practice must use engine results unchanged');
        assert.equal(result.heroHpDelta, hero(result.players).hp - round.hero.hp);
        assert.equal(result.heroEnergyDelta, hero(result.players).energy - round.hero.energy);
        return result;
      });
      assert.ok(results.some(result => result.passed), 'At least one offered legal move must reach the goal');
      assert.ok(results.some(result => !result.passed), 'The lesson must distinguish outcomes, not always pass');
    }
  });
}

test('Charge grants 2 while taking 1 damage cancels the gain', () => {
  const charge = resolvePracticeRound(lesson('charge'), 0, 'charge');
  assert.equal(charge.heroEnergyDelta, 2);
  const interrupted = resolvePracticeRound(lesson('free-defense'), 0, 'charge');
  assert.equal(interrupted.heroHpDelta, -1);
  assert.equal(interrupted.heroEnergyDelta, 0);
  assert.equal(interrupted.passed, false);
});

test('free defense preserves energy, but trading attacks is not a successful block', () => {
  assert.equal(resolvePracticeRound(lesson('free-defense'), 0, 'defend').heroEnergyDelta, 0);
  assert.equal(resolvePracticeRound(lesson('free-defense'), 0, 'defend').passed, true);
  assert.equal(resolvePracticeRound(lesson('free-defense'), 0, 'hong').passed, false);
});

test('higher tier beats Blast without making damage equal the cost', () => {
  const result = resolvePracticeRound(lesson('attack-tier'), 0, 'hong2');
  assert.equal(result.passed, true);
  assert.equal(result.heroEnergyDelta, -2);
  assert.equal(enemy(result.players).hp, 0);
  assert.equal(result.heroHpDelta, 0);
});

test('Pegasus costs 1, ties the 2-energy Double Blast, and neither player dies', () => {
  const result = resolvePracticeRound(lesson('cost-is-not-power'), 0, 'pegasus');
  assert.equal(result.passed, true);
  assert.equal(result.heroEnergyDelta, -1);
  assert.equal(enemy(result.players).energy, 0);
  assert.ok(result.players.every(player => !player.isDead && player.hp === 1));
  assert.equal(resolvePracticeRound(lesson('cost-is-not-power'), 0, 'defend').passed, false, 'A block is not an attack tie');
});

test('Dragon Claw beats Pegasus, but basic tier-2 attacks can tie Dragon Claw', () => {
  assert.equal(resolvePracticeRound(lesson('skill-level'), 0, 'dragonclaw').passed, true);
  assert.equal(resolvePracticeRound(lesson('skill-level'), 0, 'pegasus').passed, false);
  const tie = resolvePracticeRound(lesson('basic-counter'), 0, 'hong2');
  assert.equal(tie.passed, true);
  assert.equal(hero(tie.players).energy, 1);
  assert.equal(enemy(tie.players).energy, 0);
  assert.equal(doesCard1Overpower(card('liuke'), card('dragonclaw')), false);
  assert.equal(doesCard1Overpower(card('dragonclaw'), card('liuke')), false);
});

test('Ka breaks basic defense; a 1-layer rise fails while a 2-layer rise escapes', () => {
  assert.equal(resolvePracticeRound(lesson('break-defense'), 0, 'ka').passed, true);
  assert.equal(resolvePracticeRound(lesson('break-defense'), 0, 'hong2').passed, false);
  assert.equal(resolvePracticeRound(lesson('evade-range'), 0, 'defend').passed, false);
  assert.equal(resolvePracticeRound(lesson('evade-range'), 0, 'smallfly').passed, false);
  const escaped = resolvePracticeRound(lesson('evade-range'), 0, 'bigfly');
  assert.equal(escaped.passed, true);
  assert.equal(hero(escaped.players).layer, 0);
  assert.equal(hero(escaped.players).tempLayerMod, 0, 'Temporary flight resets after resolution');
});

test('hidden-intent previews do not expose selected or previous cards', () => {
  const hidden = lesson('read-habits');
  assert.equal(hidden.concealed, true);
  for (const index of hidden.rounds.keys()) {
    const preview = getPracticePlayers(hidden, index);
    assert.ok(preview.every(player => player.selectedCardId === null && player.lastCardId === null && player.lastAction === null));
    assert.equal(enemy(preview).energy, hidden.rounds[index].enemy.energy, 'Visible energy remains a useful clue');
    const move = hidden.rounds[index].choices[0];
    const revealed = resolvePracticeRound(hidden, index, move);
    assert.equal(enemy(revealed.players).lastCardId, hidden.rounds[index].enemyMove, 'Reveal only after committing');
  }
});

test('the final comeback is a real three-turn defense-defense-counter sequence', () => {
  let players = getPracticePlayers(lesson('free-defense'), 0, 'defend');
  players = calculateTurnOutcome(players, 1, 1, 'zh', { mode: 'practice' }).players;
  assert.equal(hero(players).energy, lesson('comeback').rounds[0].hero.energy);
  assert.equal(enemy(players).energy, lesson('comeback').rounds[0].enemy.energy);
  players = calculateTurnOutcome(players.map(player => ({ ...player, selectedCardId: player.id === PRACTICE_HERO_ID ? 'defend' : 'hong' })), 2, 1, 'zh', { mode: 'practice' }).players;
  assert.equal(hero(players).energy, lesson('comeback').rounds[1].hero.energy);
  assert.equal(enemy(players).energy, lesson('comeback').rounds[1].enemy.energy);
  assert.equal(hero(players).hp, 1);
  players = calculateTurnOutcome(players.map(player => ({ ...player, selectedCardId: player.id === PRACTICE_HERO_ID ? 'hong' : 'charge' })), 3, 1, 'zh', { mode: 'practice' }).players;
  assert.equal(hero(players).isDead, false);
  assert.equal(enemy(players).isDead, true);
  assert.equal(hero(players).energy, 0);
  assert.equal(resolvePracticeRound(lesson('comeback'), 0, 'defend').passed, true);
  assert.equal(resolvePracticeRound(lesson('comeback'), 1, 'hong').passed, true);
});

test('a tied pair remains vulnerable to a third player in range', () => {
  const players = getPracticePlayers(lesson('cost-is-not-power'), 0, 'pegasus');
  const third = { ...players[1], id: 'third', name: 'Third', inventory: [0], energy: 3, selectedCardId: 'ka' };
  const result = calculateTurnOutcome([...players, third], 1, 1, 'en', { mode: 'practice' });
  assert.equal(result.damageTaken[PRACTICE_HERO_ID], 1);
  assert.equal(result.damageTaken[PRACTICE_ENEMY_ID], 1);
});

test('combo tier and effective-level exceptions match the rules lookup', () => {
  assert.equal(getEffectiveLevel(card('skydragon')), 3);
  assert.equal(getEffectiveLevel(card('vajra')), 11);
  assert.equal(getEffectiveLevel(card('allbomb')), 21);
  assert.equal(card('allbomb').type, 'ATTACK');
  assert.equal(card('allbomb').tier, 3);
  assert.equal(doesCard1Overpower(card('vajra'), card('skydragon')), true);
  assert.equal(doesCard1Overpower(card('skydragon'), card('boiler')), true, 'Tier comparison precedes effective level');
  assert.equal(doesCard1Overpower(card('kajifen'), card('vajra')), false);
  assert.equal(doesCard1Overpower(card('vajra'), card('kajifen')), false);
  assert.equal(doesCard1Overpower(card('ji'), card('fireclaw')), false);
  assert.equal(doesCard1Overpower(card('fireclaw'), card('ji')), false);
  assert.equal(doesCard1Overpower(card('kajisuper'), card('vajra')), true);
});

test('practice neither mutates lesson presets nor grants multiplayer rewards', () => {
  const item = lesson('catch-charge');
  const original = JSON.stringify(item);
  const first = getPracticePlayers(item, 0);
  first[0].inventory.push(23);
  assert.deepEqual(getPracticePlayers(item, 0)[0].inventory, [0]);
  const win = resolvePracticeRound(item, 0, 'hong');
  assert.deepEqual(hero(win.players).inventory, [0]);
  assert.equal(hero(win.players).pendingLevel, undefined);
  assert.equal(JSON.stringify(item), original);
});

test('upgrading unlocks Pegasus and a fresh expedition returns to basic cards', () => {
  const item = lesson('upgrade-reset');
  assert.equal(resolvePracticeRound(item, 0, 'pegasus').passed, true);
  assert.equal(resolvePracticeRound(item, 0, 'hong').passed, false);
  assert.deepEqual(hero(getPracticePlayers(item, 1)).inventory, [0]);
  assert.equal(hero(getPracticePlayers(item, 1)).hp, 3);
  assert.equal(hero(getPracticePlayers(item, 1)).energy, 0);
  assert.equal(resolvePracticeRound(item, 1, 'charge').passed, true);
});

test('practice rejects unknown, unowned and unaffordable choices before combat', () => {
  assert.throws(() => resolvePracticeRound(lesson('charge'), 0, 'not-a-card'));
  assert.throws(() => getPracticePlayers(lesson('charge'), -1));
  assert.throws(() => getPracticePlayers(lesson('charge'), 0.5));
  const preset = lesson('charge');
  const withChoices = (choices: string[]): AcademyLesson => ({ ...preset, rounds: [{ ...preset.rounds[0], choices }] });
  assert.throws(() => resolvePracticeRound(withChoices(['hong']), 0, 'hong'), /energy/);
  assert.throws(() => resolvePracticeRound(withChoices(['pegasus']), 0, 'pegasus'), /Unavailable/);
});

test('two out-of-range attacks are not mislabeled as a successful tie', () => {
  const item = lesson('cost-is-not-power');
  const separated = { ...item, rounds: [{ ...item.rounds[0], enemy: { ...item.rounds[0].enemy, layer: 2 } }] };
  assert.equal(resolvePracticeRound(separated, 0, 'pegasus').passed, false);
});

test('an out-of-range miss is not mislabeled as a successful defense', () => {
  const item = lesson('free-defense');
  const separated = { ...item, rounds: [{ ...item.rounds[0], enemy: { ...item.rounds[0].enemy, layer: 2 } }] };
  assert.equal(resolvePracticeRound(separated, 0, 'defend').passed, false);
});

test('failed choices first explain the actual hit, block, charge, or clash', () => {
  const damaged = resolvePracticeRound(lesson('free-defense'), 0, 'charge');
  assert.ok(damaged.explanation.zh.startsWith('你被命中，损失 1 生命。这次也没有攒到能量。'));
  assert.ok(damaged.explanation.en.startsWith('You were hit and lost 1 HP. Your Charge also gained no energy.'));

  const blocked = resolvePracticeRound(lesson('skill-level'), 0, 'defend');
  assert.ok(blocked.explanation.zh.startsWith('你挡住了攻击，没有掉血，也没有消耗能量。本题要命中对手。'));
  assert.ok(blocked.explanation.en.startsWith('You blocked the attack without losing HP or spending energy. The goal is to land a hit.'));

  const tied = resolvePracticeRound(lesson('attack-tier'), 0, 'hong');
  assert.ok(tied.explanation.zh.startsWith('双方攻击互相抵消：你花 1、对手花 1 能量，都没有掉血。'));
  assert.ok(tied.explanation.en.startsWith('The attacks canceled each other: you spent 1 energy and the opponent spent 1; neither lost HP.'));

  const stopped = resolvePracticeRound(lesson('break-defense'), 0, 'hong2');
  assert.ok(stopped.explanation.zh.startsWith('你的轰轰被防住，花了 2 能量但没有命中。'));

  const bothCharged = resolvePracticeRound(lesson('catch-charge'), 0, 'charge');
  assert.ok(bothCharged.explanation.zh.startsWith('双方都攒到了能量：你 +2、对手 +2，没有造成伤害。本题要命中对手。'));
  const emptyBlock = resolvePracticeRound(lesson('charge'), 0, 'defend');
  assert.ok(emptyBlock.explanation.zh.startsWith('对手攒到了 2 能量；你这次没有挡到攻击，也没有获得能量。'));
  for (const [id, move] of [['free-defense', 'charge'], ['skill-level', 'defend'], ['attack-tier', 'hong'], ['break-defense', 'hong2'], ['catch-charge', 'charge'], ['charge', 'defend']]) {
    const item = lesson(id);
    const result = resolvePracticeRound(item, 0, move);
    assert.equal(result.passed, false);
    assert.ok(result.explanation.zh.endsWith(item.rounds[0].explanation.zh), 'Keep the rule explanation after the outcome');
    assert.ok(result.explanation.en.endsWith(item.rounds[0].explanation.en));
  }
});

test('feedback describes a range miss without calling it an attack tie', () => {
  const item = lesson('cost-is-not-power');
  const separated = { ...item, rounds: [{ ...item.rounds[0], enemy: { ...item.rounds[0].enemy, layer: 2 } }] };
  const miss = resolvePracticeRound(separated, 0, 'pegasus');
  assert.ok(miss.explanation.zh.startsWith('这次没有攻击命中，双方都没有掉血。'));
  assert.ok(miss.explanation.en.startsWith('No attack landed this time; neither player lost HP.'));
  assert.ok(resolvePracticeRound(lesson('evade-range'), 0, 'bigfly').explanation.zh.startsWith('这次没有攻击命中，双方都没有掉血。'));
});

test('lethal protection can preserve half HP while Charge is still interrupted', () => {
  const players = getPracticePlayers(lesson('free-defense'), 0, 'charge');
  const outcome = calculateTurnOutcome(players, 1, 1, 'zh', {
    mode: 'expedition', lethalProtection: { [PRACTICE_HERO_ID]: 0.5 },
  });
  assert.equal(hero(outcome.players).hp, 0.5);
  assert.equal(hero(outcome.players).energy, 1, 'Protection does not turn Charge back into a 2-energy gain');
  assert.equal(outcome.protectionUsed[PRACTICE_HERO_ID], true);
  assert.equal(outcome.defendedHits[PRACTICE_HERO_ID], 0);
});

test('expedition reference uses the current stage count and explains run persistence', () => {
  const expedition = RULE_TOPICS.find(topic => topic.id === 'expedition')!;
  assert.ok(expedition.items.some(item => item.zh.includes(`${EXPEDITION_STAGES.length} 关`) && item.en.includes(`${EXPEDITION_STAGES.length} stages`)));
  assert.ok(expedition.items.some(item => item.zh.includes('不会保存本轮进度') && item.en.includes('does not save the current run')));
  assert.ok(expedition.items.some(item => item.zh.includes('0.5') && item.zh.includes('攒仍会被打断') && item.en.includes('Charge remains interrupted')));
});

test('completion persistence validates IDs, deduplicates and uses a versioned key', () => {
  const values = new Map<string, string>();
  const storage: AcademyStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  assert.deepEqual(readCompletedAcademyLessons(storage), []);
  writeCompletedAcademyLessons(['charge', 'charge', 'unknown', 'comeback'], storage);
  assert.deepEqual(readCompletedAcademyLessons(storage), ['charge', 'comeback']);
  assert.equal(JSON.parse(values.get(ACADEMY_STORAGE_KEY)!).version, 1);
  values.set(ACADEMY_STORAGE_KEY, JSON.stringify({ version: 1, completedLessonIds: [7, null, 'charge', 'removed-lesson', 'charge'] }));
  assert.deepEqual(readCompletedAcademyLessons(storage), ['charge']);
  for (const invalid of ['invalid json', 'null', '[]', '{"version":2,"completedLessonIds":["charge"]}', '{"version":1,"completedLessonIds":{}}']) {
    values.set(ACADEMY_STORAGE_KEY, invalid);
    assert.deepEqual(readCompletedAcademyLessons(storage), []);
  }
});

test('disabled or inaccessible browser storage never blocks practice', () => {
  const unavailable: AcademyStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
  assert.deepEqual(readCompletedAcademyLessons(unavailable), []);
  assert.doesNotThrow(() => writeCompletedAcademyLessons(['charge'], unavailable));
  assert.deepEqual(readCompletedAcademyLessons(null), []);
  assert.doesNotThrow(() => writeCompletedAcademyLessons(['charge'], null));
  assert.doesNotThrow(() => readCompletedAcademyLessons());
});
