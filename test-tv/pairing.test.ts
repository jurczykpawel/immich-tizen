import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect } from '../tools/cdp.mjs';
import { createPairServer } from '../server/pair-server.mjs';
import { launchDebug } from '../tools/launch.mjs';
import { parsePairingUrl, sendConfig } from '../src/pairing/pairing';
import { ntfyRelay } from '../src/pairing/relay';

// LAN address of this computer as the TV sees it (the TV has to reach the test relay on it).
const MAC_IP = process.env.HOST_IP ?? '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));

type Tv = Awaited<ReturnType<typeof connect>>;
async function until(tv: Tv, expr: string, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await tv.evaluate(expr)) return true; await sleep(500); }
  return false;
}

describe.skipIf(!MAC_IP || !process.env.TV_HOST)('QR pairing on the real TV (needs TV_HOST and HOST_IP)', () => {
  let relay: Awaited<ReturnType<ReturnType<typeof createPairServer>['listen']>>;
  let tv: Tv;
  let stop: () => void;

  beforeAll(async () => {
    relay = await createPairServer().listen(8787);
    const launched = await launchDebug({
      VITE_IMMICH_URL: '', VITE_IMMICH_KEY: '',
      VITE_RELAY_URL: `http://${MAC_IP}:${relay.port}`, VITE_PAIR_PAGE_URL: `http://${MAC_IP}:${relay.port}/pair.html`,
    });
    stop = launched.stop;
    await sleep(3000);
    tv = await connect(launched.port);
    await tv.evaluate('localStorage.clear(); location.reload(); 1');
    await sleep(3000);
  });

  afterAll(async () => {
    await tv?.evaluate('localStorage.clear(); 1').catch(() => {});
    tv?.close();
    stop?.();
    relay?.close();
  });

  it('shows a QR code, accepts the config from the phone and lists albums', async () => {
    expect(await tv.evaluate('window.isSecureContext && !!crypto.subtle')).toBe(true);
    expect(await until(tv, `!!document.querySelector('svg.qr') && !!document.querySelector('[data-pair-url]').dataset.pairUrl`)).toBe(true);

    const url = (await tv.evaluate(`document.querySelector('[data-pair-url]').dataset.pairUrl`)) as string;
    const params = parsePairingUrl(url.slice(url.indexOf('#')))!;
    expect(params.relayUrl).toBe(`http://${MAC_IP}:${relay.port}`);

    await sendConfig(ntfyRelay(params.relayUrl), params, { baseUrl: env.VITE_IMMICH_URL, apiKey: env.VITE_IMMICH_KEY });

    expect(await until(tv, `document.querySelectorAll('[data-card]').length > 0`)).toBe(true);
    expect(await tv.evaluate(`localStorage.getItem('immich-tv-config')`)).toContain(new URL(env.VITE_IMMICH_URL).host);
  });

  it('falls back to manual entry with the remote: OK opens the form, arrows move focus, submit connects', async () => {
    await tv.evaluate('localStorage.clear(); location.reload(); 1');
    await sleep(3000);
    expect(await until(tv, `!!document.querySelector('svg.qr')`)).toBe(true);
    await sleep(1000);

    await tv.key(13);
    expect(await until(tv, `!!document.querySelector('form.manual')`)).toBe(true);
    expect(await tv.evaluate(`document.activeElement.name`)).toBe('address');
    await tv.key(40);
    expect(await tv.evaluate(`document.activeElement.name`)).toBe('key');
    await tv.key(40);
    expect(await tv.evaluate(`document.activeElement.tagName`)).toBe('BUTTON');

    await tv.key(10009);
    expect(await until(tv, `!!document.querySelector('svg.qr')`)).toBe(true);
    await sleep(1000);
    await tv.key(13);
    expect(await until(tv, `!!document.querySelector('form.manual')`)).toBe(true);

    const set = (name: string, value: string) => tv.evaluate(`(()=>{const i=document.querySelector('[name=${name}]');i.value=${JSON.stringify(value)};return 1})()`);
    await set('address', env.VITE_IMMICH_URL);
    await set('key', env.VITE_IMMICH_KEY);
    await tv.evaluate(`document.querySelector('form.manual button').click(); 1`);

    expect(await until(tv, `document.querySelectorAll('[data-card]').length > 0`)).toBe(true);
  });
});
