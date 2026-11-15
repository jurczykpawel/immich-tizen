import { normalizeBaseUrl, type Config } from './immich-client';

const KEY = 'immich-tv-config';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function isValidConfig(c: Partial<Config> | null | undefined): c is Config {
  return !!c && typeof c.baseUrl === 'string' && c.baseUrl.trim() !== '' && typeof c.apiKey === 'string' && c.apiKey.trim() !== '';
}

/** Builds a config from two free-text form fields, or null when either is empty. */
export function configFromForm(address: string, key: string): Config | null {
  const config = { baseUrl: address.trim() && normalizeBaseUrl(address), apiKey: key.trim() };
  return isValidConfig(config) ? config : null;
}

export function loadConfig(s: Store): Config | null {
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<Config>;
    return isValidConfig(c) ? { baseUrl: normalizeBaseUrl(c.baseUrl), apiKey: c.apiKey.trim() } : null;
  } catch {
    return null;
  }
}

export function saveConfig(s: Store, c: Config): void {
  s.setItem(KEY, JSON.stringify({ baseUrl: normalizeBaseUrl(c.baseUrl), apiKey: c.apiKey.trim() }));
}

export function clearConfig(s: Store): void {
  s.removeItem(KEY);
}
