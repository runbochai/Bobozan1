import type { GameState, Lang, LocalizedText, LogEntry, Player } from '../types';
import { ACADEMY_LESSONS, MULTIPLAYER_ACADEMY_LESSONS, type AcademyFighter, type AcademyLesson, type MultiplayerAcademyLesson } from '../data/academy';
import { calculateTurnOutcome, getPlayerCards, isOffensiveCard } from './combat';
import { getMultiplayerMatchSummary, type MultiplayerMatchSummary } from './multiplayerMatch';
import { FINAL_LEVEL } from '../data/constants';

export const PRACTICE_HERO_ID = 'academy-hero';
export const PRACTICE_ENEMY_ID = 'academy-enemy';
export const ACADEMY_STORAGE_KEY = 'bobozan.academy.completed.v1';

export interface PracticeResult {
  players: Player[];
  passed: boolean;
  logs: LogEntry[];
  heroHpDelta: number;
  heroEnergyDelta: number;
  explanation: LocalizedText;
}

export interface AcademyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function practiceRound(lesson: AcademyLesson, index: number) {
  if (!Number.isInteger(index) || index < 0 || !lesson.rounds[index]) {
    throw new Error('Unknown practice round');
  }
  return lesson.rounds[index];
}

function makePlayer(id: string, preset: AcademyFighter, lang: Lang): Player {
  const isBot = id === PRACTICE_ENEMY_ID;
  return {
    id,
    name: isBot ? (lang === 'zh' ? '练习机器人' : 'Practice Bot') : (lang === 'zh' ? '你' : 'You'),
    isBot,
    hp: preset.hp,
    energy: preset.energy,
    inventory: [...preset.inventory],
    layer: preset.layer ?? 0,
    tempLayerMod: 0,
    isDead: false,
    selectedCardId: null,
    lastCardId: null,
    lastAction: null,
    disabledSkills: [],
    freeSkills: [],
    tempSkills: [],
    kills: 0,
  };
}

function assertLegalMove(player: Player, players: Player[], move: string) {
  const card = getPlayerCards(player, players).find(candidate => candidate.id === move);
  if (!card || player.disabledSkills?.includes(move)) throw new Error('Unavailable practice card');
  if (player.energy < card.cost) throw new Error('Insufficient practice energy');
  return card;
}

/** Omitting move returns a preview with no selected cards, including the concealed opponent. */
export function getPracticePlayers(lesson: AcademyLesson, roundIndex: number, move?: string, lang: Lang = 'zh'): Player[] {
  const round = practiceRound(lesson, roundIndex);
  const players = [makePlayer(PRACTICE_HERO_ID, round.hero, lang), makePlayer(PRACTICE_ENEMY_ID, round.enemy, lang)];
  if (move !== undefined) {
    if (!round.choices.includes(move)) throw new Error('Card is not offered in this exercise');
    assertLegalMove(players[0], players, move);
    assertLegalMove(players[1], players, round.enemyMove);
    players[0].selectedCardId = move;
    players[1].selectedCardId = round.enemyMove;
  }
  return players;
}

