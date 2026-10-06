import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { getBotMove } from './botAI';
import { expeditionBotMove, expeditionMoveWeights } from './expeditionAI';

const personality = { aggression: .5, defense: .55, charge: .5, smart: .9 };
const player = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: id !== 'hero', hp: 3, energy: 3, isDead: false,
  inventory: [0], skillLoadout: [], layer: 0, tempLayerMod: 0,
  selectedCardId: null, lastCardId: null, lastAction: null, ...patch,
});

test('both AIs choose retained skills, with absorbed and temporary copies still available', () => {
  const enemy = player('enemy', { energy: 1, inventory: [0, 1, 7], skillLoadout: ['pegasus'],
    disabledSkills: SKILL_DB.filter(card => !['pegasus', 'gun', 'meteor'].includes(card.id)).map(card => card.id) });
  const hero = player('hero');
  for (let turn = 1; turn <= 12; turn++) {
    assert.equal(getBotMove(enemy, [enemy, hero], { turn }), 'pegasus');
    assert.equal(expeditionBotMove(enemy, [enemy, hero], personality, hero.id, { random: () => turn / 13 }), 'pegasus');
  }
  const borrowed = { ...enemy, tempSkills: ['gun'], freeSkills: ['meteor'] };
  const weights = expeditionMoveWeights(borrowed, [borrowed, hero], personality, hero.id);
  assert.deepEqual(new Set(weights.map(entry => entry.cardId)), new Set(['pegasus', 'gun', 'meteor']));
  const empty = { ...borrowed, energy: 0 };
  assert.equal(getBotMove(empty, [empty, hero]), 'meteor');
  assert.equal(expeditionBotMove(empty, [empty, hero], personality, hero.id), 'meteor');
});

test('discarded unlock history does not alter public opponent forecasts or mutate retained choices', () => {
  const me = player('enemy', { inventory: [0, 2, 5], skillLoadout: ['icesword', 'iceult', 'bigfly'] });
  const rival = player('hero', { inventory: [0, 2, 5], skillLoadout: ['icesword', 'smallfly', 'bigfly'], energy: 2 });
  const longHistory = [me, rival].map(p => ({ ...p, inventory: [0, 1, 2, 3, 4, 5, 7, 10] }));
  const before = structuredClone(longHistory);
  longHistory.forEach(p => Object.freeze(p.skillLoadout));
  const history = { hero: ['charge', 'icesword', 'defend'] };
  assert.deepEqual(
    expeditionMoveWeights(longHistory[0], longHistory, personality, rival.id, { history }),
    expeditionMoveWeights(me, [me, rival], personality, rival.id, { history }),
  );
  for (let turn = 1; turn <= 12; turn++) {
    assert.equal(getBotMove(longHistory[0], longHistory, { turn }), getBotMove(me, [me, rival], { turn }));
  }
  const hidden = longHistory.map(p => Object.defineProperty({ ...p }, 'selectedCardId', {
    get() { throw new Error('Public forecast read a hidden selection'); },
  }));
  assert.deepEqual(
    expeditionMoveWeights(hidden[0], hidden, personality, rival.id, { history }),
    expeditionMoveWeights(me, [me, rival], personality, rival.id, { history }),
  );
  assert.deepEqual(longHistory, before);
});
