import { useEffect, useRef, useState } from 'preact/hooks';
import { configFromForm } from './config-store';
import { HintBar } from './hints';
import type { Config } from './immich-client';

interface Props { onSubmit: (c: Config) => void; onCancel?: () => void }

/** Setup without a phone: the TV keyboard opens when OK is pressed on a field. */
export function ManualSetup({ onSubmit, onCancel }: Props) {
  const address = useRef<HTMLInputElement>(null);
  const key = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [missing, setMissing] = useState(false);
  const index = useRef(0);

  const order = () => [address.current, key.current, button.current];
  useEffect(() => { address.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.keyCode === 40 || e.keyCode === 38) {
        e.preventDefault();
        index.current = Math.max(0, Math.min(2, index.current + (e.keyCode === 40 ? 1 : -1)));
        order()[index.current]?.focus();
      } else if (e.keyCode === 10009) {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = (e: Event) => {
    e.preventDefault();
    const c = configFromForm(address.current?.value ?? '', key.current?.value ?? '');
    setMissing(!c);
    if (c) onSubmit(c);
  };

  return (
    <form class="screen manual" onSubmit={submit} autocomplete="off">
      <h1 class="screen-title">Połącz z Immich</h1>
      <div class="manual-body">
        <label>
          <span class="label">Adres serwera</span>
          <input ref={address} name="address" type="text" placeholder="192.168.1.10:2283" />
          <span class="helper">Adres Immicha w sieci domowej, z portem</span>
        </label>
        <label>
          <span class="label">Klucz API</span>
          <input ref={key} name="key" type="text" placeholder="wklej klucz" />
          <span class="helper">Wygenerujesz go w Immich: Ustawienia konta, Klucze API (wystarczy odczyt)</span>
        </label>
        <button ref={button} type="submit">Połącz</button>
        {missing && <p class="error" role="alert">Wpisz adres serwera i klucz API</p>}
      </div>
      <HintBar hints={[{ keys: '▲ ▼', label: 'Zmień pole' }, { keys: 'OK', label: 'Klawiatura / zatwierdź' }, ...(onCancel ? [{ keys: '↩', label: 'Wstecz' }] : [])]} />
    </form>
  );
}