export function resolvePracticeRound(lesson: AcademyLesson, roundIndex: number, move: string, lang: Lang = 'zh'): PracticeResult {
  const round = practiceRound(lesson, roundIndex);
  const before = getPracticePlayers(lesson, roundIndex, move, lang);
  const heroCard = assertLegalMove(before[0], before, move);
  const enemyCard = assertLegalMove(before[1], before, round.enemyMove);
  const outcome = calculateTurnOutcome(before, roundIndex + 1, 1, lang, { mode: 'practice' });
  // Keep a stable hero-first order for the standalone board; the engine sorts by ID.
  const hero = outcome.players.find(player => player.id === PRACTICE_HERO_ID)!;
  const enemy = outcome.players.find(player => player.id === PRACTICE_ENEMY_ID)!;
  const heroHpDelta = hero.hp - before[0].hp;
  const heroEnergyDelta = hero.energy - before[0].energy;
  const enemyHpDelta = enemy.hp - before[1].hp;
  const enemyEnergyDelta = enemy.energy - before[1].energy;
  const safe = !hero.isDead && heroHpDelta === 0;
  // A miss from outside the opponent's range is not a clash. Let the same engine
  // check that each attack could actually hit the other side if it were charging.
  const canHitCharging = (targetId: string) => calculateTurnOutcome(
    before.map(player => player.id === targetId ? { ...player, selectedCardId: 'charge' } : player),
    roundIndex + 1, 1, lang, { mode: 'practice' },
  ).damageTaken[targetId] > 0;
  const attacksTied = safe && !enemy.isDead && enemyHpDelta === 0
    && isOffensiveCard(heroCard) && isOffensiveCard(enemyCard)
    && canHitCharging(PRACTICE_HERO_ID) && canHitCharging(PRACTICE_ENEMY_ID);
  let passed = false;

  switch (round.goal) {
    case 'gain-energy':
      passed = safe && heroEnergyDelta >= 2;
      break;
    case 'block':
      passed = safe && heroEnergyDelta === 0 && heroCard.type === 'DEFEND' && outcome.defendedHits[PRACTICE_HERO_ID] > 0;
      break;
    case 'hit':
      passed = !hero.isDead && enemy.hp < before[1].hp;
      break;
    case 'tie':
      passed = attacksTied;
      break;
    case 'survive':
      passed = !hero.isDead;
      break;
  }

  const text = (zh: string, en: string): LocalizedText => ({ zh, en });
  const describeOutcome = (): LocalizedText => {
    if (heroHpDelta < 0) {
      const damage = enemyHpDelta < 0
        ? text(`双方都被命中：你损失 ${-heroHpDelta} 生命，对手损失 ${-enemyHpDelta} 生命。`, `Both were hit: you lost ${-heroHpDelta} HP and the opponent lost ${-enemyHpDelta} HP.`)
        : text(`你被命中，损失 ${-heroHpDelta} 生命。`, `You were hit and lost ${-heroHpDelta} HP.`);
      return heroCard.type === 'CHARGE' && heroEnergyDelta <= 0
        ? text(`${damage.zh}这次也没有攒到能量。`, `${damage.en} Your Charge also gained no energy.`)
        : damage;
    }
    if (enemyHpDelta < 0) return text(`你命中了对手，对手损失 ${-enemyHpDelta} 生命。`, `Your hit made the opponent lose ${-enemyHpDelta} HP.`);
    if (attacksTied) return text(
      `双方攻击互相抵消：你花 ${-heroEnergyDelta}、对手花 ${-enemyEnergyDelta} 能量，都没有掉血。`,
      `The attacks canceled each other: you spent ${-heroEnergyDelta} energy and the opponent spent ${-enemyEnergyDelta}; neither lost HP.`,
    );
    if (outcome.defendedHits[PRACTICE_HERO_ID] > 0) return text(
      '你挡住了攻击，没有掉血，也没有消耗能量。',
      'You blocked the attack without losing HP or spending energy.',
    );
    if (outcome.defendedHits[PRACTICE_ENEMY_ID] > 0) return text(
      `你的${heroCard.name.zh}被防住，花了 ${-heroEnergyDelta} 能量但没有命中。`,
      `Your ${heroCard.name.en} was blocked: you spent ${-heroEnergyDelta} energy without landing a hit.`,
    );
    if (heroEnergyDelta > 0 && enemyEnergyDelta > 0) return text(
      `双方都攒到了能量：你 +${heroEnergyDelta}、对手 +${enemyEnergyDelta}，没有造成伤害。`,
      `Both gained energy: you +${heroEnergyDelta}, opponent +${enemyEnergyDelta}; neither dealt damage.`,
    );
    if (heroEnergyDelta > 0) return text(`你获得 ${heroEnergyDelta} 能量，但没有命中对手。`, `You gained ${heroEnergyDelta} energy without hitting the opponent.`);
    if (heroCard.type === 'DEFEND' && enemyEnergyDelta > 0) return text(
      `对手攒到了 ${enemyEnergyDelta} 能量；你这次没有挡到攻击，也没有获得能量。`,
      `The opponent gained ${enemyEnergyDelta} energy; there was no attack for you to block, and you gained no energy.`,
    );
    return text('这次没有攻击命中，双方都没有掉血。', 'No attack landed this time; neither player lost HP.');
  };
  const summary = describeOutcome();
  const goalReminder = {
    'gain-energy': text('本题要安全获得 2 能量。', 'The goal is to safely gain 2 energy.'),
    block: text('本题要挡住攻击并保留能量。', 'The goal is to block an attack and keep your energy.'),
    hit: text('本题要命中对手。', 'The goal is to land a hit.'),
    tie: text('本题要让双方攻击打平。', 'The goal is to tie an attack with your own attack.'),
    survive: text('本题要保持存活。', 'The goal is to survive.'),
  }[round.goal];

  return {
    players: [hero, enemy],
    passed,
    logs: outcome.logs,
    heroHpDelta,
    heroEnergyDelta,
    explanation: {
      zh: `${summary.zh}${passed ? '达成目标。' : `${goalReminder.zh}可以重试。`} ${round.explanation.zh}`,
      en: `${summary.en} ${passed ? 'Goal reached.' : `${goalReminder.en} You can retry.`} ${round.explanation.en}`,
    },
  };
}

