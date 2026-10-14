import { FINAL_LEVEL } from '../data/constants';
import { SKILL_DB } from '../data/skills';
import type { GameState } from '../types';
import { migrateLegacySkillCatalog, normalizeSkillLoadout, SKILL_CATALOG_VERSION } from './skillLoadout';

const availableSkills = new Set(SKILL_DB.map(card => card.id));

/** Read old persisted rooms once; current room rounds and unlocks are already compact. */
export function migrateRoomSkillCatalog(room: GameState): GameState {
  const legacy = (room.skillCatalogVersion ?? 0) < SKILL_CATALOG_VERSION;
  const players = room.players.map(player => {
    const next = legacy ? migrateLegacySkillCatalog(player) : normalizeSkillLoadout(player);
    return { ...next,
      // An already revealed retired move resolves as Charge so a legacy showdown can finish.
      selectedCardId: next.selectedCardId && availableSkills.has(next.selectedCardId) ? next.selectedCardId
        : room.status === 'SHOWDOWN' && !next.isDead ? 'charge' : null,
      lastCardId: next.lastCardId && availableSkills.has(next.lastCardId) ? next.lastCardId : null,
      ...(next.disabledSkills ? { disabledSkills: next.disabledSkills.filter(id => availableSkills.has(id)) } : {}),
    };
  });
  const matchCount = !legacy || room.matchCount <= 12 ? room.matchCount
    : room.status === 'GAMEOVER' && room.matchCount >= 23 ? FINAL_LEVEL
    : room.matchCount <= 16 ? 13 : Math.min(FINAL_LEVEL, room.matchCount - 4);
  return { ...room, players, matchCount, skillCatalogVersion: SKILL_CATALOG_VERSION };
}
