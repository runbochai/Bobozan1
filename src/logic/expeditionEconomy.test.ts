import test from 'node:test';
import assert from 'node:assert/strict';
import { drawGachaCard, expeditionSecretPool, EXPEDITION_EQUIPMENTS, EXPEDITION_GACHA_POOL, EXPEDITION_RELICS, EXPEDITION_STAGES } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import { getPlayerCards } from './combat';
import {
  EXPEDITION_START_HP, EXPEDITION_MAX_HP, EXPEDITION_MAX_LEVEL, EXPEDITION_VIGOR_HP,
  EXPEDITION_WARMUP_ENERGY, EXPEDITION_MONEYTREE_CAP, EXPEDITION_SKILLCHARM_USES,
  EXPEDITION_REST_HEAL, EXPEDITION_CHALLENGE_HP, EXPEDITION_CHALLENGE_GOLD,
  genRewardOptions, genShopItems, goldForWin,
} from './expedition';
import type { Player } from '../types';

const seeded = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

test('every encounter starts with affordable counterplay under multiplayer card rules', () => {
  assert.equal(EXPEDITION_STAGES.length, 17);
  for (const stage of EXPEDITION_STAGES) for (const enemy of stage.enemies) {
    assert.ok(enemy.inventory.every(level => level >= 0 && level <= EXPEDITION_MAX_LEVEL), enemy.id);
    assert.ok(enemy.hp <= EXPEDITION_MAX_HP, enemy.id);
    assert.ok(Object.entries(enemy.passive ?? {}).every(([key, value]) => key === 'deceiver' || !value), 'No hidden combat-stat bonus: ' + enemy.id);
    const player: Player = { id: enemy.id, name: enemy.id, isBot: true, hp: enemy.hp, energy: 0,
      inventory: enemy.inventory, layer: 0, tempLayerMod: 0, isDead: false,
      selectedCardId: null, lastCardId: null, lastAction: null };
    const freeMoves = getPlayerCards(player, [player]).filter(card => card.cost === 0);
    assert.ok(freeMoves.some(card => card.id === 'charge'));
    assert.ok(freeMoves.some(card => card.id === 'defend'));
    assert.ok(freeMoves.every(card => card.type === 'CHARGE' || card.type === 'DEFEND'), 'No unavoidable opening attack: ' + enemy.id);
  }
  assert.deepEqual(EXPEDITION_STAGES[3].enemies[0].inventory, [0, 1]);
  assert.equal(EXPEDITION_STAGES[4].enemies.length, 2);
});

test('growth, recovery and both route effects have explicit finite limits', () => {
  assert.equal(EXPEDITION_START_HP, 3);
  assert.equal(EXPEDITION_MAX_HP, 5);
  assert.equal(EXPEDITION_VIGOR_HP, .5);
  assert.equal(EXPEDITION_WARMUP_ENERGY, 1);
  assert.equal(EXPEDITION_MONEYTREE_CAP, 4);
  assert.equal(EXPEDITION_SKILLCHARM_USES, 5);
  assert.equal(EXPEDITION_REST_HEAL, .5);
  assert.equal(EXPEDITION_CHALLENGE_HP, .5);
  assert.equal(EXPEDITION_CHALLENGE_GOLD, 4);
});

test('injured heroes always see healing and unfinished levels always see the next upgrade', () => {
  for (let level = 0; level <= 5; level++) for (const maxHp of [3, 4, 5]) for (const injury of [0, .5, 2]) for (let seed = 0; seed < 40; seed++) {
    const inventory = Array.from({ length: level + 1 }, (_, index) => index);
    const options = genRewardOptions(maxHp - injury, maxHp, [], 3, inventory, 10, seeded(seed));
    assert.equal(options.length, 3);
    assert.equal(options.some(option => option.kind === 'heal'), injury > 0);
    const upgrade = options.find(option => option.kind === 'levelup');
    assert.equal(upgrade?.level, level < 5 ? level + 1 : undefined);
    if (maxHp === 5) assert.ok(options.every(option => option.kind !== 'maxhp'));
    const keys = options.map(option => option.kind === 'temp' ? 'temp:' + option.cardId : option.kind);
    assert.equal(new Set(keys).size, options.length, 'No repeated choices');
  }
});

