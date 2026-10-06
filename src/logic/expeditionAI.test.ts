import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { getPlayerCards } from './combat';
import { expeditionBotMove, expeditionMoveWeights, pickThreat } from './expeditionAI';
import { EXPEDITION_STAGES } from '../data/expedition';
import { createExpeditionRun, setupExpeditionStage } from './expeditionRuntime';
import { autoSelectSkillLoadout, grantSkillLevel } from './skillLoadout';

const personality = { aggression: 0.5, defense: 0.55, charge: 0.5, smart: 0.9 };
const make = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: id !== 'hero', hp: 3, energy: 2, isDead: false,
  inventory: [0], layer: 0, tempLayerMod: 0, selectedCardId: null, lastCardId: null, lastAction: null,
  freeSkills: [], tempSkills: [], disabledSkills: [], kills: 0, ...patch,
});
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
const probability = (weights: ReturnType<typeof expeditionMoveWeights>, ...types: string[]) => weights
  .filter(entry => types.includes(entry.type)).reduce((sum, entry) => sum + entry.probability, 0);

test('the veteran can use its actual higher skill while leaving genuine charge and defense counterplay', () => {
  const stageIdx = EXPEDITION_STAGES.findIndex(stage => stage.id === 's17');
  const definition = EXPEDITION_STAGES[stageIdx].enemies[0];
  for (let level = 0; level <= 5; level++) {
    let run = createExpeditionRun();
    for (let learned = 1; learned <= level; learned++) run = autoSelectSkillLoadout(grantSkillLevel(run, learned));
    const battle = setupExpeditionStage(run, stageIdx, { name: 'Practice', avatar: '🐉', lang: 'en' }, () => .5);
    const [hero, veteran] = battle.players;
    const attack = SKILL_DB.find(card => veteran.skillLoadout?.includes(card.id) && card.type === 'ATTACK')!;
    assert.ok(attack && attack.levelRequired > level);
    assert.equal(veteran.energy, 0);
    const opening = expeditionMoveWeights(veteran, battle.players, definition.personality, hero.id);
    assert.deepEqual(new Set(opening.map(entry => entry.cardId)), new Set(['charge', 'defend']));
    const charged = { ...veteran, energy: 2 }, readyHero = { ...hero, energy: 2 };
    const weights = expeditionMoveWeights(charged, [readyHero, charged], definition.personality, hero.id);
    for (const id of [attack.id, 'charge', 'defend']) {
      assert.ok(weights.some(entry => entry.cardId === id && entry.probability > 0), `${level}/${id}: missing real alternative`);
    }
    assert.ok(weights.every(entry => !['gun', 'machete', 'wave'].includes(entry.cardId)));
  }
});

test('type probabilities are normalized and more weaker moves do not inflate a category', () => {
  const enemy = make('enemy', { energy: 2, inventory: [0, 5] }), hero = make('hero');
  const basic = expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id);
  const expanded = { ...enemy, inventory: [0, 1, 3, 4, 5] };
  const advanced = expeditionMoveWeights(expanded, [expanded, hero], personality, hero.id);
  assert.ok(Math.abs(basic.reduce((sum, entry) => sum + entry.probability, 0) - 1) < 1e-12);
  assert.ok(Math.abs(probability(basic, 'ATTACK') - probability(advanced, 'ATTACK')) < 1e-12);
  assert.ok(advanced.every(entry => Number.isFinite(entry.probability) && entry.probability > 0));
});

test('zero-energy and sealed cards are respected; absorbed and temporary moves remain usable', () => {
  for (const energy of [0, 1, 2, 5]) {
    const enemy = make('enemy', { energy, inventory: [0, 2, 3, 5], freeSkills: ['meteor'], tempSkills: ['gun'], disabledSkills: ['hong2', 'smallfly'] });
    const hero = make('hero', { energy: 3 });
    const players = [enemy, hero];
    const legal = getPlayerCards(enemy, players).filter(card => !enemy.disabledSkills!.includes(card.id)
      && (card.cost <= energy || enemy.freeSkills!.includes(card.id))).map(card => card.id);
    const weights = expeditionMoveWeights(enemy, players, personality, hero.id);
    assert.ok(weights.some(entry => entry.cardId === 'meteor'));
    assert.equal(weights.some(entry => entry.cardId === 'gun'), energy >= 1);
    const random = seeded(7919);
    for (let index = 0; index < 600; index++) assert.ok(legal.includes(expeditionBotMove(enemy, players, personality, hero.id, { random })));
  }
});

test('learned combinations are present and deduplicated by the common hand rules', () => {
  const enemy = make('enemy', { energy: 8, inventory: [0, 1, 2, 3, 5] }), hero = make('hero');
  const weights = expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id);
  assert.ok(weights.some(entry => entry.cardId === 'skydragon'));
  assert.ok(weights.some(entry => entry.cardId === 'doublewing'));
  assert.equal(new Set(weights.map(entry => entry.cardId)).size, weights.length);
});

test('selected moves are never read, inputs remain unchanged and seeded choices are repeatable', () => {
  const enemy = make('enemy', { energy: 3, inventory: [0, 2, 5] }), hero = make('hero', { energy: 3 });
  const players = [hero, enemy], before = structuredClone(players);
  const history = { hero: ['charge', 'hong', 'charge'], enemy: ['defend'] }, historyBefore = structuredClone(history);
  const sample = (list: Player[]) => {
    const random = seeded(4242);
    return Array.from({ length: 120 }, () => expeditionBotMove(enemy, list, personality, hero.id, { random, history }));
  };
  const expected = sample(players);
  for (const selectedCardId of ['charge', 'defend', 'kajisuper']) {
    assert.deepEqual(sample(players.map(player => ({ ...player, selectedCardId })).reverse()), expected);
  }
  const unreadable = players.map(player => Object.defineProperty({ ...player }, 'selectedCardId', {
    get() { throw new Error('AI inspected hidden selectedCardId'); },
  }));
  assert.deepEqual(sample(unreadable), expected);
  assert.deepEqual(players, before);
  assert.deepEqual(history, historyBefore);
});

