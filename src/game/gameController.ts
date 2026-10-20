import type { Color } from './colors';
import { extendSequence, isCorrectPress, MAX_ROUNDS, type Random } from './sequence';
import { BETWEEN_ROUNDS_MS, FLASH_MS, GAP_MS, LEAD_IN_MS, PRESS_FLASH_MS } from './timing';

export type Phase = 'idle' | 'showing-sequence' | 'awaiting-input' | 'between-rounds' | 'finished';

export type GameState = {
  phase: Phase;
  round: number;
  completedRounds: number;
  litColor: Color | null;
  result: 'win' | 'loss' | null;
};

export type GameControllerOptions = {
  random?: Random;
  playTone: (color: Color, durationMs: number) => void;
  onChange: (state: GameState) => void;
};

export type GameController = {
  start(): void;
  press(color: Color): void;
  cancel(): void;
  getState(): GameState;
  getSequence(): readonly Color[];
};

const IDLE: GameState = { phase: 'idle', round: 0, completedRounds: 0, litColor: null, result: null };

export function createGameController({ random = Math.random, playTone, onChange }: GameControllerOptions): GameController {
  let state: GameState = { ...IDLE };
  let sequence: Color[] = [];
  let inputIndex = 0;
  // Incremented on start/cancel so callbacks from an older game become no-ops.
  let gameToken = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];
  let pressTimer: ReturnType<typeof setTimeout> | undefined;

  const update = (patch: Partial<GameState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  const later = (ms: number, fn: () => void) => {
    const token = gameToken;
    timers.push(
      setTimeout(() => {
        if (token === gameToken) fn();
      }, ms),
    );
  };

  const clearTimers = () => {
    for (const timer of timers) clearTimeout(timer);
    timers = [];
    clearTimeout(pressTimer);
    pressTimer = undefined;
  };

  const tone = (color: Color, ms: number) => {
    try {
      playTone(color, ms);
    } catch {
      // Audio problems must never affect the game.
    }
  };

  const showSequence = () => {
    update({ phase: 'showing-sequence', litColor: null });
    let at = LEAD_IN_MS;
    for (const color of sequence) {
      later(at, () => {
        update({ litColor: color });
        tone(color, FLASH_MS);
      });
      later(at + FLASH_MS, () => update({ litColor: null }));
      at += FLASH_MS + GAP_MS;
    }
    // Input opens right after the last flash ends.
    later(at - GAP_MS, () => {
      inputIndex = 0;
      update({ phase: 'awaiting-input', litColor: null });
    });
  };

  const finish = (result: 'win' | 'loss') => {
    clearTimers();
    update({ phase: 'finished', result, litColor: null });
  };

  return {
    start() {
      clearTimers();
      gameToken++;
      sequence = extendSequence([], random);
      inputIndex = 0;
      state = { ...IDLE, round: 1 };
      showSequence();
    },

    press(color) {
      if (state.phase !== 'awaiting-input') return;

      // Short light + tone feedback for the press itself.
      clearTimeout(pressTimer);
      update({ litColor: color });
      tone(color, PRESS_FLASH_MS);
      const token = gameToken;
      pressTimer = setTimeout(() => {
        if (token === gameToken && state.litColor === color) update({ litColor: null });
      }, PRESS_FLASH_MS);

      if (!isCorrectPress(sequence, inputIndex, color)) {
        finish('loss');
        return;
      }
      inputIndex++;
      if (inputIndex < sequence.length) return;

      if (state.round >= MAX_ROUNDS) {
        state = { ...state, completedRounds: MAX_ROUNDS };
        finish('win');
        return;
      }

      // Block further input immediately; the next round starts after a short pause.
      update({ phase: 'between-rounds', completedRounds: state.round });
      later(BETWEEN_ROUNDS_MS, () => {
        sequence = extendSequence(sequence, random);
        state = { ...state, round: state.round + 1 };
        showSequence();
      });
    },

    cancel() {
      clearTimers();
      gameToken++;
      sequence = [];
      inputIndex = 0;
      update({ ...IDLE });
    },

    getState: () => state,
    getSequence: () => sequence,
  };
}
