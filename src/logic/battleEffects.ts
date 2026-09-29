import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';

function castLayer(player: Player) {
  const tags = SKILL_DB.find(c => c.id === player.selectedCardId)?.tags ?? [];
  return player.layer + (tags.includes('layer_up') ? 1 : 0) - (tags.includes('layer_down') ? 1 : 0)
    + (tags.includes('layer_up_temp') ? 1 : tags.includes('layer_up_2_temp') ? 2 : tags.includes('layer_up_3_temp') ? 3 : 0);
}

/** Decorative trajectories only; damage and hit reactions always come from settled HP. */
export function skillFlightTargets(caster: Player, players: Player[]): Player[] {
  const card = SKILL_DB.find(c => c.id === caster.selectedCardId);
  if (caster.isDead || !card || !['ATTACK', 'ULTIMATE'].includes(card.type)) return [];
  const layer = castLayer(caster);
  return players.filter(target => {
    if (target.id === caster.id || target.isDead) return false;
    const other = castLayer(target), distance = Math.abs(layer - other);
    if (['kajifen', 'kajisuper'].includes(card.id) || card.tags?.includes('hit_all')) return true;
    if (['ka', 'ji'].includes(card.id)) return distance <= 1;
    if (card.type === 'ULTIMATE') return distance <= (card.tags?.includes('combo') ? 3 : 2);
    if (card.tags?.includes('hit_up')) return other > layer;
    if (card.tags?.includes('hit_down')) return other < layer;
    return layer === other;
  });
}
