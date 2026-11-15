import { render } from 'preact';
import { App } from './app';
import { isValidConfig } from './config-store';
import { ntfyRelay } from './pairing/relay';
import './styles.css';

declare const tizen: { tvinputdevice?: { registerKey(name: string): void }; application?: { getCurrentApplication(): { exit(): void } } } | undefined;

for (const key of ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaRewind', 'MediaFastForward']) {
  try { tizen?.tvinputdevice?.registerKey(key); } catch { /* key not available on this TV */ }
}

// Local test builds can bake a server into the bundle via .env; real use pairs through the QR flow.
const env = { baseUrl: import.meta.env.VITE_IMMICH_URL, apiKey: import.meta.env.VITE_IMMICH_KEY };

const relayUrl = import.meta.env.VITE_RELAY_URL;
const pageUrl = import.meta.env.VITE_PAIR_PAGE_URL;
const pairing = relayUrl && pageUrl ? { relay: ntfyRelay(relayUrl), relayUrl, pageUrl } : undefined;

function exitApp() {
  try { tizen?.application?.getCurrentApplication().exit(); } catch { /* not running on a TV */ }
}

render(<App storage={localStorage} fallback={isValidConfig(env) ? env : null} pairing={pairing} onExit={exitApp} />, document.getElementById('app')!);
