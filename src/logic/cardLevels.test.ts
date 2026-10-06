import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';
import {
  calculateTurnOutcome, doesCard1Overpower, getEffectiveLevel, getPlayerCard,
  getPlayerCards, getPlayerLevel, getShowdownWinner, withPlayerCardLevel,
} from './combat';
import { expeditionMoveWeights } from './expeditionAI';
import { getBotMove } from './botAI';

const player = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: id !== 'hero', hp: 3, energy: 10, isDead: false,
  inventory: [0, 1], skillLoadout: ['pegasus', 'meteor'], layer: 0, tempLayerMod: 0,
  selectedCardId: 'pegasus', lastCardId: null, lastAction: null, ...patch,
});
const card = (id: string) => SKILL_DB.find(item => item.id === id)!;
const settle = (...players: Player[]) => calculateTurnOutcome(players, 1, 1, 'en', { mode: 'expedition' });

test('endless skill ranks cross non-attacking unlock levels and continue beyond the catalog', () => {
  for (const rank of [6, 12, 24, 25, 26, 101, 10_000]) {
    const hero = player('hero', { endlessLevel: rank });
    assert.equal(getPlayerLevel(hero), rank);
    const hand = getPlayerCards(hero);
    for (const id of ['pegasus', 'meteor']) {
      const learned = getPlayerCard(hero, id)!;
      assert.equal(getEffectiveLevel(learned), rank);
      assert.equal(getEffectiveLevel(hand.find(item => item.id === id)!), rank);
      assert.equal(learned.levelRequired, 1);
      assert.equal(learned.cost, card(id).cost);
      assert.equal(learned.tier, card(id).tier);
    }
  }
});

test('a single endless rank gives a real same-tier advantage without increasing damage', () => {
  for (const [low, high] of [[5, 6], [11, 12], [25, 26], [999, 1000]]) {
    const hero = player('hero', { endlessLevel: low }), enemy = player('enemy', { endlessLevel: high });
    const result = settle(hero, enemy);
    assert.equal(result.damageTaken.hero, 1);
    assert.equal(result.damageTaken.enemy, 0);
    assert.deepEqual(getShowdownWinner([hero, enemy]), ['enemy']);
    const tied = settle(hero, { ...enemy, endlessLevel: low });
    assert.equal(tied.damageTaken.hero, 0);
    assert.equal(tied.damageTaken.enemy, 0);
    assert.equal(result.players.find(item => item.id === 'enemy')!.endlessLevel, high);
  }
});

test('tier still outranks a level above 100 in combat and the winner animation', () => {
  const trained = player('trained', { endlessLevel: 10_000 });
  const ultimate = player('ultimate', { selectedCardId: 'ka', inventory: [0], skillLoadout: [] });
  const charging = player('charging', { selectedCardId: 'charge' });
  const result = settle(trained, ultimate, charging);
  assert.equal(result.damageTaken.trained, 1);
  assert.equal(result.damageTaken.ultimate, 0);
  assert.deepEqual(getShowdownWinner([trained, ultimate, charging]), ['ultimate']);
});

test('basic paid ties and defensive escapes survive arbitrarily high enemy ranks', () => {
  const enemy = player('enemy', { endlessLevel: 500 });
  for (const move of ['hong2', 'liuke', 'defend', 'smallfly']) {
    const result = settle(enemy, player('hero', { selectedCardId: move, inventory: [0, 2] }));
    assert.equal(result.damageTaken.hero, 0, move);
    assert.equal(result.damageTaken.enemy, 0, move);
  }
  const highUltimate = { ...enemy, selectedCardId: 'meteor' };
  const ji = player('hero', { selectedCardId: 'ji' });
  const result = settle(highUltimate, ji);
  assert.equal(result.damageTaken.hero, 0);
  assert.equal(result.damageTaken.enemy, 0);
});

