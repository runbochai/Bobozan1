import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Player } from '../types';
import { AVATAR_OPTIONS } from '../data/avatars';
import { EXPEDITION_STAGES } from '../data/expedition';
import { battleCharacterAtlas } from '../data/battleCharacters';
import { SKILL_DB } from '../data/skills';
import { getBotMove } from './botAI';
import { BOT_AVATAR, createBot, playerAvatar } from './bots';
import { getPlayerCards } from './combat';

const bot = (patch: Partial<Player> = {}): Player => ({ ...createBot('bot_test', []), ...patch });
const opponent = (patch: Partial<Player> = {}): Player => bot({ id: 'human', isBot: false, ...patch });
const only = (...ids: string[]) => SKILL_DB.filter(c => !ids.includes(c.id)).map(c => c.id);
const turns = Array.from({ length: 12 }, (_, turn) => turn + 1);

test('multiplayer bots use one dedicated robot while humans and expedition retain their identity', () => {
  const first = createBot('bot_a', []);
  const second = createBot('bot_b', [first]);
  assert.equal(second.name, 'Bot 2');
  assert.equal(createBot('bot_c', [second]).name, 'Bot 1');
  assert.equal(first.avatar, BOT_AVATAR);
  assert.equal(second.avatar, BOT_AVATAR);
  assert.equal(playerAvatar(bot({ avatar: 'avatars/boy.png' })), BOT_AVATAR);
  assert.equal(playerAvatar(opponent({ avatar: 'avatars/girl.png' })), 'avatars/girl.png');
  assert.equal(playerAvatar(bot({ id: 'exp_slime', avatar: 'avatars/enemies/slime.webp' })), 'avatars/enemies/slime.webp');
});

test('all selectable portraits, the robot and every expedition enemy resolve to a saved full-body atlas', () => {
  const portraits = [...AVATAR_OPTIONS.map(a => a.path), BOT_AVATAR,
    ...new Set(EXPEDITION_STAGES.flatMap(s => s.enemies.map(e => `avatars/enemies/${e.id}.webp`)))];
  for (const portrait of portraits) {
    const atlas = battleCharacterAtlas(portrait);
    assert.ok(atlas, portrait);
    assert.ok(existsSync(resolve('public', atlas)), atlas);
    assert.equal(battleCharacterAtlas(`/Bobozan1/${portrait}?v=2`), atlas);
  }
  assert.equal(battleCharacterAtlas('https://example.com/avatars/robot.webp'), undefined);
  assert.equal(battleCharacterAtlas(undefined), undefined);
});

test('AI decisions ignore hidden locked moves, preserve inputs and survive client ordering changes', () => {
  const me = bot({ energy: 3, inventory: [0, 2, 5], freeSkills: ['hong2'], tempSkills: ['gun'] });
  const enemy = opponent({ energy: 3 });
  const players = [me, enemy];
  const before = structuredClone(players);
  for (const turn of turns) {
    const expected = getBotMove(me, players, { turn, matchCount: 5 });
    for (const selectedCardId of ['charge', 'ka', 'defend']) {
      assert.equal(getBotMove(me, [{ ...enemy, selectedCardId }, { ...me, selectedCardId: 'hong' }], { turn, matchCount: 5 }), expected);
    }
  }
  assert.deepEqual(players, before);
});

test('AI only chooses owned affordable unsealed cards, including temporary and free moves', () => {
  for (const energy of [0, 1, 3, 10]) {
    const me = bot({ energy, inventory: [0, 2, 5, 10], disabledSkills: ['hong', 'ka', 'shatter'], freeSkills: ['meteor'], tempSkills: ['gun'] });
    const players = [me, opponent({ energy: 4 })];
    const legal = getPlayerCards(me, players).filter(c => !me.disabledSkills!.includes(c.id) && (c.cost <= energy || me.freeSkills!.includes(c.id)));
    for (const turn of turns) assert.ok(legal.some(c => c.id === getBotMove(me, players, { turn })));
  }
});

test('AI takes a cheap certain kill instead of spending its strongest attack', () => {
  const me = bot({ energy: 5 });
  const enemy = opponent({ hp: 1, disabledSkills: only('charge') });
  for (const turn of turns) assert.equal(getBotMove(me, [me, enemy], { turn }), 'hong');
});

test('energy pressure permits occasional feints while keeping defense the usual response', () => {
  const me = bot({ energy: 0 });
  const charged = opponent({ energy: 1 });
  const moves = Array.from({ length: 120 }, (_, i) => getBotMove(me, [me, charged], { turn: i + 1 }));
  const defenses = moves.filter(id => id === 'defend').length;
  assert.ok(defenses >= 90 && defenses < moves.length, 'usually defend, occasionally charge');
  assert.ok(moves.every(id => id === 'charge' || id === 'defend'));
  for (const turn of turns) assert.equal(getBotMove(me, [me, opponent({ energy: 0 })], { turn }), 'charge');
});

test('AI charges for a defense-breaking ultimate instead of wasting basic attacks', () => {
  const enemy = opponent({ hp: 1, disabledSkills: only('defend'), lastCardId: 'defend' });
  const low = bot({ energy: 2 });
  const high = bot({ energy: 3 });
  for (const turn of turns) {
    assert.equal(getBotMove(low, [low, enemy], { turn }), 'charge');
    assert.equal(getBotMove(high, [high, enemy], { turn }), 'ka');
  }
});

test('AI dodges an ultimate and uses shatter when ordinary defense cannot save it', () => {
  const enemy = opponent({ energy: 3, disabledSkills: only('ka') });
  const flyer = bot({ hp: 1, inventory: [0, 5] });
  const counter = bot({ hp: 1, energy: 2, inventory: [0, 10] });
  for (const turn of turns) {
    assert.equal(getBotMove(flyer, [flyer, enemy], { turn }), 'bigfly');
    assert.equal(getBotMove(counter, [counter, enemy], { turn }), 'shatter');
  }
});

test('AI avoids attacks that cannot reach and considers other bots in a free-for-all', () => {
  const me = bot({ energy: 2 });
  const far = opponent({ layer: 8 });
  for (const turn of turns) assert.equal(getBotMove(me, [me, far], { turn }), 'charge');
  const emptyHuman = opponent({ disabledSkills: only('charge') });
  const attacker = bot({ id: 'bot_enemy', energy: 3, disabledSkills: only('ka') });
  const flyer = bot({ hp: 1, inventory: [0, 5] });
  for (const turn of turns) assert.equal(getBotMove(flyer, [flyer, emptyHuman, attacker], { turn }), 'bigfly');
});

test('dead players do not act but their room-wide movement unlock remains available', () => {
  const me = bot({ disabledSkills: only('ascend') });
  const dead = opponent({ id: 'dead', isDead: true, inventory: [0, 20], energy: 10 });
  assert.equal(getBotMove(me, [me, opponent(), dead]), 'ascend');
  const active = bot({ energy: 2 });
  const enemy = opponent({ energy: 2 });
  assert.equal(getBotMove(active, [active, enemy]), getBotMove(active, [active, enemy, opponent({ id: 'dead', isDead: true, energy: 10 })]));
});
