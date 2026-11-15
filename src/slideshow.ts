import type { Asset } from './immich-client';

export interface Show { items: Asset[]; index: number; playing: boolean; nextPage: number | null; needsMore: boolean }
export type Action =
  | { type: 'load'; items: Asset[]; nextPage: number | null }
  | { type: 'append'; items: Asset[]; nextPage: number | null }
  | { type: 'next' } | { type: 'prev' } | { type: 'toggle' } | { type: 'videoEnded' };

const PREFETCH_AHEAD = 2;

export const initial = (): Show => ({ items: [], index: 0, playing: false, nextPage: null, needsMore: false });

const withNeed = (s: Show): Show => ({ ...s, needsMore: s.nextPage !== null && s.index >= s.items.length - 1 - PREFETCH_AHEAD });

function step(s: Show, d: 1 | -1): Show {
  const n = s.items.length;
  return n === 0 ? s : withNeed({ ...s, index: (s.index + d + n) % n });
}

export function reduce(s: Show, a: Action): Show {
  switch (a.type) {
    case 'load': return withNeed({ ...initial(), items: a.items, nextPage: a.nextPage });
    case 'append': return withNeed({ ...s, items: [...s.items, ...a.items], nextPage: a.nextPage });
    case 'next': return step(s, 1);
    case 'prev': return step(s, -1);
    case 'toggle': return { ...s, playing: !s.playing };
    case 'videoEnded': return s.playing ? step(s, 1) : s;
  }
}

export function nextDelayMs(asset: Asset, intervalMs: number): number | null {
  return asset.type === 'VIDEO' ? null : intervalMs;
}
