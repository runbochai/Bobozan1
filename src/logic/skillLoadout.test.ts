import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { getPlayerCards } from './combat';
import {
  autoSelectSkillLoadout, getHandCategory, getSkillOverflow, grantSkillLevel, hasSkillOverflow,
  isAcquiredSkill, normalizeSkillLoadout, resolveSkillLoadout, sortHandCards,
} from './skillLoadout';

const card = (id: string) => SKILL_DB.find(item => item.id === id)!;
const player = (patch: Partial<Player> = {}): Player => ({ id: 'me', name: 'Me', isBot: false,
  hp: 1, energy: 10, isDead: false, inventory: [0], layer: 0, tempLayerMod: 0,
  selectedCardId: null, lastCardId: null, lastAction: null, ...patch });
const ids = (p: Player, all?: Player[]) => getPlayerCards(p, all).map(item => item.id);

test('special tools share the defensive hand category without changing their combat type', () => {
  for (const id of ['ascend', 'descend', 'absorb', 'aoxi', 'shatter', 'doublewing']) {
    const before = card(id).type;
    assert.equal(getHandCategory(card(id)), 'DEFEND');
    assert.equal(card(id).type, before);
  }
  assert.equal(getHandCategory(card('charge')), 'CHARGE');
});

test('legacy migration keeps every candidate and a pending reward for an explicit per-category choice', () => {
  const legacy = player({ inventory: [0, 1, 2, 3, 4], pendingLevel: 5 });
  const before = structuredClone(legacy), migrated = normalizeSkillLoadout(legacy);
  assert.deepEqual(migrated.inventory, [0, 1, 2, 3, 4, 5]);
  assert.equal(migrated.pendingLevel, null);
  assert.ok(migrated.skillLoadout.includes('pegasus') && migrated.skillLoadout.includes('hangman'));
  assert.deepEqual(getSkillOverflow(migrated).map(group => [group.category, group.cards.length]), [['ATTACK', 5], ['ULTIMATE', 5]]);
  assert.deepEqual(normalizeSkillLoadout(migrated), migrated);
  assert.deepEqual(legacy, before);
});

test('discarding one attack preserves that level’s Ultimate, history, and every unaffected category', () => {
  const all = normalizeSkillLoadout(player({ inventory: [0, 1, 2, 3, 4] }));
  const chosen = resolveSkillLoadout(all, {
    ATTACK: ['icesword', 'dragonclaw', 'hotmilk'], ULTIMATE: ['meteor', 'iceult', 'fireclaw'],
  })!;
  assert.equal(hasSkillOverflow(chosen), false);
  assert.deepEqual(chosen.inventory, all.inventory);
  assert.ok(!ids(chosen).includes('pegasus'));
  assert.ok(ids(chosen).includes('meteor'));
  assert.ok(ids(chosen).includes('smallfly') && ids(chosen).includes('dragondef'));
  assert.ok(all.skillLoadout.includes('pegasus'), 'Choosing cannot mutate its source');
});

test('at most three permits deliberately keeping fewer; invalid or incomplete choices apply nothing', () => {
  const all = player({ inventory: [0, 1, 2, 3, 4] });
  assert.equal(resolveSkillLoadout(all, { ATTACK: ['pegasus'] }), null);
  assert.equal(resolveSkillLoadout(all, { ATTACK: ['pegasus', 'pegasus'], ULTIMATE: [] }), null);
  assert.equal(resolveSkillLoadout(all, { ATTACK: ['hong'], ULTIMATE: [] }), null);
  assert.equal(resolveSkillLoadout(all, { ATTACK: [], ULTIMATE: [], DEFEND: [] }), null);
  const chosen = resolveSkillLoadout(all, { ATTACK: [], ULTIMATE: ['meteor'] })!;
  assert.ok(chosen);
  assert.equal(chosen.skillLoadout.filter(id => getHandCategory(card(id)) === 'ATTACK').length, 0);
  assert.ok(chosen.skillLoadout.includes('smallfly'));
  assert.ok(ids(chosen).includes('hong') && ids(chosen).includes('ka'), 'Basics never occupy slots');
});

test('two defensive skills at level ten count separately, including Shatter', () => {
  const before = normalizeSkillLoadout(player({ inventory: [0, 2, 3, 8] }));
  const awarded = grantSkillLevel(before, 10);
  const defense = getSkillOverflow(awarded).find(group => group.category === 'DEFEND')!;
  assert.deepEqual(new Set(defense.cards.map(item => item.id)), new Set(['smallfly', 'dragondef', 'helmetdef', 'handdef', 'shatter']));
  const chosen = resolveSkillLoadout(awarded, { ATTACK: ['icesword', 'dragonclaw', 'handatk'], DEFEND: ['smallfly', 'dragondef', 'shatter'] })!;
  assert.ok(ids(chosen).includes('shatter'));
  assert.ok(!ids(chosen).includes('handdef'));
  assert.ok(ids(chosen).includes('handatk'));
});

