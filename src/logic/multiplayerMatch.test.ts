import test from 'node:test';
import assert from 'node:assert/strict';
import { FINAL_LEVEL, LAST_SKILL_LEVEL } from '../data/constants';
import { SKILL_DB } from '../data/skills';
import type { GameState, Player } from '../types';
import { calculateTurnOutcome } from './combat';
import { getMultiplayerMatchSummary, getMultiplayerMode } from './multiplayerMatch';

const player = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: false, hp: 1, energy: 10, inventory: [0],
  isDead: false, layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
});
const summary = (players: Player[], patch: Partial<Pick<GameState, 'status' | 'matchCount' | 'multiplayerMode'>> = {}) =>
  getMultiplayerMatchSummary({ players, status: 'GAMEOVER', matchCount: FINAL_LEVEL, ...patch });
const ids = (players: Player[]) => players.map(player => player.id);

test('old rooms without a multiplayer mode retain the cumulative-kill rules', () => {
  assert.equal(getMultiplayerMode({}), 'kills');
  assert.equal(getMultiplayerMode({ multiplayerMode: 'kills' }), 'kills');
  assert.equal(getMultiplayerMode({ multiplayerMode: 'survival' }), 'survival');
  const players = [player('survivor'), player('killer', { kills: 8, isDead: true })];
  assert.equal(summary(players).mode, 'kills');
  assert.deepEqual(summary(players), summary(players, { multiplayerMode: 'kills' }));
});

for (const multiplayerMode of ['kills', 'survival'] as const) {
  test(multiplayerMode + ': the last skill is earned before the separate Crown Battle', () => {
    const result = calculateTurnOutcome([
      player('survivor', { selectedCardId: 'hong' }),
      player('victim', { selectedCardId: 'charge' }),
      player('past-leader', { kills: 100, isDead: true, hp: 0 }),
    ], 1, LAST_SKILL_LEVEL, 'zh', { multiplayerMode });
    assert.equal(LAST_SKILL_LEVEL, 19);
    assert.equal(FINAL_LEVEL, LAST_SKILL_LEVEL + 1);
    assert.equal(result.isGameOver, true);
    assert.equal(result.winner?.id, 'survivor');
    assert.deepEqual(result.winner?.inventory, [0, LAST_SKILL_LEVEL]);
    assert.ok(result.winner?.skillLoadout?.includes('poison'));
    const progress = summary(result.players, { multiplayerMode, matchCount: LAST_SKILL_LEVEL });
    assert.equal(progress.mode, multiplayerMode);
    assert.equal(progress.matchNumber, LAST_SKILL_LEVEL);
    assert.equal(progress.lastSkillLevel, LAST_SKILL_LEVEL);
    assert.equal(progress.totalMatches, FINAL_LEVEL);
    assert.equal(progress.remainingMatches, 1);
    assert.equal(progress.isFinalBattle, false);
    assert.equal(progress.isSeriesOver, false);
    assert.equal(progress.roundWinner?.id, 'survivor');
    assert.deepEqual(progress.champions, []);
  });

  test(multiplayerMode + ': legacy match counts beyond the Crown Battle finish without another level', () => {
    const result = calculateTurnOutcome([
      player('survivor', { selectedCardId: 'hong', inventory: [0, LAST_SKILL_LEVEL] }),
      player('victim', { selectedCardId: 'charge' }),
      player('past-leader', { kills: 100, isDead: true, hp: 0 }),
    ], 1, FINAL_LEVEL + 3, 'zh', { multiplayerMode });
    assert.deepEqual(result.winner?.inventory, [0, LAST_SKILL_LEVEL]);
    const progress = summary(result.players, { multiplayerMode, matchCount: FINAL_LEVEL + 3 });
    assert.equal(progress.matchNumber, FINAL_LEVEL);
    assert.equal(progress.isFinalBattle, true);
    assert.equal(progress.isSeriesOver, true);
    assert.equal(progress.remainingMatches, 0);
    assert.deepEqual(ids(progress.champions), [multiplayerMode === 'survival' ? 'survivor' : 'past-leader']);
  });
}

