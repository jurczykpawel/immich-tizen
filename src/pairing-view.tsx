import { useEffect, useState } from 'preact/hooks';
import { HintBar } from './hints';
import type { Config } from './immich-client';
import { ManualSetup } from './manual-setup';
import { startPairing } from './pairing/pairing';
import type { Relay } from './pairing/relay';
import { QrCode } from './qr';
import { useRemote } from './use-remote';

export interface PairingDeps { relay: Relay; relayUrl: string; pageUrl: string }
type Props = PairingDeps & { onPaired: (c: Config) => void; onBack?: () => void };

export function PairingView(props: Props) {
  const [manual, setManual] = useState(false);
  return manual
    ? <ManualSetup onSubmit={props.onPaired} onCancel={() => setManual(false)} />
    : <QrScreen {...props} onManual={() => setManual(true)} />;
}

const STEPS = ['Zeskanuj kod aparatem w telefonie', 'Wpisz adres serwera Immich i klucz API', 'Zatwierdź. Telewizor połączy się sam'];

function QrScreen({ relay, relayUrl, pageUrl, onPaired, onBack, onManual }: Props & { onManual: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useRemote((intent) => {
    if (intent === 'select') onManual();
    else if (intent === 'back') onBack?.();
  });

  useEffect(() => {
    let cancel = () => {};
    startPairing({ relay, relayUrl, pageUrl }).then((p) => {
      cancel = p.cancel;
      setUrl(p.url);
      p.result.then(onPaired);
    }, () => setError('Nie udało się przygotować kodu. Naciśnij OK, aby wpisać dane pilotem.'));
    return () => cancel();
  }, [relay, relayUrl, pageUrl]);

  return (
    <div class="screen pair" data-pair-url={url ?? ''}>
      <div class="pair-text">
        <h1 class="screen-title">Połącz z Immich</h1>
        <ol class="steps">{STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
        {error && <p class="error" role="alert">{error}</p>}
        <p class="muted">Telefon musi być w tej samej sieci Wi-Fi co telewizor.</p>
      </div>
      <div class="pair-qr">{url ? <QrCode text={url} size={520} /> : <div class="qr-wait">Przygotowuję kod…</div>}</div>
      <HintBar hints={[{ keys: 'OK', label: 'Wpisz dane pilotem' }, ...(onBack ? [{ keys: '↩', label: 'Wstecz' }] : [])]} />
    </div>
  );
}
