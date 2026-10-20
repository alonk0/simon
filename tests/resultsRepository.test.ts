import { describe, expect, it } from 'vitest';
import { createResultsRepository, STORAGE_KEY } from '../src/storage/resultsRepository';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  failWrites = false;
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('full', 'QuotaExceededError');
    this.data.set(key, value);
  }
}

const NOW = new Date('2026-10-20T10:00:00.000Z');

function setup(initial?: string) {
  const storage = new MemoryStorage();
  if (initial !== undefined) storage.setItem(STORAGE_KEY, initial);
  const repo = createResultsRepository({ getStorage: () => storage, now: () => NOW });
  return { storage, repo };
}

const saved = (games: unknown[]) => JSON.stringify({ schemaVersion: 1, games });

describe('results repository', () => {
  it('treats a missing key as an empty history', () => {
    expect(setup().repo.load()).toEqual({ status: 'ok', games: [] });
  });

  it('records finished games in order with date, rounds and result', () => {
    const { storage, repo } = setup();
    expect(repo.record({ result: 'loss', completedRounds: 3 }).saved).toBe(true);
    const second = repo.record({ result: 'win', completedRounds: 10 });
    expect(second.saved).toBe(true);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
      schemaVersion: 1,
      games: [
        { date: NOW.toISOString(), completedRounds: 3, result: 'loss' },
        { date: NOW.toISOString(), completedRounds: 10, result: 'win' },
      ],
    });
    expect(repo.load()).toEqual({ status: 'ok', games: second.games });
  });

  it.each([
    ['broken JSON', '{not json'],
    ['unsupported schema version', JSON.stringify({ schemaVersion: 2, games: [] })],
    ['games not an array', JSON.stringify({ schemaVersion: 1, games: {} })],
    ['win with fewer than 10 rounds', saved([{ date: NOW.toISOString(), completedRounds: 7, result: 'win' }])],
    ['loss with 10 rounds', saved([{ date: NOW.toISOString(), completedRounds: 10, result: 'loss' }])],
    ['rounds above 10', saved([{ date: NOW.toISOString(), completedRounds: 11, result: 'loss' }])],
    ['non-integer rounds', saved([{ date: NOW.toISOString(), completedRounds: 2.5, result: 'loss' }])],
    ['negative rounds', saved([{ date: NOW.toISOString(), completedRounds: -1, result: 'loss' }])],
    ['invalid date', saved([{ date: 'yesterday', completedRounds: 2, result: 'loss' }])],
    ['unknown result', saved([{ date: NOW.toISOString(), completedRounds: 2, result: 'draw' }])],
    ['null', 'null'],
  ])('reports invalid data (%s) and never overwrites it', (_name, raw) => {
    const { storage, repo } = setup(raw);
    expect(repo.load()).toEqual({ status: 'invalid' });
    expect(repo.record({ result: 'loss', completedRounds: 1 })).toEqual({ saved: false, games: null });
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it('reports a failed write without claiming success', () => {
    const { storage, repo } = setup();
    storage.failWrites = true;
    expect(repo.record({ result: 'loss', completedRounds: 4 })).toEqual({ saved: false, games: null });
    expect(repo.load()).toEqual({ status: 'ok', games: [] });
  });

  it('handles storage that cannot be accessed at all', () => {
    const repo = createResultsRepository({
      getStorage: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    expect(repo.load()).toEqual({ status: 'unavailable' });
    expect(repo.record({ result: 'loss', completedRounds: 0 }).saved).toBe(false);
    expect(repo.clear()).toBe(false);
  });

  it('clear removes only this app key', () => {
    const { storage, repo } = setup(saved([]));
    storage.setItem('other-app', 'keep');
    expect(repo.clear()).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem('other-app')).toBe('keep');
  });
});