test('survival keeps early rounds open and grants the same progression skills as kills mode', () => {
  for (const matchCount of [1, 12]) {
    const players = [player('winner', { selectedCardId: 'hong' }), player('victim', { selectedCardId: 'charge' })];
    const killResult = calculateTurnOutcome(players, 1, matchCount, 'zh', { multiplayerMode: 'kills' });
    const survivalResult = calculateTurnOutcome(players, 1, matchCount, 'zh', { multiplayerMode: 'survival' });
    assert.deepEqual(survivalResult.players, killResult.players);
    const progress = summary(survivalResult.players, { multiplayerMode: 'survival', matchCount });
    assert.equal(progress.isSeriesOver, false);
    assert.equal(progress.isFinalBattle, false);
    assert.equal(progress.remainingMatches, FINAL_LEVEL - matchCount);
    assert.deepEqual(progress.champions, []);
  }
});

test('survival awards the last player alive even when an eliminated player has more kills', () => {
  const result = summary([
    player('survivor', { kills: 1 }),
    player('killer', { kills: 8, isDead: true, hp: 0 }),
  ], { multiplayerMode: 'survival', matchCount: FINAL_LEVEL });
  assert.equal(result.mode, 'survival');
  assert.equal(result.matchNumber, FINAL_LEVEL);
  assert.equal(result.totalMatches, FINAL_LEVEL);
  assert.equal(result.remainingMatches, 0);
  assert.equal(result.isSeriesOver, true);
  assert.equal(result.roundWinner?.id, 'survivor');
  assert.deepEqual(ids(result.champions), ['survivor']);
  assert.deepEqual(ids(result.standings), ['survivor', 'killer']);
});

test('survival never awards a kill leader when everyone is eliminated', () => {
  const result = summary([
    player('killer', { kills: 8, isDead: true, hp: 0 }),
    player('other', { kills: 1, isDead: true, hp: 0 }),
  ], { multiplayerMode: 'survival', matchCount: FINAL_LEVEL });
  assert.equal(result.isSeriesOver, true);
  assert.equal(result.roundWinner, null);
  assert.deepEqual(result.champions, []);
  assert.deepEqual(result.leaders, []);
});

for (const status of ['LOBBY', 'PLAYING', 'SHOWDOWN'] as const) {
  test('survival ' + status + ': no winner is declared before final settlement', () => {
    const result = summary([
      player('alive'), player('eliminated', { kills: 20, hp: 0, isDead: true }),
    ], { multiplayerMode: 'survival', matchCount: FINAL_LEVEL, status });
    assert.equal(result.isSeriesOver, false);
    assert.equal(result.roundWinner, null);
    assert.deepEqual(result.champions, []);
  });
}

test('survival final battle grants the Crown without new skills or a kill championship', () => {
  for (const matchCount of [FINAL_LEVEL, FINAL_LEVEL + 3]) {
    for (const lang of ['zh', 'en'] as const) {
      const players = [
        player('survivor', { selectedCardId: 'hong', kills: 0 }),
        player('victim', { selectedCardId: 'charge' }),
        player('killer', { kills: 8, isDead: true, hp: 0 }),
      ];
      const before = structuredClone(players);
      const result = calculateTurnOutcome(players, 1, matchCount, lang, { multiplayerMode: 'survival' });
      assert.equal(result.isGameOver, true);
      assert.equal(result.winner?.id, 'survivor');
      assert.deepEqual(result.winner?.inventory, [0]);
      assert.equal(result.winner?.pendingLevel, undefined);
      assert.equal(result.winner?.kills, 1);
      const wins = result.logs.filter(log => log.type === 'win');
      assert.equal(wins.length, 2);
      for (const win of wins) {
        assert.match(win.text, /survivor/);
        assert.doesNotMatch(win.text, /killer|Lv|击杀|total kills/);
      }
      assert.match(wins.at(-1)!.text, lang === 'zh' ? /赢得王冠/ : /wins the Crown/);
      assert.deepEqual(players, before);
    }
  }
});

test('a simultaneous survival elimination is a draw even with an unequal prior kill count', () => {
  const fixture = { ...SKILL_DB.find(card => card.id === 'hongtian')!, id: 'survival-crossfire-test', tags: ['hit_up', 'hit_all'] };
  SKILL_DB.push(fixture);
  try {
    const result = calculateTurnOutcome([
      player('prior-leader', { selectedCardId: fixture.id, kills: 9 }),
      player('other', { selectedCardId: fixture.id, kills: 0 }),
    ], 1, FINAL_LEVEL, 'zh', { multiplayerMode: 'survival' });
    assert.equal(result.isGameOver, true);
    assert.equal(result.winner, undefined);
    assert.ok(result.players.every(player => player.isDead));
    assert.ok(result.logs.some(log => /平局/.test(log.text)));
    assert.equal(result.logs.some(log => log.type === 'win'), false);
    assert.deepEqual(summary(result.players, { multiplayerMode: 'survival', matchCount: FINAL_LEVEL }).champions, []);
  } finally {
    SKILL_DB.splice(SKILL_DB.indexOf(fixture), 1);
  }
});

