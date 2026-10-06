import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeExpeditionCard, enemyHabit, loadExpeditionBest, saveExpeditionBest, EXPEDITION_BEST_KEY } from './expedition';
import { EXPEDITION_STAGES } from '../data/expedition';
import { calculateTurnOutcome, getPlayerCards } from './combat';
import type { Player } from '../types';

const player = (id: string, extra: Partial<Player> = {}): Player => ({ id, name: id, isBot: false,
  hp: 3, energy: 5, inventory: [0], isDead: false, layer: 0, tempLayerMod: 0,
  selectedCardId: null, lastCardId: null, lastAction: null, ...extra });

test('three-use secret remains playable in the same battle and disappears only after its last use', () => {
  let cards = [{ cardId: 'pegasus', usesLeft: 3 }];
  let hero = player('hero', { tempSkills: ['pegasus'] });
  let foe = player('foe');
  for (let uses = 3; uses > 0; uses--) {
    assert.ok(getPlayerCards(hero, [hero, foe]).some(card => card.id === 'pegasus'));
    const outcome = calculateTurnOutcome([{ ...hero, selectedCardId: 'pegasus' }, { ...foe, selectedCardId: 'defend' }], 4 - uses, 1, 'zh', { mode: 'expedition' });
    cards = consumeExpeditionCard(cards, 'pegasus');
    hero = { ...outcome.players.find(p => p.id === 'hero')!, tempSkills: cards.map(card => card.cardId) };
    foe = outcome.players.find(p => p.id === 'foe')!;
    assert.equal(cards[0]?.usesLeft ?? 0, uses - 1);
    assert.equal(hero.energy, 5 - (4 - uses));
  }
  assert.ok(!getPlayerCards(hero, [hero, foe]).some(card => card.id === 'pegasus'));
});

test('an absorbed free copy is consumed before the paid expedition copy', () => {
  const cards = [{ cardId: 'pegasus', usesLeft: 2 }];
  const hero = player('hero', { energy: 0, freeSkills: ['pegasus'], tempSkills: ['pegasus'], selectedCardId: 'pegasus' });
  const result = calculateTurnOutcome([hero, player('foe', { selectedCardId: 'defend' })], 1, 1, 'zh', { mode: 'expedition' });
  assert.equal(result.players.find(p => p.id === 'hero')!.freeSkills!.length, 0);
  assert.deepEqual(consumeExpeditionCard(cards, hero.freeSkills?.includes('pegasus') ? null : 'pegasus'), cards);
  assert.equal(cards[0].usesLeft, 2);
});

test('habit hints describe personality without accepting the hidden move or turn', () => {
  assert.match(enemyHabit({ aggression: .2, defense: .8, charge: .4, smart: .1 }, 'zh'), /防守/);
  assert.match(enemyHabit({ aggression: .2, defense: .1, charge: .9, smart: .1 }, 'en'), /charges/);
  assert.match(enemyHabit({ aggression: .9, defense: .1, charge: .1, smart: .1 }, 'en'), /aggressive/);
});

test('best record accepts the actual final stage, preserves it on earlier wins and recovers corrupt storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  try {
    data.set(EXPEDITION_BEST_KEY, 'NaN');
    assert.equal(loadExpeditionBest(), 0);
    saveExpeditionBest(1);
    assert.equal(loadExpeditionBest(), 1);
    saveExpeditionBest(EXPEDITION_STAGES.length);
    saveExpeditionBest(2);
    assert.equal(loadExpeditionBest(), EXPEDITION_STAGES.length);
    saveExpeditionBest(Infinity);
    saveExpeditionBest(EXPEDITION_STAGES.length + 1);
    assert.equal(loadExpeditionBest(), EXPEDITION_STAGES.length);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
