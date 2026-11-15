// Phone -> TV config transfer: the TV publishes an ECDH public key in the QR code, the phone encrypts
// the config to it, so whatever relays the message only ever sees ciphertext.
const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;
const AES = { name: 'AES-GCM', length: 256 } as const;

const toB64Url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...Array.from(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s: string): Uint8Array<ArrayBuffer> => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b + '='.repeat((4 - (b.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

export interface TvKeys { publicKey: string; privateKey: CryptoKey }

export async function generateTvKeys(): Promise<TvKeys> {
  const pair = await crypto.subtle.generateKey(ECDH, true, ['deriveKey']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { publicKey: toB64Url(raw), privateKey: pair.privateKey };
}

const importPublic = (b64: string) => crypto.subtle.importKey('raw', fromB64Url(b64), ECDH, true, []);

export async function encryptForTv(tvPublicKey: string, payload: unknown): Promise<string> {
  const eph = await crypto.subtle.generateKey(ECDH, true, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'ECDH', public: await importPublic(tvPublicKey) }, eph.privateKey, AES, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload))));
  const epk = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  return toB64Url(new TextEncoder().encode(JSON.stringify({ e: toB64Url(epk), i: toB64Url(iv), c: toB64Url(ct) })));
}

export async function decryptOnTv(privateKey: CryptoKey, message: string): Promise<unknown> {
  const { e, i, c } = JSON.parse(new TextDecoder().decode(fromB64Url(message))) as { e: string; i: string; c: string };
  const key = await crypto.subtle.deriveKey({ name: 'ECDH', public: await importPublic(e) }, privateKey, AES, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64Url(i) }, key, fromB64Url(c));
  return JSON.parse(new TextDecoder().decode(plain));
}

export const randomId = (): string => toB64Url(crypto.getRandomValues(new Uint8Array(16)));
