import type { Dir } from './keys';

export interface RowPos { row: number; col: number }
export interface RowMove { pos: RowPos; edge: 'left' | null }

/** Focus movement over rows of different lengths (Netflix-style shelves). Left past the first card reports the edge. */
export function moveInRows(pos: RowPos, dir: Dir, lengths: number[]): RowMove {
  const stay = { pos, edge: null } as RowMove;
  if (dir === 'left') return pos.col > 0 ? { pos: { row: pos.row, col: pos.col - 1 }, edge: null } : { pos, edge: 'left' };
  if (lengths.length === 0) return stay;
  if (dir === 'right') return pos.col < lengths[pos.row] - 1 ? { pos: { row: pos.row, col: pos.col + 1 }, edge: null } : stay;
  const row = pos.row + (dir === 'down' ? 1 : -1);
  if (row < 0 || row >= lengths.length) return stay;
  return { pos: { row, col: Math.min(pos.col, lengths[row] - 1) }, edge: null };
}
