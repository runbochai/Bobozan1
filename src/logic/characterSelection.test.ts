import assert from 'node:assert/strict';
import test from 'node:test';
import { characterTurnTo, wrapCharacterIndex } from './characterSelection';

test('a thirteen-character wheel loops in both directions across repeated revolutions', () => {
  assert.equal(wrapCharacterIndex(-1, 13), 12);
  assert.equal(wrapCharacterIndex(13, 13), 0);
  assert.equal(wrapCharacterIndex(-40, 13), 12);
  assert.equal(wrapCharacterIndex(40, 13), 1);
});

test('clicking a character takes the shortest route without resetting the wheel rotation', () => {
  assert.equal(characterTurnTo(12, 0, 13), -1);
  assert.equal(characterTurnTo(0, 12, 13), 13);
  assert.equal(characterTurnTo(3, 28, 13), 29);
  assert.equal(characterTurnTo(2, -26, 13), -24);
  for (let current = -26; current <= 26; current++) {
    for (let target = 0; target < 13; target++) {
      const next = characterTurnTo(target, current, 13);
      assert.equal(wrapCharacterIndex(next, 13), target);
      assert.ok(Math.abs(next - current) <= 6);
    }
  }
});
