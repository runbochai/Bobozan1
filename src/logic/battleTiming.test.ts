import assert from 'node:assert/strict';
import test from 'node:test';
import { CARD_RAISE_MS, CARD_RELEASE_MS, CARD_LAND_MS, CARD_RECOVER_MS,
  CARD_COMPARE_START_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_END_MS, CARD_REVEAL_MS,
  ULT_CUTIN_MS, captureBattleRound, remainingBattleTime, showdownDurationMs } from '../data/battleTiming';

test('cards leave after the raised pose, land before comparison, and settle after cut-ins', () => {
  const milestones = [0, CARD_RAISE_MS, CARD_RELEASE_MS, CARD_LAND_MS, CARD_RECOVER_MS,
    CARD_COMPARE_START_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_END_MS, CARD_REVEAL_MS];
  milestones.slice(1).forEach((at, i) => assert.ok(at > milestones[i]));
  for (const mode of ['room', 'expedition'] as const) {
    assert.ok(showdownDurationMs(false, mode) > CARD_COMPARE_END_MS);
    assert.ok(showdownDurationMs(true, mode) > CARD_REVEAL_MS + ULT_CUTIN_MS);
  }
  assert.equal(showdownDurationMs(true, 'room', true), showdownDurationMs(true, 'room', false));
});

test('an emoji or language update cannot replace moves or extend a showdown deadline', () => {
  const round = captureBattleRound(null, 'room:1:4', { move: 'ka', lang: 'zh' }, 1000);
  const refreshed = captureBattleRound(round, 'room:1:4', { move: 'charge', lang: 'en' }, 1350);
  assert.equal(refreshed, round);
  assert.equal(refreshed.snapshot.move, 'ka');
  assert.equal(remainingBattleTime(refreshed.startedAt, CARD_LAND_MS, 1350), CARD_LAND_MS - 350);
  assert.equal(remainingBattleTime(refreshed.startedAt, CARD_LAND_MS, 9999), 0);
  const next = captureBattleRound(round, 'room:1:5', { move: 'charge', lang: 'en' }, 5000);
  assert.notEqual(next, round);
  assert.equal(next.startedAt, 5000);
});
