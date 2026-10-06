import type { Card, Player } from '../types';
import { FINAL_LEVEL } from '../data/constants';
import { SKILL_DB } from '../data/skills';
import { calculateTurnOutcome, getEffectiveLevel, getPlayerCards, isOffensiveCard } from './combat';
import { botSeed, getBotStyle, type BotPersonality } from './bots';

interface Options {
  turn?: number;
  matchCount?: number;
  personality?: BotPersonality;
}

function randomFrom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

const legalCards = (player: Player, players: Player[]) => [...new Map(getPlayerCards(player, players)
  .filter(c => !player.disabledSkills?.includes(c.id) && (c.cost <= player.energy || player.freeSkills?.includes(c.id)))
  .map(c => [c.id, c])).values()];

function predictionWeight(card: Card, player: Player, others: Player[]): number {
  const opponents = others.filter(p => p.id !== player.id);
  const threatened = opponents.some(p => p.energy >= 1 || p.freeSkills?.some(id => {
    const move = SKILL_DB.find(c => c.id === id);
    return move && isOffensiveCard(move);
  }));
  let weight = 1;
  if (card.type === 'CHARGE') weight = player.energy < 2 ? 5 : player.energy < 4 ? 2 : .55;
  else if (card.type === 'DEFEND') weight = threatened ? 1.4 : .3;
  else if (card.type === 'ATTACK') weight = opponents.some(p => p.energy === 0) ? 2.4 : 1.5;
  else if (card.type === 'ULTIMATE') weight = opponents.some(p => SKILL_DB.find(c => c.id === p.lastCardId)?.type === 'DEFEND') ? 2.4 : 1.2;
  else if (card.type === 'ABSORB') weight = .8;
  else weight = card.id === 'shatter' ? 1.2 : .4;
  // A tendency, not certainty: repeated defense/charging can be punished or changed.
  if (SKILL_DB.find(c => c.id === player.lastCardId)?.type === card.type) weight *= 2;
  return weight / (1 + (player.freeSkills?.includes(card.id) ? 0 : card.cost) * .15);
}

function pickWeighted<T>(values: { value: T; weight: number }[], random: () => number): T {
  let cursor = random() * values.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of values) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.value;
  }
  return values[values.length - 1].value;
}

const energyValue = (energy: number) => 2.3 * Math.sqrt(Math.min(10, Math.max(0, energy)));
const freeValue = (skills: string[] = []) => skills.reduce((sum, id) => sum + .3 * Math.sqrt((SKILL_DB.find(c => c.id === id)?.cost ?? 0) + 1), 0);

function scoreOutcome(before: Player[], after: Player[], botId: string, personality: BotPersonality): number {
  const me = before.find(p => p.id === botId)!;
  const result = after.find(p => p.id === botId)!;
  const opponents = before.filter(p => p.id !== botId);
  const aggression = .7 + personality.aggression * .7;
  const caution = .65 + personality.defense * .6;
  let score = (result.isDead ? -26 : 0) * caution;
  score -= Math.max(0, me.hp - result.hp) / Math.max(1, me.hp) * 4 * caution;
  const normalization = Math.sqrt(opponents.length);
  for (const opponent of opponents) {
    const next = after.find(p => p.id === opponent.id)!;
    score += Math.max(0, opponent.hp - next.hp) / Math.max(1, opponent.hp) * 2.6 * aggression / normalization;
    score += ((next.disabledSkills?.length ?? 0) - (opponent.disabledSkills?.length ?? 0)) * .6 / normalization;
  }
  score += ((result.kills ?? 0) - (me.kills ?? 0)) * 4 * aggression / normalization;
  if (!result.isDead) {
    score += (energyValue(result.energy) - energyValue(me.energy)) * (.7 + personality.charge * .6);
    score += freeValue(result.freeSkills) - freeValue(me.freeSkills);
    score -= ((result.disabledSkills?.length ?? 0) - (me.disabledSkills?.length ?? 0)) * .8;
    const living = after.filter(p => p.id !== botId && !p.isDead);
    if (!living.length) score += 8;
    else {
      const beforeDistance = Math.min(...opponents.map(p => Math.abs(p.layer - me.layer)));
      const afterDistance = Math.min(...living.map(p => Math.abs(p.layer - result.layer)));
      score += Math.max(-2, Math.min(2, beforeDistance - afterDistance)) * .3;
    }
  }
  return score;
}

