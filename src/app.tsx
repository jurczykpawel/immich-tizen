import { useEffect, useMemo, useState } from 'preact/hooks';
import { BrowseView, type BrowseState } from './browse-view';
import { clearConfig, loadConfig, saveConfig } from './config-store';
import { HintBar } from './hints';
import { AlertIcon, ImageIcon, LogoMark } from './icons';
import { createClient, type Album, type Asset, type AssetSource, type Config, type YearInfo } from './immich-client';
import { ManualSetup } from './manual-setup';
import { PairingView, type PairingDeps } from './pairing-view';
import { SettingsView } from './settings-view';
import { loadSettings, saveSettings } from './settings-store';
import { yearLabel } from './grouping';
import { describeError } from './polish';
import { ShowView } from './show-view';
import { useRemote } from './use-remote';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
interface Props { storage: Store; fetchImpl?: typeof fetch; fallback?: Config | null; pairing?: PairingDeps; onExit?: () => void }
type Screen = { name: 'albums' } | { name: 'show'; source: AssetSource; title: string; total: number | null } | { name: 'settings' } | { name: 'pair' } | { name: 'manual' };

const hostOf = (c: Config) => c.baseUrl.replace(/^https?:\/\//, '');

export function App({ storage, fetchImpl, fallback = null, pairing, onExit }: Props) {
  const [config, setConfig] = useState(() => loadConfig(storage) ?? fallback);
  const [screen, setScreen] = useState<Screen>({ name: 'albums' });
  const [settings, setSettings] = useState(() => loadSettings(storage));
  const change = (next: typeof settings) => { setSettings(next); saveSettings(storage, next); };

  const connect = (c: Config) => { saveConfig(storage, c); setConfig(c); setScreen({ name: 'albums' }); };
  const noop = () => {};

  if (!config) {
    return pairing
      ? <PairingView {...pairing} onPaired={connect} onBack={onExit} />
      : <ManualSetup onSubmit={connect} onCancel={onExit} />;
  }
  if (screen.name === 'pair' && pairing) return <PairingView {...pairing} onPaired={connect} onBack={() => setScreen({ name: 'settings' })} />;
  if (screen.name === 'manual') return <ManualSetup onSubmit={connect} onCancel={() => setScreen({ name: 'settings' })} />;
  if (screen.name === 'settings') {
    return (
      <SettingsView
        intervalSec={settings.intervalSec}
        motion={settings.motion}
        server={hostOf(config)}
        onInterval={(sec) => change({ ...settings, intervalSec: sec })}
        onMotion={(motion) => change({ ...settings, motion })}
        onPair={pairing ? () => setScreen({ name: 'pair' }) : undefined}
        onManual={() => setScreen({ name: 'manual' })}
        onReset={() => { clearConfig(storage); setConfig(null); setScreen({ name: 'albums' }); }}
        onBack={() => setScreen({ name: 'albums' })}
      />
    );
  }
  return <Library config={config} fetchImpl={fetchImpl} intervalSec={settings.intervalSec} motion={settings.motion} screen={screen} setScreen={setScreen} onExit={onExit ?? noop} />;
}

function Library({ config, fetchImpl, intervalSec, motion, screen, setScreen, onExit }: { config: Config; fetchImpl?: typeof fetch; intervalSec: number; motion: boolean; screen: Screen; setScreen: (s: Screen) => void; onExit: () => void }) {
  const client = useMemo(() => createClient(config, fetchImpl), [config, fetchImpl]);
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [years, setYears] = useState<YearInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [browse, setBrowse] = useState<BrowseState | undefined>(undefined);

  useEffect(() => {
    setError(null);
    setAlbums(null);
    setYears(null);
    client.listAlbums().then(setAlbums, (e: Error) => setError(e.message));
    client.listYears().then(setYears, () => setYears([]));
  }, [client, attempt]);

  if (error) return <ErrorScreen message={error} onRetry={() => setAttempt((n) => n + 1)} onSettings={() => setScreen({ name: 'settings' })} />;
  if (!albums) return <Loading />;
  if (screen.name === 'show') return <AlbumShow client={client} source={screen.source} title={screen.title} total={screen.total} intervalMs={intervalSec * 1000} motion={motion} onBack={() => setScreen({ name: 'albums' })} />;
  return (
    <BrowseView
      albums={albums}
      years={years}
      thumbUrl={client.thumbUrl}
      initial={browse}
      onChange={setBrowse}
      onOpenAlbum={(a) => setScreen({ name: 'show', source: { kind: 'album', id: a.id }, title: a.name, total: a.assetCount })}
      onOpenYear={(year) => setScreen({ name: 'show', source: { kind: 'year', year }, title: yearLabel(year), total: years?.find((y) => y.year === year)?.count ?? null })}
      onSettings={() => setScreen({ name: 'settings' })}
      onExit={onExit}
    />
  );
}

function Loading() {
  return (
    <div class="screen browse">
      <nav class="menu"><div class="menu-brand"><LogoMark size={64} /></div></nav>
      <section class="content">
        <header class="content-head"><h1>Albumy</h1></header>
        <div class="rows" aria-busy="true">
          <div class="shelf"><div class="track">{Array.from({ length: 5 }, (_, i) => (
            <div class="card skeleton" key={i}><div class="thumb" /><div class="name">&nbsp;</div><div class="count">&nbsp;</div></div>
          ))}</div></div>
        </div>
      </section>
    </div>
  );
}

function ErrorScreen({ message, onRetry, onSettings }: { message: string; onRetry: () => void; onSettings: () => void }) {
  useRemote((intent) => {
    if (intent === 'select') onRetry();
    else if (intent === 'back') onSettings();
  });
  return (
    <div class="screen center">
      <AlertIcon size={96} />
      <h1 class="screen-title">Nie udało się połączyć</h1>
      <p class="lead">{describeError(message)}</p>
      <p class="muted">Sprawdź, czy serwer działa, a telewizor jest w tej samej sieci.</p>
      <HintBar hints={[{ keys: 'OK', label: 'Spróbuj ponownie' }, { keys: '↩', label: 'Ustawienia' }]} />
    </div>
  );
}

function AlbumShow({ client, source, title, total, intervalMs, motion, onBack }: { client: ReturnType<typeof createClient>; source: AssetSource; title: string; total: number | null; intervalMs: number; motion: boolean; onBack: () => void }) {
  const [items, setItems] = useState<Asset[] | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const sourceKey = source.kind === 'album' ? source.id : String(source.year);

  useEffect(() => {
    client.listAssets(source, 1).then((r) => { setItems(r.items); setNextPage(r.nextPage); });
  }, [client, sourceKey]);

  const loadMore = (page: number) => {
    if (loading) return;
    setLoading(true);
    client.listAssets(source, page).then((r) => {
      setItems((cur) => [...(cur ?? []), ...r.items]);
      setNextPage(r.nextPage);
    }).finally(() => setLoading(false));
  };

  if (!items) return <div class="screen center"><ImageIcon size={96} /><p class="lead">Ładowanie…</p></div>;
  return <ShowView items={items} nextPage={nextPage} total={total ?? undefined} intervalMs={intervalMs} albumName={title} motion={motion} thumbUrl={client.thumbUrl} previewUrl={client.previewUrl} videoUrl={client.videoUrl} loadMore={loadMore} onBack={onBack} />;
}
