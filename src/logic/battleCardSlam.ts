import { getTableGeometry, type BattleBounds } from './battleLayout';

interface SlamWinner {
  index: number;
  width: number;
  cardHeight: number;
}

export interface BattleCardSlamPosition {
  index: number;
  /** Board pixels, anchored at the center of the entire card and label block. */
  x: number;
  y: number;
  /** Final, visible face dimensions; labels are separate and remain unscaled. */
  width: number;
  cardHeight: number;
  labelHeight: number;
  scale: number;
}

/** The center showcase has its own geometry, independent of the permanent seats.
 * A common grid keeps every winning play visible, including crowded short boards.
 */
export function battleCardSlamPositions(winners: readonly SlamWinner[], bounds: BattleBounds): BattleCardSlamPosition[] {
  if (!winners.length || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)
    || bounds.width <= 0 || bounds.height <= 0
    || winners.some(winner => !Number.isFinite(winner.index) || !Number.isFinite(winner.width)
      || !Number.isFinite(winner.cardHeight) || winner.width <= 0 || winner.cardHeight <= 0)) return [];

  const compact = bounds.width < 768;
  const center = getTableGeometry(compact).center;
  const centerX = center.x * bounds.width / 100, centerY = center.y * bounds.height / 100;
  const regionWidth = bounds.width * .72, regionHeight = bounds.height * .5;
  const gap = 10, labelHeight = compact ? 28 : 32;
  const desiredWidth = Math.min(compact ? 104 : 150,
    Math.max(compact ? 80 : 120, ...winners.map(winner => winner.width * 1.8)));
  let best: { columns: number; rows: number; width: number } | undefined;
  for (let columns = 1; columns <= winners.length; columns++) {
    const rows = Math.ceil(winners.length / columns);
    const width = Math.min(desiredWidth,
      (regionWidth - (columns - 1) * gap) / columns,
      (regionHeight - (rows - 1) * gap - rows * labelHeight) / (rows * 1.5));
    if (width <= 0) continue;
    if (!best || width > best.width + 1e-6 || (Math.abs(width - best.width) <= 1e-6 && rows < best.rows)) {
      best = { columns, rows, width };
    }
  }
  if (!best) return [];

  const { columns, rows, width } = best;
  const cardHeight = width * 1.5, blockHeight = cardHeight + labelHeight;
  return winners.map((winner, order) => {
    const row = Math.floor(order / columns), column = order % columns;
    const rowCount = Math.min(columns, winners.length - row * columns);
    return {
      index: winner.index,
      x: centerX + (column - (rowCount - 1) / 2) * (width + gap),
      y: centerY + (row - (rows - 1) / 2) * (blockHeight + gap),
      width, cardHeight, labelHeight, scale: 1.8,
    };
  });
}
