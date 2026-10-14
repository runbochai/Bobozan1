import { getBattleFigure, getBattleFigureAnchor, getBattleStatusOffset, getTableGeometry, SELF_SEAT, type BattleBounds, type BattleSeat } from './battleLayout';

export interface TableCardPosition {
  x: number;
  y: number;
  width: number;
  cardHeight: number;
  ownerHeight: number;
  ownerGap: number;
  compact: boolean;
}
interface Rect { left: number; top: number; right: number; bottom: number }
const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const layouts = Array.from({ length: 26 }, (_, step) => .76 - step * .02).flatMap(scale =>
  [0, -.02, .02, -.04, .04, -.06, .06, -.08].map(offset => ({ scale, offset, score: Math.abs(scale - .58) + Math.abs(offset) * .8 })),
).sort((a, b) => a.score - b.score);

/** Permanent roster-owned slots form a smaller copy of the same polygon.
 * Search a shared inset and card size, never independently reassign a player to
 * an empty grid cell. Dead/uncommitted players must remain in the supplied seats.
 */
export function tableCardPositions(seats: readonly BattleSeat[], bounds: BattleBounds): TableCardPosition[] {
  if (!seats.length || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) return [];
  const compact = bounds.width < 768;
  const { vertices, center } = getTableGeometry(compact, seats[0].tableSides ?? seats.length);
  const polygon = vertices.map(point => ({ x: point.x * bounds.width / 100, y: point.y * bounds.height / 100 }));
  const inside = (box: Rect) => {
    for (const point of [{ x: box.left, y: box.top }, { x: box.right, y: box.top }, { x: box.left, y: box.bottom }, { x: box.right, y: box.bottom }]) {
      for (let edge = 0; edge < polygon.length; edge++) {
        const a = polygon[edge], b = polygon[(edge + 1) % polygon.length];
        // Vertices start at the viewer's left and run counterclockwise on screen.
        if ((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) > .001) return false;
      }
    }
    return true;
  };
  const obstacles: Rect[] = seats.flatMap(seat => {
    const width = seat.size ?? Math.min(bounds.width * .18, bounds.height * .23), height = width * 4 / 3;
    const self = Math.abs(seat.x - SELF_SEAT.x) < .01 && Math.abs(seat.y - SELF_SEAT.y) < .01;
    const figure = getBattleFigure(seat, self, bounds);
    const x = figure.x * bounds.width / 100, y = figure.y * bounds.height / 100;
    const anchor = getBattleFigureAnchor(seat, self), top = y - height * anchor;
    const result: Rect[] = [{
      left: x - width * .38 - 3, right: x + width * .38 + 3,
      top: top + height * .09 - 3, bottom: top + height * (figure.foreground ? .93 : anchor + .05) + 3,
    }];
    if (!self) {
      const labelWidth = Math.min(compact ? 86 : 116, width + 12), bottom = top + height * (figure.foreground ? .04 : .17);
      const labelX = x + getBattleStatusOffset(seat, false, bounds);
      result.push({ left: labelX - labelWidth / 2 - 3, right: labelX + labelWidth / 2 + 3, top: bottom - 49, bottom: bottom + 3 });
    }
    return result;
  });
  const styles = [
    { preferred: compact ? Math.min(44, bounds.width / 9) : Math.min(96, Math.max(64, bounds.width / 16)), minimum: compact ? 28 : 48,
      ratio: 1.15, ownerHeight: 18, ownerGap: 4, compact: false },
    { preferred: 42, minimum: 24, ratio: 1, ownerHeight: 10, ownerGap: 2, compact: true },
    // A short/narrow table still displays every play; the full owner and move
    // remain available through the component's title and accessible name.
    { preferred: 30, minimum: 22, ratio: 1, ownerHeight: 0, ownerGap: 0, compact: true },
  ];
  for (const style of styles) for (let width = Math.floor(style.preferred / 2) * 2; width >= style.minimum; width -= 2) {
    const cardHeight = width * style.ratio, height = cardHeight + style.ownerHeight + style.ownerGap;
    for (const { scale, offset } of layouts) {
      const boxes: Rect[] = [], positions: TableCardPosition[] = [];
      for (const seat of seats) {
        const x = center.x + (seat.x - center.x) * scale;
        const y = center.y + (seat.y - center.y) * scale + offset * 60;
        // Cover the card's ±3° reveal tilt as well as its owner row.
        const angle = 3 * Math.PI / 180;
        const halfWidth = (width * Math.cos(angle) + height * Math.sin(angle)) / 2 + 3;
        const halfHeight = (height * Math.cos(angle) + width * Math.sin(angle)) / 2 + 3;
        const box = { left: x * bounds.width / 100 - halfWidth, right: x * bounds.width / 100 + halfWidth,
          top: y * bounds.height / 100 - halfHeight, bottom: y * bounds.height / 100 + halfHeight };
        if (!inside(box) || boxes.some(other => overlaps(box, other)) || obstacles.some(other => overlaps(box, other))) break;
        boxes.push(box);
        positions.push({ x, y, width, cardHeight, ownerHeight: style.ownerHeight, ownerGap: style.ownerGap, compact: style.compact });
      }
      if (positions.length === seats.length) return positions;
    }
  }
  return [];
}
