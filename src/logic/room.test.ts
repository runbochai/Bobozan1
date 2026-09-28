import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameState, Player } from '../types';
import { advanceRoom, joinPlayer, leavePlayer, patchPlayer, settleRoom, startRoom, submitPlayerMove } from './room';
import { calculateTurnOutcome } from './combat';
import { MAX_PLAYERS } from '../data/constants';

const player = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: false, hp: 2, energy: 4, isDead: false,
  inventory: [0], layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
});
const room = (patch: Partial<GameState> = {}): GameState => ({
  status: 'PLAYING', turn: 1, matchCount: 1, hostId: 'a',
  players: [player('a'), player('b')], logs: [], ...patch,
});

test('both players retain moves when callbacks run against the latest room in either order', () => {
  for (const order of [['a', 'b'], ['b', 'a']]) {
    let state = room();
    const round = { turn: state.turn, matchCount: state.matchCount };
    for (const id of order) state = { ...state, ...submitPlayerMove(state, id, 'charge', round) };
    assert.deepEqual(state.players.map(p => p.selectedCardId), ['charge', 'charge']);
  }
});

test('emoji changes preserve submitted moves and moves preserve emoji changes', () => {
  for (const emojiFirst of [false, true]) {
    let state = room();
    const emoji = () => { state = { ...state, ...patchPlayer(state, 'b', p => ({ ...p, emoji: '👍', emojiAt: 123 })) }; };
    if (emojiFirst) emoji();
    state = { ...state, ...submitPlayerMove(state, 'a', 'hong', state) };
    if (!emojiFirst) emoji();
    assert.equal(state.players[0].selectedCardId, 'hong');
    assert.equal(state.players[1].emoji, '👍');
  }
});

test('joining uses current capacity and reconnecting during play does not duplicate a player', () => {
  let state = room({ status: 'LOBBY', players: Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => player(String(i))) });
  state = { ...state, ...joinPlayer(state, player('last')) };
  assert.throws(() => joinPlayer(state, player('extra')), /roomFull/);
  assert.equal(joinPlayer({ ...state, status: 'PLAYING' }, player('last')), null);
  assert.throws(() => joinPlayer(room(), player('new')), /gameStarted/);
});

test('only the host can start, advance or settle the room', () => {
  assert.equal(startRoom(room({ status: 'LOBBY' }), 'b', 'zh'), null);
  const state = room({ players: [player('a', { selectedCardId: 'charge' }), player('b', { selectedCardId: 'charge' })] });
  assert.equal(advanceRoom(state, 'b'), null);
  assert.equal(settleRoom({ ...state, status: 'SHOWDOWN' }, 'b', state, 'zh'), null);
});

test('host departure transfers authority to a human rather than a bot', () => {
  const state = room({ players: [player('a'), player('bot', { isBot: true }), player('b')] });
  const result = { ...state, ...leavePlayer(state, 'a') };
  assert.equal(result.hostId, 'b');
  assert.equal(result.players.some(p => p.id === 'a'), false);
  assert.equal(leavePlayer(result, 'a'), null);
});

test('departure of the final human closes the room', () => {
  const state = room({ players: [player('a'), player('bot', { isBot: true })] });
  assert.equal(leavePlayer(state, 'a')?.status, 'GAMEOVER');
  assert.equal(leavePlayer(state, 'a')?.hostId, '');
});

test('a remaining survivor can finish after the other human leaves', () => {
  let state = room();
  state = { ...state, ...leavePlayer(state, 'a') };
  state = { ...state, ...advanceRoom(state, 'b') };
  assert.equal(state.status, 'SHOWDOWN');
  state = { ...state, ...settleRoom(state, 'b', state, 'zh') };
  assert.equal(state.status, 'GAMEOVER');
  assert.deepEqual(state.players[0].inventory, [0, 1]);
});

test('advance waits for humans and submits bot moves atomically with showdown', () => {
  const state = room({ players: [player('a'), player('bot', { isBot: true })] });
  assert.equal(advanceRoom(state, 'a'), null);
  const ready = { ...state, ...submitPlayerMove(state, 'a', 'charge', state) };
  const result = advanceRoom(ready, 'a');
  assert.equal(result?.status, 'SHOWDOWN');
  assert.ok(result?.players?.every(p => p.selectedCardId));
  assert.equal(ready.players[1].selectedCardId, null);
});

test('stale round and duplicate move submissions are rejected', () => {
  const state = room();
  assert.throws(() => submitPlayerMove(state, 'a', 'charge', { turn: 2, matchCount: 1 }), /Round/);
  assert.throws(() => submitPlayerMove(state, 'a', 'charge', { turn: 1, matchCount: 2 }), /Round/);
  const ready = { ...state, ...submitPlayerMove(state, 'a', 'charge', state) };
  assert.throws(() => submitPlayerMove(ready, 'a', 'hong', state), /locked/);
  assert.throws(() => submitPlayerMove({ ...state, status: 'SHOWDOWN' }, 'a', 'charge', state), /Round/);
});

