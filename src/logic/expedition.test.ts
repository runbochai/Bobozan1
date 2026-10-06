import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { EXPEDITION_RELICS, EXPEDITION_STAGES } from '../data/expedition';
import {
  applyIronhide,
  expeditionBotMove,
  genRewardOptions,
  genShopItems,
  goldForWin,
  pickThreat,
  shopCardPrice,
  intentRevealed,
  EXPEDITION_MAX_LEVEL,
} from './expedition';
import { EXPEDITION_GACHA_POOL, EXPEDITION_EQUIPMENTS, drawGachaCard } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import { expeditionMoveWeights } from './expeditionAI';

const enemy = (patch: Partial<Player> = {}): Player => ({
  id: 'e1', name: 'enemy', isBot: true, hp: 2, energy: 0, isDead: false,
  inventory: [0], layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
});
const me = (patch: Partial<Player> = {}): Player => enemy({ id: 'me', isBot: false, ...patch });

test('没能量时 AI 只能出免费牌（攒/防）', () => {
  const e = enemy({ energy: 0 });
  for (let i = 0; i < 50; i++) {
    const move = expeditionBotMove(e, [me(), e], { aggression: 1, defense: 0, charge: 0.5, smart: 0 }, 'me');
    assert.ok(move === 'charge' || move === 'defend', `unexpected move: ${move}`);
  }
});

test('高能量激进 AI 倾向于进攻而非攒气', () => {
  const e = enemy({ energy: 6 });
  const players = [me(), e];
  const p = { aggression: 1, defense: 0.05, charge: 0.05, smart: 0 };
  let aggro = 0;
  for (let i = 0; i < 200; i++) {
    const move = expeditionBotMove(e, players, p, 'me');
    if (move !== 'charge') aggro++;
  }
  assert.ok(aggro > 150, `aggression too low: ${aggro}/200`);
});

test('保守 AI 会应对公开攻击威胁，但面对终极仍保留变招', () => {
  const e = enemy({ energy: 2 });
  const players = [me({ energy: 5 }), e];
  const p = { aggression: 0.2, defense: 0.5, charge: 0.3, smart: 1 };
  const defend = (list: Player[]) => expeditionMoveWeights(e, list, p, 'me')
    .filter(entry => entry.type === 'DEFEND').reduce((sum, entry) => sum + entry.probability, 0);
  const safe = defend([me({ energy: 0 }), e]);
  const ordinary = defend([me({ energy: 1 }), e]);
  const ultimate = defend(players);
  assert.ok(ordinary > safe, 'public attack threat should increase defense');
  assert.ok(ultimate > safe && ultimate < ordinary, 'ordinary defense is less useful against an ultimate');
  assert.ok(ultimate < 0.9, 'defense must not become a permanent loop');
});

test('AI 出牌一定是自己买得起的牌', () => {
  const e = enemy({ energy: 3, inventory: [0, 3], disabledSkills: ['hong2'] });
  for (let i = 0; i < 100; i++) {
    const move = expeditionBotMove(e, [me(), e], { aggression: 0.7, defense: 0.4, charge: 0.4, smart: 0.5 }, 'me');
    assert.notEqual(move, 'hong2', 'must not play disabled skill');
    assert.notEqual(move, 'kajisuper', 'must not play unaffordable card');
  }
});

