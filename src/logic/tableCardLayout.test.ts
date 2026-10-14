import assert from 'node:assert/strict';
import test from 'node:test';
import { getBattleFigure, getBattleFigureAnchor, getBattleFormation, getBattleStatusOffset, getTableGeometry, type BattleBounds } from './battleLayout';
import { tableCardPositions, type TableCardPosition } from './tableCardLayout';

const widths = [320, 360, 390, 767, 768, 844, 1024, 1440, 1920, 3627];
const heights = [320, 400, 420, 540, 640, 760, 960];
const boxFor = (position: TableCardPosition, bounds: BattleBounds) => {
  const h = position.cardHeight + position.ownerHeight + position.ownerGap, angle = 3 * Math.PI / 180;
  const halfWidth = (position.width * Math.cos(angle) + h * Math.sin(angle)) / 2;
  const halfHeight = (h * Math.cos(angle) + position.width * Math.sin(angle)) / 2;
  const x = position.x * bounds.width / 100, y = position.y * bounds.height / 100;
  return { left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight };
};
type Box = ReturnType<typeof boxFor>;
const clear = (a: Box, b: Box) => a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;

function assertSafe(width: number, height: number, total: number) {
  const bounds = { width, height }, compact = width < 768, context = `${total} players at ${width}×${height}`;
  const seats = getBattleFormation(total, 0, compact, bounds), positions = tableCardPositions(seats, bounds);
  assert.equal(positions.length, total, 'Every roster slot displays its play: ' + context);
  const table = getTableGeometry(compact, total).vertices.map(point => ({ x: point.x * width / 100, y: point.y * height / 100 }));
  const boxes = positions.map(position => {
    assert.ok(position.width >= 22 && Number.isFinite(position.width), 'Readable bounded card size: ' + context);
    assert.equal(position.cardHeight, position.width * (position.compact ? 1 : 1.15));
    assert.ok([0, 10, 18].includes(position.ownerHeight));
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
    return boxFor(position, bounds);
  });
  boxes.forEach((box, index) => {
    for (const point of [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.left, y: box.bottom }, { x: box.right, y: box.bottom }]) {
      table.forEach((a, edge) => {
        const b = table[(edge + 1) % table.length];
        assert.ok((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) <= .01, 'Entire tilted card and owner row inside matching polygon: ' + context);
      });
    }
    boxes.slice(index + 1).forEach(other => assert.ok(clear(box, other), 'Seat-owned cards do not overlap: ' + context));
    seats.forEach((seat, player) => {
      const figure = getBattleFigure(seat, player === 0, bounds), size = seat.size!, h = size * 4 / 3;
      const anchor = getBattleFigureAnchor(seat, player === 0);
      const x = figure.x * width / 100, top = figure.y * height / 100 - h * anchor;
      assert.ok(clear(box, { left: x - size * .38, right: x + size * .38, top: top + h * .09,
        bottom: top + h * (figure.foreground ? .93 : anchor + .05) }), 'Character remains visible: ' + context);
      if (player > 0) {
        const labelWidth = Math.min(compact ? 86 : 116, size + 12), labelX = x + getBattleStatusOffset(seat, false, bounds);
        const bottom = top + h * (figure.foreground ? .04 : .17);
        assert.ok(clear(box, { left: labelX - labelWidth / 2, right: labelX + labelWidth / 2, top: bottom - 45, bottom }), 'Status remains visible: ' + context);
      }
    });
  });
  return positions;
}

test('two to eight played cards, including owner rows and reveal tilt, fit their actual polygon and clear the fixed models', () => {
  for (const width of widths) for (const height of heights) for (let total = 2; total <= 8; total++) assertSafe(width, height, total);
});

test('every intermediate resize preserves all roster slots without hiding crowded seven/eight-player plays', () => {
  for (let width = 320; width <= 1920; width += 32) for (const height of [420, 640]) for (let total = 2; total <= 8; total++) {
    const positions = assertSafe(width, height, total);
    positions.forEach(position => assert.ok(position.y <= positions[0].y + 1e-8, 'Viewer owns the nearest card slot'));
  }
});

test('card slots form one inset copy of the seating polygon, retaining each player edge and clockwise order', () => {
  for (const [width, height] of [[320, 320], [320, 640], [390, 540], [844, 420], [1440, 760]]) for (let total = 2; total <= 8; total++) {
    const bounds = { width, height }, seats = getBattleFormation(total, 0, width < 768, bounds);
    const positions = tableCardPositions(seats, bounds), { center } = getTableGeometry(width < 768, total);
    const side = seats.findIndex(seat => Math.abs(seat.x - center.x) > 1);
    const scale = side < 0 ? (positions[0].y - positions[1].y) / (seats[0].y - seats[1].y)
      : (positions[side].x - center.x) / (seats[side].x - center.x);
    const offset = positions[0].y - center.y - (seats[0].y - center.y) * scale;
    assert.ok(scale > 0 && scale < 1);
    seats.forEach((seat, index) => {
      assert.ok(Math.abs(positions[index].x - center.x - (seat.x - center.x) * scale) < 1e-8);
      assert.ok(Math.abs(positions[index].y - center.y - (seat.y - center.y) * scale - offset) < 1e-8);
    });
    assert.equal(positions[0].x, 50);
    if (total === 2) assert.ok(Math.abs(positions[1].x - 50) < 1e-8);
  }
});

test('viewer changes, array ordering, and partial plays never assign an owner to a different fixed card slot', () => {
  for (const width of [320, 390, 844, 1440]) for (let total = 2; total <= 8; total++) {
    const bounds = { width, height: width < 768 ? 640 : 460 }, compact = width < 768;
    const seats = getBattleFormation(total, 0, compact, bounds), expected = tableCardPositions(seats, bounds);
    assert.equal(expected.length, total);
    assert.deepEqual(tableCardPositions([...seats].reverse(), bounds), [...expected].reverse());
    for (let viewer = 0; viewer < total; viewer++) {
      const actual = tableCardPositions(getBattleFormation(total, viewer, compact, bounds), bounds);
      actual.forEach((position, index) => assert.deepEqual(position, expected[(index - viewer + total) % total]));
    }
    const livingPlayersWithCommittedCards = [0, total - 1];
    assert.deepEqual(livingPlayersWithCommittedCards.map(index => tableCardPositions(seats, bounds)[index]),
      livingPlayersWithCommittedCards.map(index => expected[index]));
  }
});

test('empty and unmeasured boards do not produce invalid positions', () => {
  assert.deepEqual(tableCardPositions([], { width: 1440, height: 760 }), []);
  const seats = getBattleFormation(2, 0);
  for (const bounds of [{ width: 0, height: 0 }, { width: Number.POSITIVE_INFINITY, height: 760 }, { width: 390, height: Number.NaN }]) {
    assert.deepEqual(tableCardPositions(seats, bounds), []);
  }
});
