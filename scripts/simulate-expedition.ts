/** Reproduce with: node --import tsx scripts/simulate-expedition.ts --difficulty=normal --seeds=200 --out=report.json */
import { writeFileSync } from 'node:fs';
import type { Card, Player } from '../src/types';
import { EXPEDITION_STAGES } from '../src/data/expedition';
import { getExpeditionDifficulty, type ExpeditionDifficulty } from '../src/data/expeditionDifficulty';
import { SKILL_DB } from '../src/data/skills';
import { getEffectiveLevel, getPlayerCards, isOffensiveCard } from '../src/logic/combat';
import { expeditionBotMove, expeditionMoveWeights } from '../src/logic/expeditionAI';
import { autoSelectSkillLoadout, hasSkillOverflow } from '../src/logic/skillLoadout';
import { EXPEDITION_MAX_LEVEL, genRewardOptions, genShopItems, type RewardOption, type ShopItem } from '../src/logic/expedition';
import {
  EXPEDITION_HERO_ID, createExpeditionRun, setupExpeditionStage, settleExpeditionRound,
  recordExpeditionHistory, takeExpeditionReward, buyExpeditionItem, takeExpeditionRoute,
  type ExpeditionRun, type ExpeditionBattleMemory, type ExpeditionHistory,
} from '../src/logic/expeditionRuntime';

type Strategy = 'random' | 'charge-attack' | 'read-history' | 'always-defend';
const allStrategies: Strategy[] = ['random', 'charge-attack', 'read-history', 'always-defend'];
const cardById = new Map(SKILL_DB.map(card => [card.id, card]));
const option = (key: string, fallback: string) => process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const seeds = Number(option('seeds', '200'));
if (!Number.isInteger(seeds) || seeds < 1) throw new Error('--seeds must be a positive integer');
const difficultyOption = option('difficulty', 'beginner');
if (difficultyOption !== 'beginner' && difficultyOption !== 'normal') throw new Error('--difficulty must be beginner or normal');
const difficulty: ExpeditionDifficulty = difficultyOption;
const routePolicy = option('route', 'adaptive');
if (!['adaptive', 'rest', 'risk'].includes(routePolicy)) throw new Error('--route must be adaptive, rest or risk');
const strategies = option('strategies', allStrategies.join(',')).split(',') as Strategy[];
if (strategies.some(strategy => !allStrategies.includes(strategy))) throw new Error('Unknown strategy');
const output = option('out', `expedition-simulation-${difficulty}.json`);
const maxTurns = 80;

