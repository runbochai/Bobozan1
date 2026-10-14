import { FINAL_LEVEL, LAST_SKILL_LEVEL } from '../data/constants';
import type { GameState, MultiplayerMode, Player } from '../types';

/** A missing mode belongs to a room created before survival mode existed. */
export const getMultiplayerMode = (game: Pick<GameState, 'multiplayerMode'>): MultiplayerMode =>
  game.multiplayerMode === 'survival' ? 'survival' : 'kills';

export interface MultiplayerMatchSummary {
  mode: MultiplayerMode;
  matchNumber: number;
  totalMatches: number;
  remainingMatches: number;
  lastSkillLevel: number;
  isFinalBattle: boolean;
  isSeriesOver: boolean;
  roundWinner: Player | null;
  champions: Player[];
  leaders: Player[];
  standings: Player[];
}

/** Each ruleset chooses its own winner; kill totals never override a survival result. */
export const getMultiplayerMatchSummary = (
  game: Pick<GameState, 'status' | 'matchCount' | 'players' | 'multiplayerMode'>,
): MultiplayerMatchSummary => {
  const mode = getMultiplayerMode(game);
  const standings = [...game.players].sort((a, b) =>
    (mode === 'survival' ? Number(a.isDead) - Number(b.isDead) : 0) || (b.kills ?? 0) - (a.kills ?? 0));
  const highestKills = standings[0]?.kills ?? 0;
  const isRoundOver = game.status === 'GAMEOVER';
  const isFinalBattle = game.matchCount >= FINAL_LEVEL;
  const isSeriesOver = isRoundOver && isFinalBattle;
  const living = game.players.filter(player => !player.isDead);
  const roundWinner = isRoundOver && living.length === 1 ? living[0] : null;
  const leaders = mode === 'survival' ? living : standings.filter(player => (player.kills ?? 0) === highestKills);
  const totalMatches = FINAL_LEVEL;
  const matchNumber = Math.min(game.matchCount, FINAL_LEVEL);

  return {
    mode,
    matchNumber,
    totalMatches,
    remainingMatches: Math.max(0, totalMatches - matchNumber),
    lastSkillLevel: LAST_SKILL_LEVEL,
    isFinalBattle,
    isSeriesOver,
    roundWinner,
    champions: isSeriesOver ? (mode === 'survival' ? (roundWinner ? [roundWinner] : []) : [...leaders]) : [],
    leaders,
    standings,
  };
};
