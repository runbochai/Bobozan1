export type BattleDirection = 's' | 'sw' | 'w' | 'nw' | 'n' | 'ne' | 'e' | 'se';
export const BATTLE_DIRECTIONS: readonly BattleDirection[] = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
export interface BattleSeat {
  x: number;
  y: number;
  size?: number;
  facing?: BattleDirection;
  edge?: 'near' | 'right' | 'far' | 'left';
  /** The fixed polygon edge this roster slot owns, even after its player dies. */
  sideIndex?: number;
  tableSides?: number;
}
export interface BattleBounds { width: number; height: number }
export const SELF_SEAT = { x: 50, y: 85 };

/** One tabletop, in stage percentages. Edge zero is the viewer's horizontal
 * edge; the remaining edges run around the right, far, and left of the table.
 * A duel occupies opposite edges of a four-sided table. Screen aspect ratio
 * never changes the vertices or moves a seat to another part of an edge.
 */
export function getTableGeometry(compact = false, total = 4) {
  // Kept for the public API; screen density does not alter physical geometry.
  void compact;
  const sides = Math.max(3, Math.floor(Number.isFinite(total) && total > 2 ? total : 4));
  const unit = Array.from({ length: sides }, (_, index) => {
    const angle = Math.PI / 2 + Math.PI / sides - index * 2 * Math.PI / sides;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
  const minX = Math.min(...unit.map(point => point.x)), maxX = Math.max(...unit.map(point => point.x));
  const minY = Math.min(...unit.map(point => point.y)), maxY = Math.max(...unit.map(point => point.y));
  const vertices = unit.map(point => ({
    x: 12 + (point.x - minX) / (maxX - minX) * 76,
    y: 25 + (point.y - minY) / (maxY - minY) * 60,
  }));
  // Eliminate harmless floating-point drift at the viewer's edge.
  vertices[0] = { x: vertices[0].x, y: SELF_SEAT.y };
  vertices[1] = { x: 100 - vertices[0].x, y: SELF_SEAT.y };
  const center = { x: 50, y: vertices.reduce((sum, point) => sum + point.y, 0) / sides };
  const frame = { x: 12, y: 25, width: 76, height: 60 };
  // Compatibility bounds for callers that only need the table's envelope.
  const corners = [{ x: 12, y: 25 }, { x: 88, y: 25 }, { x: 88, y: 85 }, { x: 12, y: 85 }];
  return { frame, corners, center, vertices, sides };
}

/** Screen coordinates: positive Y points down. Atlas starts at south, clockwise. */
export function directionToward(seat: BattleSeat, target: BattleSeat = { x: 50, y: 48 }): BattleDirection {
  const angle = Math.atan2(target.y - seat.y, target.x - seat.x);
  const index = Math.round((angle - Math.PI / 2) / (Math.PI / 4));
  return BATTLE_DIRECTIONS[((index % 8) + 8) % 8];
}

/** Choose an atlas view from the table plane, independently of viewport shape. */
export function directionTowardTable(seat: BattleSeat, compact = false): BattleDirection {
  const { center } = getTableGeometry(compact, seat.tableSides);
  return directionToward({ x: (seat.x - center.x) / 38, y: (seat.y - center.y) / 30 }, { x: 0, y: 0 });
}

export function getBattleFormation(total: number, myIndex: number, compact = false,
  bounds: BattleBounds = { width: compact ? 390 : 1440, height: compact ? 900 : 760 }): BattleSeat[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  total = Math.floor(total);
  const { vertices, center, sides } = getTableGeometry(compact, total);
  const seats: BattleSeat[] = Array.from({ length: total }, (_, relative) => {
    const sideIndex = total === 2 ? relative * 2 : relative;
    const a = vertices[sideIndex], b = vertices[(sideIndex + 1) % sides];
    const x = relative === 0 ? SELF_SEAT.x : (a.x + b.x) / 2;
    const y = relative === 0 ? SELF_SEAT.y : (a.y + b.y) / 2;
    const dx = (x - center.x) / 38, dy = (y - center.y) / 30;
    const edge = Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? 'near' : 'far') : (dx > 0 ? 'right' : 'left');
    const seat: BattleSeat = { x, y, edge, sideIndex, tableSides: sides };
    seat.facing = relative === 0 ? 'n' : directionTowardTable(seat, compact);
    return seat;
  });
  const width = Number.isFinite(bounds.width) && bounds.width > 0 ? bounds.width : 390;
  const height = Number.isFinite(bounds.height) && bounds.height > 0 ? bounds.height : 540;
  const scales = seats.map((seat, index) => index === 0 ? 1.16 : .92 + .16 * (seat.y - 25) / 60);
  const widthShare = compact ? (total >= 6 ? .18 : .21) : .17;
  let size = Math.min(width * widthShare, height * (total === 3 ? .17 : .20), 220);
  // The top HUD, head, and waist share one fixed anchor. Shrink the model when
  // space is tight instead of pushing its logical seat around the tabletop.
  seats.forEach((seat, index) => {
    const edgeRoom = Math.min(seat.x, 100 - seat.x) * width / 100 - 6;
    size = Math.min(size, (edgeRoom * 2 - (index === 0 ? 0 : 12)) / scales[index]);
    if (index === 0) size = Math.min(size, (height * .15 - 4) * 1.5 / scales[index]);
    if (index > 0) {
      size = Math.min(size, (seat.y * height / 100 - 49) / (.68 * scales[index]));
      size = Math.min(size, (seat.y * height / 100 - 4) / (4 / 3 * getBattleFigureAnchor(seat, false) * scales[index]));
    }
    for (let other = index + 1; other < total; other++) {
      const dx = Math.abs(seat.x - seats[other].x) * width / 100;
      const dy = Math.abs(seat.y - seats[other].y) * height / 100;
      const horizontal = (dx - 16) / (.43 * (scales[index] + scales[other]));
      const vertical = (dy - 54) / (Math.max(scales[index], scales[other]) * .85);
      size = Math.min(size, Math.max(horizontal, vertical));
    }
  });
  const visibleRegions = (seat: BattleSeat, index: number, candidate: number) => {
    const model = candidate * scales[index], modelHeight = model * 4 / 3;
    const sized = { ...seat, size: model }, x = seat.x * width / 100;
    const anchor = getBattleFigureAnchor(sized, index === 0);
    const top = seat.y * height / 100 - modelHeight * anchor;
    const foreground = getBattleFigure(sized, index === 0, { width, height }).foreground;
    const regions = [{ left: x - model * .38 - 2, right: x + model * .38 + 2,
      top: top + modelHeight * .09 - 2, bottom: top + modelHeight * (foreground ? .93 : anchor + .05) + 2 }];
    if (index > 0) {
      const labelWidth = Math.min(compact ? 86 : 116, model + 12);
      const labelX = x + getBattleStatusOffset(sized, false, { width, height });
      const bottom = top + modelHeight * (foreground ? .04 : .17);
      regions.push({ left: labelX - labelWidth / 2 - 2, right: labelX + labelWidth / 2 + 2,
        top: bottom - 47, bottom: bottom + 2 });
    }
    return regions;
  };
  const figuresOverlap = (candidate: number) => {
    const regions = seats.map((seat, index) => visibleRegions(seat, index, candidate));
    return regions.some((group, index) => regions.slice(index + 1).some(other =>
      group.some(a => other.some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top))));
  };
  while (size > 24 && figuresOverlap(size)) size = Math.max(24, size * .96);
  const viewer = Number.isFinite(myIndex) ? ((Math.floor(myIndex) % total) + total) % total : 0;
  return Array.from({ length: total }, (_, index) => {
    const relative = (index - viewer + total) % total;
    return { ...seats[relative], size: Math.max(24, size) * scales[relative] };
  });
}

