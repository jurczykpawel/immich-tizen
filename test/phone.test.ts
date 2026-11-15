import { describe, it, expect } from 'vitest';
import { submitFromForm } from '../src/phone';
import { startPairing, parsePairingUrl } from '../src/pairing/pairing';
import { memoryRelay } from './helpers/memory-relay';

const setup = async () => {
  const relay = memoryRelay();
  const p = await startPairing({ relay, relayUrl: 'https://r.example.com', pageUrl: 'https://p.example.com/pair.html' });
  return { relay, p, params: parsePairingUrl(p.url.slice(p.url.indexOf('#')))! };
};

describe('phone form', () => {
  it('sends a normalized config that the TV receives', async () => {
    const { relay, p, params } = await setup();
    expect(await submitFromForm(relay, params, { address: ' 192.168.1.10:2283/ ', key: ' K ' })).toEqual({ ok: true });
    expect(await p.result).toEqual({ baseUrl: 'http://192.168.1.10:2283', apiKey: 'K' });
  });

  it.each([
    [{ address: '', key: 'K' }],
    [{ address: 'h:1', key: '   ' }],
  ])('refuses incomplete input %j without sending anything', async (form) => {
    const { relay, params } = await setup();
    expect(await submitFromForm(relay, params, form)).toEqual({ ok: false, reason: 'incomplete' });
    expect(relay.published).toEqual([]);
  });

  it('reports a relay failure instead of throwing', async () => {
    const { params } = await setup();
    const broken = { publish: async () => { throw new Error('Relay 503'); }, subscribe: () => () => {} };
    expect(await submitFromForm(broken, params, { address: 'h:1', key: 'K' })).toEqual({ ok: false, reason: 'Relay 503' });
  });
});
