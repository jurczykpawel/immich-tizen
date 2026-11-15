import { describe, expect, it } from 'vitest';
import { formatPlDate, itemsLabel } from '../src/polish';

describe('itemsLabel (Polish plural of "pozycja")', () => {
  it.each([
    [0, '0 pozycji'], [1, '1 pozycja'], [2, '2 pozycje'], [4, '4 pozycje'], [5, '5 pozycji'],
    [12, '12 pozycji'], [14, '14 pozycji'], [22, '22 pozycje'], [25, '25 pozycji'], [101, '101 pozycji'], [112, '112 pozycji'],
  ])('%i -> %s', (n, expected) => expect(itemsLabel(n)).toBe(expected));

  it('groups thousands with a non-breaking space', () => {
    expect(itemsLabel(13066)).toBe('13 066 pozycji');
  });
});

describe('formatPlDate', () => {
  it('writes day, month name in genitive and year', () => {
    expect(formatPlDate('2025-10-12T14:05:00.000Z')).toBe('12 października 2025');
    expect(formatPlDate('2024-03-01T00:00:00.000Z')).toBe('1 marca 2024');
  });

  it('uses the local calendar date stored in the string, not the viewer time zone', () => {
    expect(formatPlDate('2025-04-13T23:59:00.000Z')).toBe('13 kwietnia 2025');
  });

  it('returns an empty string for missing or broken dates', () => {
    expect(formatPlDate(null)).toBe('');
    expect(formatPlDate('nonsense')).toBe('');
  });
});
