import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, INTERVALS, loadSettings, saveSettings, stepInterval } from '../src/settings-store';

class MemStorage {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
}

describe('settings store', () => {
  it('starts with defaults', () => {
    expect(loadSettings(new MemStorage())).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.intervalSec).toBe(8);
    expect(DEFAULT_SETTINGS.motion).toBe(false);
  });

  it('round-trips a valid interval', () => {
    const s = new MemStorage();
    saveSettings(s, { intervalSec: 15, motion: true });
    expect(loadSettings(s)).toEqual({ intervalSec: 15, motion: true });
  });

  it('falls back to defaults for corrupted or unknown values', () => {
    const s = new MemStorage();
    s.setItem('immich-tv-settings', '{oops');
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    s.setItem('immich-tv-settings', JSON.stringify({ intervalSec: 7 }));
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps a valid interval when only the motion flag is missing or wrong', () => {
    const s = new MemStorage();
    s.setItem('immich-tv-settings', JSON.stringify({ intervalSec: 15 }));
    expect(loadSettings(s)).toEqual({ intervalSec: 15, motion: false });
    s.setItem('immich-tv-settings', JSON.stringify({ intervalSec: 5, motion: 'yes' }));
    expect(loadSettings(s)).toEqual({ intervalSec: 5, motion: false });
  });

  it('steps through the allowed intervals and stops at the ends', () => {
    expect(INTERVALS).toEqual([5, 8, 15, 30]);
    expect(stepInterval(8, 1)).toBe(15);
    expect(stepInterval(8, -1)).toBe(5);
    expect(stepInterval(5, -1)).toBe(5);
    expect(stepInterval(30, 1)).toBe(30);
  });
});
