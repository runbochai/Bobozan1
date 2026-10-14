import { FINAL_LEVEL } from '../data/constants';
import { SKILL_DB } from '../data/skills';
import type { GameState } from '../types';
import { migrateLegacySkillCatalog, SKILL_CATALOG_VERSION } from './skillLoadout';

const availableSkills = new Set(SKILL_DB.map(card => card.id));

/** Read old persisted rooms once; current room rounds and unlocks are already compact. */
export function migrateRoomSkillCatalog(room: GameState): GameState {
  const version = room.skillCatalogVersion ?? 0;
  const legacy = version < SKILL_CATALOG_VERSION;
  const players = room.players.map(player => {
    const next = migrateLegacySkillCatalog({ ...player, skillCatalogVersion: player.skillCatalogVersion ?? version });
    return { ...next,
      // An already revealed retired move resolves as Charge so a legacy showdown can finish.
      selectedCardId: next.selectedCardId && availableSkills.has(next.selectedCardId) ? next.selectedCardId
        : room.status === 'SHOWDOWN' && !next.isDead ? 'charge' : null,
      lastCardId: next.lastCardId && availableSkills.has(next.lastCardId) ? next.lastCardId : null,
      ...(next.disabledSkills ? { disabledSkills: next.disabledSkills.filter(id => availableSkills.has(id)) } : {}),
    };
  });
  const matchCount = !legacy || room.matchCount <= 12 ? room.matchCount
    : version < 2 && room.status === 'GAMEOVER' && room.matchCount >= 23 ? FINAL_LEVEL
    : version < 2 ? (room.matchCount <= 18 ? 13 : Math.min(FINAL_LEVEL, room.matchCount - 6))
    : room.matchCount <= 14 ? 13 : Math.min(FINAL_LEVEL, room.matchCount - 2);
  return { ...room, players, matchCount, skillCatalogVersion: SKILL_CATALOG_VERSION };
}
