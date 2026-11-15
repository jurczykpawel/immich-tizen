// Minimal ntfy-compatible relay: POST a message to a topic, receive it over server-sent events.
export interface Relay {
  publish(topic: string, message: string): Promise<void>;
  subscribe(topic: string, onMessage: (message: string) => void): () => void;
}

interface Deps { fetch: typeof fetch; EventSource: typeof EventSource }

export function ntfyRelay(baseUrl: string, deps: Deps = { fetch: (...a) => fetch(...a), EventSource: globalThis.EventSource }): Relay {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    async publish(topic, message) {
      const res = await deps.fetch(`${base}/${topic}`, { method: 'POST', body: message });
      if (!res.ok) throw new Error(`Relay ${res.status}`);
    },
    subscribe(topic, onMessage) {
      const es = new deps.EventSource(`${base}/${topic}/sse`);
      es.addEventListener('message', (e) => {
        try {
          const d = JSON.parse((e as MessageEvent).data) as { event?: string; message?: string };
          if (d.event === 'message' && typeof d.message === 'string') onMessage(d.message);
        } catch { /* not a relay message */ }
      });
      return () => es.close();
    },
  };
}
