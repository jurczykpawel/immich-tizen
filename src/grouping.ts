import type { Album, YearInfo } from './immich-client';

export interface YearRow { year: number | null; albums: Album[] }

const yearOf = (iso: string | null) => (iso ? Number(iso.slice(0, 4)) : null);

/** Rows for the album screen: one per year an album starts in (newest first), then albums without dates. */
export function groupAlbumsByYear(albums: Album[]): YearRow[] {
  const byYear = new Map<number | null, Album[]>();
  for (const a of albums) {
    const y = yearOf(a.startDate);
    byYear.set(y, [...(byYear.get(y) ?? []), a]);
  }
  const years = Array.from(byYear.keys()).filter((y): y is number => y !== null).sort((a, b) => b - a);
  const rows: YearRow[] = years.map((year) => ({ year, albums: byYear.get(year)!.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')) }));
  return byYear.has(null) ? [...rows, { year: null, albums: byYear.get(null)! }] : rows;
}

/** Photos without any date are stored by Immich under 1970. */
export const yearLabel = (year: number | null): string => (year === null || year === 1970 ? 'Bez daty' : String(year));

export interface DecadeRow { title: string; years: YearInfo[] }

/** Rows for the "all photos" screen: one per decade (newest first), then undated photos. */
export function groupYearsByDecade(years: YearInfo[]): DecadeRow[] {
  const dated = years.filter((y) => y.year !== 1970).sort((a, b) => b.year - a.year);
  const rows: DecadeRow[] = [];
  for (const y of dated) {
    const start = Math.floor(y.year / 10) * 10;
    const title = `${start}–${start + 9}`;
    const last = rows[rows.length - 1];
    if (last && last.title === title) last.years.push(y);
    else rows.push({ title, years: [y] });
  }
  const undated = years.filter((y) => y.year === 1970);
  return undated.length ? [...rows, { title: 'Bez daty', years: undated }] : rows;
}
