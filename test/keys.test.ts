import { describe, it, expect } from 'vitest';
import { keyToIntent } from '../src/keys';

describe('keyToIntent (Tizen remote key codes)', () => {
  it.each([
    [37, 'left'], [39, 'right'], [38, 'up'], [40, 'down'], [13, 'select'],
    [10009, 'back'], [8, 'back'], [27, 'back'],
    [415, 'play'], [19, 'pause'], [10252, 'playpause'], [32, 'playpause'],
    [417, 'right'], [412, 'left'],
  ])('maps %i to %s', (code, intent) => {
    expect(keyToIntent(code)).toBe(intent);
  });

  it('returns null for unknown keys', () => {
    expect(keyToIntent(65)).toBeNull();
  });
});
