import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameState, Player } from '../types';
import { calculateTurnOutcome } from './combat';
import { getMultiplayerRecap } from './multiplayerHelp';

const player = (id: string, selectedCardId: string): Player => ({
  id, name: id, isBot: false, hp: 1, energy: 5, isDead: false, inventory: [0], layer: 0,
  tempLayerMod: 0, selectedCardId, lastCardId: null, lastAction: null,
});

function settled(first: string, second: string): GameState {
  const outcome = calculateTurnOutcome([player('Alice', first), player('Bob', second)], 1, 1, 'en');
  return {
    status: outcome.isGameOver ? 'GAMEOVER' : 'PLAYING', turn: outcome.isGameOver ? 1 : 2,
    matchCount: 1, hostId: 'Alice', players: outcome.players,
    logs: [...outcome.logs, { turn: 1, text: 'Game Started!', type: 'info' }],
  };
}

test('silent Charge, blocked Blast, and tied Blasts still provide a completed-turn recap', () => {
  for (const [first, second, explanation] of [
    ['charge', 'charge', /each gained 2 energy/],
    ['defend', 'hong', /Alice blocked Bob/],
    ['hong', 'hong', /attacks canceled/],
  ] as const) {
    const game = settled(first, second);
    assert.equal(game.logs.length, 1, 'Only the match-start marker exists; the engine emitted no events');
    const recap = getMultiplayerRecap(game, 'en');
    assert.equal(recap?.turn, 1);
    assert.deepEqual(recap?.logs, []);
    assert.deepEqual(recap?.revealed.map(card => card.cardId), [first, second]);
    assert.match(recap?.explanation ?? '', explanation);
  }
});

test('restarting a match hides stale cards and old turn-one logs in both languages', () => {
  for (const marker of ['--- MATCH 2 ---', '--- 第 2 局 ---']) {
    const game = settled('hong', 'charge');
    game.status = 'PLAYING';
    game.turn = 1;
    game.matchCount = 2;
    game.logs.unshift({ turn: 1, text: marker, type: 'info' });
    assert.equal(getMultiplayerRecap(game, 'en'), null);
    // Real next-match reset clears lastCardId; safe turn one can then be silent.
    const fresh = settled('charge', 'charge');
    fresh.matchCount = 2;
    fresh.logs = [{ turn: 1, text: marker, type: 'info' }, ...game.logs.slice(1)];
    const recap = getMultiplayerRecap(fresh, 'en');
    assert.deepEqual(recap?.logs, [], 'Previous match events must not be attributed to the new first turn');
    assert.match(recap?.explanation ?? '', /each gained 2 energy/);
  }
});

test('showdown never exposes a recap and secret selections are never read or returned', () => {
  const game = settled('charge', 'charge');
  const concealed = game.players.map(participant => Object.defineProperty({ ...participant }, 'selectedCardId', {
    get() { throw new Error('Secret choices must not be read by recap'); },
  }));
  const recap = getMultiplayerRecap({ ...game, players: concealed }, 'en');
  assert.equal(recap?.revealed.length, 2);
  assert.ok(recap?.revealed.every(card => !('selectedCardId' in card)));
  assert.equal(getMultiplayerRecap({ ...game, players: concealed, status: 'SHOWDOWN' }, 'en'), null);
});

test('final-turn combat evidence takes priority over inferred explanations', () => {
  const game = settled('hong', 'charge');
  assert.equal(game.status, 'GAMEOVER');
  const recap = getMultiplayerRecap(game, 'en');
  assert.equal(recap?.turn, 1);
  assert.ok(recap?.logs.some(log => /Charging/.test(log.text)));
  assert.equal(recap?.explanation, null);
});

test('unknown cards, absent evidence, different layers, and multi-player history do not invent explanations', () => {
  const game = settled('defend', 'hong');
  game.players[1].layer = 1;
  assert.equal(getMultiplayerRecap(game, 'en')?.explanation, null, 'A distant Blast was not necessarily blocked');
  game.players.push({ ...player('Earlier elimination', 'hong'), isDead: true, lastCardId: 'hong' });
  assert.equal(getMultiplayerRecap(game, 'en')?.explanation, null);
  game.players.forEach(participant => { participant.lastCardId = 'unknown'; });
  assert.equal(getMultiplayerRecap(game, 'en'), null);
});
