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
export function getBattleSeat(index: number, total: number, myIndex: number): BattleSeat {
  if (total <= 0) return { x: 50, y: 48 };
  const relative = ((index - Math.max(0, myIndex)) % total + total) % total;
  if (relative === 0) return { x: total > 4 ? 82 : 77, y: total > 4 ? 85 : 80 };
  if (total === 2) return { x: 32, y: 29 };
  if (total <= 4) return { x: 20 + (relative - 1) * 60 / (total - 2), y: 25 };
  const farSeats = [{ x: 17, y: 23 }, { x: 50, y: 18 }, { x: 83, y: 23 }];
  const sideSeats = total === 5 ? [{ x: 17, y: 55 }] : [{ x: 17, y: 49 }, { x: 83, y: 49 }];
  const nearSeats = [{ x: 17, y: 76 }, { x: 49, y: 76 }];
  return [...farSeats, ...sideSeats, ...nearSeats][relative - 1];
}
