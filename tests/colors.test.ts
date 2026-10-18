import { describe, expect, it } from 'vitest';
import { BOARD_LAYOUT, COLOR_LABELS } from '../src/game/colors';

describe('board colors', () => {
  it('has exactly four colors in the fixed board order', () => {
    expect(BOARD_LAYOUT).toEqual(['blue', 'red', 'yellow', 'green']);
  });

  it('has a Hebrew label for every color', () => {
    expect(COLOR_LABELS).toEqual({ blue: 'כחול', red: 'אדום', yellow: 'צהוב', green: 'ירוק' });
  });
});
