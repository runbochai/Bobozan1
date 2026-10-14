import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { calculateTurnOutcome, getShowdownWinner } from './combat';

const player = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: false, hp: 1, energy: 5, isDead: false,
  inventory: [0, 6, 12], layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
});
const after = (res: ReturnType<typeof calculateTurnOutcome>, id: string) =>
  res.players.find(p => p.id === id)!;

test('锐吸吸收攻击：只得技能，不得能量', () => {
  const ab = player('ab', { selectedCardId: 'absorb' });
  const atk = player('atk', { selectedCardId: 'icesword' });
  const res = calculateTurnOutcome([ab, atk], 1, 1, 'zh');
  const me = after(res, 'ab');
  assert.equal(me.isDead, false);
  assert.equal(me.energy, 4); // 只花了 1 费出锐吸，没有额外能量
  assert.ok((me.freeSkills ?? []).includes('icesword'));
});

test('锐吸吸收攒：+2 能量，不得技能', () => {
  const ab = player('ab', { selectedCardId: 'absorb' });
  const chg = player('chg', { selectedCardId: 'charge' });
  const res = calculateTurnOutcome([ab, chg], 1, 1, 'zh');
  const me = after(res, 'ab');
  assert.equal(me.energy, 6); // 5 - 1 + 2
  assert.equal((me.freeSkills ?? []).length, 0);
});

test('奥吸吸收攒：+4 能量（2 倍）', () => {
  const ab = player('ab', { selectedCardId: 'aoxi' });
  const chg = player('chg', { selectedCardId: 'charge' });
  const res = calculateTurnOutcome([ab, chg], 1, 1, 'zh');
  assert.equal(after(res, 'ab').energy, 8); // 5 - 1 + 4
});

test('锐吸被轰打中：吸收失败被淘汰', () => {
  const ab = player('ab', { selectedCardId: 'absorb' });
  const atk = player('atk', { selectedCardId: 'hong' });
  const res = calculateTurnOutcome([ab, atk], 1, 1, 'zh');
  assert.equal(after(res, 'ab').isDead, true);
});

test('奥吸也会被轰击杀，出牌投影与实际结算一致', () => {
  const players = [
    player('absorber', { selectedCardId: 'aoxi' }),
    player('attacker', { selectedCardId: 'hong' }),
  ];
  assert.deepEqual(getShowdownWinner(players), ['attacker']);
  const result = calculateTurnOutcome(players, 1, 1, 'zh');
  assert.equal(after(result, 'absorber').isDead, true);
  assert.deepEqual(after(result, 'absorber').freeSkills, []);
  assert.equal(after(result, 'attacker').kills, 1);
});

test('轰同时击杀同层奥吸，跨层奥吸不受影响，击杀按目标计算', () => {
  const players = [
    player('attacker', { selectedCardId: 'hong' }),
    player('same-a', { selectedCardId: 'aoxi' }),
    player('same-b', { selectedCardId: 'aoxi' }),
    player('other-layer', { selectedCardId: 'aoxi', layer: 1 }),
  ];
  const before = structuredClone(players);
  assert.deepEqual(getShowdownWinner(players), ['attacker']);
  const result = calculateTurnOutcome(players, 1, 1, 'zh', { mode: 'practice' });
  assert.equal(after(result, 'attacker').kills, 2);
  for (const id of ['same-a', 'same-b']) assert.equal(after(result, id).isDead, true);
  assert.equal(after(result, 'other-layer').isDead, false);
  assert.deepEqual(after(result, 'other-layer').freeSkills, []);
  assert.deepEqual(players, before);
});

test('奥吸保留对其他攻击的双倍吸收，吸收的技能可各免费使用一次', () => {
  const result = calculateTurnOutcome([
    player('absorber', { selectedCardId: 'aoxi' }),
    player('attacker', { selectedCardId: 'hong2' }),
  ], 1, 1, 'zh', { mode: 'practice' });
  const absorber = after(result, 'absorber');
  assert.equal(absorber.isDead, false);
  assert.equal(absorber.energy, 4);
  assert.deepEqual(absorber.freeSkills, ['hong2', 'hong2']);
  const next = calculateTurnOutcome(result.players.map(p => ({
    ...p, selectedCardId: p.id === 'absorber' ? 'hong2' : 'defend',
  })), 2, 1, 'zh', { mode: 'practice' });
  assert.equal(after(next, 'absorber').energy, 4);
  assert.deepEqual(after(next, 'absorber').freeSkills, ['hong2']);
});

test('奥吸受到轰的致命攻击后，不再得到同时吸到的攒或技能', () => {
  const result = calculateTurnOutcome([
    player('absorber', { selectedCardId: 'aoxi' }),
    player('attacker', { selectedCardId: 'hong' }),
    player('charger', { selectedCardId: 'charge' }),
    player('defender', { selectedCardId: 'smallfly' }),
  ], 1, 1, 'zh', { mode: 'practice' });
  const absorber = after(result, 'absorber');
  assert.equal(absorber.isDead, true);
  assert.equal(absorber.energy, 4);
  assert.deepEqual(absorber.freeSkills, []);
});

test('吸收终极技：吸收失败被终极击杀', () => {
  const ab = player('ab', { selectedCardId: 'absorb' });
  const ult = player('ult', { selectedCardId: 'meteor', energy: 5 });
  const res = calculateTurnOutcome([ab, ult], 1, 1, 'zh');
  assert.equal(after(res, 'ab').isDead, true);
});
