import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPEDITION_EQUIPMENTS, EXPEDITION_RELICS, EXPEDITION_STAGES } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import type { Player } from '../types';
import { getPlayerCards } from './combat';
import { getEndlessEnemyLoadout, getExpeditionStage } from './endlessExpedition';
import { genShopItems } from './expedition';
import { buyExpeditionItem, createExpeditionRun, EXPEDITION_HERO_ID, genExpeditionRewards,
  reviveEndlessExpedition, setupExpeditionStage, settleExpeditionRound, takeExpeditionReward,
  takeExpeditionRoute, type ExpeditionRun } from './expeditionRuntime';
import { autoSelectSkillLoadout, getSkillOverflow } from './skillLoadout';

const identity = { name: 'Tester', avatar: 'avatars/dragon.webp', lang: 'zh' as const };
const rng = () => .25;
const start = (patch: Partial<ExpeditionRun> = {}, floor = 0) =>
  setupExpeditionStage({ ...createExpeditionRun('endless'), ...patch }, floor, identity, rng);
type Battle = Pick<ReturnType<typeof start>, 'run' | 'memory' | 'players'>;
function play(battle: Battle, own: string, other: string, heroPatch: Partial<Player> = {}, enemyPatch: Partial<Player> = {}) {
  return settleExpeditionRound(battle.run, battle.memory, battle.players.map(player => ({ ...player,
    ...(player.id === EXPEDITION_HERO_ID ? heroPatch : enemyPatch), selectedCardId: player.id === EXPEDITION_HERO_ID ? own : other,
  })), 1, 'zh', rng);
}
const hero = (battle: Battle) => battle.players.find(player => player.id === EXPEDITION_HERO_ID)!;
const gear = (id: string) => ({ kind: 'equipment' as const, equipment: EXPEDITION_EQUIPMENTS.find(item => item.id === id)! });

