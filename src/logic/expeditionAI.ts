import type { Card, CardType, Player } from '../types';
import type { ExpeditionPersonality } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import { calculateTurnOutcome, getEffectiveLevel, getPlayerCards, isOffensiveCard } from './combat';

export interface ExpeditionAIOptions {
  random?: () => number;
  /** Only cards revealed by completed rounds, oldest first. */
  history?: Record<string, string[]>;
}

export interface ExpeditionMoveWeight {
  cardId: string;
  type: CardType;
  typeWeight: number;
  cardWeight: number;
  probability: number;
}

const cardById = new Map(SKILL_DB.map(card => [card.id, card]));
const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
const costOf = (player: Player, card: Card) => player.freeSkills?.includes(card.id) ? 0 : card.cost;
const ownedCards = (player: Player, players: Player[]) => [...new Map(getPlayerCards(player, players)
  .filter(card => !player.disabledSkills?.includes(card.id)).map(card => [card.id, card])).values()];
const legalCards = (player: Player, players: Player[]) => ownedCards(player, players)
  .filter(card => costOf(player, card) <= player.energy);

/** Kept for callers that display a public threat. Decisions consider every living opponent. */
export function pickThreat(enemyId: string, players: Player[], playerId: string): Player | undefined {
  const opponents = players.filter(player => player.id !== enemyId && !player.isDead);
  return opponents.sort((a, b) => b.energy - a.energy || b.hp - a.hp || a.id.localeCompare(b.id))[0]
    ?? players.find(player => player.id === playerId);
}

function recentMoves(player: Player, history?: Record<string, string[]>): Card[] {
  const recorded = history?.[player.id];
  const ids = recorded?.length ? recorded.slice(-3) : player.lastCardId ? [player.lastCardId] : [];
  return ids.flatMap(id => { const card = cardById.get(id); return card ? [card] : []; });
}

function historyRates(player: Player, cards: Card[], history?: Record<string, string[]>) {
  const moves = recentMoves(player, history);
  // A small prior keeps one observed move from becoming a certain prediction.
  const prior = 0.8, denominator = moves.length + prior * 3;
  const rates = {
    charge: (prior + moves.filter(card => card.type === 'CHARGE').length) / denominator,
    defend: (prior + moves.filter(card => card.type === 'DEFEND').length) / denominator,
    attack: (prior + moves.filter(isOffensiveCard).length) / denominator,
  };
  const hasAttack = cards.some(isOffensiveCard);
  if (!hasAttack) {
    // After spending the last Energy, an attack/charge loop has to refill.
    rates.charge += rates.attack * .85;
    rates.defend += rates.attack * .15;
    rates.attack = 0;
  } else if (moves.some(card => card.type === 'CHARGE') && moves.some(isOffensiveCard)) {
    // Condition the observed pattern on public Energy, not on a hidden selection.
    rates.attack = rates.attack * .35 + .78 * .65;
    rates.charge *= .45;
    rates.defend *= .7;
  }
  const total = rates.charge + rates.defend + rates.attack;
  return { charge: rates.charge / total, defend: rates.defend / total, attack: rates.attack / total };
}

/** Explicit public snapshot: spreading a Player would read selectedCardId getters. */
function publicCombatant(player: Player): Player {
  return { id: player.id, name: player.name, isBot: player.isBot, hp: player.hp, energy: player.energy,
    isDead: player.isDead, inventory: [...player.inventory],
    ...(player.skillLoadout ? { skillLoadout: [...player.skillLoadout] } : {}),
    endlessLevel: player.endlessLevel,
    layer: player.layer, tempLayerMod: player.tempLayerMod,
    selectedCardId: null, lastCardId: player.lastCardId, lastAction: null, kills: player.kills,
    freeSkills: [...(player.freeSkills ?? [])], tempSkills: [...(player.tempSkills ?? [])],
    disabledSkills: [...(player.disabledSkills ?? [])], dmgBonus: player.dmgBonus,
    energyDrain: player.energyDrain, pierce: player.pierce };
}

