import assert from 'node:assert/strict';
import test from 'node:test';
import { getBattleFormation, getTableGeometry } from './battleLayout';
import { tableCardPositions, type TableCardPosition } from './tableCardLayout';
import { tableCardClash } from './tableCardMotion';

test('two to eight cards contract and return without crossing or covering another played card', () => {
  for (const width of [320, 390, 768, 844, 1024, 1440, 1920, 3627]) for (const height of [320, 550, 760]) {
    for (let total = 2; total <= 8; total++) {
      const bounds = { width, height }, seats = getBattleFormation(total, 0, width < 768, bounds);
      const positions = tableCardPositions(seats, bounds), clash = tableCardClash(positions, bounds);
      assert.equal(clash.offsets.length, total);
      assert.ok(clash.fraction >= 0 && clash.fraction <= .22);
      const context = `${total} cards at ${width}×${height}`;
      // Intermediate positions describe the approach, small recoil, and return.
      for (const phase of [0, .5, 1, .9, 1, .5, 0]) {
        const angle = 3 * Math.PI / 180;
        const boxes = positions.map((position, index) => {
          const h = position.cardHeight + position.ownerHeight + position.ownerGap;
          const halfWidth = (position.width * Math.cos(angle) + h * Math.sin(angle)) / 2;
          const halfHeight = (h * Math.cos(angle) + position.width * Math.sin(angle)) / 2;
          const x = position.x * width / 100 + clash.offsets[index].x * phase;
          const y = position.y * height / 100 + clash.offsets[index].y * phase;
          return { left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight };
        });
        boxes.forEach((a, i) => {
          for (const b of boxes.slice(i + 1)) assert.ok(a.right <= b.left + .001 || a.left >= b.right - .001
            || a.bottom <= b.top + .001 || a.top >= b.bottom - .001, context);
          const corners = getTableGeometry(width < 768).corners.map(p => ({ x: p.x * width / 100, y: p.y * height / 100 }));
          for (const point of [{ x: a.left, y: a.top }, { x: a.right, y: a.top }, { x: a.left, y: a.bottom }, { x: a.right, y: a.bottom }]) {
            for (let edge = 0; edge < corners.length; edge++) {
              const from = corners[edge], to = corners[(edge + 1) % corners.length];
              assert.ok((to.x - from.x) * (point.y - from.y) - (to.y - from.y) * (point.x - from.x) >= -.01, 'Inside tabletop: ' + context);
            }
          }
        });
      }
    }
  }
});

test('clash paths belong to every roster slot rather than the subset of living players', () => {
  const bounds = { width: 1440, height: 760 };
  const seats = getBattleFormation(8, 0, false, bounds), slots = tableCardPositions(seats, bounds);
  const expected = tableCardClash(slots, bounds);
  assert.deepEqual(tableCardClash([...slots].reverse(), bounds).offsets, [...expected.offsets].reverse());
  const active = [1, 3, 7];
  assert.deepEqual(active.map(index => tableCardClash(slots, bounds).offsets[index]), active.map(index => expected.offsets[index]));
  for (const offset of expected.offsets) assert.ok(Number.isFinite(offset.x) && Number.isFinite(offset.y));
});

test('a spacious duel moves visibly inward while a crowded pair never forces overlap', () => {
  const make = (x: number, y: number): TableCardPosition => ({ x, y, width: 80, cardHeight: 92, ownerHeight: 18, ownerGap: 4, compact: false });
  const duel = tableCardClash([make(50, 35), make(50, 75)], { width: 1440, height: 760 });
  assert.ok(duel.offsets[0].y > 25);
  assert.ok(duel.offsets[1].y < -25);
  const tight = tableCardClash([make(40, 50), make(49, 50)], { width: 1000, height: 600 });
  assert.ok(tight.fraction < .1);
  assert.deepEqual(tableCardClash([], { width: 0, height: 0 }).offsets, []);
});