test('混战 AI：pickThreat 盯能量最高的活着对手', () => {
  const e1 = enemy({ id: 'e1' });
  const e2 = enemy({ id: 'e2', energy: 5, hp: 2 });
  const e3 = enemy({ id: 'e3', energy: 3, hp: 3 });
  const human = me({ energy: 1 });
  // 能量最高者胜出
  assert.equal(pickThreat('e1', [human, e1, e2, e3], 'me')?.id, 'e2');
  // 死了的不算
  assert.equal(pickThreat('e1', [human, e1, enemy({ id: 'e2', energy: 9, isDead: true }), e3], 'me')?.id, 'e3');
  // 能量相同看血量
  const a = enemy({ id: 'a', energy: 4, hp: 1 });
  const b = enemy({ id: 'b', energy: 4, hp: 3 });
  assert.equal(pickThreat('e1', [e1, a, b], 'me')?.id, 'b');
  // 自己不被选中
  assert.notEqual(pickThreat('e2', [human, e1, e2, e3], 'me')?.id, 'e2');
  // 都死了回退到玩家
  const dead = [human, e1].map((p) => ({ ...p, isDead: true }));
  assert.equal(pickThreat('e1', dead, 'me')?.id, 'me');
});
test('奖励生成：选项不重复；受伤才有治疗；遗物拿完不再出现', () => {
  for (let i = 0; i < 50; i++) {
    const opts = genRewardOptions(1, 3, ['ypj'], 3);
    assert.equal(opts.length, 3);
    const keys = opts.map((o) => (o.kind === 'temp' ? o.cardId : o.kind === 'relic' ? o.relicId : o.kind));
    assert.equal(new Set(keys).size, 3, `duplicate options: ${keys}`);
    for (const o of opts) {
      if (o.kind === 'relic') assert.notEqual(o.relicId, 'ypj', 'owned relic offered');
      if (o.kind === 'temp') {
        assert.ok(o.uses >= 1 && o.uses <= 3, `bad uses: ${o.uses}`);
        assert.ok(o.cardId.length > 0);
      }
      if (o.kind === 'heal') assert.equal(o.amount, 1);
    }
    assert.ok(opts.some((o) => o.kind === 'heal'), 'injured player should be offered heal');
  }
  // 满血：没有治疗选项
  for (let i = 0; i < 20; i++) {
    const opts = genRewardOptions(3, 3, [], 3);
    assert.ok(opts.every((o) => o.kind !== 'heal'), 'full-hp player should not be offered heal');
  }
  // 遗物全拿：没有遗物选项
  const allRelics = EXPEDITION_RELICS.map((r) => r.id);
  for (let i = 0; i < 20; i++) {
    const opts = genRewardOptions(1, 3, allRelics, 3);
    assert.ok(opts.every((o) => o.kind !== 'relic'), 'no relic should be offered when all owned');
  }
});

test('藏宝图：奖励 4 选 1', () => {
  const opts = genRewardOptions(1, 3, [], 4);
  assert.equal(opts.length, 4);
});

test('升级奖励：稳定 +1 级，满级后不再出现，无开局能量奖励', () => {
  for (let i = 0; i < 30; i++) {
    const opts = genRewardOptions(3, 3, [], 3, [0, 1]);
    const lv = opts.find((o) => o.kind === 'levelup');
    for (const o of opts) {
      assert.ok(['heal', 'levelup', 'maxhp', 'temp', 'relic'].includes(o.kind), `unexpected kind: ${o.kind}`);
    }
    if (lv && lv.kind === 'levelup') assert.equal(lv.level, 2, 'levelup should be exactly +1');
  }
  // Only the end of the existing skill catalog stops progression.
  for (let i = 0; i < 20; i++) {
    const opts = genRewardOptions(3, 3, [], 3, [0, EXPEDITION_MAX_LEVEL]);
    assert.ok(opts.every((o) => o.kind !== 'levelup'), 'no levelup at max level');
  }
});

test('applyIronhide：每场战斗首次受伤 -0.5，之后不再减', () => {
  const r1 = applyIronhide(1, 0.5, 2, false);
  assert.equal(r1.hp, 1);
  assert.equal(r1.triggered, true);
  const r2 = applyIronhide(1, 0.5, 2, true);
  assert.equal(r2.hp, 0.5);
  assert.equal(r2.triggered, true);
  const r3 = applyIronhide(1, 1, 2, false);
  assert.equal(r3.hp, 1);
  assert.equal(r3.triggered, false);
  // 不超过上限
  const r4 = applyIronhide(2, 1.5, 2, false);
  assert.equal(r4.hp, 2);
});

