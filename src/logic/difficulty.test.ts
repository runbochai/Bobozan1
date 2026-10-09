import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPEDITION_STAGES, EXPEDITION_EQUIPMENTS, EXPEDITION_MONEYTREE_CAP, EXPEDITION_CHALLENGE_GOLD } from '../data/expedition';
import { EXPEDITION_DIFFICULTIES, getExpeditionDifficulty, normalizeExpeditionDifficulty, type ExpeditionDifficulty } from '../data/expeditionDifficulty';
import { goldForWin, POTION_PRICE } from './expedition';
import { buyExpeditionItem, createExpeditionRun, EXPEDITION_HERO_ID, setupExpeditionStage,
  settleExpeditionRound, takeExpeditionReward, takeExpeditionRoute, type ExpeditionRun } from './expeditionRuntime';
import type { Player } from '../types';

const identity = { name: 'Tester', avatar: 'avatars/dragon.webp', lang: 'zh' as const };
const fixed = () => .4;
type Battle = Pick<ReturnType<typeof setupExpeditionStage>, 'run' | 'memory' | 'players'>;
const hero = (battle: Battle) => battle.players.find(player => player.id === EXPEDITION_HERO_ID)!;
const enemies = (battle: Battle) => battle.players.filter(player => player.id !== EXPEDITION_HERO_ID);
const start = (difficulty: ExpeditionDifficulty, patch: Partial<ExpeditionRun> = {}, stage = 0) =>
  setupExpeditionStage({ ...createExpeditionRun(difficulty), ...patch }, stage, identity, fixed);
function play(battle: Battle, own: string, enemyMoves: string | string[], ownPatch: Partial<Player> = {}, enemyPatch: Partial<Player> = {}) {
  let enemyIndex = 0;
  const revealed = battle.players.map(player => player.id === EXPEDITION_HERO_ID
    ? { ...player, ...ownPatch, selectedCardId: own }
    : { ...player, ...enemyPatch, selectedCardId: typeof enemyMoves === 'string' ? enemyMoves : enemyMoves[enemyIndex++] });
  return settleExpeditionRound(battle.run, battle.memory, revealed, 1, 'zh', fixed);
}

test('difficulty configuration retains legacy beginner rules and initializes normal HP and max HP to one', () => {
  for (const value of [undefined, null, '', 'hard', {}, 1]) {
    assert.equal(normalizeExpeditionDifficulty(value), 'beginner');
    assert.equal(getExpeditionDifficulty(value), EXPEDITION_DIFFICULTIES.beginner);
  }
  assert.equal(normalizeExpeditionDifficulty('normal'), 'normal');
  assert.deepEqual(createExpeditionRun(), createExpeditionRun('beginner'));
  for (const difficulty of ['beginner', 'normal'] as const) {
    const run = createExpeditionRun(difficulty), expected = difficulty === 'normal' ? 1 : 3;
    assert.equal(run.difficulty, difficulty);
    assert.equal(run.hp, expected);
    assert.equal(run.maxHp, expected);
    assert.deepEqual(run.inventory, [0]);
    assert.deepEqual(run.skillLoadout, []);
    assert.ok(getExpeditionDifficulty(difficulty).label.zh && getExpeditionDifficulty(difficulty).label.en);
  }
  const legacy = createExpeditionRun();
  delete legacy.difficulty;
  const restored = setupExpeditionStage(legacy, 0, identity, fixed);
  assert.equal(restored.run.difficulty, 'beginner');
  assert.equal(hero(restored).hp, 3);
  assert.equal(enemies(restored)[0].dmgBonus, 0);
  assert.equal(legacy.difficulty, undefined, 'Migration cannot mutate the saved input');
});

test('every normal encounter publishes its enemy bonus before choosing the first move, without boosting the hero', () => {
  const originalStages = structuredClone(EXPEDITION_STAGES);
  for (const difficulty of ['beginner', 'normal'] as const) for (let stage = 0; stage < EXPEDITION_STAGES.length; stage++) {
    const battle = start(difficulty, {}, stage);
    const baseline = start('beginner', { crownCleared: battle.run.crownCleared }, stage);
    assert.equal(hero(battle).dmgBonus, 0);
    assert.equal(hero(battle).hp, difficulty === 'normal' ? 1 : 3);
    for (const [index, enemy] of enemies(battle).entries()) {
      assert.equal(enemy.dmgBonus, difficulty === 'normal' ? .5 : 0);
      assert.equal(enemy.energy, enemies(baseline)[index].energy, 'Difficulty adds no extra opener beyond the visible tower supply');
      assert.equal(enemy.hp, enemies(baseline)[index].hp, 'Difficulty does not alter tower HP');
      assert.equal(enemy.pierce, false);
    }
    const armed = start(difficulty, { equipment: ['waraxe'] }, stage);
    assert.equal(hero(armed).dmgBonus, .5, 'The hero keeps only the existing War Axe bonus');
  }
  assert.deepEqual(EXPEDITION_STAGES, originalStages);
});

