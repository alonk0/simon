import { BOARD_LAYOUT, type Color } from './colors';

/** Returns a number in [0, 1). Defaults to Math.random; injected in tests. */
export type Random = () => number;

export const MAX_ROUNDS = 10;

export function randomColor(random: Random = Math.random): Color {
  const index = Math.min(Math.floor(random() * BOARD_LAYOUT.length), BOARD_LAYOUT.length - 1);
  return BOARD_LAYOUT[index];
}

/** Returns a new sequence with exactly one random color appended; the input is not modified. */
export function extendSequence(sequence: readonly Color[], random: Random = Math.random): Color[] {
  return [...sequence, randomColor(random)];
}

export function isCorrectPress(sequence: readonly Color[], index: number, color: Color): boolean {
  return sequence[index] === color;
}