test('关卡配置合法：18 关，含动态高阶对手、一打三和双 Boss', () => {
  assert.equal(EXPEDITION_STAGES.length, 18);
  for (const s of EXPEDITION_STAGES) {
    assert.ok(s.enemies.length >= 1 && s.enemies.length <= 3, `${s.id}: bad enemy count`);
    for (const e of s.enemies) {
      assert.ok(e.hp >= 1, `${s.id}/${e.id}: hp too low`);
      assert.ok(e.inventory.length > 0, `${s.id}/${e.id}: empty inventory`);
      const { aggression, defense, charge, smart } = e.personality;
      for (const v of [aggression, defense, charge, smart]) {
        assert.ok(v >= 0 && v <= 1, `${s.id}/${e.id}: personality out of range`);
      }
      assert.ok(e.intro.zh.length > 0 && e.intro.en.length > 0, `${s.id}/${e.id}: missing intro`);
    }
  }
  const multi = EXPEDITION_STAGES.filter((s) => s.enemies.length >= 2);
  assert.ok(multi.length >= 4, `expected >=4 one-vs-many stages, got ${multi.length}`);
  const triple = EXPEDITION_STAGES.filter((s) => s.enemies.length === 3);
  assert.ok(triple.length >= 2, `expected >=2 triple-battle stages, got ${triple.length}`);
  // 一打三的关卡里敌人等级有高有低
  for (const s of triple) {
    const tiers = s.enemies.map((e) => Math.max(...e.inventory));
    assert.ok(new Set(tiers).size >= 2, `${s.id}: triple enemies should have mixed tiers`);
  }
  const boss = EXPEDITION_STAGES.find(stage => stage.id === 's15')!.enemies[0];
  assert.ok(boss.boss, 'the tower lord must remain a boss');
  assert.ok(boss.hp >= 4, 'boss should have extra HP');
  assert.equal(boss.passive?.startEnergy ?? 0, 0, 'boss must earn its first attack');
  const finalBoss = EXPEDITION_STAGES.at(-1)!.enemies[0];
  assert.ok(finalBoss.boss, 'the final encounter must remain a boss');
  // 新精英：诈唬大师（第 15 关，虚假意图）
  const blufferStage = EXPEDITION_STAGES.find(stage => stage.id === 's14')!;
  assert.ok(blufferStage.name.zh.includes('诈唬大师'), 'stage 15 should be the Bluff Master');
  const bluffer = blufferStage.enemies[0];
  assert.ok(bluffer.elite, 'bluffer must be elite');
  assert.ok(bluffer.passive?.deceiver, 'bluffer must have the deceiver passive');
  assert.ok(bluffer.inventory.length >= 4, 'bluffer should have a decent deck');
  const elites = EXPEDITION_STAGES.flatMap((s) => s.enemies).filter((e) => e.elite);
  assert.ok(elites.length >= 3, `expected >=3 elites, got ${elites.length}`);
});

test('遗物配置合法：9 个，id 唯一，无聚气丹（太赖已砍）', () => {
  assert.equal(EXPEDITION_RELICS.length, 9);
  const ids = EXPEDITION_RELICS.map((r) => r.id);
  assert.equal(new Set(ids).size, 9);
  assert.ok(!ids.includes('jqd'), 'jqd should be removed');
  assert.ok(ids.includes('ypj'), 'ypj should exist');
  for (const r of EXPEDITION_RELICS) {
    assert.ok(r.name.zh && r.desc.zh, `${r.id}: missing zh text`);
    assert.ok(['common', 'rare'].includes(r.rarity), `${r.id}: bad rarity`);
  }
});

test('抽卡池：附近等级的实用秘技，保留后期吸收选项', () => {
  assert.ok(EXPEDITION_GACHA_POOL.length > 30);
  const types = new Set<string>();
  for (const id of EXPEDITION_GACHA_POOL) {
    const c = SKILL_DB.find((x) => x.id === id)!;
    assert.ok(c, `card exists: ${id}`);
    assert.ok(c.levelRequired >= 1 && c.levelRequired <= EXPEDITION_MAX_LEVEL, `tier ok: ${id}`);
    assert.notEqual(c.type, 'CHARGE');
    types.add(c.type);
  }
  for (const t of ['ATTACK', 'DEFEND', 'ABSORB', 'ULTIMATE']) assert.ok(types.has(t), `has ${t}`);
  for (let i = 0; i < 20; i++) {
    const g = drawGachaCard();
    assert.ok(EXPEDITION_GACHA_POOL.includes(g.cardId));
    assert.ok(g.uses >= 1 && g.uses <= 3);
  }
});

test('金币：随机掉落，精英/Boss 掉更多', () => {
  const plain = EXPEDITION_STAGES[0];
  const elite = EXPEDITION_STAGES.find((st) => st.enemies.some((e) => e.elite))!;
  const boss = EXPEDITION_STAGES.find((st) => st.enemies.some((e) => e.boss))!;
  const seen = new Set<number>();
  for (let i = 0; i < 50; i++) {
    const g = goldForWin(0, plain);
    assert.ok(g >= 4 && g <= 8, `plain gold in [4,8], got ${g}`);
    seen.add(g);
    const ge = goldForWin(0, elite);
    assert.ok(ge >= 8 && ge <= 16, `elite gold in [8,16], got ${ge}`);
    const gb = goldForWin(0, boss);
    assert.ok(gb >= 19 && gb <= 33, `boss gold in [19,33], got ${gb}`);
  }
  assert.ok(seen.size > 1, 'gold should be random, not fixed');
  assert.ok(goldForWin(5, plain) >= 9 && goldForWin(5, plain) <= 13, 'stage bonus still applies');
});

