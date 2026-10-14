import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_SPEEDS, battleTimeMs, getRoomBattleSpeed, getRoomRoundBattleSpeed,
  isBattleSpeed, normalizeBattleSpeed } from './battleSpeed';

test('only the four supported numeric speeds can affect a battle clock', () => {
  assert.deepEqual(BATTLE_SPEEDS, [.75, 1, 1.5, 2]);
  for (const speed of BATTLE_SPEEDS) {
    assert.equal(isBattleSpeed(speed), true);
    assert.equal(normalizeBattleSpeed(speed), speed);
    assert.equal(battleTimeMs(700, speed), 700 / speed);
  }
  for (const value of [undefined, null, '', '2', 0, -1, .5, 1.25, 3, Number.NaN, Infinity, {}, true]) {
    assert.equal(isBattleSpeed(value), false);
    assert.equal(normalizeBattleSpeed(value), 1);
  }
});

test('legacy and queued room preferences never substitute for the frozen current turn', () => {
  assert.equal(getRoomBattleSpeed({}), 1);
  assert.equal(getRoomRoundBattleSpeed({}), 1);
  assert.equal(getRoomBattleSpeed({ battleSpeed: 2 }), 2);
  assert.equal(getRoomRoundBattleSpeed({ roundBattleSpeed: .75 }), .75);
  const legacy = { battleSpeed: 2 } as const;
  assert.equal(getRoomRoundBattleSpeed(legacy), 1);
  const queued = { battleSpeed: 2, roundBattleSpeed: .75 } as const;
  assert.equal(getRoomBattleSpeed(queued), 2);
  assert.equal(getRoomRoundBattleSpeed(queued), .75);
});
