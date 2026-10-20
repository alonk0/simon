import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Color } from '../src/game/colors';
import { createGameController, type GameState } from '../src/game/gameController';
import { BETWEEN_ROUNDS_MS, FLASH_MS, GAP_MS, LEAD_IN_MS } from '../src/game/timing';

const COLORS: Color[] = ['blue', 'red', 'yellow', 'green'];

function playbackMs(length: number): number {
  return LEAD_IN_MS + length * FLASH_MS + (length - 1) * GAP_MS;
}

// Cycles through blue, red, yellow, green, blue, ...
function cyclingRandom() {
  let i = 0;
  return () => (i++ % 4) / 4;
}

function setup(random = cyclingRandom()) {
  const states: GameState[] = [];
  const playTone = vi.fn();
  const game = createGameController({ random, playTone, onChange: (s) => states.push(s) });
  const pressAll = () => {
    for (const color of game.getSequence()) game.press(color);
  };
  // Plays rounds 1..n correctly, leaving the game awaiting input in round n+1.
  const completeRounds = (n: number) => {
    for (let r = 1; r <= n; r++) {
      vi.advanceTimersByTime(playbackMs(r));
      pressAll();
      if (r < 10) vi.advanceTimersByTime(BETWEEN_ROUNDS_MS);
    }
  };
  return { game, states, playTone, pressAll, completeRounds };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('game controller', () => {
  it('starts idle', () => {
    const { game } = setup();
    expect(game.getState().phase).toBe('idle');
  });

  it('shows a one-color sequence, ignoring presses until playback ends', () => {
    const { game, playTone } = setup();
    game.start();
    expect(game.getState()).toMatchObject({ phase: 'showing-sequence', round: 1 });
    expect(game.getSequence()).toHaveLength(1);

    game.press('green'); // wrong color, but must be ignored during playback
    expect(game.getState().phase).toBe('showing-sequence');

    vi.advanceTimersByTime(LEAD_IN_MS);
    expect(game.getState().litColor).toBe('blue');
    expect(playTone).toHaveBeenCalledWith('blue', FLASH_MS);

    vi.advanceTimersByTime(FLASH_MS);
    expect(game.getState()).toMatchObject({ phase: 'awaiting-input', litColor: null });
  });

  it('grows the sequence by one color per round and keeps earlier colors', () => {
    const { game } = setup();
    game.start();
    const seen: Color[][] = [];
    for (let r = 1; r <= 4; r++) {
      seen.push([...game.getSequence()]);
      vi.advanceTimersByTime(playbackMs(r));
      for (const c of game.getSequence()) game.press(c);
      vi.advanceTimersByTime(BETWEEN_ROUNDS_MS);
    }
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toHaveLength(seen[i - 1].length + 1);
      expect(seen[i].slice(0, -1)).toEqual(seen[i - 1]);
    }
    expect(game.getState().round).toBe(5);
  });

  it('plays every color of the sequence each round at a constant pace', () => {
    const { game, playTone, completeRounds } = setup();
    game.start();
    completeRounds(2);
    playTone.mockClear();
    // Round 3 playback: exactly 3 tones, input opens exactly at playbackMs(3).
    vi.advanceTimersByTime(playbackMs(3) - 1);
    expect(game.getState().phase).toBe('showing-sequence');
    vi.advanceTimersByTime(1);
    expect(game.getState().phase).toBe('awaiting-input');
    expect(playTone.mock.calls.map((c) => c[0])).toEqual(game.getSequence());
  });

  it('has no time limit for the player', () => {
    const { game } = setup();
    game.start();
    vi.advanceTimersByTime(playbackMs(1) + 10 * 60_000);
    expect(game.getState().phase).toBe('awaiting-input');
  });

  it('a wrong first press ends with 0 rounds', () => {
    const { game } = setup();
    game.start();
    vi.advanceTimersByTime(playbackMs(1));
    game.press('red');
    expect(game.getState()).toMatchObject({ phase: 'finished', result: 'loss', completedRounds: 0 });
  });

  it('a mistake in round 7 ends with 6 rounds', () => {
    const { game, completeRounds } = setup();
    game.start();
    completeRounds(6);
    expect(game.getState().round).toBe(7);
    vi.advanceTimersByTime(playbackMs(7));
    const seq = game.getSequence();
    game.press(seq[0]);
    game.press(COLORS.find((c) => c !== seq[1])!);
    expect(game.getState()).toMatchObject({ phase: 'finished', result: 'loss', completedRounds: 6 });
  });

  it('completing round 10 wins with 10 rounds', () => {
    const { game, completeRounds } = setup();
    game.start();
    completeRounds(10);
    expect(game.getSequence()).toHaveLength(10);
    expect(game.getState()).toMatchObject({ phase: 'finished', result: 'win', completedRounds: 10 });
  });

  it('blocks input between rounds so a quick extra press is not counted', () => {
    const { game } = setup();
    game.start();
    vi.advanceTimersByTime(playbackMs(1));
    game.press('blue');
    expect(game.getState()).toMatchObject({ phase: 'between-rounds', completedRounds: 1 });
    game.press('green'); // would be wrong, must be ignored
    expect(game.getState().phase).toBe('between-rounds');
    vi.advanceTimersByTime(BETWEEN_ROUNDS_MS);
    expect(game.getState()).toMatchObject({ phase: 'showing-sequence', round: 2 });
  });

  it('cancel stops all pending playback without further updates', () => {
    const { game, states, playTone } = setup();
    game.start();
    game.cancel();
    expect(game.getState().phase).toBe('idle');
    const count = states.length;
    playTone.mockClear();
    vi.advanceTimersByTime(60_000);
    expect(states).toHaveLength(count);
    expect(playTone).not.toHaveBeenCalled();
  });

  it('restarting mid-game leaves nothing from the previous game', () => {
    const { game, playTone, completeRounds } = setup();
    game.start();
    completeRounds(3);
    vi.advanceTimersByTime(LEAD_IN_MS + FLASH_MS); // mid-playback of round 4
    game.start();
    playTone.mockClear();
    expect(game.getState()).toMatchObject({ phase: 'showing-sequence', round: 1, completedRounds: 0 });
    vi.advanceTimersByTime(playbackMs(1));
    expect(playTone).toHaveBeenCalledTimes(1);
    expect(game.getState()).toMatchObject({ phase: 'awaiting-input', round: 1 });
    vi.advanceTimersByTime(60_000);
    expect(playTone).toHaveBeenCalledTimes(1);
    expect(game.getState().phase).toBe('awaiting-input');
  });

  it('keeps working when playing a tone throws', () => {
    const game = createGameController({
      random: () => 0,
      playTone: () => {
        throw new Error('no audio');
      },
      onChange: () => {},
    });
    game.start();
    vi.advanceTimersByTime(playbackMs(1));
    game.press('blue');
    expect(game.getState()).toMatchObject({ phase: 'between-rounds', completedRounds: 1 });
  });
});

