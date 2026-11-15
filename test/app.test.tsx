import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import albums from './fixtures/albums.json';
import images from './fixtures/search-images.json';
import buckets from './fixtures/timeline-buckets.json';
import { App } from '../src/app';
import { sendConfig, parsePairingUrl } from '../src/pairing/pairing';
import { memoryRelay } from './helpers/memory-relay';

afterEach(cleanup);
// Press a key until its effect shows. Not waitFor: its MutationObserver would re-run the callback, and fire the key twice.
const pressUntil = async (keyCode: number, done: () => unknown) => {
  for (let i = 0; i < 40 && !done(); i++) {
    fireEvent.keyDown(window, { keyCode });
    if (!done()) await new Promise((r) => setTimeout(r, 25));
  }
  expect(done()).toBeTruthy();
};
const albumsShown = () => document.querySelector('[data-card]');

class MemStorage {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
}
const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
const configured = () => {
  const s = new MemStorage();
  s.setItem('immich-tv-config', JSON.stringify({ baseUrl: 'http://immich.lan:2283', apiKey: 'K' }));
  return s;
};

describe('App', () => {
  it('offers manual setup when nothing is configured and no relay is available', () => {
    render(<App storage={new MemStorage()} fetchImpl={vi.fn()} />);
    expect(screen.getByText(/połącz z immich/i)).toBeTruthy();
    expect(document.querySelector('form.manual')).toBeTruthy();
  });

  it('saves a manually entered config and lists albums', async () => {
    const storage = new MemStorage();
    const f = vi.fn((url: string) => Promise.resolve(url.endsWith('/albums') ? res(albums) : url.includes('/timeline/buckets') ? res(buckets) : res(images)));
    render(<App storage={storage} fetchImpl={f as unknown as typeof fetch} />);
    fireEvent.input(document.querySelector('[name=address]')!, { target: { value: 'immich.lan:2283' } });
    fireEvent.input(document.querySelector('[name=key]')!, { target: { value: 'K' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(document.querySelector('[data-card]')).toBeTruthy());
    expect(storage.getItem('immich-tv-config')).toContain('http://immich.lan:2283');
  });

  it('switches between the QR screen and manual entry', async () => {
    const pairing = { relay: memoryRelay(), relayUrl: 'https://relay.example.com', pageUrl: 'https://pair.example.com/pair.html' };
    render(<App storage={new MemStorage()} fetchImpl={vi.fn()} pairing={pairing} />);
    await waitFor(() => expect(document.querySelector('svg.qr')).toBeTruthy());
    await pressUntil(13, () => document.querySelector('form.manual'));
    expect(document.querySelector('svg.qr')).toBeNull();
    await pressUntil(10009, () => document.querySelector('svg.qr'));
  });

  it('lists albums, opens one on Enter and shows its first photo', async () => {
    const f = vi.fn((url: string) => Promise.resolve(url.endsWith('/albums') ? res(albums) : url.includes('/timeline/buckets') ? res(buckets) : res(images)));
    render(<App storage={configured()} fetchImpl={f as unknown as typeof fetch} />);
    await waitFor(() => expect(albumsShown()).toBeTruthy());
    await pressUntil(13, () => document.querySelector('img.current'));
    expect(document.querySelector('img.current')!.getAttribute('src')).toContain(`/api/assets/${images.assets.items[0].id}/thumbnail?size=preview`);
  });

  it('returns to albums on Back', async () => {
    const f = vi.fn((url: string) => Promise.resolve(url.endsWith('/albums') ? res(albums) : url.includes('/timeline/buckets') ? res(buckets) : res(images)));
    render(<App storage={configured()} fetchImpl={f as unknown as typeof fetch} />);
    await waitFor(() => expect(albumsShown()).toBeTruthy());
    await pressUntil(13, () => document.querySelector('.show'));
    await pressUntil(10009, albumsShown);
  });

  describe('settings and navigation', () => {
    const f = () => vi.fn((url: string) => Promise.resolve(url.endsWith('/albums') ? res(albums) : url.includes('/timeline/buckets') ? res(buckets) : res(images))) as unknown as typeof fetch;
    const pairing = () => ({ relay: memoryRelay(), relayUrl: 'https://relay.example.com', pageUrl: 'https://pair.example.com/pair.html' });
    const openSettings = async (props: Record<string, unknown> = {}) => {
      const storage = (props.storage as MemStorage) ?? configured();
      render(<App storage={storage} fetchImpl={f()} {...props} />);
      await waitFor(() => expect(albumsShown()).toBeTruthy());
      await pressUntil(37, () => document.querySelector('.menu.open'));
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 13 });
      await waitFor(() => expect(document.querySelector('.settings')).toBeTruthy());
      return storage;
    };

    it('Back goes from the album list to the side menu and from there out of the app', async () => {
      const onExit = vi.fn();
      render(<App storage={configured()} fetchImpl={f()} onExit={onExit} />);
      await waitFor(() => expect(albumsShown()).toBeTruthy());
      await pressUntil(10009, () => document.querySelector('.menu.open'));
      expect(onExit).not.toHaveBeenCalled();
      await pressUntil(10009, () => onExit.mock.calls.length > 0);
    });

    it('opens a slideshow of a whole year from the years section', async () => {
      const fetchSpy = f();
      render(<App storage={configured()} fetchImpl={fetchSpy} />);
      await waitFor(() => expect(albumsShown()).toBeTruthy());
      await pressUntil(37, () => document.querySelector('.menu.open'));
      fireEvent.keyDown(window, { keyCode: 40 });
      await waitFor(() => expect(document.querySelector('[data-section=years] [data-card]')).toBeTruthy());
      fireEvent.keyDown(window, { keyCode: 39 });
      await pressUntil(13, () => document.querySelector('.show'));
      const bodies = (fetchSpy as unknown as { mock: { calls: Array<[string, { body?: string }?]> } }).mock.calls.map((c) => c[1]?.body).filter(Boolean) as string[];
      expect(bodies.some((b) => JSON.parse(b).takenAfter === '2026-01-01T00:00:00.000Z' && JSON.parse(b).size === 100)).toBe(true);
    });

    it('opens settings from the top bar and returns to the albums with Back', async () => {
      await openSettings();
      await pressUntil(10009, albumsShown);
    });

    it('saves a changed slideshow interval', async () => {
      const storage = await openSettings();
      await pressUntil(39, () => (storage.getItem('immich-tv-settings') ?? '').includes('15'));
      expect(document.querySelector('.settings')!.textContent).toContain('15 s');
    });

    it('saves the photo motion switch', async () => {
      const storage = await openSettings();
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 13 });
      expect(JSON.parse(storage.getItem('immich-tv-settings')!)).toMatchObject({ motion: true });
      expect(document.querySelector('.settings')!.textContent).toContain('Włączony');
    });

    it('enters the connection by hand and reconnects with it', async () => {
      const storage = await openSettings();
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 13 });
      await waitFor(() => expect(document.querySelector('form.manual')).toBeTruthy());
      fireEvent.input(document.querySelector('[name=address]')!, { target: { value: 'other.lan:2283' } });
      fireEvent.input(document.querySelector('[name=key]')!, { target: { value: 'K2' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => expect(albumsShown()).toBeTruthy());
      expect(storage.getItem('immich-tv-config')).toContain('other.lan');
    });

    it('goes back from manual entry to settings', async () => {
      await openSettings();
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 13 });
      await waitFor(() => expect(document.querySelector('form.manual')).toBeTruthy());
      await pressUntil(10009, () => document.querySelector('.settings'));
    });

    it('shows the QR from settings when pairing is available and returns with Back', async () => {
      await openSettings({ pairing: pairing() });
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 13 });
      await waitFor(() => expect(document.querySelector('svg.qr')).toBeTruthy());
      await pressUntil(10009, () => document.querySelector('.settings'));
    });

    it('clears the saved connection after a second OK and falls back to setup', async () => {
      const storage = await openSettings();
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 40 });
      fireEvent.keyDown(window, { keyCode: 13 });
      expect(storage.getItem('immich-tv-config')).not.toBeNull();
      fireEvent.keyDown(window, { keyCode: 13 });
      await waitFor(() => expect(document.querySelector('form.manual')).toBeTruthy());
      expect(storage.getItem('immich-tv-config')).toBeNull();
    });

    it('exits the app on Back from the first-run QR screen', async () => {
      const onExit = vi.fn();
      render(<App storage={new MemStorage()} fetchImpl={vi.fn()} pairing={pairing()} onExit={onExit} />);
      await waitFor(() => expect(document.querySelector('svg.qr')).toBeTruthy());
      await pressUntil(10009, () => onExit.mock.calls.length > 0);
    });

    it('opens settings from the error screen with Back', async () => {
      render(<App storage={configured()} fetchImpl={vi.fn().mockResolvedValue(res({}, 403)) as unknown as typeof fetch} />);
      await waitFor(() => expect(screen.getByText(/odrzucił klucz API/i)).toBeTruthy());
      await pressUntil(10009, () => document.querySelector('.settings'));
    });
  });

  it('shows a readable error and lets the user reset the config when the server rejects the key', async () => {
    const f = vi.fn().mockResolvedValue(res({}, 403));
    render(<App storage={configured()} fetchImpl={f as unknown as typeof fetch} />);
    await waitFor(() => expect(screen.getByText(/odrzucił klucz API \(kod 403\)/i)).toBeTruthy());
  });

  it('explains a network failure in plain Polish instead of a raw browser message', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App storage={configured()} fetchImpl={f as unknown as typeof fetch} />);
    await waitFor(() => expect(screen.getByText(/brak połączenia z serwerem/i)).toBeTruthy());
    expect(screen.queryByText(/failed to fetch/i)).toBeNull();
  });

  it('tells the user to enter data by hand when the QR cannot be prepared', async () => {
    vi.stubGlobal('crypto', {});
    try {
      const pairing = { relay: memoryRelay(), relayUrl: 'https://relay.example.com', pageUrl: 'https://pair.example.com/pair.html' };
      render(<App storage={new MemStorage()} fetchImpl={vi.fn()} pairing={pairing} />);
      await waitFor(() => expect(screen.getByText(/nie udało się przygotować kodu/i)).toBeTruthy());
      expect(screen.queryByText(/generateKey/)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('pairs through the QR screen, saves the config and then lists albums', async () => {
    const relay = memoryRelay();
    const storage = new MemStorage();
    const f = vi.fn((url: string) => Promise.resolve(url.endsWith('/albums') ? res(albums) : url.includes('/timeline/buckets') ? res(buckets) : res(images)));
    render(<App storage={storage} fetchImpl={f as unknown as typeof fetch} pairing={{ relay, relayUrl: 'https://relay.example.com', pageUrl: 'https://pair.example.com/pair.html' }} />);
    await waitFor(() => expect(document.querySelector('svg.qr')).toBeTruthy());
    const url = document.querySelector('[data-pair-url]')!.getAttribute('data-pair-url')!;
    await sendConfig(relay, parsePairingUrl(url.slice(url.indexOf('#')))!, { baseUrl: 'http://immich.lan:2283', apiKey: 'K' });
    await waitFor(() => expect(document.querySelector('[data-card]')).toBeTruthy());
    expect(storage.getItem('immich-tv-config')).toContain('immich.lan');
  });
});
