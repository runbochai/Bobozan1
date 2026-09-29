import { getTableGeometry, SELF_SEAT, type BattleBounds, type BattleSeat } from './battleLayout';

export interface TableCardPosition { x: number; y: number; width: number }
interface Rect { left: number; top: number; right: number; bottom: number }

const intersects = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Includes the owner label below each 2:3 card. Coordinates returned are its center. */
export function tableCardPositions(count: number, seats: readonly BattleSeat[], bounds: BattleBounds): TableCardPosition[] {
  if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) return [];
  count = Math.floor(count);
  const compact = bounds.width < 768;
  const { corners } = getTableGeometry(compact);
  const [farLeft, farRight, nearRight, nearLeft] = corners.map(p => ({ x: p.x * bounds.width / 100, y: p.y * bounds.height / 100 }));
  const tableTop = farLeft.y + 10, tableBottom = nearLeft.y - 10;
  const center = bounds.width / 2;
  const obstacles: Rect[] = seats.flatMap(seat => {
    const size = seat.size ?? Math.min(bounds.width * .18, bounds.height * .25);
    const height = size * 4 / 3;
    const x = seat.x * bounds.width / 100, y = seat.y * bounds.height / 100;
    const core = { left: x - size * .38 - 4, right: x + size * .38 + 4, top: y - height * .91 - 4, bottom: y - height * .07 + 4 };
    if (Math.abs(seat.x - SELF_SEAT.x) < .01 && Math.abs(seat.y - SELF_SEAT.y) < .01) return [core];
    // The label is above the head, independent of transparent atlas margins.
    const labelWidth = Math.min(compact ? 86 : 116, size + 12);
    const labelBottom = y - height * .96;
    return [core, { left: x - labelWidth / 2 - 4, right: x + labelWidth / 2 + 4, top: labelBottom - 49, bottom: labelBottom + 4 }];
  });
  const inside = (r: Rect) => {
    if (r.top < tableTop || r.bottom > tableBottom) return false;
    const t = (r.top - farLeft.y) / (nearLeft.y - farLeft.y);
    return r.left >= farLeft.x + (nearLeft.x - farLeft.x) * t + 8
      && r.right <= farRight.x + (nearRight.x - farRight.x) * t - 8;
  };

  const preferred = compact ? Math.min(40, Math.max(32, bounds.width / 10)) : Math.min(100, Math.max(80, bounds.width / 16));
  // A shared lattice keeps rows and the two banks aligned even when the viewer
  // occupies the center of the near edge. Fit cards, never move the actors.
  for (let width = preferred; width >= 24; width -= 2) {
    const cardHeight = width * 1.5 + 25;
    const pitchX = width + 12, pitchY = cardHeight + 10;
    let best: { score: number; positions: TableCardPosition[] } | undefined;
    const maxRows = Math.min(count, Math.floor((tableBottom - tableTop + 10) / pitchY), 5);
    for (let rows = 1; rows <= maxRows; rows++) {
      const minY = tableTop + cardHeight / 2 + 3;
      const maxY = tableBottom - cardHeight / 2 - 3 - (rows - 1) * pitchY;
      if (minY > maxY) continue;
      const starts = new Set<number>();
      for (let step = 0; step <= 8; step++) starts.add(minY + (maxY - minY) * step / 8);
      for (const obstacle of obstacles) for (let row = 0; row < rows; row++) {
        for (const y of [obstacle.top - cardHeight / 2 - 3, obstacle.bottom + cardHeight / 2 + 3]) {
          const start = y - row * pitchY;
          if (start >= minY && start <= maxY) starts.add(start);
        }
      }
      for (const start of starts) for (const offset of [0, .5]) {
        const rowSlots = Array.from({ length: rows }, (_, row) => {
          const y = start + row * pitchY;
          const slots: TableCardPosition[] = [];
          const radius = Math.ceil(bounds.width / pitchX / 2);
          for (let i = -radius; i <= radius; i++) {
            const x = center + (i + offset) * pitchX;
            // Three pixels reserve space for the small card tilt and impact rim.
            const rect = { left: x - width / 2 - 3, right: x + width / 2 + 3, top: y - cardHeight / 2 - 3, bottom: y + cardHeight / 2 + 3 };
            if (inside(rect) && obstacles.every(obstacle => !intersects(rect, obstacle))) slots.push({ x, y, width });
          }
          return slots.sort((a, b) => Math.abs(a.x - center) - Math.abs(b.x - center) || (row % 2 ? b.x - a.x : a.x - b.x));
        });
        if (rowSlots.some(slots => slots.length === 0) || rowSlots.reduce((sum, slots) => sum + slots.length, 0) < count) continue;
        // At most eight cards: this small DP finds balanced row counts while
        // allowing a wider upper row when the near-side character splits a row.
        let choices = new Map<number, { score: number; positions: TableCardPosition[] }>([[0, { score: 0, positions: [] }]]);
        for (const slots of rowSlots) {
          const next = new Map<number, { score: number; positions: TableCardPosition[] }>();
          for (const [used, choice] of choices) for (let take = 1; take <= Math.min(slots.length, count - used); take++) {
            const selected = slots.slice(0, take).sort((a, b) => a.x - b.x);
            const middle = selected.reduce((sum, p) => sum + p.x, 0) / take;
            const spread = selected.reduce((sum, p) => sum + Math.abs(p.x - center) / bounds.width, 0);
            const score = choice.score + (take - count / rows) ** 2 * 12 + Math.abs(middle - center) / bounds.width * 30 + spread;
            const previous = next.get(used + take);
            if (!previous || score < previous.score) next.set(used + take, { score, positions: [...choice.positions, ...selected] });
          }
          choices = next;
        }
        const layout = choices.get(count);
        if (!layout) continue;
        const middleY = start + (rows - 1) * pitchY / 2;
        const score = layout.score + rows * 2 + Math.abs(middleY - (tableTop + tableBottom) / 2) / bounds.height * 4;
        if (!best || score < best.score) best = { score, positions: layout.positions };
      }
    }
    if (best) return best.positions.map(p => ({ x: p.x / bounds.width * 100, y: p.y / bounds.height * 100, width: p.width }));
  }
  return [];
}
