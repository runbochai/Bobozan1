import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { EXPEDITION_STAGES } from '../data/expedition';
import { expeditionMoveWeights } from './expeditionAI';
import { createExpeditionRun, EXPEDITION_HERO_ID, getCrownSupplyBonus, setupExpeditionStage,
  settleExpeditionRound, type ExpeditionRun } from './expeditionRuntime';

const identity = { name: 'Emberwick challenger', avatar: 'avatars/dragon.webp', lang: 'en' as const };
const setup = (stage: number, patch: Partial<ExpeditionRun> = {}) => setupExpeditionStage({ ...createExpeditionRun(), ...patch }, stage, identity, () => .25);
const defeatFoes = (battle: ReturnType<typeof setup>) => settleExpeditionRound(battle.run, battle.memory,
  battle.players.map(player => ({ ...player, energy: 3,
    hp: player.id === EXPEDITION_HERO_ID ? 3 : .5,
    selectedCardId: player.id === EXPEDITION_HERO_ID ? 'ka' : 'defend' })), 1, 'en', () => .25);

test('only actually defeated finite encounters are recorded; winning twice does not duplicate the reward', () => {
  const before = setup(13, { crownCleared: [0, 3, 12] });
  const won = defeatFoes(before);
  assert.equal(won.won, true);
  assert.deepEqual(won.run.crownCleared, [0, 3, 12, 13]);
  assert.deepEqual(before.run.crownCleared, [0, 3, 12], 'Do not mutate the source run');
  const repeat = defeatFoes({ ...before, run: won.run });
  assert.deepEqual(repeat.run.crownCleared, won.run.crownCleared);
  assert.equal(repeat.gold, 0);
  assert.equal(repeat.run.gold, won.run.gold);
  const bypass = setup(16, { crownCleared: won.run.crownCleared });
  assert.deepEqual(bypass.run.crownCleared, [0, 3, 12, 13], 'Entering a later stage does not clear skipped towers');
});

test('losses and unresolved rounds cannot switch off a supply tower', () => {
  const battle = setup(13, { hp: .5, maxHp: .5, crownCleared: [12] });
  const loss = settleExpeditionRound(battle.run, battle.memory, battle.players.map(player => ({ ...player, energy: 3,
    selectedCardId: player.id === EXPEDITION_HERO_ID ? 'charge' : 'ka' })), 1, 'en', () => .25);
  assert.equal(loss.lost, true);
  assert.deepEqual(loss.run.crownCleared, [12]);
  const ongoing = settleExpeditionRound(battle.run, battle.memory,
    battle.players.map(player => ({ ...player, selectedCardId: 'charge' })), 1, 'en', () => .25);
  assert.equal(ongoing.won, false);
  assert.deepEqual(ongoing.run.crownCleared, [12]);
});

test('each active tower adds the announced real starting stats, without stacking on repeated setup', () => {
  const baseHp = EXPEDITION_STAGES[17].enemies[0].hp;
  for (let disabled = 0; disabled <= 3; disabled++) {
    const crownCleared = [13, 14, 15].slice(0, disabled);
    const battle = setup(17, { crownCleared });
    const king = battle.players[1];
    assert.deepEqual(getCrownSupplyBonus(battle.run), { activeTowers: [13, 14, 15].slice(disabled), energy: 3 - disabled, hp: (3 - disabled) * .5 });
    assert.equal(king.energy, 3 - disabled);
    assert.equal(king.hp, baseHp + (3 - disabled) * .5);
    assert.equal(battle.memory.maxHp[king.id], king.hp);
    assert.equal(king.dmgBonus, 0, 'Supply never invents hidden attack damage');
    assert.match(battle.logs.at(-1)!.text, disabled === 3 ? /All three supply towers are cut/ : new RegExp(`${3 - disabled} supply towers remain`));
    const reopened = setupExpeditionStage(battle.run, 17, identity, () => .25);
    assert.deepEqual(reopened.players, battle.players);
    assert.equal(reopened.run.gold, battle.run.gold);
  }
});

test('Crown bonuses affect only the finite final encounter and keep normal/endless rules intact', () => {
  assert.equal(setup(16).players[1].energy, 0);
  assert.equal(setup(13).players[1].energy, 0);
  const normal = setup(17, { difficulty: 'normal' });
  assert.equal(normal.players[1].dmgBonus, .5);
  assert.equal(normal.players[1].energy, 3);
  const endless = setup(17, { difficulty: 'endless', crownCleared: [] });
  const disconnected = setup(17, { difficulty: 'endless', crownCleared: [13, 14, 15] });
  assert.deepEqual(endless.players, disconnected.players);
  assert.equal(endless.players[1].energy, 0);
  assert.deepEqual(getCrownSupplyBonus(endless.run), { activeTowers: [], energy: 0, hp: 0 });
  const win = defeatFoes(endless);
  assert.equal(win.won, true);
  assert.deepEqual(win.run.crownCleared, []);
  assert.equal(win.run.endlessLevel, 2, 'The existing enemy-level-plus-one growth remains');
});

test('the rival returns with the same real model and keeps the early Pegasus lesson legal', () => {
  for (const index of [3, 7, 16]) {
    const enemy = EXPEDITION_STAGES[index].enemies[0];
    assert.match(enemy.name.en, /Rook/);
    assert.equal(enemy.avatarId, 'wolf');
  }
  assert.deepEqual(EXPEDITION_STAGES[3].enemies[0].inventory, [0, 1]);
  for (const stage of EXPEDITION_STAGES) for (const enemy of stage.enemies) {
    assert.equal(existsSync(`public/avatars/enemies/${enemy.avatarId ?? enemy.id}.webp`), true, enemy.id);
  }
});

test('rival tendencies react to public history with uncertainty and cannot read locked selections', () => {
  const battle = setup(7);
  const [hero, rival] = battle.players.map(player => ({ ...player, energy: 3 }));
  const personality = EXPEDITION_STAGES[7].enemies[0].personality;
  const probability = (habit: typeof personality.habit, past: string, type: string) => expeditionMoveWeights(rival, [hero, rival],
    { ...personality, habit }, hero.id, { history: { [rival.id]: [past], [hero.id]: ['defend'] } })
    .filter(entry => entry.type === type).reduce((sum, entry) => sum + entry.probability, 0);
  assert.ok(probability('press', 'charge', 'ATTACK') > probability(undefined, 'charge', 'ATTACK'));
  assert.ok(probability('feint', 'hong', 'CHARGE') > probability(undefined, 'hong', 'CHARGE'));
  const options = { history: { [rival.id]: ['charge'] } };
  const expected = expeditionMoveWeights(rival, [hero, rival], personality, hero.id, options);
  for (const player of [hero, rival]) Object.defineProperty(player, 'selectedCardId', { get() { throw new Error('Read a locked move'); } });
  assert.deepEqual(expeditionMoveWeights(rival, [hero, rival], personality, hero.id, options), expected);
  assert.ok(expected.every(entry => entry.probability > 0));
  assert.ok(Math.abs(expected.reduce((sum, entry) => sum + entry.probability, 0) - 1) < 1e-12);
});
