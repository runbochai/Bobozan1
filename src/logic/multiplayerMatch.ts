import { FINAL_LEVEL } from '../data/constants';
import type { GameState, Player } from '../types';

export interface MultiplayerMatchSummary {
  matchNumber: number;
  totalMatches: number;
  remainingMatches: number;
  isSeriesOver: boolean;
  roundWinner: Player | null;
  champions: Player[];
  leaders: Player[];
  standings: Player[];
}

/** Round survival and the series' cumulative kill ranking are separate results. */
export const getMultiplayerMatchSummary = (
  game: Pick<GameState, 'status' | 'matchCount' | 'players'>,
): MultiplayerMatchSummary => {
  const standings = [...game.players].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0));
  const highestKills = standings[0]?.kills ?? 0;
  const leaders = standings.filter(player => (player.kills ?? 0) === highestKills);
  const isRoundOver = game.status === 'GAMEOVER';
  const isSeriesOver = isRoundOver && game.matchCount >= FINAL_LEVEL;
  const living = game.players.filter(player => !player.isDead);

  return {
    matchNumber: game.matchCount,
    totalMatches: FINAL_LEVEL,
    remainingMatches: Math.max(0, FINAL_LEVEL - game.matchCount),
    isSeriesOver,
    roundWinner: isRoundOver && living.length === 1 ? living[0] : null,
    champions: isSeriesOver ? [...leaders] : [],
    leaders,
    standings,
  };
};
