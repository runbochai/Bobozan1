import test from 'node:test';
import assert from 'node:assert/strict';
import { retroRoundTiming, retroSeat, retroSlamTilt } from './retroBattle';
import { CARD_COMPARE_END_MS, CARD_COMPARE_START_MS, CARD_LAND_MS, CARD_RELEASE_MS } from '../data/battleTiming';

test('retro seats rotate around the viewer and all eight avatars stay in the board', () => {
  for (const count of [2, 3, 4, 5, 6, 7, 8]) {
    for (let viewer = 0; viewer < count; viewer++) {
      const self = retroSeat(viewer, count, viewer);
      assert.ok(Math.abs(self.x - 50) < 1e-8);
      assert.equal(self.y, count === 2 ? 74 : 78);
      const points = Array.from({ length: count }, (_, index) => retroSeat(index, count, viewer));
      assert.equal(new Set(points.map(point => `${point.x},${point.y}`)).size, count);
      assert.ok(points.every(point => point.x >= 11 && point.x <= 89 && point.y >= 14 && point.y <= 78));
    }
  }
});

test('seven and eight full phone status panels fit without overlap for every viewer', () => {
  const boardWidth = 320, boardHeight = 325, panelWidth = 65, panelHeight = 92.8;
  for (const count of [7, 8]) {
    for (let viewer = 0; viewer < count; viewer++) {
      const seats = Array.from({ length: count }, (_, index) => retroSeat(index, count, viewer));
      for (let i = 0; i < seats.length; i++) {
        const center = { x: seats[i].x * boardWidth / 100, y: seats[i].y * boardHeight / 100 };
        assert.ok(center.x - panelWidth / 2 >= 0 && center.x + panelWidth / 2 <= boardWidth);
        assert.ok(center.y - panelHeight / 2 >= 0 && center.y + panelHeight / 2 <= boardHeight);
        for (let j = i + 1; j < seats.length; j++) {
          const dx = Math.abs(seats[i].x - seats[j].x) * boardWidth / 100;
          const dy = Math.abs(seats[i].y - seats[j].y) * boardHeight / 100;
          assert.ok(dx >= panelWidth || dy >= panelHeight, `overlapping ${count}-player seats ${i},${j} for viewer ${viewer}`);
        }
      }
    }
  }
});

test('late mounting uses the shared reveal deadline instead of replaying the slam', () => {
  const first = retroRoundTiming(1000, 1000);
  assert.equal(first.flightDelay, CARD_RELEASE_MS);
  assert.equal(first.flightDuration, CARD_LAND_MS - CARD_RELEASE_MS);
  assert.equal(first.slamDelay, CARD_COMPARE_START_MS);
  const late = retroRoundTiming(1000, 1000 + CARD_COMPARE_END_MS + 200);
  assert.ok(late.flightDelay < -late.flightDuration);
  assert.ok(late.slamDelay < -late.slamDuration);
  assert.equal(retroRoundTiming(1000, 900).elapsed, 0);
});

test('slam tilt is deterministic for room snapshots and changes with each turn', () => {
  assert.equal(retroSlamTilt('host', 5), retroSlamTilt('host', 5));
  assert.notEqual(retroSlamTilt('host', 5), retroSlamTilt('host', 6));
  assert.ok(retroSlamTilt('opponent', 45) >= -40);
  assert.ok(retroSlamTilt('opponent', 45) < 40);
});
