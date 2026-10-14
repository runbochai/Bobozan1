import { CARD_COMPARE_END_MS, CARD_COMPARE_START_MS, CARD_LAND_MS, CARD_RELEASE_MS } from '../data/battleTiming';

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
export function retroRoundTiming(startedAt: number, now: number) {
  const elapsed = Math.max(0, now - startedAt);
  return {
    flightDelay: CARD_RELEASE_MS - elapsed,
    flightDuration: CARD_LAND_MS - CARD_RELEASE_MS,
    slamDelay: CARD_COMPARE_START_MS - elapsed,
    slamDuration: CARD_COMPARE_END_MS - CARD_COMPARE_START_MS,
    elapsed,
  };
}

export function retroSlamTilt(playerId: string, turn: number) {
  return (Array.from(playerId).reduce((sum, char) => sum + char.charCodeAt(0), turn) % 80) - 40;
}
