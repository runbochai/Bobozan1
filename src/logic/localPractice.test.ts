import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_HP } from '../data/constants';
import { calculateTurnOutcome } from './combat';
import {
  commitLocalPracticeBot, createLocalPractice, getLocalPracticeCards, getLocalPracticeLegalCards,
  LOCAL_BOT_ID, LOCAL_HERO_ID, resolveLocalPracticeTurn,
} from './localPractice';

const player = (state: ReturnType<typeof createLocalPractice>, id = LOCAL_HERO_ID) => state.players.find(item => item.id === id)!;

test('offline duel starts with multiplayer HP, zero energy, and the full base deck', () => {
  const state = createLocalPractice('en', 'avatar-one');
  assert.equal(MAX_HP, 1);
  assert.equal(player(state).avatar, 'avatar-one');
  for (const participant of state.players) {
    assert.equal(participant.hp, MAX_HP);
    assert.equal(participant.energy, 0);
    assert.deepEqual(participant.inventory, [0]);
    assert.equal(participant.selectedCardId, null);
  }
  assert.deepEqual(new Set(getLocalPracticeCards(state.players).map(card => card.id)),
    new Set(['charge', 'defend', 'hong', 'hong2', 'liuke', 'ka', 'ji', 'kajifen', 'kajisuper']));
  assert.deepEqual(getLocalPracticeLegalCards(state.players).map(card => card.id), ['charge', 'defend']);
});

test('bot commits using public state, independently of hidden human selections', () => {
  const state = createLocalPractice();
  state.players.forEach(participant => { participant.energy = 4; });
  const original = JSON.stringify(state.players);
  const choices = getLocalPracticeLegalCards(state.players);
  const botMoves = choices.map(card => commitLocalPracticeBot(state.players.map(participant => ({
    ...participant,
    selectedCardId: participant.id === LOCAL_HERO_ID ? card.id : 'kajisuper',
  })), 3));
  assert.equal(new Set(botMoves).size, 1);
  assert.ok(getLocalPracticeLegalCards(state.players, LOCAL_BOT_ID).some(card => card.id === botMoves[0]));
  assert.equal(JSON.stringify(state.players), original);
  const concealed = state.players.map(participant => Object.defineProperty({ ...participant }, 'selectedCardId', {
    get() { throw new Error('Hidden card must not be read'); },
  }));
  assert.equal(commitLocalPracticeBot(concealed, 3), botMoves[0]);
});

test('each result is the default multiplayer engine result and leaves input untouched', () => {
  const state = createLocalPractice('en');
  const before = structuredClone(state);
  const next = resolveLocalPracticeTurn(state, 'charge', 'en');
  const expected = calculateTurnOutcome(state.players.map(participant => ({
    ...participant, selectedCardId: participant.id === LOCAL_HERO_ID ? 'charge' : state.committedBotMove,
  })), 1, 1, 'en');
  assert.deepEqual(next.players, expected.players);
  assert.deepEqual(next.lastRound?.logs, expected.logs);
  assert.equal(next.isGameOver, expected.isGameOver);
  assert.equal(next.winnerId, expected.winner?.id ?? null);
  assert.deepEqual(state, before);
  next.players[0].inventory.push(22);
  assert.deepEqual(state, before, 'Returned player arrays must not alias the input');
  assert.ok(next.lastRound?.before.every(participant => participant.selectedCardId === null));
});

test('multiple turns carry actual energy, previous actions and the next bot commitment forward', () => {
  let state = createLocalPractice();
  // Both can charge at zero energy, then repeat Charge to keep this path nonlethal.
  state = resolveLocalPracticeTurn({ ...state, committedBotMove: 'charge' }, 'charge');
  assert.equal(state.turn, 2);
  assert.equal(player(state).energy, 2);
  assert.equal(player(state, LOCAL_BOT_ID).energy, 2);
  assert.equal(state.committedBotMove, commitLocalPracticeBot(state.players, 2));
  state = resolveLocalPracticeTurn({ ...state, committedBotMove: 'hong' }, 'defend');
  assert.equal(state.turn, 3);
  assert.equal(player(state).energy, 2, 'Defense preserves existing energy');
  assert.equal(player(state, LOCAL_BOT_ID).energy, 1, 'Attack spends actual cost');
  assert.equal(player(state).lastCardId, 'defend');
  assert.equal(player(state, LOCAL_BOT_ID).lastCardId, 'hong');
  assert.ok(state.players.every(participant => participant.hp === 1 && participant.selectedCardId === null));
  assert.match(state.lastRound!.explanation, /挡住/);
  assert.equal(state.committedBotMove, commitLocalPracticeBot(state.players, 3));
});

test('lethal hits interrupt Charge and end a duel without a fake victory or extra turn', () => {
  const initial = createLocalPractice();
  initial.players.forEach(participant => { participant.energy = 2; });
  const loss = resolveLocalPracticeTurn({ ...initial, committedBotMove: 'hong' }, 'charge');
  assert.equal(loss.isGameOver, true);
  assert.equal(loss.winnerId, LOCAL_BOT_ID);
  assert.equal(player(loss).energy, 2, 'Interrupted Charge adds no energy');
  assert.equal(player(loss).hp, 0);
  assert.equal(loss.committedBotMove, null);
  assert.match(loss.lastRound!.explanation, /攒被打断/);
  assert.throws(() => resolveLocalPracticeTurn(loss, 'charge'), /ended/);
  const win = resolveLocalPracticeTurn({ ...initial, committedBotMove: 'charge' }, 'hong');
  assert.equal(win.winnerId, LOCAL_HERO_ID);
  assert.equal(player(win, LOCAL_BOT_ID).hp, 0);
  assert.deepEqual(player(win).inventory, [0, 1], 'Keep the real multiplayer winner reward at duel end');
});

test('unaffordable, unknown, sealed and already-dead moves cannot be submitted', () => {
  const state = createLocalPractice();
  assert.throws(() => resolveLocalPracticeTurn(state, 'hong'), /Unavailable practice card/);
  assert.throws(() => resolveLocalPracticeTurn(state, 'not-a-card'), /Unavailable practice card/);
  player(state).disabledSkills = ['charge'];
  assert.throws(() => resolveLocalPracticeTurn(state, 'charge'), /Unavailable practice card/);
  player(state).isDead = true;
  assert.deepEqual(getLocalPracticeLegalCards(state.players), []);
  assert.throws(() => resolveLocalPracticeTurn(state, 'defend'), /Unavailable practice card/);
});

test('reachable bot decisions remain legal across repeated real duels', () => {
  let state = createLocalPractice('en');
  let finished = 0;
  for (let turn = 0; turn < 60; turn++) {
    const legal = getLocalPracticeLegalCards(state.players);
    assert.ok(getLocalPracticeLegalCards(state.players, LOCAL_BOT_ID).some(card => card.id === state.committedBotMove));
    const choice = legal[turn % legal.length];
    state = resolveLocalPracticeTurn(state, choice.id, 'en');
    assert.ok(state.players.every(participant => participant.energy >= 0 && participant.hp >= 0));
    if (state.isGameOver) {
      finished++;
      state = createLocalPractice('en');
    }
  }
  assert.ok(finished > 0, 'Real AI duels must reach an actual terminal result');
});
