export type Intent = 'left' | 'right' | 'up' | 'down' | 'select' | 'back' | 'play' | 'pause' | 'playpause';
export type Dir = 'left' | 'right' | 'up' | 'down';

const KEYMAP: Record<number, Intent> = {
  37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'select',
  10009: 'back', 8: 'back', 27: 'back',
  415: 'play', 19: 'pause', 10252: 'playpause', 32: 'playpause',
  417: 'right', 412: 'left',
};

export const keyToIntent = (code: number): Intent | null => KEYMAP[code] ?? null;