test('move validation rejects unknown, unowned, disabled, unaffordable and dead-player moves', () => {
  const state = room({ players: [player('a', { energy: 0, disabledSkills: ['defend'] }), player('b')] });
  assert.throws(() => submitPlayerMove(state, 'a', 'invalid', state), /Unavailable/);
  assert.throws(() => submitPlayerMove(state, 'a', 'dragonclaw', state), /Unavailable/);
  assert.throws(() => submitPlayerMove(state, 'a', 'defend', state), /Unavailable/);
  assert.throws(() => submitPlayerMove(state, 'a', 'hong', state), /energy/);
  assert.throws(() => submitPlayerMove(room({ players: [player('a', { isDead: true })] }), 'a', 'charge', state), /inactive/);
});

test('absorbed skills can be submitted without energy', () => {
  const state = room({ players: [player('a', { energy: 0, freeSkills: ['hong'] }), player('b')] });
  assert.equal(submitPlayerMove(state, 'a', 'hong', state)?.players?.[0].selectedCardId, 'hong');
});

test('settlement is idempotent and ignores callbacks from old matches', () => {
  const state = room({ status: 'SHOWDOWN', players: [player('a', { selectedCardId: 'charge' }), player('b', { selectedCardId: 'charge' })] });
  const settled = { ...state, ...settleRoom(state, 'a', state, 'zh') };
  assert.equal(settled.turn, 2);
  assert.equal(settleRoom(settled, 'a', state, 'zh'), null);
  assert.equal(settleRoom({ ...state, matchCount: 2 }, 'a', state, 'zh'), null);
});

test('settlement consumes free and temporary skills without mutating inputs', () => {
  const players = [player('a', { selectedCardId: 'hong', freeSkills: ['hong'] }), player('b', { selectedCardId: 'defend', tempSkills: ['defend'] })];
  const before = structuredClone(players);
  const first = calculateTurnOutcome(players, 1, 1, 'zh');
  const second = calculateTurnOutcome(players, 1, 1, 'zh');
  assert.deepEqual(players, before);
  assert.deepEqual(first, second);
  assert.deepEqual(first.players[0].freeSkills, []);
  assert.deepEqual(first.players[1].tempSkills, []);
});

test('winning awards inventory without mutating the input inventory', () => {
  const players = [player('a', { selectedCardId: 'hong' }), player('b', { hp: 1, selectedCardId: 'charge' })];
  const before = structuredClone(players);
  const result = calculateTurnOutcome(players, 1, 1, 'zh');
  assert.equal(result.isGameOver, true);
  assert.deepEqual(result.winner?.inventory, [0, 1]);
  assert.deepEqual(players, before);
});

test('malformed card data raises a meaningful error instead of dereferencing undefined', () => {
  assert.throws(() => calculateTurnOutcome([player('a', { selectedCardId: 'invalid' })], 1, 1, 'zh'), /Invalid card for player a/);
});

test('elimination with multiple survivors resets the phase and bumps resetSeq', () => {
  const players = [
    player('a', { hp: 1, selectedCardId: 'charge' }),
    player('b', { selectedCardId: 'hong' }),
    player('c', { selectedCardId: 'defend' }),
  ];
  const result = calculateTurnOutcome(players, 1, 1, 'zh');
  assert.equal(result.survivorReset, true);
  assert.equal(result.isGameOver, false);
  assert.equal(result.players.find(p => p.id === 'a')!.isDead, true);
  // 幸存者状态被重置
  for (const id of ['b', 'c']) {
    const s = result.players.find(p => p.id === id)!;
    assert.equal(s.hp, 1);
    assert.equal(s.energy, 0);
    assert.equal(s.layer, 0);
  }

  const state = room({ status: 'SHOWDOWN', players, resetSeq: 4 });
  const patch = settleRoom(state, 'a', state, 'zh');
  assert.equal(patch?.resetSeq, 5);
});

test('final elimination ends the game without bumping resetSeq', () => {
  const players = [
    player('a', { hp: 1, selectedCardId: 'charge' }),
    player('b', { selectedCardId: 'hong' }),
  ];
  const result = calculateTurnOutcome(players, 1, 1, 'zh');
  assert.equal(result.survivorReset, false);
  assert.equal(result.isGameOver, true);

  const state = room({ status: 'SHOWDOWN', players });
  const patch = settleRoom(state, 'a', state, 'zh');
  assert.equal(patch?.resetSeq, undefined);
});

test('dmgBonus：狂战斧让攻击伤害 +0.5（1.5 血敌人被一击秒杀）', () => {
  const atk = (patch: Partial<Player> = {}) => player('a', { selectedCardId: 'hong', ...patch });
  const def = () => player('b', { hp: 1.5, selectedCardId: 'charge' });
  // 无加成：轰造成 1 点，1.5 血敌人剩 0.5 血
  let r = calculateTurnOutcome([atk(), def()], 1, 1, 'zh');
  let b = r.players.find((p) => p.id === 'b')!;
  assert.equal(b.hp, 0.5);
  assert.equal(b.isDead, false);
  // 有加成：1.5 点伤害直接秒杀
  r = calculateTurnOutcome([atk({ dmgBonus: 0.5 }), def()], 1, 1, 'zh');
  b = r.players.find((p) => p.id === 'b')!;
  assert.equal(b.isDead, true);
});
