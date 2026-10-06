import type { LocalizedText } from '../types';
import { EXPEDITION_START_HP } from './expedition';

export type ExpeditionDifficulty = 'beginner' | 'normal';
export interface ExpeditionDifficultyConfig {
  id: ExpeditionDifficulty;
  label: LocalizedText;
  startHp: number;
  enemyDamageBonus: number;
  goldMultiplier: number;
}

export const EXPEDITION_DIFFICULTIES: Record<ExpeditionDifficulty, ExpeditionDifficultyConfig> = {
  beginner: { id: 'beginner', label: { zh: '新手', en: 'Beginner' }, startHp: EXPEDITION_START_HP, enemyDamageBonus: 0, goldMultiplier: 1 },
  normal: { id: 'normal', label: { zh: '普通', en: 'Normal' }, startHp: 1, enemyDamageBonus: .5, goldMultiplier: 2 },
};

/** Missing or unrecognized settings retain the original expedition rules. */
export function normalizeExpeditionDifficulty(value: unknown): ExpeditionDifficulty {
  return value === 'normal' ? 'normal' : 'beginner';
}

export function getExpeditionDifficulty(value?: unknown): ExpeditionDifficultyConfig {
  return EXPEDITION_DIFFICULTIES[normalizeExpeditionDifficulty(value)];
}