test('nearby secrets remain unknown, affordable in scope, and useful after reaching level five', () => {
  for (let level = 0; level <= 5; level++) for (const stage of [0, 3, 6, 10, 16]) for (let seed = 0; seed < 100; seed++) {
    const secret = drawGachaCard(level, stage, seeded(seed));
    const card = SKILL_DB.find(candidate => candidate.id === secret.cardId)!;
    assert.ok(EXPEDITION_GACHA_POOL.includes(card.id));
    assert.ok(card.levelRequired > level);
    assert.ok(card.levelRequired <= level + (stage < 6 ? 1 : 2));
    assert.ok(card.levelRequired <= 7);
    assert.ok(!card.tags?.some(tag => ['hit_up', 'hit_down', 'layer_up', 'layer_down'].includes(tag)));
    assert.ok(secret.uses >= 1 && secret.uses <= 3);
  }
  assert.deepEqual(new Set(expeditionSecretPool(5, 10)), new Set(['absorb', 'gun', 'gungod']));
  assert.deepEqual(new Set(expeditionSecretPool(0, 0)), new Set(['pegasus', 'meteor']));
});

test('fully grown builds receive useful unique secrets instead of capped growth or owned relics', () => {
  const allRelics = EXPEDITION_RELICS.map(relic => relic.id);
  const options = genRewardOptions(5, 5, allRelics, 4, [0, 1, 2, 3, 4, 5], 16, seeded(7));
  assert.equal(options.length, 3, 'Only three distinct unknown tools remain; do not invent a useless fourth reward');
  assert.ok(options.every(option => option.kind === 'temp'));
  assert.equal(new Set(options.map(option => option.kind === 'temp' && option.cardId)).size, 3);
});

test('shops do not sell owned gear, max-level badges or economy items that cannot repay before the finale', () => {
  for (let seed = 0; seed < 100; seed++) {
    const shop = genShopItems(['waraxe'], 5, 14, seeded(seed));
    assert.equal(shop.length, 4);
    assert.ok(shop.some(item => item.kind === 'potion'));
    for (const item of shop) {
      if (item.kind === 'equipment') assert.ok(!['waraxe', 'levelbadge', 'moneytree', 'treasurepot'].includes(item.equipment.id));
      if (item.kind === 'tempcard') assert.ok(SKILL_DB.find(card => card.id === item.cardId)!.levelRequired > 5);
    }
  }
  const charm = EXPEDITION_EQUIPMENTS.find(item => item.id === 'skillcharm')!;
  assert.match(charm.desc.zh, /5 次/);
  assert.doesNotMatch(charm.desc.zh, /永久/);
});

test('reward, shop, card and gold randomness is replayable without accessing global Math.random', () => {
  const original = Math.random;
  Math.random = () => { throw new Error('Unseeded economy draw'); };
  try {
    const snapshot = (seed: number) => {
      const rng = seeded(seed);
      return [drawGachaCard(3, 8, rng), genRewardOptions(2, 4, ['ypj'], 4, [0, 1, 2, 3], 8, rng),
        genShopItems(['lifegem'], 3, 8, rng), goldForWin(8, EXPEDITION_STAGES[8], rng)];
    };
    assert.deepEqual(snapshot(41), snapshot(41));
    assert.notDeepEqual(snapshot(41), snapshot(42));
  } finally {
    Math.random = original;
  }
});

test('shop displays exclude spent dolls and Life Gems with no remaining effect', () => {
  const owned = EXPEDITION_EQUIPMENTS.filter(item => !['doll', 'lifegem'].includes(item.id)).map(item => item.id);
  const original = [...owned], full = { hp: 5, maxHp: 5, dollUsed: true };
  for (let seed = 0; seed < 20; seed++) {
    const shop = genShopItems(owned, 5, 12, seeded(seed), full);
    assert.equal(shop.length, 4, 'Sold-out gear slot is replaced by a useful secret');
    assert.ok(shop.every(item => item.kind !== 'equipment'));
    const injured = genShopItems(owned, 5, 12, seeded(seed), { ...full, hp: 4 });
    assert.deepEqual(injured.filter(item => item.kind === 'equipment').map(item => item.equipment.id), ['lifegem']);
    const unusedDoll = genShopItems([...owned, 'lifegem'], 5, 12, seeded(seed), { hp: 5, maxHp: 5, dollUsed: false });
    assert.deepEqual(unusedDoll.filter(item => item.kind === 'equipment').map(item => item.equipment.id), ['doll']);
  }
  assert.deepEqual(owned, original);
  assert.deepEqual(full, { hp: 5, maxHp: 5, dollUsed: true });
});
