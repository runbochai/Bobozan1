import { SKILL_DB } from '../data/skills';
import type { Player } from '../types';

const bonusCards = SKILL_DB.filter(card => card.cost === 1 && (card.type === 'ATTACK' || card.type === 'SPECIAL'));

export interface RevengeReward {
  loseStreak: number;
  tempSkills: string[];
  revengeObtainedAt: number | null;
}

/** Legacy rooms enabled revenge by default; newly created rooms explicitly opt out. */
export function isRevengeModeEnabled(enabled?: boolean): boolean {
  return enabled ?? true;
}

/** Prepare this match's single-use bonus without carrying over previous temporary cards. */
export function prepareRevengeReward(player: Pick<Player, 'isDead' | 'loseStreak'>, enabled: boolean | undefined,
  obtainedAt: number, random: () => number = Math.random): RevengeReward {
  const loseStreak = player.isDead ? (player.loseStreak || 0) + 1 : 0;
  const bonus = isRevengeModeEnabled(enabled) && loseStreak >= 5
    ? bonusCards[Math.floor(random() * bonusCards.length)] : undefined;
  return { loseStreak, tempSkills: bonus ? [bonus.id] : [], revengeObtainedAt: bonus ? obtainedAt : null };
}
