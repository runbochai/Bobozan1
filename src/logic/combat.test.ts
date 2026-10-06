import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { calculateTurnOutcome } from './combat';
import { getSkillOverflow, hasSkillOverflow } from './skillLoadout';

const player = (id: string, selectedCardId: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: false, hp: 3, energy: 10, inventory: [0],
  isDead: false, layer: 0, tempLayerMod: 0, selectedCardId,
  lastCardId: null, lastAction: null, ...patch,
});
const after = (result: ReturnType<typeof calculateTurnOutcome>, id: string) =>
  result.players.find(p => p.id === id)!;

for (const mode of ['expedition', 'practice'] as const) {
  test(mode + ': another player dying cannot remove HP or reset an untouched survivor', () => {
    const input = [
      player('me', 'defend', { hp: 3, energy: 6, freeSkills: ['hong'], disabledSkills: ['gun'] }),
      player('attacker', 'hong'),
      player('victim', 'charge', { hp: 1 }),
    ];
    const snapshot = structuredClone(input);
    const result = calculateTurnOutcome(input, 1, 4, 'zh', { mode });
    assert.equal(after(result, 'me').hp, 3);
    assert.equal(after(result, 'me').energy, 6);
    assert.deepEqual(after(result, 'me').freeSkills, ['hong']);
    assert.deepEqual(after(result, 'me').disabledSkills, ['gun']);
    assert.equal(after(result, 'victim').isDead, true);
    assert.equal(result.damageTaken.me, 0);
    assert.equal(result.survivorReset, false);
    assert.deepEqual(input, snapshot);
  });

  test(mode + ': wins report a winner without multiplayer rewards or pending upgrades', () => {
    const winner = player('winner', 'hong', { inventory: [0, 1, 2, 3, 4] });
    const result = calculateTurnOutcome([winner, player('loser', 'charge', { hp: 1 })], 1, 5, 'zh', { mode });
    assert.equal(result.isGameOver, true);
    assert.equal(result.winner?.id, 'winner');
    assert.deepEqual(result.winner?.inventory, winner.inventory);
    assert.equal(result.winner?.pendingLevel, undefined);
    assert.equal(result.logs.some(log => /获得 Lv|需弃牌|Got Lv|Full slots/.test(log.text)), false);
  });
}

test('default multiplayer still resets survivors while damageTaken excludes the reset', () => {
  const result = calculateTurnOutcome([
    player('me', 'defend'),
    player('attacker', 'hong'),
    player('victim', 'charge', { hp: 1 }),
  ], 1, 1, 'zh');
  assert.equal(result.survivorReset, true);
  for (const id of ['me', 'attacker']) {
    assert.equal(after(result, id).hp, 1);
    assert.equal(after(result, id).energy, 0);
    assert.equal(result.damageTaken[id], 0);
  }
  assert.equal(result.damageTaken.victim, 1);
});

