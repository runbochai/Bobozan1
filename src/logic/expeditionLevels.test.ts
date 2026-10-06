import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPEDITION_EQUIPMENTS, EXPEDITION_MAX_LEVEL, EXPEDITION_SKILL_LEVELS, EXPEDITION_STAGES,
  LEVEL_REWARD_INFO, drawGachaCard, expeditionSecretPool } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import { calculateTurnOutcome, getPlayerCards } from './combat';
import { expeditionLevel, genRewardOptions, genShopItems, nextExpeditionLevel } from './expedition';
import { buyExpeditionItem, createExpeditionRun, EXPEDITION_HERO_ID, resolveExpeditionEnemyLoadout,
  setupExpeditionStage, takeExpeditionReward } from './expeditionRuntime';
import { autoSelectSkillLoadout, getSkillOverflow } from './skillLoadout';

const identity = { name: 'Tester', avatar: 'avatars/dragon.webp', lang: 'zh' as const };
const fixed = () => .4;
const badge = EXPEDITION_EQUIPMENTS.find(item => item.id === 'levelbadge')!;
const veteranStage = () => EXPEDITION_STAGES.findIndex(stage => stage.enemies.some(enemy => enemy.levelAdvantage));
const knownLevels = (level: number) => [0, ...EXPEDITION_SKILL_LEVELS.filter(value => value <= level)];

test('every ordinary catalog level is unlockable with actual skills, including after level five', () => {
  assert.equal(EXPEDITION_MAX_LEVEL, 23);
  let run = createExpeditionRun();
  for (const level of EXPEDITION_SKILL_LEVELS) {
    const before = structuredClone(run);
    assert.equal(nextExpeditionLevel(run.inventory), level);
    const offered = genRewardOptions(3, 3, [], 3, run.inventory, 10, fixed);
    assert.ok(offered.some(option => option.kind === 'levelup' && option.level === level));
    const upgraded = takeExpeditionReward(run, { kind: 'levelup', level });
    assert.equal(expeditionLevel(upgraded.inventory), level);
    const expected = SKILL_DB.filter(card => card.levelRequired === level);
    assert.ok(expected.length > 0, 'Never award an empty level');
    for (const card of expected) {
      assert.ok(upgraded.skillLoadout?.includes(card.id), `Missing ${card.id} at level ${level}`);
      assert.ok(LEVEL_REWARD_INFO[level].zh.includes(card.name.zh));
      assert.ok(LEVEL_REWARD_INFO[level].en.includes(card.name.en));
    }
    assert.deepEqual(run, before, 'Reward generation and claiming cannot mutate the prior run');
    run = autoSelectSkillLoadout(upgraded);
    assert.deepEqual(getSkillOverflow(run), []);
    assert.deepEqual(takeExpeditionReward(run, { kind: 'levelup', level }).skillLoadout, run.skillLoadout, 'Stale reward cannot restore rejected skills');
  }
  assert.equal(nextExpeditionLevel(run.inventory), null);
  assert.deepEqual(takeExpeditionReward(run, { kind: 'levelup', level: 24 }), run);
  assert.deepEqual(takeExpeditionReward(run, { kind: 'levelup', level: 100 }), run);
  assert.ok(genRewardOptions(5, 5, [], 3, run.inventory, 17, fixed).every(option => option.kind !== 'levelup'));
});

test('an upgrade badge keeps working past five, but never spends gold for an empty or duplicate level', () => {
  const onlyBadgeUnowned = EXPEDITION_EQUIPMENTS.filter(item => item.id !== 'levelbadge').map(item => item.id);
  for (const current of [5, 6, 11, 18, 22]) {
    const before = { ...createExpeditionRun(), inventory: knownLevels(current), gold: 100, skillLoadout: [] };
    const after = buyExpeditionItem(before, { kind: 'equipment', equipment: badge }, fixed);
    assert.equal(expeditionLevel(after.inventory), current + 1);
    assert.equal(after.gold, 100 - badge.price);
    assert.ok(after.skillLoadout!.length > 0);
    assert.equal(buyExpeditionItem(after, { kind: 'equipment', equipment: badge }, fixed).gold, after.gold);
    assert.ok(genShopItems(onlyBadgeUnowned, current, 5, fixed).some(item => item.kind === 'equipment' && item.equipment.id === 'levelbadge'));
    assert.equal(before.gold, 100);
    assert.deepEqual(before.skillLoadout, []);
  }
  const complete = { ...createExpeditionRun(), inventory: knownLevels(23), gold: 100 };
  assert.deepEqual(buyExpeditionItem(complete, { kind: 'equipment', equipment: badge }, fixed), complete);
  assert.ok(genShopItems(onlyBadgeUnowned, 23, 17, fixed).every(item => item.kind !== 'equipment'));
});

