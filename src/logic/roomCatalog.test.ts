import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameState, Player } from '../types';
import { FINAL_LEVEL } from '../data/constants';
import { migrateRoomSkillCatalog } from './roomCatalog';
import { settleRoom } from './room';

const player = (patch: Partial<Player> = {}): Player => ({ id: 'host', name: 'Host', isBot: false,
  hp: 1, energy: 2, isDead: false, inventory: [0], layer: 0, tempLayerMod: 0,
  selectedCardId: null, lastCardId: null, lastAction: null, ...patch });
const room = (patch: Partial<GameState> = {}): GameState => ({ status: 'PLAYING', turn: 1,
  matchCount: 1, players: [player()], hostId: 'host', logs: [], ...patch });

test('old rooms remap unlocks and rounds without granting replacement skills', () => {
  const before = room({ matchCount: 17, players: [player({ inventory: [0, 13, 17, 23],
    skillLoadout: ['pointdiff', 'bang', 'poison'], selectedCardId: 'pointdiff', lastCardId: 'oneg',
    freeSkills: ['threestar', 'hong'], disabledSkills: ['fiveslap', 'hong'] })] });
  const saved = structuredClone(before), migrated = migrateRoomSkillCatalog(before);
  assert.equal(migrated.matchCount, 13);
  assert.deepEqual(migrated.players[0].inventory, [0, 13, 19]);
  assert.deepEqual(migrated.players[0].skillLoadout, ['bang', 'poison']);
  assert.deepEqual(migrated.players[0].freeSkills, ['hong']);
  assert.deepEqual(migrated.players[0].disabledSkills, ['hong']);
  assert.equal(migrated.players[0].selectedCardId, null);
  assert.equal(migrated.players[0].lastCardId, null);
  assert.equal(migrated.skillCatalogVersion, 2);
  assert.deepEqual(migrateRoomSkillCatalog(migrated), migrated);
  assert.deepEqual(before, saved);
});

test('removed old levels and current compact levels stay distinct at network boundaries', () => {
  const legacy = migrateRoomSkillCatalog(room({ matchCount: 14, players: [player({ inventory: [0, 13, 14, 15, 16] })] }));
  assert.equal(legacy.matchCount, 13);
  assert.deepEqual(legacy.players[0].inventory, [0]);
  assert.deepEqual(legacy.players[0].skillLoadout, []);
  const current = migrateRoomSkillCatalog(room({ skillCatalogVersion: 2, matchCount: 19,
    players: [player({ inventory: [0, 13, 19], skillLoadout: ['bang', 'poison'] })] }));
  assert.equal(current.matchCount, 19);
  assert.deepEqual(current.players[0].skillLoadout, ['bang', 'poison']);
});

test('completed old series stay complete while active old last skill rounds can reach the crown battle', () => {
  assert.equal(migrateRoomSkillCatalog(room({ status: 'GAMEOVER', matchCount: 23 })).matchCount, FINAL_LEVEL);
  assert.equal(migrateRoomSkillCatalog(room({ status: 'PLAYING', matchCount: 23 })).matchCount, 19);
  assert.equal(migrateRoomSkillCatalog(room({ matchCount: 30 })).matchCount, FINAL_LEVEL);
});

test('retired moves in an old revealed round resolve safely and settle once', () => {
  const migrated = migrateRoomSkillCatalog(room({ status: 'SHOWDOWN', matchCount: 13, players: [
    player({ inventory: [0, 13], selectedCardId: 'pointdiff' }),
    player({ id: 'friend', selectedCardId: 'defend' }),
  ] }));
  assert.equal(migrated.players[0].selectedCardId, 'charge');
  const patch = settleRoom(migrated, 'host', { matchCount: migrated.matchCount, turn: migrated.turn }, 'zh');
  assert.ok(patch);
  assert.equal(patch.status, 'PLAYING');
  assert.equal(patch.turn, 2);
  assert.equal(patch.players?.find(current => current.id === 'host')?.energy, 4);
});
