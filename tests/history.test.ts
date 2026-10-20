import { describe, expect, it } from 'vitest';
import { formatDate, roundsLabel, toHistoryItems } from '../src/game/history';
import type { CompletedGame } from '../src/storage/resultsRepository';

// Local-time dates so the expected DD.MM.YYYY does not depend on the test machine's time zone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 30).toISOString();

describe('history', () => {
  it('formats dates as DD.MM.YYYY with zero padding and no time', () => {
    expect(formatDate(at(2025, 4, 5))).toBe('05.04.2025');
    expect(formatDate(at(2025, 12, 31, 23))).toBe('31.12.2025');
    expect(formatDate(at(2026, 1, 1, 0))).toBe('01.01.2026');
  });

  it('labels rounds in Hebrew', () => {
    expect(roundsLabel(0)).toBe('0 שלבים');
    expect(roundsLabel(1)).toBe('שלב אחד');
    expect(roundsLabel(6)).toBe('6 שלבים');
    expect(roundsLabel(10)).toBe('10 שלבים');
  });

  it('lists the newest game first without changing the stored order', () => {
    const games: CompletedGame[] = [
      { date: at(2025, 4, 5), completedRounds: 6, result: 'loss' },
      { date: at(2025, 4, 8), completedRounds: 5, result: 'loss' },
      { date: at(2025, 4, 10), completedRounds: 10, result: 'win' },
    ];
    const copy = structuredClone(games);
    expect(toHistoryItems(games)).toEqual([
      { date: '10.04.2025', roundsText: '10 שלבים', resultText: 'ניצחון' },
      { date: '08.04.2025', roundsText: '5 שלבים', resultText: 'הפסד' },
      { date: '05.04.2025', roundsText: '6 שלבים', resultText: 'הפסד' },
    ]);
    expect(games).toEqual(copy);
  });

  it('keeps insertion order for games on the same day', () => {
    const games: CompletedGame[] = [
      { date: at(2025, 4, 5, 9), completedRounds: 1, result: 'loss' },
      { date: at(2025, 4, 5, 9), completedRounds: 2, result: 'loss' },
    ];
    expect(toHistoryItems(games).map((item) => item.roundsText)).toEqual(['2 שלבים', 'שלב אחד']);
  });

  it('returns an empty list for an empty history', () => {
    expect(toHistoryItems([])).toEqual([]);
  });
});
