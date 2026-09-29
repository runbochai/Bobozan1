import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_DIRECTIONS, directionToward, getBattleSeat } from './battleLayout';

test('all eight compass positions face the center without flipping front and back', () => {
  const positions = [{ x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 100 }, { x: 50, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 50 }, { x: 0, y: 0 }];
  assert.deepEqual(positions.map(seat => directionToward(seat, { x: 50, y: 50 })), BATTLE_DIRECTIONS);
});

test('every viewer from two to eight players gets the near-right seat and unique opponents', () => {
  for (let total = 2; total <= 8; total++) for (let viewer = 0; viewer < total; viewer++) {
    const seats = Array.from({ length: total }, (_, i) => getBattleSeat(i, total, viewer));
    assert.equal(new Set(seats.map(seat => `${seat.x},${seat.y}`)).size, total);
    assert.equal(directionToward(seats[viewer]), 'nw');
    assert.ok(seats[viewer].x > 70 && seats[viewer].y > 70);
    for (const seat of seats) assert.ok(seat.x >= 15 && seat.x <= 85 && seat.y >= 15 && seat.y <= 85);
  }
});
