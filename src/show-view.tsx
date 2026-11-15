import { useEffect, useReducer, useRef, useState } from 'preact/hooks';
import { PauseIcon, PlayIcon } from './icons';
import type { Asset } from './immich-client';
import { formatPlDate, groupThousands } from './polish';
import { initial, nextDelayMs, reduce } from './slideshow';
import { useRemote } from './use-remote';

interface Props {
  items: Asset[];
  nextPage: number | null;
  intervalMs: number;
  albumName?: string;
  total?: number;
  motion?: boolean;
  thumbUrl?: (id: string) => string;
  previewUrl: (id: string) => string;
  videoUrl: (id: string) => string;
  loadMore: (page: number) => void;
  onBack: () => void;
}

const HUD_MS = 5000;
// Screen is 16:9 (1.78). Photos outside this band leave bars that get a blurred backdrop.
const FULL_MIN = 1.69;
const FULL_MAX = 1.87;
// Only landscape photos drift; portrait ones stay fully visible.
const DRIFT_MIN = 1.3;

export function ShowView({ items, nextPage, intervalMs, albumName = '', total, motion = false, thumbUrl, previewUrl, videoUrl, loadMore, onBack }: Props) {
  const [s, dispatch] = useReducer(reduce, undefined, () => reduce(initial(), { type: 'load', items, nextPage }));
  const [hudShown, setHudShown] = useState(true);
  const [shape, setShape] = useState<{ id: string; ratio: number } | null>(null);
  const live = useRef(s);
  live.current = s;

  useEffect(() => {
    if (items.length > live.current.items.length) {
      dispatch({ type: 'append', items: items.slice(live.current.items.length), nextPage });
    }
  }, [items, nextPage]);

  useEffect(() => {
    if (s.needsMore && s.nextPage !== null) loadMore(s.nextPage);
  }, [s.needsMore, s.nextPage, s.index]);

  const current = s.items[s.index];
  useEffect(() => {
    if (!s.playing || !current) return;
    const delay = nextDelayMs(current, intervalMs);
    if (delay === null) return;
    const t = setTimeout(() => dispatch({ type: 'next' }), delay);
    return () => clearTimeout(t);
  }, [s.playing, s.index, s.items.length, intervalMs]);

  // The info bar stays up while paused and fades away after a few seconds of playing without key presses.
  const [hudTick, setHudTick] = useState(0);
  useEffect(() => {
    setHudShown(true);
    if (!s.playing) return;
    const t = setTimeout(() => setHudShown(false), HUD_MS);
    return () => clearTimeout(t);
  }, [s.playing, hudTick]);

  useRemote((intent) => {
    setHudTick((n) => n + 1);
    if (intent === 'left') dispatch({ type: 'prev' });
    else if (intent === 'right') dispatch({ type: 'next' });
    else if (intent === 'select' || intent === 'playpause') dispatch({ type: 'toggle' });
    else if (intent === 'play' && !live.current.playing) dispatch({ type: 'toggle' });
    else if (intent === 'pause' && live.current.playing) dispatch({ type: 'toggle' });
    else if (intent === 'back') onBack();
  });

  if (!current) return <div class="empty">Pusty album</div>;
  const aspect = current && shape && shape.id === current.id ? shape.ratio : null;
  const upcoming = s.items[(s.index + 1) % s.items.length];
  const date = formatPlDate(current.takenAt);

  return (
    <div class="show">
      {current.type === 'VIDEO' ? (
        <video key={current.id} src={videoUrl(current.id)} autoPlay onEnded={() => dispatch({ type: 'videoEnded' })} />
      ) : (
        <>
          {thumbUrl && aspect !== null && (aspect < FULL_MIN || aspect > FULL_MAX) && <div class="bg"><img src={thumbUrl(current.id)} alt="" /></div>}
          <img
            key={current.id}
            class={`current${motion && s.playing && aspect !== null && aspect >= DRIFT_MIN ? ` drift drift-${s.index % 4}` : ''}`}
            style={motion && s.playing ? { '--drift-ms': `${intervalMs + 1000}ms` } : undefined}
            src={previewUrl(current.id)}
            alt=""
            onLoad={(e) => { const i = e.currentTarget; if (i.naturalHeight > 0) setShape({ id: current.id, ratio: i.naturalWidth / i.naturalHeight }); }}
          />
        </>
      )}
      {upcoming && upcoming.type === 'IMAGE' && <img class="preload" src={previewUrl(upcoming.id)} alt="" />}
      <div class={`hud${hudShown ? ' visible' : ''}`}>
        <div class="hud-text">
          {albumName && <div class="hud-album">{albumName}</div>}
          {date && <div class="hud-date">{date}</div>}
        </div>
        <div class="hud-state">
          {s.playing ? <PauseIcon size={36} /> : <PlayIcon size={36} />}
          <span>{s.index + 1} / {groupThousands(Math.max(total ?? 0, s.items.length))}</span>
        </div>
      </div>
      {s.playing && current.type === 'IMAGE' && <div key={`p${current.id}`} class="progress" style={{ animationDuration: `${intervalMs}ms` }} />}
    </div>
  );
}
