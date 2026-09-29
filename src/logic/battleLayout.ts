export type BattleDirection = 's' | 'sw' | 'w' | 'nw' | 'n' | 'ne' | 'e' | 'se';
export const BATTLE_DIRECTIONS: readonly BattleDirection[] = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
export interface BattleSeat { x: number; y: number }

/** Screen coordinates: positive Y points down. Atlas starts at south, clockwise. */
export function directionToward(seat: BattleSeat, target: BattleSeat = { x: 50, y: 48 }): BattleDirection {
  const angle = Math.atan2(target.y - seat.y, target.x - seat.x);
  const index = Math.round((angle - Math.PI / 2) / (Math.PI / 4));
  return BATTLE_DIRECTIONS[((index % 8) + 8) % 8];
}

/** Seats are relative to the viewer, so their own character always stays near-right. */
export function getBattleSeat(index: number, total: number, myIndex: number, compact = false): BattleSeat {
  if (total <= 0) return { x: 50, y: 48 };
  const relative = ((index - Math.max(0, myIndex)) % total + total) % total;
  if (relative === 0) return { x: total > 4 ? 78 : compact ? 73 : 76, y: total > 2 ? 86 : 82 };
  if (total === 2) return { x: 32, y: 29 };
  // Four fighters occupy the left foreground as well as the far edge.
  if (total === 3) return compact ? [{ x: 26, y: 27 }, { x: 74, y: 27 }][relative - 1]
    : [{ x: 33, y: 23 }, { x: 73, y: 23 }][relative - 1];
  if (total === 4) return compact ? [{ x: 74, y: 25 }, { x: 27, y: 25 }, { x: 22, y: 68 }][relative - 1]
    : [{ x: 74, y: 23 }, { x: 40, y: 23 }, { x: 19, y: 68 }][relative - 1];
  const farSeats = [{ x: 18, y: 23 }, { x: 50, y: 23 }, { x: 82, y: 23 }];
  const sideSeats = total === 5 ? [{ x: 18, y: 53 }] : [{ x: 18, y: 50 }, { x: 82, y: 50 }];
  const nearSeats = [{ x: 18, y: 77 }, compact ? { x: 50, y: 60 } : { x: 49, y: 77 }];
  return [...farSeats, ...sideSeats, ...nearSeats][relative - 1];
}
