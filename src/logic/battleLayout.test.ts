import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_DIRECTIONS, SELF_SEAT, directionToward, directionTowardTable, getBattleFigure, getBattleFigureAnchor, getBattleFormation, getBattleSeat, getBattleStatusOffset, getTableGeometry, type BattleSeat } from './battleLayout';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} should equal ${b}`);
const fixed = (seat: BattleSeat) => ({ x: seat.x, y: seat.y, facing: seat.facing, edge: seat.edge, sideIndex: seat.sideIndex, tableSides: seat.tableSides });
const widths = [320, 390, 767, 768, 844, 1024, 1440, 1920, 3627];
const heights = [320, 420, 540, 640, 760, 960];

test('atlas compass directions remain consistent', () => {
  const points = [{ x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 100 },
    { x: 50, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 50 }, { x: 0, y: 0 }];
  assert.deepEqual(points.map(seat => directionToward(seat, { x: 50, y: 50 })), BATTLE_DIRECTIONS);
});

test('three to eight players receive the matching convex polygon; duels share a four-sided table', () => {
  for (let total = 2; total <= 8; total++) {
    const table = getTableGeometry(false, total), expected = total === 2 ? 4 : total;
    assert.equal(table.sides, expected);
    assert.equal(table.vertices.length, expected);
    assert.deepEqual(getTableGeometry(true, total), table, 'A phone uses the same physical table');
    close((table.vertices[0].x + table.vertices[1].x) / 2, SELF_SEAT.x);
    close(table.vertices[0].y, SELF_SEAT.y);
    close(table.vertices[1].y, SELF_SEAT.y);
    table.vertices.forEach((a, index) => {
      const b = table.vertices[(index + 1) % expected], c = table.vertices[(index + 2) % expected];
      assert.ok((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) < 0, 'Every edge belongs to one convex tabletop');
      assert.ok(a.x >= 12 - 1e-8 && a.x <= 88 + 1e-8 && a.y >= 25 - 1e-8 && a.y <= 85 + 1e-8);
      const mirror = table.vertices[(1 - index + expected) % expected];
      close(a.x + mirror.x, 100); close(a.y, mirror.y);
    });
    assert.equal(table.center.x, 50);
  }
});

test('each fixed seat is exactly the midpoint of its own edge, with the viewer always front-center', () => {
  for (let total = 2; total <= 8; total++) {
    const table = getTableGeometry(false, total), seats = getBattleFormation(total, 0);
    assert.equal(new Set(seats.map(seat => seat.sideIndex)).size, total);
    seats.forEach((seat, index) => {
      const edge = seat.sideIndex!, a = table.vertices[edge], b = table.vertices[(edge + 1) % table.sides];
      close(seat.x, (a.x + b.x) / 2); close(seat.y, (a.y + b.y) / 2);
      assert.equal(seat.tableSides, table.sides);
      assert.equal(seat.facing, directionTowardTable(seat));
      const mirror = seats[(total - index) % total];
      close(seat.x + mirror.x, 100); close(seat.y, mirror.y);
    });
    assert.equal(seats[0].x, SELF_SEAT.x); assert.equal(seats[0].y, SELF_SEAT.y); assert.equal(seats[0].facing, 'n');
    if (total === 2) assert.deepEqual(fixed(seats[1]), { x: 50, y: 25, facing: 's', edge: 'far', sideIndex: 2, tableSides: 4 });
  }
});

test('resizing only changes model sizes, never coordinates, edge ownership, or facing', () => {
  for (let total = 2; total <= 8; total++) {
    const expected = getBattleFormation(total, 0).map(fixed);
    for (const width of widths) for (const height of heights) {
      const seats = getBattleFormation(total, 0, width < 768, { width, height });
      assert.deepEqual(seats.map(fixed), expected, `${total} players at ${width}×${height}`);
    }
  }
});

test('changing the viewer rotates roster ownership without rotating or repacking the physical table', () => {
  for (const width of [320, 844, 1440]) for (let total = 2; total <= 8; total++) {
    const bounds = { width, height: 640 }, expected = getBattleFormation(total, 0, width < 768, bounds);
    for (let viewer = 0; viewer < total; viewer++) {
      const seats = getBattleFormation(total, viewer, width < 768, bounds);
      seats.forEach((seat, index) => assert.deepEqual(seat, expected[(index - viewer + total) % total]));
      assert.equal(seats[viewer].facing, 'n');
      assert.deepEqual(getBattleSeat(viewer, total, viewer, width < 768, bounds), seats[viewer]);
    }
    // Death/commit state is deliberately absent from this API: the full roster
    // remains the seating contract for the entire match.
    assert.deepEqual(getBattleFormation(total, total + 1, width < 768, bounds), getBattleFormation(total, 1, width < 768, bounds));
  }
});

test('models remain attached at the waist, with visible figures and status labels inside the stage and clear of each other', () => {
  for (const width of widths) for (const height of heights) for (let total = 2; total <= 8; total++) {
    const bounds = { width, height }, seats = getBattleFormation(total, 0, width < 768, bounds);
    const original = JSON.stringify(seats), context = `${total} players at ${width}×${height}`;
    const groups = seats.map((seat, index) => {
      const figure = getBattleFigure(seat, index === 0, bounds), size = seat.size!, h = size * 4 / 3;
      assert.equal(figure.x, seat.x, context); assert.equal(figure.y, seat.y, context);
      assert.ok(Number.isFinite(size) && size >= 22, context);
      const anchor = getBattleFigureAnchor(seat, index === 0);
      assert.equal(anchor, index === 0 ? .5 : figure.foreground ? .55 : .68);
      const x = figure.x * width / 100, top = figure.y * height / 100 - h * anchor;
      assert.ok(x - size / 2 >= 5.99 && x + size / 2 <= width - 5.99, 'Model width: ' + context);
      assert.ok(top >= 3.99, 'Head stays inside stage: ' + context);
      if (index === 0) assert.ok(top + h <= height - 3.99, 'Viewer stays inside stage: ' + context);
      const regions = [{ left: x - size * .38, right: x + size * .38,
        top: top + h * .09, bottom: top + h * (figure.foreground ? .93 : anchor + .05) }];
      const offset = getBattleStatusOffset(seat, index === 0, bounds);
      assert.ok(Math.abs(offset) <= 28);
      if (index === 0 || !figure.foreground) assert.equal(offset, 0);
      else if (Math.abs(seat.x - 50) > 1e-8) assert.equal(Math.sign(offset), Math.sign(seat.x - 50));
      if (index > 0) {
        const labelWidth = Math.min(width < 768 ? 86 : 116, size + 12), labelX = x + offset;
        const bottom = top + h * (figure.foreground ? .04 : .17);
        assert.ok(labelX - labelWidth / 2 >= 5.99 && labelX + labelWidth / 2 <= width - 5.99, 'Status width: ' + context);
        assert.ok(bottom - 45 >= 3.99, 'Status top: ' + context);
        regions.push({ left: labelX - labelWidth / 2, right: labelX + labelWidth / 2, top: bottom - 45, bottom });
      }
      return regions;
    });
    groups.forEach((regions, index) => groups.slice(index + 1).forEach(other => regions.forEach(a => other.forEach(b => {
      assert.ok(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom, 'Readable neighboring models/status: ' + context);
    }))));
    assert.equal(JSON.stringify(seats), original, 'Visual helpers never mutate seats');
  }
});

test('invalid rosters and unmeasured bounds retain safe fallbacks', () => {
  assert.deepEqual(getBattleFormation(0, 0), []);
  assert.deepEqual(getBattleFormation(Number.NaN, 0), []);
  assert.equal(getBattleSeat(0, 0, 0).facing, 'n');
  const seats = getBattleFormation(8, 0, true, { width: 0, height: Number.NaN });
  assert.ok(seats.every(seat => Number.isFinite(seat.x) && Number.isFinite(seat.y) && Number.isFinite(seat.size)));
});