test('a repeated level grant cannot resurrect discarded cards or reorder acquisitions', () => {
  const chosen = player({ inventory: [0, 1, 2], skillLoadout: ['meteor', 'icesword'] });
  const repeated = grantSkillLevel(chosen, 1);
  assert.deepEqual(repeated.skillLoadout, ['meteor', 'icesword']);
  assert.ok(!ids(repeated).includes('pegasus'));
  const later = grantSkillLevel(repeated, 3);
  assert.deepEqual(later.skillLoadout.slice(0, 2), repeated.skillLoadout);
  assert.ok(later.skillLoadout.includes('dragonclaw'));
});

test('bots automatically resolve all overflowing categories and preserve the newest cards', () => {
  const bot = autoSelectSkillLoadout(player({ isBot: true, inventory: [0, 1, 2, 3, 4, 5, 6, 10] }));
  assert.equal(hasSkillOverflow(bot), false);
  assert.deepEqual(bot.skillLoadout.filter(id => getHandCategory(card(id)) === 'DEFEND'), ['absorb', 'shatter', 'handdef']);
  assert.ok(bot.skillLoadout.includes('handatk'));
  assert.ok(!bot.skillLoadout.includes('pegasus'));
  assert.deepEqual(bot.inventory, [0, 1, 2, 3, 4, 5, 6, 10]);
});

test('derived combos need their retained parts and cost no additional permanent slot', () => {
  const own = player({ inventory: [0, 1, 2, 3, 5], skillLoadout: ['pegasus', 'icesword', 'dragonclaw', 'smallfly', 'bigfly'] });
  assert.equal(hasSkillOverflow(own), false);
  assert.ok(ids(own).includes('skydragon') && ids(own).includes('doublewing'));
  const missing = { ...own, skillLoadout: own.skillLoadout!.filter(id => id !== 'icesword'), tempSkills: ['icesword'], freeSkills: ['icesword'] };
  assert.ok(ids(missing).includes('icesword'));
  assert.ok(!ids(missing).includes('skydragon'), 'A temporary ingredient does not restore a discarded permanent combination');
  assert.ok(ids(missing).includes('doublewing'), 'Another category’s combination survives');
  for (const [combo, parts, levels] of [
    ['vajra', ['helmetdef', 'handdef', 'footdef'], [8, 10, 11]],
    ['allbomb', ['hongtian', 'hongdi'], [20, 21]],
    ['heartpoison', ['hongtian', 'hongdi'], [20, 21]],
  ] as const) {
    assert.ok(ids(player({ inventory: [0, ...levels], skillLoadout: [...parts] })).includes(combo));
    assert.ok(!ids(player({ inventory: [0, ...levels], skillLoadout: parts.slice(1) })).includes(combo));
  }
});

test('absorbed and temporary combo cards remain usable once and never occupy permanent slots', () => {
  const own = player({ freeSkills: ['skydragon', 'pegasus'], tempSkills: ['doublewing', 'skydragon'] });
  assert.equal(hasSkillOverflow(own), false);
  const hand = ids(own);
  for (const id of ['skydragon', 'doublewing', 'pegasus']) assert.equal(hand.filter(item => item === id).length, 1);
  assert.equal(isAcquiredSkill(own, card('pegasus')), false);
  const ingredients = { ...own, inventory: [0, 1, 2, 3] };
  assert.equal(ids(ingredients).filter(id => id === 'skydragon').length, 1, 'Derived and borrowed copies are deduplicated');
});

test('sharing requires a retained permanent defense, while recipients use it outside their slots', () => {
  const me = player({ inventory: [0, 2, 5, 8], skillLoadout: ['smallfly', 'bigfly', 'helmetdef'] });
  const lender = player({ id: 'lender', inventory: [0, 3, 18], skillLoadout: ['dragondef', 'ninedef'], isShared: true });
  assert.ok(ids(me, [me, lender]).includes('dragondef'));
  assert.ok(ids(me, [me, lender]).includes('ninedef'));
  assert.equal(hasSkillOverflow(me), false);
  const discarded = { ...lender, skillLoadout: [], freeSkills: ['dragondef'], tempSkills: ['ninedef'] };
  assert.ok(!ids(me, [me, discarded]).includes('dragondef'));
  assert.ok(!ids(me, [me, discarded]).includes('ninedef'));
});

test('new acquisitions sort before old ones regardless of level and basics stay in their familiar order', () => {
  const own = grantSkillLevel(grantSkillLevel(player(), 5), 1);
  const hand = sortHandCards(own, getPlayerCards(own));
  assert.ok(hand.indexOf(card('pegasus')) < hand.indexOf(card('madian')));
  const basicIds = getPlayerCards(player()).map(item => item.id);
  assert.deepEqual(hand.slice(-basicIds.length).map(item => item.id), basicIds);
  const extra = { ...own, freeSkills: ['skydragon'], tempSkills: ['doublewing'] };
  const withExtras = sortHandCards(extra, getPlayerCards(extra));
  assert.equal(withExtras[0].id, 'skydragon');
  assert.equal(withExtras[1].id, 'doublewing');
});
