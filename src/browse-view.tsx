import { useState } from 'preact/hooks';
import { groupAlbumsByYear, groupYearsByDecade, yearLabel } from './grouping';
import { HintBar } from './hints';
import { AlbumsIcon, CalendarIcon, GearIcon, ImageIcon, LogoMark } from './icons';
import type { Album, YearInfo } from './immich-client';
import { itemsLabel } from './polish';
import { moveInRows, type RowPos } from './rows-nav';
import { useRemote } from './use-remote';

export type Section = 'albums' | 'years';
export interface BrowseState { section: Section; zone: 'menu' | 'content'; pos: Record<Section, RowPos> }

interface Props {
  albums: Album[];
  years: YearInfo[] | null;
  thumbUrl: (assetId: string) => string;
  onOpenAlbum: (a: Album) => void;
  onOpenYear: (year: number) => void;
  onSettings: () => void;
  onExit: () => void;
  initial?: BrowseState;
  onChange?: (s: BrowseState) => void;
}

interface CardData { id: string; title: string; subtitle: string; image: string | null }
interface Shelf { key: string; title: string; cards: CardData[] }

const MENU: Array<{ id: Section | 'settings'; label: string }> = [
  { id: 'albums', label: 'Albumy' },
  { id: 'years', label: 'Lata' },
  { id: 'settings', label: 'Ustawienia' },
];
const ICONS = { albums: <AlbumsIcon size={44} />, years: <CalendarIcon size={44} />, settings: <GearIcon size={44} /> };
const START: BrowseState = { section: 'albums', zone: 'content', pos: { albums: { row: 0, col: 0 }, years: { row: 0, col: 0 } } };

export function BrowseView({ albums, years, thumbUrl, onOpenAlbum, onOpenYear, onSettings, onExit, initial = START, onChange }: Props) {
  const [state, setState] = useState(initial);
  const [menuIndex, setMenuIndex] = useState(() => MENU.findIndex((m) => m.id === initial.section));
  const { section, zone } = state;

  const update = (next: BrowseState) => { setState(next); onChange?.(next); };

  const shelves: Shelf[] = section === 'albums'
    ? groupAlbumsByYear(albums).map((r) => ({ key: String(r.year), title: yearLabel(r.year), cards: r.albums.map((a) => ({ id: a.id, title: a.name, subtitle: itemsLabel(a.assetCount), image: a.thumbnailAssetId })) }))
    : groupYearsByDecade(years ?? []).map((r) => ({ key: r.title, title: r.title, cards: r.years.map((y) => ({ id: String(y.year), title: yearLabel(y.year), subtitle: itemsLabel(y.count), image: y.coverAssetId })) }));
  const lengths = shelves.map((s) => s.cards.length);
  const pos = state.pos[section];

  const open = () => {
    const card = shelves[pos.row]?.cards[pos.col];
    if (!card) return;
    if (section === 'albums') onOpenAlbum(albums.find((a) => a.id === card.id)!);
    else onOpenYear(Number(card.id));
  };

  useRemote((intent) => {
    if (intent === 'back') {
      if (zone === 'content') { setMenuIndex(MENU.findIndex((m) => m.id === section)); update({ ...state, zone: 'menu' }); } else onExit();
      return;
    }
    if (zone === 'menu') {
      if (intent === 'up' || intent === 'down') {
        const next = Math.max(0, Math.min(MENU.length - 1, menuIndex + (intent === 'down' ? 1 : -1)));
        setMenuIndex(next);
        const target = MENU[next].id;
        if (target !== 'settings' && target !== section) update({ ...state, section: target });
      } else if (intent === 'right' || intent === 'select' || intent === 'play') {
        const target = MENU[menuIndex].id;
        if (target === 'settings') { if (intent !== 'right') onSettings(); } else update({ ...state, zone: 'content' });
      }
      return;
    }
    if (intent === 'select' || intent === 'play') return open();
    if (intent === 'left' || intent === 'right' || intent === 'up' || intent === 'down') {
      const move = moveInRows(pos, intent, lengths);
      if (move.edge === 'left') { setMenuIndex(MENU.findIndex((m) => m.id === section)); update({ ...state, zone: 'menu' }); }
      else update({ ...state, pos: { ...state.pos, [section]: move.pos } });
    }
  });

  const title = section === 'albums' ? 'Albumy' : 'Zdjęcia według lat';
  const empty = section === 'albums' ? albums.length === 0 : years !== null && years.length === 0;

  return (
    <div class="screen browse">
      <nav class={`menu${zone === 'menu' ? ' open' : ''}`}>
        <div class="menu-brand"><LogoMark size={64} /></div>
        {MENU.map((m, i) => (
          <div key={m.id} data-menu={m.id} class={`menu-item${zone === 'menu' && menuIndex === i ? ' focused' : ''}${section === m.id ? ' selected' : ''}`}>
            {ICONS[m.id]}<span>{m.label}</span>
          </div>
        ))}
      </nav>
      <section class="content">
        <header class="content-head"><h1>{title}</h1></header>
        {section === 'years' && years === null ? (
          <div class="empty"><ImageIcon size={72} /><p>Ładowanie lat…</p></div>
        ) : empty ? (
          <div class="empty"><ImageIcon size={72} /><p>{section === 'albums' ? 'Brak albumów z zawartością' : 'Brak zdjęć'}</p></div>
        ) : (
          <div class="rows" key={section} data-section={section}>
            {shelves.map((shelf, r) => (
              <div class="shelf" key={shelf.key}>
                <h2 class="row-title">{shelf.title}</h2>
                <div class="track">
                  {shelf.cards.map((c, i) => {
                    const focused = zone === 'content' && r === pos.row && i === pos.col;
                    return (
                      <div key={c.id} data-card={c.id} class={`card${focused ? ' focused' : ''}`} ref={(el) => { if (focused) el?.scrollIntoView?.({ block: 'center', inline: 'nearest' }); }}>
                        <div class="thumb">{c.image ? <img src={thumbUrl(c.image)} alt="" /> : <div class="noimg"><ImageIcon size={64} /></div>}</div>
                        <div class="name">{c.title}</div>
                        <div class="count">{c.subtitle}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <HintBar hints={zone === 'menu'
        ? [{ keys: '▲ ▼', label: 'Sekcja' }, { keys: '▶', label: 'Do zawartości' }, { keys: '↩', label: 'Wyjdź' }]
        : [{ keys: 'Strzałki', label: 'Wybierz' }, { keys: 'OK', label: 'Otwórz pokaz' }, { keys: '↩', label: 'Menu' }]} />
    </div>
  );
}