function forecastCards(player: Player, cards: Card[], rates: ReturnType<typeof historyRates>, history?: Record<string, string[]>) {
  const hasUltimate = cards.some(card => card.type === 'ULTIMATE');
  const typeWeights: Record<CardType, number> = { CHARGE: rates.charge, DEFEND: rates.defend,
    ATTACK: rates.attack * (hasUltimate ? .75 : 1), ULTIMATE: rates.attack * .25, ABSORB: .04, SPECIAL: .02 };
  const recent = recentMoves(player, history);
  const choices: { card: Card; probability: number }[] = [];
  for (const type of new Set(cards.map(card => card.type))) {
    const candidates = cards.filter(card => card.type === type).map(card => ({ card,
      score: 1 + card.tier * .3 + getEffectiveLevel(card) * .35 - costOf(player, card) * .15
        + recent.filter(move => move.id === card.id).length * 3,
    })).sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id)).slice(0, 2);
    const total = candidates.reduce((sum, entry) => sum + entry.score, 0);
    for (const entry of candidates) choices.push({ card: entry.card, probability: typeWeights[type] * entry.score / total });
  }
  const total = choices.reduce((sum, entry) => sum + entry.probability, 0);
  return choices.map(entry => ({ ...entry, probability: entry.probability / total }));
}

const movedLayer = (player: Player, card: Card) => player.layer
  + (card.tags?.includes('layer_up') ? 1 : 0) - (card.tags?.includes('layer_down') ? 1 : 0)
  + (card.tags?.includes('layer_up_temp') ? 1 : 0)
  + (card.tags?.includes('layer_up_2_temp') ? 2 : 0)
  + (card.tags?.includes('layer_up_3_temp') ? 3 : 0);

function reaches(card: Card, from: number, to: number): boolean {
  const distance = Math.abs(from - to);
  if (card.id === 'kajifen' || card.id === 'kajisuper' || card.tags?.includes('hit_all')) return true;
  if (card.id === 'ka' || card.id === 'ji') return distance <= 1;
  if (card.type === 'ULTIMATE') return distance <= (card.tags?.includes('combo') ? 3 : 2);
  if (card.tags?.includes('hit_up')) return to > from;
  if (card.tags?.includes('hit_down')) return to < from;
  return distance === 0;
}

