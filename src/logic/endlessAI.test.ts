import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { expeditionMoveWeights } from './expeditionAI';
import { getEndlessEnemyLoadout } from './endlessExpedition';

const personality = { aggression: .5, defense: .55, charge: .5, smart: .9 };
const player = (id: string, rank: number, layer: number, energy: number): Player => ({
  id, name: id, isBot: true, hp: 3, energy, isDead: false, layer, tempLayerMod: 0,
  selectedCardId: null, lastCardId: null, lastAction: null,
  ...getEndlessEnemyLoadout(rank), endlessLevel: rank,
});
const weights = (me: Player, foe: Player) => expeditionMoveWeights(me, [me, foe], personality, foe.id);
const chance = (list: ReturnType<typeof weights>, ...ids: string[]) =>
  list.filter(entry => ids.includes(entry.cardId)).reduce((sum, entry) => sum + entry.probability, 0);

test('distant endless fighters mostly save for a global attack or move closer, with genuine alternatives', () => {
  const enemy = player('enemy', 23, -9, 4), hero = player('hero', 12, 4, 2);
  const result = weights(enemy, hero);
  assert.ok(chance(result, 'charge', 'ascend') > .75);
  assert.ok(chance(result, 'descend') < chance(result, 'ascend') * .2);
  assert.ok(result.filter(entry => entry.type === 'DEFEND').reduce((sum, entry) => sum + entry.probability, 0) < .12);
  assert.ok(result.filter(entry => entry.type === 'ATTACK').reduce((sum, entry) => sum + entry.probability, 0) < .15);
  assert.ok(result.every(entry => entry.probability > 0 && entry.probability < 1));
  assert.ok(Math.abs(result.reduce((sum, entry) => sum + entry.probability, 0) - 1) < 1e-12);
});

test('a reachable universal attack is preferred once distant endless fighters have saved its cost', () => {
  const enemy = player('enemy', 23, -9, 5), hero = player('hero', 12, 4, 2);
  const result = weights(enemy, hero);
  assert.ok(chance(result, 'kajifen') > .45);
  assert.ok(chance(result, 'kajifen') > chance(result, 'charge', 'descend', 'defend'));
  assert.ok(chance(result, 'kajifen') > chance(result, 'ka', 'ji', 'threestar', 'fiveslap', 'superwave') * 3);
});

test('safe permanent movement approaches in either direction rather than drifting away', () => {
  for (const sign of [-1, 1]) {
    const enemy = player('enemy', 23, sign * 9, 1), hero = player('hero', 12, -sign * 4, 2);
    enemy.disabledSkills = ['hongdi', 'hongtian'];
    const result = weights(enemy, hero);
    const closer = sign < 0 ? 'ascend' : 'descend', farther = sign < 0 ? 'descend' : 'ascend';
    assert.ok(chance(result, closer) > chance(result, farther) * 10);
    assert.ok(chance(result, closer, 'charge') > .75);
  }
});

test('global and directional threats remain threats at long range, without reading a locked move', () => {
  const enemy = player('enemy', 23, -9, 1), harmless = player('hero', 12, 4, 2);
  const global = { ...harmless, energy: 5 };
  const directional = player('hero', 23, 4, 1);
  const defense = (other: Player) => weights(enemy, other).filter(entry => entry.type === 'DEFEND')
    .reduce((sum, entry) => sum + entry.probability, 0);
  assert.ok(defense(global) > defense(harmless));
  assert.ok(defense(directional) > defense(harmless));
  const hidden = [enemy, global].map(item => Object.defineProperty({ ...item }, 'selectedCardId', {
    get() { throw new Error('Public range reasoning read a hidden selection'); },
  }));
  assert.deepEqual(weights(hidden[0], hidden[1]), weights(enemy, global));
});

test('the same distant finite encounter retains its prior action probabilities exactly', () => {
  const enemy = player('enemy', 0, -7, 2), hero = player('hero', 0, 0, 2);
  delete enemy.endlessLevel;
  delete hero.endlessLevel;
  const result = weights(enemy, hero);
  const before = { charge: .5938109061217243, defend: .24441761105482152,
    hong: .06794066909575498, hong2: .046915406863849624, liuke: .046915406863849624 };
  assert.deepEqual(result.map(entry => entry.cardId).sort(), Object.keys(before).sort());
  for (const [id, expected] of Object.entries(before)) assert.equal(chance(result, id), expected);
});
