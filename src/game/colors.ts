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
