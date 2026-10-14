import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameState, Player } from '../types';
import { FINAL_LEVEL } from '../data/constants';
import { migrateRoomSkillCatalog } from './roomCatalog';
import { settleRoom } from './room';
import { SKILL_CATALOG_VERSION } from './skillLoadout';

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
  assert.deepEqual(migrated.players[0].inventory, [0, 17]);
  assert.deepEqual(migrated.players[0].skillLoadout, ['poison']);
  assert.deepEqual(migrated.players[0].freeSkills, ['hong']);
  assert.deepEqual(migrated.players[0].disabledSkills, ['hong']);
  assert.equal(migrated.players[0].selectedCardId, null);
  assert.equal(migrated.players[0].lastCardId, null);
  assert.equal(migrated.skillCatalogVersion, SKILL_CATALOG_VERSION);
  assert.deepEqual(migrateRoomSkillCatalog(migrated), migrated);
  assert.deepEqual(before, saved);
});

test('removed old levels and current compact levels stay distinct at network boundaries', () => {
  const legacy = migrateRoomSkillCatalog(room({ matchCount: 14, players: [player({ inventory: [0, 13, 14, 15, 16] })] }));
  assert.equal(legacy.matchCount, 13);
  assert.deepEqual(legacy.players[0].inventory, [0]);
  assert.deepEqual(legacy.players[0].skillLoadout, []);
  const current = migrateRoomSkillCatalog(room({ skillCatalogVersion: SKILL_CATALOG_VERSION, matchCount: 17,
    players: [player({ inventory: [0, 13, 17], skillLoadout: ['wave', 'poison'] })] }));
  assert.equal(current.matchCount, 17);
  assert.deepEqual(current.players[0].skillLoadout, ['wave', 'poison']);
  assert.deepEqual(current.players[0].inventory, [0, 13, 17]);
});

test('completed old series stay complete while active old last skill rounds can reach the crown battle', () => {
  assert.equal(migrateRoomSkillCatalog(room({ status: 'GAMEOVER', matchCount: 23 })).matchCount, FINAL_LEVEL);
  assert.equal(migrateRoomSkillCatalog(room({ status: 'PLAYING', matchCount: 23 })).matchCount, 17);
  assert.equal(migrateRoomSkillCatalog(room({ matchCount: 30 })).matchCount, FINAL_LEVEL);
});

test('version two rooms inherit their catalog at the player boundary and preserve the final crown battle', () => {
  const before = room({ skillCatalogVersion: 2, matchCount: 15, players: [player({ inventory: [0, 13, 14, 15, 19],
    skillLoadout: ['bang', 'stab', 'wave', 'poison'], selectedCardId: 'bang', lastCardId: 'stab',
    freeSkills: ['stab', 'hong'], tempSkills: ['bang', 'pegasus'], disabledSkills: ['stab', 'wave'] })] });
  const saved = structuredClone(before), migrated = migrateRoomSkillCatalog(before);
  assert.equal(migrated.matchCount, 13);
  assert.deepEqual(migrated.players[0].inventory, [0, 13, 17]);
  assert.deepEqual(migrated.players[0].skillLoadout, ['wave', 'poison']);
  assert.deepEqual(migrated.players[0].freeSkills, ['hong']);
  assert.deepEqual(migrated.players[0].tempSkills, ['pegasus']);
  assert.deepEqual(migrated.players[0].disabledSkills, ['wave']);
  assert.equal(migrated.players[0].selectedCardId, null);
  assert.equal(migrated.players[0].lastCardId, null);
  assert.deepEqual(migrateRoomSkillCatalog(migrated), migrated);
  assert.deepEqual(before, saved);
  for (const matchCount of [13, 14]) assert.equal(migrateRoomSkillCatalog(room({ skillCatalogVersion: 2, matchCount })).matchCount, 13);
  assert.equal(migrateRoomSkillCatalog(room({ skillCatalogVersion: 2, status: 'GAMEOVER', matchCount: 19 })).matchCount, 17);
  for (const status of ['PLAYING', 'GAMEOVER'] as const) {
    assert.equal(migrateRoomSkillCatalog(room({ skillCatalogVersion: 2, status, matchCount: 20 })).matchCount, FINAL_LEVEL);
  }
});

test('Bang and Stab revealed in a version two showdown cannot remain playable after migration', () => {
  const migrated = migrateRoomSkillCatalog(room({ skillCatalogVersion: 2, status: 'SHOWDOWN', matchCount: 14, players: [
    player({ inventory: [0, 13], selectedCardId: 'bang' }),
    player({ id: 'friend', inventory: [0, 14], selectedCardId: 'stab' }),
  ] }));
  assert.ok(migrated.players.every(current => current.selectedCardId === 'charge'));
  const patch = settleRoom(migrated, 'host', { matchCount: migrated.matchCount, turn: migrated.turn }, 'zh');
  assert.ok(patch);
  assert.equal(patch.status, 'PLAYING');
  assert.equal(patch.turn, 2);
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
