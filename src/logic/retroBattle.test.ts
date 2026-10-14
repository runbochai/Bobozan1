import test from 'node:test';
import assert from 'node:assert/strict';
import { retroRoundTiming, retroSeat, retroSlamTargets, retroSlamTilt } from './retroBattle';
import { CARD_COMPARE_END_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_START_MS,
  CARD_LAND_MS, CARD_RELEASE_MS, SOLO_MOTION_SCALE, showdownDurationMs } from '../data/battleTiming';

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
  assert.equal(first.flightDelay, CARD_RELEASE_MS * SOLO_MOTION_SCALE);
  assert.equal(first.flightDuration, (CARD_LAND_MS - CARD_RELEASE_MS) * SOLO_MOTION_SCALE);
  assert.equal(first.slamDelay, CARD_COMPARE_START_MS * SOLO_MOTION_SCALE);
  assert.equal(first.impactDelay, CARD_COMPARE_IMPACT_MS * SOLO_MOTION_SCALE);
  const late = retroRoundTiming(1000, 1000 + CARD_COMPARE_END_MS * SOLO_MOTION_SCALE + 200);
  assert.ok(late.flightDelay < -late.flightDuration);
  assert.ok(late.slamDelay < -late.slamDuration);
  assert.ok(late.impactDelay < -late.impactDuration);
  assert.equal(retroRoundTiming(1000, 900).elapsed, 0);
});

test('retro flight and the full winning slam finish on the shared fast multiplayer deadline', () => {
  const timing = retroRoundTiming(1000, 1000);
  assert.equal(timing.flightDelay + timing.flightDuration, 252);
  assert.equal(timing.slamDelay + timing.slamDuration, 588);
  assert.equal(timing.impactDelay + timing.impactDuration, 588);
  assert.ok(timing.impactDelay > timing.slamDelay);
  assert.ok(timing.slamDelay + timing.slamDuration < showdownDurationMs(false, 'room'));
  for (const now of [1100, 1500, 1800]) {
    const late = retroRoundTiming(1000, now);
    assert.equal(now + late.flightDelay + late.flightDuration, 1252);
    assert.equal(now + late.slamDelay + late.slamDuration, 1588);
    assert.equal(now + late.impactDelay + late.impactDuration, 1588);
  }
});

test('slam tilt is deterministic for room snapshots and changes with each turn', () => {
  assert.equal(retroSlamTilt('host', 5), retroSlamTilt('host', 5));
  assert.notEqual(retroSlamTilt('host', 5), retroSlamTilt('host', 6));
  assert.ok(retroSlamTilt('opponent', 45) >= -40);
  assert.ok(retroSlamTilt('opponent', 45) < 40);
});

test('simultaneous retro winners retain distinct faces and owner labels on every board size', () => {
  assert.deepEqual(retroSlamTargets(1, { width: 320, height: 325 }, { width: 46, height: 75 }), [{ x: 50, y: 45, scale: 1.8 }]);
  for (const width of [320, 390, 701, 1440]) for (const height of [250, 325, 390, 720]) {
    const card = width <= 380 ? { width: 46, height: 75 } : width <= 700 ? { width: 54, height: 84 } : { width: 78, height: 118 };
    for (let count = 2; count <= 8; count++) {
      const targets = retroSlamTargets(count, { width, height }, card);
      const boxes = targets.map(({ x, y, scale }) => ({ left: x * width / 100 - card.width * scale / 2,
        right: x * width / 100 + card.width * scale / 2, top: y * height / 100 - card.height * scale / 2,
        bottom: y * height / 100 + card.height * scale / 2 + 18 * scale }));
      boxes.forEach((box, index) => {
        assert.ok(box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height);
        for (const other of boxes.slice(index + 1)) assert.ok(box.right <= other.left || box.left >= other.right
          || box.bottom <= other.top || box.top >= other.bottom, `${count} winners overlap on ${width}×${height}`);
      });
    }
  }
});
