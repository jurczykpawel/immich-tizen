import { describe, expect, it } from 'vitest';
import { moveInRows } from '../src/rows-nav';

const lens = [5, 2, 4];

describe('moveInRows', () => {
  it('moves right and left inside a row and stops at the right end', () => {
    expect(moveInRows({ row: 0, col: 1 }, 'right', lens)).toEqual({ pos: { row: 0, col: 2 }, edge: null });
    expect(moveInRows({ row: 1, col: 1 }, 'right', lens)).toEqual({ pos: { row: 1, col: 1 }, edge: null });
  });

  it('reports the left edge instead of moving past the first card', () => {
    expect(moveInRows({ row: 2, col: 0 }, 'left', lens)).toEqual({ pos: { row: 2, col: 0 }, edge: 'left' });
    expect(moveInRows({ row: 2, col: 3 }, 'left', lens)).toEqual({ pos: { row: 2, col: 2 }, edge: null });
  });

  it('moves between rows and keeps the column, clamped to a shorter row', () => {
    expect(moveInRows({ row: 0, col: 4 }, 'down', lens)).toEqual({ pos: { row: 1, col: 1 }, edge: null });
    expect(moveInRows({ row: 1, col: 1 }, 'down', lens)).toEqual({ pos: { row: 2, col: 1 }, edge: null });
    expect(moveInRows({ row: 2, col: 3 }, 'up', lens)).toEqual({ pos: { row: 1, col: 1 }, edge: null });
  });

  it('stays put at the top and bottom', () => {
    expect(moveInRows({ row: 0, col: 2 }, 'up', lens)).toEqual({ pos: { row: 0, col: 2 }, edge: null });
    expect(moveInRows({ row: 2, col: 2 }, 'down', lens)).toEqual({ pos: { row: 2, col: 2 }, edge: null });
  });

  it('survives an empty list', () => {
    expect(moveInRows({ row: 0, col: 0 }, 'down', [])).toEqual({ pos: { row: 0, col: 0 }, edge: null });
    expect(moveInRows({ row: 0, col: 0 }, 'left', [])).toEqual({ pos: { row: 0, col: 0 }, edge: 'left' });
  });
});
