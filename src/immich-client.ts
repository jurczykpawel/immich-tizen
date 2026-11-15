export interface Config { baseUrl: string; apiKey: string }
export interface Album { id: string; name: string; assetCount: number; thumbnailAssetId: string | null; startDate: string | null; endDate: string | null }
export interface YearInfo { year: number; count: number; coverAssetId: string | null }
export type AssetSource = { kind: 'album'; id: string } | { kind: 'year'; year: number }
export interface Asset { id: string; type: 'IMAGE' | 'VIDEO'; durationMs: number | null; takenAt: string | null }
export interface AssetPage { items: Asset[]; nextPage: number | null }
type Fetch = typeof fetch;

const PAGE_SIZE = 100;

export function normalizeBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

export function createClient(cfg: Config, f: Fetch = (...a) => fetch(...a)) {
  const base = normalizeBaseUrl(cfg.baseUrl);
  const key = encodeURIComponent(cfg.apiKey);
  const media = (id: string, path: string) => `${base}/api/assets/${id}/${path}`;

  async function check(res: Response): Promise<Response> {
    if (!res.ok) throw new Error(`Immich ${res.status}`);
    return res;
  }

  async function search(body: object): Promise<{ assets: { items: Array<{ id: string; type: string; duration?: number | null; localDateTime?: string | null }>; nextPage?: string | null } }> {
    const res = await check(await f(`${base}/api/search/metadata`, {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }));
    return res.json();
  }

  return {
    async listAlbums(): Promise<Album[]> {
      const res = await check(await f(`${base}/api/albums`, { headers: { 'x-api-key': cfg.apiKey } }));
      const raw = (await res.json()) as Array<{ id: string; albumName: string; assetCount: number; albumThumbnailAssetId: string | null; startDate?: string; endDate?: string }>;
      return raw
        .filter((a) => a.assetCount > 0)
        .map((a) => ({ id: a.id, name: a.albumName, assetCount: a.assetCount, thumbnailAssetId: a.albumThumbnailAssetId ?? null, startDate: a.startDate || null, endDate: a.endDate || null }));
    },

    async listAssets(source: AssetSource, page: number): Promise<AssetPage> {
      const filter = source.kind === 'album'
        ? { albumIds: [source.id] }
        : { takenAfter: `${source.year}-01-01T00:00:00.000Z`, takenBefore: `${source.year + 1}-01-01T00:00:00.000Z`, order: 'desc' };
      const { assets } = await search({ ...filter, page, size: PAGE_SIZE });
      return {
        items: assets.items
          .filter((a) => a.type === 'IMAGE' || a.type === 'VIDEO')
          .map((a) => ({ id: a.id, type: a.type as Asset['type'], durationMs: a.type === 'VIDEO' ? a.duration ?? null : null, takenAt: a.localDateTime ?? null })),
        nextPage: assets.nextPage ? Number(assets.nextPage) : null,
      };
    },

    /** Years that have photos (newest first), each with its photo count and the newest photo as cover. */
    async listYears(): Promise<YearInfo[]> {
      const res = await check(await f(`${base}/api/timeline/buckets?size=MONTH`, { headers: { 'x-api-key': cfg.apiKey } }));
      const buckets = (await res.json()) as Array<{ timeBucket: string; count: number }>;
      const counts = new Map<number, number>();
      for (const b of buckets) counts.set(Number(b.timeBucket.slice(0, 4)), (counts.get(Number(b.timeBucket.slice(0, 4))) ?? 0) + b.count);
      const years = Array.from(counts.keys()).sort((a, b) => b - a);
      return Promise.all(years.map(async (year) => {
        const cover = await search({ takenAfter: `${year}-01-01T00:00:00.000Z`, takenBefore: `${year + 1}-01-01T00:00:00.000Z`, order: 'desc', size: 1 }).then((r) => r.assets.items[0]?.id ?? null, () => null);
        return { year, count: counts.get(year) ?? 0, coverAssetId: cover };
      }));
    },

    previewUrl: (id: string) => `${media(id, 'thumbnail')}?size=preview&apiKey=${key}`,
    thumbUrl: (id: string) => `${media(id, 'thumbnail')}?size=thumbnail&apiKey=${key}`,
    videoUrl: (id: string) => `${media(id, 'video/playback')}?apiKey=${key}`,
  };
}
