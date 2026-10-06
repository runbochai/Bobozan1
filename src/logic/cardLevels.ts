import type { Card, Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { getRetainedSkillIds } from './skillLoadout';

const validLevel = (level: number | undefined): level is number =>
  level !== undefined && Number.isSafeInteger(level) && level >= 0;

/** Catalog levels describe unlocks; derived combinations use their highest component level. */
function originalLevel(card: Card): number {
  if (card.tags?.includes('combo')) {
    switch (card.id) {
      case 'skydragon': return 3;
      case 'doublewing': return 5;
      case 'vajra': return 11;
      case 'allbomb':
      case 'heartpoison': return 21;
    }
  }
  return card.levelRequired;
}

export const getEffectiveLevel = (card: Card): number =>
  validLevel(card.combatLevel) ? card.combatLevel : originalLevel(card);

export const getPlayerLevel = (player: Pick<Player, 'endlessLevel' | 'inventory'>): number =>
  validLevel(player.endlessLevel) ? player.endlessLevel
    : Math.max(0, ...player.inventory.filter(level => validLevel(level)));

/** Only retained ordinary offensive skills train with endless rank. Never mutate the catalog. */
export function withPlayerCardLevel(player: Player, card: Card): Card {
  const trained = validLevel(player.endlessLevel) && card.levelRequired > 0
    && !card.tags?.includes('combo') && (card.type === 'ATTACK' || card.type === 'ULTIMATE')
    && getRetainedSkillIds(player).includes(card.id);
  if (trained) return { ...card, combatLevel: Math.max(originalLevel(card), player.endlessLevel!) };
  // A card resolved for a different owner must not carry that owner's rank into a borrowed copy.
  if (card.combatLevel !== undefined) {
    const original = { ...card };
    delete original.combatLevel;
    return original;
  }
  return card;
}

/** Resolves presentation/combat metadata; ownership and affordability are validated separately. */
export function getPlayerCard(player: Player, cardId: string | null | undefined): Card | undefined {
  const card = cardId == null ? undefined : SKILL_DB.find(item => item.id === cardId);
  return card ? withPlayerCardLevel(player, card) : undefined;
}
