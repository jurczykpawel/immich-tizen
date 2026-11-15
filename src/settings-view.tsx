import { useEffect, useRef, useState } from 'preact/hooks';
import { HintBar } from './hints';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, KeyboardIcon, MotionIcon, PhoneIcon, TrashIcon } from './icons';
import { stepInterval } from './settings-store';
import { useRemote } from './use-remote';

interface Props {
  intervalSec: number;
  motion: boolean;
  server: string;
  onInterval: (sec: number) => void;
  onMotion: (on: boolean) => void;
  onPair?: () => void;
  onManual: () => void;
  onReset: () => void;
  onBack: () => void;
}

const CONFIRM_MS = 4000;

export function SettingsView({ intervalSec, motion, server, onInterval, onMotion, onPair, onManual, onReset, onBack }: Props) {
  const rows = ['interval', 'motion', ...(onPair ? ['pair'] : []), 'manual', 'reset'];
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const current = rows[index];

  const cancelConfirm = () => { clearTimeout(timer.current); setConfirming(false); };
  useEffect(() => () => clearTimeout(timer.current), []);

  useRemote((intent) => {
    if (intent === 'back') return onBack();
    if (intent === 'up' || intent === 'down') {
      cancelConfirm();
      setIndex((i) => Math.max(0, Math.min(rows.length - 1, i + (intent === 'down' ? 1 : -1))));
    } else if (current === 'interval' && (intent === 'left' || intent === 'right')) {
      onInterval(stepInterval(intervalSec, intent === 'right' ? 1 : -1));
    } else if (current === 'motion' && (intent === 'left' || intent === 'right')) {
      onMotion(!motion);
    } else if (intent === 'select' || intent === 'play') {
      if (current === 'interval') onInterval(stepInterval(intervalSec, 1));
      else if (current === 'motion') onMotion(!motion);
      else if (current === 'pair') onPair?.();
      else if (current === 'manual') onManual();
      else if (confirming) { cancelConfirm(); onReset(); }
      else { setConfirming(true); timer.current = setTimeout(() => setConfirming(false), CONFIRM_MS); }
    }
  });

  const row = (id: string, icon: preact.ComponentChildren, title: string, detail: string, tail?: preact.ComponentChildren, danger?: boolean) => (
    <div data-row={id} class={`row${current === id ? ' focused' : ''}${danger ? ' danger' : ''}`}>
      <div class="row-icon">{icon}</div>
      <div class="row-text"><div class="row-title">{title}</div><div class="row-detail">{detail}</div></div>
      {tail}
    </div>
  );

  return (
    <div class="screen settings">
      <h1 class="screen-title">Ustawienia</h1>
      <div class="list">
        {row('interval', <ClockIcon />, 'Czas jednego zdjęcia w pokazie', 'Wideo odtwarza się do końca', (
          <div class="stepper"><ChevronLeftIcon size={36} /><span class="value">{intervalSec} s</span><ChevronRightIcon size={36} /></div>
        ))}
        {row('motion', <MotionIcon />, 'Ruch zdjęć w pokazie', 'Delikatne przybliżanie zdjęć poziomych', (
          <div class="stepper"><span class="value">{motion ? 'Włączony' : 'Wyłączony'}</span></div>
        ))}
        {onPair && row('pair', <PhoneIcon />, 'Połącz ponownie przez telefon', `Serwer: ${server}`)}
        {row('manual', <KeyboardIcon />, 'Wpisz dane serwera pilotem', onPair ? 'Adres Immicha i klucz API' : `Serwer: ${server}`)}
        {row('reset', <TrashIcon />, confirming ? 'Naciśnij OK ponownie, aby potwierdzić' : 'Wyczyść dane połączenia', 'Aplikacja zapomni serwer i klucz', undefined, true)}
      </div>
      <HintBar hints={[{ keys: '▲ ▼', label: 'Wybierz' }, { keys: '◀ ▶', label: 'Zmień wartość' }, { keys: 'OK', label: 'Zatwierdź' }, { keys: '↩', label: 'Wstecz' }]} />
    </div>
  );
}
