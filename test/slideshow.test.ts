import { describe, it, expect } from 'vitest';
import { initial, reduce, nextDelayMs, type Show } from '../src/slideshow';
import type { Asset } from '../src/immich-client';

const img = (id: string): Asset => ({ id, type: 'IMAGE', durationMs: null, takenAt: null });
const vid = (id: string, ms = 5000): Asset => ({ id, type: 'VIDEO', durationMs: ms, takenAt: null });
const three = (): Show => reduce(initial(), { type: 'load', items: [img('a'), vid('b'), img('c')], nextPage: null });

describe('slideshow reducer', () => {
  it('starts paused at index 0', () => {
    const s = three();
    expect(s.index).toBe(0);
    expect(s.playing).toBe(false);
  });

  it('wraps around at both ends', () => {
    let s = reduce(three(), { type: 'prev' });
    expect(s.index).toBe(2);
    s = reduce(s, { type: 'next' });
    expect(s.index).toBe(0);
  });

  it('toggles play and pause', () => {
    const s = reduce(three(), { type: 'toggle' });
    expect(s.playing).toBe(true);
    expect(reduce(s, { type: 'toggle' }).playing).toBe(false);
  });

  it('appends the next page without moving the current position', () => {
    let s = reduce(three(), { type: 'next' });
    s = reduce(s, { type: 'append', items: [img('d')], nextPage: null });
    expect(s.items.length).toBe(4);
    expect(s.index).toBe(1);
  });

  it('asks for the next page only when near the end and one exists', () => {
    const ten = Array.from({ length: 10 }, (_, i) => img(String(i)));
    let s = reduce(initial(), { type: 'load', items: ten, nextPage: 2 });
    expect(s.needsMore).toBe(false);
    for (let i = 0; i < 7; i++) s = reduce(s, { type: 'next' });
    expect(s.needsMore).toBe(true);
    const last = reduce(initial(), { type: 'load', items: ten, nextPage: null });
    expect(reduce(last, { type: 'prev' }).needsMore).toBe(false);
  });

  it('does nothing on an empty album', () => {
    const s = reduce(initial(), { type: 'next' });
    expect(s.index).toBe(0);
  });

  it('video end advances only while playing', () => {
    let s = reduce(three(), { type: 'next' });
    expect(reduce(s, { type: 'videoEnded' }).index).toBe(1);
    s = reduce(s, { type: 'toggle' });
    expect(reduce(s, { type: 'videoEnded' }).index).toBe(2);
  });
});

describe('nextDelayMs', () => {
  it('uses the interval for photos', () => {
    expect(nextDelayMs(img('a'), 8000)).toBe(8000);
  });
  it('waits for the end event on videos (no timer)', () => {
    expect(nextDelayMs(vid('b'), 8000)).toBeNull();
  });
});
