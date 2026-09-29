import assert from 'node:assert/strict';
import test from 'node:test';
import { SKILL_DB } from '../data/skills';
import { SKILL_EFFECTS } from '../data/skillEffects';
import { skillFlightTargets } from './battleEffects';
import type { Player } from '../types';

const player = (id: string, selectedCardId: string, layer = 0): Player => ({ id, name: id, selectedCardId, layer, hp: 1, energy: 20, inventory: [0], isBot: false, isDead: false, tempLayerMod: 0, lastCardId: null, lastAction: null });

test('every skill, including combinations, has its own visual signature', () => {
  assert.deepEqual(Object.keys(SKILL_EFFECTS).sort(), SKILL_DB.map(c => c.id).sort());
  const signatures = SKILL_DB.map(c => JSON.stringify(SKILL_EFFECTS[c.id]));
  assert.equal(new Set(signatures).size, SKILL_DB.length);
  assert.ok(new Set(Object.values(SKILL_EFFECTS).map(e => e.family)).size >= 15);
});

test('flight targets follow layers and movement, excluding dead players and the caster', () => {
  const caster = player('me', 'hong');
  const grounded = player('ground', 'charge');
  const flying = player('fly', 'smallfly');
  const dead = { ...player('dead', 'charge'), isDead: true };
  const group = [caster, grounded, flying, dead];
  assert.deepEqual(skillFlightTargets(caster, group).map(p => p.id), ['ground']);
  assert.deepEqual(skillFlightTargets({ ...caster, selectedCardId: 'hongtian' }, group).map(p => p.id), ['fly']);
  assert.deepEqual(skillFlightTargets({ ...caster, selectedCardId: 'allbomb' }, group).map(p => p.id), ['ground', 'fly']);
  assert.deepEqual(skillFlightTargets({ ...caster, selectedCardId: 'defend' }, group), []);
  assert.deepEqual(skillFlightTargets({ ...caster, isDead: true }, group), []);
});

test('ultimate trajectories respect their different ranges without mutating game state', () => {
  const caster = player('me', 'ka');
  const targets = [player('one', 'charge', 1), player('two', 'charge', 2), player('three', 'charge', 3), player('four', 'charge', 4)];
  const snapshot = JSON.stringify(targets);
  assert.deepEqual(skillFlightTargets(caster, targets).map(p => p.id), ['one']);
  assert.equal(skillFlightTargets({ ...caster, selectedCardId: 'meteor' }, targets).length, 2);
  assert.equal(skillFlightTargets({ ...caster, selectedCardId: 'skydragon' }, targets).length, 3);
  assert.equal(skillFlightTargets({ ...caster, selectedCardId: 'kajisuper' }, targets).length, 4);
  assert.equal(JSON.stringify(targets), snapshot);
});

test('flight targets preserve underground layers and downward movement', () => {
  const caster = player('me', 'hong', -1);
  const targets = [player('ground', 'charge'), player('down', 'descend'), player('underground', 'charge', -1)];
  assert.deepEqual(skillFlightTargets(caster, targets).map(p => p.id), ['down', 'underground']);
  assert.deepEqual(skillFlightTargets({ ...caster, selectedCardId: 'hongtian' }, targets).map(p => p.id), ['ground']);
});