describe('game controller – finishing', () => {
  const SUMMARY = { saved: true, personalBest: 6, isNewBest: true };

  function setupWithFinish(onFinish = vi.fn(() => SUMMARY)) {
    const game = createGameController({ random: cyclingRandom(), playTone: vi.fn(), onChange: () => {}, onFinish });
    const pressAll = () => {
      for (const color of game.getSequence()) game.press(color);
    };
    const completeRounds = (n: number) => {
      for (let r = 1; r <= n; r++) {
        vi.advanceTimersByTime(playbackMs(r));
        pressAll();
        if (r < 10) vi.advanceTimersByTime(BETWEEN_ROUNDS_MS);
      }
    };
    return { game, onFinish, completeRounds };
  }

  it('reports a loss exactly once and shows the summary', () => {
    const { game, onFinish, completeRounds } = setupWithFinish();
    game.start();
    completeRounds(6);
    vi.advanceTimersByTime(playbackMs(7));
    const wrong = COLORS.find((c) => c !== game.getSequence()[0])!;
    game.press(wrong);
    game.press(wrong);
    vi.advanceTimersByTime(10_000);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({ result: 'loss', completedRounds: 6 });
    expect(game.getState()).toMatchObject({ phase: 'finished', summary: SUMMARY });
  });

  it('reports a win exactly once with 10 rounds', () => {
    const { game, onFinish, completeRounds } = setupWithFinish();
    game.start();
    completeRounds(10);
    game.press('blue');
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({ result: 'win', completedRounds: 10 });
  });

  it('does not report a cancelled game', () => {
    const { game, onFinish, completeRounds } = setupWithFinish();
    game.start();
    completeRounds(3);
    game.cancel();
    vi.advanceTimersByTime(60_000);
    expect(onFinish).not.toHaveBeenCalled();
    expect(game.getState().summary).toBeNull();
  });

  it('still finishes when recording throws', () => {
    const { game } = setupWithFinish(
      vi.fn(() => {
        throw new Error('storage broken');
      }),
    );
    game.start();
    vi.advanceTimersByTime(playbackMs(1));
    game.press(COLORS.find((c) => c !== game.getSequence()[0])!);
    expect(game.getState()).toMatchObject({ phase: 'finished', result: 'loss', completedRounds: 0, summary: null });
  });

  it('clears the summary when a new game starts', () => {
    const { game } = setupWithFinish();
    game.start();
    vi.advanceTimersByTime(playbackMs(1));
    game.press(COLORS.find((c) => c !== game.getSequence()[0])!);
    game.start();
    expect(game.getState().summary).toBeNull();
  });
});
