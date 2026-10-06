/** One timeline for the drawn frames, card flight, comparison and ultimate cut-in. */
export const CARD_RAISE_MS = 140;
export const CARD_RELEASE_MS = 360;
export const CARD_LAND_MS = 600;
export const CARD_RECOVER_MS = 760;
export const CARD_FLIGHT_MS = CARD_LAND_MS - CARD_RELEASE_MS;
export const CARD_LANDING_MS = CARD_RECOVER_MS - CARD_LAND_MS;
export const CARD_COMPARE_START_MS = 800;
export const CARD_COMPARE_IMPACT_MS = 1040;
export const CARD_COMPARE_END_MS = 1400;
export const CARD_REVEAL_MS = 1450;
export const ULT_CUTIN_MS = 2850;

export interface BattleRoundClock<T> { key: string; startedAt: number; snapshot: T }

/** Keep the original committed moves and deadline across emoji/room updates. */
export function captureBattleRound<T>(previous: BattleRoundClock<T> | null, key: string, snapshot: T, now: number): BattleRoundClock<T> {
  return previous?.key === key ? previous : { key, startedAt: now, snapshot };
}

export function remainingBattleTime(startedAt: number, milestone: number, now: number): number {
  return Math.max(0, startedAt + milestone - now);
}

/** A reduced-motion host must still leave time for everyone else's presentation. */
export function showdownDurationMs(hasCutin: boolean, mode: 'room' | 'expedition', reduced = false): number {
  return CARD_REVEAL_MS + (mode === 'room' ? (hasCutin ? 4700 : 1200) : (hasCutin && !reduced ? 4300 : 900));
}
