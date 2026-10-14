import assert from 'node:assert/strict';
import test from 'node:test';
import { getTableGeometry } from './battleLayout';
import { battleCardSlamPositions } from './battleCardSlam';

const winners = (count: number, width = 42) => Array.from({ length: count }, (_, index) => ({ index, width, cardHeight: width * 1.15 }));

test('every winner has a distinct visible showcase on phone, tablet, and desktop boards', () => {
  for (const width of [320, 390, 767, 768, 844, 1440, 1920]) for (const height of [320, 415, 760, 1100]) {
    for (let count = 1; count <= 8; count++) for (const sourceWidth of [22, 42, 80, 96]) {
      const entries = winners(count, sourceWidth), positions = battleCardSlamPositions(entries, { width, height });
      const context = `${count} winners at ${width}×${height}, source ${sourceWidth}`;
      assert.deepEqual(positions.map(position => position.index), entries.map(entry => entry.index), context);
      const boxes = positions.map(position => {
        for (const value of Object.values(position)) assert.ok(Number.isFinite(value), context);
        assert.ok(position.width > 0 && position.cardHeight > 0 && position.labelHeight >= 28, context);
        assert.equal(position.cardHeight, position.width * 1.5, context);
        assert.equal(position.scale, 1.75, context);
        const fullHeight = position.cardHeight + position.labelHeight;
        return { left: position.x - position.width / 2, right: position.x + position.width / 2,
          top: position.y - fullHeight / 2, bottom: position.y + fullHeight / 2 };
      });
      boxes.forEach((box, index) => {
        assert.ok(box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height, context);
        for (const other of boxes.slice(index + 1)) assert.ok(box.right <= other.left || box.left >= other.right
          || box.bottom <= other.top || box.top >= other.bottom, context);
      });
    }
  }
});

test('a spacious duel enlarges the winning face while preserving room for readable labels', () => {
  for (const bounds of [{ width: 390, height: 760 }, { width: 1440, height: 760 }]) {
    const sourceWidth = bounds.width < 768 ? 42 : 80;
    const [position] = battleCardSlamPositions(winners(1, sourceWidth), bounds);
    const center = getTableGeometry(bounds.width < 768).center;
    assert.ok(position.width > sourceWidth * 1.5);
    assert.ok(position.width <= (bounds.width < 768 ? 104 : 150));
    assert.equal(position.x, center.x * bounds.width / 100);
    assert.equal(position.y, center.y * bounds.height / 100);
    assert.equal(position.labelHeight, bounds.width < 768 ? 28 : 32);
  }
});

test('short final rows remain centered and preserve the supplied winner identity order', () => {
  const entries = winners(7).map((winner, index) => ({ ...winner, index: 20 - index * 2 }));
  const bounds = { width: 320, height: 320 };
  const positions = battleCardSlamPositions(entries, bounds);
  assert.deepEqual(positions.map(position => position.index), entries.map(entry => entry.index));
  const rows = new Map<number, typeof positions>();
  positions.forEach(position => rows.set(position.y, [...(rows.get(position.y) ?? []), position]));
  assert.ok(rows.size > 1, 'Crowded winners use multiple rows instead of hiding a play');
  assert.ok(new Set([...rows.values()].map(row => row.length)).size > 1, 'Exercise a partial row');
  for (const row of rows.values()) {
    assert.ok(Math.abs((row[0].x + row[row.length - 1].x) / 2 - bounds.width / 2) < 1e-6);
    for (let index = 1; index < row.length; index++) assert.ok(row[index].x > row[index - 1].x);
  }
  assert.deepEqual(battleCardSlamPositions(entries, bounds), positions, 'Layout is stable between renders');
});

test('missing geometry and malformed dimensions never create invalid presentation coordinates', () => {
  assert.deepEqual(battleCardSlamPositions([], { width: 1440, height: 760 }), []);
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(battleCardSlamPositions(winners(1), { width: value, height: 760 }), []);
    assert.deepEqual(battleCardSlamPositions(winners(1), { width: 1440, height: value }), []);
    assert.deepEqual(battleCardSlamPositions([{ index: 0, width: value, cardHeight: 42 }], { width: 1440, height: 760 }), []);
    assert.deepEqual(battleCardSlamPositions([{ index: 0, width: 42, cardHeight: value }], { width: 1440, height: 760 }), []);
  }
});
