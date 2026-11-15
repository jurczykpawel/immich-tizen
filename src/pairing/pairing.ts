import { isValidConfig } from '../config-store';
import type { Config } from '../immich-client';
import { decryptOnTv, encryptForTv, generateTvKeys, randomId } from './crypto';
import type { Relay } from './relay';

export interface PairingParams { session: string; publicKey: string; relayUrl: string }
export interface Pairing { url: string; result: Promise<Config>; cancel: () => void }

const topicOf = (session: string) => `immich-tv-${session}`;

export function parsePairingUrl(hash: string): PairingParams | null {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const session = q.get('s'), publicKey = q.get('k'), relayUrl = q.get('r');
  return session && publicKey && relayUrl ? { session, publicKey, relayUrl } : null;
}

/** TV side: publish nothing, listen on a random topic and resolve with the first valid encrypted config. */
export async function startPairing({ relay, relayUrl, pageUrl }: { relay: Relay; relayUrl: string; pageUrl: string }): Promise<Pairing> {
  const keys = await generateTvKeys();
  const session = randomId();
  let stop = () => {};
  const result = new Promise<Config>((resolve) => {
    stop = relay.subscribe(topicOf(session), async (message) => {
      try {
        const c = await decryptOnTv(keys.privateKey, message);
        if (isValidConfig(c as Partial<Config>)) {
          stop();
          resolve(c as Config);
        }
      } catch { /* wrong key or garbage: keep waiting */ }
    });
  });
  const url = `${pageUrl}#s=${session}&k=${keys.publicKey}&r=${encodeURIComponent(relayUrl)}`;
  return { url, result, cancel: () => stop() };
}

/** Phone side: encrypt the config to the TV's public key and hand it to the relay. */
export async function sendConfig(relay: Relay, params: PairingParams, config: Config): Promise<void> {
  await relay.publish(topicOf(params.session), await encryptForTv(params.publicKey, config));
}
