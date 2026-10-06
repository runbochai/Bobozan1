import type { Card } from '../types';

/** A card's finish follows its identity, independently of how it was acquired. */
export function isHoloCard(card?: Pick<Card, 'type' | 'tags'> | null): boolean {
  return !!card && (card.type === 'SPECIAL' || card.type === 'ABSORB' || !!card.tags?.includes('combo'));
}
