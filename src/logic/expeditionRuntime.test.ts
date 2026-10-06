import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_HP } from '../data/constants';
import { EXPEDITION_EQUIPMENTS, EXPEDITION_STAGES } from '../data/expedition';
import { calculateTurnOutcome, getPlayerCards } from './combat';
import {
  buyExpeditionItem, createExpeditionRun, EXPEDITION_HERO_ID, setupExpeditionStage,
  settleExpeditionRound, takeExpeditionReward, takeExpeditionRoute,
  type ExpeditionRun,
} from './expeditionRuntime';
import type { Player } from '../types';
import { getSkillOverflow, grantSkillLevel, hasSkillOverflow, resolveSkillLoadout } from './skillLoadout';

const identity = { name: 'Tester', avatar: 'avatars/dragon.webp', lang: 'zh' as const };
const seeded = () => .25;
const stageIndex = (id: string) => EXPEDITION_STAGES.findIndex(stage => stage.id === id);
const start = (patch: Partial<ExpeditionRun> = {}, stage = 0) => setupExpeditionStage({ ...createExpeditionRun(), ...patch }, stage, identity, seeded);
type Battle = Pick<ReturnType<typeof setupExpeditionStage>, 'run' | 'memory' | 'players'>;
const hero = (battle: Battle) => battle.players.find(player => player.id === EXPEDITION_HERO_ID)!;
function play(battle: Battle, own: string, other: string, heroPatch: Partial<Player> = {}, enemyPatch: Partial<Player> = {}) {
  const moves = battle.players.map(player => ({ ...player, ...(player.id === EXPEDITION_HERO_ID ? heroPatch : enemyPatch),
    selectedCardId: player.id === EXPEDITION_HERO_ID ? own : other }));
  return settleExpeditionRound(battle.run, battle.memory, moves, 1, 'zh', seeded);
}
const gear = (id: string) => ({ kind: 'equipment' as const, equipment: EXPEDITION_EQUIPMENTS.find(item => item.id === id)! });

test('every stage starts enemies at zero Energy and lets a fresh hero safely Charge against any legal opener', () => {
  EXPEDITION_STAGES.forEach((_, stage) => {
    const battle = start({}, stage), enemies = battle.players.filter(player => player.id !== EXPEDITION_HERO_ID);
    assert.equal(hero(battle).energy, 0);
    const choices = enemies.map(enemy => {
      assert.equal(enemy.energy, 0);
      return getPlayerCards(enemy, battle.players).filter(card => card.cost <= enemy.energy);
    });
    const combinations = choices.reduce<string[][]>((all, cards) => all.flatMap(prefix => cards.map(card => [...prefix, card.id])), [[]]);
    for (const moves of combinations) {
      const revealed = [{ ...hero(battle), selectedCardId: 'charge' }, ...enemies.map((enemy, i) => ({ ...enemy, selectedCardId: moves[i] }))];
      const result = settleExpeditionRound(battle.run, battle.memory, revealed, 1, 'zh', seeded);
      assert.equal(result.damageTaken[EXPEDITION_HERO_ID], 0, `stage ${stage}, moves ${moves}`);
      assert.equal(hero(result).hp, 3);
      assert.equal(hero(result).energy, 2);
      assert.equal(result.lost, false);
    }
  });
});

test('starting a run gives 3 HP while another death cannot reset expedition survivors or change multiplayer defaults', () => {
  assert.equal(createExpeditionRun().hp, 3);
  assert.equal(MAX_HP, 1, 'Multiplayer still starts with one HP');
  const battle = start({}, stageIndex('s4'));
  const revealed = battle.players.map((player, i) => ({ ...player, energy: 3,
    hp: i === 2 ? 1 : 3, selectedCardId: i === 0 ? 'defend' : i === 1 ? 'hong' : 'charge' }));
  const multiplayer = calculateTurnOutcome(revealed, 1, 1, 'zh');
  assert.equal(multiplayer.survivorReset, true);
  assert.equal(multiplayer.players.find(player => player.id === EXPEDITION_HERO_ID)!.hp, 1);
  const expedition = settleExpeditionRound(battle.run, battle.memory, revealed, 1, 'zh', seeded);
  assert.equal(hero(expedition).hp, 3);
  assert.equal(hero(expedition).energy, 3);
  assert.equal(expedition.run.hp, 3);
});

