import { getBattleFigure, getBattleStatusOffset, getTableGeometry, SELF_SEAT, type BattleBounds, type BattleSeat } from './battleLayout';

export interface TableCardPosition { x: number; y: number; width: number }
interface Rect { left: number; top: number; right: number; bottom: number }
const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** One permanent card slot per roster index; include dead and uncommitted seats.
 * x/y are board percentages, width is pixels, owner height is 22px.
 */
export function tableCardPositions(seats: readonly BattleSeat[], bounds: BattleBounds): TableCardPosition[] {
  if (!seats.length || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) return [];
  const compact = bounds.width < 768;
  const { corners } = getTableGeometry(compact);
  const farY = corners[0].y, nearY = corners[3].y;
  const halfWidthAt = (depth: number) => (corners[1].x - 50) * (1 - depth) + (corners[2].x - 50) * depth;
  const coordinates = seats.map(seat => {
    const depth = (seat.y - farY) / (nearY - farY);
    return { u: (seat.x - 50) / halfWidthAt(depth), v: depth * 2 - 1 };
  });
  const obstacles: Rect[] = seats.flatMap(seat => {
    const width = seat.size ?? Math.min(bounds.width * .18, bounds.height * .25), height = width * 4 / 3;
    const self = Math.abs(seat.x - SELF_SEAT.x) < .01 && Math.abs(seat.y - SELF_SEAT.y) < .01;
    const figure = getBattleFigure(seat, self, bounds);
    const x = figure.x * bounds.width / 100, y = figure.y * bounds.height / 100;
    const top = y - height * (self ? .5 : .55);
    const result: Rect[] = [];
    // Keep the visible head/chest clear at the figure's real offset. Side/far
    // figures are behind the table; near-side figures remain in the foreground.
    result.push({
      left: x - width * .38 - 4, right: x + width * .38 + 4,
      top: top + height * .09 - 4, bottom: top + height * (figure.foreground ? .93 : .60) + 4,
    });
    if (!self) {
      const labelWidth = Math.min(compact ? 86 : 116, width + 12), bottom = top + height * .04;
      const labelX = x + getBattleStatusOffset(seat, false, bounds);
      result.push({ left: labelX - labelWidth / 2 - 4, right: labelX + labelWidth / 2 + 4, top: bottom - 49, bottom: bottom + 4 });
    }
    return result;
  });
  const inside = (rect: Rect) => {
    const top = rect.top / bounds.height * 100, bottom = rect.bottom / bounds.height * 100;
    if (top < farY + .6 || bottom > nearY - .6) return false;
    const half = halfWidthAt((top - farY) / (nearY - farY)) * bounds.width / 100;
    return rect.left >= bounds.width / 2 - half + 6 && rect.right <= bounds.width / 2 + half - 6;
  };
  const preferred = compact ? Math.min(42, Math.max(32, bounds.width / 10)) : Math.min(96, Math.max(80, bounds.width / 16));
  for (let width = preferred; width >= (compact ? 26 : 48); width -= 2) {
    const height = width * 1.15 + 22;
    let best: { score: number; positions: TableCardPosition[] } | undefined;
    // A common scale and offset preserve the clockwise order and corresponding
    // edge of every seat. Never pack cards independently into free grid cells.
    for (let scale = .74; scale >= .3; scale -= .02) for (let offset = -.3; offset <= .1001; offset += .02) {
      const positions = coordinates.map(({ u, v }) => {
        const depth = .5 + v * scale / 2 + offset;
        return { x: 50 + u * scale * halfWidthAt(depth), y: farY + depth * (nearY - farY), width };
      });
      const boxes = positions.map(p => ({
        left: p.x * bounds.width / 100 - width / 2 - 3, right: p.x * bounds.width / 100 + width / 2 + 3,
        top: p.y * bounds.height / 100 - height / 2 - 3, bottom: p.y * bounds.height / 100 + height / 2 + 3,
      }));
      if (boxes.some((box, index) => !inside(box) || obstacles.some(obstacle => overlaps(box, obstacle)) || boxes.slice(index + 1).some(other => overlaps(box, other)))) continue;
      const score = Math.abs(scale - .62) + Math.abs(offset + .06) * .6;
      if (!best || score < best.score) best = { score, positions };
    }
    if (best) return best.positions;
  }
  return [];
}
