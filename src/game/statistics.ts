import type { CompletedGame } from '../storage/resultsRepository';

export type Statistics = {
  personalBest: number;
  totalGames: number;
  wins: number;
  // null when there are no games, so the UI can show "no data" instead of dividing by zero.
  winRate: number | null;
};

export function computeStatistics(games: readonly CompletedGame[]): Statistics {
  const totalGames = games.length;
  const wins = games.filter((game) => game.result === 'win').length;
  return {
    personalBest: games.reduce((best, game) => Math.max(best, game.completedRounds), 0),
    totalGames,
    wins,
    winRate: totalGames === 0 ? null : Math.round((wins / totalGames) * 100),
  };
}