test('armor precedes lethal protection and each actual protection prevents death and kill credit', () => {
  const initial = start({ hp: 1, relics: ['ypj', 'tbs'], equipment: ['doll'] });
  const snapshot = structuredClone(initial);
  const armored = play(initial, 'charge', 'hong', {}, { energy: 10, hp: 3 });
  assert.equal(hero(armored).hp, .5);
  assert.equal(armored.memory.ironhideUsed, true);
  assert.equal(armored.run.ironShirtUsed, false);
  assert.equal(armored.protectionUsed[EXPEDITION_HERO_ID], false);
  const shirt = play(armored, 'charge', 'hong');
  assert.equal(hero(shirt).hp, .5);
  assert.equal(shirt.run.ironShirtUsed, true);
  assert.ok(shirt.run.equipment.includes('doll'));
  const doll = play(shirt, 'charge', 'hong');
  assert.equal(hero(doll).hp, .5);
  assert.equal(doll.lost, false);
  for (const result of [armored, shirt, doll]) {
    assert.equal(result.logs.some(log => log.type === 'death'), false);
    assert.equal(result.players.find(player => player.id !== EXPEDITION_HERO_ID)!.kills, 0);
  }
  assert.deepEqual(initial, snapshot, 'Settlement cannot mutate the input run, players or memory');
});

test('a used doll cannot be bought again to turn a once-per-run safeguard into repeatable healing', () => {
  const battle = start({ hp: .5, gold: 100, equipment: ['doll'] });
  const saved = play(battle, 'charge', 'hong', {}, { energy: 3, hp: 3 });
  assert.equal(saved.protectionUsed[EXPEDITION_HERO_ID], true);
  const repurchased = buyExpeditionItem(saved.run, gear('doll'), seeded);
  assert.equal(repurchased.gold, saved.run.gold);
  const finalHit = play({ ...saved, run: repurchased }, 'charge', 'hong');
  assert.equal(finalHit.lost, true);
});

test('Whetstone refunds the first actual Ultimate, never a normal attack or a second Ultimate', () => {
  const battle = start({ relics: ['mds'] });
  const attack = play(battle, 'hong', 'defend', { energy: 10 }, { hp: 5 });
  assert.equal(hero(attack).energy, 9);
  assert.equal(attack.memory.whetstoneUsed, false);
  const first = play(attack, 'ka', 'defend');
  assert.equal(hero(first).energy, 8);
  assert.equal(first.memory.whetstoneUsed, true);
  const second = play(first, 'ka', 'defend');
  assert.equal(hero(second).energy, 5);
});

test('Counter Gloves rewards real defense once per turn, excluding missed and armor-stopped shots', () => {
  const block = play(start({ relics: ['fjqt'] }, stageIndex('s4')), 'defend', 'hong', {}, { energy: 5 });
  assert.equal(block.defendedHits[EXPEDITION_HERO_ID], 2);
  assert.equal(hero(block).energy, 1, 'One refund even against two attackers');
  const dodge = play(start({ relics: ['fjqt'], inventory: [0, 2] }), 'smallfly', 'hong', {}, { energy: 5 });
  assert.equal(hero(dodge).hp, 3);
  assert.equal(hero(dodge).energy, 0);
  const armoredShot = play(start({ relics: ['fjqt', 'ypj'] }), 'defend', 'gun', {}, { energy: 5, inventory: [0, 7] });
  assert.equal(armoredShot.damageBlocked[EXPEDITION_HERO_ID], .5);
  assert.equal(hero(armoredShot).hp, 3);
  assert.equal(hero(armoredShot).energy, 0);
});

