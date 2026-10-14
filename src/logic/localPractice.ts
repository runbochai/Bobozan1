import type { Card, Lang, LogEntry, Player } from '../types';
import { MAX_HP } from '../data/constants';
import { getBotMove } from './botAI';
import { calculateTurnOutcome, getPlayerCards, isOffensiveCard, type TurnOutcome } from './combat';
import { SKILL_CATALOG_VERSION } from './skillLoadout';

export const LOCAL_HERO_ID = 'local-hero';
export const LOCAL_BOT_ID = 'local-bot';

export interface LocalPracticeRound {
  turn: number;
  before: Player[];
  moves: Record<string, string>;
  logs: LogEntry[];
  explanation: string;
}

export interface LocalPracticeState {
  players: Player[];
  turn: number;
  /** Locked from the previous public state, before the human chooses. Never render this while choosing. */
  committedBotMove: string | null;
  isGameOver: boolean;
  winnerId: string | null;
  lastRound: LocalPracticeRound | null;
}

function copyPlayers(players: Player[]): Player[] {
  return players.map(player => ({
    ...player,
    inventory: [...player.inventory],
    ...(player.skillLoadout ? { skillLoadout: [...player.skillLoadout] } : {}),
    disabledSkills: [...(player.disabledSkills ?? [])],
    freeSkills: [...(player.freeSkills ?? [])],
    tempSkills: [...(player.tempSkills ?? [])],
    selectedCardId: null,
  }));
}

export function getLocalPracticeCards(players: Player[], playerId = LOCAL_HERO_ID): Card[] {
  const player = players.find(candidate => candidate.id === playerId);
  return player && !player.isDead ? getPlayerCards(player, players) : [];
}

export function getLocalPracticeLegalCards(players: Player[], playerId = LOCAL_HERO_ID): Card[] {
  const player = players.find(candidate => candidate.id === playerId);
  if (!player || player.isDead) return [];
  return getLocalPracticeCards(players, playerId).filter(card =>
    !player.disabledSkills?.includes(card.id) && (card.cost <= player.energy || player.freeSkills?.includes(card.id)),
  );
}

/** Decide only from public, unselected state. The decision is stable for this turn. */
export function commitLocalPracticeBot(players: Player[], turn: number): string {
  const bot = players.find(player => player.id === LOCAL_BOT_ID);
  if (!bot || bot.isDead) throw new Error('Practice bot is unavailable');
  // The shared AI explicitly copies public fields without reading selectedCardId.
  const move = getBotMove(bot, players, { turn, matchCount: 1 });
  if (!getLocalPracticeLegalCards(players, LOCAL_BOT_ID).some(card => card.id === move)) {
    throw new Error('Practice bot selected an unavailable card');
  }
  return move;
}

export function createLocalPractice(lang: Lang = 'zh', avatar?: string): LocalPracticeState {
  const players: Player[] = [LOCAL_HERO_ID, LOCAL_BOT_ID].map(id => ({
    id,
    name: id === LOCAL_HERO_ID ? (lang === 'zh' ? '你' : 'You') : (lang === 'zh' ? '练习机器人' : 'Practice bot'),
    ...(id === LOCAL_HERO_ID && avatar ? { avatar } : {}),
    isBot: id === LOCAL_BOT_ID,
    hp: MAX_HP,
    energy: 0,
    isDead: false,
    inventory: [0],
    skillCatalogVersion: SKILL_CATALOG_VERSION,
    layer: 0,
    tempLayerMod: 0,
    selectedCardId: null,
    lastCardId: null,
    lastAction: null,
    disabledSkills: [],
    freeSkills: [],
    tempSkills: [],
    kills: 0,
  }));
  return {
    players, turn: 1, committedBotMove: commitLocalPracticeBot(players, 1),
    isGameOver: false, winnerId: null, lastRound: null,
  };
}

