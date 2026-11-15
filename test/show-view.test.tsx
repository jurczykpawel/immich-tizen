import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/preact';
import { ShowView } from '../src/show-view';
import type { Asset } from '../src/immich-client';

const img = (id: string): Asset => ({ id, type: 'IMAGE', durationMs: null, takenAt: null });
const vid = (id: string): Asset => ({ id, type: 'VIDEO', durationMs: 5000, takenAt: null });
const urls = { previewUrl: (id: string) => `preview://${id}`, thumbUrl: (id: string) => `thumb://${id}`, videoUrl: (id: string) => `video://${id}` };
const shown = () => document.querySelector('img.current')?.getAttribute('src') ?? document.querySelector('video')?.getAttribute('src');

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('ShowView', () => {
  it('shows the first photo and steps with arrow keys', () => {
    render(<ShowView {...urls} items={[img('a'), img('b')]} nextPage={null} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} />);
    expect(shown()).toBe('preview://a');
    fireEvent.keyDown(window, { keyCode: 39 });
    expect(shown()).toBe('preview://b');
    fireEvent.keyDown(window, { keyCode: 37 });
    expect(shown()).toBe('preview://a');
  });

  it('auto-advances photos only after play is pressed', () => {
    render(<ShowView {...urls} items={[img('a'), img('b')]} nextPage={null} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} />);
    act(() => { vi.advanceTimersByTime(20000); });
    expect(shown()).toBe('preview://a');
    fireEvent.keyDown(window, { keyCode: 13 });
    act(() => { vi.advanceTimersByTime(8000); });
    expect(shown()).toBe('preview://b');
  });

  it('plays a video element and advances when it ends during the show', () => {
    render(<ShowView {...urls} items={[vid('v'), img('b')]} nextPage={null} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} />);
    const v = document.querySelector('video')!;
    expect(v.getAttribute('src')).toBe('video://v');
    fireEvent.keyDown(window, { keyCode: 13 });
    fireEvent.ended(v);
    expect(shown()).toBe('preview://b');
  });

  it('goes back on the Back key', () => {
    const onBack = vi.fn();
    render(<ShowView {...urls} items={[img('a')]} nextPage={null} loadMore={vi.fn()} onBack={onBack} intervalMs={8000} />);
    fireEvent.keyDown(window, { keyCode: 10009 });
    expect(onBack).toHaveBeenCalled();
  });

  it('requests more items when near the end and a next page exists', () => {
    const loadMore = vi.fn();
    const items = Array.from({ length: 5 }, (_, i) => img(String(i)));
    render(<ShowView {...urls} items={items} nextPage={2} loadMore={loadMore} onBack={vi.fn()} intervalMs={8000} />);
    for (let i = 0; i < 3; i++) fireEvent.keyDown(window, { keyCode: 39 });
    expect(loadMore).toHaveBeenCalledWith(2);
  });

  describe('overlay', () => {
    const dated: Asset[] = [{ id: 'a', type: 'IMAGE', durationMs: null, takenAt: '2025-10-12T14:05:00.000Z' }, { id: 'b', type: 'IMAGE', durationMs: null, takenAt: null }];
    const view = () => <ShowView {...urls} items={dated} nextPage={null} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} albumName="Wakacje" />;
    const hud = () => document.querySelector('.hud')!;

    it('shows album name, capture date and position', () => {
      render(view());
      expect(hud().textContent).toContain('Wakacje');
      expect(hud().textContent).toContain('12 października 2025');
      expect(hud().textContent).toContain('1 / 2');
    });

    it('shows the album total instead of the number of items loaded so far', () => {
      render(<ShowView {...urls} items={dated} nextPage={2} total={13066} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} />);
      expect(hud().textContent).toContain('1 / 13\u00a0066');
    });

    it('stays visible while paused, hides while playing and returns on any key', () => {
      render(view());
      act(() => { vi.advanceTimersByTime(20000); });
      expect(hud().className).toContain('visible');
      fireEvent.keyDown(window, { keyCode: 13 });
      act(() => { vi.advanceTimersByTime(6000); });
      expect(hud().className).not.toContain('visible');
      fireEvent.keyDown(window, { keyCode: 39 });
      expect(hud().className).toContain('visible');
    });

    it('draws a progress bar for the photo interval only while playing', () => {
      render(view());
      expect(document.querySelector('.progress')).toBeNull();
      fireEvent.keyDown(window, { keyCode: 13 });
      const bar = document.querySelector('.progress') as HTMLElement;
      expect(bar).toBeTruthy();
      expect(bar.style.animationDuration).toBe('8000ms');
    });

    it('draws no progress bar on a video, which advances when it ends', () => {
      render(<ShowView {...urls} items={[{ id: 'v', type: 'VIDEO', durationMs: 5000, takenAt: null }, ...dated]} nextPage={null} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} />);
      fireEvent.keyDown(window, { keyCode: 13 });
      expect(document.querySelector('.progress')).toBeNull();
    });
  });

  describe('framing', () => {
    const one = [{ id: 'p', type: 'IMAGE' as const, durationMs: null, takenAt: null }];
    const view = (extra: Record<string, unknown> = {}) => render(<ShowView {...urls} items={one} nextPage={null} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} {...extra} />);
    const loaded = (w: number, h: number) => {
      const img = document.querySelector('img.current') as HTMLImageElement;
      Object.defineProperty(img, 'naturalWidth', { value: w, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: h, configurable: true });
      fireEvent.load(img);
    };

    it('fills the side bars of a portrait photo with a blurred copy of it', () => {
      view();
      expect(document.querySelector('.bg')).toBeNull();
      loaded(1080, 1920);
      expect(document.querySelector('.bg img')!.getAttribute('src')).toBe('thumb://p');
    });

    it('does the same for a 4:3 photo, which also leaves bars', () => {
      view();
      loaded(1600, 1200);
      expect(document.querySelector('.bg')).toBeTruthy();
    });

    it('adds no background to a photo that fills a 16:9 screen', () => {
      view();
      loaded(1920, 1080);
      expect(document.querySelector('.bg')).toBeNull();
    });

    it('drifts landscape photos only when motion is on and the show is playing', () => {
      view({ motion: true });
      loaded(1920, 1080);
      expect(document.querySelector('img.current')!.className).not.toContain('drift');
      fireEvent.keyDown(window, { keyCode: 13 });
      const img = document.querySelector('img.current') as HTMLElement;
      expect(img.className).toContain('drift');
      expect(img.style.getPropertyValue('--drift-ms')).toBe('9000ms');
    });

    it('keeps photos still when motion is off', () => {
      view({ motion: false });
      loaded(1920, 1080);
      fireEvent.keyDown(window, { keyCode: 13 });
      expect(document.querySelector('img.current')!.className).not.toContain('drift');
    });

    it('never moves a portrait photo', () => {
      view({ motion: true });
      loaded(1080, 1920);
      fireEvent.keyDown(window, { keyCode: 13 });
      expect(document.querySelector('img.current')!.className).not.toContain('drift');
    });

    it('forgets the previous photo shape when the next one is shown', () => {
      render(<ShowView {...urls} items={[...one, { id: 'q', type: 'IMAGE', durationMs: null, takenAt: null }]} nextPage={null} loadMore={vi.fn()} onBack={vi.fn()} intervalMs={8000} />);
      loaded(1080, 1920);
      expect(document.querySelector('.bg')).toBeTruthy();
      fireEvent.keyDown(window, { keyCode: 39 });
      expect(document.querySelector('.bg')).toBeNull();
    });
  });
});