test('normal first-hit settlement deals 1.5 instead of 1 even for an unprepared snapshot, while hero damage is unchanged', () => {
  for (const difficulty of ['beginner', 'normal'] as const) {
    const battle = start(difficulty, { hp: 5, maxHp: 5 });
    const snapshot = structuredClone(battle);
    const hit = play(battle, 'charge', 'hong', {}, { hp: 5, energy: 4, dmgBonus: 0 });
    const expected = difficulty === 'normal' ? 1.5 : 1;
    assert.equal(hit.damageTaken[EXPEDITION_HERO_ID], expected);
    assert.equal(hero(hit).hp, 5 - expected);
    assert.equal(hero(hit).energy, 0, 'An actual hit still interrupts Charge');
    const outgoing = play(battle, 'hong', 'charge', { energy: 1, dmgBonus: 99 }, { hp: 5 });
    assert.equal(outgoing.damageTaken[enemies(battle)[0].id], 1, 'Do not apply difficulty or stale bonus to the hero');
    assert.deepEqual(battle, snapshot);
  }
});

test('normal bonus is recalculated rather than stacked across blocked rounds and stale snapshots', () => {
  let battle: Battle = start('normal', { hp: 5, maxHp: 5 });
  battle.players = battle.players.map(player => ({ ...player, energy: 20, hp: 5 }));
  for (let turn = 0; turn < 5; turn++) {
    const blocked = play(battle, 'defend', 'hong', {}, { dmgBonus: 40 });
    assert.equal(blocked.damageTaken[EXPEDITION_HERO_ID], 0);
    assert.equal(enemies(blocked)[0].dmgBonus, .5);
    assert.equal(hero(blocked).dmgBonus, 0);
    battle = blocked;
  }
  const hit = play(battle, 'charge', 'hong');
  assert.equal(hit.damageTaken[EXPEDITION_HERO_ID], 1.5);
  assert.equal(hero(hit).hp, 3.5);
  const nextStage = setupExpeditionStage(hit.run, 1, identity, fixed);
  assert.equal(enemies(nextStage)[0].dmgBonus, .5);
});

test('Charge, Defense, attack ties and out-of-range misses cannot invent half a point of damage', () => {
  const battle = start('normal', { inventory: [0, 2], skillLoadout: ['smallfly'], hp: 3, maxHp: 3 });
  for (const [own, other] of [['charge', 'charge'], ['charge', 'defend'], ['defend', 'hong'], ['hong2', 'hong2'], ['smallfly', 'hong']]) {
    const result = play(battle, own, other, { energy: 10 }, { energy: 10, hp: 3 });
    assert.equal(result.damageTaken[EXPEDITION_HERO_ID], 0, `${own} vs ${other}`);
    assert.equal(result.damageTaken[enemies(battle)[0].id], 0, `${other} vs ${own}`);
    assert.equal(result.gold, 0);
  }
});

test('NPCs hit one another with the same difficulty bonus and partial hits gain it only once', () => {
  const stage = EXPEDITION_STAGES.findIndex(item => item.id === 's4');
  const battle = start('normal', { hp: 3, maxHp: 3 }, stage);
  const result = play(battle, 'defend', ['hong', 'charge'], {}, { hp: 3, energy: 5 });
  assert.equal(result.damageTaken[EXPEDITION_HERO_ID], 0);
  assert.equal(result.damageTaken[enemies(battle)[0].id], 0);
  assert.equal(result.damageTaken[enemies(battle)[1].id], 1.5);
  for (const difficulty of ['beginner', 'normal'] as const) {
    const duel = start(difficulty, { hp: 3, maxHp: 3 });
    const puncture = play(duel, 'defend', 'gun', {}, { energy: 1, inventory: [0, 7] });
    assert.equal(puncture.damageTaken[EXPEDITION_HERO_ID], difficulty === 'normal' ? 1 : .5);
  }
});

test('normal bonus is included before armor and lethal protection, preserving their established ordering', () => {
  const armored = play(start('normal', { relics: ['ypj'] }), 'charge', 'hong', {}, { energy: 1 });
  assert.equal(armored.damageBlocked[EXPEDITION_HERO_ID], .5);
  assert.equal(armored.lost, true, '1.5 minus .5 armor still consumes the initial 1 HP');
  const saved = play(start('normal', { relics: ['ypj', 'tbs'] }), 'charge', 'hong', {}, { energy: 1 });
  assert.equal(saved.damageBlocked[EXPEDITION_HERO_ID], .5);
  assert.equal(saved.protectionUsed[EXPEDITION_HERO_ID], true);
  assert.equal(saved.run.ironShirtUsed, true);
  assert.equal(saved.lost, false);
  assert.equal(hero(saved).hp, .5);
  assert.equal(hero(saved).energy, 0, 'Protection does not turn the hit into a successful Charge');
  assert.equal(saved.logs.some(log => log.type === 'death'), false);
  assert.equal(enemies(saved)[0].kills, 0);
});

