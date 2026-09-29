import assert from 'node:assert/strict';
import test from 'node:test';
import { getBattleFigure, getBattleFormation, getBattleStatusOffset, getTableGeometry, type BattleBounds } from './battleLayout';
import { tableCardPositions } from './tableCardLayout';

const viewportWidths = [320, 390, 767, 768, 844, 900, 1024, 1199, 1200, 1440, 1920, 3627];
const stageBounds = (width: number, count: number): BattleBounds => ({
  width, height: width < 768 ? (count <= 4 ? 680 : 960) : count === 8 && width <= 900 ? 1100
    : count === 7 && width <= 1199 ? 1000 : width >= 1600 ? 900 : 760,
});

test('two to eight seat-owned cards fit inside the tabletop without intersecting', () => {
  for (const width of viewportWidths) for (let total = 2; total <= 8; total++) {
    const bounds = stageBounds(width, total), compact = width < 768;
    const seats = getBattleFormation(total, 0, compact, bounds), positions = tableCardPositions(seats, bounds);
    const context = total + ' players at ' + width + '×' + bounds.height;
    assert.equal(positions.length, total, context);
    assert.ok(positions.every(p => p.width >= (compact ? 26 : 48)), 'Readable cards: ' + context);
    const boxes = positions.map(p => ({ left: p.x * width / 100 - p.width / 2, top: p.y * bounds.height / 100 - (p.width * 1.15 + 22) / 2, right: p.x * width / 100 + p.width / 2, bottom: p.y * bounds.height / 100 + (p.width * 1.15 + 22) / 2 }));
    const table = getTableGeometry(compact).corners.map(p => ({ x: p.x * width / 100, y: p.y * bounds.height / 100 }));
    for (const [i, box] of boxes.entries()) {
      for (const point of [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.left, y: box.bottom }, { x: box.right, y: box.bottom }]) {
        for (let edge = 0; edge < table.length; edge++) {
          const a = table[edge], b = table[(edge + 1) % table.length];
          assert.ok((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= -.01, 'Card inside table: ' + context);
        }
      }
      for (const other of boxes.slice(i + 1)) assert.ok(box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom, 'Cards separated: ' + context);
      for (const [index, seat] of seats.entries()) {
        const modelWidth = seat.size!, modelHeight = modelWidth * 4 / 3;
        const figure = getBattleFigure(seat, index === 0, bounds);
        const x = figure.x * width / 100, top = figure.y * bounds.height / 100 - modelHeight * (index === 0 ? .5 : .55);
        const clear = (other: typeof box) => box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom;
        assert.ok(clear({ left: x - modelWidth * .38, right: x + modelWidth * .38, top: top + modelHeight * .09, bottom: top + modelHeight * (figure.foreground ? .93 : .60) }), 'Visible character stays clear: ' + context);
        if (index !== 0) {
          const labelWidth = Math.min(compact ? 86 : 116, modelWidth + 12), bottom = top + modelHeight * .04;
          const labelX = x + getBattleStatusOffset(seat, false, bounds);
          assert.ok(clear({ left: labelX - labelWidth / 2, right: labelX + labelWidth / 2, top: bottom - 45, bottom }), 'HUD stays clear: ' + context);
        }
      }
    }
  }
});

test('intermediate resize widths preserve every card and its seat ordering', () => {
  for (let width = 320; width <= 1920; width += 32) for (let total = 2; total <= 8; total++) {
    const bounds = stageBounds(width, total), seats = getBattleFormation(total, 0, width < 768, bounds);
    const positions = tableCardPositions(seats, bounds);
    assert.equal(positions.length, total, total + ' players at width ' + width);
    positions.forEach((p, index) => {
      assert.ok(Math.abs(seats[index].x - 50) < .001 || Math.sign(p.x - 50) === Math.sign(seats[index].x - 50));
      assert.ok(p.y <= positions[0].y + .001, 'No opponent card moves past the near-side owner');
    });
  }
});

test('the complete roster owns one inner square with the same ordered seats', () => {
  for (const width of viewportWidths) for (let total = 2; total <= 8; total++) {
    const bounds = stageBounds(width, total), compact = width < 768;
    const { corners } = getTableGeometry(compact);
    const undo = (point: { x: number; y: number }) => {
      const depth = (point.y - corners[0].y) / (corners[3].y - corners[0].y);
      const half = (corners[1].x - 50) * (1 - depth) + (corners[2].x - 50) * depth;
      return { u: (point.x - 50) / half, v: depth * 2 - 1 };
    };
    const seats = getBattleFormation(total, 0, compact, bounds), positions = tableCardPositions(seats, bounds);
    const outer = seats.map(undo), inner = positions.map(undo);
    assert.equal(inner.length, outer.length);
    const leftmost = outer.reduce((best, p, index) => p.u < outer[best].u ? index : best, 0);
    const farthest = outer.reduce((best, p, index) => p.v < outer[best].v ? index : best, 0);
    const scale = total === 2 ? (inner[0].v - inner[1].v) / 2 : inner[leftmost].u / outer[leftmost].u;
    const offset = inner[0].v - outer[0].v * scale;
    assert.ok(scale > 0 && scale < 1);
    assert.ok(inner[0].v > inner[farthest].v);
    outer.forEach((seat, index) => {
      assert.ok(Math.abs(inner[index].u - seat.u * scale) < 1e-7);
      assert.ok(Math.abs(inner[index].v - (seat.v * scale + offset)) < 1e-7);
    });
    assert.equal(positions[0].x, 50, 'Own card stays above own center seat');
    if (total === 2) assert.ok(Math.abs(positions[1].x - 50) < 1e-8, 'Duel card stays directly opposite');
  }
});

test('viewer reordering and players sitting out never reassign a card slot', () => {
  for (const width of [320, 844, 1440]) for (let total = 2; total <= 8; total++) {
    const bounds = stageBounds(width, total), compact = width < 768;
    const seats = getBattleFormation(total, 0, compact, bounds), expected = tableCardPositions(seats, bounds);
    assert.deepEqual(tableCardPositions([...seats].reverse(), bounds), [...expected].reverse());
    for (let viewer = 0; viewer < total; viewer++) {
      const changed = getBattleFormation(total, viewer, compact, bounds), positions = tableCardPositions(changed, bounds);
      positions.forEach((p, index) => assert.deepEqual(p, expected[(index - viewer + total) % total]));
    }
    const participating = [0, total - 1];
    assert.deepEqual(participating.map(i => tableCardPositions(seats, bounds)[i]), participating.map(i => expected[i]));
  }
});

test('empty or unmeasured boards do not produce invalid positions', () => {
  assert.deepEqual(tableCardPositions([], { width: 1440, height: 760 }), []);
  const seats = getBattleFormation(2, 0);
  assert.deepEqual(tableCardPositions(seats, { width: 0, height: 0 }), []);
  assert.deepEqual(tableCardPositions(seats, { width: Number.POSITIVE_INFINITY, height: 760 }), []);
});