test('basic, defensive, temporary, absorbed and combo cards do not inherit endless rank', () => {
  const hero = player('hero', { endlessLevel: 200, inventory: [0, 1, 2, 3, 5],
    skillLoadout: ['pegasus', 'icesword', 'dragonclaw', 'smallfly', 'bigfly'],
    tempSkills: ['gun'], freeSkills: ['meteor'] });
  for (const id of ['hong2', 'ji', 'smallfly', 'bigfly', 'gun', 'meteor', 'skydragon', 'doublewing']) {
    const resolved = getPlayerCards(hero).find(item => item.id === id)!;
    assert.ok(resolved, id);
    assert.equal(resolved.combatLevel, undefined, id);
    assert.equal(getEffectiveLevel(resolved), getEffectiveLevel(card(id)), id);
  }
  const combo = getPlayerCard(hero, 'skydragon')!;
  assert.equal(doesCard1Overpower(combo, getPlayerCard(player('enemy', { endlessLevel: 300 }), 'meteor')!), true);
  assert.equal(doesCard1Overpower(combo, card('kajifen')), false);
});

test('discarded skill history cannot retain training through a temporary borrowed copy', () => {
  const owner = player('owner', { endlessLevel: 40 });
  const trained = getPlayerCard(owner, 'pegasus')!;
  const borrower = player('borrower', { endlessLevel: 50, skillLoadout: [], tempSkills: ['pegasus'] });
  assert.equal(getEffectiveLevel(getPlayerCard(borrower, 'pegasus')!), 1);
  assert.equal(getEffectiveLevel(withPlayerCardLevel(borrower, trained)), 1);
  assert.equal(trained.combatLevel, 40);
});

test('ordinary modes retain original skill ranks and the shared catalog is never mutated', () => {
  const catalog = structuredClone(SKILL_DB);
  const ordinary = player('hero', { inventory: [0, 1, 23] });
  assert.equal(getPlayerLevel(ordinary), 23);
  assert.equal(getEffectiveLevel(getPlayerCard(ordinary, 'pegasus')!), 1);
  const advanced = player('enemy', { inventory: [0, 2], skillLoadout: ['icesword'], selectedCardId: 'icesword' });
  assert.equal(settle(ordinary, advanced).damageTaken.hero, 1);
  getPlayerCards({ ...ordinary, endlessLevel: 250 });
  assert.deepEqual(SKILL_DB, catalog);
  assert.equal(getPlayerCard(ordinary, 'missing'), undefined);
  assert.equal(getPlayerCard(ordinary, null), undefined);
});

test('endless training never lowers a retained skill below its actual unlock level', () => {
  const hero = player('hero', { endlessLevel: 5, inventory: [0, 23], skillLoadout: ['poison'] });
  assert.equal(getEffectiveLevel(getPlayerCard(hero, 'poison')!), 23);
  for (const invalid of [NaN, Infinity, -1, 2.5]) {
    const invalidHero = { ...hero, endlessLevel: invalid };
    assert.equal(getPlayerLevel(invalidHero), 23);
    assert.equal(getPlayerCard(invalidHero, 'poison')!.combatLevel, undefined);
  }
});

test('public AI forecasts use endless ranks and never inspect locked selections', () => {
  const personality = { aggression: .5, defense: .55, charge: .5, smart: .9 };
  const allow = (ids: string[]) => SKILL_DB.filter(item => !ids.includes(item.id)).map(item => item.id);
  const enemy = player('enemy', { energy: 1, endlessLevel: 26, disabledSkills: allow(['pegasus', 'defend']) });
  const hero = player('hero', { energy: 1, endlessLevel: 25, disabledSkills: allow(['pegasus']) });
  const highHero = { ...hero, endlessLevel: 27 };
  const weights = (foe: Player) => expeditionMoveWeights(enemy, [enemy, foe], personality, foe.id);
  const lower = weights(hero), higher = weights(highHero);
  assert.ok(lower.find(item => item.cardId === 'pegasus')!.cardWeight
    > higher.find(item => item.cardId === 'pegasus')!.cardWeight * 2);
  const hidden = [enemy, highHero].map(item => Object.defineProperty({ ...item }, 'selectedCardId', {
    get() { throw new Error('AI inspected a locked selection'); },
  }));
  assert.deepEqual(expeditionMoveWeights(hidden[0], hidden, personality, hero.id), higher);
  assert.doesNotThrow(() => getPlayerCards(hidden[0], hidden));
  assert.doesNotThrow(() => getBotMove(hidden[0], hidden));
});
