import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { EXPEDITION_RELICS, EXPEDITION_STAGES } from '../data/expedition';
import {
  comboHintFor,
  expeditionBotMove,
  genRewardOptions,
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

test('保守 AI 残血玩家面前更爱防守（smart 生效）', () => {
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

test('奖励生成：3 个不重复选项，不给已拥有的等级/遗物', () => {
  for (let i = 0; i < 50; i++) {
    const opts = genRewardOptions(5, [0, 1, 2], ['jqd'], 3);
    assert.equal(opts.length, 3);
    const keys = opts.map((o) => (o.kind === 'level' ? `lv${o.level}` : o.kind === 'relic' ? o.relicId : 'heal'));
    assert.equal(new Set(keys).size, 3, `duplicate options: ${keys}`);
    for (const o of opts) {
      if (o.kind === 'level') assert.ok(![0, 1, 2].includes(o.level), `owned level offered: ${o.level}`);
      if (o.kind === 'relic') assert.notEqual(o.relicId, 'jqd', 'owned relic offered');
    }
  }
});

test('藏宝图：奖励 4 选 1', () => {
  const opts = genRewardOptions(5, [0], [], 4);
  assert.equal(opts.length, 4);
});

test('comboHintFor：2+5 提示双翼，1+2+3 提示天龙', () => {
  assert.ok(comboHintFor(5, [0, 2])?.zh.includes('双翼'));
  assert.ok(comboHintFor(3, [0, 1, 2])?.zh.includes('天龙'));
  assert.equal(comboHintFor(1, [0]), null);
});

test('关卡配置合法：15 关，敌人属性完整', () => {
  assert.equal(EXPEDITION_STAGES.length, 15);
  for (const s of EXPEDITION_STAGES) {
    assert.ok(s.enemies.length >= 1 && s.enemies.length <= 2, `${s.id}: bad enemy count`);
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
  const multi = EXPEDITION_STAGES.filter((s) => s.enemies.length === 2);
  assert.ok(multi.length >= 3, `expected >=3 one-vs-many stages, got ${multi.length}`);
  const boss = EXPEDITION_STAGES[14].enemies[0];
  assert.ok(boss.boss, 'last stage must be a boss');
  assert.ok(boss.hp >= 4, 'boss should have extra HP');
  assert.ok((boss.passive?.startEnergy ?? 0) > 0, 'boss should have an energy aura');
  const elites = EXPEDITION_STAGES.flatMap((s) => s.enemies).filter((e) => e.elite);
  assert.ok(elites.length >= 3, `expected >=3 elites, got ${elites.length}`);
});

test('遗物配置合法：9 个，id 唯一', () => {
  assert.equal(EXPEDITION_RELICS.length, 9);
  const ids = EXPEDITION_RELICS.map((r) => r.id);
  assert.equal(new Set(ids).size, 9);
  for (const r of EXPEDITION_RELICS) {
    assert.ok(r.name.zh && r.desc.zh, `${r.id}: missing zh text`);
    assert.ok(['common', 'rare'].includes(r.rarity), `${r.id}: bad rarity`);
  }
});
