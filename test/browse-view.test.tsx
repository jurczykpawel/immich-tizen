import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { BrowseView } from '../src/browse-view';
import type { Album, YearInfo } from '../src/immich-client';

afterEach(cleanup);

const album = (id: string, startDate: string | null, assetCount = 5): Album => ({ id, name: `Album ${id}`, assetCount, thumbnailAssetId: `t-${id}`, startDate, endDate: startDate });
const albums: Album[] = [
  album('a', '2026-03-01T00:00:00.000Z', 13066), album('b', '2026-01-01T00:00:00.000Z'), album('c', '2026-01-01T00:00:00.000Z'),
  album('d', '2025-05-01T00:00:00.000Z'), album('e', '2025-02-01T00:00:00.000Z'),
];
const years: YearInfo[] = [{ year: 2026, count: 1200, coverAssetId: 'y26' }, { year: 2025, count: 40, coverAssetId: 'y25' }, { year: 2015, count: 7, coverAssetId: null }];

const base = { albums, years, thumbUrl: (id: string) => `thumb://${id}`, onOpenAlbum: vi.fn(), onOpenYear: vi.fn(), onSettings: vi.fn(), onExit: vi.fn() };
const key = (keyCode: number) => fireEvent.keyDown(window, { keyCode });
const focusedCard = () => document.querySelector('.card.focused')?.getAttribute('data-card');
const cards = () => Array.from(document.querySelectorAll('[data-card]')).map((c) => c.getAttribute('data-card'));
const menuFocused = () => document.querySelector('[data-menu].focused')?.getAttribute('data-menu');
const menuSelected = () => document.querySelector('[data-menu].selected')?.getAttribute('data-menu');

describe('BrowseView: albums by year', () => {
  it('lists albums in one row per year, newest year first', () => {
    render(<BrowseView {...base} />);
    expect(Array.from(document.querySelectorAll('.row-title')).map((e) => e.textContent)).toEqual(['2026', '2025']);
    expect(cards()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(screen.getByText('Album a')).toBeTruthy();
  });

  it('focuses the first card and moves with the arrows, also between rows', () => {
    render(<BrowseView {...base} />);
    expect(focusedCard()).toBe('a');
    key(39); expect(focusedCard()).toBe('b');
    key(40); expect(focusedCard()).toBe('e');
    key(38); expect(focusedCard()).toBe('b');
  });

  it('opens the focused album on OK', () => {
    const onOpenAlbum = vi.fn();
    render(<BrowseView {...base} onOpenAlbum={onOpenAlbum} />);
    key(39); key(13);
    expect(onOpenAlbum).toHaveBeenCalledWith(albums[1]);
  });

  it('tells the user when there are no albums', () => {
    render(<BrowseView {...base} albums={[]} />);
    expect(screen.getByText(/brak albumów/i)).toBeTruthy();
  });
});

describe('BrowseView: side menu', () => {
  it('lists the sections', () => {
    render(<BrowseView {...base} />);
    expect(Array.from(document.querySelectorAll('[data-menu]')).map((e) => e.getAttribute('data-menu'))).toEqual(['albums', 'years', 'settings']);
    expect(menuSelected()).toBe('albums');
  });

  it('is reached with Left from the first card and left with Right', () => {
    render(<BrowseView {...base} />);
    key(37);
    expect(menuFocused()).toBe('albums');
    expect(focusedCard()).toBeUndefined();
    key(39);
    expect(menuFocused()).toBeUndefined();
    expect(focusedCard()).toBe('a');
  });

  it('does not leave the row when Left is pressed on a later card', () => {
    render(<BrowseView {...base} />);
    key(39); key(37);
    expect(menuFocused()).toBeUndefined();
    expect(focusedCard()).toBe('a');
  });

  it('switches the section while moving over the menu', () => {
    render(<BrowseView {...base} />);
    key(37); key(40);
    expect(menuSelected()).toBe('years');
    expect(document.querySelector('.rows')!.getAttribute('data-section')).toBe('years');
  });

  it('opens settings on OK when the settings item is focused', () => {
    const onSettings = vi.fn();
    render(<BrowseView {...base} onSettings={onSettings} />);
    key(37); key(40); key(40);
    expect(menuFocused()).toBe('settings');
    key(13);
    expect(onSettings).toHaveBeenCalled();
  });

  it('OK on a content section moves focus into it', () => {
    render(<BrowseView {...base} />);
    key(37); key(13);
    expect(focusedCard()).toBe('a');
  });

  it('Back moves from content to the menu, and from the menu leaves the app', () => {
    const onExit = vi.fn();
    render(<BrowseView {...base} onExit={onExit} />);
    key(10009);
    expect(menuFocused()).toBe('albums');
    expect(onExit).not.toHaveBeenCalled();
    key(10009);
    expect(onExit).toHaveBeenCalled();
  });
});

describe('BrowseView: years', () => {
  const openYears = () => { render(<BrowseView {...base} />); key(37); key(40); key(39); };

  it('shows every year with its photo count, in rows by decade', () => {
    openYears();
    expect(Array.from(document.querySelectorAll('.row-title')).map((e) => e.textContent)).toEqual(['2020–2029', '2010–2019']);
    expect(cards()).toEqual(['2026', '2025', '2015']);
    expect(screen.getByText('1 200 pozycji'.replace(/ /g, ' '))).toBeTruthy();
  });

  it('opens a slideshow of the focused year on OK', () => {
    const onOpenYear = vi.fn();
    render(<BrowseView {...base} onOpenYear={onOpenYear} />);
    key(37); key(40); key(39); key(39); key(13);
    expect(onOpenYear).toHaveBeenCalledWith(2025);
  });

  it('shows a loading state while the years are not known yet', () => {
    render(<BrowseView {...base} years={null} />);
    key(37); key(40);
    expect(screen.getByText(/ładowanie lat/i)).toBeTruthy();
  });

  it('shows placeholders for a year without a cover', () => {
    openYears();
    expect(document.querySelector('[data-card="2015"] .noimg')).toBeTruthy();
  });
});

describe('BrowseView: remembered position', () => {
  it('starts where it was left and reports every change', () => {
    const onChange = vi.fn();
    render(<BrowseView {...base} initial={{ section: 'albums', zone: 'content', pos: { albums: { row: 1, col: 1 }, years: { row: 0, col: 0 } } }} onChange={onChange} />);
    expect(focusedCard()).toBe('e');
    key(37);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ section: 'albums', pos: expect.objectContaining({ albums: { row: 1, col: 0 } }) }));
    expect(focusedCard()).toBe('d');
  });
});
