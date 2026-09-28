import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { pickUltCutin, isLevelUltimate, ULT_CUTINS } from '../data/ultCutins';

const p = (patch: Partial<Player> = {}): Player => ({
  id: 'p1', name: 'p1', isBot: false, hp: 2, energy: 0, isDead: false,
  inventory: [0], layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
} as Player);

test('没人放必杀时返回 null', () => {
  const players = [p({ selectedCardId: 'charge' }), p({ id: 'e1', selectedCardId: 'defend' })];
  assert.equal(pickUltCutin(players, SKILL_DB, 'zh'), null);
});

test('有人放必杀时返回对应立绘', () => {
  const players = [p({ selectedCardId: 'meteor', name: '润博' }), p({ id: 'e1', selectedCardId: 'charge' })];
  const pick = pickUltCutin(players, SKILL_DB, 'zh');
  assert.ok(pick);
  assert.equal(pick.def.skillId, 'meteor');
  assert.equal(pick.playerName, '润博');
  assert.equal(pick.skillName, '流星坠');
});

test('多个必杀并列取先出场者（等级终极技同为 tier 4）', () => {
  const players = [
    p({ id: 'a', selectedCardId: 'meteor' }),
    p({ id: 'b', selectedCardId: 'superwave' }),
  ];
  const pick = pickUltCutin(players, SKILL_DB, 'zh');
  assert.ok(pick);
  assert.equal(pick.def.skillId, 'meteor');
});

test('阵亡玩家的必杀不参与', () => {
  const players = [p({ selectedCardId: 'meteor', isDead: true }), p({ id: 'e1', selectedCardId: 'charge' })];
  assert.equal(pickUltCutin(players, SKILL_DB, 'zh'), null);
});

test('只有等级终极技有立绘定义（咔叽系/联合技不播演出）', () => {
  const ults = SKILL_DB.filter(c => isLevelUltimate(c));
  assert.ok(ults.length > 0);
  for (const u of ults) {
    assert.ok(ULT_CUTINS[u.id], `missing cutin for ${u.id}`);
  }
});

test('咔叽系与联合技不触发必杀演出', () => {
  for (const id of ['ka', 'ji', 'kajifen', 'kajisuper', 'skydragon', 'vajra', 'heartpoison']) {
    const card = SKILL_DB.find(c => c.id === id);
    assert.ok(card, `missing card ${id}`);
    assert.equal(isLevelUltimate(card), false);
    assert.equal(pickUltCutin([p({ selectedCardId: id })], SKILL_DB, 'zh'), null);
  }
});