test('existing enemy passives, enrage and hero gear remain additive source rules without accumulating difficulty', () => {
  const battle = start('normal', { hp: 5, maxHp: 5, equipment: ['waraxe'] });
  const enemyId = enemies(battle)[0].id;
  battle.memory.maxHp[enemyId] = 4;
  battle.memory.passives[enemyId] = { attackBonus: .25, enrageDmg: .5 };
  const enraged = play(battle, 'charge', 'hong', {}, { hp: 2, energy: 10, dmgBonus: 99 });
  assert.equal(enraged.damageTaken[EXPEDITION_HERO_ID], 2.25, 'Base 1 + passive .25 + enrage .5 + normal .5');
  assert.equal(enemies(enraged)[0].dmgBonus, 1.25);
  assert.equal(hero(enraged).dmgBonus, .5);
  const blocked = play(enraged, 'defend', 'hong');
  assert.equal(enemies(blocked)[0].dmgBonus, 1.25);
  assert.equal(blocked.damageTaken[EXPEDITION_HERO_ID], 0);
});

test('normal doubles the entire victory payout including challenge and Treasure Pot, but not Money Tree income', () => {
  const stage = EXPEDITION_STAGES.findIndex(item => item.id === 's3');
  const base = goldForWin(stage, EXPEDITION_STAGES[stage], fixed);
  for (const difficulty of ['beginner', 'normal'] as const) {
    const battle = start(difficulty, { gold: 100, equipment: ['treasurepot', 'moneytree'], route: 'risk' }, stage);
    assert.equal(battle.run.gold, 100 + EXPEDITION_MONEYTREE_CAP);
    const result = play(battle, 'ka', 'defend', { energy: 3 }, { hp: 1 });
    assert.equal(result.won, true);
    const expected = (base + 4 + EXPEDITION_CHALLENGE_GOLD) * (difficulty === 'normal' ? 2 : 1);
    assert.equal(result.gold, expected);
    assert.equal(result.run.gold, 100 + EXPEDITION_MONEYTREE_CAP + expected);
    assert.ok(result.logs.some(log => log.text.includes(`金币 +${expected}`)));
    assert.equal(battle.run.gold, 104);
    const again = play(battle, 'ka', 'defend', { energy: 3 }, { hp: 1 });
    assert.equal(again.run.gold, result.run.gold, 'Replaying the same snapshot does not multiply an earlier payout');
  }
});

test('elite and boss victory bonuses are multiplied too, while defeat pays no gold', () => {
  for (const stage of EXPEDITION_STAGES.map((_, index) => index).filter(index =>
    EXPEDITION_STAGES[index].enemies.some(enemy => enemy.elite || enemy.boss))) {
    const battle = start('normal', {}, stage);
    const result = play(battle, 'kajisuper', 'defend', { energy: 10 }, { hp: 1 });
    assert.equal(result.won, true);
    assert.equal(result.gold, goldForWin(stage, EXPEDITION_STAGES[stage], fixed) * 2);
  }
  const doomed = start('normal', { gold: 11 });
  const lost = play(doomed, 'charge', 'hong', {}, { energy: 1 });
  assert.equal(lost.lost, true);
  assert.equal(lost.gold, 0);
  assert.equal(lost.run.gold, 11);
});

test('normal growth persists between stages and keeps original shop prices, route healing and HP caps', () => {
  let run = createExpeditionRun('normal');
  run = takeExpeditionReward(run, { kind: 'maxhp' });
  assert.equal(run.hp, 1.5);
  assert.equal(run.maxHp, 1.5);
  const potion = buyExpeditionItem({ ...run, hp: .5, gold: 100 }, { kind: 'potion', price: POTION_PRICE }, fixed);
  assert.equal(potion.gold, 100 - POTION_PRICE);
  assert.equal(potion.hp, 1.5);
  assert.equal(potion.difficulty, 'normal');
  const gem = EXPEDITION_EQUIPMENTS.find(item => item.id === 'lifegem')!;
  const geared = buyExpeditionItem(potion, { kind: 'equipment', equipment: gem }, fixed);
  assert.equal(geared.gold, potion.gold - gem.price);
  assert.equal(geared.maxHp, 2.5);
  const rested = takeExpeditionRoute({ ...geared, stageIdx: 3, hp: 1.5 }, 'rest');
  assert.equal(rested.hp, 2);
  assert.equal(rested.difficulty, 'normal');
  const next = setupExpeditionStage(rested, 4, identity, fixed);
  assert.equal(hero(next).hp, 2, 'Only a new run starts at 1 HP');
  assert.equal(next.memory.maxHp[EXPEDITION_HERO_ID], 2.5);
  let capped = next.run;
  for (let i = 0; i < 10; i++) capped = takeExpeditionReward(capped, { kind: 'maxhp' });
  assert.equal(capped.maxHp, 5);
});