/** A bounded one-turn search. Never uses a participant's locked, unrevealed move. */
export function getBotMove(bot: Player, allPlayers: Player[], options: Options = {}): string {
  // Copy public combat state explicitly; even reading a hidden selection is forbidden.
  const players: Player[] = allPlayers.map(p => ({
    id: p.id, name: p.name, isBot: p.isBot, hp: p.hp, energy: p.energy, isDead: p.isDead,
    inventory: [...p.inventory], pendingLevel: p.pendingLevel, endlessLevel: p.endlessLevel,
    ...(p.skillLoadout ? { skillLoadout: [...p.skillLoadout] } : {}),
    layer: p.layer, tempLayerMod: p.tempLayerMod, selectedCardId: null,
    lastCardId: p.lastCardId, lastAction: p.lastAction, kills: p.kills, isShared: p.isShared,
    freeSkills: [...(p.freeSkills ?? [])], tempSkills: [...(p.tempSkills ?? [])],
    disabledSkills: [...(p.disabledSkills ?? [])], dmgBonus: p.dmgBonus,
    energyDrain: p.energyDrain, pierce: p.pierce,
  }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const active = players.filter(p => !p.isDead);
  const me = active.find(p => p.id === bot.id);
  if (!me) return 'charge';
  const available = legalCards(me, players);
  // Preserve the room's existing last-resort move if every skill has been sealed.
  if (!available.length) return 'charge';
  if (available.length === 1 || active.length === 1) return available[0].id;
  const personality = options.personality ?? getBotStyle(bot.id).personality;
  const seed = botSeed(`${bot.id}|${options.turn ?? 0}|${options.matchCount ?? 0}|${active.map(p =>
    `${p.id}:${p.energy}:${p.hp}:${p.layer}:${p.lastCardId}`).join('|')}`);
  const random = randomFrom(seed);
  const models = active.filter(p => p.id !== bot.id).map(player => {
    const cards = legalCards(player, players);
    const choices = cards.length ? cards : [SKILL_DB.find(c => c.id === 'charge')!];
    // Divide by category size so a large deck does not imply constant aggression.
    const weighted = choices.map(card => ({ value: card.id, weight: predictionWeight(card, player, active) /
      choices.filter(c => c.type === card.type).length }));
    const strongest = choices.filter(isOffensiveCard).sort((a, b) => b.tier - a.tier || getEffectiveLevel(b) - getEffectiveLevel(a))[0];
    return { player, weighted, charge: choices.find(c => c.id === 'charge')?.id, strongest: strongest?.id };
  });
  // All candidates see the same scenarios; include an aggressive possibility explicitly.
  const scenarios = Array.from({ length: 16 }, (_, index) => models.map(model => ({ ...model.player,
    selectedCardId: (index === 0 ? model.charge : index === 1 ? model.strongest : undefined) ?? pickWeighted(model.weighted, random),
  })));
  const scores = available.map(card => {
    let total = 0;
    let winsEveryScenario = true;
    for (const scenario of scenarios) {
      const outcome = calculateTurnOutcome([{ ...me, selectedCardId: card.id }, ...scenario], 0, FINAL_LEVEL, 'en');
      total += scoreOutcome(active, outcome.players, me.id, personality);
      winsEveryScenario &&= outcome.winner?.id === me.id;
    }
    return { value: card.id, score: total / scenarios.length, winsEveryScenario,
      cost: me.freeSkills?.includes(card.id) ? 0 : card.cost };
  }).sort((a, b) => b.score - a.score);
  // If several moves win every sampled response, conserve energy instead of overkill.
  const winning = scores.filter(entry => entry.winsEveryScenario);
  const cheapestWin = Math.min(...winning.map(entry => entry.cost));
  const candidates = winning.length ? winning.filter(entry => entry.cost === cheapestWin) : scores;
  // More uncertainty when a living opponent can spend energy. Keep the seeded
  // choice stable across clients and vary only among similarly useful moves.
  const opponentHasEnergy = active.some(p => p.id !== me.id && p.energy > 0);
  const temperature = .2 + (1 - personality.smart) * 1.3 + (opponentHasEnergy ? .55 : 0);
  const contenders = candidates.filter(entry => entry.score >= candidates[0].score - temperature * 2);
  return pickWeighted(contenders.map(entry => ({ value: entry.value, weight: Math.exp((entry.score - candidates[0].score) / temperature) })), random);
}
