import { describe, expect, it } from 'vitest';
import { extendSequence, isCorrectPress, randomColor } from '../src/game/sequence';

describe('sequence engine', () => {
  it('maps the random range evenly onto the four colors', () => {
    expect(randomColor(() => 0)).toBe('blue');
    expect(randomColor(() => 0.25)).toBe('red');
    expect(randomColor(() => 0.5)).toBe('yellow');
    expect(randomColor(() => 0.999)).toBe('green');
  });

  it('always returns one of the four colors with real randomness', () => {
    for (let i = 0; i < 200; i++) expect(['blue', 'red', 'yellow', 'green']).toContain(randomColor());
  });

  it('appends exactly one color without modifying the original', () => {
    const original = ['red', 'green'] as const;
    const next = extendSequence(original, () => 0.6);
    expect(next).toEqual(['red', 'green', 'yellow']);
    expect(original).toEqual(['red', 'green']);
  });

  it('allows the same color to repeat', () => {
    expect(extendSequence(['blue'], () => 0)).toEqual(['blue', 'blue']);
  });

  it('checks a press against the expected position', () => {
    expect(isCorrectPress(['red', 'blue'], 1, 'blue')).toBe(true);
    expect(isCorrectPress(['red', 'blue'], 0, 'blue')).toBe(false);
  });
});
