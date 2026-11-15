import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, saveConfig, clearConfig, isValidConfig } from '../src/config-store';

class MemStorage {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
}

describe('config store', () => {
  let s: MemStorage;
  beforeEach(() => { s = new MemStorage(); });

  it('returns null when nothing is saved', () => {
    expect(loadConfig(s)).toBeNull();
  });

  it('round-trips a config and normalizes the address', () => {
    saveConfig(s, { baseUrl: '192.168.1.10:2283/', apiKey: 'K' });
    expect(loadConfig(s)).toEqual({ baseUrl: 'http://192.168.1.10:2283', apiKey: 'K' });
  });

  it('ignores corrupted or incomplete stored data', () => {
    s.setItem('immich-tv-config', '{not json');
    expect(loadConfig(s)).toBeNull();
    s.setItem('immich-tv-config', JSON.stringify({ baseUrl: 'x' }));
    expect(loadConfig(s)).toBeNull();
  });

  it('clears the config', () => {
    saveConfig(s, { baseUrl: 'h:1', apiKey: 'K' });
    clearConfig(s);
    expect(loadConfig(s)).toBeNull();
  });

  it('rejects empty address or key', () => {
    expect(isValidConfig({ baseUrl: '', apiKey: 'k' })).toBe(false);
    expect(isValidConfig({ baseUrl: 'h', apiKey: '  ' })).toBe(false);
    expect(isValidConfig({ baseUrl: 'h', apiKey: 'k' })).toBe(true);
  });
});
