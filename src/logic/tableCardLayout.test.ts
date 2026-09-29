import assert from 'node:assert/strict';
import test from 'node:test';
import { getBattleFormation, getTableGeometry, type BattleBounds } from './battleLayout';
import { tableCardPositions } from './tableCardLayout';

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const viewportWidths = [320, 390, 768, 844, 1024, 1440, 1920, 3627];
const stageBounds = (width: number, count: number): BattleBounds => ({
  width, height: width < 768 ? (count <= 4 ? 680 : 960) : count === 8 && width <= 900 ? 1100
    : count === 7 && width <= 1199 ? 1000 : width >= 1600 ? 900 : 760,
});

test('two to eight played cards fit the table and clear every visible actor and status label', () => {
  for (const width of viewportWidths) for (let total = 2; total <= 8; total++) {
    const bounds = stageBounds(width, total), compact = width < 768;
    const seats = getBattleFormation(total, 0, compact, bounds);
    const positions = tableCardPositions(total, seats, bounds);
    const context = `${total} players at ${width}×${bounds.height}`;
    assert.equal(positions.length, total, context);
    assert.ok(positions.every(p => p.width >= (compact ? 28 : 56)), `Readable card width: ${context}`);
    const boxes = positions.map(p => ({ x: p.x * width / 100 - p.width / 2, y: p.y * bounds.height / 100 - (p.width * 1.5 + 25) / 2, width: p.width, height: p.width * 1.5 + 25 }));
    const table = getTableGeometry(compact).corners.map(p => ({ x: p.x * width / 100, y: p.y * bounds.height / 100 }));
    for (const [i, box] of boxes.entries()) {
      // A convex trapezoid contains the whole card if all four corners lie in it.
      for (const point of [{ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y }, { x: box.x, y: box.y + box.height }, { x: box.x + box.width, y: box.y + box.height }]) {
        for (let edge = 0; edge < table.length; edge++) {
          const a = table[edge], b = table[(edge + 1) % table.length];
          assert.ok((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= -.01, `Card inside table: ${context}`);
        }
      }
      for (const other of boxes.slice(i + 1)) assert.ok(!overlaps(box, other), `Cards separated: ${context}`);
      for (const [index, seat] of seats.entries()) {
        const modelWidth = seat.size!, modelHeight = modelWidth * 4 / 3;
        const x = seat.x * width / 100, y = seat.y * bounds.height / 100;
        const core = { x: x - modelWidth * .38, y: y - modelHeight * .91, width: modelWidth * .76, height: modelHeight * .84 };
        assert.ok(!overlaps(box, core), `Actor stays visible: ${context}, seat ${index}`);
        if (index !== 0) {
          const labelWidth = Math.min(compact ? 86 : 116, modelWidth + 12);
          assert.ok(!overlaps(box, { x: x - labelWidth / 2, y: y - modelHeight * .96 - 45, width: labelWidth, height: 45 }), `Status stays visible: ${context}, seat ${index}`);
        }
      }
    }
  }
});

test('partial showdowns stay deterministic and use all occupied seats for avoidance', () => {
  for (const width of [320, 844, 1440]) {
    const bounds = stageBounds(width, 8), seats = getBattleFormation(8, 3, width < 768, bounds);
    for (let count = 1; count <= 8; count++) {
      const positions = tableCardPositions(count, seats, bounds);
      assert.equal(positions.length, count);
      assert.deepEqual(tableCardPositions(count, [...seats].reverse(), bounds), positions);
      assert.deepEqual(tableCardPositions(count, seats, bounds), positions);
    }
  }
});

test('empty or unmeasured boards do not produce invalid positions', () => {
  assert.deepEqual(tableCardPositions(0, [], { width: 1440, height: 760 }), []);
  assert.deepEqual(tableCardPositions(3, [], { width: 0, height: 0 }), []);
  assert.deepEqual(tableCardPositions(3, [], { width: Number.POSITIVE_INFINITY, height: 760 }), []);
  assert.deepEqual(tableCardPositions(Number.NaN, [], { width: 1440, height: 760 }), []);
});
