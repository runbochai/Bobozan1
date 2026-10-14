import type { BattleSpeed, GameState } from '../types';

export const BATTLE_SPEEDS = [.75, 1, 1.5, 2] as const satisfies readonly BattleSpeed[];

export function isBattleSpeed(value: unknown): value is BattleSpeed {
  return typeof value === 'number' && BATTLE_SPEEDS.some(speed => speed === value);
}

export function normalizeBattleSpeed(value: unknown): BattleSpeed {
  return isBattleSpeed(value) ? value : 1;
}

export function battleTimeMs(milliseconds: number, speed: BattleSpeed = 1): number {
  return milliseconds / normalizeBattleSpeed(speed);
}

/** The host's preference is applied only when a new turn or match begins. */
export function getRoomBattleSpeed(room: Pick<GameState, 'battleSpeed' | 'roundBattleSpeed'>): BattleSpeed {
  return normalizeBattleSpeed(room.battleSpeed);
}

/** A legacy turn stays at 1x even if its host has queued a new target speed. */
export function getRoomRoundBattleSpeed(room: Pick<GameState, 'battleSpeed' | 'roundBattleSpeed'>): BattleSpeed {
  return normalizeBattleSpeed(room.roundBattleSpeed);
}