test('secret draws and secret gear return real nearby cards at every level including layer-only gaps and the catalog end', () => {
  for (let level = 0; level <= EXPEDITION_MAX_LEVEL; level++) for (const stage of [0, 6, 17]) {
    const pool = expeditionSecretPool(level, stage);
    assert.ok(pool.length > 0, `Empty pool at level ${level}, stage ${stage}`);
    assert.equal(new Set(pool).size, pool.length);
    for (const random of [() => 0, () => .5, () => 1]) {
      const draw = drawGachaCard(level, stage, random), skill = SKILL_DB.find(card => card.id === draw.cardId)!;
      assert.ok(skill && skill.levelRequired > 0 && skill.levelRequired <= 23);
      assert.ok(Math.abs(skill.levelRequired - level) <= 2);
      assert.ok(!skill.tags?.some(tag => ['combo', 'hit_up', 'hit_down'].includes(tag)));
      assert.ok(draw.uses >= 1 && draw.uses <= 3);
    }
    const run = { ...createExpeditionRun(), inventory: knownLevels(level), equipment: ['luckydice'], gold: 100 };
    const battle = setupExpeditionStage(run, 0, identity, fixed);
    assert.ok(SKILL_DB.some(card => card.id === battle.run.tempCards[0].cardId));
    const charm = buyExpeditionItem(battle.run, { kind: 'equipment', equipment: EXPEDITION_EQUIPMENTS.find(item => item.id === 'skillcharm')! }, fixed);
    assert.equal(charm.tempCards.reduce((sum, card) => sum + card.usesLeft, 0), 6);
  }
});

test('the new encounter uses a genuinely stronger ordinary attack for every normally reachable level', () => {
  const stageIndex = veteranStage(), stage = EXPEDITION_STAGES[stageIndex];
  assert.equal(stageIndex, 4, 'Four prior rewards and one badge bound normal arrival to level five');
  const before = structuredClone(stage);
  for (let level = 0; level <= 5; level++) {
    const run = { ...createExpeditionRun(), inventory: knownLevels(level) };
    const battle = setupExpeditionStage(run, stageIndex, identity, fixed);
    const enemy = battle.players.find(player => player.id !== EXPEDITION_HERO_ID)!;
    const extra = getPlayerCards(enemy, battle.players).filter(card => card.levelRequired > 0);
    assert.equal(extra.length, 1, 'Do not secretly grant that level’s Ultimate or defense');
    assert.equal(extra[0].type, 'ATTACK');
    assert.ok(extra[0].levelRequired > level);
    assert.equal(expeditionLevel(enemy.inventory), extra[0].levelRequired);
    assert.equal(enemy.energy, 0);
    assert.equal(enemy.avatar, 'avatars/enemies/knight.webp');
    assert.equal(enemy.dmgBonus ?? 0, 0);
    assert.equal(enemy.pierce ?? false, false);
    const legalOpeners = getPlayerCards(enemy, battle.players).filter(card => card.cost === 0);
    assert.ok(legalOpeners.every(card => card.type === 'CHARGE' || card.type === 'DEFEND'));
    if (level === 5) assert.equal(extra[0].id, 'helmetatk', 'Skip absorb and the partially piercing gun');
  }
  assert.deepEqual(stage, before);
});

test('higher-level encounter attacks win ordinary clashes while free defense and basic two-cost ties remain valid', () => {
  const stageIndex = veteranStage();
  for (let level = 0; level < 23; level++) {
    const battle = setupExpeditionStage({ ...createExpeditionRun(), inventory: knownLevels(level) }, stageIndex, identity, fixed);
    const originalHero = battle.players.find(player => player.id === EXPEDITION_HERO_ID)!;
    const originalEnemy = battle.players.find(player => player.id !== EXPEDITION_HERO_ID)!;
    const attack = getPlayerCards(originalEnemy, battle.players).find(card => card.levelRequired > 0)!;
    assert.ok(attack.levelRequired > level);
    const hero = { ...originalHero, energy: 10, hp: 3 };
    const enemy = { ...originalEnemy, energy: 10, hp: 3, selectedCardId: attack.id };
    for (const response of ['defend', 'hong2', 'liuke']) {
      const outcome = calculateTurnOutcome([{ ...hero, selectedCardId: response }, enemy], 1, 1, 'zh', { mode: 'expedition' });
      assert.equal(outcome.damageTaken[hero.id], 0, `${response} against ${attack.id}`);
      assert.equal(outcome.damageTaken[enemy.id], 0);
    }
    const weaker = [...SKILL_DB].reverse().find(card => card.type === 'ATTACK' && card.tier === 2
      && card.levelRequired > 0 && card.levelRequired <= level && !card.tags?.length);
    if (weaker) {
      const outcome = calculateTurnOutcome([{ ...hero, skillLoadout: [weaker.id], selectedCardId: weaker.id }, enemy], 1, 1, 'zh', { mode: 'expedition' });
      assert.equal(outcome.damageTaken[hero.id], 1, `${attack.id} must overpower ${weaker.id}`);
      assert.equal(outcome.damageTaken[enemy.id], 0);
    }
  }
});

test('maximum-level artificial runs get a real catalog card and an honest fallback, without fake combat levels', () => {
  const stageIndex = veteranStage(), enemy = EXPEDITION_STAGES[stageIndex].enemies[0];
  const resolved = resolveExpeditionEnemyLoadout(enemy, [0, 23]);
  assert.deepEqual(resolved, { inventory: [0, 23], skillLoadout: ['poison'] });
  const battle = setupExpeditionStage({ ...createExpeditionRun(), inventory: knownLevels(23) }, stageIndex, identity, fixed);
  assert.ok(battle.logs.some(log => log.text.includes('不再高于')));
  assert.equal(expeditionLevel([0, 5, 100, NaN, -1]), 5, 'Combination sentinels and malformed values cannot create fake levels');
  assert.equal(nextExpeditionLevel([0, 5, 100]), 6);
});
