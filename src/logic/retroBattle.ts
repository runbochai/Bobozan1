import { CARD_COMPARE_END_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_START_MS,
  CARD_LAND_MS, CARD_RELEASE_MS, SOLO_MOTION_SCALE } from '../data/battleTiming';
import type { BattleSpeed } from '../types';
import { battleTimeMs } from './battleSpeed';

/** The original avatar ring, rotated so the viewing player sits at the bottom. */
export function retroSeat(index: number, total: number, viewer: number, mini = false) {
  const count = Math.max(1, total);
  const angle = (90 + (index - Math.max(0, viewer)) * 360 / count) * Math.PI / 180;
  const sine = Math.sin(angle);
  // Keep adjacent corners in separate rows when eight full status panels share a phone.
  const crowdedY = sine > .5 ? 78 : sine < -.5 ? 14.5 : 46;
  const y = mini ? 45 + 13 * sine : total >= 7 ? crowdedY : total === 2 ? 49 + 25 * sine : 46 + 32 * sine;
  return { x: 50 + (mini ? 15 : 39) * Math.cos(angle), y };
}

/** CSS receives the elapsed shared clock, so a remount never restarts a revealed round. */
export function retroRoundTiming(startedAt: number, now: number, speed: BattleSpeed = 1) {
  const elapsed = Math.max(0, now - startedAt);
  return {
    flightDelay: battleTimeMs(CARD_RELEASE_MS * SOLO_MOTION_SCALE, speed) - elapsed,
    flightDuration: battleTimeMs((CARD_LAND_MS - CARD_RELEASE_MS) * SOLO_MOTION_SCALE, speed),
    slamDelay: battleTimeMs(CARD_COMPARE_START_MS * SOLO_MOTION_SCALE, speed) - elapsed,
    slamDuration: battleTimeMs((CARD_COMPARE_END_MS - CARD_COMPARE_START_MS) * SOLO_MOTION_SCALE, speed),
    impactDelay: battleTimeMs(CARD_COMPARE_IMPACT_MS * SOLO_MOTION_SCALE, speed) - elapsed,
    impactDuration: battleTimeMs((CARD_COMPARE_END_MS - CARD_COMPARE_IMPACT_MS) * SOLO_MOTION_SCALE, speed),
    elapsed,
  };
}

export function retroSlamTilt(playerId: string, turn: number) {
  return (Array.from(playerId).reduce((sum, char) => sum + char.charCodeAt(0), turn) % 80) - 40;
}

/** Winning faces and their owner labels share a grid, without moving the seats. */
export function retroSlamTargets(count: number, bounds: { width: number; height: number }, card: { width: number; height: number }) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 50, y: 45, scale: 1.8 }];
  const gap = 12, ownerHeight = 18;
  let best = { columns: count, rows: 1, scale: 0 };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const scale = Math.min(1.8,
      (bounds.width * .8 - (columns - 1) * gap) / (columns * card.width),
      (bounds.height * .72 - (rows - 1) * gap) / (rows * (card.height + ownerHeight)));
    if (scale > best.scale || scale === best.scale && rows < best.rows) best = { columns, rows, scale };
  }
  const width = card.width * best.scale, height = (card.height + ownerHeight) * best.scale;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / best.columns), column = index % best.columns;
    const rowCount = Math.min(best.columns, count - row * best.columns);
    return {
      x: 50 + (column - (rowCount - 1) / 2) * (width + gap) / bounds.width * 100,
      y: 45 + ((row - (best.rows - 1) / 2) * (height + gap) - ownerHeight * best.scale / 2) / bounds.height * 100,
      scale: best.scale,
    };
  });
}