export function getBattleSeat(index: number, total: number, myIndex: number, compact = false, bounds?: BattleBounds): BattleSeat {
  return getBattleFormation(total, myIndex, compact, bounds)[index] ?? { ...SELF_SEAT, facing: 'n' };
}

/** Place near-side labels outside the card ring without moving their model. */
export function getBattleStatusOffset(seat: BattleSeat, self: boolean, bounds: BattleBounds): number {
  if (self || !getBattleFigure(seat, self, bounds).foreground) return 0;
  const size = seat.size ?? 100;
  const labelWidth = Math.min(bounds.width < 768 ? 86 : 116, size + 12);
  const room = Math.min(seat.x, 100 - seat.x) * bounds.width / 100 - labelWidth / 2 - 6;
  return Math.sign(seat.x - 50) * Math.max(0, Math.min(28, size * .28, room));
}

/** The waist is always attached to the actual midpoint of the table edge. */
export function getBattleFigure(seat: BattleSeat, self: boolean, bounds: BattleBounds): { x: number; y: number; foreground: boolean } {
  const { center } = getTableGeometry(bounds.width < 768, seat.tableSides);
  return { x: seat.x, y: seat.y, foreground: self || seat.y > center.y + 3 };
}

/** Rear sprites expose their torso above the edge. Use this same anchor for
 * sprite placement, collision bounds, and the actual hand's card-release point.
 */
export function getBattleFigureAnchor(seat: BattleSeat, self: boolean): number {
  const { center } = getTableGeometry(false, seat.tableSides);
  return self ? .5 : seat.y > center.y + 3 ? .55 : .68;
}
