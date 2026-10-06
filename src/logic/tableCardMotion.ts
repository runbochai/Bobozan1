import type { BattleBounds } from './battleLayout';
import type { TableCardPosition } from './tableCardLayout';

export interface TableCardClash {
  center: { x: number; y: number };
  /** Shared contraction preserves seat order, including temporarily empty slots. */
  fraction: number;
  offsets: { x: number; y: number }[];
}

/** Move the whole inner square toward its center only as far as every card can fit.
 * Include the entire roster's slots so deaths or missing plays never reassign a path.
 */
export function tableCardClash(positions: readonly TableCardPosition[], bounds: BattleBounds): TableCardClash {
  if (!positions.length || bounds.width <= 0 || bounds.height <= 0) {
    return { center: { x: 50, y: 50 }, fraction: 0, offsets: [] };
  }
  const center = {
    x: (Math.min(...positions.map(p => p.x)) + Math.max(...positions.map(p => p.x))) / 2,
    y: (Math.min(...positions.map(p => p.y)) + Math.max(...positions.map(p => p.y))) / 2,
  };
  const angle = 3 * Math.PI / 180;
  const boxes = positions.map(position => {
    const height = position.cardHeight + position.ownerHeight + position.ownerGap;
    return { x: position.x * bounds.width / 100, y: position.y * bounds.height / 100,
      halfWidth: (position.width * Math.cos(angle) + height * Math.sin(angle)) / 2,
      halfHeight: (height * Math.cos(angle) + position.width * Math.sin(angle)) / 2 };
  });
  let fraction = .22;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j], dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    const horizontal = dx > 0 ? 1 - (a.halfWidth + b.halfWidth + 3) / dx : -Infinity;
    const vertical = dy > 0 ? 1 - (a.halfHeight + b.halfHeight + 3) / dy : -Infinity;
    fraction = Math.min(fraction, Math.max(horizontal, vertical));
  }
  fraction = Math.max(0, fraction);
  return { center, fraction, offsets: positions.map(position => ({
    x: (center.x - position.x) * bounds.width / 100 * fraction,
    y: (center.y - position.y) * bounds.height / 100 * fraction,
  })) };
}