test('multiplayer victory awards every new skill and prompts each overflowing category separately', () => {
  const defeated = player('loser', 'charge', { hp: 1 });
  const result = calculateTurnOutcome([player('winner', 'hong'), defeated], 1, 1, 'zh');
  assert.deepEqual(result.winner?.inventory, [0, 1]);
  const full = calculateTurnOutcome([
    player('winner', 'hong', { inventory: [0, 1, 2, 3, 4] }), defeated,
  ], 1, 5, 'zh');
  assert.deepEqual(full.winner?.inventory, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(getSkillOverflow(full.winner!).map(group => group.category), ['ATTACK', 'ULTIMATE']);
  assert.ok(full.winner?.skillLoadout?.includes('madian'));
  assert.ok(full.winner?.skillLoadout?.includes('hangman'));
  const bot = calculateTurnOutcome([
    player('winner', 'hong', { isBot: true, inventory: [0, 1, 2, 3, 4] }), defeated,
  ], 1, 5, 'zh');
  assert.equal(hasSkillOverflow(bot.winner!), false);
  assert.ok(bot.winner?.skillLoadout?.includes('hangman'));
});

test('damage reduction saves a 1 HP player before death and kill credit are decided', () => {
  const result = calculateTurnOutcome([
    player('me', 'charge', { hp: 1 }),
    player('attacker', 'hong'),
  ], 1, 1, 'zh', { mode: 'expedition', damageReduction: { me: .5 } });
  assert.equal(after(result, 'me').hp, .5);
  assert.equal(after(result, 'me').isDead, false);
  assert.equal(after(result, 'attacker').kills, 0);
  assert.equal(result.isGameOver, false);
  assert.equal(result.damageTaken.me, .5);
  assert.equal(result.damageBlocked.me, .5);
  assert.equal(result.logs.some(log => log.type === 'death'), false);
});

test('damage reduction is applied once per turn total, not once per attacker', () => {
  const result = calculateTurnOutcome([
    player('me', 'charge'),
    player('a', 'hong'),
    player('b', 'hong'),
  ], 1, 1, 'zh', { mode: 'expedition', damageReduction: { me: .5 } });
  assert.equal(after(result, 'me').hp, 1.5);
  assert.equal(result.damageTaken.me, 1.5);
  assert.equal(result.damageBlocked.me, .5);
});

test('lethal protection is evaluated after armor and is not consumed by a survivable hit', () => {
  const result = calculateTurnOutcome([
    player('me', 'charge', { hp: 1 }), player('attacker', 'hong'),
  ], 1, 1, 'zh', { mode: 'expedition', damageReduction: { me: .5 }, lethalProtection: { me: .5 } });
  assert.equal(after(result, 'me').hp, .5);
  assert.equal(result.protectionUsed.me, false);
  assert.equal(result.damageTaken.me, .5);
});

test('lethal protection keeps a wounded player alive without restoring missing HP or awarding a kill', () => {
  for (const hp of [.25, 1]) {
    const result = calculateTurnOutcome([
      player('me', 'charge', { hp }), player('attacker', 'hong', { dmgBonus: .5 }),
    ], 1, 1, 'zh', { mode: 'expedition', lethalProtection: { me: .5 } });
    assert.equal(after(result, 'me').hp, Math.min(hp, .5));
    assert.equal(after(result, 'me').isDead, false);
    assert.equal(result.protectionUsed.me, true);
    assert.equal(result.damageTaken.me, hp - Math.min(hp, .5));
    assert.equal(after(result, 'attacker').kills, 0);
    assert.equal(result.logs.some(log => log.type === 'death'), false);
  }
});

test('simultaneously lethal hits resolve to the protected survivor rather than a draw', () => {
  // A pair of all-layer remote test cards isolates simultaneous lethal damage;
  // ordinary duel cards normally only overpower one side of the matchup.
  const fixture = { ...SKILL_DB.find(c => c.id === 'hongtian')!, id: 'crossfire-test', tags: ['hit_up', 'hit_all'] };
  SKILL_DB.push(fixture);
  try {
    const players = [player('me', fixture.id, { hp: 1 }), player('enemy', fixture.id, { hp: 1 })];
    const draw = calculateTurnOutcome(players, 1, 1, 'zh', { mode: 'practice' });
    assert.equal(draw.isGameOver, true);
    assert.equal(draw.winner, undefined);
    const result = calculateTurnOutcome(players, 1, 1, 'zh', { mode: 'practice', lethalProtection: { me: .5 } });
    assert.equal(result.isGameOver, true);
    assert.equal(result.winner?.id, 'me');
    assert.equal(result.winner?.hp, .5);
    assert.equal(result.winner?.kills, 1);
    assert.equal(after(result, 'enemy').kills, 0);
    assert.equal(result.protectionUsed.me, true);
    assert.deepEqual(result.logs.filter(log => log.type === 'death').map(log => log.text), ['enemy 阵亡!']);
  } finally {
    SKILL_DB.splice(SKILL_DB.indexOf(fixture), 1);
  }
});

test('fully prevented and overkill damage report actual HP lost, including zero for dead players', () => {
  const result = calculateTurnOutcome([
    player('protected', 'charge', { hp: .5 }),
    player('fragile', 'charge', { hp: .5 }),
    player('attacker', 'hong', { dmgBonus: .5 }),
    player('already-dead', 'charge', { hp: 0, isDead: true }),
  ], 1, 1, 'zh', { mode: 'expedition', damageReduction: { protected: 5 } });
  assert.equal(after(result, 'protected').hp, .5);
  assert.equal(after(result, 'fragile').isDead, true);
  assert.equal(after(result, 'attacker').kills, 1);
  assert.equal(result.damageTaken.protected, 0);
  assert.equal(result.damageBlocked.protected, 1.5);
  assert.equal(result.damageTaken.fragile, .5);
  assert.equal(result.damageTaken['already-dead'], 0);
});

for (const defensiveMove of ['shatter', 'hongtian']) {
  test(defensiveMove + ': one ultimate hit applies damage and energy drain only once, in either roster order', () => {
    for (const reverse of [false, true]) {
      const players = [
        player('victim', defensiveMove, { hp: 5 }),
        player('attacker', 'kajifen', { hp: 5, dmgBonus: .5, energyDrain: 1 }),
      ];
      if (reverse) players.reverse();
      const result = calculateTurnOutcome(players, 1, 1, 'zh', { mode: 'expedition' });
      assert.equal(after(result, 'victim').hp, 3.5);
      assert.equal(result.damageTaken.victim, 1.5);
      const card = SKILL_DB.find(c => c.id === defensiveMove)!;
      assert.equal(after(result, 'victim').energy, 10 - card.cost - 1);
      assert.equal(result.logs.filter(log => log.type === 'combat').length, 1);
    }
  });
}

test('every card pair can damage each opponent at most once per turn', () => {
  for (const first of SKILL_DB) for (const second of SKILL_DB) for (const layer of [0, 1, 3]) {
    const result = calculateTurnOutcome([
      player('a', first.id, { hp: 10, energy: 100, dmgBonus: .5 }),
      player('b', second.id, { hp: 10, energy: 100, layer, dmgBonus: .5 }),
    ], 1, 1, 'zh', { mode: 'practice' });
    for (const id of ['a', 'b']) {
      assert.ok(result.damageTaken[id] <= 1.5, first.id + '/' + second.id + ' at layer ' + layer + ': ' + id + ' lost ' + result.damageTaken[id]);
    }
  }
});

test('nonlethal hit logs do not claim a kill in either language', () => {
  for (const lang of ['zh', 'en'] as const) {
    const result = calculateTurnOutcome([
      player('victim', 'charge'),
      player('attacker', 'hong'),
    ], 1, 1, lang, { mode: 'expedition' });
    assert.equal(after(result, 'victim').hp, 2);
    assert.ok(result.logs.some(log => log.type === 'combat'));
    assert.equal(result.logs.some(log => /击杀|截杀|killed|kills/.test(log.text)), false);
    assert.equal(result.logs.some(log => log.type === 'death'), false);
  }
});

test('defendedHits counts each in-range attack stopped by the card, including strong Wave defenses', () => {
  const result = calculateTurnOutcome([
    player('defender', 'defend'), player('a', 'hong'), player('b', 'hong2'),
    player('already-dead', 'defend', { hp: 0, isDead: true }),
  ], 1, 1, 'zh', { mode: 'expedition' });
  assert.equal(result.defendedHits.defender, 2);
  assert.equal(result.damageTaken.defender, 0);
  assert.equal(result.defendedHits['already-dead'], 0);
  for (const move of ['fivedef', 'defend']) {
    const wave = calculateTurnOutcome([
      player('defender', move), player('attacker', 'wave'),
    ], 1, 1, 'zh', { mode: 'expedition' });
    assert.equal(wave.defendedHits.defender, move === 'fivedef' ? 1 : 0);
    assert.equal(wave.damageTaken.defender, move === 'fivedef' ? 0 : 1);
  }
});

test('defendedHits excludes attacks that miss after Small Fly changes layer', () => {
  const result = calculateTurnOutcome([
    player('defender', 'smallfly'), player('attacker', 'hong'),
  ], 1, 1, 'zh', { mode: 'expedition' });
  assert.equal(result.damageTaken.defender, 0);
  assert.equal(result.defendedHits.defender, 0);
  const reached = calculateTurnOutcome([
    player('defender', 'smallfly'), player('attacker', 'hong', { layer: 1 }),
  ], 1, 1, 'zh', { mode: 'expedition' });
  assert.equal(reached.defendedHits.defender, 1);
});

test('defendedHits excludes punctures even when armor prevents all HP loss', () => {
  const result = calculateTurnOutcome([
    player('defender', 'defend'), player('attacker', 'gun'),
  ], 1, 1, 'zh', { mode: 'expedition', damageReduction: { defender: .5 } });
  assert.equal(result.damageTaken.defender, 0);
  assert.equal(result.damageBlocked.defender, .5);
  assert.equal(result.defendedHits.defender, 0);
});

test('defendedHits excludes piercing passives and non-attacking special moves', () => {
  for (const [move, pierce] of [['hong', true], ['ascend', false]] as const) {
    const result = calculateTurnOutcome([
      player('defender', 'defend', { layer: move === 'ascend' ? 1 : 0 }),
      player('attacker', move, { pierce }),
    ], 1, 1, 'zh', { mode: 'expedition' });
    assert.equal(result.defendedHits.defender, 0);
    assert.equal(result.damageTaken.defender, pierce ? 1 : 0);
  }
});
