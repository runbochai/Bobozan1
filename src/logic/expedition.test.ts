import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { EXPEDITION_RELICS, EXPEDITION_STAGES } from '../data/expedition';
import {
  applyIronhide,
  expeditionBotMove,
  genRewardOptions,
  pickThreat,
} from './expedition';

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

test('保守 AI 在威胁者攒满能量时更爱防守（smart 生效）', () => {
  const e = enemy({ energy: 2 });
  const players = [me({ energy: 5 }), e];
  const p = { aggression: 0.2, defense: 0.5, charge: 0.3, smart: 1 };
  let defends = 0;
  for (let i = 0; i < 200; i++) {
    if (expeditionBotMove(e, players, p, 'me') === 'defend') defends++;
  }
  assert.ok(defends > 60, `smart defend too low: ${defends}/200`);
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
    const opts = genRewardOptions(5, 1, 3, ['ypj'], 3);
    assert.equal(opts.length, 3);
    const keys = opts.map((o) => (o.kind === 'temp' ? o.cardId : o.kind === 'relic' ? o.relicId : o.kind));
    assert.equal(new Set(keys).size, 3, `duplicate options: ${keys}`);
    for (const o of opts) {
      if (o.kind === 'relic') assert.notEqual(o.relicId, 'ypj', 'owned relic offered');
      if (o.kind === 'temp') {
        assert.ok(o.uses >= 1 && o.uses <= 3, `bad uses: ${o.uses}`);
        assert.ok(o.cardId.length > 0);
      }
      if (o.kind === 'heal') assert.equal(o.amount, 2);
    }
    assert.ok(opts.some((o) => o.kind === 'heal'), 'injured player should be offered heal');
  }
  // 满血：没有治疗选项
  for (let i = 0; i < 20; i++) {
    const opts = genRewardOptions(5, 3, 3, [], 3);
    assert.ok(opts.every((o) => o.kind !== 'heal'), 'full-hp player should not be offered heal');
  }
  // 遗物全拿：没有遗物选项
  const allRelics = EXPEDITION_RELICS.map((r) => r.id);
  for (let i = 0; i < 20; i++) {
    const opts = genRewardOptions(5, 1, 3, allRelics, 3);
    assert.ok(opts.every((o) => o.kind !== 'relic'), 'no relic should be offered when all owned');
  }
});

test('藏宝图：奖励 4 选 1', () => {
  const opts = genRewardOptions(5, 1, 3, [], 4);
  assert.equal(opts.length, 4);
});

test('升级奖励：稳定 +1 级，满级后不再出现，无开局能量奖励', () => {
  for (let i = 0; i < 30; i++) {
    const opts = genRewardOptions(5, 3, 3, [], 3, [0, 1]);
    const lv = opts.find((o) => o.kind === 'levelup');
    for (const o of opts) {
      assert.ok(['heal', 'levelup', 'maxhp', 'temp', 'relic'].includes(o.kind), `unexpected kind: ${o.kind}`);
    }
    if (lv && lv.kind === 'levelup') assert.equal(lv.level, 2, 'levelup should be exactly +1');
  }
  // 满级（5 级）：不再出升级
  for (let i = 0; i < 20; i++) {
    const opts = genRewardOptions(5, 3, 3, [], 3, [0, 1, 2, 3, 4, 5]);
    assert.ok(opts.every((o) => o.kind !== 'levelup'), 'no levelup at max level');
  }
});

test('applyIronhide：每场战斗首次受伤 -1，之后不再减', () => {
  const r1 = applyIronhide(2, 1, 3, false);
  assert.equal(r1.hp, 2);
  assert.equal(r1.triggered, true);
  const r2 = applyIronhide(2, 1, 3, true);
  assert.equal(r2.hp, 1);
  assert.equal(r2.triggered, true);
  const r3 = applyIronhide(2, 2, 3, false);
  assert.equal(r3.hp, 2);
  assert.equal(r3.triggered, false);
  // 不超过上限
  const r4 = applyIronhide(3, 2, 3, false);
  assert.equal(r4.hp, 3);
});

test('关卡配置合法：15 关，含一打三，敌人等级有高低', () => {
  assert.equal(EXPEDITION_STAGES.length, 15);
  for (const s of EXPEDITION_STAGES) {
    assert.ok(s.enemies.length >= 1 && s.enemies.length <= 3, `${s.id}: bad enemy count`);
    for (const e of s.enemies) {
      assert.ok(e.hp >= 2, `${s.id}/${e.id}: hp too low`);
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
  const boss = EXPEDITION_STAGES[14].enemies[0];
  assert.ok(boss.boss, 'last stage must be a boss');
  assert.ok(boss.hp >= 4, 'boss should have extra HP');
  assert.ok((boss.passive?.startEnergy ?? 0) > 0, 'boss should have an energy aura');
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