test('the final survivor and cumulative kill champion can be different players', () => {
  const result = summary([
    player('survivor', { kills: 2 }),
    player('champion', { kills: 8, isDead: true, hp: 0 }),
  ]);
  assert.equal(result.matchNumber, FINAL_LEVEL);
  assert.equal(result.totalMatches, FINAL_LEVEL);
  assert.equal(result.remainingMatches, 0);
  assert.equal(result.isSeriesOver, true);
  assert.equal(result.roundWinner?.id, 'survivor');
  assert.deepEqual(ids(result.champions), ['champion']);
});

test('equal maximum kills award every leader a shared championship in stable roster order', () => {
  const result = summary([
    player('runner-up', { kills: 3, isDead: true, hp: 0 }),
    player('b', { kills: 7 }),
    player('a', { kills: 7, isDead: true, hp: 0 }),
  ]);
  assert.deepEqual(ids(result.standings), ['b', 'a', 'runner-up']);
  assert.deepEqual(ids(result.leaders), ['b', 'a']);
  assert.deepEqual(ids(result.champions), ['b', 'a']);
});

test('a completed final draw still ranks the series, including an all-zero shared result', () => {
  const result = summary([
    player('missing-kills', { isDead: true, hp: 0 }),
    player('zero-kills', { isDead: true, hp: 0, kills: 0 }),
  ]);
  assert.equal(result.roundWinner, null);
  assert.equal(result.isSeriesOver, true);
  assert.deepEqual(ids(result.champions), ['missing-kills', 'zero-kills']);
});

test('a previous match exposes leaders without prematurely declaring series champions', () => {
  const result = summary([
    player('winner', { kills: 5 }),
    player('other', { isDead: true, hp: 0 }),
  ], { matchCount: FINAL_LEVEL - 1 });
  assert.equal(result.isSeriesOver, false);
  assert.equal(result.remainingMatches, 1);
  assert.equal(result.roundWinner?.id, 'winner');
  assert.deepEqual(ids(result.leaders), ['winner']);
  assert.deepEqual(result.champions, []);
});

for (const status of ['LOBBY', 'PLAYING', 'SHOWDOWN'] as const) {
  test(status + ': the final match is unfinished until GAMEOVER, even with one survivor', () => {
    const result = summary([player('alive', { kills: 3 }), player('dead', { isDead: true, hp: 0 })], { status });
    assert.equal(result.isSeriesOver, false);
    assert.equal(result.roundWinner, null);
    assert.deepEqual(result.champions, []);
  });
}

test('ranking does not reorder players, edit their state, or inspect hidden selections', () => {
  const players = [player('second', { kills: 1 }), player('first', { kills: 2, isDead: true, hp: 0 })];
  for (const entry of players) {
    Object.defineProperty(entry, 'selectedCardId', { get: () => { throw new Error('Hidden selection was read'); } });
    Object.freeze(entry.inventory);
    Object.freeze(entry);
  }
  Object.freeze(players);
  const result = summary(players);
  assert.deepEqual(ids(players), ['second', 'first']);
  assert.deepEqual(ids(result.standings), ['first', 'second']);
  assert.equal(result.standings[0], players[1]);
  assert.equal(players[0].kills, 1);
});

test('an empty final roster has no invented winner or champion', () => {
  const result = summary([]);
  assert.equal(result.roundWinner, null);
  assert.deepEqual(result.champions, []);
  assert.deepEqual(result.leaders, []);
});

