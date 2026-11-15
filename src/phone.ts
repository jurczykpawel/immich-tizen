// Phone-side page of the QR pairing: the user types the Immich address and key, we encrypt them to the TV.
import { configFromForm } from './config-store';
import { parsePairingUrl, sendConfig, type PairingParams } from './pairing/pairing';
import { ntfyRelay, type Relay } from './pairing/relay';

export type Result = { ok: true } | { ok: false; reason: string };

export async function submitFromForm(relay: Relay, params: PairingParams, form: { address: string; key: string }): Promise<Result> {
  const config = configFromForm(form.address, form.key);
  if (!config) return { ok: false, reason: 'incomplete' };
  try {
    await sendConfig(relay, params, config);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

function mount() {
  const form = document.getElementById('pair-form') as HTMLFormElement | null;
  if (!form) return;
  const params = parsePairingUrl(location.hash);
  const status = document.getElementById('status')!;
  if (!params) {
    form.hidden = true;
    status.textContent = 'Otwórz tę stronę przez kod QR wyświetlony na telewizorze.';
    return;
  }
  const address = form.elements.namedItem('address') as HTMLInputElement;
  const key = form.elements.namedItem('key') as HTMLInputElement;
  try { address.value = localStorage.getItem('immich-address') ?? ''; } catch { /* storage unavailable */ }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Wysyłam…';
    const r = await submitFromForm(ntfyRelay(params.relayUrl), params, { address: address.value, key: key.value });
    if (r.ok) {
      try { localStorage.setItem('immich-address', address.value); } catch { /* storage unavailable */ }
      key.value = '';
      status.textContent = 'Gotowe. Spójrz na telewizor.';
    } else {
      status.textContent = r.reason === 'incomplete' ? 'Wpisz adres serwera i klucz API.' : `Nie udało się wysłać: ${r.reason}`;
    }
  });
}

if (typeof document !== 'undefined') mount();