test('two-energy turtles have real alternatives instead of becoming permanently defensive', () => {
  const enemy = make('enemy'), hero = make('hero');
  const turtle = { aggression: 0.2, defense: 0.85, charge: 0.4, smart: 0.7 };
  const weights = expeditionMoveWeights(enemy, [enemy, hero], turtle, hero.id);
  const charge = probability(weights, 'CHARGE'), defend = probability(weights, 'DEFEND');
  assert.ok(charge > 0.1, `charge probability ${charge}`);
  assert.ok(defend > charge && defend < 0.9, `defend probability ${defend}`);
  const counts: Record<string, number> = {}, random = seeded(12345);
  for (let index = 0; index < 5000; index++) {
    const move = expeditionBotMove(enemy, [enemy, hero], turtle, hero.id, { random });
    counts[move] = (counts[move] ?? 0) + 1;
  }
  assert.ok(Math.abs(counts.charge / 5000 - charge) < 0.035);
  assert.ok(Math.abs(counts.defend / 5000 - defend) < 0.035);
  assert.ok(counts.hong + (counts.hong2 ?? 0) + (counts.liuke ?? 0) > 100);
});

test('public attack energy reduces safe charging; zero-energy free attacks still count as threats', () => {
  const enemy = make('enemy', { energy: 0 }), empty = make('hero', { energy: 0 });
  const weights = (hero: Player) => expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id);
  const safe = probability(weights(empty), 'CHARGE');
  const pressured = probability(weights({ ...empty, energy: 1 }), 'CHARGE');
  const free = probability(weights({ ...empty, freeSkills: ['hong'] }), 'CHARGE');
  assert.ok(safe > pressured + 0.1);
  assert.ok(Math.abs(pressured - free) < 1e-12);
});

test('recent charge, attack and defense histories change the next distribution without making it certain', () => {
  const enemy = make('enemy', { energy: 3 }), hero = make('hero');
  const history = (move: string) => expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id, { history: { hero: [move, move, move] } });
  const charging = history('charge'), defending = history('defend'), attacking = history('hong');
  assert.ok(probability(charging, 'ATTACK') > probability(defending, 'ATTACK'));
  assert.ok(probability(defending, 'ULTIMATE') > probability(charging, 'ULTIMATE'));
  assert.ok(probability(attacking, 'DEFEND') > probability(charging, 'DEFEND'));
  for (const values of [charging, defending, attacking]) assert.ok(values.every(entry => entry.probability > 0 && entry.probability < 1));
});

test('defense loops encourage saving for a breaker while opponents may still feint', () => {
  const enemy = make('enemy'), hero = make('hero');
  const same = (moves: string[]) => expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id, { history: { hero: moves } });
  assert.ok(probability(same(['defend', 'defend', 'defend']), 'CHARGE') > probability(same(['charge', 'charge', 'charge']), 'CHARGE'));
  const baseline = expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id);
  const repeated = expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id, { history: { enemy: ['defend', 'defend', 'defend'] } });
  assert.ok(probability(repeated, 'DEFEND') < probability(baseline, 'DEFEND'));
});

test('history is limited to the last three revealed cards and unknown IDs do not poison probabilities', () => {
  const enemy = make('enemy'), hero = make('hero');
  const get = (history: string[]) => expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id, { history: { hero: history } });
  assert.deepEqual(get(['ka', 'ka', 'charge', 'hong', 'defend']), get(['charge', 'hong', 'defend']));
  assert.ok(get(['unknown-card']).every(entry => Number.isFinite(entry.probability)));
  assert.deepEqual(get(['hong']), expeditionMoveWeights(enemy, [enemy, { ...hero, lastCardId: 'hong' }], personality, hero.id));
});

test('other living enemies affect threat evaluation, dead opponents do not', () => {
  const enemy = make('enemy', { energy: 0 }), hero = make('hero', { energy: 0 });
  const other = make('other', { energy: 3 });
  const safe = expeditionMoveWeights(enemy, [hero, enemy], personality, hero.id);
  const threatened = expeditionMoveWeights(enemy, [hero, other, enemy], personality, hero.id);
  assert.ok(probability(threatened, 'DEFEND') > probability(safe, 'DEFEND'));
  assert.deepEqual(expeditionMoveWeights(enemy, [hero, { ...other, isDead: true }, enemy], personality, hero.id), safe);
  assert.equal(pickThreat(enemy.id, [enemy, hero, other], hero.id)?.id, 'other');
});

test('random endpoints stay legal and an all-sealed hand retains the established fallback', () => {
  const enemy = make('enemy'), hero = make('hero');
  const weights = expeditionMoveWeights(enemy, [enemy, hero], personality, hero.id);
  for (const sample of [0, 1, -1, 2, NaN]) assert.ok(weights.some(entry => entry.cardId === expeditionBotMove(enemy, [enemy, hero], personality, hero.id, { random: () => sample })));
  const sealed = { ...enemy, disabledSkills: SKILL_DB.map(card => card.id) };
  assert.deepEqual(expeditionMoveWeights(sealed, [sealed, hero], personality, hero.id), []);
  assert.equal(expeditionBotMove(sealed, [sealed, hero], personality, hero.id), 'charge');
});
