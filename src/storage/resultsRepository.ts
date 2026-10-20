export type CompletedGame = {
  date: string;
  completedRounds: number;
  result: 'win' | 'loss';
};

export type SavedResults = {
  schemaVersion: 1;
  games: CompletedGame[];
};

export type LoadResult =
  | { status: 'ok'; games: CompletedGame[] }
  | { status: 'unavailable' }
  | { status: 'invalid' };

export type RecordResult = { saved: true; games: CompletedGame[] } | { saved: false; games: null };

export type ResultsRepository = {
  load(): LoadResult;
  record(game: Omit<CompletedGame, 'date'>): RecordResult;
  clear(): boolean;
};

export const STORAGE_KEY = 'simon:results:v1';
const MAX_ROUNDS = 10;

type Options = {
  getStorage?: () => Storage;
  now?: () => Date;
};

function isValidGame(value: unknown): value is CompletedGame {
  if (typeof value !== 'object' || value === null) return false;
  const { date, completedRounds, result } = value as Record<string, unknown>;
  if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) return false;
  if (typeof completedRounds !== 'number' || !Number.isInteger(completedRounds)) return false;
  // Only losses with 0–9 and wins with exactly 10 are possible outcomes.
  if (result === 'win') return completedRounds === MAX_ROUNDS;
  if (result === 'loss') return completedRounds >= 0 && completedRounds < MAX_ROUNDS;
  return false;
}

function parse(raw: string): CompletedGame[] | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { schemaVersion, games } = data as Record<string, unknown>;
  if (schemaVersion !== 1 || !Array.isArray(games) || !games.every(isValidGame)) return null;
  return games.map(({ date, completedRounds, result }) => ({ date, completedRounds, result }));
}

export function createResultsRepository({
  getStorage = () => window.localStorage,
  now = () => new Date(),
}: Options = {}): ResultsRepository {
  // Even accessing localStorage can throw (e.g. SecurityError when storage is blocked).
  const storage = (): Storage | null => {
    try {
      return getStorage() ?? null;
    } catch {
      return null;
    }
  };

  const load = (): LoadResult => {
    const store = storage();
    if (!store) return { status: 'unavailable' };
    let raw: string | null;
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch {
      return { status: 'unavailable' };
    }
    if (raw === null) return { status: 'ok', games: [] };
    const games = parse(raw);
    return games ? { status: 'ok', games } : { status: 'invalid' };
  };

  return {
    load,

    record(game) {
      const current = load();
      // Never overwrite unreadable or invalid data.
      if (current.status !== 'ok') return { saved: false, games: null };
      const games = [...current.games, { date: now().toISOString(), ...game }];
      const data: SavedResults = { schemaVersion: 1, games };
      try {
        storage()!.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        return { saved: false, games: null };
      }
      return { saved: true, games };
    },

    clear() {
      try {
        const store = storage();
        if (!store) return false;
        store.removeItem(STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}