function explainTurn(before: Player[], outcome: TurnOutcome, moves: Record<string, string>, lang: Lang): string {
  const heroBefore = before.find(player => player.id === LOCAL_HERO_ID)!;
  const botBefore = before.find(player => player.id === LOCAL_BOT_ID)!;
  const hero = outcome.players.find(player => player.id === LOCAL_HERO_ID)!;
  const bot = outcome.players.find(player => player.id === LOCAL_BOT_ID)!;
  const heroCard = getPlayerCards(heroBefore, before).find(card => card.id === moves[LOCAL_HERO_ID])!;
  const botCard = getPlayerCards(botBefore, before).find(card => card.id === moves[LOCAL_BOT_ID])!;
  const say = (zh: string, en: string) => lang === 'zh' ? zh : en;
  if (outcome.damageTaken[LOCAL_HERO_ID] > 0) {
    return heroCard.type === 'CHARGE'
      ? say('你攒时被命中，攒被打断，未获得能量。联机也是 1 生命，命中即可淘汰。', 'You were hit while charging, so Charge gained no energy. Multiplayer also starts at 1 HP: a hit eliminates you.')
      : say(`对手的${botCard.name.zh}命中了你；能量消耗不等于伤害。可查看双方出牌和结算记录。`, `The opponent’s ${botCard.name.en} hit you. Energy cost is not damage; compare the revealed cards and combat log.`);
  }
  if (outcome.damageTaken[LOCAL_BOT_ID] > 0) {
    return botCard.type === 'CHARGE'
      ? say('你命中了正在攒的对手：对手未获得能量并被淘汰。猜中攒的时机很关键。', 'You hit the opponent while they charged: they gained no energy and were eliminated. Predicting Charge matters.')
      : say(`你的${heroCard.name.zh}命中对手。双方先支付能量，再同时结算效果。`, `Your ${heroCard.name.en} hit the opponent. Both players pay energy before their moves resolve together.`);
  }
  if (outcome.defendedHits[LOCAL_HERO_ID] > 0) {
    return say('你挡住了攻击，未掉血。普通防不耗能量，但挡不住咔等终极牌。', 'You blocked the attack without losing HP. Basic Defend is free, but ultimates such as Ka break it.');
  }
  if (outcome.defendedHits[LOCAL_BOT_ID] > 0) {
    return say('你的攻击被防住，能量仍会消耗。可以先攒能量，或用咔破普通防。', 'The opponent blocked your attack; its energy was still spent. Save energy or use Ka to break basic Defend.');
  }
  if (isOffensiveCard(heroCard) && isOffensiveCard(botCard)) {
    return say('双方攻击相抵，均未掉血；打出的牌仍消耗能量。比较牌的强度，不能只看费用。', 'The attacks canceled each other; neither lost HP, and both still spent energy. Compare card strength, not just cost.');
  }
  const gained = hero.energy - heroBefore.energy;
  const botGained = bot.energy - botBefore.energy;
  if (gained > 0 && botGained > 0) return say('双方都安全攒到 2 能量。下一回合要根据对手的能量猜出牌。', 'Both safely gained 2 energy. Use the opponent’s visible energy to predict their next move.');
  if (gained > 0) return say('你安全攒到 2 能量。攒能推进进攻，但被命中会中断。', 'You safely gained 2 energy. Charge prepares an attack, but a hit interrupts it.');
  if (botGained > 0) return say('你防守时，对手攒到了 2 能量。防不会自动获得能量。', 'While you defended, the opponent gained 2 energy. Defending does not generate energy.');
  return say('本回合没有攻击命中。能量和上回合出牌都是双方可见的信息。', 'No attack landed. Energy and the previous turn’s cards are public information.');
}

/** A whole multiplayer duel turn, with no campaign presets or altered combat options. */
export function resolveLocalPracticeTurn(state: LocalPracticeState, cardId: string, lang: Lang = 'zh'): LocalPracticeState {
  if (state.isGameOver || !state.committedBotMove) throw new Error('Practice duel has ended');
  if (!getLocalPracticeLegalCards(state.players).some(card => card.id === cardId)) throw new Error('Unavailable practice card');
  if (!getLocalPracticeLegalCards(state.players, LOCAL_BOT_ID).some(card => card.id === state.committedBotMove)) {
    throw new Error('Unavailable committed bot card');
  }
  const before = copyPlayers(state.players);
  const moves: Record<string, string> = { [LOCAL_HERO_ID]: cardId, [LOCAL_BOT_ID]: state.committedBotMove };
  const outcome = calculateTurnOutcome(before.map(player => ({ ...player, selectedCardId: moves[player.id] })), state.turn, 1, lang);
  const turn = state.turn + 1;
  return {
    players: outcome.players,
    turn,
    committedBotMove: outcome.isGameOver ? null : commitLocalPracticeBot(outcome.players, turn),
    isGameOver: outcome.isGameOver,
    winnerId: outcome.winner?.id ?? null,
    lastRound: { turn: state.turn, before, moves, logs: outcome.logs, explanation: explainTurn(before, outcome, moves, lang) },
  };
}