test('endless resolves any valid battle number through combat encounters, while finite stages remain identical', () => {
  EXPEDITION_STAGES.forEach((stage, i) => {
    assert.equal(getExpeditionStage(i), stage);
    assert.equal(getExpeditionStage(i, 'normal'), stage);
  });
  assert.equal(getExpeditionStage(18), undefined);
  assert.equal(getExpeditionStage(0, 'endless')!.id, EXPEDITION_STAGES[3].id);
  assert.equal(getExpeditionStage(15, 'endless')!.id, getExpeditionStage(0, 'endless')!.id);
  for (const floor of [0, 17, 18, 99, 1_000_000]) {
    const stage = getExpeditionStage(floor, 'endless')!;
    assert.ok(stage.enemies.length > 0);
    assert.match(stage.name.zh, new RegExp(`无尽第 ${floor + 1} 战`));
    assert.ok(!['s0', 's1', 's2'].includes(stage.id));
  }
  for (const invalid of [-1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(getExpeditionStage(invalid, 'endless'), undefined);
});

test('endless starts at one HP and zero Energy, and every NPC retains a genuine higher-level attack within three slots', () => {
  const first = start();
  assert.equal(first.run.hp, 1);
  assert.equal(first.run.maxHp, 1);
  assert.equal(hero(first).endlessLevel, 0);
  for (const level of [1, 6, 7, 20, 21, 22, 23, 24, 150]) for (const floor of [0, 2, 14, 29]) {
    const battle = start({ endlessLevel: level - 1, endlessEnemyLevel: level }, floor);
    for (const enemy of battle.players.filter(player => player.isBot)) {
      assert.equal(enemy.endlessLevel, level);
      assert.equal(enemy.energy, 0);
      assert.equal(enemy.dmgBonus, 0);
      assert.deepEqual(getSkillOverflow(enemy), []);
      const ordinary = getPlayerCards(enemy, battle.players).filter(card => card.type === 'ATTACK' && card.tier === 2
        && card.levelRequired > 0 && !card.tags?.some(tag => ['combo', 'pierce_basic', 'break_basic', 'break_mid_def', 'hit_up', 'hit_down'].includes(tag)));
      assert.ok(ordinary.length > 0, `Lv.${level} floor ${floor} has a same-layer regular attack`);
      assert.ok(enemy.inventory.every(unlock => unlock <= 23));
    }
  }
  assert.deepEqual(createExpeditionRun('normal').inventory, [0]);
  assert.equal(createExpeditionRun('normal').endlessLevel, undefined);
});

test('a real victory grants one rank and real skill unlocks, synchronized into the returned player', () => {
  const battle = start();
  const won = play(battle, 'ka', 'defend', { energy: 3 }, { hp: .5 });
  assert.equal(won.won, true);
  assert.equal(won.run.endlessLevel, 1);
  assert.equal(won.run.endlessEnemyLevel, 2);
  assert.ok(won.run.inventory.includes(1));
  assert.ok(won.run.skillLoadout?.includes('pegasus'));
  assert.deepEqual(hero(won).skillLoadout, won.run.skillLoadout);
  assert.deepEqual(hero(won).inventory, won.run.inventory);
  assert.equal(hero(won).endlessLevel, 1);
  const duplicate = play(won, 'defend', 'defend');
  assert.equal(duplicate.won, true);
  assert.equal(duplicate.gold, 0);
  assert.equal(duplicate.run.gold, won.run.gold);
  assert.equal(duplicate.run.endlessLevel, 1);
  const next = setupExpeditionStage(won.run, 1, identity, rng);
  assert.equal(next.players[1].endlessLevel, 2);
});

test('newly unlocked skills still require the human three-slot choice, including before the reward screen', () => {
  const retained = getEndlessEnemyLoadout(3);
  const battle = start({ ...retained, endlessLevel: 3, endlessEnemyLevel: 4 });
  const won = play(battle, 'ka', 'defend', { energy: 3 }, { hp: .5 });
  assert.equal(won.run.endlessLevel, 4);
  assert.deepEqual(getSkillOverflow(won.run).map(group => group.category), ['ATTACK', 'ULTIMATE']);
  assert.deepEqual(getSkillOverflow(hero(won)), getSkillOverflow(won.run));
  assert.ok(hero(won).skillLoadout?.includes('hotmilk'));
});

test('winning above the last authored unlock keeps increasing real rank without creating fictitious skills', () => {
  const loadout = getEndlessEnemyLoadout(23);
  const battle = start({ ...loadout, endlessLevel: 23, endlessEnemyLevel: 27 }, 45);
  const won = play(battle, 'ka', 'defend', { energy: 3 }, { hp: .5 });
  assert.equal(won.run.endlessLevel, 24);
  assert.equal(hero(won).endlessLevel, 24);
  assert.equal(won.run.endlessEnemyLevel, 27, 'Earlier defeats retain their level pressure');
  assert.deepEqual(won.run.inventory, loadout.inventory);
  assert.deepEqual(won.run.skillLoadout, loadout.skillLoadout);
  assert.ok(won.run.skillLoadout?.every(id => SKILL_DB.some(card => card.id === id)));
});

test('death and revival preserve settled growth, money, items and spent safeguards; one defeat raises enemies once', () => {
  const battle = start({ ...getEndlessEnemyLoadout(3), endlessLevel: 3, endlessEnemyLevel: 5,
    gold: 42, maxHp: 2, hp: .5, equipment: ['waraxe'], relics: ['tbs'], ironShirtUsed: true, dollUsed: true,
    tempCards: [{ cardId: 'gun', usesLeft: 2 }] });
  const lost = play(battle, 'gun', 'ji', { energy: 1 }, { energy: 4, hp: 3 });
  assert.equal(lost.lost, true);
  assert.equal(lost.run.hp, 0);
  assert.equal(lost.run.tempCards[0].usesLeft, 1);
  const before = structuredClone(lost.run);
  const revived = reviveEndlessExpedition(lost.run);
  assert.equal(revived.hp, 2);
  assert.equal(revived.endlessLevel, 3);
  assert.equal(revived.endlessEnemyLevel, 6);
  assert.equal(revived.endlessDefeats, 1);
  for (const field of ['inventory', 'skillLoadout', 'gold', 'equipment', 'relics', 'tempCards', 'ironShirtUsed', 'dollUsed'] as const) {
    assert.deepEqual(revived[field], lost.run[field]);
  }
  assert.deepEqual(reviveEndlessExpedition(revived), revived, 'A double click cannot grant a second revival or enemy level');
  assert.deepEqual(lost.run, before);
  const retry = setupExpeditionStage(revived, 0, identity, rng);
  assert.equal(retry.players[1].endlessLevel, 6);
  assert.equal(hero(retry).hp, 2);
  const again = reviveEndlessExpedition({ ...retry.run, hp: 0 });
  assert.equal(again.endlessEnemyLevel, 7);
  assert.equal(again.endlessDefeats, 2);
  const finite = { ...createExpeditionRun(), hp: 0 };
  assert.deepEqual(reviveEndlessExpedition(finite), finite);
});

test('retries cannot farm dice, money-tree income, consumed protections or rest healing', () => {
  const first = start({ gold: 100, equipment: ['moneytree', 'luckydice'], ironShirtUsed: true, dollUsed: true });
  assert.equal(first.run.gold, 104);
  assert.equal(first.run.tempCards.reduce((sum, card) => sum + card.usesLeft, 0), 1);
  const spent = { ...first.run, hp: 0, tempCards: [] };
  let repeated = reviveEndlessExpedition(spent);
  for (let attempt = 0; attempt < 4; attempt++) repeated = setupExpeditionStage(repeated, 0, identity, rng).run;
  assert.equal(repeated.gold, 104);
  assert.deepEqual(repeated.tempCards, []);
  assert.equal(repeated.ironShirtUsed, true);
  assert.equal(repeated.dollUsed, true);
  assert.equal(takeExpeditionRoute({ ...repeated, hp: .5 }, 'rest').hp, .5, 'Rest requires a new clear, not a retry');
  const next = setupExpeditionStage(repeated, 1, identity, rng);
  assert.equal(next.run.gold, 108);
  assert.equal(next.run.tempCards.reduce((sum, card) => sum + card.usesLeft, 0), 1);
  const cleared = { ...next.run, endlessClearedStageIdx: 1, hp: .25 };
  const rest = takeExpeditionRoute(cleared, 'rest');
  assert.equal(rest.hp, .75);
  assert.deepEqual(takeExpeditionRoute(rest, 'rest'), rest);
});

test('endless rewards remain useful without a second level-up, and endless shops have no false final-floor cutoff', () => {
  const run = start({ gold: 100, hp: .5 }).run;
  for (let seed = 0; seed < 20; seed++) {
    const rewards = genExpeditionRewards(run, () => seed / 20);
    assert.equal(rewards.length, 3);
    assert.ok(rewards.some(reward => reward.kind === 'heal'));
    assert.ok(rewards.every(reward => reward.kind !== 'levelup'));
  }
  assert.deepEqual(takeExpeditionReward(run, { kind: 'levelup', level: 1 }), run);
  assert.deepEqual(buyExpeditionItem(run, gear('levelbadge'), rng), run);
  for (const onlyAvailable of ['moneytree', 'treasurepot']) {
    const owned = EXPEDITION_EQUIPMENTS.filter(item => ![onlyAvailable, 'levelbadge'].includes(item.id)).map(item => item.id);
    const shop = genShopItems(owned, 1, 1000, rng, run);
    assert.ok(shop.some(item => item.kind === 'equipment' && item.equipment.id === onlyAvailable));
    assert.ok(!shop.some(item => item.kind === 'equipment' && item.equipment.id === 'levelbadge'));
  }
  const saturated = { ...run, ...autoSelectSkillLoadout({ inventory: Array.from({ length: 24 }, (_, i) => i) }),
    hp: 5, maxHp: 5, relics: EXPEDITION_RELICS.map(relic => relic.id), endlessLevel: 200 };
  const late = genExpeditionRewards(saturated, rng);
  assert.equal(late.length, 4);
  assert.ok(late.every(reward => reward.kind === 'temp'));
});

test('saturated endless rewards always fill three choices or four with the map, preferring distinct cards before copies', () => {
  for (let level = 0; level <= 25; level++) for (const withMap of [false, true]) for (const injured of [false, true]) {
    const run: ExpeditionRun = { ...createExpeditionRun('endless'), endlessLevel: level,
      inventory: Array.from({ length: Math.min(level, 23) + 1 }, (_, i) => i),
      stageIdx: Math.max(0, level - 1), hp: injured ? 4 : 5, maxHp: 5,
      relics: EXPEDITION_RELICS.filter(relic => withMap || relic.id !== 'cbt').map(relic => relic.id) };
    // Constant and boundary rolls are valid seeded sources, not just an average sample.
    for (const roll of [0, .25, .999999]) {
      const options = genExpeditionRewards(run, () => roll);
      assert.equal(options.length, withMap ? 4 : 3, `Lv.${level}, map:${withMap}, injured:${injured}`);
      assert.equal(options.some(option => option.kind === 'heal'), injured);
      assert.ok(options.every(option => option.kind !== 'levelup' && option.kind !== 'maxhp'));
      for (const reward of options) if (reward.kind === 'temp') {
        assert.ok(SKILL_DB.some(card => card.id === reward.cardId));
        assert.ok(reward.uses >= 1 && reward.uses <= 3);
        const selected = takeExpeditionReward(run, reward);
        assert.equal(selected.tempCards.find(card => card.cardId === reward.cardId)?.usesLeft, reward.uses);
      }
      const secretIds = options.flatMap(option => option.kind === 'temp' ? [option.cardId] : []);
      if (level === 23) assert.equal(new Set(secretIds).size, Math.min(2, secretIds.length), 'Both available endgame secrets precede repeated copies');
    }
  }
});