test('the final engine result reports the round survivor separately from the series champion', () => {
  for (const lang of ['zh', 'en'] as const) {
    const result = calculateTurnOutcome([
      player('survivor', { selectedCardId: 'hong' }),
      player('victim', { selectedCardId: 'charge' }),
      player('past-leader', { kills: 8, isDead: true, hp: 0 }),
    ], 4, FINAL_LEVEL, lang);
    assert.equal(result.isGameOver, true);
    assert.equal(result.winner?.id, 'survivor');
    assert.deepEqual(result.winner?.inventory, [0]);
    const wins = result.logs.filter(log => log.type === 'win').map(log => log.text);
    assert.equal(wins.length, 2);
    assert.match(wins[0], /survivor/);
    assert.match(wins[0], lang === 'zh' ? /王冠争夺最后一战/ : /final Crown Battle/);
    assert.match(wins[1], /past-leader/);
    assert.match(wins[1], new RegExp(String(FINAL_LEVEL)));
    if (lang === 'zh') assert.match(wins[1], new RegExp(`${FINAL_LEVEL} 局赛程结束`));
    assert.match(wins[1], lang === 'zh' ? /总冠军/ : /Champion/);
    assert.doesNotMatch(wins[1], /survivor/);
  }
});

test('the final engine result keeps every tied cumulative leader after the last kill', () => {
  const result = calculateTurnOutcome([
    player('a-finalist', { selectedCardId: 'hong', kills: 4 }),
    player('b-former-leader', { kills: 5, isDead: true, hp: 0 }),
    player('c-victim', { selectedCardId: 'charge' }),
  ], 1, FINAL_LEVEL, 'zh');
  const resultSummary = summary(result.players);
  assert.deepEqual(ids(resultSummary.champions), ['a-finalist', 'b-former-leader']);
  const completion = result.logs.at(-1)!;
  assert.equal(completion.type, 'win');
  assert.match(completion.text, /并列总冠军/);
  assert.match(completion.text, /a-finalist、b-former-leader/);
  assert.match(completion.text, /5 次击杀/);
});

test('a simultaneous final elimination ends the series and awards tied kill leaders', () => {
  const fixture = { ...SKILL_DB.find(card => card.id === 'hongtian')!, id: 'series-crossfire-test', tags: ['hit_up', 'hit_all'] };
  SKILL_DB.push(fixture);
  try {
    for (const lang of ['zh', 'en'] as const) {
      const result = calculateTurnOutcome([
        player('a', { selectedCardId: fixture.id, kills: 4 }),
        player('b', { selectedCardId: fixture.id, kills: 4 }),
      ], 3, FINAL_LEVEL, lang);
      assert.equal(result.isGameOver, true);
      assert.equal(result.winner, undefined);
      assert.ok(result.players.every(player => player.isDead));
      assert.ok(result.players.every(player => player.kills === 5));
      const resultSummary = summary(result.players);
      assert.equal(resultSummary.roundWinner, null);
      assert.equal(resultSummary.isSeriesOver, true);
      assert.deepEqual(ids(resultSummary.champions), ['a', 'b']);
      assert.ok(result.logs.some(log => /平局|Draw/.test(log.text)));
      assert.match(result.logs.at(-1)!.text, lang === 'zh' ? /赛程结束.*并列总冠军：a、b/ : /series complete.*Joint champions: a, b/);
    }
  } finally {
    SKILL_DB.splice(SKILL_DB.indexOf(fixture), 1);
  }
});

test('earlier draws leave the series open and do not grant skills', () => {
  const result = calculateTurnOutcome([
    player('a', { hp: 0, isDead: true }), player('b', { hp: 0, isDead: true }),
  ], 1, FINAL_LEVEL - 1, 'zh');
  assert.equal(result.isGameOver, true);
  assert.equal(result.winner, undefined);
  assert.equal(summary(result.players, { matchCount: FINAL_LEVEL - 1 }).isSeriesOver, false);
  assert.deepEqual(result.logs.map(log => log.text), ['平局!']);
  assert.ok(result.players.every(player => player.inventory.length === 1));
});

for (const mode of ['expedition', 'practice'] as const) {
  test(mode + ': the final multiplayer match number remains an ordinary solo victory', () => {
    const result = calculateTurnOutcome([
      player('solo', { selectedCardId: 'hong' }), player('enemy', { selectedCardId: 'charge' }),
    ], 1, FINAL_LEVEL, 'zh', { mode });
    assert.equal(result.winner?.id, 'solo');
    assert.deepEqual(result.winner?.inventory, [0]);
    assert.deepEqual(result.logs.filter(log => log.type === 'win').map(log => log.text), ['🏆 solo 获胜!']);
  });
}