test('an absorbed free copy does not consume paid secret uses and the final paid use leaves the hand', () => {
  const battle = start({ tempCards: [{ cardId: 'pegasus', usesLeft: 2 }] });
  const free = play(battle, 'pegasus', 'defend', { energy: 2, freeSkills: ['pegasus'] });
  assert.equal(hero(free).energy, 2);
  assert.equal(free.run.tempCards[0].usesLeft, 2);
  const paid = play(free, 'pegasus', 'defend');
  assert.equal(hero(paid).energy, 1);
  assert.equal(paid.run.tempCards[0].usesLeft, 1);
  assert.ok(getPlayerCards(hero(paid), paid.players).some(card => card.id === 'pegasus'));
  const last = play(paid, 'pegasus', 'defend');
  assert.equal(hero(last).energy, 0);
  assert.deepEqual(last.run.tempCards, []);
  assert.ok(!getPlayerCards(hero(last), last.players).some(card => card.id === 'pegasus'));
});

test('rest and challenge trade real recovery for tougher enemies and a fixed win bonus', () => {
  const before = { ...createExpeditionRun(), stageIdx: 2, hp: 2 };
  const rest = takeExpeditionRoute(before, 'rest'), risk = takeExpeditionRoute(before, 'risk');
  assert.equal(rest.hp, 2.5);
  assert.equal(risk.hp, 2);
  assert.equal(before.hp, 2);
  const easy = setupExpeditionStage(rest, 3, identity, seeded), hard = setupExpeditionStage(risk, 3, identity, seeded);
  assert.equal(hard.players[1].hp - easy.players[1].hp, .5);
  assert.equal(hard.memory.maxHp[hard.players[1].id], hard.players[1].hp);
  const easyWin = play(easy, 'ka', 'defend', { energy: 3 }, { hp: 1 });
  const hardWin = play(hard, 'ka', 'defend', { energy: 3 }, { hp: 1 });
  assert.equal(easyWin.won, true);
  assert.equal(hardWin.won, true);
  assert.equal(hardWin.gold - easyWin.gold, 4);
  assert.equal(hardWin.run.gold - hard.run.gold, hardWin.gold);
});

test('Vigor, Life Gem and healing respect the five-HP cap without mutating previous rewards', () => {
  const before = { ...createExpeditionRun(), hp: 4.5, maxHp: 4.5, gold: 100, relics: ['ypj'], tempCards: [{ cardId: 'pegasus', usesLeft: 2 }] };
  const snapshot = structuredClone(before);
  const vigor = takeExpeditionReward(before, { kind: 'maxhp' });
  assert.equal(vigor.hp, 5);
  assert.equal(vigor.maxHp, 5);
  assert.deepEqual(takeExpeditionReward(before, { kind: 'maxhp' }), vigor, 'Replaying the same input produces one gain');
  assert.equal(takeExpeditionReward(vigor, { kind: 'maxhp' }).maxHp, 5);
  const duplicateRelic = takeExpeditionReward(before, { kind: 'relic', relicId: 'ypj' });
  assert.deepEqual(duplicateRelic.relics, ['ypj']);
  const card = takeExpeditionReward(before, { kind: 'temp', cardId: 'pegasus', uses: 1 });
  assert.equal(card.tempCards[0].usesLeft, 3);
  assert.deepEqual(before, snapshot);
  const gem = buyExpeditionItem({ ...before, hp: 4 }, gear('lifegem'), seeded);
  assert.equal(gem.maxHp, 5);
  assert.equal(gem.hp, 5);
  const full = { ...vigor, hp: 5, gold: 100 };
  assert.equal(buyExpeditionItem(full, { kind: 'potion', price: 10 }, seeded).gold, 100);
  assert.equal(buyExpeditionItem(full, gear('lifegem'), seeded).gold, 100, 'Do not charge for a capped item with no effect');
});