export interface MultiplayerPracticeState {
  game: Pick<GameState, 'status' | 'matchCount' | 'players' | 'turn'>;
  beforePlayers: Player[];
  summary: MultiplayerMatchSummary;
  survivorReset: boolean;
  correctChoice: string;
  explanation: LocalizedText;
}

/** Fixed local examples settled by the same engine and ranking helper as an online room. */
export function getMultiplayerPractice(id: MultiplayerAcademyLesson['id'], lang: Lang = 'zh'): MultiplayerPracticeState {
  const player = (playerId: string, name: LocalizedText, patch: Partial<Player> = {}): Player => ({
    ...makePlayer(playerId, { hp: 1, energy: 0, inventory: [0] }, lang),
    name: name[lang], isBot: true, ...patch,
  });
  const names = {
    you: { zh: '你', en: 'You' },
    blue: { zh: '蓝衣玩家', en: 'Player in blue' },
    red: { zh: '红衣玩家', en: 'Player in red' },
  };
  let beforePlayers: Player[];
  let matchCount = 1;
  switch (id) {
    case 'turn-and-match':
      beforePlayers = [
        player(PRACTICE_HERO_ID, names.you, { selectedCardId: 'charge' }),
        player(PRACTICE_ENEMY_ID, names.blue, { selectedCardId: 'charge' }),
      ];
      break;
    case 'winner-and-leader':
    case 'final-standings':
      matchCount = id === 'final-standings' ? FINAL_LEVEL : 7;
      beforePlayers = [
        player(PRACTICE_HERO_ID, names.you, { energy: 1, kills: id === 'final-standings' ? 4 : 1, selectedCardId: 'hong' }),
        player(PRACTICE_ENEMY_ID, names.blue, { kills: id === 'final-standings' ? 5 : 4, selectedCardId: 'charge' }),
      ];
      break;
    case 'elimination-reset':
      matchCount = 3;
      beforePlayers = [
        player(PRACTICE_HERO_ID, names.you, {
          hp: 0.5, energy: 4, inventory: [0, 1], selectedCardId: 'defend',
          disabledSkills: ['pegasus'], freeSkills: ['hong2'],
        }),
        player(PRACTICE_ENEMY_ID, names.blue, { selectedCardId: 'charge' }),
        player('academy-third', names.red, { hp: 0.5, energy: 1, inventory: [0, 2], selectedCardId: 'hong' }),
      ];
      break;
  }
  const outcome = calculateTurnOutcome(beforePlayers, 1, matchCount, lang);
  const game: MultiplayerPracticeState['game'] = {
    status: outcome.isGameOver ? 'GAMEOVER' : 'PLAYING', matchCount, players: outcome.players, turn: 1,
  };
  const summary = getMultiplayerMatchSummary(game);
  let correctChoice: string;
  let explanation: LocalizedText;
  switch (id) {
    case 'turn-and-match':
      correctChoice = !outcome.isGameOver ? 'next-turn' : 'next-match';
      explanation = {
        zh: '两人都还活着，这一局就继续。一次出牌叫一回合；能量和出牌历史会带到下一回合，不会因为出过一次牌就清零。',
        en: 'Both players are alive, so this match continues. One card choice is a turn; energy and move history carry into the next turn rather than resetting after each choice.',
      };
      break;
    case 'winner-and-leader':
      correctChoice = summary.roundWinner?.id === PRACTICE_HERO_ID ? 'survivor-reward' : 'leader-reward';
      explanation = {
        zh: `你是第 ${summary.matchNumber} 局的最后幸存者，获得本局新技能。击杀榜领先不等于赢下这一局；本局胜利也不等于总冠军。还剩 ${summary.remainingMatches} 局，由房主开始下一局，累计击杀继续记录。`,
        en: `You are the last survivor of match ${summary.matchNumber} and earn its skill. Leading total kills does not win a match, and winning a match does not yet win the series. ${summary.remainingMatches} matches remain; the host starts the next one and cumulative kills carry on.`,
      };
      break;
    case 'final-standings':
      correctChoice = summary.isSeriesOver && summary.champions.length > 1 ? 'joint-champions' : 'survivor-champion';
      explanation = {
        zh: `${summary.totalMatches} 局赛程结束。你赢下最后一局，但双方累计都是 ${summary.champions[0]?.kills ?? 0} 次击杀，因此并列总冠军。此处直接公布总成绩，没有下一局，也不再发升级奖励。`,
        en: `The ${summary.totalMatches}-match series is complete. You won the last match, but both players finished with ${summary.champions[0]?.kills ?? 0} kills and are joint champions. Show the final result now, with no further match or skill reward.`,
      };
      break;
    case 'elimination-reset':
      correctChoice = outcome.survivorReset && !outcome.isGameOver ? 'survivors-continue' : 'everyone-respawns';
      explanation = {
        zh: '还有两人存活，所以这一局没结束。幸存者恢复到 1 生命、能量和层数归零，封印及吸收的免费牌清除；你已获得的 Lv.1 技能仍保留。淘汰者暂时观战，下一局才恢复生命、能量归零重新加入，技能和累计击杀保留。',
        en: 'Two players remain, so this match is still running. Survivors reset to 1 HP, zero energy and layer 0, and clear disables and absorbed free cards; your earned Lv.1 skill stays. The eliminated player watches until the next match, then returns with restored HP and zero energy, keeping skills and total kills.',
      };
      break;
  }
  return { game, beforePlayers, summary, survivorReset: outcome.survivorReset, correctChoice, explanation };
}

