// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateTvKeys, encryptForTv, decryptOnTv } from '../src/pairing/crypto';

const cfg = { baseUrl: 'http://192.168.1.10:2283', apiKey: 'secret-key-123' };

describe('pairing crypto', () => {
  it('round-trips a config from the phone to the TV', async () => {
    const tv = await generateTvKeys();
    const msg = await encryptForTv(tv.publicKey, cfg);
    expect(await decryptOnTv(tv.privateKey, msg)).toEqual(cfg);
  });

  it('never exposes the api key in the transmitted message', async () => {
    const tv = await generateTvKeys();
    const msg = await encryptForTv(tv.publicKey, cfg);
    expect(msg).not.toContain('secret-key-123');
    expect(atob(msg.replace(/-/g, '+').replace(/_/g, '/'))).not.toContain('secret-key-123');
  });

  it('exports a compact url-safe public key', async () => {
    const tv = await generateTvKeys();
    expect(tv.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
  });

  it('cannot be read with another TV key', async () => {
    const a = await generateTvKeys();
    const b = await generateTvKeys();
    const msg = await encryptForTv(a.publicKey, cfg);
    await expect(decryptOnTv(b.privateKey, msg)).rejects.toThrow();
  });

  it('rejects a modified message', async () => {
    const tv = await generateTvKeys();
    const msg = await encryptForTv(tv.publicKey, cfg);
    const obj = JSON.parse(atob(msg.replace(/-/g, '+').replace(/_/g, '/')));
    obj.c = obj.c.slice(0, -4) + (obj.c.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    const bad = btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await expect(decryptOnTv(tv.privateKey, bad)).rejects.toThrow();
  });

  it('produces a different message every time', async () => {
    const tv = await generateTvKeys();
    expect(await encryptForTv(tv.publicKey, cfg)).not.toBe(await encryptForTv(tv.publicKey, cfg));
  });

  it('rejects garbage input', async () => {
    const tv = await generateTvKeys();
    await expect(decryptOnTv(tv.privateKey, 'not-a-message')).rejects.toThrow();
  });
});
