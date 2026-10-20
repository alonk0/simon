import type { CompletedGame } from '../storage/resultsRepository';

export type HistoryItem = {
  date: string;
  roundsText: string;
  resultText: 'ניצחון' | 'הפסד';
};

// DD.MM.YYYY in the device's local time zone; never shows the time of day.
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function roundsLabel(rounds: number): string {
  return rounds === 1 ? 'שלב אחד' : `${rounds} שלבים`;
}

// Games are stored in insertion order, so newest-first is simply the reverse.
export function toHistoryItems(games: readonly CompletedGame[]): HistoryItem[] {
  return [...games].reverse().map((game) => ({
    date: formatDate(game.date),
    roundsText: roundsLabel(game.completedRounds),
    resultText: game.result === 'win' ? 'ניצחון' : 'הפסד',
  }));
}
