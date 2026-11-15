import { describe, it, expect, vi } from 'vitest';
import albums from './fixtures/albums.json';
import images from './fixtures/search-images.json';
import video from './fixtures/search-video.json';
import buckets from './fixtures/timeline-buckets.json';
import { createClient, normalizeBaseUrl } from '../src/immich-client';

const cfg = { baseUrl: 'http://192.168.1.10:2283/', apiKey: 'KEY' };
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

describe('normalizeBaseUrl', () => {
  it('adds http scheme and strips trailing slash and /api', () => {
    expect(normalizeBaseUrl('192.168.1.10:2283/')).toBe('http://192.168.1.10:2283');
    expect(normalizeBaseUrl('https://photos.example.com/api/')).toBe('https://photos.example.com');
  });
});

describe('listAlbums', () => {
  it('sends the api key header and maps recorded albums, skipping empty ones', async () => {
    const f = vi.fn().mockResolvedValue(ok(albums));
    const list = await createClient(cfg, f).listAlbums();
    expect(f).toHaveBeenCalledWith('http://192.168.1.10:2283/api/albums', { headers: { 'x-api-key': 'KEY' } });
    expect(list.every((a) => a.assetCount > 0)).toBe(true);
    expect(list[0]).toEqual({
      id: albums[0].id, name: albums[0].albumName, assetCount: albums[0].assetCount,
      thumbnailAssetId: albums[0].albumThumbnailAssetId,
      startDate: albums[0].startDate,
      endDate: albums[0].endDate,
    });
  });

  it('keeps an album whose thumbnail asset is missing', async () => {
    const a = { ...albums[1], albumThumbnailAssetId: null };
    const list = await createClient(cfg, vi.fn().mockResolvedValue(ok([a]))).listAlbums();
    expect(list[0].thumbnailAssetId).toBeNull();
  });

  it('keeps album dates as null when Immich has none', async () => {
    const a = { ...albums[1], startDate: undefined, endDate: undefined };
    const list = await createClient(cfg, vi.fn().mockResolvedValue(ok([a]))).listAlbums();
    expect(list[0]).toMatchObject({ startDate: null, endDate: null });
  });

  it('throws a readable error on 401/403', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) } as Response);
    await expect(createClient(cfg, f).listAlbums()).rejects.toThrow('403');
  });
});

describe('listAssets', () => {
  it('posts a metadata search for the album and maps images and videos', async () => {
    const f = vi.fn().mockResolvedValueOnce(ok(images));
    const res = await createClient(cfg, f).listAssets({ kind: 'album', id: 'album-1' }, 1);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://192.168.1.10:2283/api/search/metadata');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ albumIds: ['album-1'], page: 1, size: 100 });
    expect(res.items[0]).toMatchObject({ id: images.assets.items[0].id, type: 'IMAGE', durationMs: null, takenAt: images.assets.items[0].localDateTime });
  });

  it('tolerates an asset without a capture date', async () => {
    const stripped = { assets: { ...images.assets, items: [{ ...images.assets.items[0], localDateTime: undefined }] } };
    const res = await createClient(cfg, vi.fn().mockResolvedValue(ok(stripped))).listAssets({ kind: 'album', id: 'a' }, 1);
    expect(res.items[0].takenAt).toBeNull();
  });

  it('exposes video duration in ms and the next page', async () => {
    const f = vi.fn().mockResolvedValue(ok(video));
    const res = await createClient(cfg, f).listAssets({ kind: 'album', id: 'album-1' }, 1);
    expect(res.items[0].type).toBe('VIDEO');
    expect(res.items[0].durationMs).toBe(video.assets.items[0].duration);
    expect(res.nextPage).toBe(video.assets.nextPage === null ? null : Number(video.assets.nextPage));
  });
});

describe('listAssets for a year', () => {
  it('searches the whole calendar year, newest first', async () => {
    const f = vi.fn().mockResolvedValueOnce(ok(images));
    await createClient(cfg, f).listAssets({ kind: 'year', year: 2024 }, 3);
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({
      takenAfter: '2024-01-01T00:00:00.000Z', takenBefore: '2025-01-01T00:00:00.000Z', order: 'desc', page: 3, size: 100,
    });
    expect(JSON.parse(f.mock.calls[0][1].body).albumIds).toBeUndefined();
  });
});

describe('listYears', () => {
  const route = (url: string, _init?: RequestInit) => {
    if (url.includes('/timeline/buckets')) return Promise.resolve(ok(buckets));
    return Promise.resolve(ok(images));
  };

  it('sums the monthly buckets per year, newest year first', async () => {
    const f = vi.fn(route);
    const years = await createClient(cfg, f as unknown as typeof fetch).listYears();
    expect(f.mock.calls[0][0]).toBe('http://192.168.1.10:2283/api/timeline/buckets?size=MONTH');
    const sum2025 = buckets.filter((b) => b.timeBucket.startsWith('2025')).reduce((n, b) => n + b.count, 0);
    expect(years.map((y) => y.year)).toEqual([2026, 2025, 2024, 2016]);
    expect(years.find((y) => y.year === 2025)!.count).toBe(sum2025);
  });

  it('takes the cover of each year from its newest photo', async () => {
    const f = vi.fn(route);
    const years = await createClient(cfg, f as unknown as typeof fetch).listYears();
    expect(years.every((y) => y.coverAssetId === images.assets.items[0].id)).toBe(true);
    const coverCall = f.mock.calls.find((c) => String(c[0]).includes('/search/metadata'))!;
    expect(JSON.parse(String(coverCall[1]!.body))).toMatchObject({ size: 1, order: 'desc' });
  });

  it('still lists a year whose cover lookup fails', async () => {
    const f = vi.fn((url: string) => url.includes('/timeline/buckets') ? Promise.resolve(ok(buckets)) : Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response));
    const years = await createClient(cfg, f as unknown as typeof fetch).listYears();
    expect(years.length).toBe(4);
    expect(years[0].coverAssetId).toBeNull();
  });
});

describe('media urls', () => {
  const c = createClient(cfg, vi.fn());
  it('puts the api key in the query because img and video cannot send headers', () => {
    expect(c.previewUrl('a')).toBe('http://192.168.1.10:2283/api/assets/a/thumbnail?size=preview&apiKey=KEY');
    expect(c.thumbUrl('a')).toBe('http://192.168.1.10:2283/api/assets/a/thumbnail?size=thumbnail&apiKey=KEY');
    expect(c.videoUrl('a')).toBe('http://192.168.1.10:2283/api/assets/a/video/playback?apiKey=KEY');
  });
  it('encodes special characters in the key', () => {
    const e = createClient({ ...cfg, apiKey: 'a+b/c' }, vi.fn());
    expect(e.previewUrl('x')).toContain('apiKey=a%2Bb%2Fc');
  });
});
