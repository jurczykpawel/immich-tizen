// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPairServer } from '../server/pair-server.mjs';

const TOPIC = 'immich-tv-AbCdEfGhIjKlMnOpQrStUv';
let srv: { port: number; close: () => void };
let base: string;
let dir: string;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'pair-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'pair.html'), '<!doctype html><title>pair</title>');
  writeFileSync(join(dir, 'assets', 'a.js'), 'console.log(1)');
  writeFileSync(join(tmpdir(), 'pair-secret.txt'), 'top secret');
  srv = await createPairServer({ staticDir: dir, keepAliveMs: 50 }).listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${srv.port}`;
});
afterEach(() => srv.close());

async function readEvent(res: Response, match: RegExp, ms = 2000): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value);
    if (match.test(buf)) { reader.cancel(); return buf; }
  }
  reader.cancel();
  throw new Error(`no match in: ${buf}`);
}

describe('relay', () => {
  it('delivers a published message to a subscriber as an ntfy-style event', async () => {
    const sub = await fetch(`${base}/${TOPIC}/sse`);
    expect(sub.headers.get('content-type')).toContain('text/event-stream');
    const got = readEvent(sub, /"message":"sealed-envelope"/);
    await new Promise((r) => setTimeout(r, 50));
    const pub = await fetch(`${base}/${TOPIC}`, { method: 'POST', body: 'sealed-envelope' });
    expect(pub.status).toBe(200);
    const text = await got;
    expect(text).toContain('event: message');
    expect(JSON.parse(text.split('event: message\ndata: ')[1].split('\n')[0])).toMatchObject({ event: 'message', message: 'sealed-envelope' });
  });

  it('sends an open event first and keeps the stream alive', async () => {
    const sub = await fetch(`${base}/${TOPIC}/sse`);
    const text = await readEvent(sub, /event: open[\s\S]*:ka/);
    expect(text.indexOf('event: open')).toBe(0);
  });

  it('rejects topics that are not 22-char session ids', async () => {
    expect((await fetch(`${base}/immich-tv-short`, { method: 'POST', body: 'x' })).status).toBe(400);
    expect((await fetch(`${base}/random-topic/sse`)).status).toBe(400);
  });

  it('rejects oversized messages', async () => {
    const res = await fetch(`${base}/${TOPIC}`, { method: 'POST', body: 'x'.repeat(4096) });
    expect(res.status).toBe(413);
  });

  it('answers CORS preflight and allows cross-origin reads', async () => {
    const pre = await fetch(`${base}/${TOPIC}`, { method: 'OPTIONS' });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('refuses new subscribers when the server is full', async () => {
    const full = await createPairServer({ staticDir: dir, maxSubscribers: 1 }).listen(0, '127.0.0.1');
    const a = await fetch(`http://127.0.0.1:${full.port}/${TOPIC}/sse`);
    const b = await fetch(`http://127.0.0.1:${full.port}/immich-tv-ZyXwVuTsRqPoNmLkJiHgFe/sse`);
    expect(b.status).toBe(503);
    a.body!.cancel();
    full.close();
  });
});

describe('static page', () => {
  it('serves the phone page with strict headers', async () => {
    const res = await fetch(`${base}/pair.html`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    const csp = res.headers.get('content-security-policy')!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("img-src 'self' data:");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('serves the root and built assets with the right type', async () => {
    expect((await fetch(`${base}/`)).status).toBe(200);
    const js = await fetch(`${base}/assets/a.js`);
    expect(js.headers.get('content-type')).toContain('javascript');
  });

  it('never serves files outside the static directory', async () => {
    const res = await fetch(`${base}/..%2Fpair-secret.txt`);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('top secret');
  });

  it('returns 404 for unknown files and unsupported methods', async () => {
    expect((await fetch(`${base}/nope.html`)).status).toBe(404);
    expect((await fetch(`${base}/pair.html`, { method: 'DELETE' })).status).toBe(405);
  });
});
