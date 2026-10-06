/** node --import tsx scripts/simulate-endless.ts --seeds=10 --battles=40 --out=endless-simulation.json */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { expeditionBotMove } from '../src/logic/expeditionAI';
import { getBotStyle } from '../src/logic/bots';
import { getExpeditionStage, genShopItems, type RewardOption, type ShopItem } from '../src/logic/expedition';
import { getPlayerCards, getPlayerLevel } from '../src/logic/combat';
import { autoSelectSkillLoadout, hasSkillOverflow } from '../src/logic/skillLoadout';
import { createExpeditionRun, setupExpeditionStage, settleExpeditionRound, reviveEndlessExpedition,
  recordExpeditionHistory, genExpeditionRewards, takeExpeditionReward, buyExpeditionItem, takeExpeditionRoute,
  EXPEDITION_HERO_ID, type ExpeditionRun, type ExpeditionHistory } from '../src/logic/expeditionRuntime';

const option = (key: string, fallback: string) => process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const seeds = Number(option('seeds', '10')), battles = Number(option('battles', '40'));
if (![seeds, battles].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Positive --seeds and --battles required');
const output = option('out', 'endless-simulation.json');
const maxTurns = Number(option('turns', '80'));
if (!Number.isSafeInteger(maxTurns) || maxTurns < 1) throw new Error('Positive --turns required');
function randomFor(...keys: (string | number)[]) {
  let state = 2166136261;
  for (const char of keys.join('|')) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function rewardScore(run: ExpeditionRun, reward: RewardOption) {
  if (reward.kind === 'maxhp') return run.maxHp < 5 ? 20 : 0;
  if (reward.kind === 'heal') return (run.maxHp - run.hp) * 12;
  if (reward.kind === 'relic') return 8;
  if (reward.kind === 'temp') return 2;
  return 0;
}
function shopScore(run: ExpeditionRun, item: ShopItem) {
  if (item.kind === 'potion') return run.maxHp - run.hp >= 1 ? 30 : 0;
  if (item.kind === 'tempcard') return run.gold > 80 ? 1 : 0;
  return ({ lifegem: 25, bloodsword: 22, waraxe: 20, doll: 12, treasurepot: 8, moneytree: 8,
    luckydice: 4, skillcharm: 3 } as Record<string, number>)[item.equipment.id] ?? 0;
}
const details = [];
for (let seed = 1; seed <= seeds; seed++) {
  let run = createExpeditionRun('endless');
  const result = { seed, wins: 0, defeats: 0, stalled: 0, turns: 0, level: 0, enemyLevel: 1,
    progressionPreserved: true, attempts: [] as { stage: number; turns: number; outcome: string }[],
    stallState: undefined as undefined | { id: string; hp: number; energy: number; layer: number; level: number; history: string[] }[] };
  for (let attempt = 0; attempt < battles; attempt++) {
    const setup = setupExpeditionStage(run, result.wins, { name: 'Simulation', avatar: 'avatars/dragon.webp', lang: 'en' }, randomFor(seed, attempt, 'entry'));
    let { players, memory } = setup;
    run = setup.run;
    let history: ExpeditionHistory = {};
    const stage = getExpeditionStage(run.stageIdx, 'endless')!;
    assert.equal(hasSkillOverflow(run), false);
    assert.ok(players.filter(player => player.id !== EXPEDITION_HERO_ID).every(enemy => getPlayerLevel(enemy) >= run.endlessLevel! + 1));
    let resolved = false;
    for (let turn = 1; turn <= maxTurns; turn++) {
      const committed = new Map(players.filter(player => !player.isDead && player.id !== EXPEDITION_HERO_ID).map(enemy => {
        const definition = stage.enemies.find(def => enemy.id === `exp_${stage.id}_${def.id}`)!;
        return [enemy.id, expeditionBotMove(enemy, players, definition.personality, EXPEDITION_HERO_ID,
          { history, random: randomFor(seed, attempt, turn, enemy.id) })];
      }));
      const hero = players.find(player => player.id === EXPEDITION_HERO_ID)!;
      assert.ok(players.every(player => player.selectedCardId == null), 'Decisions only receive public state');
      const move = expeditionBotMove(hero, players, getBotStyle('endless-probe').personality, EXPEDITION_HERO_ID,
        { history, random: randomFor(seed, attempt, turn, 'hero') });
      assert.ok(getPlayerCards(hero, players).some(card => card.id === move && !hero.disabledSkills?.includes(card.id)
        && (hero.freeSkills?.includes(card.id) || card.cost <= hero.energy)), 'Hero move must be legal');
      const revealed = players.map(player => ({ ...player, selectedCardId: player.isDead ? null : player.id === EXPEDITION_HERO_ID ? move : committed.get(player.id)! }));
      const previousLevel = run.endlessLevel!;
      const earnedLevel = Math.max(...revealed.filter(player => player.id !== EXPEDITION_HERO_ID).map(getPlayerLevel)) + 1;
      const previousInventory = [...run.inventory];
      history = recordExpeditionHistory(history, revealed);
      const settled = settleExpeditionRound(run, memory, revealed, turn, 'en', randomFor(seed, attempt, turn, 'settle'));
      ({ run, players, memory } = settled);
      result.turns++;
      if (!settled.won && !settled.lost) continue;
      resolved = true;
      result.attempts.push({ stage: run.stageIdx + 1, turns: turn, outcome: settled.won ? 'win' : 'defeat' });
      if (settled.lost) {
        result.defeats++;
        const previous = structuredClone(run);
        run = reviveEndlessExpedition(run);
        assert.equal(run.endlessLevel, previous.endlessLevel);
        for (const key of ['inventory', 'skillLoadout', 'relics', 'equipment', 'tempCards', 'gold', 'maxHp'] as const) assert.deepEqual(run[key], previous[key]);
        assert.equal(run.endlessEnemyLevel, previous.endlessEnemyLevel! + 1);
        assert.equal(run.hp, run.maxHp);
      } else {
        result.wins++;
        assert.equal(run.endlessLevel, earnedLevel, 'Victory earns the highest defeated enemy level plus one');
        assert.ok(previousInventory.every(level => run.inventory.includes(level)), 'Old unlock history survives a jump');
        assert.ok(run.inventory.filter(level => !previousInventory.includes(level)).every(level => level === earnedLevel), 'Do not grant skipped tiers');
        run = autoSelectSkillLoadout(run);
        const rewards = genExpeditionRewards(run, randomFor(seed, attempt, 'reward'));
        assert.ok(rewards.length >= 3 && rewards.every(reward => reward.kind !== 'levelup'));
        run = takeExpeditionReward(run, [...rewards].sort((a, b) => rewardScore(run, b) - rewardScore(run, a))[0]);
        const shop = genShopItems(run.equipment, Math.max(...run.inventory), run.stageIdx, randomFor(seed, attempt, 'shop'), run);
        for (const item of [...shop].sort((a, b) => shopScore(run, b) - shopScore(run, a))) if (shopScore(run, item) > 0) run = buyExpeditionItem(run, item, randomFor(seed, attempt, 'buy'));
        run = takeExpeditionRoute(run, 'rest');
      }
      assert.equal(run.endlessLevel, settled.won ? earnedLevel : previousLevel, 'Growth is tied to the actual defeated enemy, not the win count');
      assert.equal(run.endlessDefeats, result.defeats, 'Each defeat raises enemies exactly once');
      break;
    }
    if (!resolved) {
      result.stalled++;
      result.stallState = players.map(player => ({ id: player.id, hp: player.hp, energy: player.energy,
        layer: player.layer, level: getPlayerLevel(player), history: history[player.id] ?? [] }));
      break;
    }
  }
  result.level = run.endlessLevel!;
  result.enemyLevel = run.endlessEnemyLevel!;
  details.push(result);
  console.log(JSON.stringify({ ...result, attempts: result.attempts.length }));
}
const report = { seeds, battlesPerSeed: battles, maxTurnsPerBattle: maxTurns,
  method: 'Production runtime and public-history AI on both sides. Enemy moves are committed first and never revealed to the hero policy. Defeats revive the settled run; victories grant rewards and use the ordinary shop.',
  limitations: ['AI benchmark, not human win rates.', 'Fixed newest-skill and healing-focused shop policy.', `An unfinished battle at ${maxTurns} turns is reported as stalled, never a victory.`],
  summary: { attempts: details.reduce((n, entry) => n + entry.attempts.length, 0), wins: details.reduce((n, entry) => n + entry.wins, 0),
    defeats: details.reduce((n, entry) => n + entry.defeats, 0), stalled: details.reduce((n, entry) => n + entry.stalled, 0),
    maxHeroLevel: Math.max(...details.map(entry => entry.level)), maxEnemyLevel: Math.max(...details.map(entry => entry.enemyLevel)) }, details };
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
