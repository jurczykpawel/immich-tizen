import { describe, it, expect } from 'vitest';
import { startPairing, sendConfig, parsePairingUrl } from '../src/pairing/pairing';
import { memoryRelay } from './helpers/memory-relay';

const cfg = { baseUrl: 'http://192.168.1.10:2283', apiKey: 'secret-key-123' };
const page = 'https://pair.example.com/pair.html';
const hashOf = (url: string) => url.slice(url.indexOf('#'));

describe('pairing', () => {
  it('builds a qr url that the phone page can parse back', async () => {
    const p = await startPairing({ relay: memoryRelay(), relayUrl: 'https://ntfy.example.com', pageUrl: page });
    expect(p.url.startsWith(`${page}#`)).toBe(true);
    const parsed = parsePairingUrl(hashOf(p.url))!;
    expect(parsed.relayUrl).toBe('https://ntfy.example.com');
    expect(parsed.session).toHaveLength(22);
    expect(parsed.publicKey).toHaveLength(87);
    p.cancel();
  });

  it('delivers the config the phone sends, without the key crossing the relay in clear', async () => {
    const relay = memoryRelay();
    const p = await startPairing({ relay, relayUrl: 'https://ntfy.example.com', pageUrl: page });
    await sendConfig(relay, parsePairingUrl(hashOf(p.url))!, cfg);
    expect(await p.result).toEqual(cfg);
    expect(relay.published.join('')).not.toContain('secret-key-123');
  });

  it('keeps waiting after a garbage message and still accepts the real one', async () => {
    const relay = memoryRelay();
    const p = await startPairing({ relay, relayUrl: 'https://ntfy.example.com', pageUrl: page });
    const parsed = parsePairingUrl(hashOf(p.url))!;
    await relay.publish(`immich-tv-${parsed.session}`, 'junk');
    await sendConfig(relay, parsed, cfg);
    expect(await p.result).toEqual(cfg);
  });

  it('ignores a message that decrypts to an incomplete config', async () => {
    const relay = memoryRelay();
    const p = await startPairing({ relay, relayUrl: 'https://ntfy.example.com', pageUrl: page });
    const parsed = parsePairingUrl(hashOf(p.url))!;
    await sendConfig(relay, parsed, { baseUrl: '', apiKey: '' });
    await sendConfig(relay, parsed, cfg);
    expect(await p.result).toEqual(cfg);
  });

  it('rejects a url without the pairing fields', () => {
    expect(parsePairingUrl('#x=1')).toBeNull();
    expect(parsePairingUrl('')).toBeNull();
  });

  it('stops listening after cancel', async () => {
    const relay = memoryRelay();
    const p = await startPairing({ relay, relayUrl: 'https://ntfy.example.com', pageUrl: page });
    const parsed = parsePairingUrl(hashOf(p.url))!;
    p.cancel();
    await sendConfig(relay, parsed, cfg);
    const outcome = await Promise.race([p.result.then(() => 'delivered'), new Promise((r) => setTimeout(() => r('silent'), 50))]);
    expect(outcome).toBe('silent');
  });
});