/** Every decision has its own stream: forecast draws never advance actual enemy RNG. */
function randomFor(...keys: (string | number)[]) {
  let seed = 2166136261;
  for (const char of keys.join('|')) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function pick<T>(entries: { value: T; probability: number }[], random: () => number): T {
  let remaining = random();
  for (const entry of entries) { remaining -= entry.probability; if (remaining < 0) return entry.value; }
  return entries[entries.length - 1].value;
}
const costOf = (hero: Player, card: Card) => hero.freeSkills?.includes(card.id) ? 0 : card.cost;
const available = (hero: Player, players: Player[]) => [...new Map(getPlayerCards(hero, players)
  .filter(card => !hero.disabledSkills?.includes(card.id) && costOf(hero, card) <= hero.energy)
  .map(card => [card.id, card])).values()].sort((a, b) => a.id.localeCompare(b.id));
const levelOf = (run: ExpeditionRun) => Math.max(...run.inventory);

function rewardScore(run: ExpeditionRun, reward: RewardOption): number {
  const missing = run.maxHp - run.hp;
  switch (reward.kind) {
    case 'heal': return missing >= 1 ? (run.hp <= 1.5 ? 20 : 8) : missing * 6;
    case 'levelup': return 9 + (reward.level === 1 || reward.level === 2 || reward.level === 5 ? 2 : 0);
    case 'maxhp': return run.maxHp < 5 ? 5 + (run.hp <= 1.5 ? 8 : 0) : 0;
    case 'temp': return 2 + Math.min(4, cardById.get(reward.cardId)?.tier ?? 0) * .25;
    case 'relic': return ({ zstai: 12, fjqt: 9, rxyd: 9, ypj: 8, tbs: 8, mds: 6, jsn: 6, zjling: 5, cbt: 4 } as Record<string, number>)[reward.relicId] ?? 3;
  }
}
function shopScore(run: ExpeditionRun, item: ShopItem): number {
  if (item.kind === 'potion') return run.maxHp - run.hp >= 1 ? 30 : 0;
  if (item.kind === 'tempcard') return run.gold >= 40 ? 2 : 0;
  return ({ waraxe: 20, bloodsword: 19, lifegem: run.maxHp < 5 || run.hp < run.maxHp ? 18 : 0,
    levelbadge: levelOf(run) < EXPEDITION_MAX_LEVEL ? 11 : 0, doll: 10, treasurepot: 8, moneytree: 7, luckydice: 5, skillcharm: 4 } as Record<string, number>)[item.equipment.id] ?? 0;
}

function predictMove(run: ExpeditionRun, memory: ExpeditionBattleMemory, players: Player[], history: ExpeditionHistory,
  turn: number, seed: number): string {
  if (players.some(player => player.selectedCardId !== null)) throw new Error('Reader received a hidden committed move');
  const hero = players.find(player => player.id === EXPEDITION_HERO_ID)!;
  const cards = available(hero, players);
  const enemies = players.filter(player => !player.isDead && player.id !== hero.id);
  const definitions = EXPEDITION_STAGES[run.stageIdx].enemies;
  const models = enemies.map(enemy => ({ enemy, weights: expeditionMoveWeights(enemy, players,
    definitions.find(def => enemy.id === `exp_${EXPEDITION_STAGES[run.stageIdx].id}_${def.id}`)!.personality,
    hero.id, { history }) }));
  const forecasts: { moves: Record<string, string>; probability: number }[] = [];
  // Exact one-opponent expectation; common seeded scenarios for multi-opponent choices.
  if (models.length === 1) {
    for (const weight of models[0].weights) forecasts.push({ moves: { [models[0].enemy.id]: weight.cardId }, probability: weight.probability });
  } else {
    const forecastRng = randomFor('forecast', seed, run.stageIdx, turn);
    for (let sample = 0; sample < 16; sample++) forecasts.push({ probability: 1 / 16,
      moves: Object.fromEntries(models.map(model => [model.enemy.id, pick(model.weights.map(weight => ({ value: weight.cardId, probability: weight.probability })), forecastRng)])) });
  }
  let bestMove = cards[0]?.id ?? 'charge', bestScore = -Infinity;
  for (const card of cards) {
    let score = 0;
    for (const forecast of forecasts) {
      const revealed = players.map(player => ({ ...player, selectedCardId: player.isDead ? null : player.id === hero.id ? card.id : forecast.moves[player.id] }));
      const result = settleExpeditionRound(run, memory, revealed, turn, 'en', () => .5);
      const after = result.players.find(player => player.id === hero.id)!;
      const damage = enemies.reduce((sum, enemy) => sum + enemy.hp - Math.max(0, result.players.find(player => player.id === enemy.id)!.hp), 0);
      const kills = enemies.filter(enemy => result.players.find(player => player.id === enemy.id)!.isDead).length;
      // A public one-step benchmark, not a prediction of a particular player's skill.
      const utility = (result.lost ? -22 : result.won ? 12 : 0)
        + (after.hp - hero.hp) * (hero.hp <= 1 ? 6 : 3.8) + damage * 2 + kills * 1.5
        + (Math.min(6, after.energy) - Math.min(6, hero.energy)) * .45
        - (hero.tempSkills?.includes(card.id) && !hero.freeSkills?.includes(card.id) ? .05 : 0);
      score += forecast.probability * utility;
    }
    if (score > bestScore + 1e-9) { bestScore = score; bestMove = card.id; }
  }
  return bestMove;
}

function chooseMove(strategy: Strategy, run: ExpeditionRun, memory: ExpeditionBattleMemory, players: Player[],
  history: ExpeditionHistory, turn: number, seed: number): string {
  const hero = players.find(player => player.id === EXPEDITION_HERO_ID)!;
  const cards = available(hero, players);
  if (strategy === 'always-defend') return cards.find(card => card.id === 'defend')?.id ?? cards[0]?.id ?? 'charge';
  if (strategy === 'random') return cards[Math.floor(randomFor('hero', seed, run.stageIdx, turn)() * cards.length)]?.id ?? 'charge';
  if (strategy === 'charge-attack') {
    const attack = cards.filter(card => isOffensiveCard(card) && costOf(hero, card) <= 2)
      .sort((a, b) => b.tier - a.tier || getEffectiveLevel(b) - getEffectiveLevel(a) || costOf(hero, a) - costOf(hero, b))[0];
    return attack?.id ?? 'charge';
  }
  return predictMove(run, memory, players, history, turn, seed);
}

interface RunResult {
  seed: number; cleared: number; turns: number; stalled: boolean; routes: { rest: number; risk: number };
  stageTurns: number[]; moves: Record<string, number>; hp: number; level: number; damageTaken: number; blocks: number;
  loadoutChoices: number;
}
function simulate(strategy: Strategy, seed: number): RunResult {
  let run = createExpeditionRun(difficulty);
  const stats: RunResult = { seed, cleared: 0, turns: 0, stalled: false, routes: { rest: 0, risk: 0 },
    stageTurns: [], moves: {}, hp: run.hp, level: 0, damageTaken: 0, blocks: 0, loadoutChoices: 0 };
  const keepLatestSkills = (rewarded: ExpeditionRun): ExpeditionRun => {
    if (hasSkillOverflow(rewarded)) stats.loadoutChoices++;
    return autoSelectSkillLoadout(rewarded);
  };
  for (let stageIdx = 0; stageIdx < EXPEDITION_STAGES.length; stageIdx++) {
    const setup = setupExpeditionStage(run, stageIdx, { name: 'Simulated player', avatar: '🐉', lang: 'en' }, randomFor('setup', seed, stageIdx));
    let { players, memory } = setup;
    run = setup.run;
    if (hasSkillOverflow(run) || hasSkillOverflow(players.find(player => player.id === EXPEDITION_HERO_ID)!)) {
      throw new Error('Simulated player entered a stage with unresolved skill choices');
    }
    let history: ExpeditionHistory = {}, won = false, lost = false;
    for (let turn = 1; turn <= maxTurns; turn++) {
      // Draw all enemy intents before the hero acts, without exposing them to its policy.
      const committed = new Map(players.filter(player => player.id !== EXPEDITION_HERO_ID && !player.isDead).map(enemy => {
        const definition = EXPEDITION_STAGES[stageIdx].enemies.find(def => enemy.id === `exp_${EXPEDITION_STAGES[stageIdx].id}_${def.id}`)!;
        return [enemy.id, expeditionBotMove(enemy, players, definition.personality, EXPEDITION_HERO_ID,
          { history, random: randomFor('actual-enemy', seed, stageIdx, turn, enemy.id) })];
      }));
      const publicPlayers = players.map(player => ({ ...player, selectedCardId: null }));
      const move = chooseMove(strategy, run, memory, publicPlayers, history, turn, seed);
      const revealed = players.map(player => ({ ...player, selectedCardId: player.isDead ? null : player.id === EXPEDITION_HERO_ID ? move : committed.get(player.id)! }));
      history = recordExpeditionHistory(history, revealed);
      const result = settleExpeditionRound(run, memory, revealed, turn, 'en', randomFor('settlement', seed, stageIdx, turn));
      ({ run, memory, players, won, lost } = result);
      stats.turns++; stats.stageTurns[stageIdx] = turn;
      stats.moves[move] = (stats.moves[move] ?? 0) + 1;
      stats.damageTaken += result.damageTaken[EXPEDITION_HERO_ID] ?? 0;
      stats.blocks += result.defendedHits[EXPEDITION_HERO_ID] ?? 0;
      if (won || lost) break;
    }
    stats.hp = run.hp; stats.level = levelOf(run);
    if (!won) { stats.stalled = !lost; return stats; }
    stats.cleared++;
    if (stageIdx === EXPEDITION_STAGES.length - 1) break;
    const rewards = genRewardOptions(run.hp, run.maxHp, run.relics, run.relics.includes('cbt') ? 4 : 3,
      run.inventory, stageIdx, randomFor('rewards', seed, stageIdx));
    run = keepLatestSkills(takeExpeditionReward(run, [...rewards].sort((a, b) => rewardScore(run, b) - rewardScore(run, a))[0]));
    const shop = genShopItems(run.equipment, levelOf(run), stageIdx, randomFor('shop', seed, stageIdx), run);
    for (const item of [...shop].sort((a, b) => shopScore(run, b) - shopScore(run, a))) {
      if (shopScore(run, item) > 0) run = keepLatestSkills(buyExpeditionItem(run, item, randomFor('purchase', seed, stageIdx, JSON.stringify(item))));
    }
    const route = stageIdx < 2 || routePolicy === 'rest' ? 'rest'
      : routePolicy === 'risk' || run.hp >= run.maxHp ? 'risk' : 'rest';
    if (stageIdx >= 2) stats.routes[route]++;
    run = takeExpeditionRoute(run, route);
  }
  return stats;
}

const quantile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * fraction)] ?? 0;
const summaries = [], details: Record<string, RunResult[]> = {};
for (const strategy of strategies) {
  const results = Array.from({ length: seeds }, (_, index) => simulate(strategy, index + 1));
  details[strategy] = results;
  const summary = {
    strategy, seeds, difficulty, passed3: results.filter(result => result.cleared >= 3).length / seeds,
    passed6: results.filter(result => result.cleared >= 6).length / seeds,
    passedAll: results.filter(result => result.cleared >= EXPEDITION_STAGES.length).length / seeds,
    maxLevelReached: Math.max(...results.map(result => result.level)),
    runsAboveLevel5: results.filter(result => result.level > 5).length,
    medianCleared: quantile(results.map(result => result.cleared), .5),
    medianTurns: quantile(results.map(result => result.turns), .5),
    p95Turns: quantile(results.map(result => result.turns), .95),
    stalled: results.filter(result => result.stalled).length,
    loadoutChoices: results.reduce((sum, result) => sum + result.loadoutChoices, 0),
    routes: results.reduce((sum, result) => ({ rest: sum.rest + result.routes.rest, risk: sum.risk + result.routes.risk }), { rest: 0, risk: 0 }),
    stages: EXPEDITION_STAGES.map((stage, index) => ({ stage: index + 1, id: stage.id, name: stage.name.en,
      reached: results.filter(result => result.stageTurns[index]).length,
      cleared: results.filter(result => result.cleared > index).length,
      lost: results.filter(result => result.cleared === index && !result.stalled).length,
      stalled: results.filter(result => result.cleared === index && result.stalled).length,
      medianTurns: quantile(results.flatMap(result => result.stageTurns[index] ? [result.stageTurns[index]] : []), .5) })),
  };
  summaries.push(summary);
  console.log(JSON.stringify(summary));
}
const report = {
  generatedAt: new Date().toISOString(), seeds, difficulty: getExpeditionDifficulty(difficulty),
  stageCount: EXPEDITION_STAGES.length, routePolicy, maxTurnsPerStage: maxTurns,
  method: 'Shared production runtime; enemy intents committed first; separate seeded streams; reader sees public distributions and last three revealed cards, never sampled intents; exact one-opponent / 16 sampled multi-opponent forecasts.',
  economyPolicy: `Identical deterministic reward and one-purchase-per-shop-slot rules for all strategies. Prefer emergency healing, learned levels, useful relics; potions when missing at least 1 HP, then equipment. Route: ${routePolicy}; adaptive means risk at full HP, otherwise rest, after stage 3.`,
  skillPolicy: 'After each reward or purchase, the simulated player keeps the latest three permanent skills per category through the production loadout resolver. Basics and temporary/absorbed/derived cards do not use slots. Fixed expedition enemy rosters are unchanged; each stage asserts the player has no unresolved overflow.',
  limitations: ['Read-history is an informed model-based benchmark, not an estimate of a human beginner.', '80-round unfinished stages are counted as stalls, not victories.', 'Fixed reward/shop/route policy is one policy, not an exhaustive balance search.', 'All strategies keep the newest skills; this does not optimize retained combo ingredients or represent every human loadout choice.'],
  summaries, details,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Wrote ${output}`);
