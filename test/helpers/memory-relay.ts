import type { Relay } from '../../src/pairing/relay';

export function memoryRelay(): Relay & { published: string[] } {
  const subs = new Map<string, Set<(m: string) => void>>();
  const published: string[] = [];
  return {
    published,
    async publish(topic, message) { published.push(message); subs.get(topic)?.forEach((fn) => fn(message)); },
    subscribe(topic, fn) {
      if (!subs.has(topic)) subs.set(topic, new Set());
      subs.get(topic)!.add(fn);
      return () => subs.get(topic)!.delete(fn);
    },
  };
}
