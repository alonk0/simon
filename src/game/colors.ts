export type Color = 'blue' | 'red' | 'yellow' | 'green';

// Board order in visual reading order (left-to-right, top-to-bottom):
// top row: blue (left), red (right); bottom row: yellow (left), green (right).
export const BOARD_LAYOUT: readonly Color[] = ['blue', 'red', 'yellow', 'green'];

export const COLOR_LABELS: Readonly<Record<Color, string>> = {
  blue: 'כחול',
  red: 'אדום',
  yellow: 'צהוב',
  green: 'ירוק',
};

// Distinct tone per color (Hz), based on the classic Simon pitches.
export const COLOR_TONES: Readonly<Record<Color, number>> = {
  green: 415,
  red: 310,
  yellow: 252,
  blue: 209,
};
