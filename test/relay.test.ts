import { describe, it, expect, vi } from 'vitest';
import { ntfyRelay } from '../src/pairing/relay';

class FakeEventSource {
  static last: FakeEventSource;
  listeners: Record<string, (e: { data: string }) => void> = {};
  closed = false;
  constructor(public url: string) { FakeEventSource.last = this; }
  addEventListener(type: string, fn: (e: { data: string }) => void) { this.listeners[type] = fn; }
  close() { this.closed = true; }
}

const relayWith = (fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 })) =>
  ({ fetchImpl, relay: ntfyRelay('https://ntfy.example.com/', { fetch: fetchImpl as unknown as typeof fetch, EventSource: FakeEventSource as unknown as typeof EventSource }) });

describe('ntfyRelay', () => {
  it('publishes the message as the body of a POST to the topic', async () => {
    const { fetchImpl, relay } = relayWith();
    await relay.publish('topic1', 'hello');
    expect(fetchImpl).toHaveBeenCalledWith('https://ntfy.example.com/topic1', { method: 'POST', body: 'hello' });
  });

  it('fails loudly when the relay rejects a publish', async () => {
    const { relay } = relayWith(vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(relay.publish('t', 'x')).rejects.toThrow('403');
  });

  it('subscribes to the topic event stream and forwards the message text', () => {
    const { relay } = relayWith();
    const got: string[] = [];
    relay.subscribe('topic1', (m) => got.push(m));
    expect(FakeEventSource.last.url).toBe('https://ntfy.example.com/topic1/sse');
    FakeEventSource.last.listeners.message({ data: JSON.stringify({ event: 'message', message: 'abc' }) });
    expect(got).toEqual(['abc']);
  });

  it('ignores malformed stream data and stops on unsubscribe', () => {
    const { relay } = relayWith();
    const got: string[] = [];
    const stop = relay.subscribe('t', (m) => got.push(m));
    FakeEventSource.last.listeners.message({ data: 'not json' });
    FakeEventSource.last.listeners.message({ data: JSON.stringify({ event: 'open' }) });
    expect(got).toEqual([]);
    stop();
    expect(FakeEventSource.last.closed).toBe(true);
  });
});
