import assert from 'node:assert/strict';
import test from 'node:test';
import { SKILL_DB } from '../data/skills';
import type { Player } from '../types';
import { isRevengeModeEnabled, prepareRevengeReward } from './revenge';

test('revenge grants the first bonus exactly when a fourth loss becomes the fifth', () => {
  assert.deepEqual(prepareRevengeReward({ isDead: true, loseStreak: 3 }, true, 12345, () => 0),
    { loseStreak: 4, tempSkills: [], revengeObtainedAt: null });
  const fifth = prepareRevengeReward({ isDead: true, loseStreak: 4 }, true, 12345, () => 0);
  assert.equal(fifth.loseStreak, 5);
  assert.equal(fifth.tempSkills.length, 1);
  assert.equal(fifth.revengeObtainedAt, 12345);
});

test('disabled revenge still tracks losses but does not draw a card or issue an award timestamp', () => {
  assert.deepEqual(prepareRevengeReward({ isDead: true, loseStreak: 9 }, false, 12345,
    () => { throw new Error('disabled revenge must not draw'); }),
  { loseStreak: 10, tempSkills: [], revengeObtainedAt: null });
  assert.equal(isRevengeModeEnabled(false), false);
  assert.equal(isRevengeModeEnabled(true), true);
  assert.equal(isRevengeModeEnabled(), true);
  assert.equal(prepareRevengeReward({ isDead: true, loseStreak: 4 }, undefined, 54321, () => 0).revengeObtainedAt, 54321);
});

test('a survivor resets its losing streak and temporary reward even after qualifying previously', () => {
  const survivor = { isDead: false, loseStreak: 8, tempSkills: ['meteor'], revengeObtainedAt: 111 } satisfies Pick<Player,
    'isDead' | 'loseStreak' | 'tempSkills' | 'revengeObtainedAt'>;
  assert.deepEqual(prepareRevengeReward(survivor, true, 12345,
    () => { throw new Error('survivors must not draw'); }),
  { loseStreak: 0, tempSkills: [], revengeObtainedAt: null });
  assert.deepEqual(survivor.tempSkills, ['meteor']);
  assert.equal(survivor.revengeObtainedAt, 111);
  assert.equal(prepareRevengeReward({ isDead: true }, true, 12345).loseStreak, 1);
});

test('every random reward is an existing one-energy attack or special, including the last pool entry', () => {
  const eligible = SKILL_DB.filter(card => card.cost === 1 && (card.type === 'ATTACK' || card.type === 'SPECIAL'));
  assert.ok(eligible.length > 0);
  const drawn = eligible.map((_, index) => prepareRevengeReward({ isDead: true, loseStreak: 4 }, true, 12345,
    () => (index + .5) / eligible.length).tempSkills[0]);
  assert.deepEqual(new Set(drawn), new Set(eligible.map(card => card.id)));
  assert.equal(prepareRevengeReward({ isDead: true, loseStreak: 4 }, true, 12345, () => 1 - Number.EPSILON).tempSkills[0], eligible.at(-1)!.id);
});

test('qualifying successive matches replaces the previous bonus instead of accumulating cards', () => {
  const player = { isDead: true, loseStreak: 4, tempSkills: ['meteor', 'hong'], revengeObtainedAt: 111 };
  const before = structuredClone(player);
  const first = prepareRevengeReward(player, true, 1000, () => 0);
  const second = prepareRevengeReward({ ...player, ...first }, true, 2000, () => 1 - Number.EPSILON);
  assert.equal(first.loseStreak, 5);
  assert.equal(second.loseStreak, 6);
  assert.equal(first.tempSkills.length, 1);
  assert.equal(second.tempSkills.length, 1);
  assert.notEqual(first.tempSkills[0], second.tempSkills[0]);
  assert.equal(second.revengeObtainedAt, 2000);
  assert.deepEqual(player, before);
});