/** Public-state probabilities; never inspect a selected or precommitted card. */
export function expeditionMoveWeights(
  enemy: Player,
  players: Player[],
  personality: ExpeditionPersonality,
  _playerId: string,
  options: ExpeditionAIOptions = {},
): ExpeditionMoveWeight[] {
  if (enemy.isDead) return [];
  const available = legalCards(enemy, players).sort((a, b) => a.id.localeCompare(b.id));
  if (!available.length) return [];
  const opponents = players.filter(player => player.id !== enemy.id && !player.isDead)
    .sort((a, b) => a.id.localeCompare(b.id));
  const endless = Number.isSafeInteger(enemy.endlessLevel) && enemy.endlessLevel! >= 0;
  const models = opponents.map(player => {
    const cards = legalCards(player, players), rates = historyRates(player, cards, options.history);
    return { player, cards, rates, snapshot: publicCombatant(player), forecasts: forecastCards(player, cards, rates, options.history) };
  });
  const average = (value: (model: typeof models[number]) => number) => models.length
    ? models.reduce((sum, model) => sum + value(model), 0) / models.length : 0;
  const chargeRate = average(model => model.rates.charge);
  const defendRate = average(model => model.rates.defend);
  const attackRate = average(model => model.rates.attack);
  // Zero energy is not safe when an opponent holds an absorbed free attack.
  const threatensHere = (model: typeof models[number], card: Card) => !endless
    || reaches(card, movedLayer(model.player, card), enemy.layer);
  const pressure = average(model => model.cards.some(card => isOffensiveCard(card) && threatensHere(model, card)) ? 1 : 0);
  const ultimatePressure = average(model => model.cards.some(card => card.type === 'ULTIMATE' && threatensHere(model, card)) ? 1 : 0);
  const smart = unit(personality.smart);
  const aggression = 0.1 + unit(personality.aggression);
  const defense = 0.1 + unit(personality.defense);
  const charging = 0.1 + unit(personality.charge);
  const needEnergy = enemy.energy < 1 ? 3 : enemy.energy < 2 ? 2 : enemy.energy < 3 ? 1.45 : enemy.energy < 5 ? 0.8 : 0.28;
  const canBreakGuard = available.some(card => card.type === 'ULTIMATE');
  const typeWeights: Record<CardType, number> = {
    CHARGE: charging * needEnergy * (1.7 - pressure * 0.9)
      * (1 + smart * defendRate * (canBreakGuard ? 0.3 : 1.8)),
    ATTACK: aggression * (1.6 - pressure * 0.55)
      * (1 + smart * chargeRate * 1.8) * (1 - smart * defendRate * 0.55),
    DEFEND: defense * (0.18 + pressure * (0.9 + smart * attackRate))
      * (1 - ultimatePressure * smart * 0.4),
    ULTIMATE: aggression * (0.7 + smart * defendRate * 2.2 + pressure * 0.25),
    ABSORB: (0.28 + smart * 1.2) * (0.7 + chargeRate * 1.1) * (1 - ultimatePressure * 0.45),
    SPECIAL: 0.16 + pressure * (0.2 + smart * 0.35),
  };
  const nearestDistance = (layer: number) => Math.min(...opponents.map(player => Math.abs(layer - player.layer)));
  const currentDistance = nearestDistance(enemy.layer);
  const reachesOpponent = (card: Card) => opponents.some(player => reaches(card, movedLayer(enemy, card), player.layer));
  const canHitNow = available.some(card => isOffensiveCard(card) && reachesOpponent(card));
  const isPermanentMove = (card: Card) => card.tags?.some(tag => tag === 'layer_up' || tag === 'layer_down');
  if (endless && opponents.length) {
    // A miss penalty inside a category cancels when every card in that category
    // misses. Penalize the category too, while retaining the exploration floor.
    for (const type of ['ATTACK', 'ULTIMATE'] as const) {
      if (!available.some(card => card.type === type && reachesOpponent(card))) typeWeights[type] *= .04;
    }
    if (pressure === 0) typeWeights.DEFEND *= .25;
    if (currentDistance > 0) typeWeights.ABSORB *= .04;
    const canApproach = available.some(card => isPermanentMove(card) && nearestDistance(movedLayer(enemy, card)) < currentDistance);
    if (currentDistance > 0 && !canApproach) typeWeights.SPECIAL *= .04;
    if (!canHitNow) {
      // Save for an owned universal attack, or close the distance using a real
      // movement card. No free Energy, teleports or knowledge of locked moves.
      typeWeights.CHARGE *= 2.5;
      if (canApproach) typeWeights.SPECIAL *= 1.6;
    }
  }

  // Repeating our own move remains possible, but does not become a permanent loop.
  const ownHistory = recentMoves(enemy, options.history);
  if (ownHistory.length >= 3 && ownHistory.every(card => card.type === ownHistory[0].type)) {
    typeWeights[ownHistory[0].type] *= 0.7;
  }

  const weighted = available.map(card => {
    const cost = costOf(enemy, card);
    let weight = (1 + card.tier * 0.2 + Math.min(23, getEffectiveLevel(card)) * 0.055) / (1 + cost * 0.3);
    if (isOffensiveCard(card)) {
      const reachable = opponents.filter(player => reaches(card, movedLayer(enemy, card), player.layer)).length;
      weight *= opponents.length ? 0.06 + 0.94 * reachable / opponents.length : 1;
      // Save the expensive universal ultimates when a cheaper move can do the job.
      if (cost >= 5 && enemy.energy < cost + 2) weight *= 0.65;
    } else if (card.type === 'DEFEND') {
      const avoided = average(model => {
        const threats = model.cards.filter(move => isOffensiveCard(move) && threatensHere(model, move));
        if (!threats.length) return 0;
        return threats.filter(move => !reaches(move, model.player.layer, movedLayer(enemy, card))
          || (!model.player.pierce && (card.tags?.includes('dodge_ult')
            || (move.type === 'ATTACK' && !['gun', 'machete', 'wave'].includes(move.id))))).length / threats.length;
      });
      weight *= 0.6 + avoided * (0.5 + smart);
    } else if (card.id === 'shatter') {
      weight *= 0.7 + ultimatePressure;
    }
    if (endless && opponents.length && currentDistance > 0) {
      if (card.id === 'shatter') weight *= .04;
      if (isPermanentMove(card)) {
        const nextDistance = nearestDistance(movedLayer(enemy, card));
        if (nextDistance > currentDistance && pressure === 0) weight *= .025;
        else if (nextDistance < currentDistance && !canHitNow) weight *= 4;
      }
    }
    // Score a few public hypotheses through the real combat rules. This handles
    // level suppression, paid ties and dodges without a second combat engine.
    const quality = smart > 0 ? average(model => model.forecasts.reduce((sum, forecast) => {
      const self = publicCombatant(enemy);
      self.selectedCardId = card.id;
      const other = { ...model.snapshot, selectedCardId: forecast.card.id };
      const result = calculateTurnOutcome([self, other], 1, 1, 'en', { mode: 'expedition' });
      const after = result.players.find(player => player.id === self.id)!;
      const target = result.players.find(player => player.id === other.id)!;
      const utility = (enemy.hp - after.hp) * -3 + (model.player.hp - Math.max(0, target.hp)) * 2.1
        + (Math.min(6, after.energy) - Math.min(6, enemy.energy)) * .32;
      return sum + forecast.probability * utility;
    }, 0)) : 0;
    weight *= Math.exp(Math.max(-3, Math.min(3, quality)) * smart * 1.1);
    return { cardId: card.id, type: card.type, typeWeight: Math.max(0.04, typeWeights[card.type]), cardWeight: Math.max(0.01, weight), quality, probability: 0 };
  });
  const groups = new Map<CardType, { typeWeight: number; total: number; quality: number }>();
  for (const entry of weighted) {
    const group = groups.get(entry.type) ?? { typeWeight: entry.typeWeight, total: 0, quality: -Infinity };
    group.total += entry.cardWeight;
    group.quality = Math.max(group.quality, entry.quality);
    groups.set(entry.type, group);
  }
  // A better available counter matters; merely owning more cards does not.
  for (const group of groups.values()) group.typeWeight *= Math.exp(Math.max(-3, Math.min(3, group.quality)) * smart * 1.4);
  const typeTotal = [...groups.values()].reduce((sum, group) => sum + group.typeWeight, 0);
  // Even a confident forecast leaves a genuine chance to change plans.
  const exploration = smart * .12;
  for (const group of groups.values()) group.typeWeight = (1 - exploration) * group.typeWeight / typeTotal + exploration / groups.size;
  return weighted.map(entry => ({ cardId: entry.cardId, type: entry.type, cardWeight: entry.cardWeight,
    typeWeight: groups.get(entry.type)!.typeWeight,
    probability: groups.get(entry.type)!.typeWeight * entry.cardWeight / groups.get(entry.type)!.total }));
}

function weightedPick<T>(entries: { value: T; weight: number }[], random: () => number): T {
  let cursor = Math.min(1 - Number.EPSILON, unit(random())) * entries.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

export function expeditionBotMove(
  enemy: Player,
  players: Player[],
  personality: ExpeditionPersonality,
  playerId: string,
  options: ExpeditionAIOptions = {},
): string {
  const weights = expeditionMoveWeights(enemy, players, personality, playerId, options);
  // Preserve the existing emergency fallback if every known card is sealed.
  if (!weights.length) return 'charge';
  const random = options.random ?? Math.random;
  const types = [...new Map(weights.map(entry => [entry.type, { value: entry.type, weight: entry.typeWeight }])).values()];
  const chosenType = weightedPick(types, random);
  return weightedPick(weights.filter(entry => entry.type === chosenType).map(entry => ({ value: entry.cardId, weight: entry.cardWeight })), random);
}
