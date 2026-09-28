import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { calculateTurnOutcome } from './combat';

const player = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: false, hp: 1, energy: 5, isDead: false,
  inventory: [0, 6, 12], layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
});
const after = (res: ReturnType<typeof calculateTurnOutcome>, id: string) =>
  res.players.find(p => p.id === id)!;

test('锐吸吸收攻击：只得技能，不得能量', () => {
  const ab = player('ab', { selectedCardId: 'absorb' });
  const atk = player('atk', { selectedCardId: 'liuke' });
  const res = calculateTurnOutcome([ab, atk], 1, 1, 'zh');
  const me = after(res, 'ab');
  assert.equal(me.isDead, false);
  assert.equal(me.energy, 4); // 只花了 1 费出锐吸，没有额外能量
  assert.ok((me.freeSkills ?? []).includes('liuke'));
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

test('奥吸被六克打中：吸收失败被淘汰；被轰则正常吸收', () => {
  const ab1 = player('ab', { selectedCardId: 'aoxi' });
  const atk1 = player('atk', { selectedCardId: 'liuke' });
  const res1 = calculateTurnOutcome([ab1, atk1], 1, 1, 'zh');
  assert.equal(after(res1, 'ab').isDead, true);

  const ab2 = player('ab', { selectedCardId: 'aoxi' });
  const atk2 = player('atk', { selectedCardId: 'hong' });
  const res2 = calculateTurnOutcome([ab2, atk2], 1, 1, 'zh');
  const me2 = after(res2, 'ab');
  assert.equal(me2.isDead, false);
  assert.ok((me2.freeSkills ?? []).includes('hong'));
});

test('吸收终极技：吸收失败被终极击杀', () => {
  const ab = player('ab', { selectedCardId: 'absorb' });
  const ult = player('ult', { selectedCardId: 'meteor', energy: 5 });
  const res = calculateTurnOutcome([ab, ult], 1, 1, 'zh');
  assert.equal(after(res, 'ab').isDead, true);
});
