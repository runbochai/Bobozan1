import assert from 'node:assert/strict';
import test from 'node:test';
import { CARD_RAISE_MS, CARD_RELEASE_MS, CARD_LAND_MS, CARD_RECOVER_MS,
  CARD_COMPARE_START_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_END_MS, CARD_REVEAL_MS,
  ULT_CUTIN_MS, SOLO_MOTION_SCALE, SOLO_SHOWDOWN_MS, SOLO_REDUCED_SHOWDOWN_MS,
  SOLO_CUTIN_START_MS, SOLO_CUTIN_MS, SOLO_CUTIN_SCALE, SOLO_ULT_SHOWDOWN_MS,
  captureBattleRound, remainingBattleTime, showdownDurationMs } from '../data/battleTiming';

test('cards leave after the raised pose and land before comparison on the source clock', () => {
  const milestones = [0, CARD_RAISE_MS, CARD_RELEASE_MS, CARD_LAND_MS, CARD_RECOVER_MS,
    CARD_COMPARE_START_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_END_MS, CARD_REVEAL_MS];
  milestones.slice(1).forEach((at, i) => assert.ok(at > milestones[i]));
});

test('multiplayer shares the fast battle clock without shortening other viewers for a reduced-motion host', () => {
  for (const reduced of [false, true]) {
    assert.equal(showdownDurationMs(false, 'room', reduced), 700);
    assert.equal(showdownDurationMs(true, 'room', reduced), 1450);
    assert.equal(showdownDurationMs(false, 'room', reduced), showdownDurationMs(false, 'expedition'));
    assert.equal(showdownDurationMs(true, 'room', reduced), showdownDurationMs(true, 'expedition'));
  }
  assert.ok(showdownDurationMs(false, 'room') > CARD_COMPARE_END_MS * SOLO_MOTION_SCALE);
  assert.ok(showdownDurationMs(true, 'room') > SOLO_CUTIN_START_MS + SOLO_CUTIN_MS);
});

test('solo cards land, compare and recover before the next move', () => {
  const duration = showdownDurationMs(false, 'expedition');
  assert.equal(duration, SOLO_SHOWDOWN_MS);
  assert.equal(duration, 700);
  const milestones = [CARD_RAISE_MS, CARD_RELEASE_MS, CARD_LAND_MS, CARD_RECOVER_MS,
    CARD_COMPARE_START_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_END_MS, CARD_REVEAL_MS]
    .map(at => at * SOLO_MOTION_SCALE);
  milestones.forEach(at => assert.ok(at < duration, `presentation at ${at}ms must finish before ${duration}ms`));
  milestones.slice(1).forEach((at, i) => assert.ok(at > milestones[i]));
  assert.ok(duration - CARD_COMPARE_END_MS * SOLO_MOTION_SCALE >= 100, 'landed cards remain visible after comparison');
  assert.equal(showdownDurationMs(false, 'expedition', true), SOLO_REDUCED_SHOWDOWN_MS);
  assert.equal(showdownDurationMs(true, 'expedition', true), 450);
});

test('solo ultimates finish comparison, their full cut-in, and a readable settled beat before resolving', () => {
  assert.ok(SOLO_CUTIN_START_MS > CARD_COMPARE_END_MS * SOLO_MOTION_SCALE);
  assert.equal(SOLO_CUTIN_MS, ULT_CUTIN_MS * SOLO_CUTIN_SCALE);
  const finish = SOLO_CUTIN_START_MS + SOLO_CUTIN_MS;
  const duration = showdownDurationMs(true, 'expedition');
  assert.equal(duration, SOLO_ULT_SHOWDOWN_MS);
  assert.ok(duration >= 1300 && duration <= 1500);
  assert.ok(duration - finish >= 100, 'the cut-in finishes before the settled hit');
  assert.ok(2700 * SOLO_CUTIN_SCALE < SOLO_CUTIN_MS, 'the original cut-in exit animation fits without truncation');
  assert.ok(1150 * SOLO_CUTIN_SCALE < SOLO_CUTIN_MS, 'the cut-in impact sound fits within its animation');
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
