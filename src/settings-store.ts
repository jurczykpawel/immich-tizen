export const INTERVALS = [5, 8, 15, 30] as const;
export interface Settings { intervalSec: number; motion: boolean }
export const DEFAULT_SETTINGS: Settings = { intervalSec: 8, motion: false };

const KEY = 'immich-tv-settings';
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function loadSettings(s: Store): Settings {
  try {
    const raw = JSON.parse(s.getItem(KEY) ?? 'null') as Partial<Settings> | null;
    return raw && (INTERVALS as readonly number[]).includes(raw.intervalSec as number) ? { intervalSec: raw.intervalSec as number, motion: raw.motion === true } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const saveSettings = (s: Store, v: Settings): void => s.setItem(KEY, JSON.stringify(v));

export function stepInterval(current: number, dir: 1 | -1): number {
  const i = (INTERVALS as readonly number[]).indexOf(current);
  return INTERVALS[Math.max(0, Math.min(INTERVALS.length - 1, (i < 0 ? 1 : i) + dir))];
}