test('商城：4 件商品（2 卡 + 1 装备 + 疗伤药），装备不重复，售价合理', () => {
  for (let i = 0; i < 20; i++) {
    const items = genShopItems([], 0);
    assert.equal(items.length, 4);
    const eq = items.filter((x) => x.kind === 'equipment');
    assert.ok(eq.length <= 1, 'at most one equipment per shop');
    assert.ok(items.some((x) => x.kind === 'potion'), 'potion always offered');
    for (const it of items) {
      const price = it.kind === 'tempcard' ? it.price : it.kind === 'equipment' ? it.equipment.price : it.price;
      assert.ok(price > 0 && price <= 60, `price sane: ${price}`);
      if (it.kind === 'tempcard') assert.equal(price, shopCardPrice(it.cardId));
    }
  }
  // 装备买完不再出现；升级徽章满级后不再出现
  const all = EXPEDITION_EQUIPMENTS.map((e) => e.id);
  for (let i = 0; i < 20; i++) {
    const items = genShopItems(all, 5);
    assert.ok(items.every((x) => x.kind !== 'equipment'), 'no equipment when all owned');
  }
  const noBadge = genShopItems([], EXPEDITION_MAX_LEVEL);
  assert.ok(noBadge.every((x) => x.kind !== 'equipment' || x.equipment.id !== 'levelbadge'), 'no level badge at max level');
});

test('Boss1 塔主波赞：4 血，遵循同样的能量与防守规则', () => {
  const s14 = EXPEDITION_STAGES.find((s) => s.id === 's15')!; // Boss1 塔主波赞（诈唬大师关卡插入后顺延）
  const boss = s14.enemies[0];
  assert.equal(boss.hp, 4);
  assert.deepEqual(boss.inventory, [0, 2, 3, 5]);
  assert.equal(boss.passive?.enrageEnergy ?? 0, 0);
  assert.equal(boss.passive?.armorPerTurn ?? 0, 0);
});

test('Boss2 远古塔魂：5 血与联合技能，不靠穿透或免费能量', () => {
  const s16 = EXPEDITION_STAGES.find((s) => s.id === 's16')!; // Boss2 远古塔魂（顺延）
  const boss = s16.enemies[0];
  assert.equal(boss.boss, true);
  assert.equal(boss.hp, 5);
  assert.deepEqual(boss.inventory, [0, 1, 2, 3, 5]);
  assert.equal(boss.passive?.armorPerTurn ?? 0, 0);
  assert.equal(boss.passive?.energyPerTurn ?? 0, 0);
  assert.equal(boss.passive?.pierce ?? false, false);
});

test('刀吸针对六克习惯，避免会击破刀吸的轰', () => {
  const smartP = { aggression: 0.7, defense: 0.35, charge: 0.25, smart: 1.0 };
  const mk = (): Player => ({
    id: 'e', name: 'E', isBot: true, hp: 5, energy: 3, isDead: false,
    inventory: [0, 1, 6], layer: 0, tempLayerMod: 0,
    selectedCardId: null, lastCardId: null, lastAction: null,
    disabledSkills: [], freeSkills: [], kills: 0, tempSkills: [],
  });
  const me: Player = { ...mk(), id: 'p', isBot: false, energy: 2, inventory: [0] };
  const options = { history: { p: ['liuke', 'liuke', 'liuke'] } };
  const smartAbsorb = expeditionMoveWeights(mk(), [mk(), me], smartP, 'p', options).find(entry => entry.cardId === 'absorb')!.probability;
  const dangerous = expeditionMoveWeights(mk(), [mk(), me], smartP, 'p', { history: { p: ['hong', 'hong', 'hong'] } })
    .find(entry => entry.cardId === 'absorb')!.probability;
  assert.ok(smartAbsorb > dangerous * 2, `absorb vs six cuts ${smartAbsorb}, versus blast ${dangerous}`);
});
test('意图显示规则：前三关全显示，之后按哈希 45% 显示且稳定', () => {
  for (let t = 1; t <= 5; t++) {
    assert.equal(intentRevealed('e1', t, 0), true);
    assert.equal(intentRevealed('e1', t, 2), true);
  }
  const a = intentRevealed('exp_s5_e1', 7, 5);
  assert.equal(a, intentRevealed('exp_s5_e1', 7, 5));
  let shown = 0;
  for (let i = 0; i < 200; i++) if (intentRevealed('enemy' + i, (i % 20) + 1, 5)) shown++;
  assert.ok(shown > 60 && shown < 120, `shown=${shown}`);
  // Boss 永不显示，精英约 20%
  for (let t = 1; t <= 10; t++) assert.equal(intentRevealed('boss1', t, 14, 'boss'), false);
  let eliteShown = 0;
  for (let i = 0; i < 300; i++) if (intentRevealed('elite' + i, (i % 25) + 1, 8, 'elite')) eliteShown++;
  assert.ok(eliteShown > 30 && eliteShown < 100, `eliteShown=${eliteShown}`);
});
