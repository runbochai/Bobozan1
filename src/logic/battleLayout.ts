export type BattleDirection = 's' | 'sw' | 'w' | 'nw' | 'n' | 'ne' | 'e' | 'se';
export const BATTLE_DIRECTIONS: readonly BattleDirection[] = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
export interface BattleSeat { x: number; y: number }

/** Screen coordinates: positive Y points down. Atlas starts at south, clockwise. */
export function directionToward(seat: BattleSeat, target: BattleSeat = { x: 50, y: 48 }): BattleDirection {
  const angle = Math.atan2(target.y - seat.y, target.x - seat.x);
  const index = Math.round((angle - Math.PI / 2) / (Math.PI / 4));
  return BATTLE_DIRECTIONS[((index % 8) + 8) % 8];
}

/** A seated opponent always presents their face toward the viewer and table. */
export function seatedDirection(seat: BattleSeat): BattleDirection {
  return seat.x < 38 ? 'se' : seat.x > 62 ? 'sw' : 's';
}

/** Positions anchor the wrists at the table. The viewer occupies the foreground camera. */
export function getBattleSeat(index: number, total: number, myIndex: number, compact = false): BattleSeat {
  if (total <= 0) return { x: 50, y: 88 };
  const relative = ((index - Math.max(0, myIndex)) % total + total) % total;
  if (relative === 0) return { x: 50, y: 88 };
  if (total === 2) return { x: 50, y: compact ? 42 : 39 };
  if (total === 3) return [{ x: compact ? 25 : 28, y: 45 }, { x: compact ? 75 : 72, y: 45 }][relative - 1];
  if (total === 4) return [{ x: 50, y: compact ? 34 : 38 }, { x: compact ? 18 : 14, y: compact ? 55 : 64 }, { x: compact ? 82 : 86, y: compact ? 55 : 64 }][relative - 1];
  const far = compact
    ? [{ x: 20, y: 32 }, { x: 50, y: 27 }, { x: 80, y: 32 }]
    : [{ x: 28, y: 39 }, { x: 50, y: 34 }, { x: 72, y: 39 }];
  const sides = [{ x: compact ? 17 : 10, y: compact ? 50 : 52 }, { x: compact ? 83 : 90, y: compact ? 50 : 52 }];
  // Five players form a symmetric arc, instead of leaving one side empty.
  if (total === 5) return [{ x: 32, y: compact ? 31 : 37 }, { x: 68, y: compact ? 31 : 37 }, ...sides][relative - 1];
  const near = [{ x: compact ? 17 : 11, y: compact ? 69 : 81 }, { x: compact ? 83 : 89, y: compact ? 69 : 81 }];
  if (total === 7) return [{ x: 32, y: compact ? 31 : 37 }, { x: 68, y: compact ? 31 : 37 }, ...sides, ...near][relative - 1];
  return [...far, ...sides, ...near][relative - 1] ?? { x: 50, y: 88 };
}
