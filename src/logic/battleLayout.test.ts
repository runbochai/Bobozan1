import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_DIRECTIONS, directionToward, getBattleSeat, seatedDirection } from './battleLayout';

test('all eight compass positions face the center without flipping front and back', () => {
  const positions = [{ x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 100 }, { x: 50, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 50 }, { x: 0, y: 0 }];
  assert.deepEqual(positions.map(seat => directionToward(seat, { x: 50, y: 50 })), BATTLE_DIRECTIONS);
});

test('every viewer from two to eight players owns the foreground camera and unique seats', () => {
  for (const compact of [false, true]) for (let total = 2; total <= 8; total++) for (let viewer = 0; viewer < total; viewer++) {
    const seats = Array.from({ length: total }, (_, i) => getBattleSeat(i, total, viewer, compact));
    assert.equal(new Set(seats.map(seat => `${seat.x},${seat.y}`)).size, total);
    assert.deepEqual(seats[viewer], { x: 50, y: 88 });
    for (const seat of seats) assert.ok(seat.x >= 10 && seat.x <= 90 && seat.y >= 25 && seat.y <= 88);
  }
});

test('four-player opponents face inward from the far, left and right table edges', () => {
  for (const compact of [false, true]) for (let viewer = 0; viewer < 4; viewer++) {
    const opponents = Array.from({ length: 4 }, (_, i) => getBattleSeat(i, 4, viewer, compact)).filter((_, i) => i !== viewer);
    assert.equal(opponents.filter(s => s.x === 50 && s.y < 45).length, 1);
    assert.equal(opponents.filter(s => s.x < 30 && s.y > 45).length, 1);
    assert.equal(opponents.filter(s => s.x > 70 && s.y > 45).length, 1);
    assert.deepEqual(opponents.map(s => seatedDirection(s)).sort(), ['s', 'se', 'sw']);
  }
});

test('opponents never occupy the central foreground hand or reveal area', () => {
  for (const compact of [false, true]) for (let total = 2; total <= 8; total++) {
    for (let i = 1; i < total; i++) {
      const seat = getBattleSeat(i, total, 0, compact);
      assert.ok(seat.y < 46 || seat.x < 30 || seat.x > 70);
      assert.ok(['s', 'sw', 'se'].includes(seatedDirection(seat)));
    }
  }
});
