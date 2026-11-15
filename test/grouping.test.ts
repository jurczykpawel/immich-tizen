import { describe, expect, it } from 'vitest';
import { groupAlbumsByYear, groupYearsByDecade, yearLabel } from '../src/grouping';
import type { Album } from '../src/immich-client';

const album = (id: string, startDate: string | null, endDate: string | null = startDate): Album =>
  ({ id, name: id, assetCount: 3, thumbnailAssetId: null, startDate, endDate });

describe('groupAlbumsByYear', () => {
  it('puts each album under the year it starts, newest year first', () => {
    const rows = groupAlbumsByYear([album('a', '2016-10-01T00:00:00.000Z'), album('b', '2026-03-02T00:00:00.000Z'), album('c', '2016-02-01T00:00:00.000Z')]);
    expect(rows.map((r) => r.year)).toEqual([2026, 2016]);
    expect(rows[1].albums.map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('orders albums inside a year by start date, newest first', () => {
    const rows = groupAlbumsByYear([album('old', '2024-01-05T00:00:00.000Z'), album('new', '2024-09-05T00:00:00.000Z')]);
    expect(rows[0].albums.map((a) => a.id)).toEqual(['new', 'old']);
  });

  it('collects albums without a date in a last row', () => {
    const rows = groupAlbumsByYear([album('x', null), album('y', '2020-01-01T00:00:00.000Z')]);
    expect(rows.map((r) => r.year)).toEqual([2020, null]);
    expect(rows[1].albums.map((a) => a.id)).toEqual(['x']);
  });

  it('returns no rows for no albums', () => {
    expect(groupAlbumsByYear([])).toEqual([]);
  });
});

describe('yearLabel', () => {
  it('shows the year, and a name for photos without a date', () => {
    expect(yearLabel(2024)).toBe('2024');
    expect(yearLabel(null)).toBe('Bez daty');
    expect(yearLabel(1970)).toBe('Bez daty');
  });
});

describe('groupYearsByDecade', () => {
  const y = (year: number) => ({ year, count: year, coverAssetId: null });

  it('makes one row per decade, newest first, years newest first inside', () => {
    const rows = groupYearsByDecade([y(2026), y(2025), y(2019), y(2016), y(1993)]);
    expect(rows.map((r) => r.title)).toEqual(['2020–2029', '2010–2019', '1990–1999']);
    expect(rows[1].years.map((i) => i.year)).toEqual([2019, 2016]);
  });

  it('puts photos without a date in a last row', () => {
    const rows = groupYearsByDecade([y(2025), y(1970)]);
    expect(rows.map((r) => r.title)).toEqual(['2020–2029', 'Bez daty']);
  });

  it('returns no rows for no years', () => {
    expect(groupYearsByDecade([])).toEqual([]);
  });
});