test('bounded equipment effects agree with their descriptions across stage setup and purchase', () => {
  const before = { ...createExpeditionRun(), inventory: [0, 1, 2, 3, 4, 5], gold: 100,
    relics: ['rxyd'], equipment: ['moneytree', 'luckydice', 'waraxe'] };
  const snapshot = structuredClone(before);
  const battle = setupExpeditionStage(before, 10, identity, seeded);
  assert.equal(battle.run.gold, 104);
  assert.equal(hero(battle).energy, 1);
  assert.equal(hero(battle).dmgBonus, .5);
  assert.equal(battle.run.tempCards.length, 1);
  assert.equal(battle.run.tempCards[0].usesLeft, 1);
  const charm = buyExpeditionItem(battle.run, gear('skillcharm'), seeded);
  assert.equal(charm.tempCards.reduce((sum, card) => sum + card.usesLeft, 0), 6, 'One dice use plus five charm uses');
  assert.deepEqual(before, snapshot);
});

test('expedition upgrades and the level badge expose independent choices that survive the next stage', () => {
  let initial = createExpeditionRun();
  for (let level = 1; level <= 3; level++) initial = takeExpeditionReward(initial, { kind: 'levelup', level });
  const before = structuredClone(initial);
  assert.equal(hasSkillOverflow(initial), false);
  const reward = takeExpeditionReward(initial, { kind: 'levelup', level: 4 });
  const badge = buyExpeditionItem({ ...initial, gold: 100 }, gear('levelbadge'), seeded);
  assert.deepEqual(reward.skillLoadout, badge.skillLoadout);
  assert.deepEqual(getSkillOverflow(reward).map(group => group.category), ['ATTACK', 'ULTIMATE']);
  const picked = resolveSkillLoadout(reward, { ATTACK: ['pegasus', 'icesword', 'dragonclaw'], ULTIMATE: ['iceult', 'fireclaw', 'boiler'] })!;
  const next = setupExpeditionStage(picked, 5, identity, seeded);
  assert.deepEqual(next.run.skillLoadout, picked.skillLoadout);
  assert.deepEqual(hero(next).skillLoadout, picked.skillLoadout);
  assert.notEqual(hero(next).skillLoadout, picked.skillLoadout, 'No shared mutable arrays');
  const hand = getPlayerCards(hero(next), next.players).map(card => card.id);
  assert.ok(!hand.includes('hotmilk') && !hand.includes('meteor'));
  assert.ok(hand.includes('boiler') && hand.includes('pegasus') && hand.includes('skydragon'));
  const fifth = grantSkillLevel(picked, 5);
  assert.ok(fifth.skillLoadout.includes('madian') && fifth.skillLoadout.includes('hangman'));
  assert.ok(!fifth.skillLoadout.includes('hotmilk'));
  assert.deepEqual(initial, before);
});

test('legacy expedition saves expose overflow without pruning fixed enemy rosters or temporary abilities', () => {
  const legacy: ExpeditionRun = { ...createExpeditionRun(), inventory: [0, 1, 2, 3, 4],
    tempCards: [{ cardId: 'skydragon', usesLeft: 2 }] };
  delete legacy.skillLoadout;
  const battle = setupExpeditionStage(legacy, 16, identity, seeded);
  assert.equal(hasSkillOverflow(battle.run), true);
  assert.ok(hero(battle).tempSkills?.includes('skydragon'));
  for (const enemy of battle.players.filter(player => player.isBot)) {
    assert.equal(enemy.skillLoadout, undefined, 'Encounter definitions keep their fixed skill sets');
  }
  const choices = resolveSkillLoadout(battle.run, { ATTACK: [], ULTIMATE: [] })!;
  const replay = setupExpeditionStage(choices, 16, identity, seeded);
  assert.ok(getPlayerCards(hero(replay), replay.players).some(card => card.id === 'skydragon'));
});