export function resolveMultiplayerPractice(id: MultiplayerAcademyLesson['id'], choice: string, lang: Lang = 'zh') {
  const lesson = MULTIPLAYER_ACADEMY_LESSONS.find(item => item.id === id);
  if (!lesson?.choices.some(item => item.id === choice)) throw new Error('Unknown multiplayer practice choice');
  const practice = getMultiplayerPractice(id, lang);
  return { passed: choice === practice.correctChoice, explanation: practice.explanation };
}

function browserStorage(): AcademyStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function validCompletedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(ACADEMY_LESSONS.map(lesson => lesson.id));
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && known.has(id)))];
}

/** Pass null to disable persistence; no browser globals are read while importing this module. */
export function readCompletedAcademyLessons(storage?: AcademyStorage | null): string[] {
  try {
    const raw = (storage === undefined ? browserStorage() : storage)?.getItem(ACADEMY_STORAGE_KEY);
    if (!raw) return [];
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 1 || !('completedLessonIds' in saved)) return [];
    return validCompletedIds(saved.completedLessonIds);
  } catch {
    return [];
  }
}

export function writeCompletedAcademyLessons(ids: readonly string[], storage?: AcademyStorage | null): void {
  try {
    (storage === undefined ? browserStorage() : storage)?.setItem(ACADEMY_STORAGE_KEY, JSON.stringify({
      version: 1,
      completedLessonIds: validCompletedIds(ids),
    }));
  } catch {
    // Practice remains usable in private browsing, full storage, and non-browser tests.
  }
}
