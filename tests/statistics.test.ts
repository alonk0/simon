import { describe, expect, it } from 'vitest';
import { computeStatistics } from '../src/game/statistics';
import type { CompletedGame } from '../src/storage/resultsRepository';

const game = (completedRounds: number): CompletedGame => ({
  date: '2026-10-20T10:00:00.000Z',
  completedRounds,
  result: completedRounds === 10 ? 'win' : 'loss',
});

describe('statistics', () => {
  it('handles an empty history without dividing by zero', () => {
    expect(computeStatistics([])).toEqual({ personalBest: 0, totalGames: 0, wins: 0, winRate: null });
  });

  it('handles games with zero wins and a score of 0', () => {
    expect(computeStatistics([game(0), game(0)])).toEqual({ personalBest: 0, totalGames: 2, wins: 0, winRate: 0 });
  });

  it('takes the best score and rounds the win rate', () => {
    const games = [game(10), game(3), game(10), game(7), game(10), game(0), game(1), game(2)];
    expect(computeStatistics(games)).toEqual({ personalBest: 10, totalGames: 8, wins: 3, winRate: 38 });
  });
});
